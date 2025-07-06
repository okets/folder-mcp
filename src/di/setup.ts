/**
 * Dependency injection setup and configuration
 * 
 * Configures the DI container with all required services
 * and their dependencies.
 */

import { DependencyContainer, getContainer } from './container.js';
import { ServiceFactory } from './factory.js';
import { SERVICE_TOKENS, MODULE_TOKENS, ILoggingService } from './interfaces.js';
import { ResolvedConfig, resolveConfig } from '../config/resolver.js';
import { IndexingOrchestrator } from '../application/indexing/index.js';
import { join } from 'path';
import { CONFIG_TOKENS } from '../config/interfaces.js';
import { registerConfigurationServices, createConfigurationServiceAdapter } from '../config/di-setup.js';

// Import domain infrastructure providers
import { 
  NodeFileSystemProvider, 
  NodeCryptographyProvider, 
  NodePathProvider 
} from '../infrastructure/providers/node-providers.js';

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
    const { FolderPathResolver } = require('../domain/folders/folder-manager.js');
    return new FolderPathResolver();
  });

  container.registerSingleton(SERVICE_TOKENS.FOLDER_CONFIG_MERGER, () => {
    const { FolderConfigMerger } = require('../domain/folders/folder-manager.js');
    const pathResolver = container.resolve(SERVICE_TOKENS.FOLDER_PATH_RESOLVER);
    return new FolderConfigMerger(pathResolver);
  });

  container.registerSingleton(SERVICE_TOKENS.FOLDER_VALIDATOR, () => {
    const { FolderValidator } = require('../domain/folders/folder-manager.js');
    const fileSystem = container.resolve(SERVICE_TOKENS.DOMAIN_FILE_SYSTEM_PROVIDER);
    const pathResolver = container.resolve(SERVICE_TOKENS.FOLDER_PATH_RESOLVER);
    const configManager = container.resolve(CONFIG_TOKENS.CONFIGURATION_MANAGER);
    return new FolderValidator(fileSystem, pathResolver, configManager);
  });

  container.registerSingleton(SERVICE_TOKENS.FOLDER_MANAGER, () => {
    const { FolderManager } = require('../domain/folders/folder-manager.js');
    const configManager = container.resolve(CONFIG_TOKENS.CONFIGURATION_MANAGER);
    const validator = container.resolve(SERVICE_TOKENS.FOLDER_VALIDATOR);
    const pathResolver = container.resolve(SERVICE_TOKENS.FOLDER_PATH_RESOLVER);
    const configMerger = container.resolve(SERVICE_TOKENS.FOLDER_CONFIG_MERGER);
    const fileSystem = container.resolve(SERVICE_TOKENS.DOMAIN_FILE_SYSTEM_PROVIDER);
    return new FolderManager(configManager, validator, pathResolver, configMerger, fileSystem);
  });

  // Register storage factory
  container.registerSingleton(SERVICE_TOKENS.STORAGE_FACTORY, () => {
    const { StorageFactory } = require('../infrastructure/storage/multi-folder-storage.js');
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING);
    const createVectorSearchService = (cacheDir: string) => {
      return serviceFactory.createVectorSearchService(cacheDir);
    };
    return new StorageFactory(createVectorSearchService, loggingService);
  });

  // Register multi-folder storage provider
  container.registerSingleton(SERVICE_TOKENS.MULTI_FOLDER_STORAGE_PROVIDER, () => {
    const { MultiFolderStorageProvider } = require('../infrastructure/storage/multi-folder-storage.js');
    const folderManager = container.resolve(SERVICE_TOKENS.FOLDER_MANAGER);
    const storageFactory = container.resolve(SERVICE_TOKENS.STORAGE_FACTORY);
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING);
    return new MultiFolderStorageProvider(folderManager, storageFactory, loggingService);
  });

  // Register multi-folder indexing workflow
  container.registerSingleton(SERVICE_TOKENS.MULTI_FOLDER_INDEXING_WORKFLOW, () => {
    const { MultiFolderIndexingWorkflow } = require('../application/indexing/multi-folder-indexing.js');
    const folderManager = container.resolve(SERVICE_TOKENS.FOLDER_MANAGER);
    const storageProvider = container.resolve(SERVICE_TOKENS.MULTI_FOLDER_STORAGE_PROVIDER);
    const singleFolderIndexing = container.resolve(SERVICE_TOKENS.INDEXING_WORKFLOW);
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING);
    return new MultiFolderIndexingWorkflow(folderManager, storageProvider, singleFolderIndexing, loggingService);
  });

  // Register multi-folder monitoring workflow
  container.registerSingleton(SERVICE_TOKENS.MULTI_FOLDER_MONITORING_WORKFLOW, () => {
    const { MultiFolderMonitoringWorkflow } = require('../application/monitoring/multi-folder-monitoring.js');
    const folderManager = container.resolve(SERVICE_TOKENS.FOLDER_MANAGER);
    const singleFolderMonitoring = container.resolve(SERVICE_TOKENS.MONITORING_WORKFLOW);
    const loggingService = container.resolve(SERVICE_TOKENS.LOGGING);
    return new MultiFolderMonitoringWorkflow(folderManager, singleFolderMonitoring, loggingService);
  });

  // Register all configuration services
  registerConfigurationServices(container);
  
  // Register configuration service adapter for backward compatibility
  container.registerSingleton(SERVICE_TOKENS.CONFIGURATION, () => {
    const configManager = container.resolve(CONFIG_TOKENS.CONFIGURATION_MANAGER);
    return createConfigurationServiceAdapter(configManager);
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
  container.registerSingleton(MODULE_TOKENS.APPLICATION.INDEXING_WORKFLOW, () => {
    return serviceFactory.createIndexingOrchestrator(container);
  });

  // Also register with old SERVICE_TOKENS for backward compatibility
  container.registerSingleton(SERVICE_TOKENS.INDEXING_WORKFLOW, () => {
    return serviceFactory.createIndexingOrchestrator(container);
  });

  // Register incremental indexer
  container.registerSingleton(MODULE_TOKENS.APPLICATION.INCREMENTAL_INDEXING, () => {
    return serviceFactory.createIncrementalIndexer(container);
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

  return container;
}

/**
 * Quick setup for common scenarios
 */
export async function setupForIndexing(folderPath: string, cliArgs: any = {}): Promise<DependencyContainer> {
  // Resolve configuration first
  const { resolveConfig } = await import('../config/resolver.js');
  const config = resolveConfig(folderPath, cliArgs);

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
