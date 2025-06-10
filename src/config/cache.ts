// Configuration caching system for folder-mcp
// Provides persistent storage for runtime configurations and system profiles

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
  data: T;
  metadata: {
    createdAt: string;
    expiresAt: string;
    version: string;
    checksum?: string;
  };
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  ttlHours?: number;          // Time to live in hours
  maxSize?: number;           // Maximum cache size in bytes
  compress?: boolean;         // Enable compression
  validateChecksum?: boolean; // Validate data integrity
}

/**
 * Default cache options
 */
export const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
  ttlHours: 24,
  maxSize: 100 * 1024 * 1024, // 100MB
  compress: false,
  validateChecksum: true,
};

/**
 * Get the global cache directory path
 * ~/.folder-mcp/ on all platforms
 */
export function getGlobalCacheDir(): string {
  return join(homedir(), '.folder-mcp');
}

/**
 * Ensure cache directory exists
 */
export function ensureCacheDir(): void {
  const cacheDir = getGlobalCacheDir();
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Get cache file path for a specific key
 */
export function getCacheFilePath(key: string): string {
  return join(getGlobalCacheDir(), `${key}.json`);
}

/**
 * Check if cache entry is valid (not expired)
 */
export function isCacheValid(filePath: string, options: CacheOptions = {}): boolean {
  const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
  
  if (!existsSync(filePath)) {
    return false;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const entry: CacheEntry<any> = JSON.parse(content);
    
    // Check expiration
    const expiresAt = new Date(entry.metadata.expiresAt);
    const now = new Date();
    
    if (now > expiresAt) {
      return false;
    }
    
    // Check file size
    const stats = statSync(filePath);
    if (stats.size > opts.maxSize) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Read data from cache
 */
export function readFromCache<T>(key: string, options: CacheOptions = {}): T | null {
  const filePath = getCacheFilePath(key);
  
  if (!isCacheValid(filePath, options)) {
    return null;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(content);
    
    // TODO: Add checksum validation if enabled
    // TODO: Add decompression if enabled
    
    return entry.data;
  } catch (error) {
    return null;
  }
}

/**
 * Write data to cache
 */
export function writeToCache<T>(
  key: string, 
  data: T, 
  options: CacheOptions = {}
): void {
  const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
  
  ensureCacheDir();
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + opts.ttlHours * 60 * 60 * 1000);
  
  const entry: CacheEntry<T> = {
    data,
    metadata: {
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      version: '1.0.0',
      // TODO: Add checksum if enabled
    },
  };
  
  // TODO: Add compression if enabled
  
  const filePath = getCacheFilePath(key);
  const content = JSON.stringify(entry, null, 2);
  
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): boolean {
  const filePath = getCacheFilePath(key);
  
  if (!existsSync(filePath)) {
    return false;
  }
  
  try {
    require('fs').unlinkSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): number {
  const cacheDir = getGlobalCacheDir();
  
  if (!existsSync(cacheDir)) {
    return 0;
  }
  
  let cleared = 0;
  try {
    const files = require('fs').readdirSync(cacheDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = join(cacheDir, file);
        try {
          require('fs').unlinkSync(filePath);
          cleared++;
        } catch (error) {
          // Continue with other files
        }
      }
    }
  } catch (error) {
    // Directory read error
  }
  
  return cleared;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalFiles: number;
  totalSize: number;
  oldestEntry?: string;
  newestEntry?: string;
} {
  const cacheDir = getGlobalCacheDir();
  
  if (!existsSync(cacheDir)) {
    return { totalFiles: 0, totalSize: 0 };
  }
  
  let totalFiles = 0;
  let totalSize = 0;
  let oldestTime = Infinity;
  let newestTime = 0;
  let oldestEntry: string | undefined;
  let newestEntry: string | undefined;
  
  try {
    const files = require('fs').readdirSync(cacheDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = join(cacheDir, file);
        try {
          const stats = statSync(filePath);
          totalFiles++;
          totalSize += stats.size;
          
          const mtime = stats.mtime.getTime();
          if (mtime < oldestTime) {
            oldestTime = mtime;
            oldestEntry = file;
          }
          if (mtime > newestTime) {
            newestTime = mtime;
            newestEntry = file;
          }
        } catch (error) {
          // Continue with other files
        }
      }
    }
  } catch (error) {
    // Directory read error
  }
  
  return {
    totalFiles,
    totalSize,
    oldestEntry,
    newestEntry,
  };
}