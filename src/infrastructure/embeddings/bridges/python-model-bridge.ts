/**
 * Python Model Bridge
 * 
 * Implements the unified IEmbeddingModel interface for Python-based models.
 * Wraps the existing PythonEmbeddingService to provide consistent behavior
 * with model loading/unloading and priority handling.
 */

import type { 
  IEmbeddingModel, 
  ModelStatus, 
  ModelLoadProgress,
  EmbeddingModelConfig 
} from '../../../domain/models/embedding-model-interface.js';
import type { TextChunk } from '../../../types/index.js';
import type { EmbeddingVector, EmbeddingResult } from '../../../domain/embeddings/index.js';
import { PythonEmbeddingService } from '../python-embedding-service.js';
import type { ILoggingService } from '../../../di/interfaces.js';

export class PythonModelBridge implements IEmbeddingModel {
  private pythonService: PythonEmbeddingService | null = null;
  private isModelLoaded = false;
  private modelConfig: EmbeddingModelConfig;
  private logger: ILoggingService | undefined;
  private lastUsed?: Date;

  constructor(config: EmbeddingModelConfig, logger?: ILoggingService) {
    this.modelConfig = config;
    if (logger) {
      this.logger = logger;
    }
  }

  async getStatus(): Promise<ModelStatus> {
    const status: ModelStatus = {
      isLoaded: this.isModelLoaded,
      modelName: this.modelConfig.modelName || this.modelConfig.modelId,
      modelType: 'python'
    };
    
    if (this.lastUsed) {
      status.lastUsed = this.lastUsed;
    }

    // Get additional status from Python service if loaded
    if (this.pythonService && this.isModelLoaded) {
      try {
        const health = await this.pythonService.healthCheck();
        if (health && typeof health === 'object') {
          status.memoryUsageMB = (health as any).memory_usage_mb;
          status.device = (health as any).gpu_available ? 'GPU' : 'CPU';
        }
      } catch (error) {
        this.logger?.debug('[PYTHON-BRIDGE] Error getting health status:', error);
      }
    }

    return status;
  }

  async load(onProgress?: (progress: ModelLoadProgress) => void): Promise<void> {
    if (this.isModelLoaded) {
      this.logger?.debug('[PYTHON-BRIDGE] Model already loaded');
      return;
    }

    this.logger?.info(`[PYTHON-BRIDGE] Loading Python model: ${this.modelConfig.modelId}`);

    try {
      // Report loading stage
      onProgress?.({
        stage: 'loading',
        message: 'Initializing Python embedding service'
      });

      // Create Python service with configuration
      const pythonConfig: any = {
        modelName: this.modelConfig.modelName || this.modelConfig.modelId,
        timeout: this.modelConfig.timeout || 60000,
        maxRetries: this.modelConfig.maxRetries || 3,
        healthCheckInterval: 30000,
        autoRestart: true,
        maxRestartAttempts: 3,
        restartDelay: 5000
      };
      
      if (this.modelConfig.pythonPath) {
        pythonConfig.pythonPath = this.modelConfig.pythonPath;
      }

      this.pythonService = new PythonEmbeddingService(pythonConfig);

      // Initialize the service (which starts the Python process)
      await this.pythonService.initialize();

      // Check if model needs downloading by attempting a health check
      const health = await this.pythonService.healthCheck();
      
      // The Python service will handle model downloading internally
      // and report progress through its own mechanisms
      
      this.isModelLoaded = true;
      this.lastUsed = new Date();

      onProgress?.({
        stage: 'ready',
        progress: 100,
        message: 'Model loaded successfully'
      });

      this.logger?.info(`[PYTHON-BRIDGE] Python model loaded: ${this.modelConfig.modelId}`);

    } catch (error) {
      onProgress?.({
        stage: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger?.error(`[PYTHON-BRIDGE] Failed to load model:`, errorObj);
      throw errorObj;
    }
  }

  async unload(): Promise<void> {
    if (!this.isModelLoaded || !this.pythonService) {
      return;
    }

    this.logger?.info(`[PYTHON-BRIDGE] Unloading Python model: ${this.modelConfig.modelId}`);

    try {
      // Request model unloading in Python process
      await this.pythonService.requestModelUnload();
      
      // Don't dispose the service yet - just unload the model
      // This allows faster reloading if needed
      
      this.isModelLoaded = false;
      this.logger?.info(`[PYTHON-BRIDGE] Python model unloaded: ${this.modelConfig.modelId}`);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger?.error(`[PYTHON-BRIDGE] Error unloading model:`, errorObj);
      // Continue anyway
      this.isModelLoaded = false;
    }
  }

  async isLoaded(): Promise<boolean> {
    return this.isModelLoaded;
  }

  async generateEmbeddings(chunks: TextChunk[], immediate?: boolean): Promise<EmbeddingVector[]> {
    if (!this.isModelLoaded || !this.pythonService) {
      throw new Error('Model not loaded. Call load() first.');
    }

    this.lastUsed = new Date();

    // TODO: Pass immediate flag to Python service when supported
    // For now, Python service handles priority internally based on timing
    const embeddings = await this.pythonService.generateEmbeddings(chunks);
    
    return embeddings;
  }

  async generateSingleEmbedding(text: string, immediate?: boolean): Promise<EmbeddingVector> {
    if (!this.isModelLoaded || !this.pythonService) {
      throw new Error('Model not loaded. Call load() first.');
    }

    this.lastUsed = new Date();

    // Create a temporary chunk for single embedding
    const chunk: TextChunk = {
      content: text,
      startPosition: 0,
      endPosition: text.length,
      tokenCount: Math.ceil(text.length / 4), // Rough estimate
      chunkIndex: 0,
      metadata: {
        sourceFile: 'direct',
        sourceType: 'text',
        totalChunks: 1,
        hasOverlap: false
      }
    };

    // TODO: Pass immediate flag to Python service when supported
    const embeddings = await this.pythonService.generateEmbeddings([chunk]);
    
    if (!embeddings || embeddings.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    const embedding = embeddings[0];
    if (!embedding) {
      throw new Error('No embedding returned');
    }
    
    return embedding;
  }

  async processBatch(
    chunks: TextChunk[], 
    batchSize: number = 32, 
    immediate?: boolean
  ): Promise<EmbeddingResult[]> {
    if (!this.isModelLoaded || !this.pythonService) {
      throw new Error('Model not loaded. Call load() first.');
    }

    this.lastUsed = new Date();

    // Use the Python service's batch processing
    const results = await this.pythonService.processBatch(chunks, batchSize);
    
    return results;
  }

  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number {
    // Simple cosine similarity calculation
    if (!vector1.vector || !vector2.vector) {
      return 0;
    }

    const dotProduct = vector1.vector.reduce((sum, val, i) => {
      const v2 = vector2.vector[i] ?? 0;
      return sum + val * v2;
    }, 0);

    const magnitude1 = Math.sqrt(vector1.vector.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.vector.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  estimateProcessingTime(chunkCount: number): number {
    // Estimate based on typical Python processing speed
    // Rough estimate: 50ms per chunk for Python models
    return chunkCount * 50;
  }

  async dispose(): Promise<void> {
    this.logger?.info(`[PYTHON-BRIDGE] Disposing Python model bridge: ${this.modelConfig.modelId}`);

    // Unload model first
    if (this.isModelLoaded) {
      await this.unload();
    }

    // Now shutdown the Python service completely
    if (this.pythonService) {
      try {
        await this.pythonService.shutdown();
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        this.logger?.error(`[PYTHON-BRIDGE] Error shutting down Python service:`, errorObj);
      }
      this.pythonService = null;
    }
  }
}