/**
 * Dependency injection setup and configuration
 * 
 * Configures the DI container with all required services
 * and their dependencies.
 */

import { DependencyContainer, getContainer } from './container.js';
import { ServiceFactory } from './factory.js';
import { SERVICE_TOKENS, MODULE_TOKENS, ILoggingService } from './interfaces.js';
import { ResolvedConfig } from '../config/schema.js';
import { IndexingOrchestrator } from '../application/indexing/index.js';
import { join } from 'path';
import { homedir } from 'os';
import { integrateConfigurationServices, registerConfigurationServices, CONFIG_SERVICE_TOKENS } from '../config/di-setup.js';

// Import domain infrastructure providers
import { 
  NodeFileSystemProvider, 
  NodeCryptographyProvider, 
  NodePathProvider 
} from '../infrastructure/providers/node-providers.js';

// Import CLI services
import { JsonOutputService } from '../application/cli/JsonOutputService.js';

// Import folder domain services
import { 
  FolderPathResolver, 
  FolderConfigMerger, 
  FolderValidator, 
  FolderManager 
} from '../domain/folders/folder-manager.js';

// Import storage services
import { 
  StorageFactory, 
  MultiFolderStorageProvider 
} from '../infrastructure/storage/multi-folder-storage.js';

// Import workflow services
import { MultiFolderIndexingWorkflow } from '../application/indexing/multi-folder-indexing.js';
import { MultiFolderMonitoringWorkflow } from '../application/monitoring/multi-folder-monitoring.js';

// Import daemon services
import { DaemonConfigurationService } from '../daemon/services/configuration-service.js';
import { FMDMService } from '../daemon/services/fmdm-service.js';
import { DaemonFolderValidationService } from '../daemon/services/folder-validation-service.js';

// Import WebSocket services
import { FolderHandlers } from '../daemon/websocket/handlers/folder-handlers.js';
import { ModelHandlers } from '../daemon/websocket/handlers/model-handlers.js';
import { WebSocketProtocol } from '../daemon/websocket/protocol.js';
import { FMDMWebSocketServer } from '../daemon/websocket/server.js';

/**
 * Setup the dependency injection container with all services
 */
