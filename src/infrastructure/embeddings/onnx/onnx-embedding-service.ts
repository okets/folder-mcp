import * as ort from 'onnxruntime-node';
import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import fs from 'fs/promises';
import { ModelCompatibilityEvaluator, CuratedModel } from '../../../domain/models/model-evaluator.js';
import { ONNXWorkerPool } from './onnx-worker-pool.js';

export interface ONNXEmbeddingOptions {
  modelId: string;
  cacheDirectory?: string;
  maxSequenceLength?: number;
  batchSize?: number;
  useWorkerThreads?: boolean; // Option to enable/disable worker threads
  workerPoolSize?: number; // Number of worker threads in the pool
  numThreads?: number; // Number of threads per ONNX worker
}

export interface EmbeddingResult {
  embeddings: number[][];
  dimensions: number;
  modelUsed: string;
  processingTime: number;
}

export class ONNXEmbeddingService {
  private model: any = null;
  private modelConfig: CuratedModel | null = null;
  private evaluator: ModelCompatibilityEvaluator;
  private cacheDir: string;
  private workerPool: ONNXWorkerPool | null = null;
  private useWorkerThreads: boolean;

  constructor(private options: ONNXEmbeddingOptions) {
    this.evaluator = new ModelCompatibilityEvaluator();
    this.cacheDir = options.cacheDirectory || path.join(process.env.HOME || '~', '.cache', 'folder-mcp', 'onnx-models');
    // Enable worker threads by default for better performance
    this.useWorkerThreads = options.useWorkerThreads !== false;
    
    // Configure Transformers.js environment
    env.allowLocalModels = true;
    env.allowRemoteModels = true;
  }

  async initialize(): Promise<void> {
    const startTime = Date.now();

    // Load model configuration from catalog
    const modelConfig = this.evaluator.getModelById(this.options.modelId);
    if (!modelConfig) {
      throw new Error(`Model ${this.options.modelId} not found in curated catalog`);
    }
    this.modelConfig = modelConfig;

    // ONNX models from Xenova use huggingfaceId, not downloadInfo
    if (!this.modelConfig.downloadInfo && !this.modelConfig.huggingfaceId) {
      throw new Error(`Model ${this.options.modelId} does not have ONNX download information or Hugging Face ID`);
    }

    try {
      console.log(`Initializing ONNX model: ${this.modelConfig.displayName}`);
      
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      if (this.useWorkerThreads) {
        // Initialize worker pool instead of loading model in main thread
        console.log(`[ONNXEmbeddingService] Using worker threads for ${this.options.modelId}`);
        
        // CPM-optimized defaults (2 workers, 2 threads each provides best performance)
        const poolSize = this.options.workerPoolSize || 2;
        const numThreads = this.options.numThreads !== undefined ? this.options.numThreads : 2;
        console.error(`[ONNXEmbeddingService] Creating worker pool with ${poolSize} workers, ${numThreads || 'auto'} threads each for ${this.options.modelId}`);
        
        this.workerPool = new ONNXWorkerPool(this.options.modelId, this.modelConfig, poolSize, numThreads);
        await this.workerPool.initialize();
        console.log(`✅ ONNX worker pool initialized: ${this.modelConfig.displayName}`);
      } else {
        // Fallback to main thread loading (original behavior)
        console.log(`[ONNXEmbeddingService] Using main thread for ${this.options.modelId}`);
        const modelPath = await this.ensureModelDownloaded();
        
        this.model = await pipeline(
          'feature-extraction',
          this.modelConfig.huggingfaceId!,
          {
            local_files_only: false,
            cache_dir: this.cacheDir,
            revision: 'main'
          }
        );
      }

      const initTime = Date.now() - startTime;
      console.log(`✅ ONNX model initialized in ${initTime}ms: ${this.modelConfig.displayName}`);
      
    } catch (error) {
      throw new Error(`Failed to initialize ONNX model ${this.options.modelId}: ${error}`);
    }
  }

