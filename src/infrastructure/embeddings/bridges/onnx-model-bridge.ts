/**
 * ONNX Model Bridge
 * 
 * Implements the unified IEmbeddingModel interface for ONNX-based models.
 * Provides CPU-optimized embeddings using ONNX Runtime and supports
 * model loading/unloading with download progress tracking.
 */

import type { 
  IEmbeddingModel, 
  ModelStatus, 
  ModelLoadProgress,
  EmbeddingModelConfig, 
} from '../../../domain/models/embedding-model-interface.js';
import type { TextChunk } from '../../../types/index.js';
import type { EmbeddingVector, EmbeddingResult } from '../../../domain/embeddings/index.js';
import type { ILoggingService } from '../../../di/interfaces.js';
import { ONNXDownloader } from '../onnx/onnx-downloader.js';
import { ONNXEmbeddingService } from '../onnx/onnx-embedding-service.js';
import { ModelCompatibilityEvaluator } from '../../../domain/models/model-evaluator.js';
import path from 'path';
import os from 'os';

export class ONNXModelBridge implements IEmbeddingModel {
  private onnxService: ONNXEmbeddingService | null = null;
  private downloader: ONNXDownloader;
  private evaluator: ModelCompatibilityEvaluator;
  private isModelLoaded = false;
  private modelConfig: EmbeddingModelConfig;
  private logger: ILoggingService | undefined;
  private lastUsed?: Date;
  private cacheDir: string;
  private dimensions = 384; // Default, will be updated from model config

  constructor(config: EmbeddingModelConfig, logger?: ILoggingService) {
    this.modelConfig = config;
    this.logger = logger;
    
    // Set up cache directory
    this.cacheDir = config.cacheDirectory ?? 
      path.join(os.homedir(), '.cache', 'folder-mcp', 'onnx-models');
    
    // Initialize evaluator and downloader
    this.evaluator = new ModelCompatibilityEvaluator();
    
    // Create ONNX downloader with cache directory
    this.downloader = new ONNXDownloader({
      cacheDirectory: this.cacheDir,
    });
  }

  private createBasicLogger(): ILoggingService {
    return {
      info: (msg: string, ...args: any[]) => console.log('[ONNX]', msg, ...args),
      debug: (msg: string, ...args: any[]) => console.debug('[ONNX]', msg, ...args),
      error: (msg: string, ...args: any[]) => console.error('[ONNX]', msg, ...args),
      warn: (msg: string, ...args: any[]) => console.warn('[ONNX]', msg, ...args),
    } as ILoggingService;
  }

  async getStatus(): Promise<ModelStatus> {
    const status: ModelStatus = {
      isLoaded: this.isModelLoaded,
      modelName: this.modelConfig.modelName ?? this.modelConfig.modelId,
      modelType: 'onnx',
      device: 'CPU', // ONNX models always run on CPU
    };
    
    if (this.lastUsed) {
      status.lastUsed = this.lastUsed;
    }

    // Estimate memory usage based on model size
    if (this.isModelLoaded) {
      const modelInfo = this.evaluator.getModelById(this.modelConfig.modelId);
      if (modelInfo?.modelSizeMB) {
        // ONNX runtime typically uses 1.5-2x the model size in memory
        status.memoryUsageMB = Math.round(modelInfo.modelSizeMB * 1.5);
      }
    }

    return status;
  }

