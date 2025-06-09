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

  constructor(options: ServerOptions) {
    this.folderPath = resolve(options.folderPath);
    this.port = options.port || 3000;
    this.transport = options.transport || 'stdio';
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

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

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
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleReadFile(filePath: string) {
    if (!filePath) {
      throw new Error('file_path is required');
    }

    // Security check - ensure path is within the served folder
    const fullPath = resolve(this.folderPath, filePath);
    if (!fullPath.startsWith(this.folderPath)) {
      throw new Error('Access denied: Path is outside the served folder');
    }

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(fullPath, 'utf8');
    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  }

  private async handleSearchFiles(pattern: string = '*') {
    const searchPattern = join(this.folderPath, '**', pattern);
    const files = await glob(searchPattern, {
      ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**'],
      nodir: true,
    });

    const relativeFiles = files.map(file => relative(this.folderPath, file));
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${relativeFiles.length} files matching pattern "${pattern}":\n\n${relativeFiles.join('\n')}`,
        },
      ],
    };
  }

  private async handleListFiles() {
    const files = await glob(join(this.folderPath, '**', '*'), {
      ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**'],
      nodir: true,
    });

    const relativeFiles = files.map(file => relative(this.folderPath, file));
    
    // Group by file type
    const fileTypes: Record<string, number> = {};
    relativeFiles.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase() || 'no extension';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });

    const typeInfo = Object.entries(fileTypes)
      .sort(([, a], [, b]) => b - a)
      .map(([ext, count]) => `${ext}: ${count}`)
      .join(', ');

    return {
      content: [
        {
          type: 'text',
          text: `Total files: ${relativeFiles.length}\n\nFile types: ${typeInfo}\n\nFiles:\n${relativeFiles.join('\n')}`,
        },
      ],
    };
  }

  private async handleGetFolderInfo() {
    const files = await glob(join(this.folderPath, '**', '*'), {
      ignore: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**'],
      nodir: true,
    });

    // Check for index metadata
    let info = `Folder: ${this.folderPath}\n`;
    info += `Total files: ${files.length}\n`;

    const metadata = this.getMetadata();
    if (metadata) {
      info += `\nIndex Information:\n`;
      info += `- Indexed at: ${metadata.indexedAt}\n`;
      info += `- Total files processed: ${metadata.totalFiles}\n`;
      info += `- Cache directory: ${metadata.cacheDir}\n`;
    } else {
      info += `\nNo index found. Run 'folder-mcp index "${this.folderPath}"' to create an index.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: info,
        },
      ],
    };
  }

  private async handleSearchKnowledge(query: string, topK?: number, threshold?: number) {
    if (!query) {
      throw new Error('query parameter is required');
    }

    const k = Math.max(1, Math.min(50, topK || 5)); // Clamp between 1 and 50
    const minThreshold = Math.max(0.0, Math.min(1.0, threshold || 0.0)); // Clamp between 0 and 1

    try {
      // Check if folder is indexed
      const cacheDir = join(this.folderPath, '.folder-mcp');
      const embeddingsDir = join(cacheDir, 'embeddings');

      if (!existsSync(embeddingsDir)) {
        throw new Error(`Folder is not indexed. Please run: folder-mcp index "${this.folderPath}"`);
      }

      // Initialize embedding model if needed
      if (!this.embeddingModel) {
        this.embeddingModel = new EmbeddingModel(this.resolvedConfig?.modelName);
        await this.embeddingModel.initialize();
      }

      // Load or build vector index if needed
      if (!this.vectorIndex) {
        const existingIndex = await loadVectorIndex(cacheDir);
        if (!existingIndex) {
          // Build index if it doesn't exist
          this.vectorIndex = await buildVectorIndex(cacheDir);
        } else {
          this.vectorIndex = existingIndex;
        }
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingModel.generateEmbedding(query);

      // Perform search
      const searchResults = await this.vectorIndex.search(queryEmbedding.vector, k);

      // Filter by threshold
      const filteredResults = searchResults.filter(result => result.score >= minThreshold);

      if (filteredResults.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No results found for query: "${query}"\n\nTried searching ${searchResults.length} indexed documents with minimum similarity threshold ${minThreshold}.`,
            },
          ],
        };
      }

      // Format results for MCP response
      let responseText = `Found ${filteredResults.length} similar chunks for: "${query}"\n\n`;
      
      filteredResults.forEach((result, index) => {
        responseText += `${index + 1}. **${result.chunk.metadata.filePath}**\n`;
        responseText += `   - Similarity Score: ${result.score.toFixed(4)}\n`;
        responseText += `   - Lines: ${result.chunk.metadata.startLine}-${result.chunk.metadata.endLine}\n`;
        responseText += `   - Content: ${result.chunk.content.slice(0, 300)}${result.chunk.content.length > 300 ? '...' : ''}\n\n`;
      });

      // Add search metadata
      const stats = this.vectorIndex.getStats();
      responseText += `---\n`;
      responseText += `Search completed using vector index with ${stats.vectorCount} documents (${stats.dimension}D vectors)\n`;
      responseText += `Parameters: top_k=${k}, threshold=${minThreshold}`;

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };

    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleEnhancedSearchKnowledge(
    query: string, 
    topK?: number, 
    threshold?: number,
    includeContext?: boolean,
    expandParagraphs?: boolean,
    groupByDocument?: boolean
  ) {
    if (!query) {
      throw new Error('query parameter is required');
    }

    const k = Math.max(1, Math.min(50, topK || 5));
    const minThreshold = Math.max(0.0, Math.min(1.0, threshold || 0.0));
    const contextEnabled = includeContext !== false;
    const paragraphExpansion = expandParagraphs !== false;
    const documentGrouping = groupByDocument !== false;

    try {
      // Check if folder is indexed
      const cacheDir = join(this.folderPath, '.folder-mcp');
      const embeddingsDir = join(cacheDir, 'embeddings');

      if (!existsSync(embeddingsDir)) {
        throw new Error(`Folder is not indexed. Please run: folder-mcp index "${this.folderPath}"`);
      }

      // Initialize enhanced search if needed
      if (!this.enhancedSearch) {
        // First ensure we have the vector index
        if (!this.vectorIndex) {
          const existingIndex = await loadVectorIndex(cacheDir);
          if (!existingIndex) {
            // Build index if it doesn't exist
            this.vectorIndex = await buildVectorIndex(cacheDir);
          } else {
            this.vectorIndex = existingIndex;
          }
        }
        
        this.enhancedSearch = new EnhancedVectorSearch(this.vectorIndex, cacheDir);
      }        // Initialize embedding model if needed for query
        if (!this.embeddingModel) {
          this.embeddingModel = new EmbeddingModel(this.resolvedConfig?.modelName);
          await this.embeddingModel.initialize();
        }

      // Generate query embedding
      const queryEmbedding = await this.embeddingModel.generateEmbedding(query);

      // Perform enhanced search
      const results = await this.enhancedSearch.searchWithContext(
        queryEmbedding.vector,
        k,
        minThreshold,
        contextEnabled
      );

      if (results.totalResults === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No results found for query: "${query}"\n\nTried enhanced search with minimum similarity threshold ${minThreshold}.`,
            },
          ],
        };
      }

      // Format enhanced results for MCP response
      let responseText = `Enhanced search found ${results.totalResults} results for: "${query}"\n`;
      responseText += `Searched ${results.documentsSearched} documents\n\n`;
      
      if (documentGrouping && results.documentGroups.length > 0) {
        // Use grouped results format
        results.documentGroups.forEach((group, docIndex) => {
          responseText += `## Document ${docIndex + 1}: ${group.sourceDocument}\n`;
          responseText += `**Type:** ${group.documentType}\n`;
          responseText += `**Results:** ${group.resultCount}\n`;
          responseText += `**Best Score:** ${group.relevanceScore.toFixed(4)}\n`;
          
          if (group.documentStructure) {
            const structure = group.documentStructure;
            if (structure.sections?.length) {
              responseText += `**Sections:** ${structure.sections.length}\n`;
            }
            if (structure.slides?.length) {
              responseText += `**Slides:** ${structure.slides.length}\n`;
            }
            if (structure.sheets?.length) {
              responseText += `**Sheets:** ${structure.sheets.length}\n`;
            }
          }
          responseText += '\n';

          group.results.forEach((result, index) => {
            responseText += `### Result ${index + 1} (Score: ${result.score.toFixed(4)})\n`;
            responseText += `**Location:** Lines ${result.contextualChunk.metadata.startLine}-${result.contextualChunk.metadata.endLine}\n`;
            
            if (result.contextualChunk.context.previousChunk && contextEnabled) {
              responseText += `**Previous Context:** ${result.contextualChunk.context.previousChunk.slice(0, 150)}...\n`;
            }
            
            responseText += `**Content:** ${result.contextualChunk.content}\n`;
            
            if (result.contextualChunk.context.nextChunk && contextEnabled) {
              responseText += `**Next Context:** ${result.contextualChunk.context.nextChunk.slice(0, 150)}...\n`;
            }

            if (paragraphExpansion && result.contextualChunk.context.expandedContent !== result.contextualChunk.content) {
              responseText += `**Expanded Content:** ${result.contextualChunk.context.expandedContent.slice(0, 300)}...\n`;
            }
            
            responseText += '\n';
          });
          responseText += '---\n\n';
        });
      } else {
        // Simple list format - flatten all results from all groups
        let allResults: any[] = [];
        results.documentGroups.forEach(group => {
          allResults.push(...group.results);
        });
        
        allResults.forEach((result, index) => {
          responseText += `${index + 1}. **${result.sourceDocument}** (${result.documentType})\n`;
          responseText += `   - Similarity Score: ${result.score.toFixed(4)}\n`;
          responseText += `   - Lines: ${result.contextualChunk.metadata.startLine}-${result.contextualChunk.metadata.endLine}\n`;
          responseText += `   - Content: ${result.contextualChunk.content.slice(0, 300)}${result.contextualChunk.content.length > 300 ? '...' : ''}\n`;
          
          if (contextEnabled && result.contextualChunk.context.expandedContent !== result.contextualChunk.content) {
            responseText += `   - Enhanced Context: ${result.contextualChunk.context.expandedContent.slice(0, 200)}...\n`;
          }
          responseText += '\n';
        });
      }

      // Add search metadata
      responseText += `---\n`;
      responseText += `Enhanced search completed with context=${contextEnabled}, paragraphs=${paragraphExpansion}, grouping=${documentGrouping}\n`;
      responseText += `Parameters: top_k=${k}, threshold=${minThreshold}`;

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };

    } catch (error) {
      throw new Error(`Enhanced search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getMetadata(): any {
    try {
      const metadataPath = join(this.folderPath, '.folder-mcp', 'metadata', 'index.json');
      if (existsSync(metadataPath)) {
        return JSON.parse(readFileSync(metadataPath, 'utf8'));
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  async start(): Promise<void> {
    if (this.transport === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error(`Folder MCP Server running on stdio for folder: ${this.folderPath}`);
    } else {
      // For HTTP transport, we'll implement this in the future
      // For now, we'll use stdio but indicate the intended port
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error(`Folder MCP Server running on stdio (HTTP port ${this.port} planned) for folder: ${this.folderPath}`);
    }
  }

  async stop(): Promise<void> {
    // Implement graceful shutdown
    await this.server.close();
    console.error('Folder MCP Server stopped');
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

  const server = new FolderMCPServer(serverOptions);
  
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
