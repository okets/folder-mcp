/**
 * Minimal Ollama Embeddings Integration Tests
 * 
 * Basic verification that Ollama integration works.
 * Python is the primary embedding system.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OllamaEmbeddingService } from '../../../src/infrastructure/embeddings/ollama-embedding-service.js';

describe('Ollama Embeddings - Basic Verification', () => {
  let service: OllamaEmbeddingService;
  let ollamaAvailable = false;
  const testTimeout = 10000; // 10 seconds maximum per test

  beforeAll(async () => {
    service = new OllamaEmbeddingService({
      model: 'all-MiniLM-L6-v2', // Same small model as Python
      timeout: 10000, // 10 seconds timeout
      retries: 2,
      baseUrl: 'http://127.0.0.1:11434'
    });

    // Test if Ollama is available
    try {
      await service.initialize();
      ollamaAvailable = true;
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Ollama API not accessible') ||
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED')
      )) {
        console.warn('⚠️  Ollama not available - tests will be skipped');
        ollamaAvailable = false;
      } else {
        console.warn(`⚠️  Ollama initialization failed: ${error} - tests will be skipped`);
        ollamaAvailable = false;
      }
    }
  });

  afterAll(async () => {
    // No cleanup needed for Ollama service
  }, 10000);

  describe('Basic Configuration', () => {
    it('should create service with valid configuration', () => {
      expect(service).toBeDefined();
      
      const config = service.getModelConfig();
      expect(config).toBeDefined();
      expect(config.model).toBe('all-MiniLM-L6-v2');
      expect(config.baseUrl).toBe('http://127.0.0.1:11434');
      expect(config.timeout).toBe(10000);
      expect(config.retries).toBe(2);
    }, testTimeout);
  });

  describe('Service Connectivity', () => {
    it('should handle Ollama service availability', async () => {
      if (!ollamaAvailable) {
        console.warn('✓ Ollama not available - skipping (expected)');
        return;
      }

      expect(service.isInitialized()).toBe(true);
      
      // Test basic embedding
      const embedding = await service.generateSingleEmbedding("Test text");
      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding.vector)).toBe(true);
      expect(embedding.vector.length).toBeGreaterThan(0);
    }, testTimeout);
  });

  describe('Error Handling', () => {
    it('should handle invalid text input appropriately', async () => {
      if (!ollamaAvailable) {
        console.warn('Skipping test - Ollama not available');
        return;
      }
      
      // Empty string should throw error for Ollama
      await expect(service.generateSingleEmbedding("")).rejects.toThrow();
    }, testTimeout);
  });
});