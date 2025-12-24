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

import { DaemonRESTClient } from './interfaces/mcp/daemon-rest-client.js';
import { DaemonMCPEndpoints } from './interfaces/mcp/daemon-mcp-endpoints.js';
import { CliArgumentParser } from './application/config/CliArgumentParser.js';
import { type DevModeManager } from './config/dev-mode.js';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

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

/**
 * Check if an error indicates the daemon is down
 * @param error The error to check
 * @returns true if the error suggests daemon is not running
 */
function isDaemonDownError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes('econnrefused') || 
         message.includes('connection refused') ||
         message.includes('connect econnrefused') ||
         message.includes('failed to connect to daemon') ||
         (error.name === 'FetchError' && message.includes('request to'));
}

/**
 * Attempt to auto-spawn the daemon process
 * @returns Promise<boolean> true if daemon was successfully started, false otherwise
 */
async function attemptDaemonAutoStart(): Promise<boolean> {
  debug('Attempting to auto-spawn daemon...');
  
  // Check if auto-spawn is disabled via environment variable
  if (process.env.FOLDER_MCP_AUTO_SPAWN_DAEMON === 'false') {
    debug('Auto-spawn disabled via FOLDER_MCP_AUTO_SPAWN_DAEMON=false');
    return false;
  }
  
  try {
    // Find the daemon executable
    const daemonPath = findDaemonExecutable();
    if (!daemonPath) {
      debug('Daemon executable not found');
      return false;
    }
    
    debug(`Starting daemon at: ${daemonPath}`);

    // Spawn daemon process
    // CRITICAL: On Windows, detached:true breaks windowsHide inheritance for child processes
    // Use detached:false on Windows to allow proper flag inheritance to Python subprocesses
    const daemonProcess = spawn('node', [daemonPath, '--auto-start'], {
      detached: process.platform !== 'win32', // Only detach on Unix (Windows needs attached for windowsHide)
      stdio: ['ignore', 'ignore', 'ignore'],   // Detach stdio completely
      windowsHide: true,                       // Prevent terminal window on Windows
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production'
      }
    });

    // Unref so parent can exit without waiting for daemon
    daemonProcess.unref();

    debug(`Daemon process spawned with PID: ${daemonProcess.pid}`);

    // Wait for daemon to be ready
    const isReady = await waitForDaemonReady(10000); // 10 second timeout
    
    if (isReady) {
      debug('Daemon successfully started and is ready');
      return true;
    } else {
      debug('Daemon startup timeout - daemon may still be initializing');
      return false;
    }
    
  } catch (error) {
    debug(`Failed to auto-start daemon: ${error}`);
    return false;
  }
}

/**
 * Find the daemon executable path
 * @returns string|null Path to daemon executable or null if not found
 */
function findDaemonExecutable(): string | null {
  // Get the directory of the current module (ES module equivalent of __dirname)
  const currentDir = dirname(fileURLToPath(import.meta.url));
  
  // Try different possible paths relative to current script
  const possiblePaths = [
    // Same directory as mcp-server.js
    resolve(currentDir, 'daemon', 'index.js'),
    // Build output structure
    resolve(currentDir, '..', 'daemon', 'index.js'),
    // Development structure
    resolve(currentDir, '..', '..', 'dist', 'daemon', 'index.js'),
  ];
  
  for (const path of possiblePaths) {
    debug(`Checking daemon path: ${path}`);
    if (existsSync(path)) {
      debug(`Found daemon at: ${path}`);
      return path;
    }
  }
  
  debug('No daemon executable found in expected locations');
  return null;
}

/**
 * Wait for daemon to be ready by polling health endpoint
 * @param timeoutMs Maximum wait time in milliseconds
 * @returns Promise<boolean> true if daemon is ready, false if timeout
 */
