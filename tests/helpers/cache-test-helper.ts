/**
 * Cache Test Helper
 * 
 * Shared utility for consistent cache management across all real integration tests.
 * Provides standardized cache directory creation, validation, and cleanup methods.
 * 
 * ⚠️ CRITICAL: Ensures consistent .folder-mcp cache structure across all endpoint tests
 */

import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

export interface CacheDirectoryStructure {
  baseDir: string;
  metadata: string;
  embeddings?: string;
  vectors?: string;
  outlines?: string;
  structure?: string;
  sheets?: string;
  csv?: string;
  slides?: string;
  presentations?: string;
  pages?: string;
  documents?: string;
  workflows?: string;
  search?: string;
  integrations?: string;
  [key: string]: string | undefined;
}

export interface CacheValidationResult {
  exists: boolean;
  structure: CacheDirectoryStructure;
  subdirectories: string[];
  files: string[];
  totalSize: number;
  isValid: boolean;
  errors: string[];
}

export class CacheTestHelper {
  private knowledgeBasePath: string;
  private cacheBaseDir: string;

  constructor(knowledgeBasePath: string) {
    this.knowledgeBasePath = knowledgeBasePath;
    this.cacheBaseDir = path.join(knowledgeBasePath, '.folder-mcp');
  }

  /**
   * Create standardized cache directory structure for any endpoint type
   */
  async createCacheStructure(subdirectories: string[]): Promise<CacheDirectoryStructure> {
    // Ensure base cache directory exists
    if (!existsSync(this.cacheBaseDir)) {
      await fs.mkdir(this.cacheBaseDir, { recursive: true });
    }

    const structure: CacheDirectoryStructure = {
      baseDir: this.cacheBaseDir,
      metadata: path.join(this.cacheBaseDir, 'metadata')
    };

    // Always create metadata directory
    if (!existsSync(structure.metadata)) {
      await fs.mkdir(structure.metadata, { recursive: true });
    }

    // Create requested subdirectories
    for (const subdir of subdirectories) {
      const subdirPath = path.join(this.cacheBaseDir, subdir);
      if (!existsSync(subdirPath)) {
        await fs.mkdir(subdirPath, { recursive: true });
      }
      structure[subdir] = subdirPath;
    }

    return structure;
  }

  /**
   * Create cache structure for search endpoint tests
   */
  async createSearchCacheStructure(): Promise<CacheDirectoryStructure> {
    return this.createCacheStructure(['embeddings', 'vectors', 'search']);
  }

  /**
   * Create cache structure for document outline tests
   */
  async createOutlineCacheStructure(): Promise<CacheDirectoryStructure> {
    return this.createCacheStructure(['outlines', 'structure']);
  }

  /**
   * Create cache structure for document data tests
   */
  async createDocumentDataCacheStructure(): Promise<CacheDirectoryStructure> {
    return this.createCacheStructure(['documents']);
  }

  /**
   * Create cache structure for sheet data tests
   */
  async createSheetDataCacheStructure(): Promise<CacheDirectoryStructure> {
    return this.createCacheStructure(['sheets', 'csv']);
  }

  /**
   * Create cache structure for slides tests
   */
  async createSlidesCacheStructure(): Promise<CacheDirectoryStructure> {
    return this.createCacheStructure(['slides', 'presentations']);
  }

  /**
   * Create cache structure for pages tests
   */
  async createPagesCacheStructure(): Promise<CacheDirectoryStructure> {
    return this.createCacheStructure(['pages', 'documents']);
  }

  /**
   * Create cache structure for embedding tests
   */
  async createEmbeddingCacheStructure(): Promise<CacheDirectoryStructure> {
    return this.createCacheStructure(['embeddings', 'vectors']);
  }

  /**
   * Create cache structure for workflow tests
   */
  async createWorkflowCacheStructure(): Promise<CacheDirectoryStructure> {
    return this.createCacheStructure(['workflows', 'search', 'integrations']);
  }

