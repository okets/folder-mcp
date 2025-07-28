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
      await this.webSocketServer.start(31849);
      this.logger.info('FMDM WebSocket server started on ws://127.0.0.1:31849');

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