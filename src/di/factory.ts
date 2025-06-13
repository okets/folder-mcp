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
  ILoggingService,
  ITransportFactory,
  ITransportManager
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
import { SERVICE_TOKENS, MODULE_TOKENS } from './interfaces.js';
import { IndexingOrchestrator } from '../application/indexing/index.js';
import { MCPServer } from '../interfaces/mcp/server.js';

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
  ): IndexingOrchestrator {
    return this.createIndexingOrchestrator(container);
  }
  // =============================================================================
  // Application Layer Factory Methods
  // =============================================================================

  createIndexingOrchestrator(container: DependencyContainer): any {
    // Import the IndexingOrchestrator directly to avoid require issues
    const { IndexingOrchestrator } = require('../application/indexing/orchestrator.js');
    return new IndexingOrchestrator(
      container.resolve(SERVICE_TOKENS.FILE_PARSING),
      container.resolve(SERVICE_TOKENS.CHUNKING),
      container.resolve(SERVICE_TOKENS.EMBEDDING),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.LOGGING),
      container.resolve(SERVICE_TOKENS.CONFIGURATION),
      container.resolve(SERVICE_TOKENS.FILE_SYSTEM)
    );
  }

  createIncrementalIndexer(container: DependencyContainer): any {
    const { IncrementalIndexer } = require('../application/indexing/incremental.js');
    const indexingOrchestrator = this.createIndexingOrchestrator(container);
    
    return new IncrementalIndexer(
      container.resolve(SERVICE_TOKENS.FILE_SYSTEM),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.LOGGING),
      indexingOrchestrator
    );
  }

  createContentServingOrchestrator(container: DependencyContainer): any {
    const { ContentServingOrchestrator } = require('../application/serving/orchestrator.js');
    return new ContentServingOrchestrator(
      container.resolve(SERVICE_TOKENS.FILE_PARSING),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.VECTOR_SEARCH),
      container.resolve(SERVICE_TOKENS.LOGGING),
      container.resolve(SERVICE_TOKENS.CONFIGURATION)
    );
  }

  createKnowledgeOperationsService(container: DependencyContainer): any {
    const { KnowledgeOperationsService } = require('../application/serving/knowledge.js');
    return new KnowledgeOperationsService(
      container.resolve(SERVICE_TOKENS.VECTOR_SEARCH),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.LOGGING),
      container.resolve(SERVICE_TOKENS.FILE_PARSING)
    );
  }

  createMonitoringOrchestrator(container: DependencyContainer): any {
    const { MonitoringOrchestrator } = require('../application/monitoring/orchestrator.js');
    return new MonitoringOrchestrator(
      container.resolve(SERVICE_TOKENS.FILE_PARSING),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.LOGGING),
      container.resolve(SERVICE_TOKENS.CONFIGURATION)
    );
  }

  createHealthMonitoringService(container: DependencyContainer): any {
    const { HealthMonitoringService } = require('../application/monitoring/health.js');
    return new HealthMonitoringService(
      container.resolve(SERVICE_TOKENS.CACHE),      container.resolve(SERVICE_TOKENS.VECTOR_SEARCH),
      container.resolve(SERVICE_TOKENS.LOGGING),
      container.resolve(SERVICE_TOKENS.CONFIGURATION),
      container.resolve(SERVICE_TOKENS.FILE_PARSING)
    );
  }

  /**
   * Create transport factory
   */
  createTransportFactory(): any {
    // For now, return a stub implementation
    return {
      createTransport: async (config: any) => {
        // Return a stub transport
        return {
          initialize: async () => {},
          start: async () => {},
          stop: async () => {},
          isHealthy: async () => true
        };
      },
      getAvailableTransports: () => ['local', 'remote', 'http']
    };
  }

  /**
   * Create transport manager
   */
  createTransportManager(container: DependencyContainer): any {
    // For now, return a stub implementation
    return {
      initialize: async () => {},
      startAll: async () => {},
      stopAll: async () => {},
      getActiveTransports: () => []
    };
  }

  createMCPServer(
    options: any,
    container: DependencyContainer
  ): any {
    // Get required services
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;
    
    return new MCPServer(
      options,
      loggingService
    );
  }
}

/**
 * Create a pre-configured service factory
 */
export function createServiceFactory(globalConfig?: any): IServiceFactory {
  return new ServiceFactory();
}
