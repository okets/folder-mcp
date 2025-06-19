/**
 * Embeddings Domain Module
 * 
 * This module contains pure business logic for AI/ML operations,
 * including embedding generation, vector operations, and batch processing.
 */

// Import types from shared types module
import type { TextChunk } from '../../types/index.js';

// Core domain services
export interface EmbeddingOperations {
  generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]>;
  generateSingleEmbedding(text: string): Promise<EmbeddingVector>;
  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number;
}

export interface BatchEmbeddingOperations {
  processBatch(chunks: TextChunk[], batchSize?: number): Promise<EmbeddingResult[]>;
  estimateProcessingTime(chunkCount: number): number;
}

// Domain types
export interface EmbeddingVector {
  vector: number[];
  dimensions: number;
  model: string;
  createdAt: string;
  chunkId?: string;
  metadata?: EmbeddingMetadata;
}

export interface EmbeddingResult {
  chunk: TextChunk;
  embedding: EmbeddingVector;
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface EmbeddingMetadata {
  generatedAt: string;
  modelVersion: string;
  tokensUsed: number;
  confidence?: number;
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  maxTokens: number;
  endpoint?: string;
}

// Default implementation
export class DefaultEmbeddingOperations implements EmbeddingOperations, BatchEmbeddingOperations {
  private readonly model: EmbeddingModel = {
    name: 'default',
    dimensions: 384,
    maxTokens: 512
  };

  async generateSingleEmbedding(text: string): Promise<EmbeddingVector> {
    const startTime = Date.now();
    
    // Handle empty text
    if (!text || text.trim().length === 0) {
      return {
        vector: new Array(this.model.dimensions).fill(0),
        dimensions: this.model.dimensions,
        model: this.model.name,
        metadata: {
          generatedAt: new Date().toISOString(),
          modelVersion: '1.0',
          tokensUsed: 0
        }
      };
    }

    // Simulate embedding generation
    const vector = new Array(this.model.dimensions).fill(0).map(() => Math.random());
    const processingTime = Date.now() - startTime;

    return {
      vector,
      dimensions: this.model.dimensions,
      model: this.model.name,
      createdAt: new Date().toISOString(),
      metadata: {
        generatedAt: new Date().toISOString(),
        modelVersion: '1.0',
        tokensUsed: Math.ceil(text.length / 4), // Rough estimate
        confidence: 0.95
      }
    };
  }

  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]> {
    return Promise.all(chunks.map(chunk => this.generateSingleEmbedding(chunk.content)));
  }

  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number {
    // Simple cosine similarity
    const dotProduct = vector1.vector.reduce((sum, val, i) => {
      const v2 = vector2.vector[i] ?? 0;
      return sum + val * v2;
    }, 0);
    const magnitude1 = Math.sqrt(vector1.vector.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.vector.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitude1 * magnitude2);
  }

  async processBatch(chunks: TextChunk[], batchSize: number = 32): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (chunk) => {
          const chunkStartTime = Date.now();
          try {
            // Ensure empty/whitespace chunk content gets tokensUsed: 0
            if (!chunk.content || chunk.content.trim().length === 0) {
              return {
                chunk,
                embedding: {
                  vector: new Array(this.model.dimensions).fill(0),
                  dimensions: this.model.dimensions,
                  model: this.model.name,
                  metadata: {
                    generatedAt: new Date().toISOString(),
                    modelVersion: '1.0',
                    tokensUsed: 0
                  }
                },
                processingTime: Date.now() - chunkStartTime,
                success: true
              };
            }
            const embedding = await this.generateSingleEmbedding(chunk.content);
            return {
              chunk,
              embedding,
              processingTime: Date.now() - chunkStartTime,
              success: true
            };
          } catch (error) {
            return {
              chunk,
              embedding: {
                vector: new Array(this.model.dimensions).fill(0),
                dimensions: this.model.dimensions,
                model: this.model.name,
                metadata: {
                  generatedAt: new Date().toISOString(),
                  modelVersion: '1.0',
                  tokensUsed: 0
                }
              },
              processingTime: Date.now() - chunkStartTime,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );
      results.push(...batchResults);
    }
    return results;
  }

  estimateProcessingTime(chunkCount: number): number {
    // Rough estimate: 10ms per chunk
    return chunkCount * 10;
  }
}

// Export the TextChunk type for other modules
export type { TextChunk };
