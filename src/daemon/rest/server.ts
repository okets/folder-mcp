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
import { FoldersListResponse, FolderInfo, DocumentsListResponse, DocumentListParams, DocumentDataResponse, DocumentOutlineResponse, SearchRequest, SearchResponse } from './types.js';
import { DocumentService } from '../services/document-service.js';
import { IModelRegistry } from '../services/model-registry.js';
import { IVectorSearchService } from '../../di/interfaces.js';
import type { TextChunk, EmbeddingVector } from '../../types/index.js';

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
    this.app.get('/api/v1/folders/:folderId/documents', this.handleListDocuments.bind(this));

    // Document operations endpoints (Sprint 6) 
    this.app.get('/api/v1/folders/:folderId/documents/:docId', this.handleGetDocument.bind(this));
    this.app.get('/api/v1/folders/:folderId/documents/:docId/outline', this.handleGetDocumentOutline.bind(this));

    // Search operations endpoints (Sprint 7)
    this.app.post('/api/v1/folders/:folderId/search', this.handleSearch.bind(this));

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
   * Server information endpoint
   */
  private async handleServerInfo(req: Request, res: Response): Promise<void> {
    try {
      const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      
      // Get system info
      const cpuCount = os.cpus().length;
      const totalMemory = os.totalmem();
      
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
      
      // Get supported models (placeholder - will be enhanced in future sprints)
      const supportedModels = ['all-MiniLM-L6-v2', 'all-mpnet-base-v2', 'nomic-embed-text'];
      
      // Calculate total documents (placeholder - will be implemented in future sprints)
      const totalDocuments = folders.reduce((total: number, folder: any) => {
        return total + (folder.documentCount || 0);
      }, 0);

      const response: ServerInfoResponse = {
        version: '2.0.0-dev',
        capabilities: {
          cpuCount,
          totalMemory,
          supportedModels
        },
        daemon: {
          uptime,
          folderCount: folders.length,
          activeFolders,
          indexingFolders,
          totalDocuments
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

      // Transform FMDM folders to REST API format
      const folderInfos: FolderInfo[] = folders.map((folder: any) => {
        // Generate folder ID from path (sanitized)
        const folderId = this.generateFolderId(folder.path);
        
        // Extract folder name from path
        const folderName = this.extractFolderName(folder.path);
        
        return {
          id: folderId,
          name: folderName,
          path: folder.path,
          model: folder.model || 'all-MiniLM-L6-v2',
          status: folder.status || 'pending',
          documentCount: folder.documentCount || 0,
          lastIndexed: folder.lastIndexed,
          topics: [], // Placeholder for future implementation
          progress: folder.progress,
          notification: folder.notification
        };
      });

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
      const folderId = req.params.folderId;
      if (!folderId) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder ID is required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }
      
      this.logger.debug(`[REST] Listing documents for folder: ${folderId}`);

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

      // Resolve folder ID to path
      const folderResolution = DocumentService.resolveFolderPath(folderId, folders);
      if (!folderResolution) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${folderId}' not found. Available folders: ${folders.map(f => f.path ? this.generateFolderId(f.path) : 'unknown').join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      const { path: folderPath, folder } = folderResolution;
      const folderName = this.extractFolderName(folderPath);

      // List documents using document service
      const result = await this.documentService.listDocuments(
        folderPath,
        folderId,
        folderName,
        folder.model || 'all-MiniLM-L6-v2',
        folder.status || 'pending',
        params
      );

      const response: DocumentsListResponse = result;

      this.logger.debug(`[REST] Returning ${result.documents.length} documents from folder ${folderId}`);
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
      const { folderId, docId } = req.params;
      if (!folderId || !docId) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder ID and document ID are required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      this.logger.debug(`[REST] Getting document ${docId} from folder ${folderId}`);

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

      // Resolve folder ID to path
      const folderResolution = DocumentService.resolveFolderPath(folderId, folders);
      if (!folderResolution) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${folderId}' not found. Available folders: ${folders.map(f => f.path ? this.generateFolderId(f.path) : 'unknown').join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      const { path: folderPath, folder } = folderResolution;
      const folderName = this.extractFolderName(folderPath);

      // Get document data using document service
      const result = await this.documentService.getDocumentData(
        folderPath,
        folderId,
        folderName,
        folder.model || 'all-MiniLM-L6-v2',
        folder.status || 'pending',
        docId
      );

      const response: DocumentDataResponse = result;

      this.logger.debug(`[REST] Returning document data for ${docId} from folder ${folderId}`);
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
      const { folderId, docId } = req.params;
      if (!folderId || !docId) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder ID and document ID are required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      this.logger.debug(`[REST] Getting document outline for ${docId} from folder ${folderId}`);

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

      // Resolve folder ID to path
      const folderResolution = DocumentService.resolveFolderPath(folderId, folders);
      if (!folderResolution) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${folderId}' not found. Available folders: ${folders.map(f => f.path ? this.generateFolderId(f.path) : 'unknown').join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      const { path: folderPath, folder } = folderResolution;
      const folderName = this.extractFolderName(folderPath);

      // Get document outline using document service
      const result = await this.documentService.getDocumentOutline(
        folderPath,
        folderId,
        folderName,
        folder.model || 'all-MiniLM-L6-v2',
        folder.status || 'pending',
        docId
      );

      const response: DocumentOutlineResponse = result;

      this.logger.debug(`[REST] Returning document outline for ${docId} from folder ${folderId}`);
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
      const { folderId } = req.params;
      if (!folderId) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder ID is required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

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

      this.logger.debug(`[REST] Searching folder ${folderId} for: "${query}" (limit: ${limit}, threshold: ${threshold})`);

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

      // Resolve folder ID to path and validate folder exists
      const folderResolution = DocumentService.resolveFolderPath(folderId, folders);
      if (!folderResolution) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${folderId}' not found. Available folders: ${folders.map(f => f.path ? this.generateFolderId(f.path) : 'unknown').join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      const { path: folderPath, folder } = folderResolution;
      const folderName = this.extractFolderName(folderPath);
      const modelName = folder.model || 'all-MiniLM-L6-v2';

      // Sprint 7: Implement actual search functionality with model registry
      const startTime = Date.now();
      
      // Load or get model for this folder
      const modelLoadResult = await this.modelRegistry.getModelForFolder(folderId, folderPath, modelName);
      
      if (!modelLoadResult.success) {
        const errorResponse: ErrorResponse = {
          error: 'Service Unavailable',
          message: `Failed to load embedding model '${modelName}' for folder '${folderId}': ${modelLoadResult.error}`,
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
        if ('generateEmbeddings' in loadedModel.service) {
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
            }
          }];
          queryEmbeddings = await loadedModel.service.generateEmbeddings(chunks);
        } else {
          // ONNXDownloader doesn't have generateEmbeddings - this should not happen in practice
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
        const vectorSearchResults = await this.vectorSearchService.search(firstEmbedding, limit * 2, threshold);
        
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
          this.logger.info(`[REST] Folder filtering reduced results from ${vectorSearchResults.length} to ${folderFilteredResults.length} for folder ${folderId}`);
        }

        // Apply final limit after folder filtering
        const finalResults = folderFilteredResults.slice(0, limit);
        
        // Transform vector search results to REST API format
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
          documentPath: result.documentId
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
          id: folderId,
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

      this.logger.debug(`[REST] Search completed in ${totalTime}ms for folder ${folderId} (model load: ${modelLoadResult.loadTime}ms, search: ${searchTime}ms)`);
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
   * Generate a folder ID from a path
   */
  private generateFolderId(folderPath: string): string {
    // Extract the last directory name and sanitize it
    const pathParts = folderPath.split(/[/\\]/);
    const lastPart = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || 'unknown';
    
    // Sanitize the name to create a valid ID
    return lastPart
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
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