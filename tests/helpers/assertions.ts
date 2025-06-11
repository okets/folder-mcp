/**
 * Custom Assertions for Testing
 * 
 * Domain-specific assertions for folder-mcp testing
 */

import { expect } from 'vitest';
import { FileContent } from '../../src/domain/files.js';

/**
 * Custom matchers for Vitest
 */
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidFileFingerprint(): T;
    toBeValidTextChunk(): T;
    toBeValidEmbeddingVector(): T;
    toBeWithinTimeRange(expectedMs: number, toleranceMs?: number): T;
    toHaveValidStructure(expectedStructure: any): T;
    toBeValidSearchResult(): T;
    toBeValidIndexingResult(): T;
    toBeValidEmbedding(): T;
    toBeArrayEqual(expected: any[]): T;
    toBeArrayNotEqual(expected: any[]): T;
  }
}

/**
 * Register custom matchers
 */
export function setupCustomAssertions() {
  expect.extend({
    /**
     * Assert that an object is a valid file fingerprint
     */
    toBeValidFileFingerprint(received: any) {
      const pass = (
        received &&
        typeof received === 'object' &&
        typeof received.hash === 'string' &&
        received.hash.length > 0 &&
        typeof received.path === 'string' &&
        received.path.length > 0 &&
        typeof received.size === 'number' &&
        received.size >= 0 &&
        typeof received.modified === 'string' &&
        !isNaN(Date.parse(received.modified))
      );

      return {
        pass,
        message: () => pass
          ? `Expected ${JSON.stringify(received)} not to be a valid file fingerprint`
          : `Expected ${JSON.stringify(received)} to be a valid file fingerprint with hash, path, size, and modified fields`
      };
    },

    /**
     * Assert that an object is a valid text chunk
     */
    toBeValidTextChunk(received: any) {
      const pass = (
        received &&
        typeof received === 'object' &&
        typeof received.content === 'string' &&
        received.content.length > 0 &&
        typeof received.index === 'number' &&
        received.index >= 0 &&
        typeof received.startOffset === 'number' &&
        received.startOffset >= 0 &&
        typeof received.endOffset === 'number' &&
        received.endOffset > received.startOffset
      );

      return {
        pass,
        message: () => pass
          ? `Expected ${JSON.stringify(received)} not to be a valid text chunk`
          : `Expected ${JSON.stringify(received)} to be a valid text chunk with content, index, startOffset, and endOffset fields`
      };
    },

    /**
     * Assert that an object is a valid embedding vector
     */
    toBeValidEmbeddingVector(received: any) {
      const pass = (
        received &&
        typeof received === 'object' &&
        Array.isArray(received.vector) &&
        received.vector.length > 0 &&
        received.vector.every((n: any) => typeof n === 'number') &&
        typeof received.dimensions === 'number' &&
        received.dimensions === received.vector.length &&
        typeof received.model === 'string' &&
        received.model.length > 0
      );

      return {
        pass,
        message: () => pass
          ? `Expected ${JSON.stringify(received)} not to be a valid embedding vector`
          : `Expected ${JSON.stringify(received)} to be a valid embedding vector with vector array, dimensions, and model fields`
      };
    },

    /**
     * Assert that a time value is within expected range
     */
    toBeWithinTimeRange(received: number, expectedMs: number, toleranceMs = 100) {
      const pass = Math.abs(received - expectedMs) <= toleranceMs;

      return {
        pass,
        message: () => pass
          ? `Expected ${received}ms not to be within ${toleranceMs}ms of ${expectedMs}ms`
          : `Expected ${received}ms to be within ${toleranceMs}ms of ${expectedMs}ms`
      };
    },

    /**
     * Assert that an object has valid structure
     */
    toHaveValidStructure(received: any, expectedStructure: any) {
      function validateStructure(obj: any, structure: any, path = ''): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (const [key, expectedType] of Object.entries(structure)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (!(key in obj)) {
            errors.push(`Missing property: ${currentPath}`);
            continue;
          }

          const value = obj[key];
          
          if (typeof expectedType === 'string') {
            if (typeof value !== expectedType) {
              errors.push(`Property ${currentPath} should be ${expectedType}, got ${typeof value}`);
            }
          } else if (typeof expectedType === 'object' && expectedType !== null) {
            if (typeof value !== 'object' || value === null) {
              errors.push(`Property ${currentPath} should be an object`);
            } else {
              const nested = validateStructure(value, expectedType, currentPath);
              errors.push(...nested.errors);
            }
          }
        }

        return { valid: errors.length === 0, errors };
      }

      const { valid, errors } = validateStructure(received, expectedStructure);

      return {
        pass: valid,
        message: () => valid
          ? `Expected object not to have valid structure`
          : `Expected object to have valid structure. Errors: ${errors.join(', ')}`
      };
    },

    /**
     * Assert that an object is a valid search result
     */
    toBeValidSearchResult(received: any) {
      const isValid = 
        received &&
        typeof received === 'object' &&
        Array.isArray(received.results) &&
        typeof received.total === 'number' &&
        typeof received.duration === 'number';

      return {
        message: () =>
          `expected ${received} to be a valid search result with results array, total count, and duration`,
        pass: isValid
      };
    },

    /**
     * Assert that an object is a valid indexing result
     */
    toBeValidIndexingResult(received: any) {
      const pass = (
        received &&
        typeof received === 'object' &&
        typeof received.success === 'boolean' &&
        typeof received.filesProcessed === 'number' &&
        received.filesProcessed >= 0 &&
        typeof received.chunksGenerated === 'number' &&
        received.chunksGenerated >= 0 &&
        typeof received.embeddingsCreated === 'number' &&
        received.embeddingsCreated >= 0 &&
        typeof received.processingTime === 'number' &&
        received.processingTime >= 0 &&
        Array.isArray(received.errors)
      );

      return {
        pass,
        message: () => pass
          ? `Expected ${JSON.stringify(received)} not to be a valid indexing result`
          : `Expected ${JSON.stringify(received)} to be a valid indexing result with success, filesProcessed, chunksGenerated, embeddingsCreated, processingTime, and errors fields`
      };
    },

    /**
     * Assert that an array is a valid embedding vector
     */
    toBeValidEmbedding(received: any) {
      const isValid = 
        received &&
        typeof received === 'object' &&
        Array.isArray(received.vector) &&
        received.vector.every((v: any) => typeof v === 'number') &&
        typeof received.dimension === 'number' &&
        received.dimension === received.vector.length;

      return {
        message: () =>
          `expected ${received} to be a valid embedding with vector array and matching dimension`,
        pass: isValid
      };
    },

    /**
     * Assert that two arrays are equal
     */
    toBeArrayEqual(received: any[], expected: any[]) {
      const pass = (
        Array.isArray(received) &&
        Array.isArray(expected) &&
        received.length === expected.length &&
        received.every((val, i) => val === expected[i])
      );

      return {
        pass,
        message: () => pass
          ? `Expected arrays not to be equal`
          : `Expected arrays to be equal. Received length: ${received?.length}, Expected length: ${expected?.length}`
      };
    },

    /**
     * Assert that two arrays are not equal
     */
    toBeArrayNotEqual(received: any[], expected: any[]) {
      const pass = (
        !Array.isArray(received) ||
        !Array.isArray(expected) ||
        received.length !== expected.length ||
        !received.every((val, i) => val === expected[i])
      );

      return {
        pass,
        message: () => pass
          ? `Expected arrays not to be different`
          : `Expected arrays to be different but they are equal`
      };
    }
  });
}

