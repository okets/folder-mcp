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
  ITransportManager,
  SERVICE_TOKENS,
  MODULE_TOKENS
} from './interfaces.js';

// Import domain infrastructure provider interfaces
import { 
  FileSystemProvider, 
  CryptographyProvider, 
  PathProvider 
} from '../domain/index.js';

import {
  ConfigurationService,
  FileParsingService,
  ChunkingService,
  EmbeddingService,
  CacheService,
  FileSystemService,
  VectorSearchService,
  ErrorRecoveryService
} from './services.js';

// Import enhanced logging infrastructure
import { 
  LoggingService as EnhancedLoggingService,
  ConsoleLogFormatter,
  JsonLogFormatter,
  ConsoleLogTransport,
  FileLogTransport,
  RotatingFileTransport,
  createConsoleLogger,
  createFileLogger,
  createDualLogger
} from '../infrastructure/logging/index.js';

import { LoggingServiceBridge } from '../infrastructure/logging/bridge.js';

import { ResolvedConfig } from '../config/resolver.js';
import { DependencyContainer } from './container.js';
import { IndexingOrchestrator } from '../application/indexing/orchestrator.js';
import { IncrementalIndexer } from '../application/indexing/incremental.js';
import { MCPServer } from '../interfaces/mcp/server.js';

/**
 * Default service factory implementation
 */
