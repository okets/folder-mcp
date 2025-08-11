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
import { writeFileSync, readFileSync, existsSync, unlinkSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn, type ChildProcess } from 'child_process';
import { FMDMWebSocketServer } from './websocket/server.js';
import { FMDMService } from './services/fmdm-service.js';
import { WebSocketProtocol } from './websocket/protocol.js';
// SQLiteVecStorage will be imported in Phase 5 when properly integrated
import { setupDependencyInjection } from '../di/setup.js';
import { MODULE_TOKENS } from '../di/interfaces.js';
import { IMultiFolderIndexingWorkflow } from '../application/indexing/index.js';
import { SERVICE_TOKENS } from '../di/interfaces.js';
import { MonitoredFoldersOrchestrator } from './services/monitored-folders-orchestrator.js';
import { DaemonRegistry } from './registry/daemon-registry.js';

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
  private monitoredFoldersOrchestrator: MonitoredFoldersOrchestrator | null = null;
  private CONFIG_SERVICE_TOKENS: any = null;

  constructor(config: DaemonConfig) {
    this.config = config;
    this.startTime = new Date();
  }

  private logToFile(message: string): void {
    const logFilePath = join(homedir(), '.folder-mcp', 'daemon-error.log');
    const timestamp = new Date().toISOString();
    appendFileSync(logFilePath, `[${timestamp}] ${message}\n`, 'utf8');
  }

  async start(): Promise<void> {
    debug('Starting folder-mcp daemon...');

    try {
      debug('Registering daemon in discovery registry...');
      await DaemonRegistry.register({
        pid: process.pid,
        httpPort: this.config.port,
        wsPort: this.config.port + 1,
        startTime: this.startTime.toISOString(),
        version: '1.0.0' // TODO: Get from package.json
      });
      debug('Daemon successfully registered in discovery registry.');
    } catch (error) {
      const errorMessage = `Failed to register daemon in discovery registry: ${error instanceof Error ? error.message : String(error)}`;
      debug(errorMessage);
      this.logToFile(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      debug('Setting up dependency injection container...');
      this.diContainer = setupDependencyInjection({
        logLevel: 'debug'
      });
      debug('Dependency injection container set up successfully.');

      debug('Loading configuration services...');
      const { registerConfigurationServices, CONFIG_SERVICE_TOKENS } = await import('../config/di-setup.js');
      this.CONFIG_SERVICE_TOKENS = CONFIG_SERVICE_TOKENS;
      const { join } = await import('path');
      const { homedir } = await import('os');

      const userConfigDir = process.env.FOLDER_MCP_USER_CONFIG_DIR || join(homedir(), '.folder-mcp');
      const userConfigPath = join(userConfigDir, 'config.yaml');

      registerConfigurationServices(this.diContainer, {
        userConfigPath: userConfigPath
      });
      debug('Configuration services loaded successfully.');

      debug('Loading configuration component...');
      const configComponent = this.diContainer.resolve(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
      await configComponent.load();
      debug('Configuration component loaded successfully.');

      debug('Initializing FMDM service...');
      this.fmdmService = this.diContainer.resolve(SERVICE_TOKENS.FMDM_SERVICE);
      debug('FMDM service initialized successfully.');

      debug('Initializing multi-folder indexing service...');
      this.indexingService = await this.diContainer.resolveAsync(SERVICE_TOKENS.MULTI_FOLDER_INDEXING_WORKFLOW);
      debug('Multi-folder indexing service initialized successfully.');

      debug('Initializing folder lifecycle manager...');
      const loggingService = this.diContainer.resolve(SERVICE_TOKENS.LOGGING);
      const fileSystemService = this.diContainer.resolve(SERVICE_TOKENS.FILE_SYSTEM);
      const fileStateService = this.diContainer.resolve(SERVICE_TOKENS.FILE_STATE_MANAGER);
      const indexingOrchestrator = await this.diContainer.resolveAsync('IIndexingOrchestrator');

      this.monitoredFoldersOrchestrator = new MonitoredFoldersOrchestrator(
        indexingOrchestrator,
        this.fmdmService!,
        fileSystemService,
        fileStateService,
        loggingService,
        configComponent // Reuse existing configComponent
      );
      debug('Folder lifecycle manager initialized successfully.');

      debug('Restoring folders from configuration using orchestrator.startAll()...');
      await this.monitoredFoldersOrchestrator!.startAll();
      debug('Folders restored successfully.');

      debug('Initializing WebSocket server...');
      this.webSocketServer = this.diContainer.resolve(SERVICE_TOKENS.WEBSOCKET_SERVER);
      debug('WebSocket server initialized successfully.');

      debug('Initializing validation service...');
      const validationService = this.diContainer.resolve(SERVICE_TOKENS.DAEMON_FOLDER_VALIDATION_SERVICE);
      await validationService.initialize();
      debug('Validation service initialized successfully.');

      debug('Creating WebSocket protocol...');
      const daemonConfigService = this.diContainer.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE);
      const webSocketProtocol = new WebSocketProtocol(
        validationService,
        daemonConfigService,
        this.fmdmService!,
        loggingService,
        this.monitoredFoldersOrchestrator // Pass monitored folders orchestrator directly
      );
      debug('WebSocket protocol created successfully.');

      debug('Updating WebSocket server with custom protocol...');
      this.webSocketServer!.setDependencies(this.fmdmService!, webSocketProtocol, loggingService);
      debug('WebSocket server updated successfully.');

      debug('Starting WebSocket server...');
      const wsPort = this.config.port + 1;
      await this.webSocketServer!.start(wsPort);
      debug(`WebSocket server started on ws://127.0.0.1:${wsPort}`);

      debug('Updating FMDM with daemon status...');
      this.fmdmService!.updateDaemonStatus({
        pid: process.pid,
        uptime: Math.floor(process.uptime())
      });
      debug(`FMDM updated with daemon status - PID: ${process.pid}, uptime: ${Math.floor(process.uptime())}s`);

      debug('Creating HTTP server...');
      this.server = createServer(this.handleRequest.bind(this));

      debug('Starting HTTP server...');
      return new Promise(async (resolve, reject) => {
        this.server!.listen(this.config.port, this.config.host, async () => {
          debug(`Daemon listening on http://${this.config.host}:${this.config.port}`);
          debug(`PID file: ${this.config.pidFile}`);
          resolve();
        });

        this.server!.on('error', (error) => {
          const errorMessage = `Server error: ${error}`;
          debug(errorMessage);
          this.logToFile(errorMessage);
          reject(error);
        });
      });
    } catch (error) {
      const errorMessage = `Error during daemon startup: ${error instanceof Error ? error.message : String(error)}`;
      debug(errorMessage);
      this.logToFile(errorMessage);
      throw error;
    }
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
    // Get memory statistics from monitored folders orchestrator if available
    let memoryStats = null;
    if (this.monitoredFoldersOrchestrator) {
      try {
        memoryStats = this.monitoredFoldersOrchestrator.getMemoryStatistics();
      } catch (error) {
        debug('Error getting memory statistics:', error);
      }
    }
    
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
      memory: {
        process: process.memoryUsage(),
        orchestrator: memoryStats ? {
          heapUtilizationPercent: Math.round(memoryStats.heapUtilizationPercent * 10) / 10,
          resourceManager: {
            memoryUsedMB: Math.round(memoryStats.resourceManager.memoryUsedMB),
            memoryLimitMB: memoryStats.resourceManager.memoryLimitMB,
            memoryPercent: Math.round(memoryStats.resourceManager.memoryPercent * 10) / 10,
            activeOperations: memoryStats.resourceManager.activeOperations,
            queuedOperations: memoryStats.resourceManager.queuedOperations,
            isThrottled: memoryStats.resourceManager.isThrottled
          },
          folders: memoryStats.folders
        } : null
      },
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
    
    // Legacy PID file cleanup no longer needed - DaemonRegistry handles cleanup
    // this.removePidFile();
    
    // Clean up discovery registry
    try {
      await DaemonRegistry.cleanup();
      debug('Discovery registry cleaned up');
    } catch (error) {
      debug('Failed to cleanup discovery registry:', error);
    }
    
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
    
    // Extra safety: cleanup registry on process exit
    process.on('exit', () => {
      // Synchronous cleanup only - process is already exiting
      try {
        DaemonRegistry.cleanup();
      } catch (error) {
        // Ignore errors during exit cleanup
      }
    });
  }

  /**
   * Trigger indexing for a specific folder with status updates
   */
  async startFolderIndexing(folderPath: string): Promise<void> {
    if (!this.fmdmService || !this.monitoredFoldersOrchestrator) {
      debug(`Cannot start indexing: services not initialized`);
      return;
    }

    debug(`Starting indexing for folder: ${folderPath}`);
    
    try {
      // Get folder configuration
      const configComponent = this.diContainer.resolve(this.CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
      const folders = await configComponent.get('folders.list') || [];
      const folderConfig = folders.find((f: any) => f.path === folderPath);
      
      if (!folderConfig) {
        debug(`Folder not found in configuration: ${folderPath}`);
        return;
      }
      
      // Start lifecycle management for this folder
      await this.monitoredFoldersOrchestrator.addFolder(folderConfig.path, folderConfig.model);
      
      debug(`Started lifecycle management for folder: ${folderPath}`);
      
    } catch (error) {
      debug(`Indexing error for folder ${folderPath}:`, error);
      debug(`Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: error?.constructor?.name || typeof error
      });
      
      // Update status to error
      try {
        this.fmdmService.updateFolderStatus(folderPath, 'error');
      } catch (statusError) {
        debug(`Failed to update folder status after error:`, statusError);
      }
      
      // Don't re-throw the error - this prevents daemon crash
      // The error is logged and status is updated
    }
  }
}

// Utility functions
export function getPidFilePath(): string {
  const configDir = join(homedir(), '.folder-mcp');
  return join(configDir, 'daemon.pid');
}

export async function isDaemonRunning(): Promise<{ running: boolean; pid?: number }> {
  // Use new DaemonRegistry instead of legacy PID file
  const daemonInfo = await DaemonRegistry.discover();
  
  if (daemonInfo) {
    return { running: true, pid: daemonInfo.pid };
  } else {
    return { running: false };
  }
}

async function waitForProcessExit(pid: number, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      process.kill(pid, 0); // Check if process exists (doesn't actually kill)
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
        return; // Process no longer exists - success!
      }
      throw error; // Some other error
    }
  }
  
  throw new Error(`Process ${pid} did not exit within ${timeoutMs}ms`);
}

async function stopExistingDaemon(daemonInfo: any): Promise<void> {
  debug(`Stopping existing daemon (PID: ${daemonInfo.pid})...`);
  
  try {
    // Try graceful shutdown first (SIGTERM)
    process.kill(daemonInfo.pid, 'SIGTERM');
    
    // Wait up to 5 seconds for graceful shutdown
    await waitForProcessExit(daemonInfo.pid, 5000);
    debug('Existing daemon stopped gracefully');
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
      // Process already dead
      debug('Existing daemon already stopped');
    } else {
      // Graceful shutdown failed, try force kill
      debug('Graceful shutdown failed, force killing...');
      try {
        process.kill(daemonInfo.pid, 'SIGKILL');
        await waitForProcessExit(daemonInfo.pid, 2000);
        debug('Existing daemon force killed');
      } catch (killError) {
        throw new Error(`Failed to stop existing daemon: ${killError}`);
      }
    }
  }
  
  // Clean up registry file
  await DaemonRegistry.cleanup();
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
  --port <port>      HTTP server port (default: 31849)
  --host <host>      HTTP server host (default: 127.0.0.1)
  --restart, -r      Restart daemon, stopping any existing instances
  --help, -h         Show this help message

The daemon provides an HTTP API for TUI communication and manages
the folder-mcp services.
`);
    process.exit(0);
  }
  
  // Parse options
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 ? parseInt(args[portIndex + 1] || '31849', 10) : 31849;
  
  const hostIndex = args.indexOf('--host');
  const host = hostIndex !== -1 ? args[hostIndex + 1] || '127.0.0.1' : '127.0.0.1';
  
  const restartFlag = args.includes('--restart') || args.includes('-r');
  
  // Handle restart BEFORE any other operations
  if (restartFlag) {
    debug('Restart flag detected, checking for existing daemon...');
    const status = await isDaemonRunning();
    if (status.running) {
      const daemonInfo = await DaemonRegistry.discover();
      if (daemonInfo) {
        debug(`Found existing daemon (PID: ${daemonInfo.pid}), stopping it...`);
        await stopExistingDaemon(daemonInfo);
        debug('Existing daemon stopped, waiting for cleanup...');
        
        // Wait to ensure the process is fully terminated and registry is cleaned
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      debug('No existing daemon found to restart');
    }
  }
  
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
  
  // Check if daemon is already running (after restart handling)
  const status = await isDaemonRunning();
  if (status.running && !restartFlag) {
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
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.endsWith('/daemon/index.js') || 
    (process.argv[1] && process.argv[1].endsWith('daemon/index.js')) || 
    (process.argv[1] && process.argv[1].endsWith('daemon\\index.js'))) {
  main().catch((error) => {
    debug('Fatal error:', error);
    process.exit(1);
  });
}