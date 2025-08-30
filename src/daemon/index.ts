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

import { writeFileSync, readFileSync, existsSync, unlinkSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn, type ChildProcess } from 'child_process';
import { FMDMWebSocketServer } from './websocket/server.js';
import { FMDMService } from './services/fmdm-service.js';
import { WebSocketProtocol } from './websocket/protocol.js';
import { RESTAPIServer } from './rest/server.js';
// SQLiteVecStorage will be imported in Phase 5 when properly integrated
import { setupDependencyInjection } from '../di/setup.js';
import { MODULE_TOKENS } from '../di/interfaces.js';
import { IMultiFolderIndexingWorkflow } from '../application/indexing/index.js';
import { SERVICE_TOKENS } from '../di/interfaces.js';
import { getSupportedGpuModelIds, getSupportedCpuModelIds, setDynamicDefaultModel } from '../config/model-registry.js';
import { MonitoredFoldersOrchestrator } from './services/monitored-folders-orchestrator.js';
import { DaemonRegistry } from './registry/daemon-registry.js';
import { ModelCacheChecker } from './services/model-cache-checker.js';
import { DefaultModelSelector } from './services/default-model-selector.js';

// Log level configuration
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Get log level from environment or default to 'info'
const currentLogLevel = (process.env.DAEMON_LOG_LEVEL?.toLowerCase() || 'info') as LogLevel;
const currentLogLevelValue = LOG_LEVELS[currentLogLevel] ?? LOG_LEVELS.info;

// Create a logger with level support
const log = (level: LogLevel, message: string, ...args: any[]) => {
  if (LOG_LEVELS[level] >= currentLogLevelValue) {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    if (args.length > 0) {
      console.error(`[${timestamp}] ${levelStr} [DAEMON] ${message}`, ...args);
    } else {
      console.error(`[${timestamp}] ${levelStr} [DAEMON] ${message}`);
    }
  }
};

// Convenience methods
const debug = (message: string, ...args: any[]) => log('debug', message, ...args);
const info = (message: string, ...args: any[]) => log('info', message, ...args);
const warn = (message: string, ...args: any[]) => log('warn', message, ...args);
const logError = (message: string, ...args: any[]) => log('error', message, ...args);

interface DaemonConfig {
  port: number;
  host: string;
  pidFile: string;
  logFile?: string;
}


class FolderMCPDaemon {
  private restAPIServer: RESTAPIServer | null = null;
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
    info(`Starting folder-mcp daemon on port ${this.config.port}`);

