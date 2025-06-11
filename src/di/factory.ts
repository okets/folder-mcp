/**
 * Service factory implementation for dependency injection
 * 
 * Creates and configures service instances with proper dependencies.
 */

import {
  IServiceFactory,
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

import {
  ConfigurationService,
  FileParsingService,
  ChunkingService,
  EmbeddingService,
  LoggingService,
  CacheService,
  FileSystemService,
  VectorSearchService,
  ErrorRecoveryService
} from './services.js';

import { ResolvedConfig } from '../config/resolver.js';
import { DependencyContainer } from './container.js';
import { SERVICE_TOKENS } from './interfaces.js';
import { IndexingService } from '../processing/indexingService.js';
import { MCPServer } from '../mcp/mcpServer.js';

/**
 * Default service factory implementation
 */
export class ServiceFactory implements IServiceFactory {
  private loggingService: ILoggingService | null = null;

  /**
   * Get or create logging service (needed by other services)
   */
  private getLoggingService(config?: any): ILoggingService {
    if (!this.loggingService) {
      this.loggingService = new LoggingService(config);
    }
    return this.loggingService;
  }

  createConfigurationService(): IConfigurationService {
    const loggingService = this.getLoggingService();
    return new ConfigurationService(loggingService);
  }

  createFileParsingService(basePath: string): IFileParsingService {
    const loggingService = this.getLoggingService();
    return new FileParsingService(basePath, loggingService);
  }

  createChunkingService(): IChunkingService {
    const loggingService = this.getLoggingService();
    return new ChunkingService(loggingService);
  }

  createEmbeddingService(config: ResolvedConfig): IEmbeddingService {
    const loggingService = this.getLoggingService();
    return new EmbeddingService(config, loggingService);
  }

  createVectorSearchService(cacheDir: string): IVectorSearchService {
    const loggingService = this.getLoggingService();
    return new VectorSearchService(cacheDir, loggingService);
  }

  createCacheService(folderPath: string): ICacheService {
    const loggingService = this.getLoggingService();
    return new CacheService(folderPath, loggingService);
  }

  createFileSystemService(): IFileSystemService {
    const loggingService = this.getLoggingService();
    return new FileSystemService(loggingService);
  }

  createErrorRecoveryService(cacheDir: string): IErrorRecoveryService {
    const loggingService = this.getLoggingService();
    return new ErrorRecoveryService(cacheDir, loggingService);
  }

  createLoggingService(config?: any): ILoggingService {
    return this.getLoggingService(config);
  }

  createIndexingService(
    config: ResolvedConfig,
    folderPath: string,
    container: DependencyContainer
  ): IndexingService {
    return new IndexingService(
      container.resolve(SERVICE_TOKENS.CONFIGURATION),
      container.resolve(SERVICE_TOKENS.FILE_PARSING),
      container.resolve(SERVICE_TOKENS.CHUNKING),
      container.resolve(SERVICE_TOKENS.EMBEDDING),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.FILE_SYSTEM),
      container.resolve(SERVICE_TOKENS.LOGGING),
      container.resolve(SERVICE_TOKENS.VECTOR_SEARCH)
    );
  }

  createMCPServer(
    config: ResolvedConfig,
    folderPath: string,
    container: DependencyContainer
  ): MCPServer {
    return new MCPServer(
      {
        folderPath,
        resolvedConfig: config
      },
      container.resolve(SERVICE_TOKENS.CONFIGURATION),
      container.resolve(SERVICE_TOKENS.EMBEDDING),
      container.resolve(SERVICE_TOKENS.VECTOR_SEARCH),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.FILE_SYSTEM),
      container.resolve(SERVICE_TOKENS.LOGGING)
    );
  }
}

/**
 * Create a pre-configured service factory
 */
export function createServiceFactory(globalConfig?: any): IServiceFactory {
  return new ServiceFactory();
}
