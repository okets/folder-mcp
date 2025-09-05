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
import { spawn, type ChildProcess } from 'child_process';
import { join, resolve, dirname } from 'path';
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
    
    // Spawn daemon process with detachment for independence
    const daemonProcess = spawn('node', [daemonPath, '--auto-start'], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'], // Detach completely
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
  
  debug(`Waiting for daemon to be ready (timeout: ${timeoutMs}ms)`);
  
  while (Date.now() - startTime < timeoutMs) {
    // Create a temporary REST client to check daemon health
    const tempClient = new DaemonRESTClient();
    
    try {
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
      if (tempClient && tempClient.connected) {
        tempClient.close();
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
          name: 'search',
          description: 'Search for documents within a specific folder using semantic search',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              folder_path: {
                type: 'string',
                description: 'Full path of the folder to search within (required for folder-specific search)'
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
            required: ['query', 'folder_path']
          }
        },
        {
          name: 'get_document_data',
          description: 'Get document content and metadata from a specific folder',
          inputSchema: {
            type: 'object',
            properties: {
              folder_path: {
                type: 'string',
                description: 'Full path of the folder containing the document'
              },
              document_id: {
                type: 'string',
                description: 'Document ID (filename or generated ID)'
              }
            },
            required: ['folder_path', 'document_id']
          }
        },
        {
          name: 'get_document_outline',
          description: 'Get document structure and outline from a specific folder',
          inputSchema: {
            type: 'object',
            properties: {
              folder_path: {
                type: 'string',
                description: 'Full path of the folder containing the document'
              },
              document_id: {
                type: 'string',
                description: 'Document ID (filename or generated ID)'
              }
            },
            required: ['folder_path', 'document_id']
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
          const folderPath = args?.folder_path as string;
          const limit = args?.limit as number | undefined;
          const result = await daemonEndpoints.listDocuments(folderPath, limit);
          return result as any;
        }
        
        case 'search': {
          const query = args?.query as string || '';
          const folderPath = args?.folder_path as string | undefined;
          const threshold = args?.threshold as number | undefined;
          const limit = args?.limit as number | undefined;
          const options: { threshold?: number; limit?: number } = {};
          if (threshold !== undefined) options.threshold = threshold;
          if (limit !== undefined) options.limit = limit;
          const result = await daemonEndpoints.search(query, folderPath, options);
          return result as any;
        }
        
        case 'get_document_data': {
          const folderPath = args?.folder_path as string;
          const documentId = args?.document_id as string;
          const result = await daemonEndpoints.getDocument(folderPath, documentId);
          return result as any;
        }
        
        case 'get_document_outline': {
          const folderPath = args?.folder_path as string;
          const documentId = args?.document_id as string;
          const result = await daemonEndpoints.getDocumentOutline(folderPath, documentId);
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
}

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
            debug(`Daemon info: v${serverInfo.version}, ${serverInfo.daemon.folderCount} folders configured`);
            debug(`  - Active folders: ${serverInfo.daemon.activeFolders}`);
            debug(`  - Indexing folders: ${serverInfo.daemon.indexingFolders}`);
            debug(`  - Total documents: ${serverInfo.daemon.totalDocuments}`);
            
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
