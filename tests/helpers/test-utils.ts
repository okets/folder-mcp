/**
 * Test Utilities and Helpers
 * 
 * Common utilities used across all test files
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { performance } from 'perf_hooks';
import { existsSync } from 'fs';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Types
export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface TimeMeasurement<T> {
  result: T;
  duration: number;
}

export interface WaitForOptions {
  timeout?: number;
  interval?: number;
}

export interface MockLogger {
  logger: {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  };
  messages: {
    info: string[];
    warn: string[];
    error: string[];
    debug: string[];
  };
}

export interface Spy<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Parameters<T>[];
  callCount: number;
  lastCall: Parameters<T> | undefined;
  reset: () => void;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTimeMs: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
}

/**
 * Core test utilities
 */
export class TestUtils {
  /**
   * Creates a temporary directory for testing
   * @param prefix Optional prefix for the temp directory name
   * @returns Path to the created directory
   */
  static async createTempDir(prefix: string = 'test-'): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    return tempDir;
  }

  /**
   * Creates test files in the specified directory
   * @param dir Directory to create files in
   * @param files Object mapping filenames to content
   */
  static async createTestFiles(dir: string, files: Record<string, string>): Promise<void> {
    await Promise.all(
      Object.entries(files).map(async ([filename, content]) => {
        const filePath = path.join(dir, filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
      })
    );
  }

  /**
   * Cleans up a temporary directory
   * @param dir Directory to clean up
   */
  static async cleanupTempDir(dir: string): Promise<void> {
    try {
      // On Windows, we may need to retry cleanup if files are still in use
      let retries = 3;
      while (retries > 0) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
          break;
        } catch (error: any) {
          if ((error.code === 'ENOTEMPTY' || error.code === 'EPERM') && retries > 1) {
            // Wait a bit before retrying on Windows
            await new Promise(resolve => setTimeout(resolve, 100));
            retries--;
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      // Don't fail tests due to cleanup issues, just warn
      console.warn(`Failed to clean up temp directory ${dir}:`, error);
    }
  }

  /**
   * Measures execution time of an async operation
   * @param operation Async operation to measure
   * @returns Object containing result and duration in milliseconds
   */
  static async measureTime<T>(operation: () => Promise<T>): Promise<TimeMeasurement<T>> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /**
   * Gets current memory usage
   * @returns Object containing memory usage metrics
   */
  static getMemoryUsage(): MemoryUsage {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      arrayBuffers: memoryUsage.arrayBuffers
    };
  }

  /**
   * Waits for a condition to be true
   * @param condition Function that returns a boolean
   * @param options Configuration options
   * @returns Promise that resolves when condition is true
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: WaitForOptions = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;
    const start = Date.now();

    while (true) {
      if (await condition()) {
        return;
      }

      if (Date.now() - start > timeout) {
        throw new Error(`Condition not met within ${timeout}ms`);
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * Generates a random string of specified length
   * @param length Length of the string to generate
   * @returns Random string
   */
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(
      { length },
      () => chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }

  /**
   * Generate test data for various file types
   */
  static generateTestContent = {
    markdown: (title = 'Test Document'): string => `
# ${title}

This is a test markdown document with some content.

## Section 1
Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Section 2
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- List item 1
- List item 2
- List item 3
`,

    text: (lines = 10): string => {
      return Array.from({ length: lines }, (_, i) => 
        `This is line ${i + 1} of the test text file.`
      ).join('\n');
    },

    json: (data: any): string => JSON.stringify(data, null, 2),

    code: (language = 'javascript'): string => {
      const examples = {
        javascript: `
function helloWorld() {
  console.log('Hello, World!');
  return 'success';
}

export { helloWorld };
`,
        typescript: `
interface TestInterface {
  name: string;
  value: number;
}

export class TestClass implements TestInterface {
  constructor(
    public name: string,
    public value: number
  ) {}
}
`,
        python: `
def get_system_status():
    """A simple system status function"""
    print("System Status: OK")
    return "success"

if __name__ == "__main__":
    get_system_status()
`
      };
      return examples[language as keyof typeof examples] || examples.javascript;
    }
  };

  /**
   * Generate large content for testing
   */
  static generateLargeContent(sizeInKB: number): string {
    const chunkSize = 1024; // 1KB chunks
    const chunk = 'A'.repeat(chunkSize);
    return chunk.repeat(sizeInKB);
  }

  /**
   * Wait for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute operation with timeout
   */
  static async withTimeout<T>(
    operation: () => T | Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      Promise.resolve(operation())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Generate random test data
   */
  static random = {
    string: (length = 10): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    },

    number: (min = 0, max = 100): number => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    boolean: (): boolean => Math.random() < 0.5,

    array: <T>(generator: () => T, length = 5): T[] => {
      return Array.from({ length }, generator);
    }
  };

  /**
   * Deep compare objects for testing
   */
  static deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEqual(a[key], b[key])) return false;
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Create test configuration objects
   */
  static createTestConfig = {
    basic: () => ({
      chunkSize: 1000,
      overlap: 100,
      embeddingModel: 'test-model',
      cacheEnabled: true
    }),

    minimal: () => ({
      chunkSize: 500,
      overlap: 0,
      embeddingModel: 'minimal-model',
      cacheEnabled: false
    }),

    extensive: () => ({
      chunkSize: 2000,
      overlap: 200,
      embeddingModel: 'large-model',
      cacheEnabled: true,
      batchSize: 50,
      maxFiles: 1000
    })
  };

  /**
   * Mock external dependencies
   */
  static createMocks = {
    logger: (): MockLogger => {
      const messages = {
        info: [] as string[],
        warn: [] as string[],
        error: [] as string[],
        debug: [] as string[]
      };

      return {
        logger: {
          info: (message: string, ...args: any[]) => messages.info.push(message),
          warn: (message: string, ...args: any[]) => messages.warn.push(message),
          error: (message: string, ...args: any[]) => messages.error.push(message),
          debug: (message: string, ...args: any[]) => messages.debug.push(message)
        },
        messages
      };
    },

    cacheService: () => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn()
    }),

    embeddingService: () => ({
      generateEmbeddings: vi.fn(),
      generateSingleEmbedding: vi.fn(),
      isInitialized: vi.fn(() => true)
    })
  };

  /**
   * Create a spy function that tracks calls
   */
  static createSpy<T extends (...args: any[]) => any>(
    implementation?: T
  ): Spy<T> {
    const calls: Parameters<T>[] = [];
    
    const spy = ((...args: Parameters<T>) => {
      calls.push(args);
      return implementation ? implementation(...args) : undefined;
    }) as T & {
      calls: Parameters<T>[];
      callCount: number;
      lastCall: Parameters<T> | undefined;
      reset: () => void;
    };

    Object.defineProperty(spy, 'calls', {
      get: () => calls
    });

    Object.defineProperty(spy, 'callCount', {
      get: () => calls.length
    });

    Object.defineProperty(spy, 'lastCall', {
      get: () => calls[calls.length - 1]
    });

    spy.reset = () => {
      calls.length = 0;
    };

    return spy as Spy<T>;
  }

  /**
   * Sleep utility for testing
   * @param ms Milliseconds to sleep
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate random string of specified length
   */
  static randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate sample file content
   */
  static sampleFileContent(type: 'text' | 'code' | 'markdown' | 'json'): string {
    switch (type) {
      case 'text':
        return 'This is a sample text file.\nIt contains multiple lines.\nAnd some content for testing.';
      
      case 'code':
        return `function example() {
  console.log('Hello, world!');
  return 42;
}

export default example;`;
      
      case 'markdown':
        return `# Sample Markdown

This is a **sample** markdown file.

## Features

- List item 1
- List item 2
- List item 3

\`\`\`javascript
console.log('Code block');
\`\`\``;
      
      case 'json':
        return JSON.stringify({
          name: 'test-data',
          version: '1.0.0',
          items: [1, 2, 3],
          config: {
            enabled: true,
            timeout: 5000
          }
        }, null, 2);
      
      default:
        return 'Sample content';
    }
  }

  /**
   * Generate large text content for performance testing
   */
  static largeContent(sizeInKB: number): string {
    const baseText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
    const targetSize = sizeInKB * 1024;
    let content = '';
    
    while (content.length < targetSize) {
      content += baseText.repeat(100) + '\n';
    }
    
    return content.substring(0, targetSize);
  }
}

