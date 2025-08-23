/**
 * Model Download Manager Service
 * 
 * Centralized service responsible for orchestrating model downloads.
 * Manages download state in the CuratedModels section of FMDM.
 * Prevents duplicate downloads and tracks progress globally.
 */

import { ILoggingService } from '../../di/interfaces.js';
import { IFMDMService } from './fmdm-service.js';
import { CuratedModelInfo } from '../models/fmdm.js';
import { PythonEmbeddingService } from '../../infrastructure/embeddings/python-embedding-service.js';
import { ONNXDownloader } from '../../infrastructure/embeddings/onnx/onnx-downloader.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Download request tracking
 */
interface DownloadRequest {
  modelId: string;
  startTime: Date;
  promise: Promise<void>;
}

/**
 * Model Download Manager interface
 */
export interface IModelDownloadManager {
  /**
   * Request a model download (idempotent - won't download if already downloading)
   */
  requestModelDownload(modelId: string): Promise<void>;
  
  /**
   * Check if a model is available (installed or downloading)
   */
  isModelAvailable(modelId: string): Promise<boolean>;
  
  /**
   * Check if a model is currently downloading
   */
  isModelDownloading(modelId: string): boolean;
  
  /**
   * Get current download progress for a model
   */
  getDownloadProgress(modelId: string): number | undefined;
  
  /**
   * Set the Python embedding service (for dependency injection)
   */
  setPythonEmbeddingService(service: PythonEmbeddingService): void;
}

/**
 * Model Download Manager implementation
 */
export class ModelDownloadManager implements IModelDownloadManager {
  private activeDownloads: Map<string, DownloadRequest> = new Map();
  private pythonEmbeddingService?: PythonEmbeddingService;
  private onnxDownloader?: ONNXDownloader;
  
  constructor(
    private logger: ILoggingService,
    private fmdmService: IFMDMService
  ) {}
  
  /**
   * Set the Python embedding service (injected after construction to avoid circular deps)
   */
  setPythonEmbeddingService(service: PythonEmbeddingService): void {
    this.pythonEmbeddingService = service;
  }
  
  /**
   * Set the ONNX downloader (injected after construction to avoid circular deps)
   */
  setONNXDownloader(downloader: ONNXDownloader): void {
    this.onnxDownloader = downloader;
  }
  
  async requestModelDownload(modelId: string): Promise<void> {
    // Check if already downloading
    const existingDownload = this.activeDownloads.get(modelId);
    if (existingDownload) {
      this.logger.debug(`Model ${modelId} already downloading, waiting for completion`);
      return existingDownload.promise;
    }
    
    // Check if already installed
    const modelInfo = this.getModelInfo(modelId);
    if (modelInfo?.installed) {
      this.logger.debug(`Model ${modelId} already installed`);
      return;
    }
    
    // Start new download
    const downloadPromise = this.downloadModel(modelId);
    const request: DownloadRequest = {
      modelId,
      startTime: new Date(),
      promise: downloadPromise
    };
    
    this.activeDownloads.set(modelId, request);
    
    try {
      await downloadPromise;
    } finally {
      this.activeDownloads.delete(modelId);
    }
  }
  
  async isModelAvailable(modelId: string): Promise<boolean> {
    const modelInfo = this.getModelInfo(modelId);
    return modelInfo?.installed || this.isModelDownloading(modelId) || false;
  }
  
  isModelDownloading(modelId: string): boolean {
    return this.activeDownloads.has(modelId);
  }
  
  getDownloadProgress(modelId: string): number | undefined {
    const modelInfo = this.getModelInfo(modelId);
    return modelInfo?.downloadProgress;
  }
  
  /**
   * Get model info from FMDM
   */
  private getModelInfo(modelId: string): CuratedModelInfo | undefined {
    const fmdm = this.fmdmService.getFMDM();
    return fmdm.curatedModels.find(m => m.id === modelId);
  }
  