export function setupDependencyInjection(options: {
  config?: ResolvedConfig;
  folderPath?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
} = {}): DependencyContainer {
  const container = getContainer();

  // Clear any existing registrations
  container.clear();

  // Create service factory
  const serviceFactory = new ServiceFactory();

  // Register service factory
  container.register(SERVICE_TOKENS.SERVICE_FACTORY, serviceFactory);

  // Register logging service as singleton
  container.registerSingleton(SERVICE_TOKENS.LOGGING, () => {
    return serviceFactory.createLoggingService({ level: options.logLevel || 'info' });
  });

  // Register domain infrastructure providers as singletons
  container.registerSingleton(SERVICE_TOKENS.DOMAIN_FILE_SYSTEM_PROVIDER, () => {
    return new NodeFileSystemProvider();
  });

  container.registerSingleton(SERVICE_TOKENS.DOMAIN_CRYPTOGRAPHY_PROVIDER, () => {
    return new NodeCryptographyProvider();
  });

  container.registerSingleton(SERVICE_TOKENS.DOMAIN_PATH_PROVIDER, () => {
    return new NodePathProvider();
  });

  // Register folder domain services as singletons
  container.registerSingleton(SERVICE_TOKENS.FOLDER_PATH_RESOLVER, () => {
    return new FolderPathResolver();
  });

  container.registerSingleton(SERVICE_TOKENS.FOLDER_CONFIG_MERGER, () => {
    const pathResolver = container.resolve(SERVICE_TOKENS.FOLDER_PATH_RESOLVER) as any;
    return new FolderConfigMerger(pathResolver);
  });

  container.registerSingleton(SERVICE_TOKENS.FOLDER_VALIDATOR, () => {
    const fileSystem = container.resolve(SERVICE_TOKENS.DOMAIN_FILE_SYSTEM_PROVIDER) as any;
    const pathResolver = container.resolve(SERVICE_TOKENS.FOLDER_PATH_RESOLVER) as any;
    // Use ConfigurationComponent as the unified configuration interface
    const configurationComponent = container.resolve(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT) as any;
    return new FolderValidator(fileSystem, pathResolver, configurationComponent);
  });

  container.registerSingleton(SERVICE_TOKENS.FOLDER_MANAGER, () => {
    // Use ConfigurationComponent as the unified configuration interface
    const configurationComponent = container.resolve(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT) as any;
    const validator = container.resolve(SERVICE_TOKENS.FOLDER_VALIDATOR) as any;
    const pathResolver = container.resolve(SERVICE_TOKENS.FOLDER_PATH_RESOLVER) as any;
    const configMerger = container.resolve(SERVICE_TOKENS.FOLDER_CONFIG_MERGER) as any;
    const fileSystem = container.resolve(SERVICE_TOKENS.DOMAIN_FILE_SYSTEM_PROVIDER) as any;
    return new FolderManager(configurationComponent, validator, pathResolver, configMerger, fileSystem);
  });

  // Register storage factory
  container.registerSingleton(SERVICE_TOKENS.STORAGE_FACTORY, () => {
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    const createVectorSearchService = (cacheDir: string) => {
      return serviceFactory.createVectorSearchService(cacheDir);
    };
    return new StorageFactory(createVectorSearchService, loggingService);
  });

  // Register multi-folder storage provider
  container.registerSingleton(SERVICE_TOKENS.MULTI_FOLDER_STORAGE_PROVIDER, () => {
    const folderManager = container.resolve(SERVICE_TOKENS.FOLDER_MANAGER) as any;
    const storageFactory = container.resolve(SERVICE_TOKENS.STORAGE_FACTORY) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    return new MultiFolderStorageProvider(folderManager, storageFactory, loggingService);
  });

  // Register multi-folder indexing workflow (async because it depends on async IndexingWorkflow)
  container.registerSingleton(SERVICE_TOKENS.MULTI_FOLDER_INDEXING_WORKFLOW, async () => {
    const folderManager = container.resolve(SERVICE_TOKENS.FOLDER_MANAGER) as any;
    const storageProvider = container.resolve(SERVICE_TOKENS.MULTI_FOLDER_STORAGE_PROVIDER) as any;
    const singleFolderIndexing = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    return new MultiFolderIndexingWorkflow(folderManager, storageProvider, singleFolderIndexing, loggingService);
  });

  // Register multi-folder monitoring workflow
  container.registerSingleton(SERVICE_TOKENS.MULTI_FOLDER_MONITORING_WORKFLOW, () => {
    const folderManager = container.resolve(SERVICE_TOKENS.FOLDER_MANAGER) as any;
    const singleFolderMonitoring = container.resolve(SERVICE_TOKENS.MONITORING_WORKFLOW) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    return new MultiFolderMonitoringWorkflow(folderManager, singleFolderMonitoring, loggingService);
  });

  // Register configuration services
  container.registerSingleton(SERVICE_TOKENS.CONFIGURATION, async () => {
    const { ConfigurationService } = await import('./services.js');
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;
    return new ConfigurationService(loggingService);
  });

  // Register new configuration system with correct paths
  const configPath = join(homedir(), '.folder-mcp', 'config.yaml');
  registerConfigurationServices(container, {
    defaultsPath: 'config-defaults.yaml',
    userConfigPath: configPath
  });

  // Integrate configuration services with compatibility tokens
  integrateConfigurationServices(container);

  container.registerSingleton('CLIConfigurationOverrideService' as any, () => {
    // Stub service for CLI configuration overrides
    return {
      parseFlags: () => ({}),
      validateOverrides: () => ({ isValid: true, errors: [], warnings: [] }),
      applyOverrides: () => ({}),
      getSupportedOverrides: () => ([]),
      isSupported: () => true
    };
  });

  container.registerSingleton('CLIConfigurationCommandService' as any, () => {
    // Stub service for CLI configuration commands
    return {
      getConfiguration: () => ({}),
      setConfiguration: () => Promise.resolve(),
      validateConfiguration: () => ({ isValid: true, errors: [] }),
      showConfiguration: () => ({})
    };
  });
  
  // Register basic CLI services (without old config dependencies for now)
  // TODO: Update these services to use new configuration system

  container.registerSingleton(SERVICE_TOKENS.CLI_JSON_OUTPUT_SERVICE, () => {
    return new JsonOutputService();
  });

  // Register file parsing service as singleton
  container.registerSingleton(SERVICE_TOKENS.FILE_PARSING, () => {
    const basePath = options.folderPath || process.cwd();
    return serviceFactory.createFileParsingService(basePath);
  });

  // Register chunking service as singleton
  container.registerSingleton(SERVICE_TOKENS.CHUNKING, () => {
    return serviceFactory.createChunkingService();
  });

  // Register embedding service with config or default config
  container.registerSingleton(SERVICE_TOKENS.EMBEDDING, () => {
    const config = options.config || {
      folderPath: options.folderPath || process.cwd(),
      chunkSize: 500,
      overlap: 50,
      batchSize: 32,
      modelName: 'nomic-embed-text',
      fileExtensions: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
      ignorePatterns: ['node_modules', '.git', '.folder-mcp'],
      maxConcurrentOperations: 4,
      debounceDelay: 1000,
      sources: {
        chunkSize: 'global',
        overlap: 'global',
        batchSize: 'global',
        modelName: 'global',
        fileExtensions: 'global',
        ignorePatterns: 'global',
        maxConcurrentOperations: 'global',
        debounceDelay: 'global'
      }
    } as ResolvedConfig;
    return serviceFactory.createEmbeddingService(config);
  });

  // Register cache service with folderPath or default path
  container.registerSingleton(SERVICE_TOKENS.CACHE, () => {
    const basePath = options.folderPath || process.cwd();
    return serviceFactory.createCacheService(basePath);
  });

  // Register file system service as singleton
  container.registerSingleton(SERVICE_TOKENS.FILE_SYSTEM, () => {
    return serviceFactory.createFileSystemServiceWithContainer(container);
  });

  // Register transport services
  container.registerSingleton(SERVICE_TOKENS.TRANSPORT_FACTORY, () => {
    return serviceFactory.createTransportFactory();
  });

  container.registerSingleton(SERVICE_TOKENS.TRANSPORT_MANAGER, () => {
    return serviceFactory.createTransportManager(container);
  });

  // Register vector search and error recovery services
  const cacheDir = options.folderPath ? `${options.folderPath}/.folder-mcp` : `${process.cwd()}/.folder-mcp`;
  
  container.registerSingleton(SERVICE_TOKENS.VECTOR_SEARCH, () => {
    return serviceFactory.createVectorSearchService(cacheDir);
  });

  container.registerSingleton(SERVICE_TOKENS.ERROR_RECOVERY, () => {
    return serviceFactory.createErrorRecoveryService(cacheDir);
  });

  // Create or use existing config for application services
  let workingConfig = options.config;
  if (!workingConfig) {
    // Create a minimal valid ResolvedConfig for basic operation
    workingConfig = {
      folderPath: options.folderPath || process.cwd(),
      chunkSize: 500,
      overlap: 50,
      batchSize: 32,
      modelName: 'nomic-embed-text',
      fileExtensions: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
      ignorePatterns: ['node_modules', '.git', '.folder-mcp'],
      maxConcurrentOperations: 4,
      debounceDelay: 1000,
      sources: {
        chunkSize: 'global',
        overlap: 'global',
        batchSize: 'global',
        modelName: 'global',
        fileExtensions: 'global',
        ignorePatterns: 'global',
        maxConcurrentOperations: 'global',
        debounceDelay: 'global'
      }
    } as ResolvedConfig;
  }

  // Register indexing orchestrator
  container.registerSingleton(MODULE_TOKENS.APPLICATION.INDEXING_WORKFLOW, async () => {
    return await serviceFactory.createIndexingOrchestrator(container);
  });

  // Also register with old SERVICE_TOKENS for backward compatibility
  container.registerSingleton(SERVICE_TOKENS.INDEXING_WORKFLOW, async () => {
    return await serviceFactory.createIndexingOrchestrator(container);
  });

  // Register incremental indexer
  container.registerSingleton(MODULE_TOKENS.APPLICATION.INCREMENTAL_INDEXING, async () => {
    return await serviceFactory.createIncrementalIndexer(container);
  });

  // Register content serving orchestrator
  container.registerSingleton(MODULE_TOKENS.APPLICATION.CONTENT_SERVING_WORKFLOW, () => {
    return serviceFactory.createContentServingOrchestrator(container);
  });

  // Also register with old SERVICE_TOKENS for backward compatibility
  container.registerSingleton(SERVICE_TOKENS.CONTENT_SERVING_WORKFLOW, async () => {
    return await serviceFactory.createContentServingOrchestrator(container);
  });

  // Register knowledge operations service
  container.registerSingleton(MODULE_TOKENS.APPLICATION.KNOWLEDGE_OPERATIONS, async () => {
    return await serviceFactory.createKnowledgeOperationsService(container);
  });

  // Register monitoring orchestrator
  container.registerSingleton(MODULE_TOKENS.APPLICATION.MONITORING_WORKFLOW, async () => {
    // Use the service from services.ts
    const { MonitoringWorkflowService } = await import('./services.js');
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;
    return new MonitoringWorkflowService(loggingService);
  });

  // Also register with old SERVICE_TOKENS for backward compatibility
  container.registerSingleton(SERVICE_TOKENS.MONITORING_WORKFLOW, async () => {
    // Use the service from services.ts
    const { MonitoringWorkflowService } = await import('./services.js');
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;
    return new MonitoringWorkflowService(loggingService);
  });

  // Register health monitoring service
  container.registerSingleton(MODULE_TOKENS.APPLICATION.HEALTH_MONITORING, async () => {
    return await serviceFactory.createHealthMonitoringService(container);
  });

  // Register MCP server (only needs folderPath)
  if (options.folderPath) {
    container.registerSingleton(SERVICE_TOKENS.MCP_SERVER, async () => {
      return await serviceFactory.createMCPServer({
        folderPath: options.folderPath!,
        transport: 'stdio',
        name: 'folder-mcp',
        version: '1.0.0'
      }, container);
    });
  }

  // Register daemon services as null for now - CLI will handle daemon service creation separately
  container.registerSingleton(SERVICE_TOKENS.DAEMON_SERVICE, () => null);
  container.registerSingleton(SERVICE_TOKENS.PROCESS_MANAGER, () => null);
  container.registerSingleton(SERVICE_TOKENS.HEALTH_MONITOR, () => null);
  container.registerSingleton(SERVICE_TOKENS.PERFORMANCE_MONITOR, () => null);
  container.registerSingleton(SERVICE_TOKENS.SIGNAL_HANDLER, () => null);
  container.registerSingleton(SERVICE_TOKENS.PID_MANAGER, () => null);
  container.registerSingleton(SERVICE_TOKENS.SYSTEM_MONITOR, () => null);
  
  // Register Daemon Configuration Service
  container.registerSingleton(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE, () => {
    const configurationComponent = container.resolve(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    return new DaemonConfigurationService(configurationComponent, loggingService);
  });

  // Register FMDM Service
  container.registerSingleton(SERVICE_TOKENS.FMDM_SERVICE, () => {
    const daemonConfigService = container.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    return new FMDMService(daemonConfigService, loggingService);
  });

  // Register Daemon Folder Validation Service
  container.registerSingleton(SERVICE_TOKENS.DAEMON_FOLDER_VALIDATION_SERVICE, () => {
    const daemonConfigService = container.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    return new DaemonFolderValidationService(daemonConfigService, loggingService);
  });

  // Register Folder Handlers
  container.registerSingleton('FolderHandlers' as any, () => {
    const daemonConfigService = container.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE) as any;
    const fmdmService = container.resolve(SERVICE_TOKENS.FMDM_SERVICE) as any;
    const validationService = container.resolve(SERVICE_TOKENS.DAEMON_FOLDER_VALIDATION_SERVICE) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    
    const modelHandlers = new ModelHandlers(loggingService);
    return new FolderHandlers(daemonConfigService, fmdmService, validationService, modelHandlers, loggingService);
  });

  // Register WebSocket Protocol
  container.registerSingleton('WebSocketProtocol' as any, () => {
    const fmdmService = container.resolve(SERVICE_TOKENS.FMDM_SERVICE) as any;
    const daemonConfigService = container.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE) as any;
    const validationService = container.resolve(SERVICE_TOKENS.DAEMON_FOLDER_VALIDATION_SERVICE) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    
    return new WebSocketProtocol(validationService, daemonConfigService, fmdmService, loggingService);
  });

  // Register WebSocket server
  container.registerSingleton(SERVICE_TOKENS.WEBSOCKET_SERVER, () => {
    const fmdmService = container.resolve(SERVICE_TOKENS.FMDM_SERVICE) as any;
    const protocol = container.resolve('WebSocketProtocol' as any) as any;
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING) as any;
    
    const server = new FMDMWebSocketServer();
    server.setDependencies(fmdmService, protocol, loggingService);
    return server;
  });

  return container;
}

