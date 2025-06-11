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
        
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool '${name}': ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle read_file tool
   */
  private async handleReadFile(filePath: string) {
    if (!filePath) {
      throw new Error('file_path parameter is required');
    }

    // Security check: ensure file is within served folder
    const fullPath = resolve(this.folderPath, filePath);
    if (!fullPath.startsWith(this.folderPath)) {
      throw new Error('Access denied: file is outside served folder');
    }

    if (!this.fileSystemService.exists(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const content = await this.fileSystemService.readFile(fullPath);
      
      this.loggingService.debug('File read successfully', { filePath, size: content.length });
      
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle search_files tool
   */
  private async handleSearchFiles(pattern: string = '*') {
    try {
      const searchPattern = join(this.folderPath, '**', pattern);
      const files = await glob(searchPattern, { 
        ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**'],
        nodir: true 
      });

      const relativeFiles = files.map(file => relative(this.folderPath, file));
      
      this.loggingService.debug('File search completed', { pattern, fileCount: relativeFiles.length });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(relativeFiles, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`File search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle list_files tool
   */
  private async handleListFiles() {
    try {
      const files = await glob(join(this.folderPath, '**', '*'), {
        ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**'],
        nodir: true
      });

      const relativeFiles = files.map(file => relative(this.folderPath, file));
      
      this.loggingService.debug('File listing completed', { fileCount: relativeFiles.length });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(relativeFiles, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`File listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle get_folder_info tool
   */
  private async handleGetFolderInfo() {
    try {
      const info = {
        path: this.folderPath,
        name: require('path').basename(this.folderPath),
        config: {
          modelName: this.resolvedConfig.modelName,
          chunkSize: this.resolvedConfig.chunkSize,
          fileExtensions: this.resolvedConfig.fileExtensions,
        },
        cache: await this.getCacheInfo(),
      };

      this.loggingService.debug('Folder info retrieved', { folderPath: this.folderPath });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get folder info: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    if (!query) {
      throw new Error('query parameter is required');
    }

    this.loggingService.debug('Performing knowledge search', { query, topK, threshold });

    try {
      // Initialize services if needed
      if (!this.embeddingService.isInitialized()) {
        await this.embeddingService.initialize();
      }

      if (!this.vectorSearchService.isReady()) {
        // Load or build vector index
        const indexPath = join(this.folderPath, '.folder-mcp', 'vectors', 'index.faiss');
        if (this.fileSystemService.exists(indexPath)) {
          await this.vectorSearchService.loadIndex(indexPath);
        } else {
          throw new Error('Vector index not found. Please run indexing first.');
        }
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);

      // Search for similar vectors
      const searchResults = await this.vectorSearchService.search(queryEmbedding, topK, threshold);

      this.loggingService.info('Knowledge search completed', { 
        query, 
        resultCount: searchResults.length 
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              results: searchResults,
              metadata: {
                searchTime: new Date().toISOString(),
                totalResults: searchResults.length,
                threshold,
                model: this.embeddingService.getModelConfig()
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Knowledge search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cache information
   */
  private async getCacheInfo() {
    try {
      const cacheDir = join(this.folderPath, '.folder-mcp');
      
      if (!this.fileSystemService.exists(cacheDir)) {
        return { status: 'not_initialized' };
      }

      // This would need proper implementation based on cache service
      return {
        status: 'initialized',
        path: cacheDir,
        // Add more cache info as needed
      };
    } catch (error) {
      this.loggingService.warn('Failed to get cache info', error);
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    this.loggingService.info('Starting MCP server', { transport: this.transport });

    try {
      if (this.transport === 'stdio') {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.loggingService.info(`MCP Server running on stdio for folder: ${this.folderPath}`);
      } else {
        // For HTTP transport, we'll implement this in the future
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.loggingService.info(`MCP Server running on stdio (HTTP port ${this.port} planned) for folder: ${this.folderPath}`);
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
    this.loggingService.info('Stopping MCP server');
    
    try {
      // Cleanup server resources
      await this.server.close();
      this.loggingService.info('MCP server stopped successfully');
    } catch (error) {
      this.loggingService.error('Error stopping MCP server', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
