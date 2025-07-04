/**
 * Cache wrapper for configuration manager
 */

import { readFromCache, writeToCache, clearCache, clearAllCache, CacheOptions } from './cache.js';

/**
 * Runtime configuration cache
 */
export class RuntimeConfigCache {
  private options: CacheOptions;
  
  constructor(options: CacheOptions = {}) {
    this.options = options;
  }
  
  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    return readFromCache<T>(key, this.options);
  }
  
  /**
   * Set a cached value
   */
  async set<T>(key: string, value: T): Promise<void> {
    writeToCache(key, value, this.options);
  }
  
  /**
   * Clear a cached value
   */
  async clear(key?: string): Promise<boolean | number> {
    if (key) {
      return clearCache(key);
    } else {
      // Clear all cache entries
      return clearAllCache();
    }
  }
}