/**
 * Dependency injection interfaces for folder-mcp
 * 
 * This file defines service interfaces to enable proper dependency injection
 * and reduce tight coupling between components.
 */

import { FileFingerprint, TextChunk, ParsedContent, EmbeddingVector } from '../types/index.js';
import { ResolvedConfig } from '../config/schema.js';
import { RuntimeConfig } from '../config/schema.js';
import { SystemCapabilities } from '../config/schema.js';

// =============================================================================
// Core Service Interfaces
// =============================================================================

/**
 * Indexing orchestrator interface
 */
export interface IIndexingOrchestrator {
  indexFolder(path: string, options?: any): Promise<any>;
  processFile(filePath: string): Promise<any>;
  removeFile(filePath: string): Promise<any>;
  pauseFolder(path: string): void;
  resumeFolder(path: string): void;
  isPaused(path: string): boolean;
  getStatistics(): any;
  reset(): void;
}

/**
 * Configuration service interface
 * Handles configuration resolution, validation, and caching
 */
export interface IConfigurationService {
  /**
   * Resolve configuration from multiple sources with proper precedence
   */
  resolveConfig(folderPath: string, cliArgs?: any): Promise<ResolvedConfig>;
  
  /**
   * Generate runtime configuration with system optimization
   */
  generateRuntimeConfig(resolvedConfig: ResolvedConfig, toolVersion?: string): Promise<RuntimeConfig>;
  
  /**
   * Validate configuration and return errors if any
   */
  validateConfig(config: any): string[];
  
  /**
   * Get system capabilities for configuration optimization
   */
  getSystemCapabilities(): Promise<SystemCapabilities>;
}

/**
 * File parsing service interface
 * Handles parsing of different file types
 */
export interface IFileParsingService {
  /**
   * Parse a file based on its extension
   */
  parseFile(filePath: string, fileType: string): Promise<ParsedContent>;
  
  /**
   * Check if a file type is supported
   */
  isSupported(fileExtension: string): boolean;
  
  /**
   * Get list of supported file extensions
   */
  getSupportedExtensions(): string[];
}

/**
 * Text chunking service interface
 * Handles intelligent text chunking for processing
 */
export interface IChunkingService {
  /**
   * Split text into semantic chunks
   */
  chunkText(content: ParsedContent, chunkSize?: number, overlap?: number): Promise<{
    chunks: TextChunk[];
    totalChunks: number;
  }>;
  
  /**
   * Estimate token count for text
   */
  estimateTokenCount(text: string): number;
}

/**
 * Embedding service interface
 * Handles embedding model initialization and vector generation
 */
export interface IEmbeddingService {
  /**
   * Initialize the embedding model
   */
  initialize(): Promise<void>;
  
  /**
   * Generate embeddings for text chunks
   */
  generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]>;
  
  /**
   * Generate single embedding for query text
   */
  generateQueryEmbedding(query: string): Promise<EmbeddingVector>;
  
  /**
   * Generate single embedding for any text (alias for generateQueryEmbedding)
   */
  generateSingleEmbedding(text: string): Promise<EmbeddingVector>;
  
  /**
   * Calculate cosine similarity between two embedding vectors
   */
  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number;
  
  /**
   * Get current model configuration
   */
  getModelConfig(): any;
  
  /**
   * Check if service is initialized
   */
  isInitialized(): boolean;
}

/**
 * Vector search service interface
 * Handles vector similarity search operations
 */
export interface IVectorSearchService {
  /**
   * Build vector index from embeddings
   */
  buildIndex(embeddings: EmbeddingVector[], metadata: any[]): Promise<void>;
  
  /**
   * Load existing vector index
   */
  loadIndex(indexPath: string): Promise<void>;
  
  /**
   * Search for similar vectors
   */
  search(queryVector: EmbeddingVector, topK?: number, threshold?: number): Promise<any[]>;
  
  /**
   * Check if index is loaded and ready
   */
  isReady(): boolean;
  
  /**
   * Remove document from vector index
   */
  removeDocument(filePath: string): Promise<void>;
}

/**
 * Cache service interface
 * Handles caching of processed data and embeddings
 */
export interface ICacheService {
  /**
   * Setup cache directory structure
   */
  setupCacheDirectory(): Promise<void>;
  
