// GPU-enabled embedding model setup with Ollama integration (Step 15.1)
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';
import { EmbeddingVector } from '../types/index.js';
import { 
  getModelConfig, 
  getDefaultModelConfig, 
  listAvailableModels,
  validateModelConfig,
  EmbeddingModelConfig,
  DEFAULT_CONFIG,
  EmbeddingConfig
} from '../config.js';

// Configure transformers to use local cache
const CACHE_DIR = join(homedir(), '.cache', 'folder-mcp-models');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

// Embedding backend types
type EmbeddingBackend = 'ollama' | 'transformers';

// Performance tracking
interface PerformanceStats {
  backend: EmbeddingBackend;
  isGPUAccelerated: boolean;
  embeddingsGenerated: number;
  totalTimeMs: number;
  avgTimePerEmbedding: number;
}

export class EmbeddingModel {
  private pipeline: any = null;
  private modelConfig: EmbeddingModelConfig;
  private config: EmbeddingConfig;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private backend: EmbeddingBackend = 'ollama'; // Default to GPU-accelerated
  private performanceStats: PerformanceStats;

  constructor(
    modelKey?: string, 
    customConfig?: Partial<EmbeddingConfig>
  ) {
    // Get model configuration
    this.modelConfig = modelKey ? getModelConfig(modelKey) : getDefaultModelConfig();
    
    // Merge with default config
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    
    // Validate configuration
    validateModelConfig(this.modelConfig);
    
    this.performanceStats = {
      backend: 'ollama',
      isGPUAccelerated: false,
      embeddingsGenerated: 0,
      totalTimeMs: 0,
      avgTimePerEmbedding: 0
    };
  }

  /**
   * Initialize the embedding model with GPU detection and fallback logic
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    console.log('🚀 Initializing GPU-enabled embedding model...');
    
    try {
      // First, try to use Ollama for GPU acceleration
      if (await this.isOllamaInstalled()) {
        console.log('✅ Ollama CLI detected');
        
        if (await this.isOllamaRunning()) {
          console.log('✅ Ollama service is running');
            if (await this.isOllamaModelAvailable()) {
            console.log(`✅ Model '${this.modelConfig.ollamaModel}' is available`);
            
            // Test Ollama embedding generation
            if (await this.testOllamaEmbedding()) {
              this.backend = 'ollama';
              this.performanceStats.backend = 'ollama';
              this.performanceStats.isGPUAccelerated = true;
              this.isInitialized = true;
              console.log('🎉 GPU-accelerated embedding model initialized successfully!');
              return;
            }          } else {
            console.log(`⚠️ Model '${this.modelConfig.ollamaModel}' not found. Attempting to download...`);
            if (await this.pullOllamaModel()) {
              if (await this.testOllamaEmbedding()) {
                this.backend = 'ollama';
                this.performanceStats.backend = 'ollama';
                this.performanceStats.isGPUAccelerated = true;
                this.isInitialized = true;
                console.log('🎉 GPU-accelerated embedding model initialized successfully!');
                return;
              }
            }
          }
        } else {
          console.log('⚠️ Ollama service not running');
        }
      } else {
        console.log('⚠️ Ollama CLI not found');
        this.showOllamaInstallationInstructions();
      }
    } catch (error) {
      console.warn('⚠️ Ollama initialization failed:', error);
    }

    // Fallback to CPU-based Transformers.js
    console.log('🔄 Falling back to CPU-based embedding model...');
    await this._initializeTransformers();
    this.backend = 'transformers';
    this.performanceStats.backend = 'transformers';
    this.performanceStats.isGPUAccelerated = false;
    this.isInitialized = true;
    console.log('✅ CPU-based embedding model initialized successfully');
  }

  /**
   * Check if Ollama CLI is installed
   */
  private async isOllamaInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('ollama', ['--version'], { stdio: 'pipe' });
      