    try {
      debug('Registering daemon in discovery registry...');
      await DaemonRegistry.register({
        pid: process.pid,
        httpPort: this.config.port,
        wsPort: this.config.port + 1,
        restPort: 3002,  // REST API port for MCP operations
        host: '127.0.0.1',
        startTime: this.startTime.toISOString(),
        version: '1.0.0' // TODO: Get from package.json
      });
      debug('Daemon registered in discovery registry');
    } catch (error) {
      const errorMessage = `Failed to register daemon in discovery registry: ${error instanceof Error ? error.message : String(error)}`;
      logError(errorMessage);
      this.logToFile(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      debug('Setting up dependency injection container...');
      this.diContainer = setupDependencyInjection({
        logLevel: currentLogLevel
      });
      debug('Dependency injection container ready');

      debug('Loading configuration...');
      const { registerConfigurationServices, CONFIG_SERVICE_TOKENS } = await import('../config/di-setup.js');
      this.CONFIG_SERVICE_TOKENS = CONFIG_SERVICE_TOKENS;
      const { join } = await import('path');
      const { homedir } = await import('os');

      const userConfigDir = process.env.FOLDER_MCP_USER_CONFIG_DIR || join(homedir(), '.folder-mcp');
      const userConfigPath = join(userConfigDir, 'config.yaml');

      registerConfigurationServices(this.diContainer, {
        userConfigPath: userConfigPath
      });
      debug('Configuration loaded');

      const configComponent = this.diContainer.resolve(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
      await configComponent.load();

      debug('Initializing services...');
      this.fmdmService = this.diContainer.resolve(SERVICE_TOKENS.FMDM_SERVICE);

      this.indexingService = await this.diContainer.resolveAsync(SERVICE_TOKENS.MULTI_FOLDER_INDEXING_WORKFLOW);

      const loggingService = this.diContainer.resolve(SERVICE_TOKENS.LOGGING);
      const fileSystemService = this.diContainer.resolve(SERVICE_TOKENS.FILE_SYSTEM);
      const indexingOrchestrator = await this.diContainer.resolveAsync('IIndexingOrchestrator');

      this.monitoredFoldersOrchestrator = new MonitoredFoldersOrchestrator(
        indexingOrchestrator,
        this.fmdmService!,
        fileSystemService,
        loggingService,
        configComponent // Reuse existing configComponent
      );
      debug('Services initialized');
      
      // Set up cache update callback for model downloads
      this.setupModelCacheUpdateCallback(configComponent);

      // Load cached model status FIRST (fast startup)
      info('Loading cached model status...');
      await this.loadCachedModelStatus(loggingService, configComponent);
      
      // Select default model based on cached status
      await this.selectDefaultModel(loggingService);
      
      debug('Loading configured folders into FMDM...');
      await this.fmdmService!.loadFoldersFromConfig();
      
      debug('Restoring monitored folders...');
      await this.monitoredFoldersOrchestrator!.startAll();
      const folders = this.fmdmService!.getFMDM().folders;
      if (folders.length > 0) {
        info(`Monitoring ${folders.length} folder${folders.length > 1 ? 's' : ''}`);
      }

      debug('Initializing WebSocket server...');
      this.webSocketServer = await this.diContainer.resolveAsync(SERVICE_TOKENS.WEBSOCKET_SERVER);
      
      const validationService = this.diContainer.resolve(SERVICE_TOKENS.DAEMON_FOLDER_VALIDATION_SERVICE);
      await validationService.initialize();

      const daemonConfigService = this.diContainer.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE);
      const modelHandlers = this.diContainer.resolve(SERVICE_TOKENS.MODEL_HANDLERS);
      const webSocketProtocol = new WebSocketProtocol(
        validationService,
        daemonConfigService,
        this.fmdmService!,
        loggingService,
        modelHandlers,
        this.monitoredFoldersOrchestrator // Pass monitored folders orchestrator directly
      );
      
      this.webSocketServer!.setDependencies(this.fmdmService!, webSocketProtocol, loggingService);

      // Start WebSocket server on daemon port + 1 for TUI communication
      const wsPort = this.config.port + 1;
      await this.webSocketServer!.start(wsPort);
      info(`WebSocket server started on ws://127.0.0.1:${wsPort}`);

      // Initialize and start REST API server on port 3002 for MCP operations
      debug('Initializing REST API server...');
      try {
        // Create DocumentService instance for dependency injection
        const { DocumentService } = await import('./services/document-service.js');
        const documentService = new DocumentService({
          debug,
          warn
        });
        
        this.restAPIServer = new RESTAPIServer(this.fmdmService!, documentService, {
          info,
          warn,
          error: logError,
          debug
        });
        debug('REST API server instance created successfully');
        
        const restPort = 3002;
        debug(`Starting REST API server on port ${restPort}...`);
        await this.restAPIServer.start(restPort, '127.0.0.1');
        info(`REST API server started on http://127.0.0.1:${restPort}`);
      } catch (restError) {
        logError('Failed to start REST API server:', restError);
        throw restError;
      }

      // Schedule background model status refresh (non-blocking)
      setImmediate(async () => {
        try {
          info('Refreshing model status in background...');
          await this.refreshModelStatusInBackground(loggingService, configComponent);
          info('Model status refreshed successfully');
        } catch (error) {
          logError('Background model check failed (non-critical):', error);
        }
      });

      this.fmdmService!.updateDaemonStatus({
        pid: process.pid,
        uptime: Math.floor(process.uptime())
      });
      debug(`Daemon status updated - PID: ${process.pid}`);

      // All servers are now running - daemon is ready
      info(`Daemon ready (PID: ${process.pid})`);
      info(`Hybrid architecture active:`);
      info(`- WebSocket (TUI): ws://127.0.0.1:${wsPort}`);
      info(`- REST API (MCP): http://127.0.0.1:3002`);
      debug(`PID file: ${this.config.pidFile}`);
    } catch (err) {
      const errorMessage = `Error during daemon startup: ${err instanceof Error ? err.message : String(err)}`;
      logError(errorMessage);
      this.logToFile(errorMessage);
      throw err;
    }
  }



