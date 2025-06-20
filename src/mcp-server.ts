#!/usr/bin/env node

/**
 * MCP Server Entry Point
 * 
 * Uses the official MCP SDK to create a proper JSON-RPC server that bridges
 * to our custom endpoint implementations.
 * 
 * IMPORTANT: For MCP protocol, we must ONLY write valid JSON-RPC messages to stdout.
 * All logs must go to stderr only. Claude Desktop expects only valid JSON on stdout.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { setupDependencyInjection } from './di/setup.js';
import { SERVICE_TOKENS } from './di/interfaces.js';
import type { IndexingWorkflow } from './application/indexing/index.js';
import type { MonitoringWorkflow } from './application/monitoring/index.js';
import { MCPEndpoints, type IMCPEndpoints } from './interfaces/mcp/endpoints.js';
import { initializeDevMode, type DevModeManager } from './config/dev-mode.js';

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
  let devModeManager: DevModeManager | null = null;
  
  try {
    debug('Starting MCP server');
    
    // Check if folder path is provided as argument
    const folderPath = process.argv[2];
    if (!folderPath) {
      debug('Error: Folder path is required');
      debug('Usage: node dist/mcp-server.js <folder-path>');
      process.exit(1);
    }
    
    debug(`Using folder path: ${folderPath}`);
    debug('Setting up dependency injection...');
    
    // Setup dependency injection with real config to enable all services
    const { resolveConfig } = await import('./config/resolver.js');
    const config = resolveConfig(folderPath, {});
    
    const container = setupDependencyInjection({
      folderPath,
      config,
      logLevel: 'info'
    });

    // Create the official MCP SDK server
    debug('Creating official MCP SDK server...');
    const server = new Server(
      {
        name: 'folder-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Create our custom endpoints handler
    debug('Setting up custom endpoints...');
    const vectorSearchService = await container.resolveAsync(SERVICE_TOKENS.VECTOR_SEARCH);
    const fileParsingService = await container.resolveAsync(SERVICE_TOKENS.FILE_PARSING);
    const embeddingService = await container.resolveAsync(SERVICE_TOKENS.EMBEDDING);
    const fileSystemService = await container.resolveAsync(SERVICE_TOKENS.FILE_SYSTEM);
    const fileSystem = container.resolve(SERVICE_TOKENS.FILE_SYSTEM);
    const logger = container.resolve(SERVICE_TOKENS.LOGGING);

    const endpoints = new MCPEndpoints(
      folderPath,
      vectorSearchService as any,
      fileParsingService as any,
      embeddingService as any,
      fileSystemService as any,
      fileSystem as any,
      logger as any
    );

    // Register tool handlers with the official SDK
    debug('Registering tool handlers...');
    
    // Register list tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search',
            description: 'Semantic search across documents',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                limit: { type: 'number', description: 'Maximum results to return' }
              },
              required: ['query']
            }
          },
          {
            name: 'get_document_outline',
            description: 'Get the structure/outline of a document',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to the document' }
              },
              required: ['filePath']
            }
          },
          {
            name: 'get_document_data', 
            description: 'Get document content and metadata',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to the document' },
                format: { type: 'string', enum: ['raw', 'chunks', 'metadata'], description: 'Output format', default: 'raw' }
              },
              required: ['filePath']
            }
          },
          {
            name: 'list_folders',
            description: 'List all folders in the knowledge base',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'list_documents',
            description: 'List documents in a specific folder',
            inputSchema: {
              type: 'object', 
              properties: {
                folderPath: { type: 'string', description: 'Path to the folder' }
              }
            }
          },
          {
            name: 'get_sheet_data',
            description: 'Extract data from spreadsheet files',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to the spreadsheet' },
                sheetName: { type: 'string', description: 'Name of the sheet' }
              },
              required: ['filePath']
            }
          },
          {
            name: 'get_slides',
            description: 'Extract slides from presentation files',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to the presentation' },
                slideNumbers: { type: 'array', items: { type: 'number' }, description: 'Specific slide numbers' }
              },
              required: ['filePath']
            }
          },
          {
            name: 'get_pages',
            description: 'Extract specific pages from documents',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: { type: 'string', description: 'Path to the document' },
                pageNumbers: { type: 'array', items: { type: 'number' }, description: 'Specific page numbers' }
              },
              required: ['filePath']
            }
          },
          {
            name: 'get_status',
            description: 'Get system status and health information',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Register call tool handler that bridges to our endpoints
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        let result;
        
        switch (name) {
          case 'search':
            result = await endpoints.search(args as any);
            break;
          case 'get_document_outline':
            result = await endpoints.getDocumentOutline(args as any);
            break;
          case 'get_document_data':
            result = await endpoints.getDocumentData(args as any);
            break;
          case 'list_folders':
            result = await endpoints.listFolders();
            break;
          case 'list_documents':
            result = await endpoints.listDocuments(args as any);
            break;
          case 'get_sheet_data':
            result = await endpoints.getSheetData(args as any);
            break;
          case 'get_slides':
            result = await endpoints.getSlides(args as any);
            break;
          case 'get_pages':
            result = await endpoints.getPages(args as any);
            break;
          case 'get_status':
            result = await endpoints.getStatus(args as any);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debug(`Error in tool ${name}:`, errorMessage);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    });

    // Connect to stdio transport
    debug('Connecting to stdio transport...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    debug('MCP server connected successfully');

    // Initialize development mode (after server is connected)
    debug('Initializing development mode...');
    try {
      const enableEnhancedFeatures = process.env.ENABLE_ENHANCED_MCP_FEATURES === 'true';
      if (enableEnhancedFeatures) {
        const { DEFAULT_ENHANCED_MCP_CONFIG } = await import('./config/enhanced-mcp.js');
        const restartCallback = () => {
          debug('🔥 Hot reload requested - restarting server...');
          debug('Server restart would happen here (not implemented yet)');
        };
        
        devModeManager = await initializeDevMode(DEFAULT_ENHANCED_MCP_CONFIG, logger as any, restartCallback);
        if (devModeManager) {
          debug('✅ Development mode initialized with hot reload');
        }
      } else {
        debug('Enhanced MCP features not enabled - skipping development mode');
      }
    } catch (error) {
      debug('Development mode initialization failed (non-critical):', error);
    }

    // Defer indexing to avoid initialization timeout (MCP server is already responding)
    debug('Scheduling background indexing...');
    setTimeout(async () => {
      try {
        const indexingWorkflow = container.resolve(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
        debug('Starting folder indexing with incremental processing...');
        const indexingResult = await indexingWorkflow.indexFolder(folderPath, {
          includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
          excludePatterns: ['node_modules', '.git', '.folder-mcp'],
          embeddingModel: 'nomic-embed-text',
          forceReindex: true
        });
        
        debug(`Indexing completed: ${indexingResult.filesProcessed} files processed, ${indexingResult.chunksGenerated} chunks generated`);
        if (indexingResult.errors.length > 0) {
          debug(`Indexing had ${indexingResult.errors.length} errors (continuing anyway)`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debug('Auto-indexing failed (non-critical):', errorMessage);
      }
    }, 1000);

    // Defer file watching
    debug('Scheduling background file watching...');
    setTimeout(async () => {
      try {
        const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
        debug('Starting real-time file watching...');
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
        debug('File watching startup failed (non-critical):', error);
      }
    }, 500);

    // Handle graceful shutdown
    const shutdown = async () => {
      debug('Shutting down MCP server...');
      try {
        if (devModeManager) {
          await devModeManager.stopWatching();
          debug('Development mode file watcher stopped');
        }
        
        try {
          const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
          await monitoringWorkflow.stopFileWatching(folderPath);
          debug('File watching stopped successfully');
        } catch (error) {
          debug('File watching shutdown failed (non-critical):', error);
        }
        
        // Close server transport
        await server.close();
        debug('MCP server closed');
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

    debug('MCP server is running. Press Ctrl+C to stop.');

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    debug('Failed to start MCP server:', errorObj.message);
    process.stderr.write(`[ERROR] ${errorObj.stack || errorObj.message}\n`);
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
  const expectedUrl = `file://${scriptPath}`;
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