/**
 * Async testing utilities
 */
export class AsyncTestUtils {
  /**
   * Expects a promise to reject with a specific error
   * @param promise Promise to test
   * @param expectedError Expected error message, error instance, or error constructor
   */
  static async expectRejects(
    promise: Promise<unknown>,
    expectedError: string | Error | (new (message?: string) => Error)
  ): Promise<void> {
    try {
      await promise;
      throw new Error('Expected promise to reject but it resolved');
    } catch (error) {
      if (typeof expectedError === 'string') {
        if (!(error instanceof Error) || !error.message.includes(expectedError)) {
          throw new Error(`Expected error message to include "${expectedError}" but got "${error instanceof Error ? error.message : error}"`);
        }
      } else if (expectedError instanceof Error) {
        if (!(error instanceof Error) || error.message !== expectedError.message) {
          throw new Error(`Expected error "${expectedError.message}" but got "${error instanceof Error ? error.message : error}"`);
        }
      } else if (typeof expectedError === 'function') {
        if (!(error instanceof expectedError)) {
          throw new Error(`Expected error to be instance of ${expectedError.name} but got ${error instanceof Error ? error.constructor.name : typeof error}`);
        }
      }
    }
  }

  /**
   * Test that a promise resolves within a timeout
   */
  static async expectResolvesWithin<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Promise did not resolve within ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

/**
 * Test performance utilities
 */
export class PerformanceTestUtils {
  /**
   * Run a performance benchmark
   */
  static async benchmark(
    name: string,
    fn: () => Promise<void>,
    iterations = 100
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const { duration } = await TestUtils.measureTime(fn);
      times.push(duration);
    }
    
