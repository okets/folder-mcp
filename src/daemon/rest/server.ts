/**
 * REST API Server for MCP Operations
 * 
 * This server provides stateless HTTP endpoints for MCP clients to access
 * multi-folder operations. It runs alongside the WebSocket server which 
 * continues to serve TUI real-time updates.
 */

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'http';
import os from 'os';
import path from 'node:path';
import { FMDMService } from '../services/fmdm-service.js';
import { FoldersListResponse, FolderInfo, DocumentsListResponse, DocumentListParams, DocumentDataResponse, DocumentOutlineResponse, SearchRequest, SearchResponse, EnhancedServerInfoResponse } from './types.js';
import { DocumentService } from '../services/document-service.js';
import { IModelRegistry } from '../services/model-registry.js';
import { IVectorSearchService } from '../../di/interfaces.js';
import type { TextChunk, EmbeddingVector } from '../../types/index.js';
import { createDefaultSemanticMetadata } from '../../types/index.js';
import { PythonEmbeddingService } from '../../infrastructure/embeddings/python-embedding-service.js';
import { ONNXEmbeddingService, EmbeddingResult } from '../../infrastructure/embeddings/onnx/onnx-embedding-service.js';
import { MultiFolderVectorSearchService } from '../../infrastructure/storage/multi-folder-vector-search.js';
import { PathNormalizer } from '../utils/path-normalizer.js';
import { SemanticMetadataService } from '../services/semantic-metadata-service.js';
import { getDefaultModelId } from '../../config/model-registry.js';

// Types for REST API
export interface HealthResponse {
  status: 'healthy' | 'starting' | 'error';
  uptime: number;
  version: string;
  timestamp: string;
}

export interface ServerInfoResponse {
  version: string;
  capabilities: {
    cpuCount: number;
    totalMemory: number;
    supportedModels: string[];
  };
  daemon: {
    uptime: number;
    folderCount: number;
    activeFolders: number;
    indexingFolders: number;
    totalDocuments: number;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  path?: string;
}

// Request logging interface
interface RequestLog {
  method: string;
  url: string;
  userAgent: string | undefined;
  timestamp: string;
  ip: string;
}

/**
 * REST API Server for MCP operations
 */
export class RESTAPIServer {
  private app: Application;
  private server: Server | null = null;
  private startTime: Date;
  private semanticService: SemanticMetadataService;

