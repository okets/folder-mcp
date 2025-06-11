/**
 * Dependency injection module exports
 * 
 * Main entry point for the dependency injection system.
 */

// Core DI infrastructure
export { DependencyContainer, getContainer, resetContainer, createContainer } from './container.js';

// Service interfaces
export type {
  IConfigurationService,
  IFileParsingService,
  IChunkingService,
  IEmbeddingService,
  IVectorSearchService,
  ICacheService,
  IFileSystemService,
  IErrorRecoveryService,
  ILoggingService,
  IServiceFactory,
  IDependencyContainer,
  ServiceToken
} from './interfaces.js';

export { SERVICE_TOKENS } from './interfaces.js';

// Service implementations
export {
  ConfigurationService,
  FileParsingService,
  ChunkingService,
  EmbeddingService,
  LoggingService,
  CacheService,
  FileSystemService,
  VectorSearchService
} from './services.js';

// Service factory
export { ServiceFactory, createServiceFactory } from './factory.js';

// Setup utilities
export {
  setupDependencyInjection,
  setupForIndexing,
  setupForMCPServer,
  setupForTesting,
  getService,
  getLoggingService,
  getConfigurationService,
  getFileParsingService,
  getChunkingService,
  getEmbeddingService,
  getCacheService,
  getFileSystemService
} from './setup.js';

/**
 * Re-export common types for convenience
 */
export type { ResolvedConfig } from '../config/resolver.js';
export type { RuntimeConfig } from '../config/schema.js';
