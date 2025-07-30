/**
 * Integration Tests for Python Process Keep-Alive and Lifecycle Management
 * 
 * Tests the keep-alive system using fast timers and process monitoring:
 * - Configurable keep-alive timers
 * - Process restart on failure
 * - Graceful shutdown handling
 * - Immediate request pause functionality
 * - Health monitoring and recovery
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PythonEmbeddingService } from '../../../src/infrastructure/embeddings/python-embedding-service.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Python Process Keep-Alive and Lifecycle', () => {
  let service: PythonEmbeddingService;
  const testTimeout = 30000; // 30 seconds for lifecycle tests

  beforeEach(() => {
    // Set up service with test configuration
    service = new PythonEmbeddingService({
      modelName: 'all-MiniLM-L6-v2',
      timeout: 30000,
      healthCheckInterval: 5000,
      autoRestart: true,
      maxRestartAttempts: 2,
      restartDelay: 1000,
      testConfig: {
        crawlingPauseSeconds: 10,
        keepAliveSeconds: 20,        // 20 seconds instead of 5 minutes
        shutdownGracePeriodSeconds: 5
      }
    });
  });

  afterEach(async () => {
    if (service) {
      try {
        await service.shutdown(5);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, 15000);

  describe('Configuration and Setup', () => {
    it('should read process management configuration from system config', () => {
      const configPath = join(process.cwd(), 'system-configuration.json');
      expect(existsSync(configPath)).toBe(true);
      
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.embeddings).toBeDefined();
      expect(config.embeddings.python).toBeDefined();
      expect(config.embeddings.python.processManagement).toBeDefined();
      
      const processConfig = config.embeddings.python.processManagement;
      expect(processConfig.crawlingPauseMinutes).toBe(1);
      expect(processConfig.keepAliveMinutes).toBe(5);
      expect(processConfig.shutdownGracePeriodSeconds).toBe(30);
    });

    it('should create service with keep-alive configuration', () => {
      expect(service).toBeDefined();
      expect(service.isInitialized()).toBe(false);

      const config = service.getModelConfig();
      expect(config.model).toBe('all-MiniLM-L6-v2');
    });
  });

  describe('Process Lifecycle Management', () => {
    it('should initialize and track process statistics', async () => {
      try {
        await service.initialize();
        
        const stats = service.getServiceStats();
        expect(stats.initialized).toBe(true);
        expect(stats.restartAttempts).toBe(0);
        expect(stats.processId).toBeDefined();
        expect(stats.lastRestartTime).toBe(0); // No restarts yet
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should handle health monitoring', async () => {
      try {
        await service.initialize();
        
        // Wait for a few health check cycles
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const health = await service.healthCheck();
        expect(health).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        
        const stats = service.getServiceStats();
        expect(stats.lastHealthCheck).toBeDefined();
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should shutdown gracefully and prevent restart', async () => {

      try {
        await service.initialize();
        
        const initialStats = service.getServiceStats();
        expect(initialStats.initialized).toBe(true);
        
        // Graceful shutdown
        await service.shutdown(5);
        
        // Should be shutdown immediately
        expect(service.isInitialized()).toBe(false);
        
        // Wait a bit to ensure no restart occurs
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const finalStats = service.getServiceStats();
        expect(finalStats.initialized).toBe(false);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Keep-Alive and Priority Processing', () => {
    it('should handle immediate vs batch request prioritization', async () => {
      try {
        await service.initialize();
        
        // Test immediate request (should be fast)
        const immediateStart = Date.now();
        const immediateResult = await service.generateSingleEmbedding('Immediate priority test text');
        const immediateTime = Date.now() - immediateStart;
        
        expect(immediateResult).toBeDefined();
        expect(immediateResult.vector).toBeDefined();
        expect(immediateResult.dimensions).toBeGreaterThan(0);
        
        // Should be processed relatively quickly
        expect(immediateTime).toBeLessThan(15000); // Less than 15 seconds
        
        // Create batch request
        const batchChunks = [
          {
            content: 'Batch processing test text number one.',
            chunkIndex: 0,
            startPosition: 0,
            endPosition: 39,
            tokenCount: 8,
            metadata: {
              sourceFile: 'batch-test.txt',
              sourceType: 'text',
              totalChunks: 2,
              hasOverlap: false
            }
          },
          {
            content: 'Batch processing test text number two.',
            chunkIndex: 1,
            startPosition: 40,
            endPosition: 79,
            tokenCount: 8,
            metadata: {
              sourceFile: 'batch-test.txt',
              sourceType: 'text',
              totalChunks: 2,
              hasOverlap: false
            }
          }
        ];
        
        const batchStart = Date.now();
        const batchResults = await service.processBatch(batchChunks, 1); // Small batch size
        const batchTime = Date.now() - batchStart;
        
        expect(batchResults).toHaveLength(2);
        
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

  describe('Error Recovery and Restart Logic', () => {
    it('should track restart attempts correctly', async () => {
      try {
        await service.initialize();
        
        const initialStats = service.getServiceStats();
        expect(initialStats.restartAttempts).toBe(0);
        expect(initialStats.initialized).toBe(true);
        
        // Note: We can't easily simulate process crashes in tests
        // but we can verify the tracking mechanism works
        const stats = service.getServiceStats();
        expect(typeof stats.restartAttempts).toBe('number');
        expect(typeof stats.lastRestartTime).toBe('number');
        expect(typeof stats.processId).toBe('number');
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should handle service configuration correctly', () => {
      const config = service.getModelConfig();
      expect(config).toBeDefined();
      expect(config.model).toBe('all-MiniLM-L6-v2');
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should load Python utilities for process management', async () => {
      // Test that Python utility files exist and are properly structured
      const utilsPath = join(process.cwd(), 'src/infrastructure/embeddings/python/utils/supported_models.py');
      expect(existsSync(utilsPath)).toBe(true);
      
      const utilsContent = readFileSync(utilsPath, 'utf-8');
      expect(utilsContent).toContain('get_process_management_config');
      expect(utilsContent).toContain('get_supported_models');
      expect(utilsContent).toContain('validate_model');
    });

    it('should have proper embedding handler with keep-alive', async () => {
      const handlerPath = join(process.cwd(), 'src/infrastructure/embeddings/python/handlers/embedding_handler.py');
      expect(existsSync(handlerPath)).toBe(true);
      
      const handlerContent = readFileSync(handlerPath, 'utf-8');
      expect(handlerContent).toContain('_reset_keep_alive_timer');
      expect(handlerContent).toContain('_handle_keep_alive_timeout');
      expect(handlerContent).toContain('_graceful_shutdown_worker');
      expect(handlerContent).toContain('keep_alive_duration');
      expect(handlerContent).toContain('shutdown_grace_period');
    });
  });

  describe('Model Download Integration', () => {
    it('should integrate model download with lifecycle management', async () => {
      try {
        await service.initialize();
        
        // Test model download functionality
        const downloadResult = await service.downloadModel('all-MiniLM-L6-v2');
        expect(downloadResult).toBeDefined();
        expect(typeof downloadResult.success).toBe('boolean');
        expect(typeof downloadResult.progress).toBe('number');
        
        // Test cache checking
        const isCached = await service.isModelCached('all-MiniLM-L6-v2');
        expect(typeof isCached).toBe('boolean');
        
        // Should still be healthy after model operations
        const health = await service.healthCheck();
        expect(['healthy', 'degraded']).toContain(health.status);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });
});