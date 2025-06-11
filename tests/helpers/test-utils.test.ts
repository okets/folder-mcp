import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import { TestUtils, FileTestUtils, TEST_ENV, AsyncTestUtils } from './test-utils.js';

describe('TestUtils', () => {
  describe('createTempDir', () => {
    it('should create a temporary directory with the specified prefix', async () => {
      const prefix = 'test-prefix-';
      const tempDir = await TestUtils.createTempDir(prefix);
      
      expect(tempDir).toBeDefined();
      expect(tempDir).toContain(prefix);
      await expect(fs.stat(tempDir)).resolves.toBeDefined();
      
      await TestUtils.cleanupTempDir(tempDir);
    });
  });

  describe('cleanupTempDir', () => {
    it('should remove the temporary directory', async () => {
      const tempDir = await TestUtils.createTempDir();
      await TestUtils.cleanupTempDir(tempDir);
      
      await expect(fs.stat(tempDir)).rejects.toThrow();
    });

    it('should handle non-existent directories gracefully', async () => {
      const nonExistentDir = path.join(TEST_ENV.TEMP_DIR, 'non-existent');
      await expect(TestUtils.cleanupTempDir(nonExistentDir)).resolves.not.toThrow();
    });
  });

  describe('measureTime', () => {
    it('should measure execution time of an async operation', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const { result, duration } = await TestUtils.measureTime(async () => {
        await delay(100);
        return 'test result';
      });
      
      expect(result).toBe('test result');
      expect(duration).toBeGreaterThanOrEqual(90); // Allow for timer imprecision
      expect(duration).toBeLessThan(200); // Allow some overhead
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage metrics', () => {
      const memory = TestUtils.getMemoryUsage();
      
      expect(memory).toHaveProperty('heapUsed');
      expect(memory).toHaveProperty('heapTotal');
      expect(memory).toHaveProperty('external');
      expect(memory.heapUsed).toBeLessThanOrEqual(memory.heapTotal);
    });
  });

  describe('waitFor', () => {
    it('should wait for a condition to be true', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };
      
      await TestUtils.waitFor(condition, { interval: 50 });
      expect(counter).toBe(3);
    });

    it('should throw if condition is not met within timeout', async () => {
      const neverTrue = () => false;
      
      await expect(
        TestUtils.waitFor(neverTrue, { timeout: 100, interval: 50 })
      ).rejects.toThrow('Condition not met within 100ms');
    });
  });

  describe('generateRandomString', () => {
    it('should generate a string of specified length', () => {
      const length = 10;
      const result = TestUtils.generateRandomString(length);
      
      expect(result).toHaveLength(length);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate different strings on each call', () => {
      const result1 = TestUtils.generateRandomString(10);
      const result2 = TestUtils.generateRandomString(10);
      
      expect(result1).not.toBe(result2);
    });
  });
});

describe('FileTestUtils', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('file-test-');
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('createTestFile', () => {
    it('should create a file with random content', async () => {
      const filename = 'test.txt';
      const size = 100;
      
      const filePath = await FileTestUtils.createTestFile(tempDir, filename, size);
      
      expect(filePath).toContain(filename);
      const stats = await fs.stat(filePath);
      expect(stats.size).toBe(size);
      
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toHaveLength(size);
      expect(content).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should create file with default size if not specified', async () => {
      const filePath = await FileTestUtils.createTestFile(tempDir, 'test.txt');
      
      const stats = await fs.stat(filePath);
      expect(stats.size).toBe(1024); // Default size
    });
  });

  describe('createTestFiles', () => {
    it('should create multiple files with specified sizes', async () => {
      const files = {
        'file1.txt': 100,
        'file2.txt': 200,
        'file3.txt': 300
      };
      
      const contents = await FileTestUtils.createTestFiles(tempDir, files);
      
      expect(Object.keys(contents)).toHaveLength(3);
      for (const [filename, size] of Object.entries(files)) {
        const filePath = path.join(tempDir, filename);
        const stats = await fs.stat(filePath);
        expect(stats.size).toBe(size);
        expect(contents[filename]).toHaveLength(size);
      }
    });
  });
});

describe('AsyncTestUtils', () => {
  describe('expectRejects', () => {
    it('should pass when promise rejects with expected error message', async () => {
      const promise = Promise.reject(new Error('Expected error'));
      await expect(AsyncTestUtils.expectRejects(promise, 'Expected error')).resolves.not.toThrow();
    });

    it('should pass when promise rejects with expected error instance', async () => {
      class CustomError extends Error {
        constructor(message?: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const promise = Promise.reject(new CustomError('Custom error'));
      await expect(AsyncTestUtils.expectRejects(promise, CustomError)).resolves.not.toThrow();
    });

    it('should fail when promise resolves', async () => {
      const promise = Promise.resolve('success');
      await expect(AsyncTestUtils.expectRejects(promise, 'error')).rejects.toThrow('Expected promise to reject');
    });

    it('should fail when error message does not match', async () => {
      const promise = Promise.reject(new Error('Actual error'));
      await expect(AsyncTestUtils.expectRejects(promise, 'Expected error')).rejects.toThrow('Expected error message to include');
    });
  });
}); 