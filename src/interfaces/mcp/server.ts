/**
 * Unified MCP Server
 * 
 * A clean, unified MCP server implementation that delegates to application layer services.
 * This replaces the two previous implementations (server.ts and mcpServer.ts) with a
 * single, well-architected solution following the modular boundaries.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { ContentServingWorkflow, KnowledgeOperations } from '../../application/serving/index.js';
import type { ILoggingService } from '../../di/interfaces.js';
import type { MCPServerInterface, MCPCapabilities } from './index.js';
import { FileRequestHandler } from './handlers/files.js';
import { KnowledgeRequestHandler } from './handlers/knowledge.js';
import { SystemRequestHandler } from './handlers/system.js';
import { MCPTransport, TransportFactory } from './transport.js';

export interface UnifiedMCPServerOptions {
  folderPath: string;
  transport?: 'stdio' | 'http';
  port?: number;
  name?: string;
  version?: string;
}

/**
 * Unified MCP Server that follows the modular architecture principles.
 * 
 * This server acts as a thin interface layer that:
 * - Translates MCP protocol requests into application service calls
 * - Handles MCP-specific concerns (protocol, transport, tool registration)
 * - Delegates all business logic to application layer services
 */
export class UnifiedMCPServer implements MCPServerInterface {
  private server: Server;
  private transport: MCPTransport | null = null;
  private isActive = false;

  // Request handlers
  private fileHandler: FileRequestHandler;
  private knowledgeHandler: KnowledgeRequestHandler;
  private systemHandler: SystemRequestHandler;

  constructor(
    private readonly options: UnifiedMCPServerOptions,
    private readonly contentServing: ContentServingWorkflow,
    private readonly knowledgeOps: KnowledgeOperations,
    private readonly loggingService: ILoggingService
  ) {
    // Initialize MCP server
    this.server = new Server(
      {
        name: options.name || 'folder-mcp',
        version: options.version || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize request handlers
    this.fileHandler = new FileRequestHandler(
      { folderPath: options.folderPath },
      this.contentServing,
      this.loggingService
    );

    this.knowledgeHandler = new KnowledgeRequestHandler(
      this.knowledgeOps,
      this.loggingService
    );

    this.systemHandler = new SystemRequestHandler(
      { folderPath: options.folderPath },
      this.contentServing,
      this.loggingService
    );

    this.setupRequestHandlers();
    this.loggingService.info('Unified MCP server initialized', {
      folderPath: options.folderPath,
      transport: options.transport || 'stdio'
    });
  }

  /**
   * Setup MCP request handlers for all supported tools
   */
  private setupRequestHandlers(): void {
    this.loggingService.debug('Setting up MCP request handlers');

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        ...this.fileHandler.getToolDefinitions(),
        ...this.knowledgeHandler.getToolDefinitions(),
        ...this.systemHandler.getToolDefinitions(),
      ];

      this.loggingService.debug('MCP: Returning tool definitions', { toolCount: tools.length });
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      this.loggingService.debug('MCP: Handling tool call', { toolName: name, args });

      try {
        switch (name) {
          // File operations
          case 'read_file':
            return await this.fileHandler.handleReadFile(args as { file_path: string });
          case 'list_files':
            return await this.fileHandler.handleListFiles();
          case 'search_files':
            return await this.fileHandler.handleSearchFiles(args as { pattern?: string });

          // Knowledge operations
          case 'search_knowledge':
            return await this.knowledgeHandler.handleSearchKnowledge(args as { query: string; top_k?: number; threshold?: number });
          case 'search_knowledge_enhanced':
            return await this.knowledgeHandler.handleEnhancedSearchKnowledge(args as { query: string; top_k?: number; threshold?: number; include_context?: boolean; expand_paragraphs?: boolean; group_by_document?: boolean });

          // System operations
          case 'get_folder_info':
            return await this.systemHandler.handleGetFolderInfo();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.loggingService.error('MCP: Tool call failed', error instanceof Error ? error : new Error(String(error)), {
          toolName: name,
          args
        });
        throw error;
      }
    });

    this.loggingService.debug('MCP request handlers setup completed');
  }

  /**
   * Start the MCP server with the specified transport
   */
  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('MCP server is already running');
    }

    try {
      const transportType = this.options.transport || 'stdio';
      
      const transportOptions = {
        server: this.server,
        loggingService: this.loggingService,
        ...(this.options.port !== undefined && { port: this.options.port })
      };
      
      this.transport = TransportFactory.create(transportType, transportOptions);

      await this.transport.start();
      this.isActive = true;

      this.loggingService.info('Unified MCP server started successfully', {
        transport: transportType,
        folderPath: this.options.folderPath
      });
    } catch (error) {
      this.loggingService.error('Failed to start unified MCP server', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isActive || !this.transport) {
      return;
    }

    try {
      await this.transport.stop();
      this.transport = null;
      this.isActive = false;

      this.loggingService.info('Unified MCP server stopped successfully');
    } catch (error) {
      this.loggingService.error('Failed to stop unified MCP server', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.isActive && this.transport?.isRunning() === true;
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): MCPCapabilities {
    return {
      resources: false,
      tools: true,
      prompts: false,
      completion: false,
      roots: false,
    };
  }

  /**
   * Get server metadata for debugging/monitoring
   */
  getServerInfo() {
    return {
      isRunning: this.isRunning(),
      transport: this.transport?.getTransportType() || 'none',
      folderPath: this.options.folderPath,
      capabilities: this.getCapabilities(),
      toolCount: [
        ...this.fileHandler.getToolDefinitions(),
        ...this.knowledgeHandler.getToolDefinitions(),
        ...this.systemHandler.getToolDefinitions(),
      ].length
    };
  }
}