  /**
   * Save data to cache with atomic operations
   */
  saveToCache<T>(key: string, data: T, cacheType: 'metadata' | 'embeddings' | 'vectors'): Promise<void>;
  
  /**
   * Load data from cache
   */
  loadFromCache<T>(key: string, cacheType: 'metadata' | 'embeddings' | 'vectors'): Promise<T | null>;
  
  /**
   * Check if cache entry exists
   */
  hasCacheEntry(key: string, cacheType: 'metadata' | 'embeddings' | 'vectors'): boolean;
  
  /**
   * Get cache status for files
   */
  getCacheStatus(fingerprints: FileFingerprint[]): Promise<any>;
  
  /**
   * Invalidate cache for a specific file
   */
  invalidateCache(filePath: string): Promise<void>;
}

/**
 * File system service interface
 * Handles file operations and fingerprinting
 */
export interface IFileSystemService {
  /**
   * Generate fingerprints for files in a folder
   */
  generateFingerprints(folderPath: string, extensions: string[], ignorePatterns: string[]): Promise<FileFingerprint[]>;
  
  /**
   * Read file content
   */
  readFile(filePath: string): Promise<string>;
  
  /**
   * Check if file/directory exists
   */
  exists(path: string): boolean;
  
  /**
   * Watch folder for changes
   */
  watchFolder(folderPath: string, callback: (event: string, filePath: string) => void): Promise<void>;
  
  /**
   * Scan folder for files
   */
  scanFolder(folderPath: string): Promise<{ files: any[], errors: any[] }>;
  
  /**
   * Get file hash
   */
  getFileHash(filePath: string): Promise<string>;
  
  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): Promise<any>;
  
  /**
   * Check if path is directory
   */
  isDirectory(path: string): boolean;
}

/**
 * Error recovery service interface
 * Handles error recovery and retry logic
 */
export interface IErrorRecoveryService {
  /**
   * Execute operation with retry logic
   */
  executeWithRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    maxRetries?: number
  ): Promise<T>;
  
  /**
   * Log error for analysis
   */
  logError(operationId: string, error: Error, context?: any): void;
  
  /**
   * Get error statistics
   */
  getErrorStats(): any;
}

/**
 * Logging service interface
 * Handles structured logging across the application
 */
export interface ILoggingService {
  /**
   * Log debug message
   */
  debug(message: string, context?: any): void;
  
  /**
   * Log info message
   */
  info(message: string, context?: any): void;
  
  /**
   * Log warning message
   */
  warn(message: string, context?: any): void;
  
  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: any): void;
  
  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error, context?: any): void;
  
  /**
   * Set log level
   */
  setLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'): void;
}

// =============================================================================
// Application Layer Interfaces
// =============================================================================

/**
 * Indexing workflow interface
 * Orchestrates the complete indexing process
 */
export interface IIndexingWorkflow {
  indexFolder(path: string, options?: any): Promise<any>;
  indexFiles(files: string[], options?: any): Promise<any>;
  getIndexingStatus(path: string): Promise<any>;
  resumeIndexing(path: string): Promise<any>;
}

/**
 * Incremental indexing interface
 * Handles incremental updates to the index
 */
export interface IIncrementalIndexing {
  detectChanges(folderPath: string): Promise<any>;
  indexChanges(changes: any, options?: any): Promise<any>;
}

/**
 * Content serving workflow interface
 * Orchestrates content serving operations
 */
export interface IContentServingWorkflow {
  startServer(folder: string, options: { port: number; host: string }): Promise<void>;
  stopServer(): Promise<void>;
  getFileContent(filePath: string): Promise<any>;
  searchKnowledge(query: string, options?: any): Promise<any>;
  getFileList(pattern?: string): Promise<any>;
  getServerStatus(): Promise<any>;
}

/**
 * Knowledge operations interface
 * Provides advanced search and knowledge operations
 */
export interface IKnowledgeOperations {
  semanticSearch(query: string, options: { maxResults?: number; threshold?: number; includeContext?: boolean }): Promise<{ success: boolean; results: any[]; totalResults: number; processingTime: number; query: string; options: any }>;
  enhancedSearch(query: string, options: any): Promise<any>;
  getRelatedContent(filePath: string, similarity?: number): Promise<any>;
}