export class ServiceFactory implements IServiceFactory {
  private loggingService: ILoggingService | null = null;  /**
   * Get or create logging service (needed by other services)
   */
  private getLoggingService(config?: any): ILoggingService {
    if (!this.loggingService) {
      // Use enhanced logging infrastructure with MCP protocol compliance
      const logLevel = config?.level || 'info';
      
      let infraLogger;
      if (config?.enableFileLogging) {
        // Create dual logger (console + file) for production
        const logDir = config?.logDir || './logs';
        const logFile = `${logDir}/folder-mcp.log`;
        infraLogger = createDualLogger(logFile, logLevel, 'debug');
      } else {
        // Create console-only logger for development
        infraLogger = createConsoleLogger(logLevel);
      }
      
      // Bridge to DI interface
      this.loggingService = new LoggingServiceBridge(infraLogger);
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
    // This method now requires a container to resolve domain providers
    throw new Error('createFileSystemService() requires a DependencyContainer. Use createFileSystemServiceWithContainer() instead.');
  }

  createFileSystemServiceWithContainer(container: DependencyContainer): IFileSystemService {
    const loggingService = this.getLoggingService();
    const fileSystemProvider = container.resolve(SERVICE_TOKENS.DOMAIN_FILE_SYSTEM_PROVIDER) as FileSystemProvider;
    const cryptographyProvider = container.resolve(SERVICE_TOKENS.DOMAIN_CRYPTOGRAPHY_PROVIDER) as CryptographyProvider;
    const pathProvider = container.resolve(SERVICE_TOKENS.DOMAIN_PATH_PROVIDER) as PathProvider;
    
    return new FileSystemService(
      loggingService,
      fileSystemProvider,
      cryptographyProvider,
      pathProvider
    );
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
  ): IndexingOrchestrator {    return this.createIndexingOrchestrator(container);
  }

  // =============================================================================
  // Application Layer Factory Methods
  // =============================================================================
    createIndexingOrchestrator(container: DependencyContainer): IndexingOrchestrator {
    return new IndexingOrchestrator(
      container.resolve(SERVICE_TOKENS.FILE_PARSING),
      container.resolve(SERVICE_TOKENS.CHUNKING),
      container.resolve(SERVICE_TOKENS.EMBEDDING),
      container.resolve(SERVICE_TOKENS.VECTOR_SEARCH),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.LOGGING),
      container.resolve(SERVICE_TOKENS.CONFIGURATION),
      container.resolve(SERVICE_TOKENS.FILE_SYSTEM)
    );
  }
  createIncrementalIndexer(container: DependencyContainer): IncrementalIndexer {
    const indexingOrchestrator = this.createIndexingOrchestrator(container);
    
    return new IncrementalIndexer(
      container.resolve(SERVICE_TOKENS.FILE_SYSTEM),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.LOGGING),
      indexingOrchestrator
    );
  }  async createContentServingOrchestrator(container: DependencyContainer): Promise<any> {
    // Create the actual ContentServingOrchestrator with proper dependencies
    try {
      const { ContentServingOrchestrator } = await import('../application/serving/orchestrator.js');
      
      const fileParsingService = container.resolve(SERVICE_TOKENS.FILE_PARSING) as IFileParsingService;
      const cacheService = container.resolve(SERVICE_TOKENS.CACHE) as ICacheService;
      const vectorSearchService = container.resolve(SERVICE_TOKENS.VECTOR_SEARCH) as IVectorSearchService;
      const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;
      const configService = container.resolve(SERVICE_TOKENS.CONFIGURATION) as IConfigurationService;
      const embeddingService = container.resolve(SERVICE_TOKENS.EMBEDDING) as IEmbeddingService;
      
      return new ContentServingOrchestrator(
        fileParsingService,
        cacheService,
        vectorSearchService,
        loggingService,
        configService,
        embeddingService
      );    } catch (error) {
      // Get logging service to log the error properly
      try {
        const loggingService = this.getLoggingService();
        loggingService.error('Failed to create ContentServingOrchestrator', error instanceof Error ? error : new Error(String(error)));
      } catch (logError) {
        // If logging fails, write directly to stderr as fallback
        process.stderr.write(`[ERROR] Failed to create ContentServingOrchestrator: ${error}\n`);
      }
      throw error;
    }
  }  async createKnowledgeOperationsService(container: DependencyContainer): Promise<any> {
    try {
      const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;
      loggingService.debug('Creating KnowledgeOperationsService...');
      const { KnowledgeOperationsService } = await import('../application/serving/knowledge.js');
      loggingService.debug('Imported KnowledgeOperationsService');
      
      loggingService.debug('Resolving dependencies...');
      const vectorSearch = container.resolve(SERVICE_TOKENS.VECTOR_SEARCH);
      const cache = container.resolve(SERVICE_TOKENS.CACHE);
      const logging = container.resolve(SERVICE_TOKENS.LOGGING);
      const fileParsing = container.resolve(SERVICE_TOKENS.FILE_PARSING);
      const embedding = container.resolve(SERVICE_TOKENS.EMBEDDING);
      loggingService.debug('Resolved all dependencies for KnowledgeOperationsService');
        const service = new KnowledgeOperationsService(
        vectorSearch as any,
        cache as any,
        logging as any,
        fileParsing as any,
        embedding as any
      );
      loggingService.debug('Created KnowledgeOperationsService successfully', {
        serviceType: typeof service,
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(service))
      });
      return service;
    } catch (error) {
      const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;
      loggingService.error('Failed to create KnowledgeOperationsService', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  async createMonitoringOrchestrator(container: DependencyContainer): Promise<any> {
    const { MonitoringOrchestrator } = await import('../application/monitoring/orchestrator.js');
    return new MonitoringOrchestrator(
      container.resolve(SERVICE_TOKENS.FILE_PARSING),
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.LOGGING),
      container.resolve(SERVICE_TOKENS.CONFIGURATION),
      container.resolve(MODULE_TOKENS.APPLICATION.INCREMENTAL_INDEXING)
    );
  }
  async createHealthMonitoringService(container: DependencyContainer): Promise<any> {
    const { HealthMonitoringService } = await import('../application/monitoring/health.js');
    return new HealthMonitoringService(
      container.resolve(SERVICE_TOKENS.CACHE),
      container.resolve(SERVICE_TOKENS.VECTOR_SEARCH),
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
  }  async createMCPServer(
    options: any,
    container: DependencyContainer
  ): Promise<any> {
    // Get required services
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;
    
    // Try to get application layer services (may not be available in all configurations)
    let knowledgeOperations = null;
    let contentServingWorkflow = null;
    let monitoringWorkflow = null;
    
    try {
      knowledgeOperations = await container.resolve(MODULE_TOKENS.APPLICATION.KNOWLEDGE_OPERATIONS);
    } catch (e) {
      // Service not available, will use mock
    }
    
    try {
      contentServingWorkflow = await container.resolve(MODULE_TOKENS.APPLICATION.CONTENT_SERVING_WORKFLOW);
    } catch (e) {
      // Service not available, will use mock
    }
    
    try {
      monitoringWorkflow = await container.resolve(MODULE_TOKENS.APPLICATION.MONITORING_WORKFLOW);
    } catch (e) {
      // Service not available, will use mock
    }
    
    // Create service adapters if we have the real services
    let searchService = null;
    let navigationService = null;
    let documentService = null;
    let specializedService = null;
      if (knowledgeOperations && contentServingWorkflow && monitoringWorkflow) {
      const { 
        SearchServiceAdapter, 
        NavigationServiceAdapter, 
        DocumentServiceAdapter, 
        SpecializedServiceAdapter 
      } = await import('../interfaces/mcp/adapters.js');
      
      searchService = new SearchServiceAdapter(knowledgeOperations, loggingService);
      navigationService = new NavigationServiceAdapter(contentServingWorkflow, loggingService);
      documentService = new DocumentServiceAdapter(contentServingWorkflow, loggingService);
      specializedService = new SpecializedServiceAdapter(monitoringWorkflow, loggingService);
    }
    
    return new MCPServer(
      options,
      loggingService,
      searchService,
      navigationService,
      documentService,
      null, // summarization service not implemented yet
      specializedService
    );
  }
}

/**
 * Create a pre-configured service factory
 */
export function createServiceFactory(globalConfig?: any): IServiceFactory {
  return new ServiceFactory();
}
