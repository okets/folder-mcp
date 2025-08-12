/**
 * Node.js Daemon Provider - Infrastructure Layer
 * 
 * Platform-specific implementation of daemon functionality for Node.js.
 * Provides concrete implementations with proper error handling and
 * platform-specific optimizations.
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { 
  IDaemonService, 
  ProcessStatus, 
  DaemonStatus 
} from '../../domain/daemon/interfaces.js';
import { DaemonService } from '../../domain/daemon/daemon-service.js';
import { DaemonConfig } from '../../config/schema/daemon.js';

/**
 * Node.js specific daemon provider
 */
export class NodeDaemonProvider implements IDaemonService {
  private daemonService: DaemonService;
  private mcpProcess: ChildProcess | null = null;

  constructor(
    config: DaemonConfig,
    processManager: any,
    healthMonitor: any,
    signalHandler: any,
    performanceMonitor: any,
    logger: any
  ) {
    this.daemonService = new DaemonService(
      config,
      processManager,
      healthMonitor,
      signalHandler,
      performanceMonitor,
      null as any, // WebSocket server - not used in this provider
      logger
    );
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    return this.daemonService.start();
  }

  /**
   * Stop the daemon
   */
  async stop(): Promise<void> {
    return this.daemonService.stop();
  }

  /**
   * Restart the daemon
   */
  async restart(): Promise<void> {
    return this.daemonService.restart();
  }

  /**
   * Get daemon status
   */
  getStatus(): ProcessStatus {
    return this.daemonService.getStatus();
  }

  /**
   * Reload configuration
   */
  async reload(): Promise<void> {
    return this.daemonService.reload();
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.daemonService.isRunning();
  }

  /**
   * Get process ID
   */
  getPid(): number | null {
    return this.daemonService.getPid();
  }

  /**
   * Platform-specific signal handling for graceful shutdown
   */
  setupSignalHandlers(): void {
    // Handle various shutdown signals (Windows only supports SIGTERM and SIGINT)
    const shutdownSignals: NodeJS.Signals[] = process.platform === 'win32' 
      ? ['SIGTERM', 'SIGINT']  // Windows-supported signals only
      : ['SIGTERM', 'SIGINT', 'SIGQUIT'];  // Unix includes SIGQUIT
    
    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        try {
          await this.stop();
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

    // Handle configuration reload signal (Unix only - SIGHUP doesn't exist on Windows)
    if (process.platform !== 'win32') {
      process.on('SIGHUP', async () => {
        console.log('Received SIGHUP, reloading configuration...');
        try {
          await this.reload();
        } catch (error) {
          console.error('Error during configuration reload:', error);
        }
      });
    }

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      try {
        await this.stop();
      } catch (shutdownError) {
        console.error('Error during emergency shutdown:', shutdownError);
      }
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      try {
        await this.stop();
      } catch (shutdownError) {
        console.error('Error during emergency shutdown:', shutdownError);
      }
      process.exit(1);
    });
  }

  /**
   * Start MCP server as child process
   */
  private async startMcpServerProcess(folderPath: string): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const mcpServerPath = join(process.cwd(), 'dist', 'mcp-server.js');
      
      const mcpProcess = spawn('node', [mcpServerPath, folderPath], {
        stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });

      mcpProcess.on('spawn', () => {
        resolve(mcpProcess);
      });

      mcpProcess.on('error', (error) => {
        reject(new Error(`Failed to start MCP server: ${error.message}`));
      });

      mcpProcess.on('exit', (code, signal) => {
        if (code !== 0) {
          reject(new Error(`MCP server exited with code ${code}, signal ${signal}`));
        }
      });

      // Set up logging for child process
      mcpProcess.stdout?.on('data', (data) => {
        console.log(`MCP[stdout]: ${data.toString().trim()}`);
      });

      mcpProcess.stderr?.on('data', (data) => {
        console.error(`MCP[stderr]: ${data.toString().trim()}`);
      });
    });
  }

  /**
   * Stop MCP server process
   */
  private async stopMcpServerProcess(): Promise<void> {
    if (!this.mcpProcess) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown fails
        this.mcpProcess?.kill('SIGKILL');
        reject(new Error('MCP server shutdown timed out'));
      }, 10000); // 10 second timeout

      this.mcpProcess!.on('exit', () => {
        clearTimeout(timeout);
        this.mcpProcess = null;
        resolve();
      });

      // Send graceful shutdown signal
      this.mcpProcess!.kill('SIGTERM');
    });
  }

  /**
   * Check if MCP server process is responsive
   */
  private async checkMcpServerHealth(): Promise<boolean> {
    if (!this.mcpProcess) {
      return false;
    }

    // Simple check - if process exists and hasn't exited
    return !this.mcpProcess.killed && this.mcpProcess.exitCode === null;
  }
}

