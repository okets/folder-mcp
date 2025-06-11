/**
 * MCP server with dependency injection
 * 
 * Refactored version of the MCP server that uses proper dependency injection
 * instead of directly creating its own dependencies.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';
import { glob } from 'glob';

import { ResolvedConfig } from '../config/resolver.js';
import {
  IConfigurationService,
  IEmbeddingService,
  IVectorSearchService,
  ICacheService,
  IFileSystemService,
  ILoggingService
} from '../di/interfaces.js';

export interface MCPServerOptions {
  folderPath: string;
  port?: number;
  transport?: 'stdio' | 'http';
  resolvedConfig: ResolvedConfig;
}

/**
 * MCP server with proper dependency injection
 */
export class MCPServer {
  private server: Server;
  private folderPath: string;
  private port: number;
  private transport: 'stdio' | 'http';
  private resolvedConfig: ResolvedConfig;

  constructor(
    private readonly options: MCPServerOptions,
    private readonly configService: IConfigurationService,
    private readonly embeddingService: IEmbeddingService,
    private readonly vectorSearchService: IVectorSearchService,
    private readonly cacheService: ICacheService,
    private readonly fileSystemService: IFileSystemService,
    private readonly loggingService: ILoggingService
  ) {
    this.folderPath = resolve(options.folderPath);
    this.port = options.port || 3000;
    this.transport = options.transport || 'stdio';
    this.resolvedConfig = options.resolvedConfig;

    this.loggingService.info('Initializing MCP server', {
      folderPath: this.folderPath,
      port: this.port,
      transport: this.transport
    });

    // Initialize MCP server
    this.server = new Server(
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

    this.setupTools();
  }

  /**
   * Setup MCP tools with dependency injection
   */
  private setupTools(): void {
    this.loggingService.debug('Setting up MCP tools');

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Read the contents of a file within the served folder',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Relative path to the file within the folder',
                },
              },
              required: ['file_path'],
            },
          },
          {
            name: 'search_files',
            description: 'Search for files matching a pattern',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: 'File pattern to search for (e.g., "*.md", "*.txt")',
                  default: '*',
                },
              },
            },
          },
          {
            name: 'list_files',
            description: 'List all files in the served folder recursively',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_folder_info',
            description: 'Get information about the served folder',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'search_knowledge',
            description: 'Search for similar content using semantic vector search',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query text',
                },
                top_k: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 5)',
                  default: 5,
                  minimum: 1,
                  maximum: 50,
                },
                threshold: {
                  type: 'number',
                  description: 'Minimum similarity score threshold (0.0 to 1.0, default: 0.0)',
                  default: 0.0,
                  minimum: 0.0,
                  maximum: 1.0,
                },
              },
              required: ['query'],
            },
          }
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.loggingService.debug('Handling MCP tool call', { toolName: name, args });

      try {
        switch (name) {
          case 'read_file':
            return await this.handleReadFile(args?.file_path as string);

          case 'search_files':
            return await this.handleSearchFiles(args?.pattern as string);

          case 'list_files':
            return await this.handleListFiles();

          case 'get_folder_info':
            return await this.handleGetFolderInfo();

          case 'search_knowledge':
            return await this.handleSearchKnowledge(
              args?.query as string,
              args?.top_k as number,
              args?.threshold as number
            );

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.loggingService.error(`Tool execution failed: ${name}`, error instanceof Error ? error : new Error(String(error)));
        throw new Error(`Tool execution failed: ${name}`);
      }
    });
  }

  /**
   * Handle read_file tool
   */
  private async handleReadFile(filePath: string) {
    try {
      const fullPath = resolve(this.folderPath, filePath);
      
      // Security check: ensure the file is within the folder
      const relativePath = relative(this.folderPath, fullPath);
      if (relativePath.startsWith('..')) {
        throw new Error('Access denied: File is outside the served folder');
      }
      
      const content = await this.fileSystemService.readFile(fullPath);
      
      return {
        content: [
          {
            type: 'text',
            text: `File: ${filePath}\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('Failed to read file', error instanceof Error ? error : new Error(String(error)), { filePath });
      throw error;
    }
  }

  /**
   * Handle search_files tool
   */
  private async handleSearchFiles(pattern: string = '*') {
    try {
      const files = await this.fileSystemService.generateFingerprints(
        this.folderPath,
        [pattern],
        ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**']
      );
      
      const relativeFiles = files.map(f => relative(this.folderPath, f.path));
      
      return {
        content: [
          {
            type: 'text',
            text: `Found ${files.length} files matching pattern "${pattern}":\n\n${relativeFiles.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('Failed to search files', error instanceof Error ? error : new Error(String(error)), { pattern });
      throw error;
    }
  }

  /**
   * Handle list_files tool
   */
  private async handleListFiles() {
    try {
      const files = await this.fileSystemService.generateFingerprints(
        this.folderPath,
        ['*'],
        ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**']
      );
      
      const relativeFiles = files.map(f => relative(this.folderPath, f.path));
      
      return {
        content: [
          {
            type: 'text',
            text: `All files in folder (${files.length} total):\n\n${relativeFiles.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('Failed to list files', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle get_folder_info tool
   */
  private async handleGetFolderInfo() {
    try {
      const files = await this.fileSystemService.generateFingerprints(
        this.folderPath,
        ['*'],
        ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**']
      );
      
      const cacheInfo = await this.getCacheInfo();
      
      let info = `Folder: ${this.folderPath}\n`;
      info += `Total files: ${files.length}\n`;
      
      if (cacheInfo) {
        info += `\nCache info:\n${JSON.stringify(cacheInfo, null, 2)}`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: info,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('Failed to get folder info', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle search_knowledge tool
   */
  private async handleSearchKnowledge(
    query: string,
    topK: number = 5,
    threshold: number = 0.0
  ) {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);
      
      // Search for similar content
      const results = await this.vectorSearchService.search(queryEmbedding, topK, threshold);
      
      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No similar content found.',
            },
          ],
        };
      }
      
      // Format results
      let response = `Found ${results.length} similar results:\n\n`;
      
      for (const result of results) {
        response += `Score: ${result.score.toFixed(3)}\n`;
        response += `Content: ${result.content}\n`;
        response += `Metadata: ${JSON.stringify(result.metadata, null, 2)}\n\n`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('Failed to search knowledge', error instanceof Error ? error : new Error(String(error)), { query, topK, threshold });
      throw error;
    }
  }

  /**
   * Get cache information
   */
  private async getCacheInfo() {
    try {
      const files = await this.fileSystemService.generateFingerprints(
        this.folderPath,
        ['*'],
        ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**']
      );
      
      return await this.cacheService.getCacheStatus(files);
    } catch (error) {
      this.loggingService.error('Failed to get cache info', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      this.loggingService.info('Starting MCP server', {
        folderPath: this.folderPath,
        port: this.port,
        transport: this.transport
      });
      
      if (this.transport === 'http') {
        // Start HTTP server
        const { createServer } = await import('http');
        const server = createServer((req, res) => {
          // Handle HTTP requests
        });
        
        server.listen(this.port, () => {
          this.loggingService.info(`MCP server listening on port ${this.port}`);
        });
      } else {
        // Start stdio server
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
      }
    } catch (error) {
      this.loggingService.error('Failed to start MCP server', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    try {
      this.loggingService.info('Stopping MCP server');
      await this.server.close();
    } catch (error) {
      this.loggingService.error('Failed to stop MCP server', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
