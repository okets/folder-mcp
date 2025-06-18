// Enhanced MCP Server Framework
// This provides the MCP server functionality with new endpoint implementations

import { EventEmitter } from 'events';
import { ILoggingService } from '../../di/interfaces.js';
import { MCPEndpoints, type IMCPEndpoints } from './endpoints.js';
import type { 
  IVectorSearchService, 
  IFileParsingService, 
  IEmbeddingService,
  IFileSystemService
} from '../../di/interfaces.js';
import type { IFileSystem } from '../../domain/files/interfaces.js';

export interface MCPServerConfig {
  name: string;
  version: string;
  transport: 'stdio' | 'http';
  port?: number;
  host?: string;
}

export interface MCPCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  completion?: boolean;
}

export interface MCPRequest {
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPServer extends EventEmitter {
  private readonly logger: ILoggingService;
  private readonly config: MCPServerConfig;
  private readonly capabilities: MCPCapabilities;
  private readonly endpoints: IMCPEndpoints;
  private isRunning = false;

  constructor(
    config: MCPServerConfig, 
    capabilities: MCPCapabilities = {},
    folderPath: string,
    vectorSearchService: IVectorSearchService,
    fileParsingService: IFileParsingService,
    embeddingService: IEmbeddingService,
    fileSystemService: IFileSystemService,
    fileSystem: IFileSystem,
    logger?: ILoggingService
  ) {
    super();
    this.config = config;
    this.capabilities = capabilities;    this.logger = logger || {
      debug: (msg: string) => console.debug(`[MCPServer] ${msg}`),
      info: (msg: string) => console.info(`[MCPServer] ${msg}`),
      warn: (msg: string) => console.warn(`[MCPServer] ${msg}`),
      error: (msg: string) => console.error(`[MCPServer] ${msg}`),
      fatal: (msg: string) => console.error(`[MCPServer] FATAL: ${msg}`),
      setLevel: () => {} // No-op for fallback logger
    };

    // Initialize the endpoints
    this.endpoints = new MCPEndpoints(
      folderPath,
      vectorSearchService,
      fileParsingService,
      embeddingService,
      fileSystemService,
      fileSystem,
      this.logger
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('MCP Server is already running');
    }

    this.logger.info(`Starting MCP Server: ${this.config.name} v${this.config.version}`);
    this.logger.info(`Transport: ${this.config.transport}`);
    
    if (this.config.transport === 'http' && this.config.port) {
      this.logger.info(`Port: ${this.config.port}`);
    }

    this.isRunning = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping MCP Server');
    this.isRunning = false;
    this.emit('stopped');
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    this.logger.debug(`Handling request: ${request.method}`, { id: request.id });

    try {
      // Route to appropriate endpoint or handler
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        case 'ping':
          return this.handlePing(request);
          // New MCP Endpoints
        case 'search':
          return {
            id: request.id,
            result: await this.endpoints.search(request.params)
          };
        case 'get_document_outline':
          return {
            id: request.id,
            result: await this.endpoints.getDocumentOutline(request.params)
          };
        case 'get_document_data':
          return {
            id: request.id,
            result: await this.endpoints.getDocumentData(request.params)
          };
        case 'list_folders':
          return {
            id: request.id,
            result: await this.endpoints.listFolders()
          };
        case 'list_documents':
          return {
            id: request.id,
            result: await this.endpoints.listDocuments(request.params)
          };
        case 'get_sheet_data':
          return {
            id: request.id,
            result: await this.endpoints.getSheetData(request.params)
          };
        case 'get_slides':
          return {
            id: request.id,
            result: await this.endpoints.getSlides(request.params)
          };
        case 'get_pages':
          return {
            id: request.id,
            result: await this.endpoints.getPages(request.params)
          };
        case 'get_embedding':
          return {
            id: request.id,
            result: await this.endpoints.getEmbedding(request.params)
          };
        case 'get_status':
          return {
            id: request.id,
            result: await this.endpoints.getStatus(request.params)
          };
        
        default:
          return {
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
      }
    } catch (error) {
      this.logger.error(`Error handling ${request.method}`, error as Error);
      
      return {
        id: request.id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: { method: request.method, params: request.params }
        }
      };
    }
  }

  private async handleInitialize(request: MCPRequest): Promise<MCPResponse> {
    return {
      id: request.id,
      result: {
        protocolVersion: '1.0',
        capabilities: this.capabilities,
        serverInfo: {
          name: this.config.name,
          version: this.config.version
        }
      }
    };
  }

  private async handlePing(request: MCPRequest): Promise<MCPResponse> {
    return {
      id: request.id,
      result: { status: 'ok', timestamp: Date.now() }
    };
  }

  getConfig(): MCPServerConfig {
    return { ...this.config };
  }

  getCapabilities(): MCPCapabilities {
    return { ...this.capabilities };
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  getEndpoints(): IMCPEndpoints {
    return this.endpoints;
  }
}