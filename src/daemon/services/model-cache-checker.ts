/**
 * Model Cache Checker Service
 * 
 * Checks the installation status of curated models at daemon startup.
 * Provides timeout protection and graceful fallback when Python is unavailable.
 */

import { CuratedModelInfo, ModelCheckStatus } from '../models/fmdm.js';
import { ILoggingService } from '../../di/interfaces.js';
import { PythonEmbeddingService } from '../../infrastructure/embeddings/python-embedding-service.js';
import { ONNXDownloader } from '../../infrastructure/embeddings/onnx/onnx-downloader.js';

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
  private readonly CHECK_TIMEOUT = 5000; // 5 seconds max for GPU checks
  
  constructor(private logger: ILoggingService) {}

  /**
   * Check all curated models - CPU models always, GPU models with timeout
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

      // Try GPU models with timeout protection
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
    const onnxDownloader = new ONNXDownloader();
    
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
   * Check GPU models using a single Python service instance
   */
  private async checkGPUModels(): Promise<CuratedModelInfo[]> {
    const models: CuratedModelInfo[] = [];
    let pythonService: PythonEmbeddingService | null = null;
    
    try {
      // Create single Python service for all GPU checks
      pythonService = new PythonEmbeddingService({
        modelName: 'BAAI/bge-m3', // Any valid HuggingFace model ID works
        pythonPath: 'python3',
        timeout: 3000 // Shorter timeout for initialization
      });
      
      await pythonService.initialize();
      
      // Check all GPU models with the single service
      const gpuModelMappings = this.getCuratedGPUModelMappings();
      
      for (const { id, huggingfaceId } of gpuModelMappings) {
        try {
          const installed = await pythonService.isModelCached(huggingfaceId);
          models.push({ id, installed, type: 'gpu' });
        } catch (error) {
          // Individual model check failed - assume not installed
          models.push({ id, installed: false, type: 'gpu' });
          this.logger.debug(`GPU model check failed for ${id}:`, error);
        }
      }
      
      return models;
      
    } finally {
      // Always clean up Python service
      if (pythonService) {
        try {
          await pythonService.shutdown();
        } catch (error) {
          // Ignore shutdown errors
          this.logger.debug('Python service shutdown error (ignored):', error);
        }
      }
    }
  }

  /**
   * Get curated CPU model IDs
   */
  private getCuratedCPUModelIds(): string[] {
    return [
      'folder-mcp-lite:xenova-multilingual-e5-small',
      'folder-mcp-lite:xenova-multilingual-e5-large'
    ];
  }

  /**
   * Get curated GPU model mappings (our ID -> HuggingFace ID)
   */
  private getCuratedGPUModelMappings(): Array<{ id: string; huggingfaceId: string }> {
    return [
      { id: 'folder-mcp:bge-m3', huggingfaceId: 'BAAI/bge-m3' },
      { id: 'folder-mcp:multilingual-e5-large', huggingfaceId: 'intfloat/multilingual-e5-large' },
      { id: 'folder-mcp:paraphrase-multilingual-minilm', huggingfaceId: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2' }
    ];
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