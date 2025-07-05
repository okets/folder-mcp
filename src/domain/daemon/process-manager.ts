/**
 * Process Manager - Domain Layer
 * 
 * Manages MCP server process lifecycle with configuration-driven behavior.
 * Handles starting, stopping, restarting, and monitoring the MCP server process.
 */

import { EventEmitter } from 'events';
import { 
  IProcessManager, 
  ProcessStatus, 
  DaemonStatus 
} from './interfaces.js';
import { AutoRestartConfig } from '../../config/schema/daemon.js';

/**
 * Process manager events
 */
export interface ProcessManagerEvents {
  'processStarted': (pid: number) => void;
  'processStopped': (pid: number | null) => void;
  'processRestarted': (pid: number) => void;
  'processError': (error: Error) => void;
  'processUnresponsive': (pid: number) => void;
}

/**
 * Process manager implementation
 */
export class ProcessManager extends EventEmitter implements IProcessManager {
  private currentPid: number | null = null;
  private currentStatus: DaemonStatus = DaemonStatus.STOPPED;
  private startTime: Date | null = null;
  private restartCount = 0;
  private lastError: string | null = null;
  private restartAttempts = 0;
  private lastRestart: Date | null = null;

  constructor(
    private autoRestartConfig: AutoRestartConfig,
    private folderPath: string,
    private mcpServerExecutor: IMcpServerExecutor,
    private pidManager: IPidManager,
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {
    super();
  }

  /**
   * Start the MCP server process
   */
  async startMcpServer(): Promise<void> {
    if (this.currentStatus === DaemonStatus.RUNNING) {
      this.logger.warn('MCP server process is already running');
      return;
    }

    if (this.currentStatus === DaemonStatus.STARTING) {
      this.logger.warn('MCP server process is already starting');
      return;
    }

    try {
      this.logger.info('Starting MCP server process...');
      this.setStatus(DaemonStatus.STARTING);

      // Start the MCP server process
      const pid = await this.mcpServerExecutor.start(this.folderPath);
      
      this.currentPid = pid;
      this.startTime = new Date();
      this.setStatus(DaemonStatus.RUNNING);
      this.restartAttempts = 0; // Reset restart attempts on successful start
      
      this.logger.info(`MCP server process started with PID: ${pid}`);
      this.emit('processStarted', pid);

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.setStatus(DaemonStatus.FAILED);
      this.logger.error('Failed to start MCP server process:', error as Error);
      this.emit('processError', error as Error);
      throw error;
    }
  }

  /**
   * Stop the MCP server process
   */
  async stopMcpServer(): Promise<void> {
    if (this.currentStatus === DaemonStatus.STOPPED) {
      this.logger.warn('MCP server process is already stopped');
      return;
    }

    if (this.currentStatus === DaemonStatus.STOPPING) {
      this.logger.warn('MCP server process is already stopping');
      return;
    }

    try {
      this.logger.info('Stopping MCP server process...');
      this.setStatus(DaemonStatus.STOPPING);

      if (this.currentPid) {
        await this.mcpServerExecutor.stop(this.currentPid);
        this.logger.info(`MCP server process ${this.currentPid} stopped`);
        this.emit('processStopped', this.currentPid);
      }

      this.currentPid = null;
      this.startTime = null;
      this.setStatus(DaemonStatus.STOPPED);

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error('Error stopping MCP server process:', error as Error);
      this.emit('processError', error as Error);
      throw error;
    }
  }

  /**
   * Restart the MCP server process
   */
  async restartMcpServer(): Promise<void> {
    this.logger.info('Restarting MCP server process...');
    this.setStatus(DaemonStatus.RESTARTING);

    try {
      // Stop first (if running)
      if (this.currentPid) {
        await this.stopMcpServer();
      }

      // Apply restart delay
      if (this.autoRestartConfig.delay > 0) {
        let delay = this.autoRestartConfig.delay;
        
        // Apply exponential backoff if enabled
        if (this.autoRestartConfig.exponentialBackoff) {
          delay = Math.min(
            this.autoRestartConfig.delay * Math.pow(2, this.restartAttempts),
            this.autoRestartConfig.maxDelay || 30000
          );
        }
        
        this.logger.debug(`Waiting ${delay}ms before restart...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Start again
      await this.startMcpServer();

      this.restartCount++;
      this.lastRestart = new Date();
      this.logger.info(`MCP server process restarted successfully (restart count: ${this.restartCount})`);
      this.emit('processRestarted', this.currentPid!);

    } catch (error) {
      this.restartAttempts++;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.setStatus(DaemonStatus.FAILED);
      this.logger.error('Failed to restart MCP server process:', error as Error);
      this.emit('processError', error as Error);
      
      // Check if we should attempt auto-restart
      if (this.autoRestartConfig.enabled && this.restartAttempts < this.autoRestartConfig.maxRetries) {
        this.logger.info(`Auto-restart attempt ${this.restartAttempts}/${this.autoRestartConfig.maxRetries}...`);
        // Schedule another restart attempt
        setTimeout(() => {
          this.restartMcpServer().catch(err => {
            this.logger.error('Auto-restart failed:', err);
          });
        }, this.autoRestartConfig.delay);
      } else {
        this.logger.error(`Max restart attempts (${this.autoRestartConfig.maxRetries}) reached, giving up`);
      }
      
      throw error;
    }
  }

  /**
   * Get process status
   */
  getProcessStatus(): ProcessStatus {
    return {
      pid: this.currentPid,
      status: this.currentStatus,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      restartCount: this.restartCount,
      lastRestart: this.lastRestart,
      lastError: this.lastError
    };
  }

  /**
   * Kill process forcefully
   */
  async killProcess(): Promise<void> {
    if (!this.currentPid) {
      this.logger.warn('No process to kill');
      return;
    }

    try {
      this.logger.warn(`Force killing MCP server process ${this.currentPid}...`);
      await this.mcpServerExecutor.kill(this.currentPid);
      
      this.emit('processStopped', this.currentPid);
      this.currentPid = null;
      this.startTime = null;
      this.setStatus(DaemonStatus.STOPPED);
      
      this.logger.info('MCP server process force killed');

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to kill MCP server process:', error as Error);
      this.emit('processError', error as Error);
      throw error;
    }
  }

  /**
   * Check if process is responsive
   */
  async isProcessResponsive(): Promise<boolean> {
    if (!this.currentPid) {
      return false;
    }

    try {
      // Check if process is still alive
      const isAlive = this.pidManager.isProcessRunning(this.currentPid);
      if (!isAlive) {
        this.logger.warn(`Process ${this.currentPid} is no longer running`);
        this.emit('processUnresponsive', this.currentPid);
        return false;
      }

      // Additional responsiveness check could be added here
      // (e.g., health check ping to MCP server)
      return true;

    } catch (error) {
      this.logger.error('Error checking process responsiveness:', error as Error);
      return false;
    }
  }

  /**
   * Get current process ID
   */
  getCurrentPid(): number | null {
    return this.currentPid;
  }

  /**
   * Get restart statistics
   */
  getRestartStats(): {
    totalRestarts: number;
    currentAttempts: number;
    maxRetries: number;
    lastRestart: Date | null;
    autoRestartEnabled: boolean;
  } {
    return {
      totalRestarts: this.restartCount,
      currentAttempts: this.restartAttempts,
      maxRetries: this.autoRestartConfig.maxRetries,
      lastRestart: this.lastRestart,
      autoRestartEnabled: this.autoRestartConfig.enabled
    };
  }

  /**
   * Reset restart attempts counter
   */
  resetRestartAttempts(): void {
    this.restartAttempts = 0;
    this.logger.debug('Restart attempts counter reset');
  }

  /**
   * Set process status and emit events
   */
  private setStatus(status: DaemonStatus): void {
    const previousStatus = this.currentStatus;
    this.currentStatus = status;
    
    if (previousStatus !== status) {
      this.logger.debug(`Process status changed: ${previousStatus} -> ${status}`);
    }
  }

  /**
   * Update auto-restart configuration
   */
  updateAutoRestartConfig(config: Partial<AutoRestartConfig>): void {
    this.autoRestartConfig = { ...this.autoRestartConfig, ...config };
    this.logger.info('Auto-restart configuration updated');
  }
}

/**
 * MCP Server Executor interface
 * Abstracts the actual process execution for testing
 */
export interface IMcpServerExecutor {
  /**
   * Start MCP server process
   */
  start(folderPath: string): Promise<number>;

  /**
   * Stop MCP server process gracefully
   */
  stop(pid: number): Promise<void>;

  /**
   * Kill MCP server process forcefully
   */
  kill(pid: number): Promise<void>;

  /**
   * Check if process is running
   */
  isRunning(pid: number): boolean;
}

/**
 * PID Manager interface
 * Abstracts PID file management for testing
 */
export interface IPidManager {
  /**
   * Write PID to file
   */
  writePidFile(path: string, pid: number): Promise<void>;

  /**
   * Read PID from file
   */
  readPidFile(path: string): Promise<number>;

  /**
   * Remove PID file
   */
  removePidFile(path: string): Promise<void>;

  /**
   * Check if process with PID is running
   */
  isProcessRunning(pid: number): boolean;

  /**
   * Check if PID file exists and process is running
   */
  isValidPidFile(path: string): Promise<boolean>;
}