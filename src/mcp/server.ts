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
import { EmbeddingModel } from '../embeddings/index.js';
import { VectorIndex, buildVectorIndex, loadVectorIndex } from '../search/index.js';
import { EnhancedVectorSearch } from '../search/enhanced.js';
import { getConfig } from '../config.js';
import { ResolvedConfig } from '../config/resolver.js';
import type { ILoggingService } from '../di/interfaces.js';

export interface ServerOptions {
  folderPath: string;
  port?: number;
  transport?: 'stdio' | 'http';
  resolvedConfig?: ResolvedConfig;
}

export class FolderMCPServer {
  private server: Server;
  private folderPath: string;
  private port: number;
  private transport: 'stdio' | 'http';
  private resolvedConfig?: ResolvedConfig;
  private embeddingModel: EmbeddingModel | null = null;
  private vectorIndex: VectorIndex | null = null;
  private enhancedSearch: EnhancedVectorSearch | null = null;
  private loggingService: ILoggingService;

  constructor(options: ServerOptions, loggingService: ILoggingService) {
    this.folderPath = resolve(options.folderPath);
    this.port = options.port || 3000;
    this.transport = options.transport || 'stdio';
    this.loggingService = loggingService;
    
    if (!options.resolvedConfig) {
      throw new Error('ResolvedConfig is required for FolderMCPServer');
    }
    this.resolvedConfig = options.resolvedConfig;

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

  private setupTools(): void {
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
          },
          {
            name: 'search_knowledge_enhanced',
            description: 'Enhanced semantic search with context, document structure, and result grouping',
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
                include_context: {
                  type: 'boolean',
                  description: 'Include previous/next chunks for context (default: true)',
                  default: true,
                },
                expand_paragraphs: {
                  type: 'boolean',
                  description: 'Expand to paragraph boundaries (default: true)',
                  default: true,
                },
                group_by_document: {
                  type: 'boolean',
                  description: 'Group results by source document (default: true)',
                  default: true,
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Handle tool calls with error recovery
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Initialize error recovery for MCP operations
      const { ErrorRecoveryManager } = await import('../utils/errorRecovery.js');
      const cacheDir = join(this.folderPath, '.folder-mcp');
      const errorManager = new ErrorRecoveryManager(cacheDir);

      try {
        return await errorManager.executeWithRetry(
          async () => {
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

              case 'search_knowledge_enhanced':
                return await this.handleEnhancedSearchKnowledge(
                  args?.query as string,
                  args?.top_k as number,
                  args?.threshold as number,
                  args?.include_context as boolean,
                  args?.expand_paragraphs as boolean,
                  args?.group_by_document as boolean
                );

              default:
                throw new Error(`Unknown tool: ${name}`);
            }
          },
          {
            operation: `mcp_tool_${name}`,
            filePath: args?.file_path as string
          }
        );
      } catch (error) {
        const errObj = error instanceof Error ? error : new Error(String(error));
        this.loggingService.error(`Tool execution failed: ${name}`, errObj);
        throw new Error(`Tool execution failed: ${name}`);
      }
    });
  }

  private async handleReadFile(filePath: string) {
    try {
      const fullPath = resolve(this.folderPath, filePath);
      
      // Security check: ensure the file is within the folder
      const relativePath = relative(this.folderPath, fullPath);
      if (relativePath.startsWith('..')) {
        throw new Error('Access denied: File is outside the served folder');
      }
      
      if (!existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const content = readFileSync(fullPath, 'utf8');
      
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

  private async handleSearchFiles(pattern: string = '*') {
    try {
      const searchPattern = join(this.folderPath, '**', pattern);
      const files = await glob(searchPattern, { 
        ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**'],
        nodir: true 
      });
      
      const relativeFiles = files.map(file => relative(this.folderPath, file));
      
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

  private async handleListFiles() {
    try {
      const files = await glob(join(this.folderPath, '**', '*'), {
        ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**'],
        nodir: true
      });
      
      const relativeFiles = files.map(file => relative(this.folderPath, file));
      
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

  private async handleGetFolderInfo() {
    try {
      const files = await glob(join(this.folderPath, '**', '*'), {
        ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**'],
        nodir: true
      });
      
      const metadata = this.getMetadata();
      
      let info = `Folder: ${this.folderPath}\n`;
      info += `Total files: ${files.length}\n`;
      
      if (metadata) {
        info += `\nMetadata:\n${JSON.stringify(metadata, null, 2)}`;
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

  private async handleSearchKnowledge(query: string, topK: number = 5, threshold: number = 0.0) {
    try {
      // Initialize services if needed
      if (!this.embeddingModel) {
        this.embeddingModel = new EmbeddingModel(this.resolvedConfig?.modelName || 'default');
        await this.embeddingModel.initialize();
      }

      if (!this.vectorIndex) {
        const indexPath = join(this.folderPath, '.folder-mcp', 'vectors', 'index.faiss');
        if (existsSync(indexPath)) {
          this.vectorIndex = await loadVectorIndex(indexPath);
        } else {
          throw new Error('Vector index not found. Please run indexing first.');
        }
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingModel.generateEmbedding(query);
      
      // Search for similar content
      if (!this.vectorIndex) {
        throw new Error('Vector index not initialized');
      }
      const results = await this.vectorIndex.search(queryEmbedding.vector, topK);
      
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
        if (result.score >= threshold) {
          response += `Score: ${result.score.toFixed(3)}\n`;
          response += `Content: ${result.chunk.content}\n`;
          response += `Metadata: ${JSON.stringify(result.chunk.metadata, null, 2)}\n\n`;
        }
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

  private async handleEnhancedSearchKnowledge(
    query: string, 
    topK: number = 5, 
    threshold: number = 0.0,
    includeContext: boolean = true,
    expandParagraphs: boolean = true,
    groupByDocument: boolean = true
  ) {
    try {
      // Initialize services if needed
      if (!this.embeddingModel) {
        this.embeddingModel = new EmbeddingModel(this.resolvedConfig?.modelName || 'default');
        await this.embeddingModel.initialize();
      }

      if (!this.vectorIndex) {
        const indexPath = join(this.folderPath, '.folder-mcp', 'vectors', 'index.faiss');
        if (existsSync(indexPath)) {
          this.vectorIndex = await loadVectorIndex(indexPath);
        } else {
          throw new Error('Vector index not found. Please run indexing first.');
        }
      }

      if (!this.vectorIndex) {
        throw new Error('Vector index not initialized');
      }

      if (!this.enhancedSearch) {
        this.enhancedSearch = new EnhancedVectorSearch(this.vectorIndex, this.folderPath);
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingModel.generateEmbedding(query);

      // Perform enhanced search
      const results = await this.enhancedSearch.searchWithContext(
        queryEmbedding.vector,
        topK,
        threshold,
        includeContext
      );
      
      if (results.totalResults === 0) {
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
      let response = `Found ${results.totalResults} similar results:\n\n`;
      
      for (const group of results.documentGroups) {
        for (const result of group.results) {
          response += `Score: ${result.score.toFixed(3)}\n`;
          response += `Content: ${result.contextualChunk.content}\n`;
          if (result.contextualChunk.context) {
            response += `Context:\n${result.contextualChunk.context.previousChunk || ''}\n${result.contextualChunk.context.nextChunk || ''}\n`;
          }
          response += `Metadata: ${JSON.stringify(result.contextualChunk.metadata, null, 2)}\n\n`;
        }
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
      this.loggingService.error('Failed to perform enhanced search', error instanceof Error ? error : new Error(String(error)), { 
        query, 
        topK, 
        threshold,
        includeContext,
        expandParagraphs,
        groupByDocument
      });
      throw error;
    }
  }

  private getMetadata(): any {
    const metadataPath = join(this.folderPath, '.folder-mcp', 'metadata', 'index.json');
    try {
      if (existsSync(metadataPath)) {
        return JSON.parse(readFileSync(metadataPath, 'utf8'));
      }
    } catch (error) {
      this.loggingService.error('Failed to read metadata', error instanceof Error ? error : new Error(String(error)), { path: metadataPath });
    }
    return null;
  }

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

// Export for use in CLI
export async function startMCPServer(options: ServerOptions): Promise<FolderMCPServer> {
  const config = getConfig();
  
  // Use config for default port if not specified
  const serverOptions: ServerOptions = {
    ...options,
    port: options.port || config.api.defaultPort,
  };

  // Setup dependency injection container and get logging service
  const { setupDependencyInjection } = await import('../di/setup.js');
  const { getContainer } = await import('../di/container.js');
  const { SERVICE_TOKENS } = await import('../di/interfaces.js');
  
  setupDependencyInjection({
    folderPath: serverOptions.folderPath,
    logLevel: 'info'
  });
  
  const container = getContainer();
  const loggingService = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);

  const server = new FolderMCPServer(serverOptions, loggingService);
  
  // Setup graceful shutdown
  const shutdown = async () => {
    console.error('\n📡 Received shutdown signal, stopping server...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.start();
  return server;
}
