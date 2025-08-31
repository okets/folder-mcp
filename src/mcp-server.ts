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
import path from 'path';

import { setupDependencyInjection } from './di/setup.js';
import { SERVICE_TOKENS } from './di/interfaces.js';
import type { IndexingWorkflow } from './application/indexing/index.js';
import type { MonitoringWorkflow } from './application/monitoring/index.js';
import { MCPEndpoints, type IMCPEndpoints } from './interfaces/mcp/endpoints.js';
import { initializeDevMode, type DevModeManager } from './config/dev-mode.js';
import { CliArgumentParser, type CliArguments } from './application/config/CliArgumentParser.js';
import { getSupportedExtensions } from './domain/files/supported-extensions.js';
import { DaemonRESTClient } from './interfaces/mcp/daemon-rest-client.js';
import { DaemonMCPEndpoints } from './interfaces/mcp/daemon-mcp-endpoints.js';

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
  let daemonClient: DaemonRESTClient | null = null;
  
  try {
    debug('Starting MCP server');
    
    // Parse command line arguments
    const parseResult = CliArgumentParser.parse(process.argv);
    
    if (parseResult.showHelp) {
      debug(CliArgumentParser.getHelpText());
      process.exit(0);
    }
    
    if (parseResult.errors.length > 0) {
      parseResult.errors.forEach(error => debug(`Error: ${error}`));
      debug('\n' + CliArgumentParser.getHelpText());
      process.exit(1);
    }
    
    const validationErrors = CliArgumentParser.validate(parseResult.args);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => debug(`Error: ${error}`));
      debug('\n' + CliArgumentParser.getHelpText());
      process.exit(1);
    }
    
    const { folderPath, theme } = parseResult.args;
    
    // Phase 9: Determine mode based on folderPath presence
    const isDaemonMode = !folderPath;
    
    if (isDaemonMode) {
      debug('No folder path provided - connecting to daemon REST API for multi-folder support');
      
      // Connect to daemon REST API
      daemonClient = new DaemonRESTClient();
      try {
        await daemonClient.connect();
        debug('Successfully connected to daemon REST API');
        
        // Get server info to verify connection
        const serverInfo = await daemonClient.getServerInfo();
        debug(`Daemon info: v${serverInfo.version}, ${serverInfo.daemon.folderCount} folders configured`);
        debug(`  - Active folders: ${serverInfo.daemon.activeFolders}`);
        debug(`  - Indexing folders: ${serverInfo.daemon.indexingFolders}`);
        debug(`  - Total documents: ${serverInfo.daemon.totalDocuments}`);
        
        // Sprint 2: Connection established, ready for endpoint migration
        debug('Daemon REST connection verified - MCP server ready for multi-folder operations');
        
        // Sprint 3: Create daemon MCP endpoints
        const daemonEndpoints = new DaemonMCPEndpoints(daemonClient);
        
        // Create MCP server with daemon-backed tools
        const server = new Server(
          {
            name: 'folder-mcp',
            version: '2.0.0',
          },
          {
            capabilities: {
              tools: {},
            },
          }
        );
        
        // Register MCP tools that forward to daemon
        server.setRequestHandler(ListToolsRequestSchema, async () => {
          return {
            tools: [
              {
                name: 'get_server_info',
                description: 'Get information about the folder-mcp server and daemon status',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: []
                }
              },
              {
                name: 'list_folders',
                description: 'List all configured folders in the multi-folder system',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: []
                }
              },
              {
                name: 'list_documents',
                description: 'List documents in a specific folder',
                inputSchema: {
                  type: 'object',
                  properties: {
                    folder_id: {
                      type: 'string',
                      description: 'Folder ID to list documents from'
                    },
                    limit: {
                      type: 'number',
                      description: 'Maximum number of documents to return (default: 20)',
                      minimum: 1,
                      maximum: 100
                    }
                  },
                  required: ['folder_id']
                }
              },
              {
                name: 'search',
                description: 'Search for documents within a specific folder using semantic search',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Search query'
                    },
                    folder_id: {
                      type: 'string',
                      description: 'Folder ID to search within (required for folder-specific search)'
                    },
                    threshold: {
                      type: 'number',
                      description: 'Minimum relevance threshold (0.0-1.0). Lower values return more results; higher values return only very relevant results.',
                      minimum: 0.0,
                      maximum: 1.0,
                      default: 0.3
                    },
                    limit: {
                      type: 'number',
                      description: 'Maximum number of results to return.',
                      minimum: 1,
                      maximum: 100,
                      default: 10
                    }
                  },
                  required: ['query', 'folder_id']  // Sprint 7: folder_id is now required
                }
              },
              {
                name: 'get_document_data',
                description: 'Get document content and metadata from a specific folder',
                inputSchema: {
                  type: 'object',
                  properties: {
                    folder_id: {
                      type: 'string',
                      description: 'Folder ID containing the document'
                    },
                    document_id: {
                      type: 'string',
                      description: 'Document ID (filename or generated ID)'
                    }
                  },
                  required: ['folder_id', 'document_id']
                }
              },
              {
                name: 'get_document_outline',
                description: 'Get document structure and outline from a specific folder',
                inputSchema: {
                  type: 'object',
                  properties: {
                    folder_id: {
                      type: 'string',
                      description: 'Folder ID containing the document'
                    },
                    document_id: {
                      type: 'string',
                      description: 'Document ID (filename or generated ID)'
                    }
                  },
                  required: ['folder_id', 'document_id']
                }
              }
            ]
          };
        });
        
        // Handle tool calls by forwarding to daemon endpoints
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
          const { name, arguments: args } = request.params;
          
          try {
            switch (name) {
              case 'get_server_info': {
                const result = await daemonEndpoints.getServerInfo();
                return result as any;
              }
              
              case 'list_folders': {
                const result = await daemonEndpoints.listFolders();
                return result as any;
              }
              
              case 'list_documents': {
                const folderId = args?.folder_id as string;
                const limit = args?.limit as number | undefined;
                const result = await daemonEndpoints.listDocuments(folderId, limit);
                return result as any;
              }
              
              case 'search': {
                const query = args?.query as string || '';
                const folderId = args?.folder_id as string | undefined;
                const threshold = args?.threshold as number | undefined;
                const limit = args?.limit as number | undefined;
                const options: { threshold?: number; limit?: number } = {};
                if (threshold !== undefined) options.threshold = threshold;
                if (limit !== undefined) options.limit = limit;
                const result = await daemonEndpoints.search(query, folderId, options);
                return result as any;
              }
              
              case 'get_document_data': {
                const folderId = args?.folder_id as string;
                const documentId = args?.document_id as string;
                const result = await daemonEndpoints.getDocument(folderId, documentId);
                return result as any;
              }
              
              case 'get_document_outline': {
                const folderId = args?.folder_id as string;
                const documentId = args?.document_id as string;
                const result = await daemonEndpoints.getDocumentOutline(folderId, documentId);
                return result as any;
              }
              
              default:
                return {
                  content: [{
                    type: 'text' as const,
                    text: `Unknown tool: ${name}`
                  }]
                } as any;
            }
          } catch (error) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error calling tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
              }]
            } as any;
          }
        });
        
        // Start the stdio transport
        const transport = new StdioServerTransport();
        await server.connect(transport);
        debug('MCP server started in daemon mode with tools registered');
        
        // Keep the process running with proper shutdown handling
        await new Promise<void>((resolve) => {
          // Set up signal handlers for graceful shutdown
          const shutdown = async (signal: string) => {
            debug(`Received ${signal}, shutting down gracefully...`);
            
            // Clean up daemon client
            if (daemonClient) {
              daemonClient.close();
            }
            
            // Close the MCP server connection if method exists
            if (server && typeof (server as any).close === 'function') {
              try {
                await (server as any).close();
              } catch (error) {
                debug(`Error closing server: ${error}`);
              }
            }
            
            resolve();
            process.exit(0);
          };
          
          // Handle termination signals
          process.once('SIGINT', () => shutdown('SIGINT'));
          process.once('SIGTERM', () => shutdown('SIGTERM'));
          
          // Also handle uncaught exceptions and rejections
          process.once('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
            shutdown('uncaughtException');
          });
          
          process.once('unhandledRejection', (reason, promise) => {
            console.error('Unhandled rejection at:', promise, 'reason:', reason);
            shutdown('unhandledRejection');
          });
        });
        return;
      } catch (error) {
        debug(`Failed to connect to daemon: ${error}`);
        debug('Please ensure the daemon is running with REST API on port 3002');
        debug('Start the daemon with: npm run daemon:restart');
        process.exit(1);
      }
    }
    
    // Phase 9: No single-folder mode support
    // MCP server now only works with daemon for multi-folder support
    debug('MCP server requires daemon mode. Please ensure daemon is running on port 3002.');
    process.exit(1);

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    debug('Failed to start MCP server:', errorObj.message);
    process.stderr.write(`[ERROR] ${errorObj.stack || errorObj.message}\n`);
    process.exit(1);
  }
}

// Only run main() if this file is executed directly
if (process.argv[1]) {
  if (process.argv[1].endsWith('mcp-server.js') || process.argv[1].endsWith('mcp-server.ts')) {
    // Start the server
    main().catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  } else {
    debug('Not running main() - not the main module');
  }
} else {
  debug('process.argv[1] is undefined');
}
