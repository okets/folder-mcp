/**
 * Dependency injection setup and configuration
 * 
 * Configures the DI container with all required services
 * and their dependencies.
 */

import { DependencyContainer, getContainer } from './container.js';
import { ServiceFactory } from './factory.js';
import { SERVICE_TOKENS } from './interfaces.js';
import { ResolvedConfig } from '../config/resolver.js';
import { IndexingService } from '../processing/indexingService.js';
import { MCPServer } from '../mcp/mcpServer.js';
import { join } from 'path';

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

  // Register configuration service as singleton
  container.registerSingleton(SERVICE_TOKENS.CONFIGURATION, () => {
    return serviceFactory.createConfigurationService();
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

  // Register embedding service if config is provided
  if (options.config) {
    container.registerSingleton(SERVICE_TOKENS.EMBEDDING, () => {
      return serviceFactory.createEmbeddingService(options.config!);
    });
  }

  // Register cache service if folder path is provided
  if (options.folderPath) {
    container.registerSingleton(SERVICE_TOKENS.CACHE, () => {
      return serviceFactory.createCacheService(options.folderPath!);
    });
  }

  // Register file system service as singleton
  container.registerSingleton(SERVICE_TOKENS.FILE_SYSTEM, () => {
    return serviceFactory.createFileSystemService();
  });

  // Register vector search and error recovery if folder path is provided
  if (options.folderPath) {
    const cacheDir = `${options.folderPath}/.folder-mcp`;
    
    container.registerSingleton(SERVICE_TOKENS.VECTOR_SEARCH, () => {
      return serviceFactory.createVectorSearchService(cacheDir);
    });

    container.registerSingleton(SERVICE_TOKENS.ERROR_RECOVERY, () => {
      return serviceFactory.createErrorRecoveryService(cacheDir);
    });
  }

  // Register vector search service if folder path is provided
  if (options.folderPath) {
    container.registerSingleton(SERVICE_TOKENS.VECTOR_SEARCH, () => {
      const cacheDir = join(options.folderPath!, '.folder-mcp');
      return serviceFactory.createVectorSearchService(cacheDir);
    });
  }

  // Register high-level services
  if (options.config && options.folderPath) {
    // Register indexing service
    container.registerSingleton(SERVICE_TOKENS.INDEXING_SERVICE, () => {
      return serviceFactory.createIndexingService(
        options.config!,
        options.folderPath!,
        container
      );
    });

    // Register MCP server
    container.registerFactory(SERVICE_TOKENS.MCP_SERVER, () => {
      return serviceFactory.createMCPServer(
        options.config!,
        options.folderPath!,
        container
      );
    });
  }

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
