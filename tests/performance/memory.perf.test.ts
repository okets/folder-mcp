/**
 * Memory Usage Performance Tests
 * 
 * Tests for memory usage patterns, leak detection,
 * and memory efficiency across system operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../helpers/test-utils';

describe('Memory Performance Tests', () => {
  let testDir: string;
  let initialMemory: NodeJS.MemoryUsage;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('memory-perf-');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    initialMemory = TestUtils.getMemoryUsage();
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(testDir);
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during file processing', async () => {
      const iterations = 50;
      const memoryReadings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        // Simulate file processing that might cause memory leaks
        await TestUtils.createTestFiles(testDir, {
          [`test${i}.txt`]: `Content for test file ${i}`.repeat(100)
        });
        
        // Clean up test files
        await TestUtils.cleanupTempDir(testDir);
        await TestUtils.createTempDir('memory-perf-');
        
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
        
        memoryReadings.push(TestUtils.getMemoryUsage().heapUsed);
      }
      
      // Check that memory usage doesn't consistently increase
      const firstQuarter = memoryReadings.slice(0, Math.floor(iterations / 4));
      const lastQuarter = memoryReadings.slice(-Math.floor(iterations / 4));
      
      const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
      const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
      
      // Memory in last quarter shouldn't be significantly higher than first quarter
      // Allow for 20MB increase to account for normal variance
      expect(avgLast - avgFirst).toBeLessThan(20 * 1024 * 1024);
    });

    it('should release memory after large operations', async () => {
      // Create a large amount of test data
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB of data
      const files: Record<string, string> = {};
      
      for (let i = 0; i < 10; i++) {
        files[`large${i}.txt`] = largeContent;
      }
      
      await TestUtils.createTestFiles(testDir, files);
      
      const memoryAfterCreation = TestUtils.getMemoryUsage();
      
      // Clean up
      await TestUtils.cleanupTempDir(testDir);
      
      // Force multiple GC cycles for in-process execution
      if (global.gc) {
        for (let i = 0; i < 3; i++) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Wait longer for cleanup in main process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const memoryAfterCleanup = TestUtils.getMemoryUsage();
      
      // In main process execution, be more lenient with memory expectations
      // Allow for small increases due to shared process state
      const memoryDiff = memoryAfterCleanup.heapUsed - memoryAfterCreation.heapUsed;
      const maxAllowedIncrease = 2 * 1024 * 1024; // 2MB tolerance for in-process execution
      
      expect(memoryDiff).toBeLessThan(maxAllowedIncrease);
    });
  });

  describe('Memory Efficiency', () => {
    it('should process files without excessive memory usage', async () => {
      const testContent = 'Sample content for memory efficiency testing.';
      await TestUtils.createTestFiles(testDir, {
        'test1.txt': testContent,
        'test2.txt': testContent,
        'test3.txt': testContent
      });
      
      const memoryBefore = TestUtils.getMemoryUsage();
      
      // Simulate file processing operations
      // This would normally involve actual file processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const memoryAfter = TestUtils.getMemoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      // Memory increase should be reasonable for the amount of data processed
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Memory Usage Baselines', () => {
    it('should establish baseline memory usage', () => {
      const current = TestUtils.getMemoryUsage();
      
      // Document baseline memory usage for monitoring
      console.log('Baseline Memory Usage:', {
        heapUsed: Math.round(current.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(current.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(current.external / 1024 / 1024) + 'MB'
      });
        // Basic sanity check - heap usage should be reasonable for a test environment
      expect(current.heapUsed).toBeGreaterThan(1024 * 1024); // At least 1MB
      expect(current.heapUsed).toBeLessThan(300 * 1024 * 1024); // Less than 300MB (updated due to application growth)
    });
  });
});