  /**
   * Perform the actual model download
   */
  private async downloadModel(modelId: string): Promise<void> {
    this.logger.debug(`[MODEL-DOWNLOAD] downloadModel called for ${modelId}`);
    const modelInfo = this.getModelInfo(modelId);
    if (!modelInfo) {
      this.logger.error(`[MODEL-DOWNLOAD] Model ${modelId} not found in curated models`);
      throw new Error(`Model ${modelId} not found in curated models`);
    }
    
    this.logger.debug(`[MODEL-DOWNLOAD] Model info for ${modelId}: type=${modelInfo.type}, installed=${modelInfo.installed}`);
    
    try {
      // Update FMDM to show downloading state
      this.logger.debug(`[MODEL-DOWNLOAD] Setting download state to downloading for ${modelId}`);
      this.updateModelDownloadState(modelId, true, 0);
      
      if (modelInfo.type === 'gpu') {
        this.logger.debug(`[MODEL-DOWNLOAD] Attempting GPU model download for ${modelId}`);
        await this.downloadGPUModel(modelId);
      } else if (modelInfo.type === 'cpu') {
        this.logger.debug(`[MODEL-DOWNLOAD] Attempting CPU model download for ${modelId}`);
        await this.downloadCPUModel(modelId);
      } else {
        this.logger.error(`[MODEL-DOWNLOAD] Unknown model type for ${modelId}: ${modelInfo.type}`);
        throw new Error(`Unknown model type for ${modelId}`);
      }
      
      // Update FMDM to show completion
      this.logger.debug(`[MODEL-DOWNLOAD] Download succeeded, marking as installed for ${modelId}`);
      this.updateModelDownloadState(modelId, false, 100, true);
      this.logger.info(`[MODEL-DOWNLOAD] Successfully downloaded model ${modelId}`);
      
    } catch (error) {
      // Update FMDM to show error
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[MODEL-DOWNLOAD] Download failed for ${modelId}: ${errorMessage}`);
      this.updateModelDownloadState(modelId, false, 0, false, errorMessage);
      this.logger.error(`[MODEL-DOWNLOAD] Failed to download model ${modelId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Download a GPU model using Python embedding service
   */
  private async downloadGPUModel(modelId: string): Promise<void> {
    this.logger.debug(`[MODEL-DOWNLOAD] downloadGPUModel called for ${modelId}`);
    
    if (!this.pythonEmbeddingService) {
      this.logger.error(`[MODEL-DOWNLOAD] Python embedding service not available for ${modelId}`);
      throw new Error('Python embedding service not available for GPU model download');
    }
    
    // Get the HuggingFace model ID from curated models
    this.logger.debug(`[MODEL-DOWNLOAD] Looking up HuggingFace ID for ${modelId}`);
    
    // Load the curated models configuration
    let huggingfaceId: string | undefined;
    try {
      // Get the path to curated-models.json relative to this file
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const curatedModelsPath = join(__dirname, '../../config/curated-models.json');
      const curatedModelsContent = readFileSync(curatedModelsPath, 'utf-8');
      const curatedModels = JSON.parse(curatedModelsContent);
      
      // Find the model configuration in GPU models
      const modelConfig = curatedModels.gpuModels?.models?.find((m: any) => m.id === modelId);
      if (!modelConfig || !modelConfig.huggingfaceId) {
        this.logger.error(`[MODEL-DOWNLOAD] No HuggingFace ID found for model ${modelId}`);
        throw new Error(`No HuggingFace ID mapping found for model ${modelId}`);
      }
      
      huggingfaceId = modelConfig.huggingfaceId;
      this.logger.info(`[MODEL-DOWNLOAD] Found HuggingFace ID for ${modelId}: ${huggingfaceId}`);
      
    } catch (error) {
      this.logger.error(`[MODEL-DOWNLOAD] Failed to load curated models config`, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to find HuggingFace ID for model ${modelId}`);
    }
    
    // Use the Python embedding service to download the model
    this.logger.info(`[MODEL-DOWNLOAD] Starting download of ${huggingfaceId} via Python embedding service`);
    
    try {
      // Start progress simulation while download is happening
      const progressInterval = this.startProgressSimulation(modelId);
      
      try {
        // Call the Python service to download the model
        const result = await this.pythonEmbeddingService.downloadModel(huggingfaceId!);
        
        // Stop progress simulation
        clearInterval(progressInterval);
        
        this.logger.debug(`[MODEL-DOWNLOAD] Download result for ${modelId}: success=${result.success}, progress=${result.progress}`);
        
        if (!result.success) {
          const errorMsg = result.error || 'Model download failed';
          this.logger.error(`[MODEL-DOWNLOAD] Download failed for ${modelId}: ${errorMsg}`);
          this.updateModelDownloadState(modelId, false, 0);
          throw new Error(errorMsg);
        }
        
        // Update progress to 100% on success
        this.logger.info(`[MODEL-DOWNLOAD] Successfully downloaded ${modelId} (${huggingfaceId})`);
        this.updateModelDownloadState(modelId, false, 100);
        
      } catch (downloadError) {
        // Stop progress simulation on error
        clearInterval(progressInterval);
        throw downloadError;
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[MODEL-DOWNLOAD] Failed to download ${modelId}: ${errorMsg}`);
      throw error;
    }
  }
  
  /**
   * Download a CPU model using ONNX downloader
   */
  private async downloadCPUModel(modelId: string): Promise<void> {
    if (!this.onnxDownloader) {
      throw new Error('ONNX downloader not available for CPU model download');
    }
    
    // For now, just check if model is available since ONNX downloader doesn't have progress callback yet
    // TODO: Add progress callback support to ONNX downloader
    const isAvailable = await this.onnxDownloader.isModelAvailable(modelId);
    if (!isAvailable) {
      await this.onnxDownloader.downloadModel(modelId);
    }
  }
  
  /**
   * Start progress simulation for model download
   * Provides visual feedback while download is happening
   */
  private startProgressSimulation(modelId: string): NodeJS.Timeout {
    let currentProgress = 5; // Start at 5% to show immediate feedback
    
    const interval = setInterval(() => {
      // Simulate realistic download progress (slower at start, faster in middle, slower at end)
      let increment: number;
      if (currentProgress < 20) {
        increment = Math.random() * 3 + 1; // 1-4% per update at start
      } else if (currentProgress < 80) {
        increment = Math.random() * 5 + 2; // 2-7% per update in middle
      } else {
        increment = Math.random() * 2 + 0.5; // 0.5-2.5% per update near end
      }
      
      currentProgress = Math.min(90, currentProgress + increment); // Cap at 90% to leave room for actual completion
      
      // Update FMDM with simulated progress
      this.updateModelDownloadState(modelId, true, Math.round(currentProgress));
      
      this.logger.debug(`[MODEL-DOWNLOAD] Progress simulation for ${modelId}: ${Math.round(currentProgress)}%`);
      
    }, 800); // Update every 800ms for smooth but not overwhelming updates
    
    return interval;
  }
  
  /**
   * Update model download state in FMDM
   */
  private updateModelDownloadState(
    modelId: string,
    downloading: boolean,
    progress: number,
    installed?: boolean,
    error?: string
  ): void {
    const fmdm = this.fmdmService.getFMDM();
    const modelIndex = fmdm.curatedModels.findIndex(m => m.id === modelId);
    
    if (modelIndex === -1) {
      this.logger.warn(`Cannot update download state for unknown model ${modelId}`);
      return;
    }
    
    // Update the model info
    const currentModel = fmdm.curatedModels[modelIndex];
    if (!currentModel) {
      this.logger.warn(`Model at index ${modelIndex} is undefined`);
      return;
    }
    
    const updatedModel: CuratedModelInfo = {
      id: currentModel.id,
      installed: currentModel.installed,
      type: currentModel.type,
      downloading,
      downloadProgress: progress,
      lastChecked: new Date().toISOString()
    };
    
    if (installed !== undefined) {
      updatedModel.installed = installed;
    }
    
    if (error) {
      updatedModel.downloadError = error;
    } else {
      delete updatedModel.downloadError;
    }
    
    // Update FMDM
    const updatedModels = [...fmdm.curatedModels];
    updatedModels[modelIndex] = updatedModel;
    
    // Use FMDMService to update and broadcast
    this.fmdmService.setCuratedModelInfo(updatedModels, fmdm.modelCheckStatus!);
    
    // Also update any folders using this model
    this.fmdmService.updateModelDownloadStatus(
      modelId,
      downloading ? 'downloading' : (installed ? 'completed' : 'failed'),
      progress
    );
  }
}