async function waitForDaemonReady(timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 500; // Poll every 500ms
  let attempt = 0;

  debug(`Waiting for daemon to be ready (timeout: ${timeoutMs}ms)`);

  while (Date.now() - startTime < timeoutMs) {
    // Declare tempClient outside try block for proper cleanup
    let tempClient: DaemonRESTClient | undefined;
    attempt++;

    try {
      // Create a temporary REST client to check daemon health
      tempClient = new DaemonRESTClient();
      await tempClient.connect();
      const health = await tempClient.getHealth();

      if (health.status === 'healthy' || health.status === 'starting') {
        debug(`Daemon ready with status: ${health.status}`);
        return true;
      }

      debug(`Daemon status: ${health.status}, continuing to wait...`);
    } catch (error) {
      // Daemon not ready yet, continue polling
      debug(`Daemon not ready yet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Always close the temp client to prevent resource leaks
      // Close regardless of connected state - the close method handles this safely
      if (tempClient && typeof tempClient.close === 'function') {
        try {
          tempClient.close();
        } catch (closeError) {
          // Log but don't throw - cleanup errors shouldn't mask the original error
          debug(`Error closing temp client during cleanup: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`);
        }
      }
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  debug('Timeout waiting for daemon to be ready');
  return false;
}

/**
 * Set up the MCP server with daemon-backed tools
 * @param daemonClient Connected daemon REST client
 */
async function setupMCPServer(daemonClient: DaemonRESTClient): Promise<void> {
  // Create daemon MCP endpoints
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
              folder_path: {
                type: 'string',
                description: 'Full path of the folder to list documents from'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of documents to return (default: 20)',
                minimum: 1,
                maximum: 100
              }
            },
            required: ['folder_path']
          }
        },
        {
          name: 'explore',
          description: 'Explore folder structure with ls-like navigation showing both directories and files',
          inputSchema: {
            type: 'object',
            properties: {
              base_folder_path: {
                type: 'string',
                description: 'Absolute path to the base folder'
              },
              relative_sub_path: {
                type: 'string',
                description: 'Relative path from base folder (e.g., "src/domain" or "" for root)'
              },
              subdirectory_limit: {
                type: 'number',
                description: 'Maximum subdirectories to return (default: 50)',
                minimum: 1,
                maximum: 200
              },
              file_limit: {
                type: 'number',
                description: 'Maximum files to return (default: 20)',
                minimum: 1,
                maximum: 100
              },
              continuation_token: {
                type: 'string',
                description: 'Token for pagination continuation'
              }
            },
            required: ['base_folder_path']
          }
        },
        {
          name: 'get_document_metadata',
          description: 'Get document metadata and structure with chunk navigation from a specific folder',
          inputSchema: {
            type: 'object',
            properties: {
              base_folder_path: {
                type: 'string',
                description: 'Full path of the folder containing the document'
              },
              file_path: {
                type: 'string',
                description: 'Document filename or path relative to base folder'
              },
              offset: {
                type: 'number',
                description: 'Offset for chunk pagination (default: 0)',
                minimum: 0,
                default: 0
              },
              limit: {
                type: 'number',
                description: 'Maximum number of chunks to return (default: 50)',
                minimum: 1,
                maximum: 200,
                default: 50
              }
            },
            required: ['base_folder_path', 'file_path']
          }
        },
        {
          name: 'get_chunks',
          description: 'Retrieve specific chunks by ID for targeted content access',
          inputSchema: {
            type: 'object',
            properties: {
              base_folder_path: {
                type: 'string',
                description: 'Full path of the folder containing the document'
              },
              file_path: {
                type: 'string',
                description: 'Document filename or path relative to base folder'
              },
              chunk_ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Array of chunk IDs to retrieve (e.g., ["chunk_1", "chunk_15", "chunk_28"])'
              }
            },
            required: ['base_folder_path', 'file_path', 'chunk_ids']
          }
        },
        {
          name: 'get_document_text',
          description: 'Get extracted plain text from any document type with character-based pagination',
          inputSchema: {
            type: 'object',
            properties: {
              base_folder_path: {
                type: 'string',
                description: 'Full path of the folder containing the document'
              },
              file_path: {
                type: 'string',
                description: 'Document filename or path relative to base folder'
              },
              max_chars: {
                type: 'number',
                description: 'Maximum characters to return (default: 5000, max: 50000)'
              },
              continuation_token: {
                type: 'string',
                description: 'Token from previous response to continue reading'
              }
            },
            required: ['base_folder_path', 'file_path']
          }
        },
        {
          name: 'search_content',
          description: 'Search for content using hybrid semantic and exact term matching. Combines vector similarity search with exact term boosting for precise results. At least one of semantic_concepts or exact_terms must be provided.',
          inputSchema: {
            type: 'object',
            properties: {
              folder_id: {
                type: 'string',
                description: 'Folder path to search within'
              },
              semantic_concepts: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Array of semantic concepts to search for using vector similarity (e.g., ["authentication logic", "error handling"])'
              },
              exact_terms: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Array of exact terms that must appear in results - boosts relevance score by 1.5x per match (e.g., ["vec0", "MATCH"])'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)',
                minimum: 1,
                maximum: 100
              },
              continuation_token: {
                type: 'string',
                description: 'Token from previous response to get next page of results'
              }
            },
            required: ['folder_id']
          }
        },
        {
          name: 'find_documents',
          description: 'Find documents using document-level embeddings for topic discovery. Returns ranked documents with summaries instead of chunk-level content. Complements search_content by providing document-level exploration ("Which docs cover this topic?") vs chunk-level precision ("Where is this specific code?").',
          inputSchema: {
            type: 'object',
            properties: {
              folder_id: {
                type: 'string',
                description: 'Folder path to search within'
              },
              query: {
                type: 'string',
                description: 'Natural language topic query (e.g., "authentication and authorization setup", "testing strategies")'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of documents to return (default: 20)',
                minimum: 1,
                maximum: 50
              },
              continuation_token: {
                type: 'string',
                description: 'Token from previous response to get next page of results'
              }
            },
            required: ['folder_id', 'query']
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
        
        case 'explore': {
          const baseFolderPath = args?.base_folder_path as string;
          const relativePath = args?.relative_sub_path as string | undefined;
          const options: any = {};

          if (args?.subdirectory_limit !== undefined) {
            options.subdirectoryLimit = args.subdirectory_limit as number;
          }
          if (args?.file_limit !== undefined) {
            options.fileLimit = args.file_limit as number;
          }
          if (args?.continuation_token !== undefined) {
            options.continuationToken = args.continuation_token as string;
          }

          const result = await daemonEndpoints.explore(baseFolderPath, relativePath, options);
          return result as any;
        }

        case 'list_documents': {
          const continuationToken = args?.continuation_token as string;

          // If only continuation token is provided, let the endpoint handle it
          if (continuationToken && !args?.base_folder_path && !args?.folder_path) {
            const result = await daemonEndpoints.listDocumentsEnhanced({
              continuation_token: continuationToken
            });
            return result as any;
          }

          const baseFolderPath = args?.base_folder_path as string || args?.folder_path as string;
          const relativeSubPath = args?.relative_sub_path as string;
          const recursive = args?.recursive as boolean;
          const limit = args?.limit as number;

          const result = await daemonEndpoints.listDocumentsEnhanced({
            base_folder_path: baseFolderPath,
            relative_sub_path: relativeSubPath,
            recursive,
            limit,
            continuation_token: continuationToken
          });
          return result as any;
        }

        case 'get_document_metadata': {
          const baseFolderPath = args?.base_folder_path as string;
          const filePath = args?.file_path as string;
          const offset = args?.offset as number || 0;
          const limit = args?.limit as number || 50;
          const result = await daemonEndpoints.getDocumentMetadata(baseFolderPath, filePath, { offset, limit });
          return result as any;
        }

        case 'get_chunks': {
          const baseFolderPath = args?.base_folder_path as string;
          const filePath = args?.file_path as string;
          const chunkIds = args?.chunk_ids as string[];
          const result = await daemonEndpoints.getChunks(baseFolderPath, filePath, chunkIds);
          return result as any;
        }

        case 'get_document_text': {
          const baseFolderPath = args?.base_folder_path as string;
          const filePath = args?.file_path as string;
          const maxChars = args?.max_chars as number | undefined;
          const continuationToken = args?.continuation_token as string | undefined;

          const options: { maxChars?: number; continuationToken?: string } = {};
          if (maxChars !== undefined) {
            options.maxChars = maxChars;
          }
          if (continuationToken !== undefined) {
            options.continuationToken = continuationToken;
          }

          const result = await daemonEndpoints.getDocumentText(baseFolderPath, filePath, options);
          return result as any;
        }

        case 'search_content': {
          const folderId = args?.folder_id as string;
          const semanticConcepts = args?.semantic_concepts as string[] | undefined;
          const exactTerms = args?.exact_terms as string[] | undefined;
          const limit = args?.limit as number | undefined;
          const continuationToken = args?.continuation_token as string | undefined;

          // Validate: at least one search parameter required
          if (!semanticConcepts?.length && !exactTerms?.length) {
            throw new Error('At least one of semantic_concepts or exact_terms must be provided');
          }

          const searchArgs: {
            folder_id: string;
            semantic_concepts?: string[];
            exact_terms?: string[];
            limit?: number;
            continuation_token?: string;
          } = {
            folder_id: folderId
          };

          if (semanticConcepts !== undefined) {
            searchArgs.semantic_concepts = semanticConcepts;
          }
          if (exactTerms !== undefined) {
            searchArgs.exact_terms = exactTerms;
          }
          if (limit !== undefined) {
            searchArgs.limit = limit;
          }
          if (continuationToken !== undefined) {
            searchArgs.continuation_token = continuationToken;
          }

          const result = await daemonEndpoints.searchContent(searchArgs);
          return result as any;
        }

        case 'find_documents': {
          const folderId = args?.folder_id as string;
          const query = args?.query as string;
          const limit = args?.limit as number | undefined;
          const continuationToken = args?.continuation_token as string | undefined;

          const findArgs: {
            folder_id: string;
            query: string;
            limit?: number;
            continuation_token?: string;
          } = {
            folder_id: folderId,
            query: query
          };

          if (limit !== undefined) {
            findArgs.limit = limit;
          }
          if (continuationToken !== undefined) {
            findArgs.continuation_token = continuationToken;
          }

          const result = await daemonEndpoints.findDocuments(findArgs);
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
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Check if this is a daemon-down error
      if (isDaemonDownError(errorObj)) {
        debug(`Daemon appears down for tool ${name}, attempting auto-recovery...`);
        
        // Start daemon restart asynchronously (don't wait)
        attemptDaemonAutoStart().catch(err => 
          debug(`Background daemon restart failed: ${err}`)
        );
        
        return {
          content: [{
            type: 'text' as const,
            text: `🔄 The folder-mcp backend is starting up. This usually takes 5-10 seconds.

Please try your "${name}" request again in a moment. If the issue persists after a few attempts, the daemon may need manual restart.`
          }]
        } as any;
      }
      
      // Original error handling for other errors
      return {
        content: [{
          type: 'text' as const,
          text: `Error calling tool ${name}: ${errorObj.message}`
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
}

/**
 * Main entry point for MCP server
 * @param options Optional configuration to bypass argument parsing (used when called from CLI)
 */
export async function main(options?: { folderPath?: string }): Promise<void> {
  debug('main() function called');

  let devModeManager: DevModeManager | null = null;
  let daemonClient: DaemonRESTClient | null = null;

  try {
    debug('Starting MCP server');

    let folderPath: string | undefined;

    // If options provided (called from CLI), use them directly
    // Otherwise parse command line arguments
    if (options !== undefined) {
      debug('Using provided options (CLI mode)');
      folderPath = options.folderPath;
    } else {
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

      folderPath = parseResult.args.folderPath;
    }
    
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
        debug(`Daemon info: v${serverInfo.server_info?.version || 'unknown'}, ${serverInfo.capabilities?.total_folders || 0} folders configured`);
        debug(`  - Total documents: ${serverInfo.capabilities?.total_documents || 0}`);
        debug(`  - Total chunks: ${serverInfo.capabilities?.total_chunks || 0}`);
        
        // Sprint 2: Connection established, ready for endpoint migration
        debug('Daemon REST connection verified - MCP server ready for multi-folder operations');
        
        // Sprint 3: Set up MCP server with daemon endpoints
        await setupMCPServer(daemonClient);
        return;
      } catch (error) {
        debug(`Failed to connect to daemon: ${error}`);
        debug('Attempting to auto-start daemon...');

        // Try to auto-start the daemon
        const autoStartSuccess = await attemptDaemonAutoStart();
        
        if (autoStartSuccess) {
          debug('Daemon auto-start successful, attempting connection...');
          
          try {
            // Retry connection after successful auto-start
            await daemonClient.connect();
            debug('Successfully connected to auto-started daemon');
            
            // Get server info to verify connection
            const serverInfo = await daemonClient.getServerInfo();
            debug(`Daemon info: v${serverInfo.server_info?.version || 'unknown'}, ${serverInfo.capabilities?.total_folders || 0} folders configured`);
            debug(`  - Total documents: ${serverInfo.capabilities?.total_documents || 0}`);
            debug(`  - Total chunks: ${serverInfo.capabilities?.total_chunks || 0}`);
            
            // Success! Set up MCP server with auto-started daemon
            await setupMCPServer(daemonClient);
            return;
            
          } catch (retryError) {
            debug(`Failed to connect to auto-started daemon: ${retryError}`);
            debug('Auto-started daemon may need more time to initialize');
            debug('Please wait a moment and try again, or start manually with: npm run daemon:restart');
            process.exit(1);
          }
        } else {
          debug('Failed to auto-start daemon');
          debug('Please ensure the daemon is running with REST API on port 3002');
          debug('Start the daemon with: npm run daemon:restart');
          process.exit(1);
        }
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
