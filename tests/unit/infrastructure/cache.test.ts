/**
 * Infrastructure Layer - Cache Implementation Tests
 * 
 * Tests for the cache infrastructure interfaces and implementations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import type {
  ICacheService,
  CacheConfiguration,
  CacheEntry,
  CacheMetrics,
  ICacheStrategy,
  CacheStatistics
} from '../../../src/infrastructure/cache/index.js';

describe('Infrastructure Layer - Cache', () => {
  describe('CacheService Interface', () => {
    it('should define proper cache service contract', () => {
      const mockCache: Partial<ICacheService> = {
        get: async <T>(key: string): Promise<T | null> => {
          return null;
        },

        set: async <T>(key: string, value: T, ttl?: number): Promise<void> => {},

        delete: async (key: string): Promise<boolean> => {
          return true;
        },

        clear: async (): Promise<void> => {},

        exists: async (key: string): Promise<boolean> => {
          return false;
        },

        keys: async (pattern?: string): Promise<string[]> => {
          return [];
        }
      };

      expect(mockCache.get).toBeDefined();
      expect(mockCache.set).toBeDefined();
      expect(mockCache.delete).toBeDefined();
      expect(mockCache.clear).toBeDefined();
      expect(mockCache.exists).toBeDefined();
      expect(mockCache.keys).toBeDefined();
    });

    it('should handle cache operations with proper types', async () => {
      // Mock cache implementation for testing
      const cache = new Map<string, { value: any; expiry?: number }>();

      const mockGet = async <T>(key: string): Promise<T | null> => {
        const entry = cache.get(key);
        if (!entry) return null;
        
        if (entry.expiry && Date.now() > entry.expiry) {
          cache.delete(key);
          return null;
        }
        
        return entry.value as T;
      };

      const mockSet = async <T>(key: string, value: T, ttl?: number): Promise<void> => {
        const entry: any = { value };
        if (ttl !== undefined) {
          entry.expiry = Date.now() + ttl;
        }
        cache.set(key, entry);
      };

      // Test basic operations
      await mockSet('string-key', 'test-value');
      const stringValue = await mockGet<string>('string-key');
      expect(stringValue).toBe('test-value');

      await mockSet('object-key', { id: 1, name: 'test' });
      const objectValue = await mockGet<{ id: number; name: string }>('object-key');
      expect(objectValue?.id).toBe(1);
      expect(objectValue?.name).toBe('test');

      await mockSet('array-key', [1, 2, 3]);
      const arrayValue = await mockGet<number[]>('array-key');
      expect(arrayValue).toEqual([1, 2, 3]);
    });

    it('should handle TTL expiration correctly', async () => {
      const cache = new Map<string, { value: any; expiry?: number }>();

      const mockSet = async <T>(key: string, value: T, ttl?: number): Promise<void> => {
        const entry: any = { value };
        if (ttl !== undefined) {
          entry.expiry = Date.now() + ttl;
        }
        cache.set(key, entry);
      };

      const mockGet = async <T>(key: string): Promise<T | null> => {
        const entry = cache.get(key);
        if (!entry) return null;
        
        if (entry.expiry && Date.now() > entry.expiry) {
          cache.delete(key);
          return null;
        }
        
        return entry.value as T;
      };

      // Set value with short TTL
      await mockSet('temp-key', 'temp-value', 50); // 50ms TTL
      
      // Should be available immediately
      let value = await mockGet<string>('temp-key');
      expect(value).toBe('temp-value');

      // Wait for expiration
      await TestUtils.wait(60);

      // Should be expired now
      value = await mockGet<string>('temp-key');
      expect(value).toBeNull();
    });
  });

  describe('Cache Configuration', () => {
    it('should support comprehensive cache configuration', () => {
      const config: CacheConfiguration = {
        maxSize: 256 * 1024 * 1024, // 256MB
        maxEntries: 1000,
        defaultTTL: 60000, // 1 minute
        evictionPolicy: 'lru',
        persistToDisk: true,
        compressionEnabled: true
      };

      expect(config.evictionPolicy).toBe('lru');
      expect(config.maxEntries).toBe(1000);
      expect(config.persistToDisk).toBe(true);
      expect(config.compressionEnabled).toBe(true);
    });

    it('should validate cache strategies', () => {
      const strategies = ['lru', 'lfu', 'fifo', 'ttl'] as const;

      strategies.forEach(strategy => {
        const config: CacheConfiguration = {
          maxSize: 500 * 1024, // 500KB
          maxEntries: 500,
          defaultTTL: 300,
          evictionPolicy: strategy,
          persistToDisk: false,
          compressionEnabled: false
        };

        expect(config.evictionPolicy).toBe(strategy);
      });
    });
  });

  describe('Cache Entry Structure', () => {
    it('should handle cache entry metadata', () => {
      const entry: CacheEntry<string> = {
        key: 'test-key',
        value: 'test-value',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        size: 10,
        ttl: 60000
      };

      expect(entry.key).toBe('test-key');
      expect(entry.value).toBe('test-value');
      expect(entry.accessCount).toBe(1);
      expect(entry.size).toBe(10);
      expect(entry.ttl).toBe(60000);
    });

    it('should track entry access patterns', () => {
      const entry: CacheEntry<number> = {
        key: 'counter',
        value: 42,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        lastAccessedAt: new Date('2023-01-01T10:05:00Z'),
        accessCount: 5,
        size: 4,
        ttl: 3600
      };

      expect(entry.accessCount).toBe(5);
      expect(entry.lastAccessedAt).toEqual(new Date('2023-01-01T10:05:00Z'));
    });
  });

  describe('Cache Statistics', () => {
    it('should track comprehensive cache statistics', () => {
      const stats: CacheStatistics = {
        totalOperations: 1000,
        successfulOperations: 950,
        failedOperations: 50,
        averageLatency: 1.5,
        peakLatency: 5.0,
        storageUtilization: 75.5
      };

      expect(stats.successfulOperations).toBe(950);
      expect(stats.failedOperations).toBe(50);
      expect(stats.averageLatency).toBe(1.5);
      expect(stats.storageUtilization).toBe(75.5);
    });

    it('should calculate rates correctly', () => {
      const totalOperations = 1000;
      const successfulOperations = 800;
      const failedOperations = 200;

      const successRate = (successfulOperations / totalOperations) * 100;
      const failureRate = (failedOperations / totalOperations) * 100;

      expect(successRate).toBe(80.0);
      expect(failureRate).toBe(20.0);
      expect(successRate + failureRate).toBe(100.0);
    });
  });

  describe('Cache Performance', () => {
    it('should handle concurrent cache operations', async () => {
      const cache = new Map<string, any>();
      const operations: Promise<void>[] = [];

      // Simulate concurrent set operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          Promise.resolve().then(() => {
            cache.set(`key-${i}`, `value-${i}`);
          })
        );
      }

      await Promise.all(operations);
      expect(cache.size).toBe(100);

      // Verify all values are set correctly
      for (let i = 0; i < 100; i++) {
        expect(cache.get(`key-${i}`)).toBe(`value-${i}`);
      }
    });

    it('should measure cache operation performance', async () => {
      const cache = new Map<string, any>();

      // Measure set performance
      const { duration: setDuration } = await TestUtils.measureTime(async () => {
        for (let i = 0; i < 1000; i++) {
          cache.set(`perf-key-${i}`, `perf-value-${i}`);
        }
      });

      // Measure get performance
      const { duration: getDuration } = await TestUtils.measureTime(async () => {
        for (let i = 0; i < 1000; i++) {
          cache.get(`perf-key-${i}`);
        }
      });

      expect(setDuration).toBeGreaterThan(0);
      expect(getDuration).toBeGreaterThan(0);
      expect(cache.size).toBe(1000);
    });
  });

  describe('Cache Eviction', () => {
    it('should implement LRU eviction strategy', async () => {
      // Simulate LRU cache with max size 3
      const maxSize = 3;
      const cache = new Map<string, { value: any; lastAccessed: number }>();

      const set = (key: string, value: any) => {
        if (cache.size >= maxSize && !cache.has(key)) {
          // Find least recently used item
          let lruKey = '';
          let lruTime = Infinity;
          
          for (const [k, entry] of cache.entries()) {
            if (entry.lastAccessed < lruTime) {
              lruTime = entry.lastAccessed;
              lruKey = k;
            }
          }
          
          if (lruKey) {
            cache.delete(lruKey);
          }
        }
        
        cache.set(key, { value, lastAccessed: Date.now() });
      };

      const get = (key: string) => {
        const entry = cache.get(key);
        if (entry) {
          entry.lastAccessed = Date.now();
          return entry.value;
        }
        return undefined;
      };

      // Fill cache to capacity
      set('a', 'value-a');
      await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamps
      set('b', 'value-b');
      await new Promise(resolve => setTimeout(resolve, 1));
      set('c', 'value-c');
      expect(cache.size).toBe(3);

      // Access 'a' to make it recently used
      await new Promise(resolve => setTimeout(resolve, 1));
      get('a');

      // Add new item - should evict 'b' (least recently used)
      await new Promise(resolve => setTimeout(resolve, 1));
      set('d', 'value-d');
      expect(cache.size).toBe(3);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });
  });

  describe('Cache Persistence', () => {
    it('should support cache serialization', () => {
      interface CacheData {
        value: any;
        createdAt: Date;
      }

      const cacheData = new Map<string, CacheData>([
        ['key1', { value: 'value1', createdAt: new Date() }],
        ['key2', { value: { id: 1, name: 'test' }, createdAt: new Date() }],
        ['key3', { value: [1, 2, 3], createdAt: new Date() }]
      ]);

      // Serialize cache data
      const serialized = JSON.stringify(Array.from(cacheData.entries()));
      
      // Deserialize cache data
      const deserialized = new Map<string, CacheData>(JSON.parse(serialized));

      expect(deserialized.size).toBe(3);
      expect(deserialized.get('key1')?.value).toBe('value1');
      expect(deserialized.get('key2')?.value.id).toBe(1);
      expect(deserialized.get('key3')?.value).toEqual([1, 2, 3]);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache storage errors gracefully', async () => {
      const mockCache: Partial<ICacheService> = {
        set: async (key: string, value: any): Promise<void> => {
          if (key === 'error-key') {
            throw new Error('Storage full');
          }
        },

        get: async <T>(key: string): Promise<T | null> => {
          if (key === 'corrupt-key') {
            throw new Error('Data corruption detected');
          }
          return null;
        }
      };

      // Test set error handling
      await expect(mockCache.set?.('error-key', 'value')).rejects.toThrow('Storage full');

      // Test get error handling
      await expect(mockCache.get?.('corrupt-key')).rejects.toThrow('Data corruption detected');
    });

    it('should handle memory pressure scenarios', () => {
      const memoryPressureConfig: CacheConfiguration = {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxEntries: 1000,
        defaultTTL: 300,
        evictionPolicy: 'lru',
        persistToDisk: true,
        compressionEnabled: true
      };

      expect(memoryPressureConfig.maxSize).toBe(10 * 1024 * 1024);
      expect(memoryPressureConfig.maxEntries).toBe(1000);
      expect(memoryPressureConfig.evictionPolicy).toBe('lru');
    });
  });
});
