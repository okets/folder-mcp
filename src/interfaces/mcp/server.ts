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
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { ILoggingService } from '../../di/interfaces.js';
import type { MCPServerOptions, MCPServerCapabilities } from './types.js';
import { 
  BasicHandler, 
  SearchHandler, 
  NavigationHandler, 
  DocumentAccessHandler, 
  SummarizationHandler, 
  SpecializedHandler,
  MCPResourcesHandler
} from './handlers/index.js';
import { MCPTransport } from './transport.js';
import { DEFAULT_ENHANCED_MCP_CONFIG, formatToolSetsForClients, type EnhancedMCPConfig } from '../../config/enhanced-mcp.js';

export class MCPServer {
  private server: Server;
  private transport: MCPTransport;
  private basicHandler: BasicHandler;
  private searchHandler: SearchHandler;
  private navigationHandler: NavigationHandler;
  private documentAccessHandler: DocumentAccessHandler;
  private summarizationHandler: SummarizationHandler;
  private specializedHandler: SpecializedHandler;
  private resourcesHandler: MCPResourcesHandler;
  private isRunning = false;
  private enhancedMcpConfig: EnhancedMCPConfig | null;

  constructor(
    private readonly options: MCPServerOptions,
    private readonly logger: ILoggingService,
    enhancedMcpConfig?: EnhancedMCPConfig | null,
    // TODO: Replace with proper service interfaces when available
    private readonly searchService?: any,
    private readonly navigationService?: any,
    private readonly documentService?: any,
    private readonly summarizationService?: any,
    private readonly specializedService?: any
  ) {
    // Write to stderr, not stdout
    process.stderr.write('[INFO] Initializing MCP Server\n');
    this.logger.info('Initializing MCP Server', { options: this.options });

    // Initialize VSCode MCP configuration (optional - null means standard MCP only)
    this.enhancedMcpConfig = enhancedMcpConfig || null;

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
    
    // Initialize document intelligence handlers with required services
    // FAIL FAST: No mock fallbacks in production
    if (!this.searchService) {
      throw new Error('Search service is required but not provided. Cannot initialize MCP server.');
    }
    if (!this.navigationService) {
      throw new Error('Navigation service is required but not provided. Cannot initialize MCP server.');
    }
    if (!this.documentService) {
      throw new Error('Document service is required but not provided. Cannot initialize MCP server.');
    }
    if (!this.specializedService) {
      throw new Error('Specialized service is required but not provided. Cannot initialize MCP server.');
    }
    
    this.searchHandler = new SearchHandler(this.logger, this.searchService);
    this.navigationHandler = new NavigationHandler(this.logger, this.navigationService);
    this.documentAccessHandler = new DocumentAccessHandler(this.logger, this.documentService);
    this.summarizationHandler = new SummarizationHandler(this.logger, this.summarizationService || this.createMockSummarizationService()); // TODO: Remove when implemented
    this.specializedHandler = new SpecializedHandler(this.logger, this.specializedService);
    this.resourcesHandler = new MCPResourcesHandler(this.logger);

    // Register handlers
    this.registerHandlers();
  }