/**
 * Quick setup for common scenarios
 */
export async function setupForIndexing(folderPath: string, cliArgs: any = {}): Promise<DependencyContainer> {
  // Resolve configuration first
  const { resolveConfig } = await import('../config/resolver.js');
  const config = await resolveConfig(folderPath, cliArgs);

  // Setup DI with config
  return setupDependencyInjection({
    config,
    folderPath,
    logLevel: cliArgs.verbose ? 'debug' : cliArgs.quiet ? 'warn' : 'info'
  });
}

/**
 * Setup for MCP server
 */
export function setupForMCPServer(folderPath: string, config: ResolvedConfig): DependencyContainer {
  return setupDependencyInjection({
    config,
    folderPath,
    logLevel: 'info'
  });
}

/**
 * Setup for testing
 */
export function setupForTesting(): DependencyContainer {
  return setupDependencyInjection({
    logLevel: 'error' // Quiet during tests
  });
}

/**
 * Get a service from the global container with type safety
 */
export function getService<T>(token: symbol): T {
  const container = getContainer();
  return container.resolve<T>(token);
}

/**
 * Helper functions for common services
 */
export function getLoggingService() {
  return getService(SERVICE_TOKENS.LOGGING);
}

export function getConfigurationService() {
  return getService(SERVICE_TOKENS.CONFIGURATION);
}

export function getFileParsingService() {
  return getService(SERVICE_TOKENS.FILE_PARSING);
}

export function getChunkingService() {
  return getService(SERVICE_TOKENS.CHUNKING);
}

export function getEmbeddingService() {
  return getService(SERVICE_TOKENS.EMBEDDING);
}

export function getCacheService() {
  return getService(SERVICE_TOKENS.CACHE);
}

export function getFileSystemService() {
  return getService(SERVICE_TOKENS.FILE_SYSTEM);
}