/**
 * Monitoring workflow interface
 * Orchestrates monitoring and health checking
 */
export interface IMonitoringWorkflow {
  startFileWatching(folderPath: string, options?: any): Promise<any>;
  stopFileWatching(folderPath: string): Promise<void>;
  getWatchingStatus(folderPath: string): Promise<any>;
  getSystemHealth(): Promise<any>;
}

/**
 * Health monitoring interface
 * Provides comprehensive health monitoring
 */
export interface IHealthMonitoring {
  checkIndexHealth(): Promise<any>;
  checkPerformanceMetrics(): Promise<any>;
  checkResourceUsage(): Promise<any>;
  generateHealthReport(): Promise<any>;
}

// =============================================================================
// Service Factory Interface
// =============================================================================

/**
 * Service factory interface for creating service instances
 */
export interface IServiceFactory {
  /**
   * Create configuration service
   */
  createConfigurationService(): IConfigurationService;
  
  /**
   * Create file parsing service
   */
  createFileParsingService(basePath: string): IFileParsingService;
  
  /**
   * Create chunking service
   */
  createChunkingService(): IChunkingService;
  
  /**
   * Create embedding service with configuration
   */
  createEmbeddingService(config: ResolvedConfig): IEmbeddingService;
  
  /**
   * Create vector search service
   */
  createVectorSearchService(cacheDir: string): IVectorSearchService;
  
  /**
   * Create cache service
   */
  createCacheService(folderPath: string): ICacheService;
  
  /**
   * Create file system service
   */
  createFileSystemService(): IFileSystemService;
  
  /**
   * Create error recovery service
   */
  createErrorRecoveryService(cacheDir: string): IErrorRecoveryService;
  /**
   * Create logging service
   */
  createLoggingService(config?: any): ILoggingService;
  
  /**
   * Create MCP server
   */
  createMCPServer(options: any, container: any): any;
}

// =============================================================================
// Dependency Container Interface
// =============================================================================

/**
 * Dependency injection container interface
 */
export interface IDependencyContainer {
  /**
   * Register a service instance
   */
  register<T>(token: string | symbol, instance: T): void;
  
  /**
   * Register a service factory
   */
  registerFactory<T>(token: string | symbol, factory: () => T): void;
  
  /**
   * Register a singleton service factory
   */
  registerSingleton<T>(token: string | symbol, factory: () => T): void;
  
  /**
   * Resolve a service instance
   */
  resolve<T>(token: string | symbol): T;
  
  /**
   * Check if service is registered
   */
  isRegistered(token: string | symbol): boolean;
  
  /**
   * Clear all registrations
   */
  clear(): void;
}

// =============================================================================
// Service Tokens
// =============================================================================

/**
 * Service tokens for dependency injection
 */
