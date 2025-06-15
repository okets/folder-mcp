#!/usr/bin/env node

/**
 * MCP Server Entry Point
 * 
 * Simple entry script that creates and starts the MCP server with proper
 * dependency injection setup and transport layer integration.
 * 
 * IMPORTANT: For MCP protocol, we must ONLY write valid JSON-RPC messages to stdout.
 * All logs must go to stderr only. Claude Desktop expects only valid JSON on stdout.
 */

import { setupDependencyInjection } from './di/setup.js';
import { SERVICE_TOKENS } from './di/interfaces.js';
import type { MCPServer } from './interfaces/mcp/index.js';
import type { ITransportManager, TransportManagerConfig } from './transport/interfaces.js';
import type { IndexingWorkflow } from './application/indexing/index.js';
import type { MonitoringWorkflow } from './application/monitoring/index.js';

// CRITICAL: Claude Desktop expects ONLY valid JSON-RPC messages on stdout
// All logs MUST go to stderr ONLY

// Create debug logger that only writes to stderr
const debug = (message: string, ...args: any[]) => {
  // Write directly to stderr to avoid any stdout pollution
  process.stderr.write(`[DEBUG] ${message}\n`);
  if (args.length > 0) {
    process.stderr.write(`[DEBUG-ARGS] ${JSON.stringify(args)}\n`);
  }
};

// Redirect all console output to stderr to avoid polluting stdout
console.log = (...args) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
console.info = (...args) => process.stderr.write(`[INFO] ${args.join(' ')}\n`);
console.warn = (...args) => process.stderr.write(`[WARN] ${args.join(' ')}\n`);
console.error = (...args) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);

export async function main(): Promise<void> {
  debug('main() function called');
  try {
    debug('Starting MCP server');
    
    // Check if folder path is provided as argument
    const folderPath = process.argv[2];
    if (!folderPath) {
      debug('Error: Folder path is required');
      debug('Usage: node dist/mcp-server.js <folder-path>');
      process.exit(1);
    }
    
    debug(`Using folder path: ${folderPath}`);    debug('Setting up dependency injection...');
    // Setup dependency injection with real config to enable all services
    const { resolveConfig } = await import('./config/resolver.js');
    const config = resolveConfig(folderPath, {});
    
    const container = setupDependencyInjection({
      folderPath,
      config,
      logLevel: 'info'
    });

    debug('Initializing transport layer...');
    // Initialize transport layer
    try {
      const transportManager = container.resolve(SERVICE_TOKENS.TRANSPORT_MANAGER) as ITransportManager;
      
      // Create a basic transport manager configuration
      const transportConfig = {
        transports: [],
        selection: {
          strategy: 'prefer-local' as const,
          fallback: true,
          healthCheckInterval: 30000
        },
        authentication: {
          enabled: false,
          algorithms: ['HS256']
        }
      };
      
      await transportManager.initialize(transportConfig);
      debug('Transport layer initialized successfully');
    } catch (error) {
      debug('Transport layer initialization failed (non-critical):', error);
      // Transport layer is optional for basic MCP functionality
    }    debug('Resolving MCP server from container...');
    // Resolve MCP server from container (async since it's a singleton with async factory)
    const mcpServer = await container.resolveAsync(SERVICE_TOKENS.MCP_SERVER) as MCPServer;debug('Starting MCP server...');
    // Start the server
    await mcpServer.start();

    debug('MCP server started successfully');    debug('Triggering incremental indexing...');
    // Auto-index the folder incrementally (only process changed files)
    try {
      const indexingWorkflow = container.resolve(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
      debug('Starting folder indexing with incremental processing...');
        const indexingResult = await indexingWorkflow.indexFolder(folderPath, {
        includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
        excludePatterns: ['node_modules', '.git', '.folder-mcp'],
        embeddingModel: 'nomic-embed-text',
        forceReindex: true  // Force full reindex on startup to ensure content is indexed
      });
      
      debug(`Indexing completed: ${indexingResult.filesProcessed} files processed, ${indexingResult.chunksGenerated} chunks generated`);
      if (indexingResult.errors.length > 0) {
        debug(`Indexing had ${indexingResult.errors.length} errors (continuing anyway)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      debug('Auto-indexing failed (non-critical):', errorMessage);
      if (errorStack) {
        debug('Error stack:', errorStack);
      }      // Don't fail the server startup if indexing fails
    }    debug('Starting real-time file watching...');
    // Start file watching for real-time updates
    try {
      const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
      const watchingResult = await monitoringWorkflow.startFileWatching(folderPath, {
        includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
        excludePatterns: ['node_modules', '.git', '.folder-mcp'],
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      });
      
      if (watchingResult.success) {
        debug(`✅ File watching started successfully - Watch ID: ${watchingResult.watchId}`);
        debug(`📁 Monitoring folder: ${folderPath}`);
        debug(`⏱️ Debounce delay: 1000ms`);
      } else {
        debug(`❌ File watching failed to start: ${watchingResult.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      debug('File watching startup failed (non-critical):', errorMessage);
      if (errorStack) {
        debug('Error stack:', errorStack);
      }
      // Don't fail the server startup if file watching fails
    }    // Handle graceful shutdown
    const shutdown = async () => {
      debug('Shutting down MCP server...');
      try {        // Stop file watching first
        try {
          const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
          await monitoringWorkflow.stopFileWatching(folderPath);
          debug('File watching stopped successfully');
        } catch (error) {
          debug('File watching shutdown failed (non-critical):', error);
        }
        
        // Stop transport layer
        try {
          const transportManager = container.resolve(SERVICE_TOKENS.TRANSPORT_MANAGER) as ITransportManager;
          await transportManager.stop();
          debug('Transport layer shutdown complete');
        } catch (error) {
          debug('Transport layer shutdown failed (non-critical):', error);
        }
        
        // Stop MCP server
        await mcpServer.stop();
        process.exit(0);
      } catch (error) {
        debug('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (error) => {
      debug('Uncaught exception:', error);
      shutdown();
    });
    process.on('unhandledRejection', (reason) => {
      debug('Unhandled rejection:', reason);
      shutdown();
    });

    // Keep the process running
    debug('MCP server is running. Press Ctrl+C to stop.');

  } catch (error) {
    // Ensure error is properly logged with Error object
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Use consistent error logging patterns for test
    debug('Failed to start MCP server:', errorObj.message);
    process.stderr.write(`[ERROR] ${errorObj.stack || errorObj.message}\n`);
    console.error('Fatal error:', errorObj.message);
    
    process.exit(1);
  }
}

// Run if this file is executed directly
debug('Script loaded, checking if should run main()');
debug('import.meta.url:', import.meta.url);
debug('process.argv[1]:', process.argv[1]);

// Convert process.argv[1] to file URL format for comparison
const argv1 = process.argv[1];
if (argv1) {
  const scriptPath = argv1.replace(/\\/g, '/');
  const expectedUrl = `file:///${scriptPath}`;
  debug('expectedUrl:', expectedUrl);

  if (import.meta.url === expectedUrl) {
    debug('Running main()');
    main().catch((error) => {
      debug('Fatal error:', error);
      process.exit(1);
    });
  } else {
    debug('Not running main() - not the main module');
  }
} else {
  debug('process.argv[1] is undefined');
}
