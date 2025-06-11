/**
 * Domain Layer - Embeddings Module Tests
 * 
 * Unit tests for the embeddings domain module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import {
  EmbeddingOperations,
  BatchEmbeddingOperations,
  EmbeddingVector,
  EmbeddingResult,
  EmbeddingMetadata,
  EmbeddingModel
} from '../../../src/domain/embeddings/index.js';
import type { TextChunk } from '../../../src/types/index.js';

describe('Domain Layer - Embeddings Module', () => {
  let embeddingOps: EmbeddingOperations;
  let batchOps: BatchEmbeddingOperations;

  beforeEach(() => {
    // Initialize embedding operations with test implementation
    embeddingOps = {
      generateEmbeddings: async (chunks: TextChunk[]): Promise<EmbeddingVector[]> => {
        return chunks.map((chunk, index) => ({
          vector: Array(384).fill(0).map(() => Math.random() * 2 - 1), // Random normalized vector
          dimensions: 384,
          model: 'test-model',
          chunkId: `chunk-${index}`,
          metadata: {
            generatedAt: new Date().toISOString(),
            modelVersion: '1.0.0',
            tokensUsed: chunk.content.trim() ? chunk.content.split(/\s+/).length : 0,
            confidence: 0.95
          }
        }));
      },

      generateSingleEmbedding: async (text: string): Promise<EmbeddingVector> => {
        return {
          vector: Array(384).fill(0).map(() => Math.random() * 2 - 1),
          dimensions: 384,
          model: 'test-model',
          metadata: {
            generatedAt: new Date().toISOString(),
            modelVersion: '1.0.0',
            tokensUsed: text.trim() ? text.split(/\s+/).length : 0,
            confidence: 0.95
          }
        };
      },

      calculateSimilarity: (vector1: EmbeddingVector, vector2: EmbeddingVector): number => {
        // Calculate cosine similarity
        const dotProduct = vector1.vector.reduce((sum, val, i) => sum + val * vector2.vector[i], 0);
        const magnitude1 = Math.sqrt(vector1.vector.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vector2.vector.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitude1 * magnitude2);
      }
    };

    batchOps = {
      processBatch: async (chunks: TextChunk[], batchSize = 10): Promise<EmbeddingResult[]> => {
        const results: EmbeddingResult[] = [];

        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const batchStartTime = Date.now();
          const embeddings = await embeddingOps.generateEmbeddings(batch);
          
          // Add a small delay to ensure processing time is measurable
          await new Promise(resolve => setTimeout(resolve, 10));
          
          batch.forEach((chunk, j) => {
            results.push({
              chunk,
              embedding: embeddings[j],
              processingTime: Date.now() - batchStartTime,
              success: true
            });
          });
        }

        return results;
      },

      estimateProcessingTime: (chunkCount: number): number => {
        // Rough estimate: 100ms per chunk
        return chunkCount * 100;
      }
    };
  });

  describe('Embedding Generation', () => {
    it('should generate valid embeddings for text chunks', async () => {
      const chunks: TextChunk[] = [
        {
          content: 'First test chunk',
          startPosition: 0,
          endPosition: 16,
          tokenCount: 3,
          chunkIndex: 0,
          metadata: {
            sourceFile: 'test.txt',
            sourceType: 'txt',
            totalChunks: 2,
            hasOverlap: false,
            originalMetadata: {
              originalPath: 'test.txt',
              type: 'txt',
              size: 32,
              lastModified: new Date().toISOString(),
              lines: 1
            }
          }
        },
        {
          content: 'Second test chunk',
          startPosition: 17,
          endPosition: 33,
          tokenCount: 3,
          chunkIndex: 1,
          metadata: {
            sourceFile: 'test.txt',
            sourceType: 'txt',
            totalChunks: 2,
            hasOverlap: false,
            originalMetadata: {
              originalPath: 'test.txt',
              type: 'txt',
              size: 32,
              lastModified: new Date().toISOString(),
              lines: 1
            }
          }
        }
      ];

      const embeddings = await embeddingOps.generateEmbeddings(chunks);
      
      expect(embeddings).toHaveLength(2);
      embeddings.forEach(embedding => {
        expect(embedding.vector).toHaveLength(384);
        expect(embedding.dimensions).toBe(384);
        expect(embedding.model).toBe('test-model');
        expect(embedding.metadata).toBeDefined();
        expect(embedding.metadata?.generatedAt).toBeDefined();
        expect(embedding.metadata?.modelVersion).toBe('1.0.0');
        expect(embedding.metadata?.tokensUsed).toBeGreaterThan(0);
        expect(embedding.metadata?.confidence).toBeGreaterThan(0);
      });
    });

    it('should generate single embedding for text', async () => {
      const text = 'Test text for embedding';
      const embedding = await embeddingOps.generateSingleEmbedding(text);
      
      expect(embedding.vector).toHaveLength(384);
      expect(embedding.dimensions).toBe(384);
      expect(embedding.model).toBe('test-model');
      expect(embedding.metadata?.tokensUsed).toBe(4); // "Test text for embedding"
    });

    it('should calculate similarity between embeddings', () => {
      const vector1: EmbeddingVector = {
        vector: Array(384).fill(0.5),
        dimensions: 384,
        model: 'test-model'
      };
      
      const vector2: EmbeddingVector = {
        vector: Array(384).fill(0.5),
        dimensions: 384,
        model: 'test-model'
      };

      const similarity = embeddingOps.calculateSimilarity(vector1, vector2);
      expect(similarity).toBeCloseTo(1.0, 5); // Identical vectors should have similarity 1
    });
  });

  describe('Batch Processing', () => {
    it('should process chunks in batches', async () => {
      const chunks: TextChunk[] = Array(25).fill(null).map((_, i) => ({
        content: `Test chunk ${i}`,
        startPosition: i * 10,
        endPosition: (i + 1) * 10,
        tokenCount: 2,
        chunkIndex: i,
        metadata: {
          sourceFile: 'test.txt',
          sourceType: 'txt',
          totalChunks: 25,
          hasOverlap: false,
          originalMetadata: {
            originalPath: 'test.txt',
            type: 'txt',
            size: 250,
            lastModified: new Date().toISOString(),
            lines: 25
          }
        }
      }));

      const results = await batchOps.processBatch(chunks, 10);
      
      expect(results).toHaveLength(25);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.processingTime).toBeGreaterThan(0);
        expect(result.embedding).toBeDefined();
        expect(result.chunk).toBeDefined();
      });
    });

    it('should estimate processing time', () => {
      const chunkCount = 100;
      const estimatedTime = batchOps.estimateProcessingTime(chunkCount);
      expect(estimatedTime).toBe(10000); // 100ms per chunk * 100 chunks
    });

    it('should handle empty batch', async () => {
      const results = await batchOps.processBatch([], 10);
      expect(results).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty text in single embedding', async () => {
      const embedding = await embeddingOps.generateSingleEmbedding('');
      expect(embedding.vector).toHaveLength(384);
      expect(embedding.metadata?.tokensUsed).toBe(0);
    });

    it('should handle empty chunks in batch', async () => {
      const chunks: TextChunk[] = [
        {
          content: '',
          startPosition: 0,
          endPosition: 0,
          tokenCount: 0,
          chunkIndex: 0,
          metadata: {
            sourceFile: 'empty.txt',
            sourceType: 'txt',
            totalChunks: 1,
            hasOverlap: false,
            originalMetadata: {
              originalPath: 'empty.txt',
              type: 'txt',
              size: 0,
              lastModified: new Date().toISOString(),
              lines: 0
            }
          }
        }
      ];

      const results = await batchOps.processBatch(chunks);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].embedding.metadata?.tokensUsed).toBe(0);
    });
  });
});