  // Implement IEmbeddingService interface method
  async generateEmbeddings(chunks: any[]): Promise<any[]> {
    // Extract text content from chunks
    const texts = chunks.map(chunk => 
      typeof chunk === 'string' ? chunk : chunk.content
    );
    
    const result = await this.generateEmbeddingsFromStrings(texts, 'passage');
    
    // Convert to expected format
    return result.embeddings.map((embedding, index) => ({
      vector: embedding,
      dimensions: result.dimensions,
      metadata: chunks[index]?.metadata || {}
    }));
  }

  async generateEmbeddingsFromStrings(texts: string[], textType: 'query' | 'passage' = 'query'): Promise<EmbeddingResult> {
    if (!this.modelConfig || (!this.model && !this.workerPool)) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      // Process texts in batches if needed
      const batchSize = this.options.batchSize || 16;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await this.processBatch(batch, textType);
        allEmbeddings.push(...batchResults);
        
        // Yield to event loop between batches to prevent blocking connections
        // This allows WebSocket handshakes and HTTP requests to be processed
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        embeddings: allEmbeddings,
        dimensions: this.modelConfig!.dimensions,
        modelUsed: this.modelConfig!.displayName,
        processingTime
      };

    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  private async processBatch(texts: string[], textType: 'query' | 'passage' = 'query'): Promise<number[][]> {
    // If using worker threads, delegate to worker pool
    if (this.useWorkerThreads && this.workerPool) {
      try {
        // Worker pool handles prefixes and truncation internally
        const embeddings = await this.workerPool.processEmbeddings(texts, {
          textType,
          pooling: 'mean',
          normalize: true
        });
        return embeddings;
      } catch (error) {
        console.error('[ONNXEmbeddingService] Worker pool error, falling back to main thread:', error);
        // Fall through to main thread processing if worker fails
      }
    }
    
    // Main thread processing (original behavior)
    if (!this.model) {
      throw new Error('Model not initialized for main thread processing');
    }
    
    // Apply prefixes if the model requires them
    let processedTexts = texts;
    if (this.modelConfig?.requirements?.prefixes) {
      const prefix = textType === 'query' 
        ? this.modelConfig.requirements.prefixes.query || ''
        : this.modelConfig.requirements.prefixes.passage || '';
      
      if (prefix) {
        processedTexts = texts.map(text => prefix + text);
      }
    }
    
    // Use model's actual context window for proper token-based truncation
    // The Xenova transformer pipeline handles tokenization internally
    // For now, we'll do a simple character-based estimation (avg 4 chars per token)
    const contextWindow = this.modelConfig?.contextWindow || 512;
    const maxChars = contextWindow * 4; // Rough estimate: 4 chars per token
    
    // Truncate if needed (temporary until proper tokenization)
    const truncatedTexts = processedTexts.map(text => 
      text.length > maxChars ? text.substring(0, maxChars) : text
    );
    
    // Generate embeddings - the pipeline will do its own tokenization
    const results = await this.model(truncatedTexts, {
      pooling: 'mean',
      normalize: true
    });

    // Extract embeddings from results
    const embeddings: number[][] = [];
    
    // Handle ONNX transformer results which can be tensor objects or arrays

    if (Array.isArray(results)) {
      for (const result of results) {
        if (result && result.data) {
          embeddings.push(Array.from(result.data));
        } else {
          throw new Error('Unexpected result format from ONNX model');
        }
      }
    } else if (results && results.data) {
      // Handle tensor result - may contain multiple embeddings
      const data = Array.from(results.data) as number[];
      const embeddingDim = this.modelConfig!.dimensions; // Use actual model dimension
      
      // Validate that we have the right number of embeddings for the input batch
      const expectedDataLength = texts.length * embeddingDim;
      
      if (data.length === expectedDataLength) {
        // Split tensor data into individual embeddings
        for (let i = 0; i < texts.length; i++) {
          const start = i * embeddingDim;
          const end = start + embeddingDim;
          embeddings.push(data.slice(start, end));
        }
      } else if (data.length === embeddingDim) {
        // Single embedding case - should only happen with 1 text
        if (texts.length === 1) {
          embeddings.push(data);
        } else {
          throw new Error(`ONNX tensor data mismatch: expected ${expectedDataLength} values for ${texts.length} texts, got ${data.length}`);
        }
      } else {
        throw new Error(`ONNX tensor data mismatch: expected ${expectedDataLength} values for ${texts.length} texts (${embeddingDim} dims each), got ${data.length}`);
      }
    } else {
      throw new Error('No embeddings generated from ONNX model');
    }

    // Validate that the number of embeddings matches the number of input texts
    if (embeddings.length !== texts.length) {
      throw new Error(`ONNX embedding count mismatch: expected ${texts.length} embeddings for ${texts.length} texts, got ${embeddings.length}`);
    }
    
    return embeddings;
  }

