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
import fs from 'node:fs/promises';
import { FMDMService } from '../services/fmdm-service.js';
import {
  FoldersListResponse,
  FolderInfo,
  DocumentsListResponse,
  DocumentListParams,
  DocumentDataResponse,
  DocumentOutlineResponse,
  SearchRequest,
  SearchResponse,
  EnhancedServerInfoResponse,
  EnhancedFoldersListResponse,
  EnhancedFolderInfo,
  KeyPhrase,
  RecentlyChangedFile,
  EnhancedDocumentInfo,
  EnhancedDocumentsListResponse,
  SemanticPreview,
  IndexingStatus,
  ExploreRequest,
  ExploreResponse,
  SubdirectoryInfo,
  ExploreStatistics,
  ExplorePaginationDetails,
  GetDocumentTextResponse,
  ExtractionMetadata,
  DocumentTextPagination,
  DocumentTextNavigationHints
} from './types.js';
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
import { selectRepresentativeKeyPhrases, calculateComplexityIndicator, getRelativePath } from '../utils/key-phrase-selection.js';

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
   * Shared helper to check database existence and availability
   * @param folderPath The folder path containing the database
   * @param req Express request object for error context
   * @param res Express response object for sending errors
   * @returns Database path if exists, null if not (error already sent)
   */
  private async checkDatabaseAccess(
    folderPath: string,
    req: Request,
    res: Response
  ): Promise<string | null> {
    const dbPath = path.join(folderPath, '.folder-mcp', 'embeddings.db');

    try {
      const fs = await import('fs/promises');
      await fs.access(dbPath);
      return dbPath;
    } catch {
      const errorResponse: ErrorResponse = {
        error: 'Database Not Found',
        message: `No indexed data found for folder '${path.basename(folderPath)}'. Please ensure the folder has been indexed.`,
        timestamp: new Date().toISOString(),
        path: req.url
      };
      res.status(404).json(errorResponse);
      return null;
    }
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

    // Folder operations endpoints (Phase 10 Sprint 1 - Enhanced)
    this.app.get('/api/v1/folders', this.handleListFoldersEnhanced.bind(this));
    this.app.get('/api/v1/folders/:folderPath/explore', this.handleExplore.bind(this));
    this.app.get('/api/v1/folders/:folderPath/documents', this.handleListDocumentsEnhanced.bind(this));

    // Document operations endpoints (Sprint 4, 5 & 6)
    this.app.get('/api/v1/folders/:folderPath/documents/:docId/metadata', this.handleGetDocumentMetadata.bind(this));
    this.app.post('/api/v1/folders/:folderPath/documents/:docId/chunks', this.handleGetChunks.bind(this));
    this.app.get('/api/v1/folders/:folderPath/documents/:docId/text', this.handleGetDocumentText.bind(this));
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
              purpose: "Get document chunks with semantic metadata and pagination",
              returns: "Paginated chunks with key phrases, readability scores, and 100-char previews",
              use_when: "Exploring document structure and finding relevant sections"
            },
            {
              name: "get_chunks",
              purpose: "Retrieve specific chunks by their IDs (POST endpoint)",
              returns: "Content of requested chunks with minimal metadata (lean response)",
              use_when: "Reading targeted content after identifying chunks from metadata"
            }
          ],
          content_retrieval: [
            {
              name: "get_document_text",
              purpose: "Get extracted plain text from any document type",
              returns: "Clean text string from PDF/DOCX/etc with character-based pagination",
              use_when: "Reading document content for analysis",
              parameters: {
                base_folder_path: "Root folder path",
                file_path: "Document path relative to base folder",
                max_chars: "Maximum characters to return (default: 5000). Use continuation_token for next batch"
              }
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
          exploration_flow: "get_server_info → list_folders → explore → list_documents → get_document_metadata → get_chunks/get_document_text",
          search_flow: "get_server_info → search → get_document_metadata → get_chunks/get_document_text",
          chunk_navigation_flow: "list_documents → get_document_metadata (paginated) → get_chunks (targeted retrieval)",
          tip: "Use exploration for understanding structure, search for specific queries, metadata for chunk navigation"
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
   * Phase 10 Sprint 1: Enhanced list folders endpoint with semantic previews
   * Returns structured JSON with diverse key phrases and recently changed files
   */
  private async handleListFoldersEnhanced(req: Request, res: Response): Promise<void> {
    try {
      this.logger.debug('[REST] Listing folders (Phase 10 Enhanced)');

      // Get folders from FMDM service
      let folders: any[] = [];
      try {
        const fmdm = this.fmdmService.getFMDM();
        folders = fmdm?.folders || [];
      } catch (fmdmError) {
        this.logger.warn('[REST] Could not retrieve FMDM data for folders:', fmdmError);
        // Continue with empty folders array
      }

      // Transform FMDM folders to Phase 10 enhanced format
      const enhancedFolders: EnhancedFolderInfo[] = await Promise.all(folders.map(async (folder: any) => {
        // Extract folder name from path
        const folderName = this.extractFolderName(folder.path);

        // Initialize enhanced folder info
        const enhancedFolder: EnhancedFolderInfo = {
          base_folder_path: folder.path, // Simplified: single field for folder identification
          document_count: 0,
          indexing_status: {
            is_indexed: false,
            documents_indexed: 0
          }
        };

        // Only process semantic data for indexed folders
        if (folder.status === 'active' || folder.status === 'indexed') {
          try {
            const dbPath = `${folder.path}/.folder-mcp/embeddings.db`;
            const fs = await import('fs/promises');

            await fs.access(dbPath);
            const Database = await import('better-sqlite3');
            const db = Database.default(dbPath);

            // Get document count and indexing status
            const docCountResult = db.prepare('SELECT COUNT(*) as count FROM documents').get() as any;
            enhancedFolder.document_count = docCountResult?.count || 0;
            enhancedFolder.indexing_status = {
              is_indexed: true,
              documents_indexed: docCountResult?.count || 0
            };

            // Note: last_modified removed - use recently_changed_files instead for modification times

            // Get all document keywords for diverse selection
            const keyPhrasesResult = db.prepare(
              'SELECT document_keywords FROM documents WHERE keywords_extracted = 1'
            ).all() as any[];

            if (keyPhrasesResult && keyPhrasesResult.length > 0) {
              // Parse all key phrases from documents
              const allDocumentKeyPhrases: KeyPhrase[][] = keyPhrasesResult
                .map(row => {
                  try {
                    const parsed = JSON.parse(row.document_keywords);
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [];
                  }
                })
                .filter(phrases => phrases.length > 0);

              // Select diverse, representative key phrases
              const topKeyPhrases = selectRepresentativeKeyPhrases(allDocumentKeyPhrases, 15);

              // Calculate average readability from chunks
              const readabilityResult = db.prepare(
                'SELECT AVG(readability_score) as avg_readability FROM chunks WHERE semantic_processed = 1'
              ).get() as any;

              const avgReadability = readabilityResult?.avg_readability || null;
              const complexityIndicator = calculateComplexityIndicator(avgReadability);

              // Build semantic preview
              enhancedFolder.semantic_preview = {
                top_key_phrases: topKeyPhrases,
                complexity_indicator: complexityIndicator,
                avg_readability: avgReadability ? Math.round(avgReadability * 10) / 10 : 0
              };
            }

            // Get recently changed files (last 5 modified documents)
            const recentFilesResult = db.prepare(
              `SELECT file_path, last_modified
               FROM documents
               ORDER BY last_modified DESC
               LIMIT 5`
            ).all() as any[];

            if (recentFilesResult && recentFilesResult.length > 0) {
              enhancedFolder.recently_changed_files = recentFilesResult.map(row => ({
                path: getRelativePath(row.file_path, folder.path),
                modified: row.last_modified
              }));
            }

            db.close();
          } catch (error) {
            this.logger.warn(`[REST] Could not get semantic data for ${folder.path}:`, error);
            // Folder exists but no database, mark as not indexed
            enhancedFolder.indexing_status = {
              is_indexed: false,
              documents_indexed: 0
            };
          }
        } else {
          // Folder not indexed yet
          enhancedFolder.indexing_status = {
            is_indexed: false,
            documents_indexed: 0
          };
        }

        return enhancedFolder;
      }));

      // Create Phase 10 response
      const response: EnhancedFoldersListResponse = {
        folders: enhancedFolders,
        total_folders: enhancedFolders.length,
        navigation_hint: "Use explore endpoint to navigate within a folder"
      };

      this.logger.debug(`[REST] Returning ${enhancedFolders.length} folders with semantic previews`);
      res.json(response);
    } catch (error) {
      this.logger.error('[REST] Enhanced list folders failed:', error);

      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: 'Failed to retrieve enhanced folder list',
        timestamp: new Date().toISOString(),
        path: req.url
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * List documents in a folder endpoint (Old version - kept for reference)
   */
  private async handleListDocumentsOld(req: Request, res: Response): Promise<void> {
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
   * Phase 10 Sprint 3: Enhanced list_documents endpoint with semantic metadata
   */
  private async handleListDocumentsEnhanced(req: Request, res: Response): Promise<void> {
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

      const baseFolderPath = decodeURIComponent(encodedFolderPath);

      // Parse query parameters, with continuation token override
      let relativeSubPath = (req.query.sub_path as string) || '';
      let recursive = req.query.recursive === 'true';
      let limit = parseInt(req.query.limit as string || '20', 10);
      let offset = parseInt(req.query.offset as string || '0', 10);
      const continuationToken = req.query.continuation_token as string;

      // If continuation token is provided, decode and use its parameters
      if (continuationToken) {
        try {
          const tokenData = JSON.parse(Buffer.from(continuationToken, 'base64').toString());
          // Override parameters from token
          if (tokenData.sub_path !== undefined) relativeSubPath = tokenData.sub_path;
          if (tokenData.recursive !== undefined) recursive = tokenData.recursive;
          if (tokenData.offset !== undefined) offset = tokenData.offset;
          if (tokenData.limit !== undefined) limit = tokenData.limit;

          this.logger.debug(`[REST] Using continuation token with offset ${offset}, limit ${limit}`);
        } catch (e) {
          this.logger.warn(`[REST] Invalid continuation token: ${e}`);
        }
      }

      // Validate parameters
      if (limit < 1 || limit > 200) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Limit must be between 1 and 200',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      if (offset < 0) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Offset must be non-negative',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Normalize the relative path (handle "", ".", "/" as root)
      let normalizedSubPath = relativeSubPath;
      if (relativeSubPath === '.' || relativeSubPath === '/') {
        normalizedSubPath = '';
      }
      normalizedSubPath = normalizedSubPath.replace(/\\/g, '/');

      this.logger.debug(`[REST] Listing documents in ${baseFolderPath}/${normalizedSubPath}, recursive: ${recursive}`);

      // Verify folder exists in configuration
      const fmdm = this.fmdmService.getFMDM();
      const folders = fmdm?.folders || [];
      const folder = folders.find((f: any) =>
        PathNormalizer.normalize(f.path) === PathNormalizer.normalize(baseFolderPath)
      );

      if (!folder) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${baseFolderPath}' is not configured`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      // Get database path
      const dbPath = path.join(baseFolderPath, '.folder-mcp', 'embeddings.db');

      try {
        // Check if database exists
        await fs.access(dbPath);

        const Database = await import('better-sqlite3');
        const db = Database.default(dbPath);

        // Build the query for documents
        let query = `
          SELECT
            d.file_path,
            d.file_size as size,
            d.last_modified,
            d.document_keywords,
            AVG(c.readability_score) as avg_readability
          FROM documents d
          LEFT JOIN chunks c ON d.id = c.document_id
          WHERE 1=1
        `;

        const params: any[] = [];

        // Always filter by base folder path
        if (normalizedSubPath) {
          const fullPath = path.join(baseFolderPath, normalizedSubPath);
          if (recursive) {
            query += ` AND d.file_path LIKE ?`;
            params.push(`${fullPath}%`);
          } else {
            // For non-recursive, match exact directory
            query += ` AND d.file_path LIKE ? AND d.file_path NOT LIKE ?`;
            params.push(`${fullPath}/%`);
            params.push(`${fullPath}/%/%`);
          }
        } else {
          // At root - always filter by base folder
          if (recursive) {
            // Recursive at root - include all files under base folder
            query += ` AND d.file_path LIKE ?`;
            params.push(`${baseFolderPath}%`);
          } else {
            // Non-recursive at root - only files directly in base folder
            query += ` AND d.file_path LIKE ? AND d.file_path NOT LIKE ?`;
            params.push(`${baseFolderPath}/%`);
            params.push(`${baseFolderPath}/%/%`);
          }
        }

        query += ` GROUP BY d.id ORDER BY d.file_path ASC`;

        // Get total count first
        const countQuery = query.replace(
          /SELECT[\s\S]*?FROM/,
          'SELECT COUNT(DISTINCT d.id) as count FROM'
        ).replace(/GROUP BY[\s\S]*$/, '');

        const countResult = db.prepare(countQuery).get(...params) as any;
        const totalCount = countResult?.count || 0;

        // Add pagination
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        // Execute query
        const documentsResult = db.prepare(query).all(...params) as any[];

        // Process documents
        const documents: EnhancedDocumentInfo[] = documentsResult.map(row => {
          // Parse key phrases
          let topKeyPhrases: KeyPhrase[] = [];
          try {
            const keyPhrases = JSON.parse(row.document_keywords || '[]');
            // Take top 5 diverse key phrases
            topKeyPhrases = Array.isArray(keyPhrases)
              ? keyPhrases.slice(0, 5).map((kp: any) => ({
                  text: kp.text || kp,
                  score: kp.score || 0.8
                }))
              : [];
          } catch {
            topKeyPhrases = [];
          }

          // Calculate relative path from base folder
          const relativePath = path.relative(baseFolderPath, row.file_path);

          return {
            file_path: relativePath,
            size: row.size || 0,
            last_modified: row.last_modified || new Date().toISOString(),
            top_key_phrases: topKeyPhrases,
            readability_score: Math.round((row.avg_readability || 0) * 10) / 10
          };
        });

        db.close();

        // Create continuation token if needed
        let continuationTokenValue: string | undefined;
        if (totalCount > offset + limit) {
          const tokenData = {
            path: baseFolderPath,
            sub_path: normalizedSubPath,
            recursive,
            offset: offset + limit,
            limit
          };
          continuationTokenValue = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        }

        // Build response
        const paginationData: EnhancedDocumentsListResponse['pagination'] = {
          limit,
          offset,
          total: totalCount,
          returned: documents.length,
          has_more: totalCount > offset + limit
        };

        if (continuationTokenValue) {
          paginationData.continuation_token = continuationTokenValue;
        }

        const navigationHints: EnhancedDocumentsListResponse['navigation_hints'] = {
          use_explore: 'To see subdirectory structure first'
        };

        if (continuationTokenValue) {
          navigationHints.continue_listing = 'Use continuation_token to get more documents';
        }
        if (!recursive) {
          navigationHints.set_recursive_true = 'To include documents from subdirectories';
        }

        const response: EnhancedDocumentsListResponse = {
          base_folder_path: baseFolderPath,
          relative_sub_path: normalizedSubPath,
          documents,
          pagination: paginationData,
          navigation_hints: navigationHints
        };

        this.logger.debug(`[REST] Returning ${documents.length} of ${totalCount} documents`);
        res.json(response);

      } catch (dbError) {
        this.logger.warn(`[REST] Database not found or error for ${baseFolderPath}:`, dbError);

        // Return empty result if database doesn't exist
        const response: EnhancedDocumentsListResponse = {
          base_folder_path: baseFolderPath,
          relative_sub_path: normalizedSubPath,
          documents: [],
          pagination: {
            limit,
            offset,
            total: 0,
            returned: 0,
            has_more: false
          },
          navigation_hints: {
            use_explore: 'Folder not yet indexed. Use explore to see files.'
          }
        };

        res.json(response);
      }
    } catch (error) {
      this.logger.error('[REST] Enhanced list documents failed:', error);

      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: 'Failed to retrieve document list',
        timestamp: new Date().toISOString(),
        path: req.url
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Phase 10 Sprint 2: Explore endpoint - ls-like navigation with semantic data
   */
  private async handleExplore(req: Request, res: Response): Promise<void> {
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

      const baseFolderPath = decodeURIComponent(encodedFolderPath);

      // Parse query parameters
      const subPath = req.query.sub_path as string || '';
      const subdirLimit = parseInt(req.query.subdir_limit as string || '50', 10);
      const fileLimit = parseInt(req.query.file_limit as string || '20', 10);
      const continuationToken = req.query.continuation_token as string;

      // Normalize the relative path (handle "", ".", "/" as root)
      let normalizedSubPath = subPath;
      if (subPath === '.' || subPath === '/') {
        normalizedSubPath = '';
      }

      // Normalize path separators (support both Unix and Windows)
      normalizedSubPath = normalizedSubPath.replace(/\\/g, '/');

      this.logger.debug(`[REST] Exploring folder ${baseFolderPath} at path: ${normalizedSubPath || '(root)'}`);

      // Verify folder exists in configuration
      const fmdm = this.fmdmService.getFMDM();
      const folders = fmdm?.folders || [];
      const folder = folders.find((f: any) =>
        PathNormalizer.normalize(f.path) === PathNormalizer.normalize(baseFolderPath)
      );

      if (!folder) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${baseFolderPath}' is not configured`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      // Build the full path to explore
      const fullPath = normalizedSubPath
        ? path.join(baseFolderPath, normalizedSubPath)
        : baseFolderPath;

      // Check if the path exists and is a directory
      try {
        const stats = await fs.stat(fullPath);
        if (!stats.isDirectory()) {
          const errorResponse: ErrorResponse = {
            error: 'Bad Request',
            message: `Path '${normalizedSubPath}' is not a directory`,
            timestamp: new Date().toISOString(),
            path: req.url
          };
          res.status(400).json(errorResponse);
          return;
        }
      } catch (fsError) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Path '${normalizedSubPath}' does not exist`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      // Read directory contents
      const dirContents = await fs.readdir(fullPath, { withFileTypes: true });

      // Separate directories and files
      const allDirs = dirContents.filter(item => item.isDirectory()).map(d => d.name);
      const allFiles = dirContents.filter(item => item.isFile()).map(f => f.name);

      // Apply pagination
      const paginatedDirs = allDirs.slice(0, subdirLimit);
      const paginatedFiles = allFiles.slice(0, fileLimit);

      // Get semantic data for subdirectories
      const subdirectoriesWithData: SubdirectoryInfo[] = [];
      for (const dirName of paginatedDirs) {
        const subdirPath = normalizedSubPath
          ? path.join(normalizedSubPath, dirName)
          : dirName;

        // Query database for ALL documents under this subdirectory
        const semanticData = await this.getSubdirectorySemanticData(
          baseFolderPath,
          subdirPath
        );

        subdirectoriesWithData.push({
          name: dirName,
          indexed_document_count: semanticData.documentCount,
          top_key_phrases: semanticData.keyPhrases
        });
      }

      // Get statistics for current directory
      const currentDirSemanticData = await this.getCurrentDirectoryStats(
        baseFolderPath,
        normalizedSubPath
      );

      // Build response
      const response: ExploreResponse = {
        base_folder_path: baseFolderPath,
        relative_sub_path: normalizedSubPath,
        subdirectories: subdirectoriesWithData,
        files: paginatedFiles,
        statistics: {
          subdirectory_count: allDirs.length,
          file_count: allFiles.length,
          indexed_document_count: currentDirSemanticData.directCount,
          total_nested_documents: currentDirSemanticData.totalCount
        },
        ...(currentDirSemanticData.directKeyPhrases.length > 0 && {
          semantic_context: {
            key_phrases: currentDirSemanticData.directKeyPhrases
          }
        }),
        pagination: {
          subdirectories: {
            returned: paginatedDirs.length,
            total: allDirs.length,
            limit: subdirLimit,
            has_more: allDirs.length > subdirLimit,
            ...(allDirs.length > subdirLimit && {
              continuation_token: Buffer.from(JSON.stringify({
                offset: subdirLimit,
                path: normalizedSubPath
              })).toString('base64')
            })
          },
          documents: {
            returned: paginatedFiles.length,
            total: allFiles.length,
            limit: fileLimit,
            has_more: allFiles.length > fileLimit,
            ...(allFiles.length > fileLimit && {
              continuation_token: Buffer.from(JSON.stringify({
                offset: fileLimit,
                path: normalizedSubPath
              })).toString('base64')
            })
          }
        },
        navigation_hints: {
          next_actions: [
            'Use get_document_text for indexed docs (.md, .pdf, .docx, .txt)',
            'Use download_file for ANY file (.ts, .png, .json, etc.)',
            'Use explore with subdirectory path to navigate deeper'
          ],
          tip: "Like 'ls' - shows ALL files. Only .md/.pdf/.docx/.xlsx/.pptx/.txt are indexed",
          ...(allDirs.length > 100 || allFiles.length > 100 ? {
            warning: `Large folder with ${allDirs.length} subdirs and ${allFiles.length} files - pagination active`
          } : {})
        }
      };

      res.json(response);
    } catch (error) {
      this.logger.error('[REST] Explore endpoint failed:', error);
      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'Failed to explore folder',
        timestamp: new Date().toISOString(),
        path: req.url
      };
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get semantic data for a subdirectory (all nested documents)
   */
  private async getSubdirectorySemanticData(
    baseFolderPath: string,
    subPath: string
  ): Promise<{ documentCount: number; keyPhrases: KeyPhrase[] }> {
    try {
      // Get database path for this folder
      const dbPath = path.join(baseFolderPath, '.folder-mcp', 'embeddings.db');

      // Check if database exists
      try {
        await fs.access(dbPath);
      } catch {
        // No database, return empty data
        return { documentCount: 0, keyPhrases: [] };
      }

      // Open database connection
      const Database = await import('better-sqlite3');
      const db = Database.default(dbPath, { readonly: true });

      try {
        // Build the search pattern for nested documents
        // Need to use the full absolute path since that's what's stored in the database
        const fullSubPath = path.join(baseFolderPath, subPath).replace(/\\/g, '/');
        const searchPattern = fullSubPath + '/%';

        // Query for all documents under this path
        const query = `
          SELECT
            COUNT(*) as count,
            GROUP_CONCAT(document_keywords) as all_keywords
          FROM documents
          WHERE file_path LIKE ?
            AND keywords_extracted = 1
        `;

        const result = db.prepare(query).get(searchPattern) as any;
        const documentCount = result?.count || 0;

        // Parse and select diverse key phrases
        const keyPhrases: KeyPhrase[] = [];
        if (result?.all_keywords) {
          keyPhrases.push(...this.selectDiverseKeyPhrases(result.all_keywords));
        }

        return { documentCount, keyPhrases };
      } finally {
        db.close();
      }
    } catch (error) {
      this.logger.error(`[REST] Error getting semantic data for ${subPath}:`, error);
      return { documentCount: 0, keyPhrases: [] };
    }
  }

  /**
   * Get statistics for the current directory
   */
  private async getCurrentDirectoryStats(
    baseFolderPath: string,
    currentPath: string
  ): Promise<{
    directCount: number;
    totalCount: number;
    directKeyPhrases: KeyPhrase[]
  }> {
    try {
      const dbPath = path.join(baseFolderPath, '.folder-mcp', 'embeddings.db');

      try {
        await fs.access(dbPath);
      } catch {
        return { directCount: 0, totalCount: 0, directKeyPhrases: [] };
      }

      const Database = await import('better-sqlite3');
      const db = Database.default(dbPath, { readonly: true });

      try {
        // Count documents directly in current directory
        const directPattern = currentPath ? path.join(currentPath, '%') : '%';
        const directQuery = `
          SELECT
            COUNT(*) as count,
            GROUP_CONCAT(document_keywords) as keywords
          FROM documents
          WHERE file_path LIKE ?
            AND file_path NOT LIKE ?
            AND keywords_extracted = 1
        `;

        const directResult = db.prepare(directQuery).get(
          directPattern,
          path.join(directPattern, '%', '%')  // Exclude nested paths
        ) as any;

        // Count all documents including nested
        const totalQuery = `
          SELECT COUNT(*) as count
          FROM documents
          WHERE file_path LIKE ?
        `;

        const totalResult = db.prepare(totalQuery).get(directPattern) as any;

        // Parse key phrases from direct documents
        const directKeyPhrases = directResult?.keywords
          ? this.selectDiverseKeyPhrases(directResult.keywords)
          : [];

        return {
          directCount: directResult?.count || 0,
          totalCount: totalResult?.count || 0,
          directKeyPhrases
        };
      } finally {
        db.close();
      }
    } catch (error) {
      this.logger.error(`[REST] Error getting current directory stats:`, error);
      return { directCount: 0, totalCount: 0, directKeyPhrases: [] };
    }
  }

  /**
   * Select diverse key phrases from concatenated JSON arrays
   */
  private selectDiverseKeyPhrases(concatenatedKeywords: string): KeyPhrase[] {
    try {
      // Parse GROUP_CONCAT result - could be multiple JSON arrays concatenated
      const allPhrases: KeyPhrase[] = [];

      // GROUP_CONCAT joins multiple JSON arrays directly as ],[
      // Replace with a separator we can split on safely
      const normalized = concatenatedKeywords.replace(/\],\[/g, ']|||[');
      const jsonArrays = normalized.split('|||');

      for (const jsonStr of jsonArrays) {
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            allPhrases.push(...parsed);
          }
        } catch (e) {
          this.logger.warn(`[REST] Failed to parse keywords chunk: ${e}`);
        }
      }

      // Deduplicate and score by frequency
      const phraseMap = new Map<string, number>();
      for (const phrase of allPhrases) {
        if (phrase?.text) {
          const count = phraseMap.get(phrase.text) || 0;
          phraseMap.set(phrase.text, count + 1);
        }
      }

      // Convert to array with scores
      const scoredPhrases: KeyPhrase[] = Array.from(phraseMap.entries())
        .map(([text, count]) => ({
          text,
          score: Math.min(0.95, 0.5 + (count * 0.1))  // Score based on frequency
        }))
        .sort((a, b) => b.score - a.score);

      // Apply diversity filter - skip phrases with overlapping words
      const selected: KeyPhrase[] = [];
      const usedWords = new Set<string>();

      for (const phrase of scoredPhrases) {
        const words = phrase.text.toLowerCase().split(/\s+/);
        const hasOverlap = words.some(w => usedWords.has(w));

        if (!hasOverlap || selected.length < 2) {
          selected.push(phrase);
          words.forEach(w => usedWords.add(w));

          if (selected.length >= 5) break;  // Max 5 phrases
        }
      }

      return selected;
    } catch (error) {
      this.logger.error('[REST] Error selecting key phrases:', error);
      return [];
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
   * Phase 10 Sprint 4: Get document metadata with chunk-based navigation
   */
  private async handleGetDocumentMetadata(req: Request, res: Response): Promise<void> {
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

      const baseFolderPath = decodeURIComponent(encodedFolderPath);
      const fileName = docId;

      // Parse query parameters for pagination
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;

      this.logger.debug(`[REST] Getting document metadata for ${fileName} from folder ${baseFolderPath} (offset: ${offset}, limit: ${limit})`);

      // Get folders from FMDM service
      let folders: any[] = [];
      try {
        const fmdm = this.fmdmService.getFMDM();
        folders = fmdm?.folders || [];
      } catch (fmdmError) {
        this.logger.warn('[REST] Could not retrieve FMDM data for document metadata:', fmdmError);
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
      const folder = PathNormalizer.findByPath(folders, baseFolderPath);
      if (!folder) {
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Folder '${baseFolderPath}' not found`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      // Construct full document path
      const documentPath = path.join(baseFolderPath, fileName);

      // Check database access
      const dbPath = await this.checkDatabaseAccess(baseFolderPath, req, res);
      if (!dbPath) return;

      try {
        const Database = await import('better-sqlite3');
        const db = Database.default(dbPath);

        // Get document information
        const docStmt = db.prepare(`
          SELECT id, file_path, mime_type, last_modified
          FROM documents
          WHERE file_path = ?
        `);
        const document = docStmt.get(documentPath) as any;

        if (!document) {
          db.close();
          const errorResponse: ErrorResponse = {
            error: 'Not Found',
            message: `Document '${fileName}' not found in folder`,
            timestamp: new Date().toISOString(),
            path: req.url
          };
          res.status(404).json(errorResponse);
          return;
        }

        // Get total chunk count
        const countStmt = db.prepare(`
          SELECT COUNT(*) as total
          FROM chunks
          WHERE document_id = ?
        `);
        const countResult = countStmt.get(document.id) as any;
        const totalChunks = countResult?.total || 0;

        // Get paginated chunks with metadata
        const chunksStmt = db.prepare(`
          SELECT
            id as chunk_id,
            chunk_index,
            content,
            start_offset,
            end_offset,
            key_phrases,
            readability_score
          FROM chunks
          WHERE document_id = ?
          ORDER BY chunk_index
          LIMIT ? OFFSET ?
        `);
        const chunks = chunksStmt.all(document.id, limit, offset) as any[];

        // Process chunks to extract metadata
        const processedChunks = chunks.map(chunk => {
          // Parse key phrases from JSON string
          let keyPhrases: Array<{text: string, score: number}> = [];
          try {
            if (chunk.key_phrases) {
              const parsed = JSON.parse(chunk.key_phrases);
              if (Array.isArray(parsed)) {
                keyPhrases = parsed.map((phrase: any) => ({
                  text: phrase.text || phrase,
                  score: phrase.score || 0.5
                }));
              }
            }
          } catch (e) {
            // Key phrases parsing failed, use empty array
          }

          // Check for code blocks
          const hasCodeExamples = /```[\s\S]*?```/.test(chunk.content) ||
                                 /^\s{4,}/.test(chunk.content);

          return {
            chunk_id: `chunk_${chunk.chunk_id}`,
            chunk_index: chunk.chunk_index,
            key_phrases: keyPhrases.slice(0, 5),
            has_code_examples: hasCodeExamples,
            readability_score: chunk.readability_score || null,
            start_offset: chunk.start_offset,
            end_offset: chunk.end_offset,
            preview: chunk.content.substring(0, 100) + (chunk.content.length > 100 ? '...' : '')
          };
        });

        // Identify chunks with code (for navigation hints)
        const chunksWithCode = processedChunks
          .filter(c => c.has_code_examples)
          .map(c => c.chunk_index);

        db.close();

        // Build response
        const response = {
          base_folder_path: baseFolderPath,
          file_path: fileName,
          mime_type: document.mime_type,
          last_modified: document.last_modified,
          total_chunks: totalChunks,
          chunks: processedChunks,
          pagination: {
            offset,
            limit,
            total: totalChunks,
            returned: processedChunks.length,
            has_more: (offset + limit) < totalChunks,
            ...(((offset + limit) < totalChunks) && {
              continuation_token: Buffer.from(JSON.stringify({
                doc_id: fileName,
                offset: offset + limit
              })).toString('base64')
            })
          },
          navigation_hints: {
            chunks_with_code: chunksWithCode.slice(0, 10), // First 10 chunks with code
            continue_outline: totalChunks > limit ? `Use continuation_token for chunks ${offset + limit + 1}-${totalChunks}` : null,
            use_get_document_text: "To read full content",
            use_get_chunks: "To retrieve specific chunks by ID",
            typical_documents: "Most documents have <50 chunks"
          }
        };

        res.json(response);

      } catch (dbError) {
        this.logger.error('[REST] Error accessing document metadata:', dbError);
        const errorResponse: ErrorResponse = {
          error: 'Internal Server Error',
          message: 'Failed to retrieve document metadata',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(500).json(errorResponse);
      }

    } catch (error) {
      this.logger.error('[REST] Error in handleGetDocumentMetadata:', error);
      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An error occurred',
        timestamp: new Date().toISOString(),
        path: req.url
      };
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get specific chunks by ID (Sprint 5)
   * Lean response with just content and navigation aids
   */
  private async handleGetChunks(req: Request, res: Response): Promise<void> {
    try {
      const { folderPath: encodedFolderPath, docId: encodedDocId } = req.params;
      const { chunk_ids } = req.body;

      if (!encodedFolderPath || !encodedDocId) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'Folder path and document ID are required',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      if (!chunk_ids || !Array.isArray(chunk_ids) || chunk_ids.length === 0) {
        const errorResponse: ErrorResponse = {
          error: 'Bad Request',
          message: 'chunk_ids array is required and must not be empty',
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(400).json(errorResponse);
        return;
      }

      const baseFolderPath = decodeURIComponent(encodedFolderPath);
      const docId = decodeURIComponent(encodedDocId);

      this.logger.debug(`[REST] Getting chunks for document: ${docId} in folder: ${baseFolderPath}`);

      // Check database access
      const dbPath = await this.checkDatabaseAccess(baseFolderPath, req, res);
      if (!dbPath) return;

      // Open database
      const Database = await import('better-sqlite3');
      const db = Database.default(dbPath);

      // First get the document to verify it exists
      const docStmt = db.prepare(`
        SELECT id, file_path
        FROM documents
        WHERE file_path = ?
      `);

      const document = docStmt.get(docId) as any;

      if (!document) {
        db.close();
        const errorResponse: ErrorResponse = {
          error: 'Not Found',
          message: `Document not found: ${docId}`,
          timestamp: new Date().toISOString(),
          path: req.url
        };
        res.status(404).json(errorResponse);
        return;
      }

      // Build query for chunks
      const placeholders = chunk_ids.map(() => '?').join(',');
      const chunksStmt = db.prepare(`
        SELECT
          'chunk_' || c.id as chunk_id,
          c.chunk_index,
          c.content,
          c.start_offset,
          c.end_offset
        FROM chunks c
        WHERE c.document_id = ?
          AND ('chunk_' || c.id) IN (${placeholders})
        ORDER BY c.chunk_index
      `);

      const chunks = chunksStmt.all(document.id, ...chunk_ids) as any[];

      // Return chunks without redundant neighbor info
      const processedChunks = chunks.map((chunk: any) => ({
        chunk_id: chunk.chunk_id,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        start_offset: chunk.start_offset,
        end_offset: chunk.end_offset
      }));

      db.close();

      // Build lean response
      const response = {
        file_path: docId,
        chunks: processedChunks
      };

      res.json(response);

    } catch (error) {
      this.logger.error('[REST] Error getting chunks:', error);

      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get chunks',
        timestamp: new Date().toISOString(),
        path: req.url
      };
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get document text with character-based pagination (Phase 10 Sprint 6)
   * Returns clean extracted text with extraction quality metadata
   */
  private async handleGetDocumentText(req: Request, res: Response): Promise<void> {
    try {
      const { folderPath: encodedFolderPath, docId: encodedDocId } = req.params;
      const { continuation_token } = req.query;

      // Handle continuation token case
      let folderPath: string;
      let docId: string;
      let offset = 0;
      let maxChars = 5000; // Default

      if (continuation_token && typeof continuation_token === 'string') {
        try {
          const tokenData = JSON.parse(Buffer.from(continuation_token, 'base64').toString());
          folderPath = tokenData.folder_path;
          docId = tokenData.doc_id;
          offset = tokenData.offset || 0;
          maxChars = tokenData.max_chars || 5000;
        } catch (e) {
          const errorResponse: ErrorResponse = {
            error: 'Bad Request',
            message: 'Invalid continuation token',
            timestamp: new Date().toISOString(),
            path: req.url
          };
          res.status(400).json(errorResponse);
          return;
        }
      } else {
        if (!encodedFolderPath || !encodedDocId) {
          const errorResponse: ErrorResponse = {
            error: 'Bad Request',
            message: 'Folder path and document ID are required',
            timestamp: new Date().toISOString(),
            path: req.url
          };
          res.status(400).json(errorResponse);
          return;
        }

        folderPath = decodeURIComponent(encodedFolderPath);
        docId = decodeURIComponent(encodedDocId);

        // Parse query parameters
        const queryMaxChars = parseInt(req.query.max_chars as string);
        if (!isNaN(queryMaxChars) && queryMaxChars > 0) {
          maxChars = Math.min(queryMaxChars, 50000); // Cap at 50K
        }
      }

      this.logger.debug(`[REST] Getting text for document ${docId} from folder ${folderPath} (offset: ${offset}, max_chars: ${maxChars})`);

      // Check database access
      const dbPath = await this.checkDatabaseAccess(folderPath, req, res);
      if (!dbPath) return;

      // Get document metadata and chunks from database
      const { default: sqlite3 } = await import('sqlite3');
      const { open } = await import('sqlite');

      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      try {
        // First get document information
        // The docId could be either a filename or a full path
        const fullDocPath = docId.startsWith('/') ? docId : path.join(folderPath, docId);
        const document = await db.get(`
          SELECT
            d.file_path,
            d.file_path as path,
            d.file_size as size,
            d.mime_type,
            d.last_modified,
            COUNT(c.id) as total_chunks,
            SUM(LENGTH(c.content)) as total_characters
          FROM documents d
          LEFT JOIN chunks c ON d.id = c.document_id
          WHERE d.file_path = ? OR d.file_path LIKE ?
          GROUP BY d.id
        `, [fullDocPath, `%/${docId}`]);

        if (!document) {
          await db.close();
          const errorResponse: ErrorResponse = {
            error: 'Not Found',
            message: `Document '${docId}' not found in folder`,
            timestamp: new Date().toISOString(),
            path: req.url
          };
          res.status(404).json(errorResponse);
          return;
        }

        // Get chunks with offset information (offsets are required database fields)
        const chunks = await db.all(`
          SELECT content, start_offset, end_offset, chunk_index
          FROM chunks
          WHERE document_id = (
            SELECT id FROM documents WHERE file_path = ? OR file_path LIKE ?
          )
          ORDER BY chunk_index
        `, [fullDocPath, `%/${docId}`]);

        await db.close();

        // Reconstruct text using offsets to handle the ~10% overlap between chunks
        let fullText = '';
        let lastEndOffset = 0;

        for (const chunk of chunks) {
          if (chunk.start_offset >= lastEndOffset) {
            // No overlap, append entire chunk
            fullText += chunk.content;
          } else {
            // There's overlap - skip the overlapping portion at the beginning
            const overlapChars = lastEndOffset - chunk.start_offset;
            fullText += chunk.content.substring(overlapChars);
          }
          lastEndOffset = chunk.end_offset;
        }
        const totalChars = fullText.length;

        // Apply character pagination
        const extractedText = fullText.substring(offset, offset + maxChars);
        const charactersReturned = extractedText.length;
        const hasMore = (offset + maxChars) < totalChars;

        // Generate extraction quality metadata
        const metadata = this.generateExtractionMetadata(
          document.mime_type || 'text/plain',
          totalChars,
          charactersReturned,
          document.total_chunks || 0
        );

        // Generate pagination info
        const pagination: DocumentTextPagination = {
          max_chars: maxChars,
          offset: offset,
          total: totalChars,
          returned: charactersReturned,
          has_more: hasMore,
          ...(hasMore && {
            continuation_token: Buffer.from(JSON.stringify({
              folder_path: folderPath,
              doc_id: docId,
              offset: offset + maxChars,
              max_chars: maxChars
            })).toString('base64')
          })
        };

        // Generate navigation hints
        const navigationHints = this.generateNavigationHints(
          hasMore,
          metadata.has_formatting_loss || false,
          totalChars - (offset + charactersReturned),
          maxChars,
          docId,
          metadata.extraction_warnings
        );

        // Build response
        const response: GetDocumentTextResponse = {
          base_folder_path: folderPath,
          file_path: docId,
          mime_type: document.mime_type || 'text/plain',
          size: document.size || 0,
          last_modified: document.last_modified || new Date().toISOString(),
          extracted_text: extractedText,
          metadata: metadata,
          pagination: pagination,
          navigation_hints: navigationHints
        };

        res.json(response);

      } catch (dbError) {
        await db.close();
        throw dbError;
      }

    } catch (error) {
      this.logger.error('[REST] Error getting document text:', error);

      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get document text',
        timestamp: new Date().toISOString(),
        path: req.url
      };
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Generate extraction quality metadata based on file type
   */
  private generateExtractionMetadata(
    mimeType: string,
    totalCharacters: number,
    charactersReturned: number,
    totalChunks: number
  ): ExtractionMetadata {
    const metadata: ExtractionMetadata = {
      total_characters: totalCharacters,
      characters_returned: charactersReturned,
      total_chunks: totalChunks
    };

    // Determine if formatting was lost based on mime type
    switch (mimeType) {
      case 'application/pdf':
        metadata.has_formatting_loss = true;
        metadata.extraction_warnings = [
          "Tables converted to text format",
          "Images and diagrams omitted",
          "Multi-column layout linearized"
        ];
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // Word documents generally preserve well
        // Only add warnings if specific features were present
        break;

      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        metadata.has_formatting_loss = true;
        metadata.extraction_warnings = [
          "Spreadsheet converted to text sections",
          "Formulas shown as calculated values",
          "Multiple sheets concatenated"
        ];
        break;

      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        metadata.has_formatting_loss = true;
        metadata.extraction_warnings = [
          "Slides converted to sequential text",
          "Speaker notes included inline",
          "Animations and transitions omitted"
        ];
        break;

      case 'text/markdown':
      case 'text/plain':
        // No formatting loss for plain text formats
        break;

      default:
        // Conservative default for unknown types
        if (!mimeType.startsWith('text/')) {
          metadata.has_formatting_loss = true;
          metadata.extraction_warnings = ["Format conversion may affect layout"];
        }
    }

    return metadata;
  }

  /**
   * Generate dynamic navigation hints based on context
   */
  private generateNavigationHints(
    hasMore: boolean,
    hasFormattingLoss: boolean,
    remainingChars: number,
    maxChars: number,
    filePath: string,
    extractionWarnings?: string[]
  ): DocumentTextNavigationHints {
    const hints: DocumentTextNavigationHints = {
      tip: ''
    };

    // Pagination hints
    if (hasMore) {
      hints.continue_reading = `Use continuation_token to get next ${maxChars} characters`;
      hints.remaining_content = `${remainingChars} characters remaining (${Math.ceil(remainingChars/maxChars)} more requests needed)`;
    }

    // Formatting loss hints
    if (hasFormattingLoss) {
      hints.formatting_alternative = `Use download_file endpoint to get "${filePath}" with original formatting preserved`;

      if (extractionWarnings?.some(w => w.includes("Tables"))) {
        hints.table_data = "For precise table structure, use download_file to get the original spreadsheet";
      }
      if (extractionWarnings?.some(w => w.includes("Images"))) {
        hints.visual_content = "Images and diagrams are available via download_file endpoint";
      }
    }

    // General tips
    if (hasMore && !hasFormattingLoss) {
      hints.tip = `Increase max_chars up to 50000 if you need more content at once`;
    } else if (hasFormattingLoss) {
      hints.tip = `Consider download_file for full fidelity if the extracted text isn't sufficient`;
    } else if (!hasMore) {
      hints.tip = 'Complete document retrieved successfully';
    }

    return hints;
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