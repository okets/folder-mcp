import * as ort from 'onnxruntime-node';
import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import fs from 'fs/promises';
import { ModelCompatibilityEvaluator, CuratedModel } from '../../../domain/models/model-evaluator.js';

export interface ONNXEmbeddingOptions {
  modelId: string;
  cacheDirectory?: string;
  maxSequenceLength?: number;
  batchSize?: number;
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

  constructor(private options: ONNXEmbeddingOptions) {
    this.evaluator = new ModelCompatibilityEvaluator();
    this.cacheDir = options.cacheDirectory || path.join(process.env.HOME || '~', '.cache', 'folder-mcp', 'onnx-models');
    
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

      // Load the model using Transformers.js pipeline
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
    if (!this.model || !this.modelConfig) {
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
      }

      const processingTime = Date.now() - startTime;

      return {
        embeddings: allEmbeddings,
        dimensions: this.modelConfig.dimensions,
        modelUsed: this.modelConfig.displayName,
        processingTime
      };

    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  private async processBatch(texts: string[], textType: 'query' | 'passage' = 'query'): Promise<number[][]> {
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
    
    // Truncate texts if they exceed max sequence length
    const maxLength = this.options.maxSequenceLength || 512;
    const truncatedTexts = processedTexts.map(text => 
      text.length > maxLength ? text.substring(0, maxLength) : text
    );

    // Generate embeddings using the pipeline
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
      const embeddingDim = 384; // E5-Small dimension
      
      // If data length is multiple of embedding dimension, split into individual embeddings
      if (data.length % embeddingDim === 0) {
        const numEmbeddings = data.length / embeddingDim;
        for (let i = 0; i < numEmbeddings; i++) {
          const start = i * embeddingDim;
          const end = start + embeddingDim;
          embeddings.push(data.slice(start, end));
        }
      } else {
        // Single embedding case
        embeddings.push(data);
      }
    } else {
      throw new Error('No embeddings generated from ONNX model');
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
    return this.model !== null && this.modelConfig !== null;
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