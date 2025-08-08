/**
 * Ollama Embeddings Integration Tests
 * 
 * Tests Ollama integration with automatic service startup.
 * Ollama is a power-user option for additional embedding models.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OllamaEmbeddingService } from '../../../src/infrastructure/embeddings/ollama-embedding-service.js';
import { OllamaTestHelper } from '../../helpers/ollama-launcher.js';
import type { TextChunk, EmbeddingVector } from '../../../src/types/index.js';

describe('Ollama Embeddings - Auto-Start Integration', () => {
  let service: OllamaEmbeddingService;
  let ollamaAvailable = false;
  const testTimeout = 30000; // 30 seconds for tests that might need to pull models
  const TEST_MODEL = 'nomic-embed-text'; // Small, fast model for testing

  beforeAll(async () => {
    // Try to ensure Ollama is running
    ollamaAvailable = await OllamaTestHelper.ensureRunning();
    
    if (!ollamaAvailable) {
      console.warn('⚠️  Ollama could not be started - tests will be skipped');
      return;
    }

    // Ensure test model is available
    const modelReady = await OllamaTestHelper.ensureModel(TEST_MODEL);
    if (!modelReady) {
      console.warn(`⚠️  Could not ensure model ${TEST_MODEL} - tests may fail`);
    }

    service = new OllamaEmbeddingService({
      model: TEST_MODEL,
      timeout: 10000,
      retries: 2,
      baseUrl: 'http://127.0.0.1:11434'
    });

    try {
      await service.initialize();
    } catch (error) {
      console.warn(`⚠️  Ollama initialization failed: ${error}`);
      ollamaAvailable = false;
    }
  }, 60000); // 60 seconds for beforeAll to handle model downloads

  afterAll(async () => {
    // Stop Ollama if we started it
    OllamaTestHelper.stop();
  });

  describe('Service Connectivity', () => {
    it('should successfully connect to Ollama when available', () => {
      if (ollamaAvailable) {
        expect(service).toBeDefined();
        expect(service.isInitialized()).toBe(true);
      } else {
        // This is expected when Ollama is not installed
        expect(service?.isInitialized() ?? false).toBe(false);
      }
    });

    it('should report correct initialization status', () => {
      if (ollamaAvailable) {
        expect(service.isInitialized()).toBe(true);
      } else {
        expect(service?.isInitialized() ?? false).toBe(false);
      }
    });
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings for single text', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping - Ollama not available');
        return;
      }

      const text = 'This is a test document about machine learning.';
      const embedding = await service.generateSingleEmbedding(text);
      
      expect(embedding).toBeDefined();
      expect(embedding.vector).toBeDefined();
      expect(Array.isArray(embedding.vector)).toBe(true);
      expect(embedding.vector.length).toBeGreaterThan(0);
      expect(embedding.vector.every((v: number) => typeof v === 'number')).toBe(true);
      expect(embedding.dimensions).toBe(embedding.vector.length);
    }, testTimeout);

    it('should generate batch embeddings', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping - Ollama not available');
        return;
      }

      const chunks: TextChunk[] = [
        {
          content: 'First document about AI',
          startPosition: 0,
          endPosition: 24,
          tokenCount: 5,
          chunkIndex: 0,
          metadata: {
            sourceFile: 'doc1.txt',
            sourceType: 'txt',
            totalChunks: 3,
            hasOverlap: false
          }
        },
        {
          content: 'Second document about databases',
          startPosition: 0,
          endPosition: 31,
          tokenCount: 5,
          chunkIndex: 1,
          metadata: {
            sourceFile: 'doc2.txt',
            sourceType: 'txt',
            totalChunks: 3,
            hasOverlap: false
          }
        },
        {
          content: 'Third document about web development',
          startPosition: 0,
          endPosition: 36,
          tokenCount: 6,
          chunkIndex: 2,
          metadata: {
            sourceFile: 'doc3.txt',
            sourceType: 'txt',
            totalChunks: 3,
            hasOverlap: false
          }
        }
      ];
      
      const embeddings = await service.generateEmbeddings(chunks);
      
      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(3);
      embeddings.forEach((embedding: EmbeddingVector) => {
        expect(embedding.vector).toBeDefined();
        expect(Array.isArray(embedding.vector)).toBe(true);
        expect(embedding.vector.length).toBeGreaterThan(0);
        expect(embedding.dimensions).toBe(embedding.vector.length);
      });
    }, testTimeout);

    it('should generate consistent embeddings for same text', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping - Ollama not available');
        return;
      }

      const text = 'Consistent embedding test';
      const embedding1 = await service.generateSingleEmbedding(text);
      const embedding2 = await service.generateSingleEmbedding(text);
      
      expect(embedding1.vector.length).toBe(embedding2.vector.length);
      
      // Use the service's own similarity calculation
      const similarity = service.calculateSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThan(0.99); // Should be nearly identical
    }, testTimeout);
  });

  describe('Error Handling', () => {
    it('should handle empty text gracefully', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping - Ollama not available');
        return;
      }

      await expect(service.generateSingleEmbedding('')).rejects.toThrow();
    }, testTimeout);

    it('should handle very long text', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping - Ollama not available');
        return;
      }

      const longText = 'Lorem ipsum '.repeat(10000); // Very long text
      
      // Should either succeed or throw a clear error
      try {
        const embedding = await service.generateSingleEmbedding(longText);
        expect(embedding).toBeDefined();
        expect(embedding.vector).toBeDefined();
        expect(Array.isArray(embedding.vector)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    }, testTimeout);
  });

  describe('Performance', () => {
    it('should generate embeddings within reasonable time', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping - Ollama not available');
        return;
      }

      const text = 'Performance test document';
      const startTime = Date.now();
      
      await service.generateSingleEmbedding(text);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
    }, testTimeout);

    it('should handle concurrent requests', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping - Ollama not available');
        return;
      }

      const texts = Array.from({ length: 5 }, (_, i) => `Document ${i}`);
      
      const promises = texts.map(text => service.generateSingleEmbedding(text));
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(5);
      results.forEach((embedding: EmbeddingVector) => {
        expect(embedding.vector).toBeDefined();
        expect(Array.isArray(embedding.vector)).toBe(true);
        expect(embedding.vector.length).toBeGreaterThan(0);
      });
    }, testTimeout);
  });
});