  private writePidFile(): void {
    try {
      writeFileSync(this.config.pidFile, process.pid.toString(), 'utf8');
      debug(`PID file written: ${this.config.pidFile} (PID: ${process.pid})`);
    } catch (error) {
      logError('Failed to write PID file:', error);
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
      warn('Failed to remove PID file:', error);
    }
  }

  async stop(): Promise<void> {
    info('Stopping daemon...');
    
    // Stop WebSocket server
    if (this.webSocketServer) {
      debug('Stopping WebSocket server...');
      await this.webSocketServer.stop();
      this.webSocketServer = null;
    }
    
    // Stop REST API server
    if (this.restAPIServer) {
      debug('Stopping REST API server...');
      await this.restAPIServer.stop();
      this.restAPIServer = null;
    }
    
    // Stop MCP process if running
    if (this.mcpProcess) {
      debug('Stopping MCP process...');
      this.mcpProcess.kill('SIGTERM');
      this.mcpProcess = null;
    }
    
    
    // Legacy PID file cleanup no longer needed - DaemonRegistry handles cleanup
    // this.removePidFile();
    
    // Clean up discovery registry
    try {
      await DaemonRegistry.cleanup();
      debug('Discovery registry cleaned up');
    } catch (error) {
      warn('Failed to cleanup discovery registry:', error);
    }
    
    info('Daemon stopped');
  }

  // TODO: Future Phase 5 - Connect SQLite-vec storage to daemon indexing pipeline
  // This will be implemented following the clean architecture where:
  // - Daemon orchestrates indexing workflow
  // - FMDM broadcasts status changes
  // - TUI displays status updates