export const SERVICE_TOKENS = {  // Infrastructure Layer
  CONFIGURATION: Symbol('ConfigurationService'),
  FILE_PARSING: Symbol('FileParsingService'),
  CHUNKING: Symbol('ChunkingService'),
  EMBEDDING: Symbol('EmbeddingService'),
  VECTOR_SEARCH: Symbol('VectorSearchService'),
  CACHE: Symbol('CacheService'),
  FILE_SYSTEM: Symbol('FileSystemService'),
  ERROR_RECOVERY: Symbol('ErrorRecoveryService'),  LOGGING: Symbol('LoggingService'),
  SERVICE_FACTORY: Symbol('ServiceFactory'),
  
  // Domain Infrastructure Providers
  DOMAIN_FILE_SYSTEM_PROVIDER: Symbol('DomainFileSystemProvider'),
  DOMAIN_CRYPTOGRAPHY_PROVIDER: Symbol('DomainCryptographyProvider'),
  DOMAIN_PATH_PROVIDER: Symbol('DomainPathProvider'),
  
  // Folder Domain Services
  FOLDER_MANAGER: Symbol('FolderManager'),
  FOLDER_VALIDATOR: Symbol('FolderValidator'),
  FOLDER_PATH_RESOLVER: Symbol('FolderPathResolver'),
  FOLDER_CONFIG_MERGER: Symbol('FolderConfigMerger'),
  
  // Multi-Folder Storage Services
  STORAGE_FACTORY: Symbol('StorageFactory'),
  MULTI_FOLDER_STORAGE_PROVIDER: Symbol('MultiFolderStorageProvider'),
  
  // Multi-Folder Indexing Services
  MULTI_FOLDER_INDEXING_WORKFLOW: Symbol('MultiFolderIndexingWorkflow'),
  
  // Multi-Folder Monitoring Services
  MULTI_FOLDER_MONITORING_WORKFLOW: Symbol('MultiFolderMonitoringWorkflow'),
  
  // Transport Layer
  TRANSPORT_FACTORY: Symbol('TransportFactory'),
  TRANSPORT_MANAGER: Symbol('TransportManager'),
  
  // Application Layer
  INDEXING_WORKFLOW: Symbol('IndexingWorkflow'),
  CONTENT_SERVING_WORKFLOW: Symbol('ContentServingWorkflow'),
  MONITORING_WORKFLOW: Symbol('MonitoringWorkflow'),
  
  // Interface Layer
  MCP_SERVER: Symbol('MCPServer'),
  
  // CLI Layer
  CLI_CONFIGURATION_COMMAND_SERVICE: Symbol('CLIConfigurationCommandService'),
  CLI_CONFIGURATION_OVERRIDE_SERVICE: Symbol('CLIConfigurationOverrideService'),
  CLI_PROFILE_COMMAND_SERVICE: Symbol('CLIProfileCommandService'),
  CLI_HELP_SYSTEM_SERVICE: Symbol('CLIHelpSystemService'),
  CLI_JSON_OUTPUT_SERVICE: Symbol('CLIJsonOutputService'),
  
  // Daemon Layer
  DAEMON_SERVICE: Symbol('DaemonService'),
  PROCESS_MANAGER: Symbol('ProcessManager'),
  HEALTH_MONITOR: Symbol('HealthMonitor'),
  SIGNAL_HANDLER: Symbol('SignalHandler'),
  PERFORMANCE_MONITOR: Symbol('PerformanceMonitor'),
  PID_MANAGER: Symbol('PidManager'),
  SYSTEM_MONITOR: Symbol('SystemMonitor'),
  
  // WebSocket Layer
  WEBSOCKET_SERVER: Symbol('WebSocketServer'),
  FMDM_SERVICE: Symbol('FMDMService'),
  DAEMON_CONFIGURATION_SERVICE: Symbol('DaemonConfigurationService'),
  DAEMON_FOLDER_VALIDATION_SERVICE: Symbol('DaemonFolderValidationService'),
} as const;

/**
 * Type for service tokens
 */
export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS];

// =============================================================================
// Module Service Tokens for New Architecture
// =============================================================================

/**
 * Service tokens for dependency injection
 * Organized by architectural layer
 */
export const MODULE_TOKENS = {
  // Domain Layer Services
  DOMAIN: {
    FILE_OPERATIONS: Symbol('Domain.FileOperations'),
    FILE_FINGERPRINT: Symbol('Domain.FileFingerprintOperations'),
    CONTENT_OPERATIONS: Symbol('Domain.ContentOperations'),
    EMBEDDING_OPERATIONS: Symbol('Domain.EmbeddingOperations'),
    BATCH_EMBEDDING_OPERATIONS: Symbol('Domain.BatchEmbeddingOperations'),
    SEARCH_OPERATIONS: Symbol('Domain.SearchOperations'),
    ENHANCED_SEARCH_OPERATIONS: Symbol('Domain.EnhancedSearchOperations'),
  },
  
  // Application Layer Services
  APPLICATION: {
    INDEXING_WORKFLOW: Symbol('Application.IndexingWorkflow'),
    INCREMENTAL_INDEXING: Symbol('Application.IncrementalIndexing'),
    CONTENT_SERVING_WORKFLOW: Symbol('Application.ContentServingWorkflow'),
    KNOWLEDGE_OPERATIONS: Symbol('Application.KnowledgeOperations'),
    MONITORING_WORKFLOW: Symbol('Application.MonitoringWorkflow'),
    HEALTH_MONITORING: Symbol('Application.HealthMonitoring'),
  },
  
  // Infrastructure Layer Services
  INFRASTRUCTURE: {
    CACHE_SERVICE: Symbol('Infrastructure.CacheService'),
    CACHE_STORAGE: Symbol('Infrastructure.CacheStorage'),
    CACHE_STRATEGY: Symbol('Infrastructure.CacheStrategy'),
    LOGGING_SERVICE: Symbol('Infrastructure.LoggingService'),
    LOG_FORMATTER: Symbol('Infrastructure.LogFormatter'),
    LOG_TRANSPORT: Symbol('Infrastructure.LogTransport'),
    ERROR_HANDLER: Symbol('Infrastructure.ErrorHandler'),
    ERROR_RECOVERY_SERVICE: Symbol('Infrastructure.ErrorRecoveryService'),
    ERROR_REPORTER: Symbol('Infrastructure.ErrorReporter'),
  },
  
  // Interface Layer Services
  INTERFACE: {
    CLI_PROGRAM: Symbol('Interface.CLIProgram'),
    MCP_SERVER: Symbol('Interface.MCPServer'),
    MCP_TRANSPORT: Symbol('Interface.MCPTransport'),
  },
} as const;

