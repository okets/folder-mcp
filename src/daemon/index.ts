#!/usr/bin/env node

/**
 * Folder-MCP Daemon
 * 
 * This daemon provides:
 * 1. HTTP API for TUI communication
 * 2. Process management and health monitoring
 * 3. PID file management
 * 4. Can spawn MCP server processes
 */

import { createServer, type Server } from 'http';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn, type ChildProcess } from 'child_process';
import { FMDMWebSocketServer } from './websocket/server.js';
import { FMDMService } from './services/fmdm-service.js';
import { WebSocketProtocol } from './websocket/protocol.js';
import { DaemonFolderValidationService } from './services/folder-validation-service.js';
import { DaemonConfigurationService } from './services/configuration-service.js';
// SQLiteVecStorage will be imported in Phase 5 when properly integrated
import { setupDependencyInjection } from '../di/setup.js';
import { MODULE_TOKENS } from '../di/interfaces.js';
import { IMultiFolderIndexingWorkflow } from '../application/indexing/index.js';
import { SERVICE_TOKENS } from '../di/interfaces.js';

// Create a simple debug logger
const debug = (message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  if (args.length > 0) {
    console.error(`[${timestamp}] [DAEMON] ${message}`, ...args);
  } else {
    console.error(`[${timestamp}] [DAEMON] ${message}`);
  }
};

interface DaemonConfig {
  port: number;
  host: string;
  pidFile: string;
  logFile?: string;
}

interface HealthResponse {
  status: 'healthy' | 'starting' | 'error';
  pid: number;
  uptime: number;
  version: string;
  startTime: string;
}

class FolderMCPDaemon {
  private server: Server | null = null;
  private config: DaemonConfig;
  private startTime: Date;
  private mcpProcess: ChildProcess | null = null;
  private webSocketServer: FMDMWebSocketServer | null = null;
  private fmdmService: FMDMService | null = null;
  private diContainer: any = null;
  private indexingService: IMultiFolderIndexingWorkflow | null = null;

  constructor(config: DaemonConfig) {
    this.config = config;
    this.startTime = new Date();
  }

