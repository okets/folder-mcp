/**
 * Model Cache Checker Service
 * 
 * Checks the installation status of curated models at daemon startup.
 * Provides timeout protection and graceful fallback when Python is unavailable.
 */

import { CuratedModelInfo, ModelCheckStatus } from '../models/fmdm.js';
import { ILoggingService } from '../../di/interfaces.js';
import { join } from 'path';
import { getSupportedGpuModelIds, getSupportedCpuModelIds, getModelById } from '../../config/model-registry.js';
import { ONNXDownloader } from '../../infrastructure/embeddings/onnx/onnx-downloader.js';
import { MachineCapabilitiesDetector } from '../../domain/models/machine-capabilities.js';

// Factory functions for dependency injection
export type PythonEmbeddingServiceFactory = (config: any) => any; // Simplified - no longer creates processes
export type ONNXDownloaderFactory = () => ONNXDownloader;

/**
 * Result of checking all curated models
 */
export interface ModelCheckResult {
  models: CuratedModelInfo[];
  status: ModelCheckStatus;
}

/**
 * Service to check curated model installation status
 */
export class ModelCacheChecker {
  private readonly CHECK_TIMEOUT = 30000; // 30 seconds max for GPU checks - Apple Silicon MPS initialization can be slow
  private capabilitiesDetector: MachineCapabilitiesDetector;
  
  constructor(
    private logger: ILoggingService,
    private pythonEmbeddingServiceFactory?: PythonEmbeddingServiceFactory,
    private onnxDownloaderFactory?: ONNXDownloaderFactory
  ) {
    // Factories are optional and will use external creation if not provided
    this.capabilitiesDetector = new MachineCapabilitiesDetector();
  }

  /**
   * Check all curated models - CPU models always, GPU models only if GPU detected
   */
  async checkCuratedModels(): Promise<ModelCheckResult> {
    const models: CuratedModelInfo[] = [];
    let status: ModelCheckStatus = {
      pythonAvailable: false,
      gpuModelsCheckable: false,
      checkedAt: new Date().toISOString()
    };
    
    try {
      // Always check CPU/ONNX models first (fast, no Python required)
      const cpuModels = await this.checkCPUModels();
      models.push(...cpuModels);
      this.logger.debug(`Checked ${cpuModels.length} CPU models`);

      // CRITICAL: Check hardware BEFORE attempting Python
      const capabilities = await this.capabilitiesDetector.detectCapabilities();
      
      if (capabilities.gpu.type === 'none') {
        // No GPU detected: Skip Python checks entirely
        this.logger.info('[MODEL-CHECK] No GPU detected, skipping Python/GPU model checks');
        const defaultGpuModels = this.getDefaultGPUModels();
        models.push(...defaultGpuModels);
        status.error = 'No GPU detected - Python checks skipped';
      } else {
        // GPU detected: Try GPU models with timeout protection
        this.logger.info(`[MODEL-CHECK] GPU detected (${capabilities.gpu.type}), checking Python availability...`);
        const gpuResult = await this.checkGPUModelsWithTimeout();
        
        if (gpuResult.success) {
          models.push(...gpuResult.models);
          status.pythonAvailable = true;
          status.gpuModelsCheckable = true;
          this.logger.debug(`Checked ${gpuResult.models.length} GPU models`);
        } else {
          // Add GPU models as not installed
          const defaultGpuModels = this.getDefaultGPUModels();
          models.push(...defaultGpuModels);
          if (gpuResult.error) {
            status.error = gpuResult.error;
          }
          this.logger.info(`GPU models marked as not installed: ${gpuResult.error}`);
        }
      }

    } catch (error) {
      // Catastrophic failure - return all models as not installed
      const defaultModels = this.getDefaultAllModels();
      models.push(...defaultModels);
      
      status.error = 'Model check failed completely';
      this.logger.warn('Complete model check failure:', error);
    }

    return { models, status };
  }

  /**
   * Check CPU/ONNX models - always works, no Python dependency
   */
  private async checkCPUModels(): Promise<CuratedModelInfo[]> {
    const models: CuratedModelInfo[] = [];
    
    // Skip CPU model check if factory not provided
    if (!this.onnxDownloaderFactory) {
      this.logger.debug('ONNX downloader factory not provided, skipping CPU model checks');
      return this.getCuratedCPUModelIds().map(id => ({
        id,
        installed: false,
        type: 'cpu' as const
      }));
    }
    
    const onnxDownloader = this.onnxDownloaderFactory();
    
    // Get curated CPU model IDs
    const cpuModelIds = this.getCuratedCPUModelIds();
    
    for (const modelId of cpuModelIds) {
      try {
        const installed = await onnxDownloader.isModelAvailable(modelId);
        models.push({ id: modelId, installed, type: 'cpu' });
      } catch (error) {
        // File system check failed - assume not installed
        models.push({ id: modelId, installed: false, type: 'cpu' });
        this.logger.debug(`CPU model check failed for ${modelId}:`, error);
      }
    }
    
    return models;
  }

