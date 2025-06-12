/**
 * Clean MCP Server Implementation
 * 
 * A minimal, clean MCP server that follows the interface layer guidelines.
 * This server acts as a thin delegation layer that:
 * - Handles MCP protocol concerns
 * - Delegates to application layer services
 * - Uses constructor injection for dependencies
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { ILoggingService } from '../../di/interfaces.js';
import type { MCPServerOptions, MCPServerCapabilities } from './types.js';
import { BasicHandler } from './handlers/basic.js';
import { MCPTransport } from './transport.js';

export class MCPServer {
  private server: Server;
  private transport: MCPTransport;
  private basicHandler: BasicHandler;
  private isRunning = false;

  constructor(
    private readonly options: MCPServerOptions,
    private readonly logger: ILoggingService
  ) {
    // Write to stderr, not stdout
    process.stderr.write('[INFO] Initializing MCP Server\n');
    this.logger.info('Initializing MCP Server', { options: this.options });

    // Initialize server
    this.server = new Server(
      {
        name: this.options.name || 'folder-mcp',
        version: this.options.version || '1.0.0',
      },
      {
        capabilities: this.getCapabilities(),
      }
    );

    // Initialize transport and handlers
    this.transport = new MCPTransport(this.logger);
    this.basicHandler = new BasicHandler(this.logger);

    // Register handlers
    this.registerHandlers();
  }

  /**
   * Get server capabilities
   */
  private getCapabilities(): any {
    return {
      tools: {},
    };
  }

  /**
   * Register MCP request handlers
   */
  private registerHandlers(): void {
    // Write directly to stderr
    process.stderr.write('[INFO] Registering MCP handlers\n');
    this.logger.info('Registering MCP handlers');

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Log only to stderr
      process.stderr.write('[INFO] Handling list_tools request\n');
      this.logger.info('Handling list_tools request');
      
      const tools = this.basicHandler.getToolDefinitions();
      
      process.stderr.write(`[INFO] Returning tools list (count: ${tools.length})\n`);
      this.logger.info('Returning tools list', { toolCount: tools.length });
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Log only to stderr
      process.stderr.write(`[INFO] Handling call_tool request: ${request.params.name}\n`);
      this.logger.info('Handling call_tool request', { 
        name: request.params.name,
        args: request.params.arguments 
      });

      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'hello_world':
            const result = await this.basicHandler.handleHelloWorld(args || {});
            process.stderr.write(`[INFO] Tool execution successful: hello_world\n`);
            this.logger.info('Tool execution successful', { name, result });
            return {
              content: [
                {
                  type: 'text',
                  text: result.message,
                },
              ],
            };

          default:
            const errorMsg = `Unknown tool: ${name}`;
            process.stderr.write(`[ERROR] Unknown tool requested: ${name}\n`);
            this.logger.error('Unknown tool requested', new Error(errorMsg), { name });
            throw new Error(errorMsg);
        }
      } catch (error) {
        process.stderr.write(`[ERROR] Tool execution failed: ${error}\n`);
        this.logger.error('Tool execution failed', error instanceof Error ? error : new Error(String(error)), { name });
        throw error;
      }
    });

    process.stderr.write('[INFO] MCP handlers registered successfully\n');
    this.logger.info('MCP handlers registered successfully');
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Remove all console.error calls - use logger only
    
    if (this.isRunning) {
      this.logger.warn('MCP server is already running');
      return;
    }

    try {
      this.logger.info('Starting MCP server');

      // Connect transport
      await this.transport.connect();

      // Connect server to transport
      await this.server.connect(this.transport.getTransport());

      this.isRunning = true;
      this.logger.info('MCP server started successfully');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to start MCP server', errorObj);
      process.stderr.write(`[ERROR] MCP server start failed: ${errorObj.message}\n`);
      throw errorObj;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('MCP server is not running');
      return;
    }

    try {
      this.logger.info('Stopping MCP server');

      // Disconnect transport
      await this.transport.disconnect();

      this.isRunning = false;
      this.logger.info('MCP server stopped successfully');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error stopping MCP server', errorObj);
      process.stderr.write(`[ERROR] MCP server stop failed: ${errorObj.message}\n`);
      throw errorObj;
    }
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }
}