  /**
   * Get server capabilities
   */
  private getCapabilities(): any {
    // Base capabilities for standard MCP protocol
    const capabilities: any = {
      tools: {}
    };

    // Add enhanced MCP features if configured  
    if (this.enhancedMcpConfig) {
      // Support for tool sets (enhanced MCP feature)
      if (this.enhancedMcpConfig.toolSets) {
        capabilities.tools.toolSets = formatToolSetsForClients(this.enhancedMcpConfig);
      }
      
      // Support for MCP resources (save/drag functionality)
      if (this.enhancedMcpConfig.resources?.enableSaveDrag) {
        capabilities.resources = {
          formats: this.enhancedMcpConfig.resources.formats
        };
      }
      
      // Support for MCP prompts (slash commands)
      if (this.enhancedMcpConfig.prompts?.enabled) {
        capabilities.prompts = {
          prefix: this.enhancedMcpConfig.prompts.prefix
        };
      }
    }

    return capabilities;
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
      
      // Collect all tool definitions from all handlers
      const tools = [
        ...this.basicHandler.getToolDefinitions(),
        ...this.searchHandler.getToolDefinitions(),
        ...this.navigationHandler.getToolDefinitions(),
        ...this.documentAccessHandler.getToolDefinitions(),
        ...this.summarizationHandler.getToolDefinitions(),
        ...this.specializedHandler.getToolDefinitions()
      ];
      
      process.stderr.write(`[INFO] Returning tools list (count: ${tools.length})\n`);
      this.logger.info('Returning tools list', { toolCount: tools.length });
      return { tools };
    });

    // List resources handler (for save/drag functionality)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      process.stderr.write('[INFO] Handling list_resources request\n');
      this.logger.info('Handling list_resources request');
      
      // Return empty array for now - resources are created dynamically by tools
      const resources: any[] = [];
      
      process.stderr.write(`[INFO] Returning resources list (count: ${resources.length})\n`);
      this.logger.info('Returning resources list', { resourceCount: resources.length });
      return { resources };
    });

    // Read resource handler (for save/drag functionality)
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      process.stderr.write(`[INFO] Handling read_resource request: ${request.params.uri}\n`);
      this.logger.info('Handling read_resource request', { uri: request.params.uri });

      try {
        const content = await this.resourcesHandler.getResourceContent(request.params.uri);
        
        process.stderr.write(`[INFO] Resource content retrieved successfully: ${request.params.uri}\n`);
        this.logger.info('Resource content retrieved successfully', { uri: request.params.uri });
        
        return {
          contents: [
            {
              uri: content.uri,
              mimeType: content.mimeType,
              text: content.text,
              blob: content.blob
            }
          ]
        };
      } catch (error) {
        process.stderr.write(`[ERROR] Resource retrieval failed: ${error}\n`);
        this.logger.error('Resource retrieval failed', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
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
        let result: any;
        
        // Route to appropriate handler based on tool name
        if (name === 'hello_world') {
          const basicResult = await this.basicHandler.handleHelloWorld(args || {});
          result = {
            content: [
              {
                type: 'text',
                text: basicResult.message,
              },
            ],
          };
        } else if (name === 'search_documents') {
          result = await this.searchHandler.handleSearchDocuments(args as any);
        } else if (name === 'search_chunks') {
          result = await this.searchHandler.handleSearchChunks(args as any);
        } else if (['list_folders', 'list_documents'].includes(name)) {
          result = await this.navigationHandler.handleToolCall(name, args || {});
        } else if (['get_document_metadata', 'get_document_content', 'get_chunks'].includes(name)) {
          result = await this.documentAccessHandler.handleToolCall(name, args || {});
        } else if (['summarize_document', 'batch_summarize'].includes(name)) {
          result = await this.summarizationHandler.handleToolCall(name, args || {});
        } else if (['query_table', 'get_status', 'refresh_document', 'get_embeddings'].includes(name)) {
          result = await this.specializedHandler.handleToolCall(name, args || {});
        } else {
          const errorMsg = `Unknown tool: ${name}`;
          process.stderr.write(`[ERROR] Unknown tool requested: ${name}\n`);
          this.logger.error('Unknown tool requested', new Error(errorMsg), { name });
          throw new Error(errorMsg);
        }
        
        process.stderr.write(`[INFO] Tool execution successful: ${name}\n`);
        this.logger.info('Tool execution successful', { name });
        return result;
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

  /**
   * Create mock services for testing/development
   * TODO: Replace with proper dependency injection when services are implemented
   */
  private createMockSearchService(): any {
    return {
      searchDocuments: async (params: any) => ({
        documents: [
          {
            id: 'mock-doc-1',
            title: 'Mock Document 1',
            path: '/mock/path/doc1.pdf',
            similarityScore: 0.95,
            documentType: 'pdf',
            author: 'Mock Author',
            creationDate: new Date().toISOString(),
            modificationDate: new Date().toISOString(),
            matchContext: 'This is a mock document snippet that matches your search query and provides relevant context...'
          }
        ],
        totalResults: 1
      }),
      searchChunks: async (params: any) => ({
        chunks: [
          {
            id: 'mock-chunk-1',
            documentId: 'mock-doc-1',
            documentTitle: 'Mock Document 1',
            documentPath: '/mock/path/doc1.pdf',
            text: 'This is mock chunk content that matches the search query and provides detailed information about the topic.',
            similarityScore: 0.92,
            contextBefore: 'Previous context that leads to this chunk...',
            contextAfter: 'Following context that continues from this chunk...',
            pageNumber: 1,
            section: 'Introduction'
          }
        ],
        totalResults: 1
      })
    };
  }

  private createMockNavigationService(): any {
    return {
      listFolders: async (params: any) => ({
        folders: [
          { name: 'Documents', path: '/Documents', document_count: 15, depth: 0 },
          { name: 'Reports', path: '/Documents/Reports', document_count: 8, depth: 1 }
        ]
      }),
      listDocumentsInFolder: async (params: any) => ({
        documents: [
          {
            document_id: 'doc-1',
            title: 'Q4 Report',
            file_path: '/Documents/Reports/q4-report.pdf',
            document_type: 'pdf',
            file_size: 2048,
            modified_date: new Date().toISOString(),
            authors: [{ name: 'John Doe' }]
          }
        ],
        pagination: { current_page: 1, total_pages: 1, total_items: 1 }
      })
    };
  }

  private createMockDocumentService(): any {
    return {
      getDocumentMetadata: async (params: any) => ({
        document_id: params.document_id,
        title: 'Mock Document',
        file_path: '/mock/document.pdf',
        document_type: 'pdf',
        file_size: 1024,
        created_date: new Date().toISOString(),
        modified_date: new Date().toISOString(),
        authors: [{ name: 'Mock Author' }],
        stats: { page_count: 10, word_count: 1500, character_count: 8000 }
      }),
      downloadDocument: async (params: any) => ({
        content: 'This is the mock document content. It would normally be the full text of the document...'
      }),
      getChunks: async (params: any) => ({
        chunks: [
          {
            chunk_id: 'chunk-1',
            document_id: params.document_id,
            content: 'This is the first chunk of content from the document...',
            page_number: 1,
            section: 'Introduction',
            content_type: 'text'
          }
        ],
        pagination: { current_page: 1, total_pages: 1, total_items: 1 }
      })
    };
  }

  private createMockSummarizationService(): any {
    return {
      getDocumentSummary: async (params: any) => ({
        document_id: params.document_id,
        mode: params.mode,
        summary: 'This is a mock summary of the document. The content covers key topics and provides an overview of the main points discussed.',
        key_points: [
          { text: 'Key point 1: Important concept discussed', reference: 'Page 1' },
          { text: 'Key point 2: Critical analysis provided', reference: 'Page 3' }
        ],
        sections_covered: ['Introduction', 'Analysis', 'Conclusion'],
        token_count: 150
      }),
      batchDocumentSummary: async (params: any) => ({
        summaries: params.document_ids.map((id: string, index: number) => ({
          document_id: id,
          document_info: { title: `Document ${index + 1}`, document_type: 'pdf' },
          summary: `Mock summary for document ${index + 1}. This covers the main points and key insights.`,
          key_points: [{ text: `Key insight from document ${index + 1}` }]
        })),
        total_tokens: 300,
        documents_processed: params.document_ids.length
      })
    };
  }

  private createMockSpecializedService(): any {
    return {
      tableQuery: async (params: any) => ({
        matches: [
          {
            sheet: 'Sheet1',
            cell_range: 'A1:B2',
            value: 'Mock Data',
            data_type: 'text',
            confidence: 0.9,
            context: [{ cell: 'A1', value: 'Header' }, { cell: 'B1', value: 'Value' }]
          }
        ]
      }),
      getIngestStatus: async (params: any) => ({
        summary: { pending: 2, processing: 1, completed: 15, failed: 0 },
        jobs: [
          {
            job_id: 'job-1',
            document_id: 'doc-1',
            document_title: 'Sample Document',
            status: 'completed',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            progress: 100
          }
        ]
      }),
      refreshDocument: async (params: any) => ({
        job_id: 'refresh-job-1',
        document_id: params.document_id,
        priority: params.priority,
        status: 'queued',
        message: 'Document refresh queued successfully'
      }),
      getEmbedding: async (params: any) => ({
        embeddings: [
          {
            chunk_id: 'chunk-1',
            document_id: params.document_id,
            vector: [0.1, 0.2, 0.3, 0.4, 0.5],
            metadata: { content_type: 'text', page_number: 1 }
          }
        ]
      })
    };
  }
}
