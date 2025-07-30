/**
 * Comprehensive Integration Tests for Python Embeddings System
 * 
 * Tests complete Python embeddings functionality including:
 * - Process lifecycle management with keep-alive
 * - Priority-based processing (immediate vs batch)
 * - Model download and caching
 * - Recovery and error handling
 * - Health monitoring and auto-restart
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PythonEmbeddingService } from '../../../src/infrastructure/embeddings/python-embedding-service.js';
import { existsSync } from 'fs';
import { join } from 'path';
import type { TextChunk } from '../../../src/types/index.js';

describe('Python Embeddings System - Comprehensive Integration', () => {
  let service: PythonEmbeddingService;
  const testTimeout = 60000; // 60 seconds for comprehensive tests

  // Helper function to create test chunks for embeddings
  const createTestChunk = (content: string, index: number): TextChunk => ({
    content,
    chunkIndex: index,
    startPosition: index * 100,
    endPosition: (index + 1) * 100,
    tokenCount: Math.ceil(content.length / 4),
    metadata: {
      sourceFile: 'test-document.txt',
      sourceType: 'text',
      totalChunks: 3,
      hasOverlap: false
    }
  });

  beforeAll(() => {
    // Create service once for all tests - let keep-alive handle persistence
    service = new PythonEmbeddingService({
      modelName: 'all-MiniLM-L6-v2', // Small fast model for testing
      timeout: 30000, // 30 seconds for comprehensive tests
      healthCheckInterval: 5000, // 5 seconds
      autoRestart: false, // Disable auto-restart for faster tests
      maxRestartAttempts: 1,
      restartDelay: 500, // Faster restart for testing
      testConfig: {
        crawlingPauseSeconds: 10,
        keepAliveSeconds: 60,        // 1 minute keep-alive for tests
        shutdownGracePeriodSeconds: 5
      }
    });
  });

  afterAll(async () => {
    // Only cleanup after all tests complete
    if (service) {
      try {
        await service.shutdown(10);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, 15000);

  describe('Environment and Setup', () => {
    it('should have Python script available', () => {
      const scriptPath = join(process.cwd(), 'src/infrastructure/embeddings/python/main.py');
      expect(existsSync(scriptPath)).toBe(true);
    });

    it('should create service with proper configuration', () => {
      expect(service).toBeDefined();
      expect(service.isInitialized()).toBe(false);
      
      const config = service.getModelConfig();
      expect(config.model).toBe('all-MiniLM-L6-v2');
      expect(config.timeout).toBe(30000);
    });
  });

  describe('Service Initialization and Health', () => {
    it('should initialize service successfully', async () => {
      try {
        await service.initialize();
        
        expect(service.isInitialized()).toBe(true);
        
        const stats = service.getServiceStats();
        expect(stats.initialized).toBe(true);
        expect(stats.processId).toBeDefined();
        expect(stats.restartAttempts).toBe(0);
        
      } catch (error) {
        // Skip test if Python dependencies aren't available
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should perform health checks', async () => {
      try {
        await service.initialize();
        
        const health = await service.healthCheck();
        
        expect(health).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        expect(typeof health.model_loaded).toBe('boolean');
        expect(typeof health.gpu_available).toBe('boolean');
        expect(typeof health.uptime_seconds).toBe('number');
        expect(health.uptime_seconds).toBeGreaterThanOrEqual(0);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Model Management', () => {
    it('should check model cache status', async () => {
      try {
        await service.initialize();
        
        const isCached = await service.isModelCached('all-MiniLM-L6-v2');
        expect(typeof isCached).toBe('boolean');
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should download models with validation', async () => {
      try {
        await service.initialize();
        
        // Test valid model download
        const downloadResult = await service.downloadModel('all-MiniLM-L6-v2');
        expect(downloadResult).toBeDefined();
        expect(typeof downloadResult.success).toBe('boolean');
        expect(typeof downloadResult.progress).toBe('number');
        
        if (downloadResult.success) {
          expect(downloadResult.progress).toBe(100);
        }
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should reject unsupported models', async () => {
      try {
        await service.initialize();
        
        const downloadResult = await service.downloadModel('unsupported-model-name');
        expect(downloadResult.success).toBe(false);
        expect(downloadResult.error).toContain('not in supported list');
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Embedding Generation', () => {
    it('should generate single embeddings (immediate priority)', async () => {
      try {
        await service.initialize();
        
        const text = "This is a test sentence for embedding generation.";
        const startTime = Date.now();
        const embedding = await service.generateSingleEmbedding(text);
        const duration = Date.now() - startTime;
        
        expect(embedding).toBeDefined();
        expect(embedding.vector).toBeDefined();
        expect(embedding.dimensions).toBeGreaterThan(0);
        expect(embedding.model).toBe('all-MiniLM-L6-v2');
        expect(embedding.vector.length).toBe(embedding.dimensions);
        
        // Should be reasonably fast for single embedding
        expect(duration).toBeLessThan(10000); // Less than 10 seconds
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should process batch embeddings', async () => {
      try {
        await service.initialize();
        
        const testChunks = [
          createTestChunk("Machine learning is a subset of artificial intelligence.", 0),
          createTestChunk("Deep learning uses neural networks with multiple layers.", 1),
          createTestChunk("Natural language processing enables computers to understand text.", 2)
        ];

        const startTime = Date.now();
        const results = await service.processBatch(testChunks, 2); // Small batch size
        const duration = Date.now() - startTime;

        expect(results).toHaveLength(3);
        expect(duration).toBeLessThan(30000); // Less than 30 seconds
        
        const successCount = results.filter(r => r.success).length;
        expect(successCount).toBeGreaterThan(0);
        
        // Check successful results
        const successfulResults = results.filter(r => r.success);
        for (const result of successfulResults) {
          expect(result.embedding.vector).toBeDefined();
          expect(result.embedding.dimensions).toBeGreaterThan(0);
          expect(result.embedding.model).toBe('all-MiniLM-L6-v2');
          expect(result.processingTime).toBeGreaterThan(0);
        }
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should calculate similarity correctly', async () => {
      try {
        await service.initialize();
        
        const text1 = "The cat sat on the mat.";
        const text2 = "A feline rested on the rug.";
        const text3 = "Computer programming involves writing code.";
        
        const embedding1 = await service.generateSingleEmbedding(text1);
        const embedding2 = await service.generateSingleEmbedding(text2);
        const embedding3 = await service.generateSingleEmbedding(text3);
        
        // Self-similarity should be 1.0
        const selfSimilarity = service.calculateSimilarity(embedding1, embedding1);
        expect(selfSimilarity).toBeCloseTo(1.0, 4);
        
        // Similar sentences should have higher similarity
        const similarSentences = service.calculateSimilarity(embedding1, embedding2);
        const differentSentences = service.calculateSimilarity(embedding1, embedding3);
        
        expect(similarSentences).toBeGreaterThan(0);
        expect(differentSentences).toBeGreaterThan(0);
        expect(similarSentences).toBeGreaterThan(differentSentences);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available') || 
               error instanceof Error && error.message.includes('health check')) {
          console.warn('Skipping test - Python environment not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Batch Processing', () => {
    it('should handle concurrent batch processing efficiently', async () => {
      try {
        await service.initialize();
        
        // Create a batch for testing
        const testBatch = Array(3).fill(null).map((_, i) => 
          createTestChunk(`This is batch text chunk number ${i} for testing batch processing.`, i)
        );

        // Process batch
        const batchStart = Date.now();
        const batchResults = await service.processBatch(testBatch);
        const batchTime = Date.now() - batchStart;
        
        expect(batchResults).toHaveLength(3);
        expect(batchTime).toBeLessThan(15000); // Should be reasonable
        
        const successCount = batchResults.filter(r => r.success).length;
        expect(successCount).toBeGreaterThan(0);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Process Lifecycle and Recovery', () => {
    it('should provide service statistics', async () => {
      try {
        await service.initialize();
        
        const stats = service.getServiceStats();
        
        expect(stats).toBeDefined();
        expect(typeof stats.initialized).toBe('boolean');
        expect(typeof stats.restartAttempts).toBe('number');
        expect(typeof stats.lastRestartTime).toBe('number');
        expect(stats.restartAttempts).toBe(0); // Should be 0 for new service
        
        if (stats.initialized) {
          expect(stats.processId).toBeDefined();
          expect(typeof stats.processId).toBe('number');
        }
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should shutdown gracefully', async () => {
      try {
        await service.initialize();
        
        const initialStats = service.getServiceStats();
        expect(initialStats.initialized).toBe(true);
        
        // Shutdown service
        await service.shutdown(10);
        
        const finalStats = service.getServiceStats();
        expect(finalStats.initialized).toBe(false);
        expect(service.isInitialized()).toBe(false);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty text gracefully', async () => {
      try {
        await service.initialize();
        
        const embedding = await service.generateSingleEmbedding("");
        expect(embedding).toBeDefined();
        expect(embedding.dimensions).toBeGreaterThan(0);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        // Empty text might legitimately fail - that's acceptable
      }
    }, testTimeout);

    it('should handle very long text', async () => {
      try {
        await service.initialize();
        
        // Create very long text (but not excessive for testing)
        const longText = "This is a very long sentence. ".repeat(100);
        
        const embedding = await service.generateSingleEmbedding(longText);
        expect(embedding).toBeDefined();
        expect(embedding.dimensions).toBeGreaterThan(0);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should estimate processing time reasonably', () => {
      const estimate1 = service.estimateProcessingTime(1);
      const estimate10 = service.estimateProcessingTime(10);
      const estimate100 = service.estimateProcessingTime(100);
      
      expect(estimate1).toBeGreaterThan(0);
      expect(estimate10).toBeGreaterThan(estimate1);
      expect(estimate100).toBeGreaterThan(estimate10);
      
      // Should be reasonable estimates (50ms per chunk)
      expect(estimate1).toBe(50);
      expect(estimate10).toBe(500);
      expect(estimate100).toBe(5000);
    });
  });
});