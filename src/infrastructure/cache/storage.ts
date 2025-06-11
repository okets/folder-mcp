/**
 * Cache Storage Implementation
 * 
 * Core cache storage service for the infrastructure layer.
 * Provides persistent and in-memory caching capabilities.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import { ICacheService, ICacheStorage, CacheConfiguration, CacheMetrics } from './index';

export class CacheStorage implements ICacheStorage {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.ensureCacheDirectory();
  }

  async read(filePath: string): Promise<Buffer | null> {
    const fullPath = join(this.cacheDir, filePath);
    
    try {
      if (!existsSync(fullPath)) {
        return null;
      }
      
      return readFileSync(fullPath);
    } catch (error) {
      console.warn(`Warning: Could not read cache file ${filePath}: ${error}`);
      return null;
    }
  }

  async write(filePath: string, data: Buffer): Promise<void> {
    const fullPath = join(this.cacheDir, filePath);
    const directory = fullPath.substring(0, fullPath.lastIndexOf('/'));
    
    try {
      // Ensure directory exists
      if (directory !== this.cacheDir) {
        mkdirSync(directory, { recursive: true });
      }
      
      writeFileSync(fullPath, data);
    } catch (error) {
      throw new Error(`Failed to write cache file ${filePath}: ${error}`);
    }
  }

  async remove(filePath: string): Promise<boolean> {
    const fullPath = join(this.cacheDir, filePath);
    
    try {
      if (!existsSync(fullPath)) {
        return false;
      }
      
      unlinkSync(fullPath);
      return true;
    } catch (error) {
      console.warn(`Warning: Could not remove cache file ${filePath}: ${error}`);
      return false;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = join(this.cacheDir, filePath);
    return existsSync(fullPath);
  }

  async list(directory?: string): Promise<string[]> {
    const searchDir = directory ? join(this.cacheDir, directory) : this.cacheDir;
    
    try {
      if (!existsSync(searchDir)) {
        return [];
      }
      
      return readdirSync(searchDir).filter(file => !file.startsWith('.'));
    } catch (error) {
      console.warn(`Warning: Could not list cache directory ${directory || ''}: ${error}`);
      return [];
    }
  }

  async size(filePath: string): Promise<number> {
    const fullPath = join(this.cacheDir, filePath);
    
    try {
      if (!existsSync(fullPath)) {
        return 0;
      }
      
      const stats = statSync(fullPath);
      return stats.size;
    } catch (error) {
      console.warn(`Warning: Could not get size of cache file ${filePath}: ${error}`);
      return 0;
    }
  }

  private ensureCacheDirectory(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }
}

/**
 * In-Memory Cache Service with persistence
 */
export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, { value: any; expiresAt: number; accessCount: number }>();
  private storage: ICacheStorage;
  private config: CacheConfiguration;
  private metrics: CacheMetrics;

  constructor(storage: ICacheStorage, config: Partial<CacheConfiguration> = {}) {
    this.storage = storage;
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 10000,
      defaultTTL: 3600, // 1 hour
      evictionPolicy: 'lru',
      persistToDisk: true,
      compressionEnabled: false,
      ...config
    };
    
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      currentSize: 0,
      entryCount: 0,
      evictionCount: 0,
      avgResponseTime: 0
    };
  }

  async get<T>(key: string): Promise<T | null> {
    this.metrics.totalRequests++;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.missRate = ++this.metrics.missRate / this.metrics.totalRequests;
      
      // Try to load from persistent storage if enabled
      if (this.config.persistToDisk) {
        const persistedData = await this.storage.read(`${key}.json`);
        if (persistedData) {
          try {
            const parsed = JSON.parse(persistedData.toString());
            if (parsed.expiresAt > Date.now()) {
              this.cache.set(key, parsed);
              this.updateMetrics();
              return parsed.value;
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }
      
      return null;
    }
    
    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.updateMetrics();
      this.metrics.missRate = ++this.metrics.missRate / this.metrics.totalRequests;
      return null;
    }
    
    // Update access count for LRU/LFU
    entry.accessCount++;
    this.metrics.hitRate = ++this.metrics.hitRate / this.metrics.totalRequests;
    
    return entry.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL) * 1000;
    const entry = { value, expiresAt, accessCount: 0 };
    
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictEntries();
    }
    
    this.cache.set(key, entry);
    this.updateMetrics();
    
    // Persist to disk if enabled
    if (this.config.persistToDisk) {
      try {
        const data = Buffer.from(JSON.stringify(entry));
        await this.storage.write(`${key}.json`, data);
      } catch (error) {
        console.warn(`Warning: Could not persist cache entry ${key}: ${error}`);
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.cache.delete(key);
    
    if (existed) {
      this.updateMetrics();
      
      // Remove from persistent storage
      if (this.config.persistToDisk) {
        await this.storage.remove(`${key}.json`);
      }
    }
    
    return existed;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.updateMetrics();
    
    // Clear persistent storage if enabled
    if (this.config.persistToDisk) {
      const files = await this.storage.list();
      for (const file of files) {
        if (file.endsWith('.json')) {
          await this.storage.remove(file);
        }
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key) || (this.config.persistToDisk && await this.storage.exists(`${key}.json`));
  }

  async keys(pattern?: string): Promise<string[]> {
    const cacheKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return cacheKeys;
    }
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return cacheKeys.filter(key => regex.test(key));
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  private async evictEntries(): Promise<void> {
    const entriesToEvict = Math.max(1, Math.floor(this.config.maxEntries * 0.1)); // Evict 10%
    const entries = Array.from(this.cache.entries());
    
    // Sort based on eviction policy
    switch (this.config.evictionPolicy) {
      case 'lru':
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case 'lfu':
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case 'ttl':
        entries.sort(([, a], [, b]) => a.expiresAt - b.expiresAt);
        break;
      case 'fifo':
      default:
        // Keep original order (FIFO)
        break;
    }
    
    // Remove the entries
    for (let i = 0; i < entriesToEvict && i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        const [key] = entry;
        await this.delete(key);
        this.metrics.evictionCount++;
      }
    }
  }

  private updateMetrics(): void {
    this.metrics.entryCount = this.cache.size;
    
    // Calculate approximate current size
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // Approximate string size
      totalSize += JSON.stringify(entry.value).length * 2; // Approximate value size
    }
    this.metrics.currentSize = totalSize;
  }
}
