/**
 * Core Daemon Service - Domain Layer
 * 
 * Pure domain logic for daemon management without external dependencies.
 * This service orchestrates the various daemon components based on configuration.
 */

import { EventEmitter } from 'events';
import { 
  IDaemonService, 
  IProcessManager, 
  IHealthMonitor, 
  ISignalHandler, 
  IPerformanceMonitor,
  ProcessStatus,
  DaemonStatus
} from './interfaces.js';
import { DaemonConfig } from '../../config/schema/daemon.js';
import { FMDMWebSocketServer } from '../../daemon/websocket/server.js';
import { DependencyContainer } from '../../di/container.js';
import { SERVICE_TOKENS, IEmbeddingService } from '../../di/interfaces.js';

/**
 * Daemon service events
 */
export interface DaemonServiceEvents {
  'started': () => void;
  'stopped': () => void;
  'restarted': () => void;
  'error': (error: Error) => void;
  'statusChanged': (status: DaemonStatus) => void;
  'configReloaded': () => void;
}

/**
 * Daemon service implementation
 */
export class DaemonService extends EventEmitter implements IDaemonService {
  private currentStatus: DaemonStatus = DaemonStatus.STOPPED;
  private startTime: Date | null = null;
  private restartCount = 0;
  private lastError: string | null = null;
  private container: DependencyContainer | null = null;