  async start(): Promise<void> {
    debug('Starting folder-mcp daemon...');
    
    // Write PID file
    this.writePidFile();
    
    // Initialize DI container for indexing services
    this.diContainer = setupDependencyInjection({
      logLevel: 'info'
    });
    
    // Setup configuration services in DI container
    const { registerConfigurationServices, CONFIG_SERVICE_TOKENS } = await import('../config/di-setup.js');
    const { join } = await import('path');
    const { homedir } = await import('os');
    registerConfigurationServices(this.diContainer, {
      userConfigPath: join(homedir(), '.folder-mcp', 'config.yaml')
    });
    
    // Connect to real configuration system
    const configComponent = this.diContainer.resolve(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
    await configComponent.load();
    
    // Real config service that reads from the same source as TUI
    const realConfigService = {
      getFolders: async () => {
        const foldersList = await configComponent.get('folders.list') || [];
        debug(`RealConfigService: Retrieved ${foldersList.length} folders from config: ${JSON.stringify(foldersList)}`);
        return foldersList;
      }
    };
    const mockLogger = {
      debug: (msg: string, ...args: any[]) => debug(msg, ...args),
      info: (msg: string, ...args: any[]) => debug(msg, ...args),
      warn: (msg: string, ...args: any[]) => debug(msg, ...args),
      error: (msg: string, ...args: any[]) => debug(msg, ...args),
      fatal: (msg: string, ...args: any[]) => debug(msg, ...args),
      setLevel: (level: string) => {} // No-op for mock
    };
    this.fmdmService = new FMDMService(realConfigService, mockLogger);
    
    // Initialize multi-folder indexing service from DI container
    this.indexingService = await this.diContainer.resolveAsync(SERVICE_TOKENS.MULTI_FOLDER_INDEXING_WORKFLOW);
    debug('Multi-folder indexing service initialized');
    
    // Load existing folders from configuration and update FMDM
    try {
      debug('About to load existing folders from configuration...');
      const existingFolders = await realConfigService.getFolders();
      debug(`Loading ${existingFolders.length} existing folders from configuration`);
      if (existingFolders.length > 0) {
        // Convert config folders to FMDM folder format
        const fmdmFolders = existingFolders.map((folder: any) => ({
          path: folder.path,
          model: folder.model,
          status: 'pending' as const  // Default status for newly loaded folders
        }));
        debug(`Converting to FMDM format: ${JSON.stringify(fmdmFolders)}`);
        this.fmdmService.updateFolders(fmdmFolders);
        debug(`Updated FMDM with ${fmdmFolders.length} existing folders`);
      } else {
        debug('No existing folders found in configuration');
      }
    } catch (error) {
      debug('Error loading existing folders:', error instanceof Error ? error.message : error);
      debug('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
    
    // Create and start WebSocket server for TUI communication
    this.webSocketServer = new FMDMWebSocketServer(this.fmdmService, mockLogger);
    
    // Create proper WebSocket protocol with all required services
    const daemonConfigService = new DaemonConfigurationService(configComponent, mockLogger);
    const validationService = new DaemonFolderValidationService(daemonConfigService, mockLogger);
    
    // Initialize services
    await validationService.initialize();
    
    // Create the proper WebSocket protocol
    const webSocketProtocol = new WebSocketProtocol(
      validationService,
      daemonConfigService,
      this.fmdmService,
      mockLogger,
      this // Pass daemon as indexing trigger
    );
    
    this.webSocketServer.setDependencies(this.fmdmService, webSocketProtocol, mockLogger);
    await this.webSocketServer.start(31849);
    debug('WebSocket server started on ws://127.0.0.1:31849');
    
    // Create HTTP server
    this.server = createServer(this.handleRequest.bind(this));
    
    // Start listening
    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        debug(`Daemon listening on http://${this.config.host}:${this.config.port}`);
        debug(`PID file: ${this.config.pidFile}`);
        resolve();
      });
      
      this.server!.on('error', (error) => {
        debug('Server error:', error);
        reject(error);
      });
    });
  }

  private async handleRequest(req: any, res: any): Promise<void> {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    // Handle OPTIONS for CORS
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    try {
      let response: any;
      
      switch (url.pathname) {
        case '/health':
          response = this.getHealthStatus();
          break;
          
        case '/status':
          response = this.getDetailedStatus();
          break;
          
        default:
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
      }
      
      res.writeHead(200);
      res.end(JSON.stringify(response, null, 2));
      
    } catch (error) {
      debug('Request error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  private getHealthStatus(): HealthResponse {
    return {
      status: 'healthy',
      pid: process.pid,
      uptime: Date.now() - this.startTime.getTime(),
      version: '1.0.0',
      startTime: this.startTime.toISOString()
    };
  }

  private getDetailedStatus() {
    return {
      ...this.getHealthStatus(),
      config: {
        port: this.config.port,
        host: this.config.host,
        pidFile: this.config.pidFile
      },
      mcpServer: {
        running: this.mcpProcess !== null,
        pid: this.mcpProcess?.pid || null
      },
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };
  }

  private writePidFile(): void {
    try {
      writeFileSync(this.config.pidFile, process.pid.toString(), 'utf8');
      debug(`PID file written: ${this.config.pidFile} (PID: ${process.pid})`);
    } catch (error) {
      debug('Failed to write PID file:', error);
      throw error;
    }
  }

  private removePidFile(): void {
    try {
      if (existsSync(this.config.pidFile)) {
        unlinkSync(this.config.pidFile);
        debug('PID file removed');
      }
    } catch (error) {
      debug('Failed to remove PID file:', error);
    }
  }

  async stop(): Promise<void> {
    debug('Stopping daemon...');
    
    // Stop WebSocket server
    if (this.webSocketServer) {
      debug('Stopping WebSocket server...');
      await this.webSocketServer.stop();
      this.webSocketServer = null;
    }
    
    // Stop MCP process if running
    if (this.mcpProcess) {
      debug('Stopping MCP process...');
      this.mcpProcess.kill('SIGTERM');
      this.mcpProcess = null;
    }
    
    // Stop HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          debug('HTTP server stopped');
          resolve();
        });
      });
    }
    
    // Remove PID file
    this.removePidFile();
    
    debug('Daemon stopped');
  }

  // TODO: Future Phase 5 - Connect SQLite-vec storage to daemon indexing pipeline
  // This will be implemented following the clean architecture where:
  // - Daemon orchestrates indexing workflow
  // - FMDM broadcasts status changes
  // - TUI displays status updates

  // Setup graceful shutdown
  setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      debug(`Received ${signal}, shutting down gracefully...`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        debug('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      debug('Uncaught exception:', error);
      this.stop().finally(() => process.exit(1));
    });
    process.on('unhandledRejection', (reason) => {
      debug('Unhandled rejection:', reason);
      this.stop().finally(() => process.exit(1));
    });
  }

  /**
   * Trigger indexing for a specific folder with status updates
   */
  async startFolderIndexing(folderPath: string): Promise<void> {
    if (!this.fmdmService || !this.indexingService) {
      debug(`Cannot start indexing: services not initialized`);
      return;
    }

    debug(`Starting indexing for folder: ${folderPath}`);
    
    try {
      // Update status to indexing
      this.fmdmService.updateFolderStatus(folderPath, 'indexing');
      
      // Start indexing (this is async)
      const indexingResult = await this.indexingService.indexFolder(folderPath, {
        baseOptions: {
          forceReindex: false // Use cache when possible
        }
      });
      
      if (indexingResult.success) {
        // Update status to indexed first, then watching
        this.fmdmService.updateFolderStatus(folderPath, 'indexed');
        
        // TODO: In future, start file monitoring and update to 'watching'
        // For now, keep as 'indexed'
        debug(`Indexing completed for folder: ${folderPath}`);
      } else {
        // Update status to error
        this.fmdmService.updateFolderStatus(folderPath, 'error');
        debug(`Indexing failed for folder: ${folderPath}`, indexingResult.error);
      }
      
    } catch (error) {
      debug(`Indexing error for folder ${folderPath}:`, error);
      this.fmdmService.updateFolderStatus(folderPath, 'error');
    }
  }
}