// =============================================================================
// Legacy Service Tokens (for backward compatibility during migration)
// =============================================================================

// =============================================================================
// New Modular Architecture Interfaces (Forward Declarations)
// =============================================================================

// Note: These interfaces will be properly imported once the migration is complete
// For now, we declare them as placeholders to support the new architecture

// Domain Layer Interface Placeholders
export interface ModularFileOperations {
  scanFolder(path: string): Promise<string[]>;
  parseFile(path: string): Promise<any>;
  watchFolder(path: string, callback: Function): Promise<void>;
}

export interface ModularContentOperations {
  chunkText(text: string, options: any): any[];
  processContent(content: any): any;
  extractMetadata(content: any): any;
}

export interface ModularEmbeddingOperations {
  generateEmbeddings(chunks: any[]): Promise<any[]>;
  generateSingleEmbedding(text: string): Promise<any>;
  calculateSimilarity(vector1: any, vector2: any): number;
}

export interface ModularSearchOperations {
  findSimilar(query: any, k: number): Promise<any[]>;
  searchByText(queryText: string, k: number): Promise<any[]>;
  rankResults(results: any[]): any[];
}

// Application Layer Interface Placeholders
export interface ModularIndexingWorkflow {
  indexFolder(path: string, options: any): Promise<any>;
  indexFiles(files: string[], options: any): Promise<any>;
  getIndexingStatus(path: string): Promise<any>;
}

export interface ModularContentServingWorkflow {
  getFileContent(filePath: string): Promise<any>;
  searchKnowledge(query: string, options?: any): Promise<any>;
  getFileList(pattern?: string): Promise<any>;
}

export interface ModularMonitoringWorkflow {
  startFileWatching(folderPath: string, options: any): Promise<any>;
  stopFileWatching(folderPath: string): Promise<void>;
  getWatchingStatus(folderPath: string): Promise<any>;
}

// =============================================================================
// Transport Layer Interfaces
// =============================================================================

/**
 * Transport factory service interface
 * Manages creation and selection of different transport implementations
 */
export interface ITransportFactory {
  /**
   * Create a transport instance based on configuration
   */
  createTransport(config: any): Promise<ITransport>;
  
  /**
   * Get available transport types
   */
  getAvailableTransports(): string[];
}

/**
 * Transport service interface
 * Base interface for all transport implementations
 */
export interface ITransport {
  /**
   * Initialize the transport
   */
  initialize(): Promise<void>;
  
  /**
   * Start the transport service
   */
  start(): Promise<void>;
  
  /**
   * Stop the transport service
   */
  stop(): Promise<void>;
  
  /**
   * Check if transport is healthy
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Transport manager service interface
 * Coordinates multiple transports and handles lifecycle
 */
export interface ITransportManager {
  /**
   * Initialize all configured transports
   */
  initialize(): Promise<void>;
  
  /**
   * Start all transports
   */
  startAll(): Promise<void>;
  
  /**
   * Stop all transports
   */
  stopAll(): Promise<void>;
  
  /**
   * Get active transports
   */
  getActiveTransports(): ITransport[];
}
