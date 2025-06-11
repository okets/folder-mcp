/**
 * Cache Infrastructure Module
 * 
 * This module provides technical caching services,
 * including storage strategies, cache management, and persistence.
 */

// Infrastructure service interfaces
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
}

export interface ICacheStorage {
  read(filePath: string): Promise<Buffer | null>;
  write(filePath: string, data: Buffer): Promise<void>;
  remove(filePath: string): Promise<boolean>;
  exists(filePath: string): Promise<boolean>;
  list(directory?: string): Promise<string[]>;
  size(filePath: string): Promise<number>;
}

export interface ICacheStrategy {
  shouldCache(key: string, value: any): boolean;
  getTTL(key: string, value: any): number;
  getEvictionPriority(key: string): number;
  onCacheHit(key: string): void;
  onCacheMiss(key: string): void;
}

// Infrastructure types
export interface CacheConfiguration {
  maxSize: number; // in bytes
  maxEntries: number;
  defaultTTL: number; // in seconds
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'ttl';
  persistToDisk: boolean;
  compressionEnabled: boolean;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  currentSize: number; // in bytes
  entryCount: number;
  evictionCount: number;
  avgResponseTime: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  size: number; // in bytes
  ttl: number; // in seconds
}

export interface CacheStorageOptions {
  baseDirectory: string;
  maxFileSize: number;
  compressionLevel?: number;
  fileExtension?: string;
  partitioning?: 'flat' | 'hash' | 'date';
}

export interface CacheStatistics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageLatency: number;
  peakLatency: number;
  storageUtilization: number;
}

// Infrastructure implementations (to be migrated/created)
// export { CacheService } from './service.js';
// export { DiskCacheStorage } from './storage.js';
// export { LRUCacheStrategy } from './strategy.js';
// export { CacheManager } from './manager.js';