/**
 * Windows-specific daemon provider
 */
export class WindowsDaemonProvider extends NodeDaemonProvider {
  constructor(
    config: DaemonConfig,
    processManager: any,
    healthMonitor: any,
    signalHandler: any,
    performanceMonitor: any,
    logger: any
  ) {
    super(config, processManager, healthMonitor, signalHandler, performanceMonitor, logger);
  }

  /**
   * Windows-specific signal handling
   */
  setupSignalHandlers(): void {
    // Windows doesn't support POSIX signals in the same way
    // Use process events instead
    process.on('SIGINT', async () => {
      console.log('Received SIGINT (Ctrl+C), shutting down...');
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down...');
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Windows-specific cleanup
    process.on('beforeExit', async () => {
      console.log('Process is about to exit, cleaning up...');
      try {
        await this.stop();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
  }
}

/**
 * Unix-specific daemon provider
 */
export class UnixDaemonProvider extends NodeDaemonProvider {
  constructor(
    config: DaemonConfig,
    processManager: any,
    healthMonitor: any,
    signalHandler: any,
    performanceMonitor: any,
    logger: any
  ) {
    super(config, processManager, healthMonitor, signalHandler, performanceMonitor, logger);
  }

  /**
   * Unix-specific signal handling with full POSIX signal support
   */
  setupSignalHandlers(): void {
    // Standard Unix signals
    const signals: { [key: string]: string } = {
      'SIGTERM': 'Graceful shutdown',
      'SIGINT': 'Interrupt (Ctrl+C)',
      'SIGQUIT': 'Quit with core dump',
      'SIGHUP': 'Configuration reload',
      'SIGUSR1': 'User-defined signal 1',
      'SIGUSR2': 'User-defined signal 2'
    };

    Object.entries(signals).forEach(([signal, description]) => {
      process.on(signal as NodeJS.Signals, async () => {
        console.log(`Received ${signal} (${description})`);
        
        if (signal === 'SIGHUP' || signal === 'SIGUSR1') {
          // Configuration reload
          try {
            await this.reload();
          } catch (error) {
            console.error('Error during configuration reload:', error);
          }
        } else {
          // Shutdown signals
          try {
            await this.stop();
            process.exit(0);
          } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
          }
        }
      });
    });

    // Unix-specific error handling
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      try {
        await this.stop();
      } catch (shutdownError) {
        console.error('Error during emergency shutdown:', shutdownError);
      }
      process.exit(1);
    });
  }
}

/**
 * Factory function to create platform-appropriate daemon provider
 */
export function createDaemonProvider(
  config: DaemonConfig,
  processManager: any,
  healthMonitor: any,
  signalHandler: any,
  performanceMonitor: any,
  logger: any
): IDaemonService {
  if (process.platform === 'win32') {
    return new WindowsDaemonProvider(
      config, 
      processManager, 
      healthMonitor, 
      signalHandler, 
      performanceMonitor, 
      logger
    );
  } else {
    return new UnixDaemonProvider(
      config, 
      processManager, 
      healthMonitor, 
      signalHandler, 
      performanceMonitor, 
      logger
    );
  }
}