  /**
   * Save test data to cache with validation
   */
  async saveToCache(subdirectory: string, key: string, data: any): Promise<string> {
    const subdirPath = path.join(this.cacheBaseDir, subdirectory);
    
    // Ensure subdirectory exists
    if (!existsSync(subdirPath)) {
      await fs.mkdir(subdirPath, { recursive: true });
    }

    const filePath = path.join(subdirPath, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    return filePath;
  }

  /**
   * Load data from cache with validation
   */
  async loadFromCache<T = any>(subdirectory: string, key: string): Promise<T | null> {
    const filePath = path.join(this.cacheBaseDir, subdirectory, `${key}.json`);
    
    if (!existsSync(filePath)) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  }

  /**
   * Validate cache directory structure and contents
   */
  async validateCacheStructure(expectedSubdirectories: string[]): Promise<CacheValidationResult> {
    const result: CacheValidationResult = {
      exists: existsSync(this.cacheBaseDir),
      structure: { baseDir: this.cacheBaseDir, metadata: path.join(this.cacheBaseDir, 'metadata') },
      subdirectories: [],
      files: [],
      totalSize: 0,
      isValid: true,
      errors: []
    };

    if (!result.exists) {
      result.isValid = false;
      result.errors.push('Cache base directory does not exist');
      return result;
    }

    try {
      // Check all subdirectories
      for (const subdir of expectedSubdirectories) {
        const subdirPath = path.join(this.cacheBaseDir, subdir);
        if (existsSync(subdirPath)) {
          result.subdirectories.push(subdir);
          result.structure[subdir] = subdirPath;

          // Count files in subdirectory
          const files = await fs.readdir(subdirPath);
          for (const file of files) {
            const filePath = path.join(subdirPath, file);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              result.files.push(path.join(subdir, file));
              result.totalSize += stats.size;
            }
          }
        } else {
          result.errors.push(`Expected subdirectory '${subdir}' does not exist`);
          result.isValid = false;
        }
      }

      // Always check metadata directory
      const metadataPath = path.join(this.cacheBaseDir, 'metadata');
      if (!existsSync(metadataPath)) {
        result.errors.push('Metadata directory does not exist');
        result.isValid = false;
      } else {
        result.subdirectories.push('metadata');
      }

    } catch (error) {
      result.errors.push(`Validation error: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Test cache persistence by saving data and verifying it survives operations
   */
  async testCachePersistence(testData: any): Promise<boolean> {
    const testKey = 'persistence-test';
    const testSubdir = 'metadata';

    try {
      // Save test data
      await this.saveToCache(testSubdir, testKey, testData);

      // Verify data exists
      const savedPath = path.join(this.cacheBaseDir, testSubdir, `${testKey}.json`);
      if (!existsSync(savedPath)) {
        return false;
      }

      // Load and verify data matches
      const loadedData = await this.loadFromCache(testSubdir, testKey);
      const dataMatches = JSON.stringify(loadedData) === JSON.stringify(testData);

      // Clean up test file
      await fs.unlink(savedPath);

      return dataMatches;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate cache index integrity by checking for corruption
   */
  async validateCacheIndexIntegrity(): Promise<{ isValid: boolean; corruptedFiles: string[]; errors: string[] }> {
    const result = {
      isValid: true,
      corruptedFiles: [] as string[],
      errors: [] as string[]
    };

    if (!existsSync(this.cacheBaseDir)) {
      result.errors.push('Cache directory does not exist');
      result.isValid = false;
      return result;
    }

    try {
      const subdirectories = await fs.readdir(this.cacheBaseDir, { withFileTypes: true });

      for (const subdir of subdirectories) {
        if (subdir.isDirectory()) {
          const subdirPath = path.join(this.cacheBaseDir, subdir.name);
          const files = await fs.readdir(subdirPath);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(subdirPath, file);
              try {
                const content = await fs.readFile(filePath, 'utf8');
                JSON.parse(content); // Test if valid JSON
              } catch (parseError) {
                result.corruptedFiles.push(path.relative(this.cacheBaseDir, filePath));
                result.isValid = false;
              }
            }
          }
        }
      }
    } catch (error) {
      result.errors.push(`Index validation error: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Get cache statistics for reporting
   */
  async getCacheStatistics(): Promise<{ totalFiles: number; totalSize: number; subdirectories: number; byType: Record<string, number> }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      subdirectories: 0,
      byType: {} as Record<string, number>
    };

    if (!existsSync(this.cacheBaseDir)) {
      return stats;
    }

    try {
      const subdirectories = await fs.readdir(this.cacheBaseDir, { withFileTypes: true });
      
      for (const subdir of subdirectories) {
        if (subdir.isDirectory()) {
          stats.subdirectories++;
          stats.byType[subdir.name] = 0;

          const subdirPath = path.join(this.cacheBaseDir, subdir.name);
          const files = await fs.readdir(subdirPath);

          for (const file of files) {
            const filePath = path.join(subdirPath, file);
            const fileStat = await fs.stat(filePath);
            
            if (fileStat.isFile()) {
              stats.totalFiles++;
              stats.totalSize += fileStat.size;
              stats.byType[subdir.name]++;
            }
          }
        }
      }
    } catch (error) {
      // Return partial stats on error
    }

    return stats;
  }

  /**
   * Clean up cache directory (for test cleanup)
   */
  async cleanup(): Promise<void> {
    if (existsSync(this.cacheBaseDir)) {
      await fs.rm(this.cacheBaseDir, { recursive: true, force: true });
    }
  }

  /**
   * Get cache base directory path
   */
  getCacheBaseDir(): string {
    return this.cacheBaseDir;
  }

  /**
   * Check if cache exists
   */
  cacheExists(): boolean {
    return existsSync(this.cacheBaseDir);
  }
}