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
    debug('Starting MCP server in multi-folder mode');
    
    // Load configuration from config file
    const { resolveConfig } = await import('./config/resolver.js');
    const config = resolveConfig(process.cwd(), {});
    
    // Validate that folders are configured
    if (!config.folders || !config.folders.list || config.folders.list.length === 0) {
      debug('Error: No folders configured');
      debug('Please configure folders in your configuration file (folder-mcp.yaml)');
      debug('Run: folder-mcp migrate --sample > folder-mcp.yaml');
      process.exit(1);
    }
    
    debug(`Found ${config.folders.list.length} configured folders`);
    
    debug('Setting up dependency injection...');
    
    const container = setupDependencyInjection({
      config,
      logLevel: 'info' as const
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

    // Get multi-folder services
    const folderManager = container.resolve(SERVICE_TOKENS.FOLDER_MANAGER);
    const multiFolderStorageProvider = container.resolve(SERVICE_TOKENS.MULTI_FOLDER_STORAGE_PROVIDER);
    debug('Multi-folder services initialized');

    const endpoints = new MCPEndpoints(
      process.cwd(), // Base directory for multi-folder mode
      vectorSearchService as any,
      fileParsingService as any,
      embeddingService as any,
      fileSystemService as any,
      fileSystem as any,
      logger as any,
      folderManager,
      multiFolderStorageProvider
    );

    // Register tool handlers with the official SDK
    debug('Registering tool handlers...');
    
    // Register list tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search',
            description: 'Semantic search across documents with optional folder filtering',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                mode: { type: 'string', enum: ['semantic', 'regex'], description: 'Search mode', default: 'semantic' },
                scope: { type: 'string', enum: ['documents', 'chunks'], description: 'Search scope', default: 'documents' },
                filters: {
                  type: 'object',
                  properties: {
                    folder: { type: 'string', description: 'Folder name to search in' },
                    fileType: { type: 'string', description: 'File type filter' }
                  }
                },
                limit: { type: 'number', description: 'Maximum results to return' },
                max_tokens: { type: 'number', description: 'Maximum tokens in response' }
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
          },
          {
            name: 'get_folder_info',
            description: 'Get comprehensive folder information with status, document counts, and settings',
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
          case 'get_folder_info':
            result = await endpoints.getFolderInfo();
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
    debug('Scheduling background multi-folder indexing...');
    setTimeout(async () => {
      try {
        const multiFolderIndexing = container.resolve(SERVICE_TOKENS.MULTI_FOLDER_INDEXING_WORKFLOW) as any;
        const indexingResult = await multiFolderIndexing.indexAllFolders({
          forceReindex: true,
          continueOnError: true
        });
        
        debug(`Multi-folder indexing completed: ${indexingResult.totalFoldersProcessed} folders, ${indexingResult.totalFilesProcessed} files`);
        if (indexingResult.errors.length > 0) {
          debug(`Multi-folder indexing had ${indexingResult.errors.length} errors (continuing anyway)`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debug('Auto-indexing failed (non-critical):', errorMessage);
      }
    }, 1000);

    // Defer file watching
    debug('Scheduling background multi-folder file watching...');
    setTimeout(async () => {
      try {
        const multiFolderMonitoring = container.resolve(SERVICE_TOKENS.MULTI_FOLDER_MONITORING_WORKFLOW) as any;
        const watchingResult = await multiFolderMonitoring.startMonitoringAllFolders({
          baseOptions: {
            includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
            excludePatterns: ['node_modules', '.git', '.folder-mcp'],
            debounceMs: 1000,
            enableBatchProcessing: true,
            batchSize: 10
          },
          continueOnError: true
        });
        
        if (watchingResult.success) {
          debug(`✅ Multi-folder monitoring started successfully - ${watchingResult.activeWatchers} active watchers`);
          debug(`📁 Monitoring ${watchingResult.folderResults.length} folders`);
        } else {
          debug(`❌ Multi-folder monitoring failed: ${watchingResult.systemErrors.join(', ')}`);
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
          const multiFolderMonitoring = container.resolve(SERVICE_TOKENS.MULTI_FOLDER_MONITORING_WORKFLOW) as any;
          await multiFolderMonitoring.stopMonitoringAllFolders();
          debug('Multi-folder monitoring stopped successfully');
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
