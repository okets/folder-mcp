/**
 * Model Registry Service - Sprint 7
 * 
 * Manages loaded embedding models with LRU cache for optimal performance.
 * Handles folder → model mapping and automatic model switching.
 */

import { ILoggingService } from '../../di/interfaces.js';
import { PythonEmbeddingService } from '../../infrastructure/embeddings/python-embedding-service.js';
import { ONNXDownloader } from '../../infrastructure/embeddings/onnx/onnx-downloader.js';
import { ONNXEmbeddingService } from '../../infrastructure/embeddings/onnx/onnx-embedding-service.js';
import { ONNXSingletonManager } from '../../infrastructure/embeddings/onnx-singleton-manager.js';
import { getSentenceTransformerIdFromModelId, getModelById } from '../../config/model-registry.js';

/**
 * Loaded model instance with metadata
 */
interface LoadedModel {
  modelId: string;
  modelType: 'gpu' | 'cpu';
  service: PythonEmbeddingService | ONNXEmbeddingService;
  loadedAt: Date;
  lastUsedAt: Date;
  memoryUsage?: number; // Estimated memory usage in MB
}

/**
 * Model loading result
 */
export interface ModelLoadResult {
  success: boolean;
  modelId: string;
  loadTime: number;
  wasAlreadyLoaded: boolean;
  error?: string;
}

/**
 * Model Registry interface
 */
export interface IModelRegistry {
  /**
   * Get or load a model for a specific folder
   */
  getModelForFolder(folderId: string, folderPath: string, modelId: string): Promise<ModelLoadResult>;
  
  /**
   * Check if a model is currently loaded
   */
  isModelLoaded(modelId: string): boolean;
  
  /**
   * Get loaded model instance (for search operations)
   */
  getLoadedModel(modelId: string): LoadedModel | undefined;
  
  /**
   * Force unload a specific model
   */
  unloadModel(modelId: string): Promise<void>;
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalLoaded: number;
    maxCapacity: number;
    memoryUsage: number;
    oldestModel?: string | undefined;
    newestModel?: string | undefined;
  };
  
  /**
   * Shutdown all models and cleanup
   */
  shutdown(): Promise<void>;
}

/**
 * Model Registry implementation with LRU cache
 */
export class ModelRegistry implements IModelRegistry {
  private readonly MAX_CACHE_SIZE = 3; // Maximum number of models to keep loaded
  private loadedModels: Map<string, LoadedModel> = new Map();
  
  constructor(
    private logger: ILoggingService,
    private pythonEmbeddingServiceFactory: (config: any) => Promise<PythonEmbeddingService>,
    private onnxDownloaderFactory: () => ONNXDownloader,
    private onnxEmbeddingServiceFactory: (config: any) => ONNXEmbeddingService
  ) {}
  