  constructor(
    private fmdmService: FMDMService,
    private documentService: DocumentService,
    private modelRegistry: IModelRegistry,
    private vectorSearchService: IVectorSearchService,
    private logger: {
      info: (message: string, ...args: any[]) => void;
      warn: (message: string, ...args: any[]) => void;
      error: (message: string, ...args: any[]) => void;
      debug: (message: string, ...args: any[]) => void;
    }
  ) {
    this.app = express();
    this.startTime = new Date();
    // Initialize semantic metadata service
    // The SemanticMetadataService will use the default database path
    this.semanticService = new SemanticMetadataService(this.logger);
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }));

    // CORS configuration - allow all origins for development
    this.app.use(cors({
      origin: true,
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    }));

    // JSON parsing with size limits
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use(this.requestLogger.bind(this));
  }

  /**
   * Configure API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/api/v1/health', this.handleHealth.bind(this));

    // Server information endpoint
    this.app.get('/api/v1/server/info', this.handleServerInfo.bind(this));

    // Folder operations endpoints (Sprint 5)
    this.app.get('/api/v1/folders', this.handleListFolders.bind(this));
    this.app.get('/api/v1/folders/:folderPath/documents', this.handleListDocuments.bind(this));

    // Document operations endpoints (Sprint 6) 
    this.app.get('/api/v1/folders/:folderPath/documents/:docId', this.handleGetDocument.bind(this));
    this.app.get('/api/v1/folders/:folderPath/documents/:docId/outline', this.handleGetDocumentOutline.bind(this));

    // Search operations endpoints (Sprint 7)
    this.app.post('/api/v1/folders/:folderPath/search', this.handleSearch.bind(this));

    // Root path for API discovery
    this.app.get('/api/v1', this.handleApiRoot.bind(this));
    this.app.get('/api', this.handleApiRoot.bind(this));

    // Handle 404 for unknown routes
    this.app.use(this.handleNotFound.bind(this));

    // Global error handling middleware (must be last)
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Request logging middleware
   */
  private requestLogger(req: Request, _res: Response, next: NextFunction): void {
    const log: RequestLog = {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
      ip: req.ip || 'unknown'
    };

    this.logger.debug(`[REST] ${log.method} ${log.url} from ${log.ip}`);
    next();
  }

  /**
   * Global error handler
   */
  private errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    this.logger.error(`[REST] Error processing ${req.method} ${req.url}:`, err);

    const errorResponse: ErrorResponse = {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred processing your request',
      timestamp: new Date().toISOString(),
      path: req.url
    };

    // Don't send error if response already started
    if (!res.headersSent) {
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Health check endpoint
   */
  private async handleHealth(_req: Request, res: Response): Promise<void> {
    try {
      const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      
      const response: HealthResponse = {
        status: 'healthy',
        uptime,
        version: '2.0.0-dev',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      this.logger.error('[REST] Health check failed:', error);
      
      const errorResponse: HealthResponse = {
        status: 'error',
        uptime: 0,
        version: '2.0.0-dev',
        timestamp: new Date().toISOString()
      };
      
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Server information endpoint - Phase 10 Sprint 0 Enhanced
   */
  private async handleServerInfo(req: Request, res: Response): Promise<void> {
    try {
      // Get folder statistics - handle case where fmdm might not be initialized
      let folders: any[] = [];
      let activeFolders = 0;
      let indexingFolders = 0;

      try {
        const fmdm = this.fmdmService.getFMDM();
        folders = fmdm?.folders || [];
        activeFolders = folders.filter((f: any) => f?.status === 'active').length;
        indexingFolders = folders.filter((f: any) => f?.status === 'indexing' || f?.status === 'pending').length;
      } catch (fmdmError) {
        this.logger.warn('[REST] Could not retrieve FMDM data:', fmdmError);
        // Continue with empty folders array
      }

      // Get supported models from registry
      const { getSupportedGpuModelIds, getSupportedCpuModelIds } = await import('../../config/model-registry.js');
      const supportedModels = [...getSupportedGpuModelIds(), ...getSupportedCpuModelIds()];

      // Calculate total documents and chunks by getting real counts from databases
      let totalDocuments = 0;
      let totalChunks = 0;
      for (const folder of folders) {
        try {
          const dbPath = `${folder.path}/.folder-mcp/embeddings.db`;
          const fs = await import('fs/promises');
          try {
            await fs.access(dbPath);
            const Database = await import('better-sqlite3');
            const db = Database.default(dbPath);
            const docResult = db.prepare('SELECT COUNT(*) as count FROM documents').get() as any;
            const chunkResult = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as any;
            totalDocuments += docResult?.count || 0;
            totalChunks += chunkResult?.count || 0;
            db.close();
          } catch (dbError) {
            // Database doesn't exist, skip this folder
          }
        } catch (error) {
          // Error accessing folder, skip
        }
      }

      // Get supported file extensions
      const { getSupportedExtensions } = await import('../../domain/files/supported-extensions.js');
      const supportedExtensions = getSupportedExtensions();

      const response: EnhancedServerInfoResponse = {
        server_info: {
          name: "folder-mcp",
          version: "2.0.0-dev",
          description: "Semantic file system access with multi-folder support"
        },
        capabilities: {
          total_folders: folders.length,
          total_documents: totalDocuments,
          total_chunks: totalChunks,
          semantic_search: true,
          key_phrase_extraction: true,
          file_types_supported: [...supportedExtensions],
          binary_file_support: true,
          max_file_size_mb: 50,
          embedding_models: supportedModels
        },
        available_endpoints: {
          exploration: [
            {
              name: "list_folders",
              purpose: "List all indexed folders with semantic previews",
              returns: "Array of folders with aggregated key phrases",
              use_when: "Starting exploration or choosing a knowledge base"
            },
            {
              name: "explore",
              purpose: "Navigate folder hierarchy with breadcrumbs",
              returns: "Current location, subdirectories, and semantic context",
              use_when: "Understanding folder structure"
            },
            {
              name: "list_documents",
              purpose: "List documents in a specific location",
              returns: "Documents with key phrases in current path",
              use_when: "Browsing documents after narrowing location"
            },
            {
              name: "get_document_metadata",
              purpose: "Get document metadata and structure with chunk navigation",
              returns: "Document metadata and chunks with semantic information",
              use_when: "Understanding document structure before reading"
            },
            {
              name: "get_chunks",
              purpose: "Retrieve specific chunks identified from metadata",
              returns: "Content of requested chunks with their metadata",
              use_when: "Reading specific sections after exploring metadata"
            }
          ],
          content_retrieval: [
            {
              name: "get_document_text",
              purpose: "Get extracted plain text from any document type",
              returns: "Clean text string from PDF/DOCX/etc",
              use_when: "Reading document content for analysis"
            },
            {
              name: "get_document_data",
              purpose: "Get document content and metadata",
              returns: "Full document with content and metadata",
              use_when: "Accessing complete document information"
            },
            {
              name: "get_document_outline",
              purpose: "Get document structure and outline",
              returns: "Hierarchical structure of document sections",
              use_when: "Understanding document organization"
            },
            {
              name: "get_document_raw",
              purpose: "Get original file content",
              returns: "Base64 for binary, UTF-8 for text files",
              use_when: "Need original file, images, or exact formatting"
            }
          ],
          search: [
            {
              name: "search",
              purpose: "Semantic search across all documents",
              returns: "Relevant chunks with explanations",
              use_when: "Finding specific information quickly"
            }
          ]
        },
        usage_hints: {
          exploration_flow: "get_server_info → list_folders → explore → list_documents → get_document_text",
          search_flow: "get_server_info → search → get_document_text",
          tip: "Use exploration for understanding structure, search for specific queries"
        }
      };

      res.json(response);
    } catch (error) {
      this.logger.error('[REST] Server info failed:', error);

      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: 'Failed to retrieve server information',
        timestamp: new Date().toISOString(),
        path: req.url
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * List all folders endpoint (Sprint 5)
   */
  private async handleListFolders(req: Request, res: Response): Promise<void> {
    try {
      this.logger.debug('[REST] Listing folders');
      
      // Get folders from FMDM service
      let folders: any[] = [];
      try {
        const fmdm = this.fmdmService.getFMDM();
        folders = fmdm?.folders || [];
      } catch (fmdmError) {
        this.logger.warn('[REST] Could not retrieve FMDM data for folders:', fmdmError);
        // Continue with empty folders array
      }

      // Transform FMDM folders to REST API format with real document counts
      const folderInfos: FolderInfo[] = await Promise.all(folders.map(async (folder: any) => {
        // Extract folder name from path
        const folderName = this.extractFolderName(folder.path);
        
        // Get real document count and last indexed time from database
        let documentCount = 0;
        let lastIndexed: string | undefined;
        try {
          // Try to get document count from the vector search service
          if (this.vectorSearchService && 'getDocumentCount' in this.vectorSearchService) {
            documentCount = await (this.vectorSearchService as any).getDocumentCount(folder.path);
            // For vector search service, we still need to query the database for lastIndexed
            // Use direct SQLite query to get the timestamp
            const dbPath = `${folder.path}/.folder-mcp/embeddings.db`;
            const fs = await import('fs/promises');
            try {
              await fs.access(dbPath);
              const Database = await import('better-sqlite3');
              const db = Database.default(dbPath);
              const lastIndexedResult = db.prepare('SELECT MAX(last_indexed) as last_indexed FROM documents').get() as any;
              if (lastIndexedResult?.last_indexed) {
                lastIndexed = lastIndexedResult.last_indexed;
              }
              db.close();
            } catch (dbError) {
              // Database doesn't exist or can't be read
              lastIndexed = undefined;
            }
          } else {
            // Fallback: check if database exists and count documents
            const dbPath = `${folder.path}/.folder-mcp/embeddings.db`;
            const fs = await import('fs/promises');
            try {
              await fs.access(dbPath);
              // Use sqlite to count documents and get last indexed time
              const Database = await import('better-sqlite3');
              const db = Database.default(dbPath);
              const result = db.prepare('SELECT COUNT(*) as count FROM documents').get() as any;
              documentCount = result?.count || 0;
              
              // Get the most recent last_indexed timestamp from documents table
              const lastIndexedResult = db.prepare('SELECT MAX(last_indexed) as last_indexed FROM documents').get() as any;
              if (lastIndexedResult?.last_indexed) {
                lastIndexed = lastIndexedResult.last_indexed;
              }
              
              db.close();
            } catch (dbError) {
              // Database doesn't exist or can't be read
              documentCount = 0;
              lastIndexed = undefined;
            }
          }
        } catch (error) {
          this.logger.warn(`[REST] Could not get document count for ${folder.path}:`, error);
          documentCount = folder.documentCount || 0; // Fallback to FMDM value
          lastIndexed = undefined;
        }
        
        const folderInfo: any = {
          id: folder.path, // Use path as identifier
          name: folderName,
          path: folder.path,
          model: folder.model || (() => {
            const { getDefaultModelId } = require('../../config/model-registry.js');
            return getDefaultModelId();
          })(),
          status: folder.status || 'pending',
          documentCount,
          progress: folder.progress,
          notification: folder.notification
        };
        
        // Only add lastIndexed if we have a value
        if (lastIndexed) {
          folderInfo.lastIndexed = lastIndexed;
        }
        
        // Add semantic metadata for active folders (Sprint 10)
        if (folder.status === 'active' && folder.path) {
          try {
            const semanticData = await this.semanticService.getFolderSemanticMetadata(folder.path);
            if (semanticData) {
              folderInfo.keyPhrases = semanticData.keyPhrases || [];
              folderInfo.contentComplexity = semanticData.contentComplexity;
              folderInfo.avgReadabilityScore = semanticData.avgReadabilityScore;
            }
          } catch (semanticError) {
            this.logger.debug(`[REST] Could not get semantic metadata for ${folder.path}:`, semanticError);
            // Continue without semantic metadata
          }
        }
        
        return folderInfo;
      }));

      const response: FoldersListResponse = {
        folders: folderInfos,
        totalCount: folderInfos.length
      };

      this.logger.debug(`[REST] Returning ${folderInfos.length} folders`);
      res.json(response);
    } catch (error) {
      this.logger.error('[REST] List folders failed:', error);
      
      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: 'Failed to retrieve folder list',
        timestamp: new Date().toISOString(),
        path: req.url
      };
      
      res.status(500).json(errorResponse);
    }
  }

  /**
   * List documents in a folder endpoint (Sprint 5)
   */
  private async handleListDocuments(req: Request, res: Response): Promise<void> {
    try {
      const encodedFolderPath = req.params.folderPath;
      if (!encodedFolderPath) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder path is required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }
      
      const folderPath = decodeURIComponent(encodedFolderPath);
      this.logger.debug(`[REST] Listing documents for folder: ${folderPath}`);

      // Parse query parameters
      const params: DocumentListParams = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sort: (req.query.sort as any) || 'name',
        order: (req.query.order as any) || 'asc',
        type: req.query.type as string
      };

      // Validate parameters
      if (params.limit && (params.limit < 1 || params.limit > 1000)) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Limit must be between 1 and 1000',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      if (params.offset && params.offset < 0) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Offset must be non-negative',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Get folders from FMDM service
      let folders: any[] = [];
      try {
        const fmdm = this.fmdmService.getFMDM();
        folders = fmdm?.folders || [];
      } catch (fmdmError) {
        this.logger.warn('[REST] Could not retrieve FMDM data for documents:', fmdmError);
        const errorResponse: ErrorResponse = {
          error: 'Internal Server Error',
          message: 'Failed to access folder data',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(500).json(errorResponse);
        return;
      }

      // Find folder using normalized path matching
      const folder = PathNormalizer.findByPath(folders, folderPath);
      if (!folder) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${folderPath}' not found. Available folders: ${folders.map(f => f.path || 'unknown').join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      const folderName = this.extractFolderName(folderPath);

      // List documents using document service
      const modelName = folder.model || getDefaultModelId();
      const result = await this.documentService.listDocuments(
        folderPath,
        folderPath, // Use path as identifier
        folderName,
        modelName,
        folder.status || 'pending',
        params
      );

      // Add semantic metadata to each document (Sprint 10)
      if (result.documents && result.documents.length > 0) {
        try {
          const enrichedDocuments = await Promise.all(result.documents.map(async (doc: any) => {
            try {
              // Get semantic data for this document from the database
              const documentPath = path.join(folderPath, doc.path);
              const semanticData = await this.semanticService.getDocumentSemanticSummary(documentPath);
              
              if (semanticData) {
                doc.semanticSummary = {
                  keyPhrases: semanticData.keyPhrases || [],
                  primaryPurpose: semanticData.primaryPurpose,
                  contentType: semanticData.contentType
                };
              }
              
              return doc;
            } catch (semanticError) {
              this.logger.debug(`[REST] Could not get semantic data for ${doc.name}:`, semanticError);
              // Return document without semantic data
              return doc;
            }
          }));
          
          result.documents = enrichedDocuments;
        } catch (enrichmentError) {
          this.logger.warn('[REST] Failed to enrich documents with semantic data:', enrichmentError);
          // Continue with unenriched documents
        }
      }

      const response: DocumentsListResponse = result;

      this.logger.debug(`[REST] Returning ${result.documents.length} documents from folder ${folderPath}`);
      res.json(response);
    } catch (error) {
      this.logger.error('[REST] List documents failed:', error);
      
      let statusCode = 500;
      let message = 'Failed to retrieve document list';
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          statusCode = 404;
          message = error.message;
        } else if (error.message.includes('not a directory')) {
          statusCode = 400;
          message = error.message;
        }
      }

      const errorResponse: ErrorResponse = {
        error: statusCode === 404 ? 'Not Found' : statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
        message,
        timestamp: new Date().toISOString(),
        path: req.url
      };
      
      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Get specific document with full content (Sprint 6)
   */
  private async handleGetDocument(req: Request, res: Response): Promise<void> {
    try {
      const { folderPath: encodedFolderPath, docId } = req.params;
      if (!encodedFolderPath || !docId) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder path and document ID are required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      const folderPath = decodeURIComponent(encodedFolderPath);
      this.logger.debug(`[REST] Getting document ${docId} from folder ${folderPath}`);

      // Get folders from FMDM service
      let folders: any[] = [];
      try {
        const fmdm = this.fmdmService.getFMDM();
        folders = fmdm?.folders || [];
      } catch (fmdmError) {
        this.logger.warn('[REST] Could not retrieve FMDM data for document retrieval:', fmdmError);
        const errorResponse: ErrorResponse = {
          error: 'Internal Server Error',
          message: 'Failed to access folder data',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(500).json(errorResponse);
        return;
      }

      // Find folder using normalized path matching
      const folder = PathNormalizer.findByPath(folders, folderPath);
      if (!folder) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${folderPath}' not found. Available folders: ${folders.map(f => f.path || 'unknown').join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      const folderName = this.extractFolderName(folderPath);

      // Get document data using document service
      const modelName = folder.model || getDefaultModelId();
      const result = await this.documentService.getDocumentData(
        folderPath,
        folderPath, // Use path as identifier
        folderName,
        modelName,
        folder.status || 'pending',
        docId
      );

      const response: DocumentDataResponse = result;

      // Add semantic metadata to document (Sprint 10)
      if (response.document) {
        try {
          // Get the actual file path from the document metadata
          const documentPath = response.document.metadata?.filePath;
          
          if (!documentPath) {
            this.logger.debug(`[REST] No file path in metadata for document ${docId}`);
            return;
          }
          
          this.logger.debug(`[REST] Attempting to get semantic metadata for path: ${documentPath}`);
          const semanticData = await this.semanticService.getDocumentSemanticSummary(documentPath);
          
          if (semanticData) {
            response.document.semanticMetadata = {
              primaryPurpose: semanticData.primaryPurpose,
              keyPhrases: semanticData.keyPhrases || [],
              complexityLevel: semanticData.complexityLevel,
              contentType: semanticData.contentType,
              hasCodeExamples: semanticData.hasCodeExamples,
              hasDiagrams: semanticData.hasDiagrams
            };
            this.logger.debug(`[REST] Successfully added semantic metadata for document ${docId}`);
          } else {
            this.logger.debug(`[REST] No semantic data returned for ${documentPath}`);
          }
        } catch (semanticError) {
          this.logger.debug(`[REST] Could not get semantic metadata for ${docId}:`, semanticError);
        }
      }

      this.logger.debug(`[REST] Returning document data for ${docId} from folder ${folderPath}`);
      res.json(response);
    } catch (error) {
      this.logger.error('[REST] Get document failed:', error);
      
      let statusCode = 500;
      let message = 'Failed to retrieve document';
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          statusCode = 404;
          message = error.message;
        } else if (error.message.includes('not supported') || error.message.includes('invalid')) {
          statusCode = 400;
          message = error.message;
        }
      }

      const errorResponse: ErrorResponse = {
        error: statusCode === 404 ? 'Not Found' : statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
        message,
        timestamp: new Date().toISOString(),
        path: req.url
      };
      
      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Get document outline/structure (Sprint 6)
   */
  private async handleGetDocumentOutline(req: Request, res: Response): Promise<void> {
    try {
      const { folderPath: encodedFolderPath, docId } = req.params;
      if (!encodedFolderPath || !docId) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder path and document ID are required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      const folderPath = decodeURIComponent(encodedFolderPath);
      this.logger.debug(`[REST] Getting document outline for ${docId} from folder ${folderPath}`);

      // Get folders from FMDM service
      let folders: any[] = [];
      try {
        const fmdm = this.fmdmService.getFMDM();
        folders = fmdm?.folders || [];
      } catch (fmdmError) {
        this.logger.warn('[REST] Could not retrieve FMDM data for document outline:', fmdmError);
        const errorResponse: ErrorResponse = {
          error: 'Internal Server Error',
          message: 'Failed to access folder data',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(500).json(errorResponse);
        return;
      }

      // Find folder using normalized path matching
      const folder = PathNormalizer.findByPath(folders, folderPath);
      if (!folder) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${folderPath}' not found. Available folders: ${folders.map(f => f.path || 'unknown').join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      const folderName = this.extractFolderName(folderPath);

      // Get document outline using document service
      const modelName = folder.model || getDefaultModelId();
      const result = await this.documentService.getDocumentOutline(
        folderPath,
        folderPath, // Use path as identifier
        folderName,
        modelName,
        folder.status || 'pending',
        docId
      );

      const response: DocumentOutlineResponse = result;

      // Add semantic enrichment to outline sections (Sprint 10)
      if (response.outline) {
        try {
          // Get the actual file path from the outline metadata
          const documentPath = response.outline.metadata?.filePath;
          
          if (!documentPath) {
            this.logger.debug(`[REST] No file path in outline metadata for document ${docId}`);
          } else {
            // For markdown/text files with headings, add semantic data
            if (response.outline.headings) {
              // Only process headings which have lineNumber
              const headings = response.outline.headings || [];
              
              if (headings.length > 0) {
                // Get all chunks for the document with their semantic data
                this.logger.debug(`[REST] Attempting chunk-based enrichment for ${documentPath}`);
                const chunks = await this.semanticService.getDocumentChunksForSections(documentPath);
                
                if (chunks && chunks.length > 0) {
                  this.logger.debug(`[REST] Found ${chunks.length} chunks, proceeding with chunk-based mapping`);
                  // Read the file to convert line numbers to byte offsets
                  const fs = await import('fs');
                  const fileContent = await fs.promises.readFile(documentPath, 'utf-8');
                  const lines = fileContent.split('\n');
                  
                  // Create line-to-byte offset mapping
                  const lineOffsets: number[] = [0]; // Line 1 starts at byte 0
                  let currentOffset = 0;
                  for (let i = 0; i < lines.length; i++) {
                    currentOffset += Buffer.byteLength(lines[i] + '\n', 'utf-8');
                    lineOffsets.push(currentOffset);
                  }
                  
                  // Map chunks to sections based on position overlap
                  for (const heading of headings) {
                    // Get byte offset for this heading's line
                    const lineNumber = heading.lineNumber || 0;
                    if (lineNumber > 0 && lineNumber <= lineOffsets.length) {
                      const sectionStartOffset = lineOffsets[lineNumber - 1];
                      
                      // Find the next heading to determine end offset
                      const nextHeadingIndex = headings.findIndex((h, idx) => 
                        idx > headings.indexOf(heading) && (h.lineNumber || 0) > lineNumber
                      );
                      const nextHeading = nextHeadingIndex >= 0 ? headings[nextHeadingIndex] : null;
                      const sectionEndOffset = nextHeading && nextHeading.lineNumber && nextHeading.lineNumber > 0
                        ? lineOffsets[nextHeading.lineNumber - 1]
                        : currentOffset; // Use end of file if last section
                      
                      // Skip if we couldn't determine offsets
                      if (typeof sectionStartOffset !== 'number' || typeof sectionEndOffset !== 'number') {
                        continue;
                      }
                      
                      // Find chunks that overlap with this section
                      const overlappingChunks = chunks.filter(chunk =>
                        chunk.start_offset < sectionEndOffset && chunk.end_offset > sectionStartOffset
                      );
                      
                      if (overlappingChunks.length > 0) {
                        // Aggregate semantic data from overlapping chunks
                        const phraseCounts = new Map<string, number>();
                        let hasCode = false;
                        
                        for (const chunk of overlappingChunks) {
                          
                          // Count key phrases
                          for (const phrase of chunk.keyPhrases) {
                            phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
                          }
                          
                          hasCode = hasCode || chunk.hasCode;
                        }
                        
                        // Sort and select top items
                        
                        const keyPhrases = Array.from(phraseCounts.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([phrase]) => phrase);
                        
                        // Add semantics to heading
                        heading.semantics = {
                          keyPhrases,
                          hasCodeExamples: hasCode,
                          subsectionCount: 0, // Could be calculated from heading levels
                          codeLanguages: [] // Would need code language detection
                        };
                      }
                    }
                  }
                  
                  const enrichedCount = headings.filter(h => h.semantics).length;
                  this.logger.debug(`[REST] Added chunk-based semantic enrichment to ${enrichedCount} headings`);
                } else {
                  // Fallback to document-level semantics if no chunks found
                  this.logger.debug(`[REST] No chunks found, using document-level fallback for ${documentPath}`);
                  const semanticData = await this.semanticService.getDocumentSemanticSummary(documentPath);
                  
                  if (semanticData) {
                    const enrichedHeadings = headings.slice(0, 20);
                    for (const heading of enrichedHeadings) {
                      heading.semantics = {
                        keyPhrases: semanticData.keyPhrases?.slice(0, 5) || [],
                        hasCodeExamples: semanticData.hasCodeExamples || false,
                        subsectionCount: 0,
                        codeLanguages: []
                      };
                    }
                    this.logger.debug(`[REST] Used document-level semantics (fallback) for ${enrichedHeadings.length} headings`);
                  }
                }
              }
            } else if (response.outline.sections) {
              // Handle sections (Word/PDF) which don't have line numbers
              // For these, we'll just apply document-level semantics
              const sections = response.outline.sections || [];
              
              if (sections.length > 0) {
                const semanticData = await this.semanticService.getDocumentSemanticSummary(documentPath);
                
                if (semanticData) {
                  const enrichedSections = sections.slice(0, 20);
                  for (const section of enrichedSections) {
                    section.semantics = {
                      keyPhrases: semanticData.keyPhrases?.slice(0, 5) || [],
                      hasCodeExamples: semanticData.hasCodeExamples || false,
                      subsectionCount: 0,
                      codeLanguages: []
                    };
                  }
                  this.logger.debug(`[REST] Applied document-level semantics to ${enrichedSections.length} sections`);
                }
              }
            }
          }
        } catch (semanticError) {
          this.logger.debug(`[REST] Could not add semantic enrichment to outline:`, semanticError);
        }
      }

      this.logger.debug(`[REST] Returning document outline for ${docId} from folder ${folderPath}`);
      res.json(response);
    } catch (error) {
      this.logger.error('[REST] Get document outline failed:', error);
      
      let statusCode = 500;
      let message = 'Failed to retrieve document outline';
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          statusCode = 404;
          message = error.message;
        } else if (error.message.includes('not supported') || error.message.includes('invalid')) {
          statusCode = 400;
          message = error.message;
        }
      }

      const errorResponse: ErrorResponse = {
        error: statusCode === 404 ? 'Not Found' : statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
        message,
        timestamp: new Date().toISOString(),
        path: req.url
      };
      
      res.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Search for documents within a folder (Sprint 7)
   */
  private async handleSearch(req: Request, res: Response): Promise<void> {
    try {
      const { folderPath: encodedFolderPath } = req.params;
      if (!encodedFolderPath) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder path is required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      const folderPath = decodeURIComponent(encodedFolderPath);

      // Parse search request body
      const searchRequest = req.body as SearchRequest;
      if (!searchRequest || !searchRequest.query || typeof searchRequest.query !== 'string') {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Search query is required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      const { query } = searchRequest;

      // Parse and validate parameters - fix threshold 0.0 handling
      const limit = Math.min(Math.max((typeof searchRequest.limit === 'number' ? searchRequest.limit : 10), 1), 100);
      const threshold = Math.min(Math.max((typeof searchRequest.threshold === 'number' ? searchRequest.threshold : 0.3), 0.0), 1.0);
      const includeContent = searchRequest.includeContent !== false; // default true

      this.logger.debug(`[REST] Searching folder ${folderPath} for: "${query}" (limit: ${limit}, threshold: ${threshold})`);

      // Get folders from FMDM service to validate folder exists
      let folders: any[] = [];
      try {
        const fmdm = this.fmdmService.getFMDM();
        folders = fmdm?.folders || [];
      } catch (fmdmError) {
        this.logger.warn('[REST] Could not retrieve FMDM data for search:', fmdmError);
        const errorResponse: ErrorResponse = {
          error: 'Internal Server Error',
          message: 'Failed to access folder data',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(500).json(errorResponse);
        return;
      }

      // Find folder using normalized path matching and validate folder exists
      const folder = PathNormalizer.findByPath(folders, folderPath);
      if (!folder) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${folderPath}' not found. Available folders: ${folders.map(f => f.path || 'unknown').join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }
      const folderName = this.extractFolderName(folderPath);
      const modelName = folder.model || getDefaultModelId();

      // Sprint 7: Implement actual search functionality with model registry
      const startTime = Date.now();
      
      // Load or get model for this folder
      const modelLoadResult = await this.modelRegistry.getModelForFolder(folderPath, folderPath, modelName);
      
      if (!modelLoadResult.success) {
        const errorResponse: ErrorResponse = {
          error: 'Service Unavailable',
          message: `Failed to load embedding model '${modelName}' for folder '${folderPath}': ${modelLoadResult.error}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(503).json(errorResponse);
        return;
      }

      // Get the loaded model instance
      const loadedModel = this.modelRegistry.getLoadedModel(modelName);
      if (!loadedModel) {
        const errorResponse: ErrorResponse = {
          error: 'Internal Server Error',
          message: `Model '${modelName}' loaded but not accessible`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(500).json(errorResponse);
        return;
      }

      // Sprint 7: Implement actual vector search using the loaded model and vector search service
      const searchStartTime = Date.now();
      let searchResults: any[] = [];
      
      try {
        // Generate embedding for the search query using the loaded model's service
        this.logger.debug(`[REST] Generating embedding for query: "${query}"`);
        let queryEmbeddings: EmbeddingVector[];
        
        // Check service type and call appropriate method
        if (loadedModel.service instanceof PythonEmbeddingService) {
          // PythonEmbeddingService - expects TextChunk[]
          const chunks: TextChunk[] = [{
            content: query,
            chunkIndex: 0,
            startPosition: 0,
            endPosition: query.length,
            tokenCount: undefined as any, // let service compute if needed
            metadata: {
              sourceFile: 'search-query',
              sourceType: 'text',
              totalChunks: 1,
              hasOverlap: false
            },
            semanticMetadata: createDefaultSemanticMetadata()
          }];
          queryEmbeddings = await loadedModel.service.generateEmbeddings(chunks);
        } else if (loadedModel.service instanceof ONNXEmbeddingService) {
          // ONNXEmbeddingService - expects string[] and returns EmbeddingResult
          const embeddingResult: EmbeddingResult = await loadedModel.service.generateEmbeddingsFromStrings([query], 'query');
          // Convert EmbeddingResult to EmbeddingVector[]
          queryEmbeddings = embeddingResult.embeddings.map((embedding, index) => ({
            vector: embedding,
            dimensions: embeddingResult.dimensions,
            model: embeddingResult.modelUsed,
            createdAt: new Date().toISOString()
          }));
        } else {
          // Unknown service type
          throw new Error(`Model service type doesn't support embedding generation: ${typeof loadedModel.service}`);
        }
        
        if (!queryEmbeddings || queryEmbeddings.length === 0) {
          this.logger.error(`[REST] Failed to generate embedding for query: "${query}"`);
          const errorResponse: ErrorResponse = {
            error: 'Internal Server Error',
            message: 'Failed to generate embedding for search query',
            timestamp: new Date().toISOString(),
            path: req.url
          };
          res.status(500).json(errorResponse);
          return;
        }

        // Perform vector search - request more results for folder filtering
        this.logger.debug(`[REST] Performing vector search with threshold: ${threshold}, initial limit: ${limit * 2}`);
        
        const firstEmbedding = queryEmbeddings[0];
        if (!firstEmbedding) {
          throw new Error('Generated embedding is empty or invalid');
        }
        
        // Request more results to account for folder filtering
        // Use folder-specific search with MultiFolderVectorSearchService
        const vectorSearchResults = await (this.vectorSearchService as MultiFolderVectorSearchService)
          .searchInFolder(firstEmbedding, folderPath, limit * 2, threshold);
        
        // Filter results to current folder - fix folder scoping security issue
        const normalizedFolder = path.resolve(folderPath);
        const folderFilteredResults = vectorSearchResults.filter(result => {
          const rawPath = result.documentId || result.folderPath || '';
          const normalizedResult = path.resolve(rawPath);
          const rel = path.relative(normalizedFolder, normalizedResult);
          const belongsToFolder = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
          
          if (!belongsToFolder) {
            this.logger.debug(`[REST] Filtering out result from different folder: ${rawPath} (expected under: ${normalizedFolder})`);
          }
          
          return belongsToFolder;
        });

        // Log if filtering reduced results
        if (folderFilteredResults.length !== vectorSearchResults.length) {
          this.logger.info(`[REST] Folder filtering reduced results from ${vectorSearchResults.length} to ${folderFilteredResults.length} for folder ${folderPath}`);
        }

        // Apply final limit after folder filtering
        const finalResults = folderFilteredResults.slice(0, limit);
        
        // Transform vector search results to REST API format with semantic metadata
        searchResults = finalResults.map(result => ({
            documentId: result.documentId,
            documentName: this.extractFileNameFromPath(result.documentId || ''),
            relevance: result.score,
            snippet: includeContent && result.content
              ? (result.content.substring(0, 300) + (result.content.length > 300 ? '...' : ''))
              : undefined,
            pageNumber: result.metadata?.page,
            chunkId: result.id,
            documentType: this.getDocumentType(result.documentId || ''),
            documentPath: result.documentId,
            // Add semantic metadata directly from the BasicSearchResult
            keyPhrases: result.keyPhrases || [],
          }));

        this.logger.debug(`[REST] Vector search found ${finalResults.length} folder-scoped results (from ${vectorSearchResults.length} total)`);
        
      } catch (searchError) {
        this.logger.error(`[REST] Vector search failed for query "${query}":`, searchError);
        
        // Fallback to empty results on search error (fail gracefully)
        searchResults = [];
      }

      const searchTime = Date.now() - searchStartTime;
      const totalTime = Date.now() - startTime;
      
      const response: SearchResponse = {
        folderContext: {
          id: folderPath, // Use path as identifier
          name: folderName,
          path: folderPath,
          model: modelName,
          status: folder.status || 'pending'
        },
        results: searchResults,
        performance: {
          searchTime,
          modelLoadTime: modelLoadResult.loadTime,
          documentsSearched: folder.documentCount || 0,
          totalResults: searchResults.length,
          modelUsed: modelName
        },
        query,
        parameters: {
          limit,
          threshold,
          includeContent
        }
      };

      this.logger.debug(`[REST] Search completed in ${totalTime}ms for folder ${folderPath} (model load: ${modelLoadResult.loadTime}ms, search: ${searchTime}ms)`);
      res.json(response);
    } catch (error) {
      this.logger.error('[REST] Search failed:', error);
      
      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: 'Search operation failed',
        timestamp: new Date().toISOString(),
        path: req.url
      };
      
      res.status(500).json(errorResponse);
    }
  }

  /**
   * API root endpoint - returns available endpoints
   */
  private async handleApiRoot(_req: Request, res: Response): Promise<void> {
    const apiInfo = {
      name: 'folder-mcp REST API',
      version: '2.0.0-dev',
      description: 'REST API for multi-folder MCP operations',
      endpoints: {
        health: 'GET /api/v1/health',
        serverInfo: 'GET /api/v1/server/info',
        // Future endpoints will be documented here
      },
      documentation: 'See OpenAPI specification for complete API documentation'
    };

    res.json(apiInfo);
  }

  /**
   * 404 handler for unknown routes
   */
  private async handleNotFound(req: Request, res: Response): Promise<void> {
    const errorResponse: ErrorResponse = {
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.url} not found`,
      timestamp: new Date().toISOString(),
      path: req.url
    };

    res.status(404).json(errorResponse);
  }

  /**
   * Start the REST API server
   */
  async start(port: number, host: string = '127.0.0.1'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, host, () => {
          this.logger.info(`[REST] API server started on http://${host}:${port}`);
          this.logger.info(`[REST] Health check: http://${host}:${port}/api/v1/health`);
          this.logger.info(`[REST] Server info: http://${host}:${port}/api/v1/server/info`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          this.logger.error(`[REST] Server error:`, error);
          reject(error);
        });

      } catch (error) {
        this.logger.error(`[REST] Failed to start server:`, error);
        reject(error);
      }
    });
  }

  /**
   * Stop the REST API server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('[REST] API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): Application {
    return this.app;
  }


  /**
   * Extract a human-friendly folder name from a path
   */
  private extractFolderName(folderPath: string): string {
    // Handle null/undefined/empty inputs defensively
    if (!folderPath || typeof folderPath !== 'string') {
      return 'Unknown Folder';
    }

    // Trim leading/trailing whitespace
    const trimmed = folderPath.trim();
    if (!trimmed) {
      return 'Unknown Folder';
    }

    // Remove trailing path separators and normalize
    const normalized = trimmed.replace(/[/\\]+$/, '');
    if (!normalized) {
      return 'Unknown Folder';
    }

    // Split on path separators and filter out empty segments
    const pathParts = normalized.split(/[/\\]/).filter(part => part.trim().length > 0);
    
    if (pathParts.length === 0) {
      return 'Unknown Folder';
    }

    // Return the last non-empty segment, or fall back to previous segment
    const lastName = pathParts[pathParts.length - 1];
    if (lastName && lastName.trim()) {
      return lastName.trim();
    }

    // Fall back to second-to-last segment if available
    if (pathParts.length >= 2) {
      const secondLast = pathParts[pathParts.length - 2];
      if (secondLast && secondLast.trim()) {
        return secondLast.trim();
      }
    }

    // Final fallback
    return 'Unknown Folder';
  }

  /**
   * Extract filename from a file path
   */
  private extractFileNameFromPath(filePath: string): string {
    if (!filePath) return 'Unknown Document';
    const pathParts = filePath.split(/[/\\]/);
    return pathParts[pathParts.length - 1] || 'Unknown Document';
  }

  /**
   * Get document type from file path or document ID
   */
  private getDocumentType(documentId: string): string {
    if (!documentId) return 'unknown';
    const extension = documentId.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }
}