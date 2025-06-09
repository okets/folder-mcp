// Embedding model setup and management for Step 15
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { EmbeddingModelConfig, EmbeddingVector } from '../types/index.js';

// Configure transformers to use local cache
const CACHE_DIR = join(homedir(), '.cache', 'folder-mcp-models');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

// Model configuration - Nomic Embed v1.5 (768 dimensions)
const DEFAULT_MODEL = 'nomic-ai/nomic-embed-text-v1.5';
const EXPECTED_DIMENSIONS = 768;

export class EmbeddingModel {
  private pipeline: any = null;
  private modelName: string;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(modelName: string = DEFAULT_MODEL) {
    this.modelName = modelName;
  }

  /**
   * Initialize the embedding model with download progress
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('🔧 Initializing embedding model...');
      console.log(`📦 Model: ${this.modelName}`);
      console.log(`💾 Cache directory: ${CACHE_DIR}`);
      
      // Dynamic import of transformers
      const { pipeline, env } = await import('@xenova/transformers');
      
      // Set the cache directory for @xenova/transformers
      env.cacheDir = CACHE_DIR;
      
      // Check if model is already cached
      const modelCacheDir = join(CACHE_DIR, 'models--' + this.modelName.replace('/', '--'));
      const isModelCached = existsSync(modelCacheDir);
      
      if (isModelCached) {
        console.log('✅ Model found in cache, loading...');
      } else {
        console.log('⬇️  Model not found in cache, downloading...');
        console.log('📊 This may take a few minutes for the first run...');
      }

      // Load the pipeline with progress tracking
      const startTime = Date.now();
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
            console.log(`⏬ Downloading ${progress.file}: ${percent}% (${this.formatBytes(progress.loaded)}/${this.formatBytes(progress.total)})`);
          } else if (progress.status === 'loading') {
            console.log(`📂 Loading ${progress.file}...`);
          } else if (progress.status === 'ready') {
            console.log(`✅ Ready: ${progress.file}`);
          }
        }
      });

      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`🎉 Model loaded successfully in ${loadTime}s`);
      
      // Test the model with a simple string
      await this.testModel();
      
      this.isInitialized = true;
      console.log('✅ Embedding model ready for use');
      
    } catch (error) {
      console.error('❌ Failed to initialize embedding model:', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Test the model with a simple string to verify it works
   */
  private async testModel(): Promise<void> {
    console.log('🧪 Testing model with sample text...');
    
    try {
      const testText = 'This is a test sentence for embedding generation.';
      const result = await this.pipeline(testText, {
        pooling: 'mean',
        normalize: true
      });
      
      const embedding = result.data;
      const dimensions = embedding.length;
      
      console.log(`📏 Generated embedding: ${dimensions} dimensions`);
      
      if (dimensions !== EXPECTED_DIMENSIONS) {
        console.warn(`⚠️  Warning: Expected ${EXPECTED_DIMENSIONS} dimensions, got ${dimensions}`);
      } else {
        console.log(`✅ Embedding dimensions match expected: ${EXPECTED_DIMENSIONS}`);
      }
      
      // Show a sample of the embedding
      const sample = embedding.slice(0, 5).map((x: number) => x.toFixed(4));
      console.log(`📊 Sample embedding values: [${sample.join(', ')}, ...]`);
      
    } catch (error) {
      console.error('❌ Model test failed:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text string
   */
  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    await this.initialize();
    
    if (!this.pipeline) {
      throw new Error('Embedding model not initialized');
    }

    try {
      const result = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true
      });
      
      const vector = Array.from(result.data as Float32Array | number[]);
      
      return {
        vector: vector as number[],
        dimensions: vector.length,
        model: this.modelName,
        createdAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[], batchSize: number = 32): Promise<EmbeddingVector[]> {
    await this.initialize();
    
    if (!this.pipeline) {
      throw new Error('Embedding model not initialized');
    }

    console.log(`🔄 Generating embeddings for ${texts.length} texts (batch size: ${batchSize})`);
    
    const results: EmbeddingVector[] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(texts.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`);
      
      try {
        const batchResults = await Promise.all(
          batch.map(async (text) => {
            const result = await this.pipeline(text, {
              pooling: 'mean',
              normalize: true
            });
            
            const vector = Array.from(result.data as Float32Array | number[]);
            
            return {
              vector: vector as number[],
              dimensions: result.data.length,
              model: this.modelName,
              createdAt: new Date().toISOString()
            };
          })
        );
        
        results.push(...batchResults);
        
        const progress = ((i + batch.length) / texts.length * 100).toFixed(1);
        console.log(`✅ Batch ${batchNum}/${totalBatches} complete (${progress}%)`);
        
      } catch (error) {
        console.error(`❌ Batch ${batchNum} failed:`, error);
        throw error;
      }
    }
    
    console.log(`🎉 Generated ${results.length} embeddings successfully`);
    return results;
  }

  /**
   * Check if model is initialized and available offline
   */
  isModelAvailable(): boolean {
    const modelCacheDir = join(CACHE_DIR, 'models--' + this.modelName.replace('/', '--'));
    return existsSync(modelCacheDir);
  }

  /**
   * Get model information
   */
  getModelInfo(): { name: string; dimensions: number; cached: boolean; cacheDir: string } {
    return {
      name: this.modelName,
      dimensions: EXPECTED_DIMENSIONS,
      cached: this.isModelAvailable(),
      cacheDir: CACHE_DIR
    };
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// Singleton instance for the default model
let defaultModel: EmbeddingModel | null = null;

/**
 * Get the default embedding model instance
 */
export function getDefaultEmbeddingModel(): EmbeddingModel {
  if (!defaultModel) {
    defaultModel = new EmbeddingModel();
  }
  return defaultModel;
}

/**
 * Test the embedding system
 */
export async function testEmbeddingSystem(): Promise<void> {
  console.log('🚀 Testing embedding system...');
  
  try {
    const model = getDefaultEmbeddingModel();
    
    // Test single embedding
    const testText = 'The quick brown fox jumps over the lazy dog.';
    console.log(`📝 Test text: "${testText}"`);
    
    const embedding = await model.generateEmbedding(testText);
    
    console.log(`✅ Single embedding test passed:`);
    console.log(`   - Dimensions: ${embedding.dimensions}`);
    console.log(`   - Model: ${embedding.model}`);
    console.log(`   - Vector sample: [${embedding.vector.slice(0, 3).map(x => x.toFixed(4)).join(', ')}, ...]`);
    
    // Test batch embeddings
    const testTexts = [
      'This is the first test sentence.',
      'Here is another sentence for testing.',
      'The third sentence contains different words.'
    ];
    
    console.log(`📦 Testing batch embedding with ${testTexts.length} texts...`);
    const batchEmbeddings = await model.generateBatchEmbeddings(testTexts, 2);
    
    console.log(`✅ Batch embedding test passed:`);
    console.log(`   - Generated: ${batchEmbeddings.length} embeddings`);
    console.log(`   - All dimensions: ${batchEmbeddings.every(e => e.dimensions === EXPECTED_DIMENSIONS)}`);
    
    console.log('🎉 All embedding tests passed!');
    
  } catch (error) {
    console.error('❌ Embedding system test failed:', error);
    throw error;
  }
}