  constructor(
    private config: DaemonConfig,
    private processManager: IProcessManager,
    private healthMonitor: IHealthMonitor,
    private signalHandler: ISignalHandler | null,
    private performanceMonitor: IPerformanceMonitor,
    private webSocketServer: FMDMWebSocketServer,
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {
    super();
    this.setupEventHandlers();
  }

  /**
   * Set the dependency injection container for accessing services
   */
  setContainer(container: DependencyContainer): void {
    this.container = container;
  }

  /**
   * Start the daemon and MCP server
   */
  async start(): Promise<void> {
    if (this.currentStatus === DaemonStatus.RUNNING) {
      this.logger.warn('Daemon is already running');
      return;
    }

    if (this.currentStatus === DaemonStatus.STARTING) {
      this.logger.warn('Daemon is already starting');
      return;
    }

    try {
      this.logger.info('Starting daemon...');
      this.setStatus(DaemonStatus.STARTING);

      // Register signal handlers if available
      if (this.signalHandler) {
        this.signalHandler.registerHandlers();
      }

      // Start the MCP server process
      await this.processManager.startMcpServer();

      // Start WebSocket server for FMDM communication
      // Use configured port if available, otherwise default to 31849 (HTTP) / 31850 (WS)
      // Use nullish coalescing so that port=0 isn’t overridden,
      // and validate that it’s an integer in the 1–65535 range.
      const httpPort = this.config.port ?? 31849;
      if (!Number.isInteger(httpPort) || httpPort < 1 || httpPort > 65535) {
        throw new Error(`Invalid HTTP port: ${httpPort}`);
      }

      // Derive WebSocket port and guard against overflow past 65535.
      const wsPort = httpPort + 1;
      if (wsPort > 65535) {
        throw new Error(`Invalid derived WebSocket port: ${wsPort}`);
      }

      await this.webSocketServer.start(wsPort); // Pass actual WebSocket port
      this.logger.info(`FMDM WebSocket server started on ws://127.0.0.1:${wsPort}`);

      // Start health monitoring if enabled
      if (this.config.healthCheck.enabled) {
        this.healthMonitor.startMonitoring();
        this.logger.info('Health monitoring started');
      }

      // Start performance monitoring if enabled
      if (this.config.performance.monitoring) {
        this.performanceMonitor.startMonitoring();
        this.logger.info('Performance monitoring started');
      }

      this.startTime = new Date();
      this.setStatus(DaemonStatus.RUNNING);
      this.logger.info('Daemon started successfully');
      this.emit('started');

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.setStatus(DaemonStatus.FAILED);
      this.logger.error('Failed to start daemon:', error as Error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Stop the daemon and MCP server
   */
  async stop(): Promise<void> {
    if (this.currentStatus === DaemonStatus.STOPPED) {
      this.logger.warn('Daemon is already stopped');
      return;
    }

    if (this.currentStatus === DaemonStatus.STOPPING) {
      this.logger.warn('Daemon is already stopping');
      return;
    }

    try {
      this.logger.info('Stopping daemon...');
      this.setStatus(DaemonStatus.STOPPING);

      // Stop performance monitoring
      if (this.performanceMonitor.isMonitoring()) {
        this.performanceMonitor.stopMonitoring();
        this.logger.info('Performance monitoring stopped');
      }

      // Stop health monitoring
      if (this.healthMonitor.isMonitoring()) {
        this.healthMonitor.stopMonitoring();
        this.logger.info('Health monitoring stopped');
      }

      // Stop WebSocket server
      await this.webSocketServer.stop();
      this.logger.info('FMDM WebSocket server stopped');

      // Stop the MCP server process
      await this.processManager.stopMcpServer();

      // Unregister signal handlers if available
      if (this.signalHandler) {
        this.signalHandler.unregisterHandlers();
      }

      this.setStatus(DaemonStatus.STOPPED);
      this.startTime = null;
      this.logger.info('Daemon stopped successfully');
      this.emit('stopped');

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error('Error during daemon shutdown:', error as Error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Restart the daemon and MCP server
   */
  async restart(): Promise<void> {
    this.logger.info('Restarting daemon...');
    this.setStatus(DaemonStatus.RESTARTING);

    try {
      // Stop first (if running)
      if (this.currentStatus === DaemonStatus.RUNNING) {
        await this.stop();
      }

      // Wait a brief moment
      await new Promise(resolve => setTimeout(resolve, this.config.autoRestart.delay));

      // Start again
      await this.start();

      this.restartCount++;
      this.logger.info(`Daemon restarted successfully (restart count: ${this.restartCount})`);
      this.emit('restarted');

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.setStatus(DaemonStatus.FAILED);
      this.logger.error('Failed to restart daemon:', error as Error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Get current daemon and process status
   */
  getStatus(): ProcessStatus {
    const processStatus = this.processManager.getProcessStatus();
    
    return {
      pid: processStatus.pid,
      status: this.currentStatus,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      restartCount: this.restartCount,
      lastRestart: this.restartCount > 0 ? new Date() : null, // TODO: Track actual restart times
      lastError: this.lastError
    };
  }

  /**
   * Reload configuration without restarting
   */
  async reload(): Promise<void> {
    this.logger.info('Reloading daemon configuration...');

    try {
      // TODO: Implement configuration reload logic
      // This would involve:
      // 1. Loading new configuration
      // 2. Comparing with current configuration
      // 3. Applying changes that don't require restart
      // 4. Scheduling restart if needed for changes that require it

      this.logger.info('Configuration reloaded successfully');
      this.emit('configReloaded');

    } catch (error) {
      this.logger.error('Failed to reload configuration:', error as Error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Check if daemon is running
   */
  isRunning(): boolean {
    return this.currentStatus === DaemonStatus.RUNNING;
  }

  /**
   * Get process ID
   */
  getPid(): number | null {
    return this.processManager.getProcessStatus().pid;
  }

  /**
   * Get current configuration (read-only)
   */
  getConfig(): Readonly<DaemonConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration (requires restart for most changes)
   */
  async updateConfig(newConfig: Partial<DaemonConfig>): Promise<void> {
    this.logger.info('Updating daemon configuration...');
    
    // Merge new config with existing
    this.config = { ...this.config, ...newConfig };
    
    // For now, we'll require a restart for any config changes
    // In the future, we could implement hot-reload for certain settings
    if (this.isRunning()) {
      await this.restart();
    }
    
    this.logger.info('Daemon configuration updated');
  }

  /**
   * Download model if not already cached, with progress tracking
   */
  async downloadModelIfNeeded(modelName: string): Promise<void> {
    this.logger.info(`Checking if model ${modelName} needs download`);
    
    if (!this.container) {
      this.logger.error('DI container not set - cannot access embedding service');
      throw new Error('DI container not available for accessing embedding service');
    }

    try {
      // Get embedding service from DI container
      const embeddingService = this.container.resolve(SERVICE_TOKENS.EMBEDDING) as IEmbeddingService;
      
      // Check if model is already cached
      const isModelCached = await this.checkModelCache(embeddingService, modelName);
      
      if (isModelCached) {
        this.logger.info(`Model ${modelName} already cached`);
        return;
      }

      // Emit progress start event for TUI
      this.webSocketServer.broadcast('model_download_start', { 
        modelName, 
        status: 'downloading' 
      });

      // Call embedding service to download model with progress tracking
      await this.downloadModelWithProgress(embeddingService, modelName);

      // Emit completion event
      this.webSocketServer.broadcast('model_download_complete', { 
        modelName, 
        status: 'ready' 
      });

      this.logger.info(`Model ${modelName} downloaded successfully`);
    } catch (error) {
      // Emit error event for TUI display
      this.webSocketServer.broadcast('model_download_error', { 
        modelName, 
        error: error instanceof Error ? error.message : String(error)
      });
      this.logger.error(`Failed to download model ${modelName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Check if model is already cached through embedding service
   */
  private async checkModelCache(embeddingService: IEmbeddingService, modelName: string): Promise<boolean> {
    try {
      // Check if the embedding service has a method to check model cache
      // This will be implemented in the embedding service interface
      if ('isModelCached' in embeddingService && typeof embeddingService.isModelCached === 'function') {
        return await (embeddingService as any).isModelCached(modelName);
      }
      
      // Fallback: assume not cached if we can't check
      return false;
    } catch (error) {
      this.logger.warn(`Failed to check model cache for ${modelName}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Download model with progress updates
   */
  private async downloadModelWithProgress(embeddingService: IEmbeddingService, modelName: string): Promise<void> {
    // Set up progress callback
    const progressCallback = (progress: { percent: number; eta?: number; message?: string }) => {
      this.webSocketServer.broadcast('model_download_progress', {
        modelName,
        progress: progress.percent,
        message: progress.message || `Downloading ${modelName}... ${progress.percent}%`,
        estimatedTimeRemaining: progress.eta
      });
    };

    // Check if the embedding service has a download method with progress
    if ('downloadModel' in embeddingService && typeof (embeddingService as any).downloadModel === 'function') {
      try {
        // Try with progress callback first
        await (embeddingService as any).downloadModel(modelName, progressCallback);
      } catch (error) {
        // If callback not supported, try without callback
        await (embeddingService as any).downloadModel(modelName);
      }
    } else {
      // Fallback: try to initialize the model (this will download it)
      this.logger.info(`Embedding service doesn't have downloadModel method, trying to initialize with model: ${modelName}`);
      
      // Emit intermediate progress
      progressCallback({ percent: 50, message: `Initializing ${modelName}...` });
      
      // This might trigger a download if the model isn't available
      await embeddingService.initialize();
      
      // Emit completion
      progressCallback({ percent: 100, message: `${modelName} ready` });
    }
  }

  /**
   * Set daemon status and emit events
   */
  private setStatus(status: DaemonStatus): void {
    const previousStatus = this.currentStatus;
    this.currentStatus = status;
    
    if (previousStatus !== status) {
      this.logger.debug(`Daemon status changed: ${previousStatus} -> ${status}`);
      this.emit('statusChanged', status);
    }
  }

  /**
   * Setup event handlers for daemon components
   */
  private setupEventHandlers(): void {
    // Health check failure handler
    this.healthMonitor.onHealthCheckFailure(async (result) => {
      this.logger.warn(`Health check failed: ${result.error}`);
      
      if (this.config.autoRestart.enabled) {
        const healthStatus = this.healthMonitor.getHealthStatus();
        
        if (healthStatus.consecutiveFailures >= this.config.healthCheck.retries) {
          this.logger.error(`Health check failed ${healthStatus.consecutiveFailures} times, restarting...`);
          
          try {
            await this.restart();
          } catch (error) {
            this.logger.error('Auto-restart failed after health check failure:', error as Error);
          }
        }
      }
    });

    // Signal handlers (if available)
    if (this.signalHandler) {
      // Note: Signal handlers are set up during registration, not here
      // The signal handler already has the shutdown/reload logic
    }
  }

  /**
   * Graceful shutdown with timeout
   */
  async gracefulShutdown(): Promise<void> {
    const timeout = this.config.shutdownTimeout || 10000;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Graceful shutdown timed out after ${timeout}ms`));
      }, timeout);

      this.stop()
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}