    const totalTimeMs = times.reduce((sum, time) => sum + time, 0);
    const averageTimeMs = totalTimeMs / iterations;
    const minTimeMs = Math.min(...times);
    const maxTimeMs = Math.max(...times);
    
    return {
      name,
      iterations,
      totalTimeMs,
      averageTimeMs,
      minTimeMs,
      maxTimeMs
    };
  }

  /**
   * Assert performance requirements
   */
  static assertPerformance(
    actualTimeMs: number,
    maxTimeMs: number,
    operationName: string
  ): void {
    if (actualTimeMs > maxTimeMs) {
      throw new Error(
        `Performance assertion failed: ${operationName} took ${actualTimeMs}ms, ` +
        `expected less than ${maxTimeMs}ms`
      );
    }
  }
}

/**
 * Add vi global for mocking (Vitest)
 */
declare global {
  const vi: any;
}

// Export test environment variables
export const TEST_ENV = {
  TEMP_DIR: path.join(os.tmpdir(), 'folder-mcp-tests'),
  TEST_FILES_DIR: path.join(os.tmpdir(), 'folder-mcp-test-files'),
  TEST_INDEX_DIR: path.join(os.tmpdir(), 'folder-mcp-test-index'),
  TEST_CACHE_DIR: path.join(os.tmpdir(), 'folder-mcp-test-cache'),
  TEST_CONFIG: {
    maxFileSize: 1024 * 1024, // 1MB
    supportedExtensions: ['.txt', '.md', '.js', '.ts', '.json'],
    indexBatchSize: 100,
    cacheTTL: 3600, // 1 hour
    embeddingDimension: 384
  }
};

export class FileTestUtils {
  /**
   * Creates a test file with random content
   * @param dir Directory to create the file in
   * @param filename Name of the file to create
   * @param size Size of the file in bytes
   * @returns Path to the created file
   */
  static async createTestFile(
    dir: string,
    filename: string,
    size: number = 1024
  ): Promise<string> {
    const content = TestUtils.generateRandomString(size);
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Creates multiple test files with random content
   * @param dir Directory to create the files in
   * @param files Object mapping filenames to sizes
   * @returns Object mapping filenames to their content
   */
  static async createTestFiles(
    dir: string,
    files: Record<string, number>
  ): Promise<Record<string, string>> {
    const fileContents: Record<string, string> = {};
    for (const [filename, size] of Object.entries(files)) {
      const content = TestUtils.generateRandomString(size);
      fileContents[filename] = content;
      const filePath = path.join(dir, filename);
      await fs.writeFile(filePath, content, 'utf8');
    }
    return fileContents;
  }
}