/**
 * Domain-specific assertion helpers
 */
export class AssertionHelpers {
  /**
   * Assert that a file path is valid
   */
  static assertValidFilePath(filePath: string): void {
    expect(filePath).toBeDefined();
    expect(typeof filePath).toBe('string');
    expect(filePath.length).toBeGreaterThan(0);
    expect(filePath).not.toMatch(/[<>:"|?*]/); // Invalid filename characters
  }

  /**
   * Assert that a configuration object is valid
   */
  static assertValidConfig(config: any): void {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
    expect(config.folder).toBeDefined();
    expect(typeof config.folder).toBe('string');
    expect(config.folder.length).toBeGreaterThan(0);
  }

  /**
   * Assert that an array has expected length
   * @param array The array to check
   * @param expectedLength The expected length
   * @param tolerance Optional tolerance for the length check
   */
  static assertArrayLength<T>(array: T[], expectedLength: number, tolerance = 0): void {
    expect(Array.isArray(array)).toBe(true);
    if (tolerance === 0) {
      expect(array).toHaveLength(expectedLength);
    } else {
      expect(array.length).toBeGreaterThanOrEqual(expectedLength - tolerance);
      expect(array.length).toBeLessThanOrEqual(expectedLength + tolerance);
    }
  }

  /**
   * Assert that all items in array are unique
   */
  static assertArrayUnique<T>(array: T[], keyFn?: (item: T) => any): void {
    expect(Array.isArray(array)).toBe(true);
    
    const keys = keyFn ? array.map(keyFn) : array;
    const uniqueKeys = [...new Set(keys)];
    
    expect(uniqueKeys.length).toBe(array.length);
  }

  /**
   * Assert that a value is within a numeric range
   */
  static assertInRange(value: number, min: number, max: number): void {
    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  }

  /**
   * Assert that an operation completes within time limit
   */
  static async assertWithinTimeLimit<T>(
    operation: () => Promise<T>,
    timeLimitMs: number
  ): Promise<T> {
    const start = Date.now();
    const result = await operation();
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThanOrEqual(timeLimitMs);
    return result;
  }

  /**
   * Assert that a promise rejects with specific error
   */
  static async assertRejectsWithError(
    operation: () => Promise<any>,
    expectedErrorMessage?: string | RegExp
  ): Promise<void> {
    let error: Error | undefined;
    
    try {
      await operation();
    } catch (e) {
      error = e as Error;
    }
    
    expect(error).toBeDefined();
    if (expectedErrorMessage) {
      if (typeof expectedErrorMessage === 'string') {
        expect(error!.message).toContain(expectedErrorMessage);
      } else {
        expect(error!.message).toMatch(expectedErrorMessage);
      }
    }
  }

  /**
   * Assert arrays are equal
   */
  static assertArraysEqual<T>(actual: T[], expected: T[]): void {
    expect(actual).toEqual(expected);
  }

  /**
   * Assert arrays are not equal
   */
  static assertArraysNotEqual<T>(actual: T[], expected: T[]): void {
    expect(actual).not.toEqual(expected);
  }

  /**
   * Assert valid embedding
   */
  static assertValidEmbedding(embedding: any): void {
    expect(embedding).toBeValidEmbedding();
  }

  /**
   * Assert value is within range
   */
  static assertWithinRange(value: number, min: number, max: number): void {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  }

  /**
   * Assert object has all required properties
   */
  static assertHasProperties(obj: any, properties: string[]): void {
    for (const prop of properties) {
      expect(obj).toHaveProperty(prop);
    }
  }

  /**
   * Assert function throws specific error
   */
  static assertThrows(fn: () => any, expectedError?: string | RegExp): void {
    if (expectedError) {
      expect(fn).toThrow(expectedError);
    } else {
      expect(fn).toThrow();
    }
  }

  /**
   * Assert async function rejects with specific error
   */
  static async assertRejects(fn: () => Promise<any>, expectedError?: string | RegExp): Promise<void> {
    if (expectedError) {
      await expect(fn()).rejects.toThrow(expectedError);
    } else {
      await expect(fn()).rejects.toThrow();
    }
  }
}

declare global {
  namespace Vi {
    interface Assertion {
      toBeValidSearchResult(): void;
      toHaveProcessedFiles(count: number): void;
      toHaveHitRate(rate: number): void;
      toBeValidFileContent(): void;
      toBeValidEmbedding(): void;
      toBeValidIndexEntry(): void;
      toBeValidCacheEntry(): void;
    }
  }
}

// Search result assertions
expect.extend({
  toBeValidSearchResult(received: any) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      Array.isArray(received.results) &&
      typeof received.total === 'number' &&
      typeof received.duration === 'number';

    return {
      message: () =>
        `expected ${received} to be a valid search result with results array, total count, and duration`,
      pass: isValid
    };
  }
});

// Indexing result assertions
expect.extend({
  toHaveProcessedFiles(received: any, expected: number) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      typeof received.processedFiles === 'number' &&
      received.processedFiles === expected;

    return {
      message: () =>
        `expected ${received} to have processed ${expected} files, but got ${received?.processedFiles}`,
      pass: isValid
    };
  }
});