  /**
   * Initialize curated models by checking their installation status
   */
  private async initializeCuratedModels(loggingService: any): Promise<void> {
    try {
      // Use factories module to avoid direct instantiation
      const { createPythonEmbeddingService, createONNXDownloader } = await import('./factories/model-factories.js');
      
      const checker = new ModelCacheChecker(loggingService, createPythonEmbeddingService, createONNXDownloader);
      const result = await checker.checkCuratedModels();
      
      this.fmdmService!.setCuratedModelInfo(result.models, result.status);
      
      const gpuCount = result.models.filter(m => m.type === 'gpu' && m.installed).length;
      const cpuCount = result.models.filter(m => m.type === 'cpu' && m.installed).length;
      
      info(`Model check complete: ${gpuCount} GPU, ${cpuCount} CPU models installed`);
      
      // Select optimal default model based on hardware capabilities
      try {
        loggingService.info('[DAEMON] Starting default model selection...');
        const defaultSelector = new DefaultModelSelector(
          loggingService,
          result.models,
          result.status.pythonAvailable
        );
        
        loggingService.info('[DAEMON] Determining optimal default model...');
        const defaultSelection = await defaultSelector.determineOptimalDefault();
        
        // Update configuration with new default
        // Note: Configuration persistence can be added later when CONFIG_TOKENS is properly exported
        // For now, just update the in-memory registry
        
        // Update model registry immediately
        setDynamicDefaultModel(defaultSelection.modelId);
        
        info(`Selected default model: ${defaultSelection.modelId} (${defaultSelection.selectionReason})`);
        loggingService.info(`[DAEMON] Selected default model: ${defaultSelection.modelId} (${defaultSelection.selectionReason})`);
      } catch (error) {
        logError('Failed to select default model:', error);
        // System will fallback to smallest CPU model via model-registry
      }
      
      if (result.status.error) {
        info(`Note: ${result.status.error}`);
      }
    } catch (error) {
      // Non-critical - set defaults and continue
      logError('Model check failed (non-critical):', error);
      
      // Set all models as not installed as fallback
      const gpuModels = getSupportedGpuModelIds().map(id => ({ id, installed: false, type: 'gpu' as const }));
      const cpuModels = getSupportedCpuModelIds().map(id => ({ id, installed: false, type: 'cpu' as const }));
      const defaultModels = [...gpuModels, ...cpuModels
      ];
      
      this.fmdmService!.setCuratedModelInfo(defaultModels, {
        pythonAvailable: false,
        gpuModelsCheckable: false,
        error: 'Model check failed',
        checkedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Select default model based on current FMDM state
   */
  private async selectDefaultModel(loggingService: any): Promise<void> {
    try {
      // Get current model status from FMDM
      const fmdm = this.fmdmService!.getFMDM();
      const models = fmdm.curatedModels || [];
      const status = fmdm.modelCheckStatus || { pythonAvailable: false, gpuModelsCheckable: false };
      
      if (models.length === 0) {
        debug('No model information available for default selection');
        return;
      }
      
      loggingService.info('[DAEMON] Starting default model selection...');
      const defaultSelector = new DefaultModelSelector(
        loggingService,
        models,
        status.pythonAvailable
      );
      
      loggingService.info('[DAEMON] Determining optimal default model...');
      const defaultSelection = await defaultSelector.determineOptimalDefault();
      
      // Update model registry immediately
      setDynamicDefaultModel(defaultSelection.modelId);
      
      info(`Selected default model: ${defaultSelection.modelId} (${defaultSelection.selectionReason})`);
      loggingService.info(`[DAEMON] Selected default model: ${defaultSelection.modelId} (${defaultSelection.selectionReason})`);
    } catch (error) {
      logError('Failed to select default model:', error);
      // System will fallback to smallest CPU model via model-registry
    }
  }
  
  /**
   * Load cached model status from configuration (fast startup)
   */
  private async loadCachedModelStatus(loggingService: any, configComponent: any): Promise<void> {
    try {
      const cachedStatus = await configComponent.get('modelStatusCache');
      
      if (cachedStatus && cachedStatus.lastChecked) {
        // Use cached model status
        const models = Object.entries(cachedStatus.models || {}).map(([id, info]: [string, any]) => ({
          id,
          installed: info.installed,
          type: id.startsWith('gpu:') ? 'gpu' as const : 'cpu' as const
        }));
        
        this.fmdmService!.setCuratedModelInfo(models, {
          pythonAvailable: cachedStatus.pythonAvailable,
          gpuModelsCheckable: cachedStatus.gpuModelsCheckable,
          checkedAt: cachedStatus.lastChecked
        });
        
        const gpuCount = models.filter(m => m.type === 'gpu' && m.installed).length;
        const cpuCount = models.filter(m => m.type === 'cpu' && m.installed).length;
        
        info(`Using cached model status: ${gpuCount} GPU, ${cpuCount} CPU models installed`);
      } else {
        // No cache available - set defaults
        const gpuModels = getSupportedGpuModelIds().map(id => ({ id, installed: false, type: 'gpu' as const }));
        const cpuModels = getSupportedCpuModelIds().map(id => ({ id, installed: false, type: 'cpu' as const }));
        const defaultModels = [...gpuModels, ...cpuModels];
        
        this.fmdmService!.setCuratedModelInfo(defaultModels, {
          pythonAvailable: false,
          gpuModelsCheckable: false,
          checkedAt: new Date().toISOString()
        });
        
        info('No cached model status found - using defaults');
      }
    } catch (error) {
      // Fallback to defaults
      logError('Failed to load cached model status:', error);
      const gpuModels = getSupportedGpuModelIds().map(id => ({ id, installed: false, type: 'gpu' as const }));
      const cpuModels = getSupportedCpuModelIds().map(id => ({ id, installed: false, type: 'cpu' as const }));
      const defaultModels = [...gpuModels, ...cpuModels];
      
      this.fmdmService!.setCuratedModelInfo(defaultModels, {
        pythonAvailable: false,
        gpuModelsCheckable: false,
        checkedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Refresh model status in background and update cache
   */
  private async refreshModelStatusInBackground(loggingService: any, configComponent: any): Promise<void> {
    try {
      // Use existing model checking logic
      const { createPythonEmbeddingService, createONNXDownloader } = await import('./factories/model-factories.js');
      
      const checker = new ModelCacheChecker(loggingService, createPythonEmbeddingService, createONNXDownloader);
      const result = await checker.checkCuratedModels();
      
      // Update in-memory FMDM
      this.fmdmService!.setCuratedModelInfo(result.models, result.status);
      
      // Save to cache for next startup
      const cacheData = {
        lastChecked: new Date().toISOString(),
        models: {} as Record<string, { installed: boolean; checkedAt: string }>,
        pythonAvailable: result.status.pythonAvailable,
        gpuModelsCheckable: result.status.gpuModelsCheckable
      };
      
      // Convert models array to cache format
      for (const model of result.models) {
        cacheData.models[model.id] = {
          installed: model.installed,
          checkedAt: new Date().toISOString()
        };
      }
      
      await configComponent.set('modelStatusCache', cacheData);
      
      const gpuCount = result.models.filter(m => m.type === 'gpu' && m.installed).length;
      const cpuCount = result.models.filter(m => m.type === 'cpu' && m.installed).length;
      
      debug(`Background model check complete: ${gpuCount} GPU, ${cpuCount} CPU models installed`);
      
      // Re-select default model with updated information
      try {
        const defaultSelector = new DefaultModelSelector(
          loggingService,
          result.models,
          result.status.pythonAvailable
        );
        
        const defaultSelection = await defaultSelector.determineOptimalDefault();
        setDynamicDefaultModel(defaultSelection.modelId);
        
        debug(`Updated default model: ${defaultSelection.modelId} (${defaultSelection.selectionReason})`);
      } catch (error) {
        debug('Failed to update default model:', error);
      }
      
      if (result.status.error) {
        debug(`Note: ${result.status.error}`);
      }
    } catch (error) {
      // Background check failed - cache remains unchanged
      logError('Background model check failed:', error);
    }
  }

  /**
   * Set up model cache update callback for download manager
   */
  private setupModelCacheUpdateCallback(configComponent: any): void {
    if (!this.monitoredFoldersOrchestrator) {
      return;
    }
    
    const modelDownloadManager = this.monitoredFoldersOrchestrator.getModelDownloadManager();
    
    // Create callback that updates the cache when a model is downloaded
    const cacheUpdateCallback = async (modelId: string): Promise<void> => {
      try {
        // Get current cache or create new one
        const currentCache = await configComponent.get('modelStatusCache') || {
          lastChecked: new Date().toISOString(),
          models: {},
          pythonAvailable: false,
          gpuModelsCheckable: false
        };
        
        // Update the specific model as installed
        currentCache.models[modelId] = {
          installed: true,
          checkedAt: new Date().toISOString()
        };
        
        // Save updated cache
        await configComponent.set('modelStatusCache', currentCache);
        
        // Also update in-memory FMDM
        const fmdm = this.fmdmService!.getFMDM();
        const model = fmdm.curatedModels.find(m => m.id === modelId);
        if (model) {
          model.installed = true;
        }
        
        debug(`[CACHE-UPDATE] Updated cache for downloaded model: ${modelId}`);
      } catch (error) {
        logError(`[CACHE-UPDATE] Failed to update cache for ${modelId}:`, error);
      }
    };
    
    // Set the callback
    modelDownloadManager.setCacheUpdateCallback(cacheUpdateCallback);
    debug('Model cache update callback configured');
  }

  // Setup graceful shutdown
  setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      info(`Received ${signal}, shutting down gracefully...`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logError('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
      logError('Uncaught exception:', err);
      this.stop().finally(() => process.exit(1));
    });
    process.on('unhandledRejection', (reason) => {
      logError('Unhandled rejection:', reason);
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
      warn(`Cannot start indexing: services not initialized`);
      return;
    }

    info(`[INDEXING] Started indexing: ${folderPath}`);
    
    try {
      // Get folder configuration
      const configComponent = this.diContainer.resolve(this.CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
      const folders = await configComponent.get('folders.list') || [];
      const folderConfig = folders.find((f: any) => f.path === folderPath);
      
      if (!folderConfig) {
        warn(`Folder not found in configuration: ${folderPath}`);
        return;
      }
      
      // Start lifecycle management for this folder
      await this.monitoredFoldersOrchestrator.addFolder(folderConfig.path, folderConfig.model);
      
      debug(`Lifecycle management started for: ${folderPath}`);
      
    } catch (error) {
      logError(`[INDEXING] Failed for ${folderPath}:`, error instanceof Error ? error.message : String(error));
      debug(`Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: error?.constructor?.name || typeof error
      });
      
      // Update status to error
      try {
        this.fmdmService.updateFolderStatus(folderPath, 'error');
      } catch (statusError) {
        warn(`Failed to update folder status after error:`, statusError);
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

async function stopExistingDaemon(daemonInfo: { pid: number }): Promise<void> {
  info(`Stopping existing daemon (PID: ${daemonInfo.pid})...`);
  
  try {
    // Try graceful shutdown first (SIGTERM)
    process.kill(daemonInfo.pid, 'SIGTERM');
    
    // Wait up to 5 seconds for graceful shutdown
    await waitForProcessExit(daemonInfo.pid, 5000);
    info('Existing daemon stopped gracefully');
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
      // Process already dead
      info('Existing daemon already stopped');
    } else {
      // Graceful shutdown failed, try force kill
      warn('Graceful shutdown failed, force killing...');
      try {
        process.kill(daemonInfo.pid, 'SIGKILL');
        await waitForProcessExit(daemonInfo.pid, 2000);
        info('Existing daemon force killed');
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
    info('Restart flag detected, checking for running daemon processes...');
    
    // Use comprehensive process scanning instead of registry file check
    const runningDaemonPids = await DaemonRegistry.findRunningDaemonProcesses();
    const otherDaemonPids = runningDaemonPids.filter(pid => pid !== process.pid);
    
    if (otherDaemonPids.length > 0) {
      for (const daemonPid of otherDaemonPids) {
        info(`Found running daemon process (PID: ${daemonPid}), stopping it...`);
        
        // Create minimal daemon info for stopping
        const daemonInfo = { pid: daemonPid };
        await stopExistingDaemon(daemonInfo);
        info(`Stopped daemon process PID: ${daemonPid}`);
      }
      
      info('All existing daemon processes stopped, waiting for cleanup...');
      
      // Wait to ensure processes are fully terminated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force cleanup the registry
      debug('Force cleaning registry after restart...');
      await DaemonRegistry.cleanup();
      
      // Wait a bit more to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      info('No existing daemon processes found to restart');
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
    logError(`Daemon already running with PID ${status.pid}`);
    process.exit(1);
  }
  
  // Start daemon
  const daemon = new FolderMCPDaemon(config);
  daemon.setupShutdownHandlers();
  
  try {
    await daemon.start();
    // Success message already logged by daemon.start()
  } catch (err) {
    logError('Failed to start daemon:', err);
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
  main().catch((err) => {
    logError('Fatal error:', err);
    process.exit(1);
  });
}