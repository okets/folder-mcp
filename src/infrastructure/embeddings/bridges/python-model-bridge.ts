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
import { createDefaultSemanticMetadata } from '../../../types/index.js';
import type { EmbeddingVector, EmbeddingResult } from '../../../domain/embeddings/index.js';
import { PythonEmbeddingService } from '../python-embedding-service.js';
import { createPythonEmbeddingService } from '../../../daemon/factories/model-factories.js';
import type { ILoggingService } from '../../../di/interfaces.js';
import type { SemanticExtractionOptions } from '../../../domain/semantic/interfaces.js';

/**
 * Configuration interface for Python embedding service
 */
interface PythonServiceConfig {
  modelName: string;
  pythonPath?: string;
  timeout: number;
  maxRetries: number;
  healthCheckInterval: number;
  autoRestart: boolean;
  maxRestartAttempts: number;
  restartDelay: number;
}

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
      const pythonConfig: PythonServiceConfig = {
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

      this.pythonService = await createPythonEmbeddingService(pythonConfig);

      // Check if the model is already loaded (singleton reuse case)
      let initialHealth;
      try {
        initialHealth = await this.pythonService.healthCheck();
      } catch (error) {
        // Service not initialized yet, proceed with initialization
        this.logger?.debug('[PYTHON-BRIDGE] Service not yet initialized, proceeding with initialization');
      }

      // If model is already loaded (singleton reuse), we're done
      if (initialHealth && initialHealth.model_loaded === true) {
        this.logger?.info(`[PYTHON-BRIDGE] Model ${this.modelConfig.modelId} already loaded (singleton reuse)`);
        this.isModelLoaded = true;

        // Report completion
        onProgress?.({
          stage: 'ready',
          progress: 100,
          message: 'Model ready (reused existing)'
        });

        return;
      }

      // Initialize the service (which starts the Python process)
      await this.pythonService.initialize();

      // Wait for model to actually load by checking health status
      // Poll until model_loaded is true
      let modelActuallyLoaded = false;
      let attempts = 0;
      const maxAttempts = 300; // 5 minutes max wait (1 second intervals)

      this.logger?.info(`[PYTHON-BRIDGE] Waiting for model ${this.modelConfig.modelId} to load...`);

      while (!modelActuallyLoaded && attempts < maxAttempts) {
        try {
          const health = await this.pythonService.healthCheck();

          if (health.model_loaded === true) {
            modelActuallyLoaded = true;
            this.logger?.info(`[PYTHON-BRIDGE] Model ${this.modelConfig.modelId} confirmed loaded after ${attempts} seconds`);
          } else {
            // Model still loading, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;

            // Report progress to caller
            if (onProgress && attempts % 5 === 0) {
              onProgress({
                stage: 'loading',
                progress: Math.min(90, attempts / 2), // Assume ~60s typical load time
                message: `Loading model... (${attempts}s elapsed)`
              });
            }

            // Log progress every 10 seconds
            if (attempts % 10 === 0) {
              this.logger?.info(`[PYTHON-BRIDGE] Still waiting for model ${this.modelConfig.modelId} to load... (${attempts}s elapsed)`);
            }
          }
        } catch (error) {
          // Health check failed, wait and retry
          this.logger?.warn(`[PYTHON-BRIDGE] Health check failed, retrying... (attempt ${attempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      if (!modelActuallyLoaded) {
        throw new Error(`Model ${this.modelConfig.modelId} failed to load after ${maxAttempts} seconds`);
      }

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

      // Notify the singleton registry that the model has been unloaded
      // This is critical for proper state tracking when models are unloaded externally
      const PythonEmbeddingServiceRegistry = (await import('../../../daemon/factories/model-factories.js')).PythonEmbeddingServiceRegistry;
      if (PythonEmbeddingServiceRegistry) {
        const registry = PythonEmbeddingServiceRegistry.getInstance();
        registry.notifyModelUnloaded();
      }

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

  /**
   * Verify model is actually loaded by checking Python service state
   * More thorough than isLoaded() - queries Python subprocess directly
   * Waits for background loading to complete (important for GPU models on Windows)
   */
  async verifyLoaded(): Promise<boolean> {
    if (!this.isModelLoaded) {
      return false;
    }

    if (!this.pythonService) {
      return false;
    }

    try {
      // Poll with timeout to wait for background model loading to complete
      // GPU models on Windows can take 5-10 seconds to load
      const maxWaitMs = 15000; // 15 seconds max wait
      const pollIntervalMs = 500; // Check every 500ms
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        const health = await this.pythonService.healthCheck();

        // Check if model is actually loaded (not just loading)
        if (health.model_loaded === true && health.status === 'healthy') {
          this.logger?.debug('[PYTHON-BRIDGE] Model verified as loaded and ready');
          return true;
        }

        // Model is still loading, wait and retry
        if (Date.now() - startTime < maxWaitMs) {
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }
      }

      // Timeout - model didn't finish loading
      this.logger?.warn('[PYTHON-BRIDGE] Timeout waiting for model to finish loading');
      return false;

    } catch (error) {
      this.logger?.warn('[PYTHON-BRIDGE] Health check failed during verification:', error);
      return false;
    }
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
      }, semanticMetadata: createDefaultSemanticMetadata() };

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

    // IMPORTANT: Do NOT shutdown the Python service here!
    // The service is now a singleton managed by PythonEmbeddingServiceRegistry
    // It should stay alive for other models to use
    // Just clear our reference to it
    this.pythonService = null;
  }

  // Expose KeyBERT methods for semantic extraction
  async isKeyBERTAvailable(): Promise<boolean> {
    if (!this.pythonService || !this.isModelLoaded) {
      return false;
    }
    return this.pythonService.isKeyBERTAvailable();
  }

  async extractKeyPhrasesKeyBERT(
    text: string,
    options?: SemanticExtractionOptions
  ): Promise<string[]> {
    if (!this.pythonService || !this.isModelLoaded) {
      throw new Error('Python service not loaded - KeyBERT extraction requires Python with GPU model');
    }
    const scoredPhrases = await this.pythonService.extractKeyPhrasesKeyBERT(text, options);
    return scoredPhrases.map(phrase => phrase.text);
  }
}