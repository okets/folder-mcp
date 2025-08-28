/**
 * Real Ollama Embedding Service
 * 
 * Provides actual API integration with Ollama for generating embeddings
 * using real HTTP calls to localhost:11434/api/embeddings
 */

import type { TextChunk } from '../../types/index.js';
import type { EmbeddingOperations, EmbeddingVector, EmbeddingResult, BatchEmbeddingOperations } from '../../domain/embeddings/index.js';

/**
 * Ollama API configuration
 */
interface OllamaConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  model: string;
}

/**
 * Ollama embedding API request
 */
interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

/**
 * Ollama embedding API response
 */
interface OllamaEmbeddingResponse {
  embedding: number[];
}

/**
 * Real Ollama Embedding Service that makes actual API calls
 */
export class OllamaEmbeddingService implements EmbeddingOperations, BatchEmbeddingOperations {
  private readonly config: OllamaConfig;
  private initialized = false;

  constructor(config?: Partial<OllamaConfig>) {
    // Normalize OLLAMA_HOST if provided
    const defaultBaseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const normalizedBaseUrl = defaultBaseUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    
    this.config = {
      baseUrl: normalizedBaseUrl,
      timeout: 30000, // 30 seconds for embedding generation
      retries: 3,
      model: 'mxbai-embed-large', // Default to a popular embedding model
      ...config
    };
    
    // Also normalize config.baseUrl if provided
    if (this.config.baseUrl) {
      this.config.baseUrl = this.config.baseUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    }
  }

  /**
   * Initialize the service and verify Ollama connectivity
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Check if Ollama is accessible
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`Ollama API not accessible: HTTP ${response.status}`);
      }

      // Verify the embedding model is available
      const data = await response.json() as { models?: { name: string }[] };
      const availableModels = data.models?.map((m) => m.name) || [];
      
      if (!availableModels.includes(this.config.model)) {
        console.warn(`Warning: Embedding model '${this.config.model}' not found in Ollama. Available models:`, availableModels);
        // Continue anyway - the model might be pulled automatically
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Ollama embedding service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a single embedding using real Ollama API
   */
  async generateSingleEmbedding(text: string): Promise<EmbeddingVector> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Handle empty text
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const startTime = Date.now();

    try {
      const response = await this.callOllamaEmbeddingAPI(text);
      const processingTime = Date.now() - startTime;

      return {
        vector: response.embedding,
        dimensions: response.embedding.length,
        model: this.config.model,
        createdAt: new Date().toISOString(),
        metadata: {
          generatedAt: new Date().toISOString(),
          modelVersion: this.config.model,
          tokensUsed: Math.ceil(text.length / 4), // Rough estimate
          confidence: 1.0 // Real embeddings have full confidence
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple chunks using real Ollama API
   */
  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results: EmbeddingVector[] = [];

    // Process chunks sequentially to avoid overwhelming the API
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue; // Skip undefined chunks
      
      try {
        const embedding = await this.generateSingleEmbedding(chunk.content);
        // Use chunk index as identifier since TextChunk doesn't have id property
        embedding.chunkId = `chunk_${i}_${chunk.chunkIndex}`;
        results.push(embedding);
      } catch (error) {
        // For batch processing, continue with other chunks even if one fails
        console.warn(`Failed to generate embedding for chunk ${i}:`, error);
        
        // Create a zero vector as fallback
        results.push({
          vector: new Array(384).fill(0), // Default to 384 dimensions
          dimensions: 384,
          model: this.config.model,
          createdAt: new Date().toISOString(),
          chunkId: `chunk_${i}_${chunk.chunkIndex}`,
          metadata: {
            generatedAt: new Date().toISOString(),
            modelVersion: this.config.model,
            tokensUsed: 0,
            confidence: 0
          }
        });
      }
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   */
  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number {
    if (vector1.vector.length !== vector2.vector.length) {
      throw new Error('Vectors must have the same dimensions for similarity calculation');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.vector.length; i++) {
      const v1 = vector1.vector[i] ?? 0;
      const v2 = vector2.vector[i] ?? 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0; // No similarity if either vector is zero
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Process embeddings in batches with configurable batch size
   */
  async processBatch(chunks: TextChunk[], batchSize: number = 16): Promise<EmbeddingResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results: EmbeddingResult[] = [];

    // Process in batches to manage memory and API load
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Process batch items concurrently (but limit to batch size)
      const batchPromises = batch
        .filter(chunk => chunk !== undefined) // Filter out undefined chunks
        .map(async (chunk, batchIndex): Promise<EmbeddingResult> => {
          const globalIndex = i + batchIndex;
          const startTime = Date.now();
          
          try {
            const embedding = await this.generateSingleEmbedding(chunk.content);
            embedding.chunkId = `chunk_${globalIndex}_${chunk.chunkIndex}`;
            
            return {
              chunk,
              embedding,
              processingTime: Date.now() - startTime,
              success: true
            };
          } catch (error) {
            return {
              chunk,
              embedding: {
                vector: new Array(384).fill(0),
                dimensions: 384,
                model: this.config.model,
                createdAt: new Date().toISOString(),
                chunkId: `chunk_${globalIndex}_${chunk.chunkIndex}`,
                metadata: {
                  generatedAt: new Date().toISOString(),
                  modelVersion: this.config.model,
                  tokensUsed: 0,
                  confidence: 0
                }
              },
              processingTime: Date.now() - startTime,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be API-friendly
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Estimate processing time based on chunk count
   */
  estimateProcessingTime(chunkCount: number): number {
    // Real API calls are slower - estimate 500ms per chunk
    return chunkCount * 500;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current model information
   */
  getModelConfig(): any {
    return {
      model: this.config.model,
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      retries: this.config.retries
    };
  }

  /**
   * Make actual HTTP call to Ollama embedding API
   */
  private async callOllamaEmbeddingAPI(text: string): Promise<OllamaEmbeddingResponse> {
    const request: OllamaEmbeddingRequest = {
      model: this.config.model,
      prompt: text
    };

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as unknown;

        if (!data || typeof data !== 'object' || !('embedding' in data) || !Array.isArray((data as any).embedding)) {
          throw new Error('Invalid response format from Ollama API');
        }

        return data as OllamaEmbeddingResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.config.retries) {
          break; // Don't wait after the final attempt
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, etc.
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Failed to call Ollama API after retries');
  }
}