  async getModelForFolder(folderId: string, folderPath: string, modelId: string): Promise<ModelLoadResult> {
    const startTime = Date.now();
    
    // Check if model is already loaded
    const existingModel = this.loadedModels.get(modelId);
    if (existingModel) {
      // Update last used time for LRU
      existingModel.lastUsedAt = new Date();
      this.logger.debug(`[MODEL-REGISTRY] Model ${modelId} already loaded for folder ${folderId}`);
      
      return {
        success: true,
        modelId,
        loadTime: Date.now() - startTime,
        wasAlreadyLoaded: true
      };
    }
    
    // Model needs to be loaded
    this.logger.info(`[MODEL-REGISTRY] Loading model ${modelId} for folder ${folderId}`);
    
    try {
      // Check if we need to evict models to make room
      if (this.loadedModels.size >= this.MAX_CACHE_SIZE) {
        await this.evictLeastRecentlyUsed();
      }
      
      // Determine model type and load appropriate service
      const modelType = this.getModelType(modelId);
      let service: PythonEmbeddingService | ONNXEmbeddingService;
      
      if (modelType === 'gpu') {
        // Use singleton registry for Python embedding service
        service = await this.pythonEmbeddingServiceFactory({
          modelName: this.getHuggingFaceId(modelId),
          pythonPath: 'python3',
          timeout: 30000 // 30s timeout for model loading
        });
        
      } else if (modelType === 'cpu') {
        // Use singleton manager for ONNX models to prevent memory leaks
        const onnxManager = ONNXSingletonManager.getInstance();
        service = await onnxManager.getModel(modelId) as ONNXEmbeddingService;
        
      } else {
        throw new Error(`Unknown model type for ${modelId}`);
      }
      
      // Add to cache
      const loadedModel: LoadedModel = {
        modelId,
        modelType,
        service,
        loadedAt: new Date(),
        lastUsedAt: new Date(),
        memoryUsage: this.estimateMemoryUsage(modelId, modelType)
      };
      
      this.loadedModels.set(modelId, loadedModel);
      
      const loadTime = Date.now() - startTime;
      this.logger.info(`[MODEL-REGISTRY] Successfully loaded model ${modelId} in ${loadTime}ms`);
      
      return {
        success: true,
        modelId,
        loadTime,
        wasAlreadyLoaded: false
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[MODEL-REGISTRY] Failed to load model ${modelId}:`, error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        modelId,
        loadTime: Date.now() - startTime,
        wasAlreadyLoaded: false,
        error: errorMessage
      };
    }
  }
  
  isModelLoaded(modelId: string): boolean {
    return this.loadedModels.has(modelId);
  }
  
  getLoadedModel(modelId: string): LoadedModel | undefined {
    const model = this.loadedModels.get(modelId);
    if (model) {
      // Update last used time for LRU
      model.lastUsedAt = new Date();
    }
    return model;
  }
  
  async unloadModel(modelId: string): Promise<void> {
    const model = this.loadedModels.get(modelId);
    if (!model) {
      this.logger.debug(`[MODEL-REGISTRY] Model ${modelId} not loaded, nothing to unload`);
      return;
    }
    
    try {
      // Shutdown the service
      if (model.modelType === 'gpu' && 'shutdown' in model.service) {
        await (model.service as PythonEmbeddingService).shutdown();
      }
      // ONNX models don't need explicit shutdown
      
      this.loadedModels.delete(modelId);
      this.logger.info(`[MODEL-REGISTRY] Successfully unloaded model ${modelId}`);
      
    } catch (error) {
      this.logger.warn(`[MODEL-REGISTRY] Error unloading model ${modelId}:`, error instanceof Error ? error : new Error(String(error)));
      // Still remove from cache even if shutdown failed
      this.loadedModels.delete(modelId);
    }
  }
  
  getCacheStats() {
    const models = Array.from(this.loadedModels.values());
    const totalMemory = models.reduce((sum, model) => sum + (model.memoryUsage || 0), 0);
    
    // Find oldest and newest by last used time
    let oldestModel: string | undefined;
    let newestModel: string | undefined;
    let oldestTime = new Date();
    let newestTime = new Date(0);
    
    for (const [modelId, model] of this.loadedModels.entries()) {
      if (model.lastUsedAt < oldestTime) {
        oldestTime = model.lastUsedAt;
        oldestModel = modelId;
      }
      if (model.lastUsedAt > newestTime) {
        newestTime = model.lastUsedAt;
        newestModel = modelId;
      }
    }
    
    return {
      totalLoaded: this.loadedModels.size,
      maxCapacity: this.MAX_CACHE_SIZE,
      memoryUsage: totalMemory,
      oldestModel,
      newestModel
    };
  }
  
  async shutdown(): Promise<void> {
    this.logger.info(`[MODEL-REGISTRY] Shutting down model registry with ${this.loadedModels.size} loaded models`);
    
    const shutdownPromises = Array.from(this.loadedModels.keys()).map(modelId => 
      this.unloadModel(modelId)
    );
    
    await Promise.allSettled(shutdownPromises);
    this.loadedModels.clear();
    
    this.logger.info('[MODEL-REGISTRY] Model registry shutdown complete');
  }
  
  /**
   * Evict the least recently used model to make room for new one
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    if (this.loadedModels.size === 0) {
      return;
    }
    
    // Find least recently used model
    let oldestModel: string | undefined;
    let oldestTime = new Date();
    
    for (const [modelId, model] of this.loadedModels.entries()) {
      if (model.lastUsedAt < oldestTime) {
        oldestTime = model.lastUsedAt;
        oldestModel = modelId;
      }
    }
    
    if (oldestModel) {
      this.logger.info(`[MODEL-REGISTRY] Evicting least recently used model: ${oldestModel}`);
      await this.unloadModel(oldestModel);
    }
  }
  
  /**
   * Determine model type based on model ID
   */
  private getModelType(modelId: string): 'gpu' | 'cpu' {
    if (modelId.startsWith('cpu:')) {
      return 'cpu';
    } else {
      return 'gpu'; // Default to GPU for most models
    }
  }
  
  /**
   * Get HuggingFace model ID for GPU models
   */
  private getHuggingFaceId(modelId: string): string {
    try {
      // Use dynamic lookup from curated models registry - NO hardcoded mappings
      return getSentenceTransformerIdFromModelId(modelId);
    } catch (error) {
      // FAIL LOUDLY - no silent fallbacks allowed
      throw new Error(`Failed to get HuggingFace ID for model ${modelId}: ${error instanceof Error ? error.message : error}`);
    }
  }
  
  /**
   * Estimate memory usage for a model
   */
  private estimateMemoryUsage(modelId: string, modelType: 'gpu' | 'cpu'): number {
    try {
      // Use dynamic lookup from curated models registry - NO hardcoded estimates
      const model = getModelById(modelId);
      if (model?.modelSizeMB) {
        return model.modelSizeMB;
      }
      
      // FAIL LOUDLY - no silent fallbacks allowed
      throw new Error(`Model size not found in registry for ${modelId}`);
    } catch (error) {
      // FAIL LOUDLY - no silent fallbacks allowed
      throw new Error(`Failed to get memory estimate for model ${modelId}: ${error instanceof Error ? error.message : error}`);
    }
  }
}