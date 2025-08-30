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
import { FMDMService } from '../services/fmdm-service.js';

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
}