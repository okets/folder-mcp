/**
 * import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, extname } from 'path';
import { homedir } from 'os';vice implementations for dependency injection
 * 
 * Contains concrete implementations of all service interfaces
 * with proper dependency injection support.
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { join, resolve, extname } from 'path';
import { homedir } from 'os';

import {
  IConfigurationService,
  IFileParsingService,
  IChunkingService,
  IEmbeddingService,
  IVectorSearchService,
  ICacheService,
  IFileSystemService,
  IErrorRecoveryService,
  ILoggingService
} from './interfaces.js';

import { FileFingerprint, TextChunk, ParsedContent, EmbeddingVector } from '../types/index.js';
import { ResolvedConfig, CLIArgs } from '../config/resolver.js';
import { RuntimeConfig } from '../config/schema.js';
import { SystemCapabilities, getSystemCapabilities } from '../config/system.js';

// Import domain layer functionality
import { 
  FileSystemProvider, 
  CryptographyProvider, 
  PathProvider
} from '../domain/index.js';
import { createFileFingerprintGenerator } from '../domain/files/index.js';

// =============================================================================
// Configuration Service Implementation
// =============================================================================

export class ConfigurationService implements IConfigurationService {
  constructor(
    private readonly loggingService: ILoggingService
  ) {}

  async resolveConfig(folderPath: string, cliArgs: any = {}): Promise<ResolvedConfig> {
    this.loggingService.debug('Resolving configuration', { folderPath, cliArgsKeys: Object.keys(cliArgs) });
    
    try {
      // Use existing resolver logic
      const { resolveConfig } = await import('../config/resolver.js');
      const resolved = resolveConfig(folderPath, cliArgs);
      
      this.loggingService.info('Configuration resolved successfully', { 
        folderPath: resolved.folderPath,
        modelName: resolved.modelName,
        chunkSize: resolved.chunkSize
      });
      
      return resolved;
    } catch (error) {
      this.loggingService.error('Failed to resolve configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async generateRuntimeConfig(resolvedConfig: ResolvedConfig, toolVersion = '1.0.0'): Promise<RuntimeConfig> {
    this.loggingService.debug('Generating runtime configuration', { toolVersion });
    
    try {
      const { generateRuntimeConfig } = await import('../config/runtime.js');
      const runtime = await generateRuntimeConfig(resolvedConfig.folderPath, resolvedConfig, toolVersion);
      
      this.loggingService.info('Runtime configuration generated', {
        modelName: runtime.processing.modelName,
        maxWorkers: runtime.processing.maxWorkers,
        performanceTier: runtime.system.performanceTier
      });
      
      return runtime;
    } catch (error) {
      this.loggingService.error('Failed to generate runtime configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  validateConfig(config: any): string[] {
    this.loggingService.debug('Validating configuration');
    
    try {
      // Import synchronously in an async context
      import('../config/resolver.js').then(({ validateResolvedConfig }) => {
        const errors = validateResolvedConfig(config);
        
        if (errors.length > 0) {
          this.loggingService.warn('Configuration validation errors found', { errors });
        } else {
          this.loggingService.debug('Configuration validation passed');
        }
        
        return errors;
      }).catch(error => {
        this.loggingService.error('Failed to validate configuration', error instanceof Error ? error : new Error(String(error)));
        return ['Configuration validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')];
      });
      
      // For now, return empty array - proper async validation should be implemented
      return [];
    } catch (error) {
      this.loggingService.error('Configuration validation failed', error instanceof Error ? error : new Error(String(error)));
      return ['Configuration validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')];
    }
  }

  async getSystemCapabilities(): Promise<SystemCapabilities> {
    this.loggingService.debug('Detecting system capabilities');
    
    try {
      const capabilities = await getSystemCapabilities();
      
      this.loggingService.info('System capabilities detected', {
        cpuCores: capabilities.cpuCores,
        availableMemoryGB: capabilities.availableMemoryGB,
        performanceTier: capabilities.performanceTier,
        hasGPU: capabilities.hasGPU
      });
      
      return capabilities;
    } catch (error) {
      this.loggingService.error('Failed to detect system capabilities', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// =============================================================================
// File Parsing Service Implementation
// =============================================================================

export class FileParsingService implements IFileParsingService {
  private readonly supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];

  constructor(
    private readonly basePath: string,
    private readonly loggingService: ILoggingService
  ) {}
  async parseFile(filePath: string, fileType: string): Promise<ParsedContent> {
    this.loggingService.debug('Parsing file', { filePath, fileType });
    
    try {
      // For now, use a simplified approach until domain layer is fully integrated
      // TODO: Properly integrate with domain layer FileParser
      
      const { readFileSync } = await import('fs');
      const content = readFileSync(filePath, 'utf8');      const { statSync } = await import('fs');
      const stats = statSync(filePath);
      
      const result: ParsedContent = {
        content,
        type: fileType,
        originalPath: filePath,
        metadata: {
          originalPath: filePath,
          type: fileType.startsWith('.') ? fileType.substring(1) as any : fileType as any,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          lines: content.split('\n').length,
          encoding: 'utf8'
        }
      };
      
      this.loggingService.info('File parsed successfully', { 
        filePath, 
        fileType, 
        contentLength: content.length 
      });
      
      return result;
    } catch (error) {
      this.loggingService.error('Failed to parse file', error instanceof Error ? error : new Error(String(error)), { filePath, fileType });
      throw error;
    }
  }

  isSupported(fileExtension: string): boolean {
    return this.supportedExtensions.includes(fileExtension.toLowerCase());
  }

  getSupportedExtensions(): string[] {
    return [...this.supportedExtensions];
  }
}

// =============================================================================
// Chunking Service Implementation
// =============================================================================

export class ChunkingService implements IChunkingService {
  constructor(
    private readonly loggingService: ILoggingService
  ) {}

  async chunkText(content: ParsedContent, chunkSize = 400, overlap = 10): Promise<{ chunks: TextChunk[]; totalChunks: number; }> {
    this.loggingService.debug('Chunking text', { 
      contentLength: content.content.length, 
      chunkSize, 
      overlap 
    });
    
    try {
      // Use existing chunking logic
      const { chunkText } = await import('../domain/content/index.js');
      const result = chunkText(content, chunkSize, chunkSize + 100, overlap / 100);
      
      this.loggingService.info('Text chunked successfully', {
        totalChunks: result.totalChunks,
        averageChunkSize: result.chunks.length > 0 
          ? Math.round(result.chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / result.chunks.length)
          : 0
      });
      
      return result;
    } catch (error) {
      this.loggingService.error('Failed to chunk text', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  estimateTokenCount(text: string): number {
    // Simple token estimation (words * 1.3)
    // This avoids the require issue and provides reasonable estimates
    try {
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      return Math.ceil(words.length * 1.3);
    } catch (error) {
      this.loggingService.error('Failed to estimate token count', error instanceof Error ? error : new Error(String(error)));
      // Fallback: rough estimation based on character count
      return Math.ceil(text.length / 4);
    }
  }
}

// =============================================================================
// Embedding Service Implementation
// =============================================================================

export class EmbeddingService implements IEmbeddingService {
  private embeddingModel: any = null;
  private initialized = false;

  constructor(
    private readonly config: ResolvedConfig,
    private readonly loggingService: ILoggingService
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.loggingService.debug('Initializing embedding service', { modelName: this.config.modelName });
    
    try {      // Use new DefaultEmbeddingOperations from domain layer
      const { DefaultEmbeddingOperations } = await import('../domain/embeddings/index.js');
      this.embeddingModel = new DefaultEmbeddingOperations();
      // Note: Domain layer embedding service doesn't have initialize method
      // await this.embeddingModel.initialize();
      
      this.initialized = true;
      this.loggingService.info('Embedding service initialized', { 
        modelName: this.config.modelName,
        backend: this.embeddingModel.getBackend?.() || 'unknown'
      });
    } catch (error) {
      this.loggingService.error('Failed to initialize embedding service', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.loggingService.debug('Generating embeddings', { chunkCount: chunks.length });
    
    try {
      const texts = chunks.map(chunk => chunk.content);
      const embeddings = await this.embeddingModel.generateBatchEmbeddings(texts);
      
      this.loggingService.info('Embeddings generated successfully', { 
        count: embeddings.length,
        dimensions: embeddings[0]?.vector?.length || 0
      });
      
      return embeddings;
    } catch (error) {
      this.loggingService.error('Failed to generate embeddings', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async generateQueryEmbedding(query: string): Promise<EmbeddingVector> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.loggingService.debug('Generating query embedding', { queryLength: query.length });
    
    try {
      const embedding = await this.embeddingModel.generateEmbedding(query);
       this.loggingService.debug('Query embedding generated', {
        dimensions: embedding.vector?.length || embedding.dimensions
      });
      
      return embedding;
    } catch (error) {
      this.loggingService.error('Failed to generate query embedding', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  getModelConfig(): any {
    return this.embeddingModel?.getCurrentModelConfig?.() || null;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// =============================================================================
// Logging Service Implementation
// =============================================================================

export class LoggingService implements ILoggingService {
  private level: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private readonly levels = { debug: 0, info: 1, warn: 2, error: 3 };

  constructor(config?: { level?: 'debug' | 'info' | 'warn' | 'error' }) {
    if (config?.level) {
      this.level = config.level;
    }
  }

  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: any): void {
    const errorContext = error ? { 
      error: error.message, 
      stack: error.stack,
      ...context 
    } : context;
    
    this.log('error', message, errorContext);
  }

  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.level = level;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: any): void {
    if (this.levels[level] < this.levels[this.level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = this.getPrefix(level);
    
    if (context) {
      console.log(`${prefix} [${timestamp}] ${message}`, context);
    } else {
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }

  private getPrefix(level: string): string {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      default: return '📝';
    }
  }
}

// =============================================================================
// Additional Service Implementations
// =============================================================================

// Cache Service (simplified implementation)
export class CacheService implements ICacheService {
  constructor(
    private readonly folderPath: string,
    private readonly loggingService: ILoggingService
  ) {}

  async setupCacheDirectory(): Promise<void> {
    const { setupCacheDirectory } = await import('../infrastructure/cache/index.js');
    await setupCacheDirectory(this.folderPath, { version: '1.0.0' });
  }

  async saveToCache<T>(key: string, data: T, cacheType: 'metadata' | 'embeddings' | 'vectors'): Promise<void> {
    const cacheDir = join(this.folderPath, '.folder-mcp');
    const typeDir = join(cacheDir, cacheType);
    const filePath = join(typeDir, `${key}.json`);
    
    try {
      // Ensure directory exists
      if (!existsSync(typeDir)) {
        const { mkdirSync } = await import('fs');
        mkdirSync(typeDir, { recursive: true });
      }
      
      // Use atomic file operations
      const { AtomicFileOperations } = await import('../infrastructure/errors/recovery.js');
      await AtomicFileOperations.writeFileAtomic(filePath, JSON.stringify(data, null, 2));
      
      this.loggingService.debug('Data saved to cache', { key, cacheType, filePath });
    } catch (error) {
      this.loggingService.error('Failed to save to cache', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async loadFromCache<T>(key: string, cacheType: 'metadata' | 'embeddings' | 'vectors'): Promise<T | null> {
    const cacheDir = join(this.folderPath, '.folder-mcp');
    const typeDir = join(cacheDir, cacheType);
    const filePath = join(typeDir, `${key}.json`);
    
    try {
      if (!this.hasCacheEntry(key, cacheType)) {
        return null;
      }
      
      const content = readFileSync(filePath, 'utf8');
      const data = JSON.parse(content) as T;
      
      this.loggingService.debug('Data loaded from cache', { key, cacheType, filePath });
      return data;
    } catch (error) {
      this.loggingService.error('Failed to load from cache', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  hasCacheEntry(key: string, cacheType: 'metadata' | 'embeddings' | 'vectors'): boolean {
    const cacheDir = join(this.folderPath, '.folder-mcp');
    const typeDir = join(cacheDir, cacheType);
    const filePath = join(typeDir, `${key}.json`);
    
    return existsSync(filePath);
  }

  async getCacheStatus(fingerprints: FileFingerprint[]): Promise<any> {
    const { detectCacheStatus, loadPreviousIndex } = await import('../infrastructure/cache/index.js');
    const cacheDir = join(this.folderPath, '.folder-mcp');
    const previousIndex = loadPreviousIndex(cacheDir);
    return detectCacheStatus(fingerprints, previousIndex);
  }
}

// File System Service (simplified implementation)
export class FileSystemService implements IFileSystemService {
  constructor(
    private readonly loggingService: ILoggingService,
    private readonly fileSystemProvider: FileSystemProvider,
    private readonly cryptographyProvider: CryptographyProvider,
    private readonly pathProvider: PathProvider
  ) {}
  async generateFingerprints(folderPath: string, extensions: string[], ignorePatterns: string[]): Promise<FileFingerprint[]> {
    this.loggingService.debug('Generating fingerprints for folder using domain layer', { folderPath, extensions, ignorePatterns });
    
    try {
      const { glob } = await import('glob');
      
      // Build glob pattern
      const pattern = folderPath.replace(/\\/g, '/') + '/**/*';
      
      // Default ignore patterns
      const defaultIgnorePatterns = [
        '**/.folder-mcp/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**'
      ];
      
      const allIgnorePatterns = [...defaultIgnorePatterns, ...ignorePatterns];
      
      this.loggingService.debug('Scanning for files', { pattern, ignorePatterns: allIgnorePatterns });
      
      // Find all files
      const allFiles = await glob(pattern, { 
        nodir: true,  // Only files, not directories
        dot: false,   // Ignore hidden files
        ignore: allIgnorePatterns
      });
      
      // Filter by supported extensions
      const supportedFiles = allFiles.filter(file => {
        const ext = this.pathProvider.extname(file).toLowerCase();
        return extensions.includes(ext);
      });
      
      this.loggingService.debug('Files found', { 
        total: allFiles.length, 
        supported: supportedFiles.length,
        extensions: extensions
      });
      
      // Create fingerprint generator using domain layer
      const fingerprintGenerator = createFileFingerprintGenerator(
        this.fileSystemProvider,
        this.cryptographyProvider,
        this.pathProvider
      );
      
      // Generate fingerprints using domain layer
      const fingerprints = await fingerprintGenerator.generateFingerprints(supportedFiles, folderPath);
      
      this.loggingService.debug('Fingerprints generated successfully', { count: fingerprints.length });
      
      return fingerprints;
    } catch (error) {
      this.loggingService.error('Failed to generate fingerprints', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async readFile(filePath: string): Promise<string> {
    return readFileSync(filePath, 'utf8');
  }

  exists(path: string): boolean {
    return existsSync(path);
  }

  async watchFolder(folderPath: string, callback: (event: string, filePath: string) => void): Promise<void> {
    try {
      const { watch } = await import('fs/promises');
      const watcher = await watch(folderPath, { recursive: true });
      for await (const event of watcher) {
        if (event.filename) {
          callback(event.eventType, event.filename);
        }
      }
    } catch (error) {
      this.loggingService.error('Failed to watch folder', error instanceof Error ? error : new Error(String(error)), { folderPath });
      throw error;
    }
  }
}

// =============================================================================
// Vector Search Service Implementation
// =============================================================================

export class VectorSearchService implements IVectorSearchService {
  private vectorIndex: any = null;
  private isIndexReady = false;

  constructor(
    private readonly cacheDir: string,
    private readonly loggingService: ILoggingService
  ) {}
  async buildIndex(embeddings: EmbeddingVector[], metadata: any[]): Promise<void> {
    try {
      // TODO: Implement with domain layer search services
      // const { VectorIndex } = await import('../domain/search/index.js');
      // this.vectorIndex = new VectorIndex(this.cacheDir);
      
      // For now, stub the implementation
      this.loggingService.warn('Vector index building not yet implemented with new domain layer');
      this.isIndexReady = true;
    } catch (error) {
      this.loggingService.error('Failed to build vector index', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  async loadIndex(indexPath: string): Promise<void> {
    try {
      // TODO: Implement with domain layer search services
      // const { VectorIndex } = await import('../domain/search/index.js');
      // this.vectorIndex = new VectorIndex(indexPath);
      // const loaded = await this.vectorIndex.loadIndex();
      
      // For now, stub the implementation
      this.loggingService.warn('Vector index loading not yet implemented with new domain layer');
      this.isIndexReady = false;
    } catch (error) {
      this.loggingService.error('Failed to load vector index', error instanceof Error ? error : new Error(String(error)), { indexPath });
      throw error;
    }
  }

  async search(queryVector: EmbeddingVector, topK = 5, threshold = 0.0): Promise<any[]> {
    if (!this.isIndexReady) {
      throw new Error('Vector index not ready');
    }
    
    try {
      const results = await this.vectorIndex.search(queryVector, topK);
      
      return results
        .filter((result: { score: number }) => result.score >= threshold)
        .map((result: { content: string; metadata: any; score: number }) => ({
          content: result.content,
          metadata: result.metadata,
          score: result.score
        }));
    } catch (error) {
      this.loggingService.error('Failed to search vector index', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  isReady(): boolean {
    return this.isIndexReady;
  }
}

// =============================================================================
// Error Recovery Service Implementation
// =============================================================================

export class ErrorRecoveryService implements IErrorRecoveryService {
  private errorManager: any = null;

  constructor(
    private readonly cacheDir: string,
    private readonly loggingService: ILoggingService
  ) {}

  private async getErrorManager() {
    if (!this.errorManager) {
      try {
        const { ErrorRecoveryManager } = await import('../infrastructure/errors/recovery.js');
        this.errorManager = new ErrorRecoveryManager(this.cacheDir);
      } catch (error) {
        this.loggingService.error('Failed to initialize error manager', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
    return this.errorManager;
  }

  async executeWithRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logError(operationId, lastError, { attempt, maxRetries });
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw lastError;
  }

  logError(operationId: string, error: Error, context?: any): void {
    this.loggingService.error('Logging error for recovery', error, { operationId, context });
  }

  getErrorStats(): any {
    return {
      totalErrors: 0,
      recentErrors: [],
    };
  }
}

// =============================================================================
// Enhanced Cache Service Implementation
// =============================================================================

export class EnhancedCacheService implements ICacheService {
  constructor(
    private readonly folderPath: string,
    private readonly loggingService: ILoggingService
  ) {}

  async setupCacheDirectory(): Promise<void> {
    try {
      if (!existsSync(this.folderPath)) {
        mkdirSync(this.folderPath, { recursive: true });
      }
    } catch (error) {
      this.loggingService.error('Failed to setup cache directory', error instanceof Error ? error : new Error(String(error)), { folderPath: this.folderPath });
      throw error;
    }
  }

  async saveToCache<T>(key: string, data: T, cacheType: 'metadata' | 'embeddings' | 'vectors'): Promise<void> {
    try {
      const cachePath = join(this.folderPath, `${cacheType}`, `${key}.json`);
      const cacheDir = join(this.folderPath, cacheType);
      
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }
      
      writeFileSync(cachePath, JSON.stringify(data, null, 2));
    } catch (error) {
      this.loggingService.error('Failed to save to cache', error instanceof Error ? error : new Error(String(error)), { key, cacheType });
      throw error;
    }
  }

  async loadFromCache<T>(key: string, cacheType: 'metadata' | 'embeddings' | 'vectors'): Promise<T | null> {
    try {
      const cachePath = join(this.folderPath, `${cacheType}`, `${key}.json`);
      
      if (!existsSync(cachePath)) {
        return null;
      }
      
      const data = readFileSync(cachePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      this.loggingService.error('Failed to load from cache', error instanceof Error ? error : new Error(String(error)), { key, cacheType });
      return null;
    }
  }

  hasCacheEntry(key: string, cacheType: 'metadata' | 'embeddings' | 'vectors'): boolean {
    const cacheDir = join(this.folderPath, '.folder-mcp');
    const typeDir = join(cacheDir, cacheType);
    const filePath = join(typeDir, `${key}.json`);
    
    return existsSync(filePath);
  }

  async getCacheStatus(fingerprints: FileFingerprint[]): Promise<any> {
    const { detectCacheStatus, loadPreviousIndex } = await import('../infrastructure/cache/index.js');
    const cacheDir = join(this.folderPath, '.folder-mcp');
    const previousIndex = loadPreviousIndex(cacheDir);
    return detectCacheStatus(fingerprints, previousIndex);
  }
}
