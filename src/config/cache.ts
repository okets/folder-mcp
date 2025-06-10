// Configuration caching system for folder-mcp
// Provides persistent storage for runtime configurations and system profiles

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';

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
    compressed?: boolean;
  };
}

/**
 * Cache keys for different types of cached data
 */
export const CACHE_KEYS = {
  RUNTIME_CONFIG: 'last-runtime',
  SYSTEM_PROFILE: 'system-profile',
  OLLAMA_MODELS: 'ollama-models',
  CACHE_METADATA: 'cache-metadata'
} as const;

export type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

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
 * Calculate checksum for data
 */
function calculateChecksum(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Compress data if compression is enabled
 */
function compressData(data: string, compress: boolean): { data: string; compressed: boolean } {
  if (!compress) {
    return { data, compressed: false };
  }
  
  try {
    const compressed = gzipSync(Buffer.from(data, 'utf-8')).toString('base64');
    return { data: compressed, compressed: true };
  } catch (error) {
    // Fallback to uncompressed if compression fails
    return { data, compressed: false };
  }
}

/**
 * Decompress data if it was compressed
 */
function decompressData(data: string, compressed: boolean): string {
  if (!compressed) {
    return data;
  }
  
  try {
    const decompressed = gunzipSync(Buffer.from(data, 'base64')).toString('utf-8');
    return decompressed;
  } catch (error) {
    throw new Error(`Failed to decompress cached data: ${error}`);
  }
}

/**
 * Handle corrupted cache files gracefully
 */
function handleCorruptedCache(filePath: string, error: any): null {
  console.warn(`⚠️ Corrupted cache file detected: ${filePath}`);
  console.warn(`Error: ${error.message}`);
  
  try {
    // Try to remove the corrupted file
    require('fs').unlinkSync(filePath);
    console.warn('🗑️ Corrupted cache file removed, will regenerate on next access');
  } catch (deleteError: any) {
    console.warn('❌ Failed to remove corrupted cache file:', deleteError.message);
  }
  
  return null;
}
/**
 * Read data from cache
 */
export function readFromCache<T>(key: string, options: CacheOptions = {}): T | null {
  const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
  const filePath = getCacheFilePath(key);
  
  if (!isCacheValid(filePath, options)) {
    return null;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(content);
    
    // Validate checksum if enabled
    if (opts.validateChecksum && entry.metadata.checksum) {
      const expectedChecksum = calculateChecksum(JSON.stringify(entry.data));
      if (entry.metadata.checksum !== expectedChecksum) {
        console.warn(`⚠️ Cache checksum mismatch for key: ${key}`);
        return handleCorruptedCache(filePath, new Error('Checksum validation failed'));
      }
    }
    
    // Decompress if needed
    let dataString = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
    if (entry.metadata.compressed) {
      try {
        dataString = decompressData(dataString, true);
        return JSON.parse(dataString) as T;
      } catch (error) {
        console.warn(`⚠️ Cache decompression failed for key: ${key}`);
        return handleCorruptedCache(filePath, error);
      }
    }
    
    return entry.data;
  } catch (error) {
    console.warn(`⚠️ Failed to read cache for key: ${key}`);
    return handleCorruptedCache(filePath, error);
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
  
  // Prepare data for storage
  let processedData: any = data;
  let compressed = false;
  let checksum: string | undefined;
  
  // Apply compression if enabled
  if (opts.compress) {
    const dataString = JSON.stringify(data);
    const compressionResult = compressData(dataString, true);
    if (compressionResult.compressed) {
      processedData = compressionResult.data;
      compressed = true;
    }
  }
  
  // Calculate checksum if enabled
  if (opts.validateChecksum) {
    const dataString = JSON.stringify(compressed ? data : processedData);
    checksum = calculateChecksum(dataString);
  }
  
  const entry: CacheEntry<any> = {
    data: processedData,
    metadata: {
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      version: '1.0.0',
      compressed,
      ...(checksum && { checksum }),
    },
  };
  
  const filePath = getCacheFilePath(key);
  
  try {
    const content = JSON.stringify(entry, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to write cache for key: ${key}`, error);
    throw error;
  }
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
    unlinkSync(filePath);
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
    const files = readdirSync(cacheDir);
    
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
    ...(oldestEntry && { oldestEntry }),
    ...(newestEntry && { newestEntry }),
  };
}

/**
 * Invalidate cache entries that have expired
 */
export function invalidateExpiredCache(): number {
  const cacheDir = getGlobalCacheDir();
  
  if (!existsSync(cacheDir)) {
    return 0;
  }
  
  let invalidated = 0;
  try {
    const files = require('fs').readdirSync(cacheDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = join(cacheDir, file);
        if (!isCacheValid(filePath)) {
          try {
            require('fs').unlinkSync(filePath);
            invalidated++;
          } catch (error) {
            // Continue with other files
          }
        }
      }
    }
  } catch (error) {
    // Directory read error
  }
  
  return invalidated;
}

/**
 * Check if a cache key exists and is valid
 */
export function isCacheKeyValid(key: string, options: CacheOptions = {}): boolean {
  const filePath = getCacheFilePath(key);
  return isCacheValid(filePath, options);
}

/**
 * Get cache entry metadata without loading the data
 */
export function getCacheMetadata(key: string): CacheEntry<any>['metadata'] | null {
  const filePath = getCacheFilePath(key);
  
  if (!existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const entry: CacheEntry<any> = JSON.parse(content);
    return entry.metadata;
  } catch (error) {
    return null;
  }
}

/**
 * Update cache entry TTL without changing the data
 */
export function extendCacheTTL(key: string, additionalHours: number): boolean {
  const filePath = getCacheFilePath(key);
  
  if (!existsSync(filePath)) {
    return false;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const entry: CacheEntry<any> = JSON.parse(content);
    
    // Extend the expiration time
    const currentExpiry = new Date(entry.metadata.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + additionalHours * 60 * 60 * 1000);
    entry.metadata.expiresAt = newExpiry.toISOString();
    
    // Write back the updated entry
    const updatedContent = JSON.stringify(entry, null, 2);
    writeFileSync(filePath, updatedContent, 'utf-8');
    
    return true;
  } catch (error) {
    return false;
  }
}