// Cache statistics assertions
expect.extend({
  toHaveHitRate(received: any, expected: number) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      typeof received.hits === 'number' &&
      typeof received.misses === 'number';

    if (!isValid) {
      return {
        message: () =>
          `expected ${received} to be a valid cache stats object with hits and misses`,
        pass: false
      };
    }

    const hitRate = received.hits / (received.hits + received.misses);
    const isClose = Math.abs(hitRate - expected) < 0.01; // Allow 1% tolerance

    return {
      message: () =>
        `expected cache hit rate to be ${expected}, but got ${hitRate.toFixed(2)}`,
      pass: isClose
    };
  }
});

// File content assertions
expect.extend({
  toBeValidFileContent(received: FileContent) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      typeof received.content === 'string' &&
      typeof received.metadata === 'object' &&
      typeof received.metadata.path === 'string' &&
      typeof received.metadata.size === 'number';

    return {
      message: () =>
        `expected ${received} to be a valid file content object with content string and metadata`,
      pass: isValid
    };
  }
});

// Embedding assertions
expect.extend({
  toBeValidEmbedding(received: any) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      Array.isArray(received.vector) &&
      received.vector.every((v: any) => typeof v === 'number') &&
      typeof received.dimension === 'number' &&
      received.dimension === received.vector.length;

    return {
      message: () =>
        `expected ${received} to be a valid embedding with vector array and matching dimension`,
      pass: isValid
    };
  }
});

// Index entry assertions
expect.extend({
  toBeValidIndexEntry(received: any) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.path === 'string' &&
      typeof received.content === 'string' &&
      Array.isArray(received.embeddings) &&
      received.embeddings.every((e: any) => 
        e && 
        typeof e === 'object' && 
        Array.isArray(e.vector) && 
        typeof e.dimension === 'number'
      );

    return {
      message: () =>
        `expected ${received} to be a valid index entry with id, path, content, and embeddings`,
      pass: isValid
    };
  }
});

// Cache entry assertions
expect.extend({
  toBeValidCacheEntry(received: any) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      typeof received.key === 'string' &&
      typeof received.value !== 'undefined' &&
      typeof received.timestamp === 'number' &&
      typeof received.ttl === 'number';

    return {
      message: () =>
        `expected ${received} to be a valid cache entry with key, value, timestamp, and ttl`,
      pass: isValid
    };
  }
});