  async load(onProgress?: (progress: ModelLoadProgress) => void): Promise<void> {
    if (this.isModelLoaded) {
      this.logger?.debug('[ONNX-BRIDGE] Model already loaded');
      return;
    }

    this.logger?.info(`[ONNX-BRIDGE] Loading ONNX model: ${this.modelConfig.modelId}`);

    try {
      // First check if model needs downloading
      const isAvailable = await this.downloader.isModelAvailable(this.modelConfig.modelId);
      
      if (!isAvailable) {
        // Download the model
        onProgress?.({
          stage: 'downloading',
          progress: 0,
          message: 'Downloading ONNX model',
        });

        await this.downloader.downloadModel(
          this.modelConfig.modelId,
          {
            onProgress: (downloadProgress) => {
              onProgress?.({
                stage: 'downloading',
                progress: downloadProgress.progress,
                message: `Downloading model: ${downloadProgress.progress}%`,
              });
            },
          },
        );
      }

      // Now load the model
      onProgress?.({
        stage: 'loading',
        message: 'Initializing ONNX runtime',
      });

      // Create ONNX service
      this.onnxService = new ONNXEmbeddingService({
        modelId: this.modelConfig.modelId,
        cacheDirectory: this.cacheDir,
        batchSize: this.modelConfig.batchSize ?? 32,
        maxSequenceLength: 512, // ONNX models typically have 512 token limit
      });

      // Initialize the service
      await this.onnxService.initialize();

      // Get model dimensions from config
      const modelInfo = this.evaluator.getModelById(this.modelConfig.modelId);
      if (modelInfo?.dimensions) {
        this.dimensions = modelInfo.dimensions;
      }

      this.isModelLoaded = true;
      this.lastUsed = new Date();

      onProgress?.({
        stage: 'ready',
        progress: 100,
        message: 'ONNX model loaded successfully',
      });

      this.logger?.info(`[ONNX-BRIDGE] ONNX model loaded: ${this.modelConfig.modelId}`);

    } catch (error) {
      onProgress?.({
        stage: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger?.error('[ONNX-BRIDGE] Failed to load model:', errorObj);
      throw errorObj;
    }
  }

  async unload(): Promise<void> {
    if (!this.isModelLoaded) {
      return;
    }

    this.logger?.info(`[ONNX-BRIDGE] Unloading ONNX model: ${this.modelConfig.modelId}`);

    try {
      // Dispose of the ONNX service
      if (this.onnxService) {
        await this.onnxService.dispose();
        this.onnxService = null;
      }
      
      this.isModelLoaded = false;
      this.logger?.info(`[ONNX-BRIDGE] ONNX model unloaded: ${this.modelConfig.modelId}`);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger?.error('[ONNX-BRIDGE] Error unloading model:', errorObj);
      // Continue anyway
      this.isModelLoaded = false;
      this.onnxService = null;
    }
  }

  async isLoaded(): Promise<boolean> {
    return this.isModelLoaded;
  }

  async generateEmbeddings(chunks: TextChunk[], immediate?: boolean): Promise<EmbeddingVector[]> {
    if (!this.isModelLoaded || !this.onnxService) {
      throw new Error('Model not loaded. Call load() first.');
    }

    this.lastUsed = new Date();

    // Priority handling for immediate requests
    if (immediate) {
      this.logger?.debug('[ONNX-BRIDGE] Processing immediate/priority request');
    }

    // Extract text from chunks
    const texts = chunks.map(chunk => chunk.content);

    // Generate embeddings using ONNX service
    const result = await this.onnxService.generateEmbeddings(texts);

    // Convert to EmbeddingVector format
    const modelName = this.modelConfig.modelName ?? this.modelConfig.modelId;
    const now = new Date().toISOString();
    
    return result.embeddings.map((embedding, index) => ({
      vector: embedding,
      dimensions: this.dimensions,
      model: modelName,
      createdAt: now,
      chunkId: `chunk-${index}`,
    }));
  }

  async generateSingleEmbedding(text: string, immediate?: boolean): Promise<EmbeddingVector> {
    if (!this.isModelLoaded || !this.onnxService) {
      throw new Error('Model not loaded. Call load() first.');
    }

    this.lastUsed = new Date();

    if (immediate) {
      this.logger?.debug('[ONNX-BRIDGE] Processing immediate/priority single embedding');
    }

    // Generate embedding for single text
    const result = await this.onnxService.generateEmbeddings([text]);

    if (!result.embeddings || result.embeddings.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    const modelName = this.modelConfig.modelName ?? this.modelConfig.modelId;
    const embedding = result.embeddings[0];
    
    if (!embedding) {
      throw new Error('No embedding returned');
    }
    
    return {
      vector: embedding,
      dimensions: this.dimensions,
      model: modelName,
      createdAt: new Date().toISOString(),
    };
  }

  async processBatch(
    chunks: TextChunk[], 
    batchSize?: number, 
    immediate?: boolean,
  ): Promise<EmbeddingResult[]> {
    if (!this.isModelLoaded || !this.onnxService) {
      throw new Error('Model not loaded. Call load() first.');
    }

    this.lastUsed = new Date();

    const effectiveBatchSize = batchSize ?? this.modelConfig.batchSize ?? 32;
    const results: EmbeddingResult[] = [];

    if (immediate) {
      this.logger?.debug('[ONNX-BRIDGE] Processing immediate/priority batch');
    }

    // Process in batches
    for (let i = 0; i < chunks.length; i += effectiveBatchSize) {
      const batch = chunks.slice(i, i + effectiveBatchSize);
      const texts = batch.map(chunk => chunk.content);
      
      const batchResult = await this.onnxService.generateEmbeddings(texts);
      
      // Convert to EmbeddingResult format
      const modelName = this.modelConfig.modelName ?? this.modelConfig.modelId;
      const now = new Date().toISOString();
      
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = batchResult.embeddings[j];
        if (chunk && embedding) {
          results.push({
            chunk,
            embedding: {
              vector: embedding,
              dimensions: this.dimensions,
              model: modelName,
              createdAt: now,
              chunkId: `chunk-${i + j}`,
            },
            processingTime: 0,
            success: true,
          });
        }
      }
    }

    return results;
  }

  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number {
    // Cosine similarity calculation
    if (vector1.dimensions !== vector2.dimensions) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const v1 = vector1?.vector || [];
    const v2 = vector2?.vector || [];
    
    if (v1.length > 0 && v2.length > 0) {
      for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
        const val1 = v1[i];
        const val2 = v2[i];
        if (val1 !== undefined && val2 !== undefined) {
          dotProduct += val1 * val2;
          norm1 += val1 * val1;
          norm2 += val2 * val2;
        }
      }
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  estimateProcessingTime(chunkCount: number): number {
    // ONNX models on CPU typically process at ~100-200 chunks per second
    // depending on model size and CPU capabilities
    const chunksPerSecond = 150; // Conservative estimate
    return Math.ceil((chunkCount / chunksPerSecond) * 1000); // Return in milliseconds
  }

  async dispose(): Promise<void> {
    this.logger?.debug('[ONNX-BRIDGE] Disposing ONNX model bridge');
    
    try {
      await this.unload();
      
      // Clean up downloader if needed
      if (this.downloader) {
        // Downloader doesn't have dispose, but we can null it
        this.downloader = null as any;
      }
      
      this.evaluator = null as any;
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger?.error('[ONNX-BRIDGE] Error during disposal:', errorObj);
    }
  }
}