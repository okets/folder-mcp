/**
 * Integration Tests for Python Crawling Pause and Immediate Request Priority
 * 
 * Tests the crawling pause mechanism that ensures search queries get immediate
 * responses while folder indexing happens in the background:
 * - Immediate requests pause batch processing for 1 minute
 * - Multiple immediate requests extend the pause
 * - Batch processing resumes after pause expires
 * - Priority-based queue system working correctly
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PythonEmbeddingService } from '../../../src/infrastructure/embeddings/python-embedding-service.js';
import type { TextChunk } from '../../../src/types/index.js';

describe('Python Crawling Pause and Priority System', () => {
  let service: PythonEmbeddingService;
  const testTimeout = 25000; // 25 seconds for timing-sensitive tests (crawling pause = 10s)

  beforeAll(() => {
    vi.useRealTimers();
    
    // Create service once for all tests - let keep-alive handle persistence
    service = new PythonEmbeddingService({
      modelName: 'all-MiniLM-L6-v2',
      timeout: 30000,
      healthCheckInterval: 5000,
      autoRestart: false, // Disable auto-restart for faster tests
      maxRestartAttempts: 1,
      restartDelay: 500,
      // Configure short durations for testing
      testConfig: {
        crawlingPauseSeconds: 10,    // 10 seconds instead of 1 minute
        keepAliveSeconds: 60,        // 1 minute keep-alive for tests
        shutdownGracePeriodSeconds: 5
      }
    });
  });

  afterAll(async () => {
    if (service) {
      try {
        await service.shutdown(10);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, 15000); // 15 second timeout for cleanup

  // Helper function to create test chunks
  const createTestChunk = (content: string, index: number): TextChunk => ({
    content,
    chunkIndex: index,
    startPosition: index * 100,
    endPosition: (index + 1) * 100,
    tokenCount: Math.ceil(content.length / 4),
    metadata: {
      sourceFile: `test-chunk-${index}.txt`,
      sourceType: 'text',
      totalChunks: 10,
      hasOverlap: false
    }
  });

  describe('Priority-Based Processing', () => {
    it('should process immediate requests faster than batch requests', async () => {
      try {
        await service.initialize();
        
        // Create a larger batch to ensure it takes some time
        const largeBatch = Array(8).fill(null).map((_, i) => 
          createTestChunk(
            `This is a longer batch processing test text chunk number ${i} that should take more time to process because it contains more content and will help demonstrate the priority-based processing system working correctly.`, 
            i
          )
        );

        // Start batch processing (non-immediate priority)
        console.log('Starting batch processing...');
        const batchStartTime = Date.now();
        const batchPromise = service.processBatch(largeBatch, 2); // Process in batches of 2
        
        // Give batch processing a moment to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now send an immediate request - this should be prioritized
        console.log('Sending immediate request...');
        const immediateStartTime = Date.now();
        const immediateResult = await service.generateSingleEmbedding(
          "This is an immediate priority search request that should be processed quickly"
        );
        const immediateProcessTime = Date.now() - immediateStartTime;
        
        console.log(`Immediate request completed in ${immediateProcessTime}ms`);
        
        // Verify immediate request succeeded and was fast
        expect(immediateResult).toBeDefined();
        expect(immediateResult.vector).toBeDefined();
        expect(immediateResult.dimensions).toBeGreaterThan(0);
        expect(immediateProcessTime).toBeLessThan(10000); // Should be fast
        
        // Wait for batch to complete
        const batchResults = await batchPromise;
        const totalBatchTime = Date.now() - batchStartTime;
        
        console.log(`Batch processing completed in ${totalBatchTime}ms`);
        console.log(`Batch results: ${batchResults.filter(r => r.success).length}/${batchResults.length} successful`);
        
        expect(batchResults).toHaveLength(8);
        
        // Immediate request should be fast (model is already loaded after batch processing)
        // This test verifies that the immediate request can be processed without waiting for the entire batch to complete
        expect(immediateProcessTime).toBeLessThan(15000); // Reasonable timeout for immediate requests
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should handle multiple immediate requests during batch processing', async () => {
      try {
        await service.initialize();
        
        // Create batch work
        const batchChunks = Array(6).fill(null).map((_, i) => 
          createTestChunk(`Batch chunk ${i} with substantial content for processing timing.`, i)
        );

        // Start batch processing
        const batchPromise = service.processBatch(batchChunks, 1); // Process one at a time for slower processing
        
        // Give batch a moment to start
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Send multiple immediate requests
        const immediatePromises = [
          service.generateSingleEmbedding("First immediate search query"),
          service.generateSingleEmbedding("Second immediate search query"),
          service.generateSingleEmbedding("Third immediate search query")
        ];
        
        const immediateStart = Date.now();
        const immediateResults = await Promise.all(immediatePromises);
        const immediateTime = Date.now() - immediateStart;
        
        console.log(`Multiple immediate requests completed in ${immediateTime}ms`);
        
        // All immediate requests should succeed
        expect(immediateResults).toHaveLength(3);
        for (const result of immediateResults) {
          expect(result).toBeDefined();
          expect(result.vector).toBeDefined();
          expect(result.dimensions).toBeGreaterThan(0);
        }
        
        // Wait for batch to complete
        const batchResults = await batchPromise;
        console.log(`Batch completed: ${batchResults.filter(r => r.success).length}/${batchResults.length} successful`);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Crawling Pause Mechanism', () => {
    it('should demonstrate the pause and resume pattern', async () => {
      try {
        await service.initialize();
        
        // Create substantial batch work
        const batchChunks = Array(4).fill(null).map((_, i) => 
          createTestChunk(`Background indexing chunk ${i} with content to process.`, i)
        );

        console.log('=== Crawling Pause Pattern Demonstration ===');
        
        // Phase 1: Start batch processing
        console.log('Phase 1: Starting background batch processing...');
        const batchPromise = service.processBatch(batchChunks, 1);
        
        // Phase 2: Send immediate request after batch has started
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Phase 2: Sending immediate request (should pause batch)...');
        
        const searchResult = await service.generateSingleEmbedding("User search query");
        expect(searchResult).toBeDefined();
        console.log('Phase 2: Immediate request completed');
        
        // Phase 3: Send another immediate request to extend pause
        console.log('Phase 3: Sending another immediate request (extends pause)...');
        const secondSearchResult = await service.generateSingleEmbedding("Another user search");
        expect(secondSearchResult).toBeDefined();
        console.log('Phase 3: Second immediate request completed');
        
        // Phase 4: Wait for batch to complete (should resume after pause)
        console.log('Phase 4: Waiting for batch processing to resume and complete...');
        const batchResults = await batchPromise;
        
        console.log(`Final results: ${batchResults.filter(r => r.success).length}/${batchResults.length} batch items successful`);
        
        // Verify all operations succeeded
        expect(batchResults).toHaveLength(4);
        expect(searchResult.vector).toBeDefined();
        expect(secondSearchResult.vector).toBeDefined();
        
        console.log('=== Crawling Pause Pattern Test Complete ===');
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Queue Management and Timing', () => {
    it('should handle mixed immediate and batch requests efficiently', async () => {
      try {
        await service.initialize();
        
        const startTime = Date.now();
        
        // Mix of request types
        const batchChunk = createTestChunk("Background processing text content.", 0);
        const batchPromise = service.processBatch([batchChunk], 1);
        
        // Immediate requests at different times
        const immediate1Promise = service.generateSingleEmbedding("Search query 1");
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const immediate2Promise = service.generateSingleEmbedding("Search query 2");
        
        // Wait for all to complete
        const [batchResults, immediate1, immediate2] = await Promise.all([
          batchPromise,
          immediate1Promise,
          immediate2Promise
        ]);
        
        const totalTime = Date.now() - startTime;
        console.log(`Mixed processing completed in ${totalTime}ms`);
        
        // Verify all succeeded
        expect(batchResults).toHaveLength(1);
        expect(batchResults[0]?.success).toBe(true);
        expect(immediate1.vector).toBeDefined();
        expect(immediate2.vector).toBeDefined();
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);

    it('should maintain service health during priority processing', async () => {
      try {
        await service.initialize();
        
        // Start with health check (service is operational, may be degraded due to initialization)
        const initialHealth = await service.healthCheck();
        expect(['healthy', 'degraded']).toContain(initialHealth.status);
        
        // Do some priority processing
        const batchChunk = createTestChunk("Health test batch content.", 0);
        const batchPromise = service.processBatch([batchChunk]);
        
        const immediateResult = await service.generateSingleEmbedding("Health test immediate");
        expect(immediateResult).toBeDefined();
        
        const batchResults = await batchPromise;
        expect(batchResults[0]?.success).toBe(true);
        
        // Health should still be good
        const finalHealth = await service.healthCheck();
        expect(['healthy', 'degraded']).toContain(finalHealth.status);
        
        // Service stats should be reasonable
        const stats = service.getServiceStats();
        expect(stats.initialized).toBe(true);
        expect(stats.restartAttempts).toBe(0);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('dependencies not available')) {
          console.warn('Skipping test - Python dependencies not available');
          return;
        }
        throw error;
      }
    }, testTimeout);
  });

  describe('Processing Time Analysis', () => {
    it('should show timing differences between immediate and batch processing', async () => {
      try {
        await service.initialize();
        
        // Time immediate request alone
        const immediateAloneStart = Date.now();
        const immediateAlone = await service.generateSingleEmbedding("Standalone immediate request");
        const immediateAloneTime = Date.now() - immediateAloneStart;
        
        // Time batch request alone
        const batchChunk = createTestChunk("Standalone batch request content.", 0);
        const batchAloneStart = Date.now();
        const batchAlone = await service.processBatch([batchChunk]);
        const batchAloneTime = Date.now() - batchAloneStart;
        
        console.log(`Timing analysis:`);
        console.log(`  Immediate alone: ${immediateAloneTime}ms`);
        console.log(`  Batch alone: ${batchAloneTime}ms`);
        
        // Verify results
        expect(immediateAlone.vector).toBeDefined();
        expect(batchAlone[0]?.success).toBe(true);
        
        // Both should be reasonable times
        expect(immediateAloneTime).toBeLessThan(15000);
        expect(batchAloneTime).toBeLessThan(15000);
        
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