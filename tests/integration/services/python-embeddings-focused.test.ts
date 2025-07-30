/**
 * Focused Python Embeddings Integration Tests
 * 
 * Fast, focused tests for core Python embeddings functionality.
 * No complex scenarios - just core functionality verification.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PythonEmbeddingService } from '../../../src/infrastructure/embeddings/python-embedding-service.js';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Python Embeddings - Core Functionality', () => {
  let service: PythonEmbeddingService;
  const testTimeout = 15000; // 15 seconds maximum per test

  beforeAll(() => {
    // Create service once for all tests - let keep-alive handle persistence
    service = new PythonEmbeddingService({
      modelName: 'all-MiniLM-L6-v2', // Small fast model for testing
      timeout: 10000, // 10 seconds timeout
      healthCheckInterval: 5000,
      autoRestart: false, // Disable auto-restart for faster tests
      maxRestartAttempts: 1,
      restartDelay: 500,
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

  describe('Environment', () => {
    it('should have Python script available', () => {
      const scriptPath = join(process.cwd(), 'src/infrastructure/embeddings/python/main.py');
      expect(existsSync(scriptPath), `Python script not found at ${scriptPath}`).toBe(true);
    }, testTimeout);

    it('should create service with valid configuration', () => {
      expect(service).toBeDefined();
      expect(service.isInitialized()).toBe(false); // Not initialized yet
    }, testTimeout);
  });

  describe('Service Lifecycle', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    }, testTimeout);

    it('should perform health check', async () => {
      await service.initialize();
      const health = await service.healthCheck();
      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded/);
    }, testTimeout);
  });

  describe('Core Embedding Generation', () => {
    it('should generate single embedding', async () => {
      await service.initialize();
      
      const text = "This is a test sentence.";
      const embedding = await service.generateSingleEmbedding(text);
      
      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding.vector)).toBe(true);
      expect(embedding.vector.length).toBeGreaterThan(0);
      expect(embedding.dimensions).toBeGreaterThan(0);
    }, testTimeout);

    it('should process multiple texts', async () => {
      await service.initialize();
      
      const chunks = [
        { 
          content: "First text", 
          chunkIndex: 0, 
          startPosition: 0, 
          endPosition: 10, 
          tokenCount: 2, 
          metadata: { 
            sourceFile: "test.txt", 
            sourceType: "text", 
            totalChunks: 2, 
            hasOverlap: false 
          } 
        },
        { 
          content: "Second text", 
          chunkIndex: 1, 
          startPosition: 11, 
          endPosition: 22, 
          tokenCount: 2, 
          metadata: { 
            sourceFile: "test.txt", 
            sourceType: "text", 
            totalChunks: 2, 
            hasOverlap: false 
          } 
        }
      ];
      const embeddings = await service.generateEmbeddings(chunks);
      
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(2);
      expect(embeddings[0]?.vector.length).toEqual(embeddings[1]?.vector.length);
    }, testTimeout);

    it('should handle empty input gracefully', async () => {
      await service.initialize();
      
      const embeddings = await service.generateEmbeddings([]);
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(0);
    }, testTimeout);
  });

  describe('Error Handling', () => {

    it('should handle invalid text input', async () => {
      await service.initialize();
      
      // Empty string should be handled gracefully
      const embedding = await service.generateSingleEmbedding("");
      expect(embedding).toBeDefined();
    }, testTimeout);
  });

  // Cleanup test removed - let keep-alive system handle service lifecycle
});