  /**
   * Check GPU models with timeout protection
   */
  private async checkGPUModelsWithTimeout(): Promise<{
    success: boolean;
    models: CuratedModelInfo[];
    error?: string;
  }> {
    try {
      const gpuCheckPromise = this.checkGPUModels();
      
      const result = await Promise.race([
        gpuCheckPromise,
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('GPU check timeout')), this.CHECK_TIMEOUT)
        )
      ]);
      
      if (result) {
        return { success: true, models: result };
      } else {
        return { success: false, models: [], error: 'GPU check returned no result' };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('timeout')) {
        return { success: false, models: [], error: 'GPU model check timed out' };
      } else if (errorMessage.includes('ENOENT') || errorMessage.includes('spawn')) {
        return { success: false, models: [], error: 'Python not available' };
      } else if (errorMessage.includes('ModuleNotFoundError') || 
                 errorMessage.includes('ImportError')) {
        return { success: false, models: [], error: 'Python dependencies missing' };
      } else {
        return { success: false, models: [], error: `Python error: ${errorMessage}` };
      }
    }
  }

  /**
   * Check GPU models by checking if they are cached in HuggingFace hub
   * No longer creates temporary Python processes - uses file system check instead
   */
  private async checkGPUModels(): Promise<CuratedModelInfo[]> {
    const models: CuratedModelInfo[] = [];

    try {
      // Skip GPU model check if factory not provided
      if (!this.pythonEmbeddingServiceFactory) {
        this.logger.debug('Python embedding service factory not provided, skipping GPU model checks');
        return this.getDefaultGPUModels();
      }

      // Check GPU models by looking at HuggingFace cache directory
      // This avoids creating extra Python processes
      const gpuModelMappings = this.getCuratedGPUModelMappings();
      const { homedir } = await import('os');
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const cacheDir = path.join(homedir(), '.cache', 'huggingface', 'hub');

      for (const { id, huggingfaceId } of gpuModelMappings) {
        try {
          // Check if model directory exists in cache
          const modelDirName = `models--${huggingfaceId.replace('/', '--')}`;
          const modelPath = path.join(cacheDir, modelDirName);

          // Use async file system operation
          let installed = false;
          try {
            await fs.access(modelPath);
            installed = true;
          } catch {
            installed = false;
          }

          models.push({ id, installed, type: 'gpu' });

          if (installed) {
            this.logger.debug(`GPU model ${id} found in cache at ${modelPath}`);
          }
        } catch (error) {
          // Individual model check failed - assume not installed
          models.push({ id, installed: false, type: 'gpu' });
          this.logger.debug(`GPU model check failed for ${id}:`, error);
        }
      }

      return models;

    } catch (error) {
      this.logger.error('Failed to check GPU models:', error instanceof Error ? error : new Error(String(error)));
      return this.getDefaultGPUModels();
    }
  }

  /**
   * Get curated CPU model IDs from model registry (single source of truth)
   */
  private getCuratedCPUModelIds(): string[] {
    return getSupportedCpuModelIds();
  }

  /**
   * Get curated GPU model mappings (our ID -> HuggingFace ID)
   */
  private getCuratedGPUModelMappings(): Array<{ id: string; huggingfaceId: string }> {
    const gpuModelIds = getSupportedGpuModelIds();
    return gpuModelIds.map(id => {
      const model = getModelById(id);
      if (!model) {
        throw new Error(`Model not found in registry: ${id}`);
      }
      return { id, huggingfaceId: model.huggingfaceId };
    });
  }

  /**
   * Get default GPU models (not installed)
   */
  private getDefaultGPUModels(): CuratedModelInfo[] {
    return this.getCuratedGPUModelMappings().map(({ id }) => ({
      id,
      installed: false,
      type: 'gpu' as const
    }));
  }

  /**
   * Get default all models (not installed) - fallback for complete failures
   */
  private getDefaultAllModels(): CuratedModelInfo[] {
    const gpuModels = this.getDefaultGPUModels();
    const cpuModels = this.getCuratedCPUModelIds().map(id => ({
      id,
      installed: false,
      type: 'cpu' as const
    }));
    
    return [...gpuModels, ...cpuModels];
  }
}