  private async ensureModelDownloaded(): Promise<string> {
    if (!this.modelConfig) {
      throw new Error('Model configuration not loaded');
    }
    
    // ONNX models from Xenova use huggingfaceId for download location
    if (!this.modelConfig.downloadInfo && !this.modelConfig.huggingfaceId) {
      throw new Error('No download information or Hugging Face ID available for model');
    }

    const modelDir = path.join(this.cacheDir, this.modelConfig.huggingfaceId!.replace('/', '_'));
    const modelFile = path.join(modelDir, 'model_quantized.onnx');

    try {
      // Check if model already exists
      await fs.access(modelFile);
      console.log(`✅ ONNX model already cached: ${modelFile}`);
      return modelFile;
    } catch {
      // Model doesn't exist, will be downloaded by Transformers.js
      console.log(`📥 ONNX model will be downloaded: ${this.modelConfig.huggingfaceId}`);
      return this.modelConfig.huggingfaceId!;
    }
  }

  async getModelInfo(): Promise<{
    modelId: string;
    displayName: string;
    dimensions: number;
    quantization: string;
    languageCount: number;
    modelSize: number;
  }> {
    if (!this.modelConfig) {
      throw new Error('Model not initialized');
    }

    return {
      modelId: this.modelConfig.id,
      displayName: this.modelConfig.displayName,
      dimensions: this.modelConfig.dimensions,
      quantization: this.modelConfig.quantization || 'int8',
      languageCount: Object.keys(this.modelConfig.languagePerformance).length,
      modelSize: this.modelConfig.modelSizeMB
    };
  }

  async dispose(): Promise<void> {
    // Clean up worker pool if used
    if (this.workerPool) {
      console.log('[ONNXEmbeddingService] Shutting down worker pool');
      await this.workerPool.shutdown();
      this.workerPool = null;
    }
    
    if (this.model) {
      // Clean up model resources if needed
      this.model = null;
    }
    this.modelConfig = null;
  }

  // Implement IEmbeddingService interface methods for compatibility
  async generateQueryEmbedding(query: string): Promise<any> {
    const result = await this.generateEmbeddingsFromStrings([query], 'query');
    return {
      vector: result.embeddings[0],
      dimensions: result.dimensions
    };
  }
  
  async generateSingleEmbedding(text: string): Promise<any> {
    const result = await this.generateEmbeddingsFromStrings([text], 'query');
    return {
      vector: result.embeddings[0],
      dimensions: result.dimensions
    };
  }
  
  calculateSimilarity(vector1: any, vector2: any): number {
    // Cosine similarity calculation
    const v1 = Array.isArray(vector1) ? vector1 : vector1.vector;
    const v2 = Array.isArray(vector2) ? vector2 : vector2.vector;
    
    if (!v1 || !v2 || v1.length !== v2.length) {
      throw new Error('Vectors must have the same dimensions for similarity calculation');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }
    
    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    const similarity = denominator === 0 ? 0 : dotProduct / denominator;
    // Clamp to [-1, 1] range to handle floating point errors
    return Math.max(-1, Math.min(1, similarity));
  }
  
  getModelConfig(): any {
    return this.modelConfig;
  }
  
  isInitialized(): boolean {
    return this.modelConfig !== null && (this.model !== null || this.workerPool !== null);
  }
  
  // Test method to verify model works correctly
  async testEmbedding(): Promise<boolean> {
    try {
      const testResult = await this.generateEmbeddingsFromStrings(['Hello world']);
      
      return (
        testResult.embeddings.length === 1 &&
        testResult.embeddings[0]!.length === this.modelConfig!.dimensions &&
        testResult.dimensions === this.modelConfig!.dimensions
      );
    } catch (error) {
      console.error('ONNX model test failed:', error);
      return false;
    }
  }
}