// Utility functions
export function getPidFilePath(): string {
  const configDir = join(homedir(), '.folder-mcp');
  return join(configDir, 'daemon.pid');
}

export function isDaemonRunning(): { running: boolean; pid?: number } {
  const pidFile = getPidFilePath();
  
  if (!existsSync(pidFile)) {
    return { running: false };
  }
  
  try {
    const pidStr = readFileSync(pidFile, 'utf8').trim();
    const pid = parseInt(pidStr, 10);
    
    if (isNaN(pid)) {
      return { running: false };
    }
    
    // Check if process is actually running
    try {
      process.kill(pid, 0); // Doesn't actually kill, just checks if process exists
      return { running: true, pid };
    } catch {
      // Process doesn't exist, remove stale PID file
      unlinkSync(pidFile);
      return { running: false };
    }
  } catch (error) {
    debug('Error checking daemon status:', error);
    return { running: false };
  }
}

// Main function
async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
folder-mcp daemon

Usage:
  folder-mcp-daemon [options]

Options:
  --port <port>    HTTP server port (default: 9876)
  --host <host>    HTTP server host (default: 127.0.0.1)
  --help, -h       Show this help message

The daemon provides an HTTP API for TUI communication and manages
the folder-mcp services.
`);
    process.exit(0);
  }
  
  // Parse options
  const port = parseInt(args[args.indexOf('--port') + 1] || '9876', 10);
  const host = args[args.indexOf('--host') + 1] || '127.0.0.1';
  
  // Create config directory if it doesn't exist
  const configDir = join(homedir(), '.folder-mcp');
  try {
    const { mkdirSync } = await import('fs');
    mkdirSync(configDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }
  
  const config: DaemonConfig = {
    port,
    host,
    pidFile: getPidFilePath()
  };
  
  // Check if daemon is already running
  const status = isDaemonRunning();
  if (status.running) {
    debug(`Daemon already running with PID ${status.pid}`);
    process.exit(1);
  }
  
  // Start daemon
  const daemon = new FolderMCPDaemon(config);
  daemon.setupShutdownHandlers();
  
  try {
    await daemon.start();
    debug('Daemon started successfully');
  } catch (error) {
    debug('Failed to start daemon:', error);
    process.exit(1);
  }
}

// Export for testing
export { FolderMCPDaemon, type DaemonConfig };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    debug('Fatal error:', error);
    process.exit(1);
  });
}