      const timeout = setTimeout(() => {
        process.kill();
        resolve(false);
      }, 5000);
      
      process.on('exit', (code) => {
        clearTimeout(timeout);
        resolve(code === 0);
      });
      
      process.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  /**
   * Check if Ollama service is running
   */  private async isOllamaRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaApiUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if the Ollama model is available
   */  private async isOllamaModelAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ollamaApiUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) return false;
      
      const data = await response.json() as { models: Array<{ name: string }> };
      return data.models.some(model => model.name.includes(this.modelConfig.ollamaModel));
    } catch {
      return false;
    }
  }

  /**
   * Download the Ollama model
   */  private async pullOllamaModel(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`📥 Downloading model '${this.modelConfig.ollamaModel}'...`);
      
      const process = spawn('ollama', ['pull', this.modelConfig.ollamaModel], { stdio: 'inherit' });
      
      const timeout = setTimeout(() => {
        process.kill();
        console.error('❌ Model download timeout');
        resolve(false);
      }, 300000); // 5 minute timeout
      
      process.on('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          console.log(`✅ Model '${this.modelConfig.ollamaModel}' downloaded successfully`);
          resolve(true);
        } else {
          console.error(`❌ Model download failed with code ${code}`);
          resolve(false);
        }
      });
      
      process.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Model download error:', error);
        resolve(false);
      });
    });
  }

  /**
   * Test Ollama embedding generation
   */
  private async testOllamaEmbedding(): Promise<boolean> {
    try {
      console.log('🧪 Testing Ollama embedding generation...');
      const testText = 'test embedding generation';
      await this.generateOllamaEmbedding(testText);
      console.log('✅ Ollama embedding test successful');
      return true;
    } catch (error) {
      console.error('❌ Ollama embedding test failed:', error);
      return false;
    }
  }

  /**
   * Initialize the Transformers.js pipeline
   */  private async _initializeTransformers(): Promise<void> {
    const { pipeline } = await import('@xenova/transformers');
    
    console.log(`📥 Loading model: ${this.modelConfig.transformersModel}`);
    console.log(`📁 Cache directory: ${CACHE_DIR}`);
    
    this.pipeline = await pipeline('feature-extraction', this.modelConfig.transformersModel, {
      cache_dir: CACHE_DIR,
      local_files_only: false,
      progress_callback: (progress: any) => {
        if (progress.status === 'downloading') {
          const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
          console.log(`📥 Downloading: ${percent}%`);
        }
      }
    });
    
    console.log('✅ Transformers model loaded successfully');
  }

  /**
   * Show Ollama installation instructions
   */  private showOllamaInstallationInstructions(): void {
    console.log('\n📋 To enable GPU acceleration, install Ollama:');
    console.log('   Windows: https://ollama.ai/download');
    console.log('   macOS:   brew install ollama');
    console.log('   Linux:   curl -fsSL https://ollama.ai/install.sh | sh');
    console.log(`   Then run: ollama pull ${this.modelConfig.ollamaModel}`);
    console.log('   And start: ollama serve\n');
  }

  /**
   * Generate embedding using Ollama API
   */  private async generateOllamaEmbedding(text: string): Promise<EmbeddingVector> {
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${this.config.ollamaApiUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.modelConfig.ollamaModel,
          prompt: text
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as { embedding: number[] };
      const endTime = Date.now();
      
      // Update performance stats
      this.performanceStats.embeddingsGenerated++;
      this.performanceStats.totalTimeMs += (endTime - startTime);
      this.performanceStats.avgTimePerEmbedding = 
        this.performanceStats.totalTimeMs / this.performanceStats.embeddingsGenerated;
      
      return {
        vector: data.embedding,
        dimensions: data.embedding.length,
        model: this.modelConfig.ollamaModel,
        createdAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Ollama embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text string
   */
  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    await this.initialize();
    
    if (this.backend === 'ollama') {
      return this.generateOllamaEmbedding(text);
    }

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
        model: this.modelConfig.transformersModel,
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
    
    console.log(`🔄 Generating embeddings for ${texts.length} texts (batch size: ${batchSize})`);
    console.log(`📊 Using ${this.backend} backend ${this.performanceStats.isGPUAccelerated ? '(GPU-accelerated)' : '(CPU-only)'}`);
    
    const results: EmbeddingVector[] = [];
    
    if (this.backend === 'ollama') {
      // For Ollama, process sequentially to avoid overwhelming the API
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const progress = ((i + 1) / texts.length * 100).toFixed(1);
        console.log(`🔄 Processing ${i + 1}/${texts.length} (${progress}%)`);
        
        try {
          const embedding = await this.generateOllamaEmbedding(text);
          results.push(embedding);
        } catch (error) {
          console.error(`❌ Failed to generate embedding for text ${i + 1}:`, error);
          throw error;
        }
      }
    } else {
      // For Transformers.js, use batch processing
      if (!this.pipeline) {
        throw new Error('Embedding model not initialized');
      }

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
                model: this.modelConfig.transformersModel,
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
    }
    
    console.log(`🎉 Generated ${results.length} embeddings successfully`);
    return results;
  }

  /**
   * Check if model is initialized and available offline
   */  isModelAvailable(): boolean {
    const modelCacheDir = join(CACHE_DIR, 'models--' + this.modelConfig.transformersModel.replace('/', '--'));
    return existsSync(modelCacheDir);
  }

  /**
   * Get model information
   */  getModelInfo(): { 
    name: string; 
    dimensions: number; 
    cached: boolean; 
    cacheDir: string;
    backend: EmbeddingBackend;
    isGPUAccelerated: boolean;
    performanceStats: PerformanceStats;
  } {
    return {
      name: this.backend === 'ollama' ? this.modelConfig.ollamaModel : this.modelConfig.transformersModel,
      dimensions: this.modelConfig.dimensions,
      cached: this.isModelAvailable(),
      cacheDir: CACHE_DIR,
      backend: this.performanceStats.backend,
      isGPUAccelerated: this.performanceStats.isGPUAccelerated,
      performanceStats: { ...this.performanceStats }
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

  /**
   * Switch to a different embedding model
   */
  async switchModel(modelKey: string): Promise<void> {
    console.log(`🔄 Switching to model: ${modelKey}`);
    
    // Reset current state
    this.isInitialized = false;
    this.initPromise = null;
    this.pipeline = null;
    this.backend = 'ollama'; // Default to GPU-accelerated
    
    // Update configuration
    this.modelConfig = getModelConfig(modelKey);
    validateModelConfig(this.modelConfig);
    
    // Reset performance stats
    this.performanceStats = {
      backend: 'ollama',
      isGPUAccelerated: false,
      embeddingsGenerated: 0,
      totalTimeMs: 0,
      avgTimePerEmbedding: 0
    };
    
    console.log(`✅ Switched to ${this.modelConfig.name} (${this.modelConfig.dimensions}D)`);
    
    // Initialize the new model
    await this.initialize();
  }

  /**
   * Get current model configuration
   */
  getCurrentModelConfig(): EmbeddingModelConfig {
    return { ...this.modelConfig };
  }

  /**
   * Update configuration settings
   */
  updateConfig(newConfig: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset and reinitialize the model
   */
  async reset(): Promise<void> {
    this.isInitialized = false;
    this.initPromise = null;
    this.pipeline = null;
    this.backend = 'ollama';
    
    // Reset performance stats
    this.performanceStats = {
      backend: this.performanceStats.backend,
      isGPUAccelerated: false,
      embeddingsGenerated: 0,
      totalTimeMs: 0,
      avgTimePerEmbedding: 0
    };
    
    await this.initialize();
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
 * Create a new embedding model instance with a specific configuration
 */
export function createEmbeddingModel(
  modelKey?: string, 
  config?: Partial<EmbeddingConfig>
): EmbeddingModel {
  return new EmbeddingModel(modelKey, config);
}

/**
 * Switch the default model to a different configuration
 */
export async function switchDefaultModel(modelKey: string): Promise<void> {
  const model = getDefaultEmbeddingModel();
  await model.switchModel(modelKey);
}

/**
 * List all available embedding models with their configurations
 */
export function listEmbeddingModels(): Array<{ key: string; config: EmbeddingModelConfig }> {
  return listAvailableModels();
}

/**
 * Test the embedding system with GPU detection
 */
export async function testEmbeddingSystem(): Promise<void> {
  console.log('🚀 Testing GPU-enabled embedding system...');
  
  try {
    const model = getDefaultEmbeddingModel();
    
    // Initialize and check backend
    await model.initialize();
    const modelInfo = model.getModelInfo();
    
    console.log(`📊 Backend: ${modelInfo.backend} ${modelInfo.isGPUAccelerated ? '(GPU-accelerated)' : '(CPU-only)'}`);
    console.log(`📝 Model: ${modelInfo.name}`);
    console.log(`📏 Dimensions: ${modelInfo.dimensions}`);
    
    // Test single embedding
    const testText = 'The quick brown fox jumps over the lazy dog.';
    console.log(`📝 Test text: "${testText}"`);
    
    const startTime = Date.now();
    const embedding = await model.generateEmbedding(testText);
    const singleTime = Date.now() - startTime;
    
    console.log(`✅ Single embedding test passed:`);
    console.log(`   - Dimensions: ${embedding.dimensions}`);
    console.log(`   - Model: ${embedding.model}`);
    console.log(`   - Generation time: ${singleTime}ms`);
    console.log(`   - Vector sample: [${embedding.vector.slice(0, 3).map(x => x.toFixed(4)).join(', ')}, ...]`);
    
    // Test batch embeddings
    const testTexts = [
      'This is the first test sentence.',
      'Here is another sentence for testing.',
      'The third sentence contains different words.',
      'GPU acceleration makes embedding generation faster.',
      'Ollama provides excellent performance for embeddings.'
    ];
    
    console.log(`📦 Testing batch embedding with ${testTexts.length} texts...`);
    const batchStartTime = Date.now();
    const batchEmbeddings = await model.generateBatchEmbeddings(testTexts, 3);
    const batchTime = Date.now() - batchStartTime;
      console.log(`✅ Batch embedding test passed:`);
    console.log(`   - Generated: ${batchEmbeddings.length} embeddings`);
    console.log(`   - All dimensions match: ${batchEmbeddings.every(e => e.dimensions === modelInfo.dimensions)}`);
    console.log(`   - Total batch time: ${batchTime}ms`);
    console.log(`   - Average per embedding: ${(batchTime / batchEmbeddings.length).toFixed(1)}ms`);
    
    // Show performance statistics
    const perfStats = modelInfo.performanceStats;
    if (perfStats.embeddingsGenerated > 0) {
      console.log(`📈 Performance Statistics:`);
      console.log(`   - Backend: ${perfStats.backend} ${perfStats.isGPUAccelerated ? '(GPU)' : '(CPU)'}`);
      console.log(`   - Total embeddings: ${perfStats.embeddingsGenerated}`);
      console.log(`   - Total time: ${perfStats.totalTimeMs}ms`);
      console.log(`   - Average time per embedding: ${perfStats.avgTimePerEmbedding.toFixed(1)}ms`);
    }
    
    console.log('🎉 All embedding tests passed!');
    
    // Show GPU status summary
    if (modelInfo.isGPUAccelerated) {
      console.log('🚀 GPU acceleration is ACTIVE - optimal performance!');
    } else {
      console.log('⚠️ Running on CPU - consider installing Ollama for GPU acceleration');
    }
    
  } catch (error) {
    console.error('❌ Embedding system test failed:', error);
    throw error;
  }
}
