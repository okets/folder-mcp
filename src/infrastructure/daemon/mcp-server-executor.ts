/**
 * MCP Server Executor - Infrastructure Layer
 * 
 * Handles starting, stopping, and managing MCP server processes.
 * Platform-specific implementation for Node.js child processes.
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { IMcpServerExecutor } from '../../domain/daemon/process-manager.js';

/**
 * Node.js MCP server executor implementation
 */
export class NodeMcpServerExecutor implements IMcpServerExecutor {
  private processes: Map<number, ChildProcess> = new Map();

  constructor(
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {}

  /**
   * Start MCP server process
   */
  async start(folderPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = join(process.cwd(), 'dist', 'mcp-server.js');
        
        this.logger.debug(`Starting MCP server: node ${mcpServerPath} ${folderPath}`);
        
        const childProcess = spawn('node', [mcpServerPath, folderPath], {
          stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
          env: {
            ...process.env,
            NODE_ENV: 'production',
            // Ensure child process gets clean environment
            FORCE_COLOR: '0', // Disable colors in child process
          },
          detached: false, // Keep process attached to parent
          windowsHide: true // Hide console window on Windows
        });

        // Handle process spawn
        childProcess.on('spawn', () => {
          const pid = childProcess.pid!;
          this.processes.set(pid, childProcess);
          this.logger.info(`MCP server process spawned with PID: ${pid}`);
          
          // Set up process event handlers
          this.setupProcessHandlers(childProcess, pid);
          
          resolve(pid);
        });

        // Handle spawn errors
        childProcess.on('error', (error) => {
          this.logger.error('Failed to spawn MCP server process:', error);
          reject(new Error(`Failed to start MCP server: ${error.message}`));
        });

        // Handle immediate exit (startup failure)
        childProcess.on('exit', (code, signal) => {
          if (code !== 0 && code !== null) {
            const error = new Error(`MCP server exited immediately with code ${code}, signal ${signal}`);
            this.logger.error('MCP server startup failed:', error);
            reject(error);
          }
        });

        // Timeout for startup
        const startupTimeout = setTimeout(() => {
          if (!childProcess.pid) {
            childProcess.kill('SIGKILL');
            reject(new Error('MCP server startup timed out'));
          }
        }, 10000); // 10 second timeout

        childProcess.on('spawn', () => {
          clearTimeout(startupTimeout);
        });

      } catch (error) {
        this.logger.error('Error starting MCP server:', error as Error);
        reject(error);
      }
    });
  }

  /**
   * Stop MCP server process gracefully
   */
  async stop(pid: number): Promise<void> {
    const childProcess = this.processes.get(pid);
    
    if (!childProcess) {
      // Process not tracked by us, try to kill by PID anyway
      this.logger.warn(`Process ${pid} not found in tracked processes, attempting direct kill`);
      try {
        process.kill(pid, 'SIGTERM');
        await this.waitForProcessExit(pid, 10000);
      } catch (error) {
        throw new Error(`Failed to stop process ${pid}: ${(error as Error).message}`);
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.logger.warn(`Process ${pid} did not exit gracefully, force killing...`);
        childProcess.kill('SIGKILL');
        setTimeout(() => {
          this.processes.delete(pid);
          reject(new Error(`Process ${pid} shutdown timed out`));
        }, 2000);
      }, 10000); // 10 second graceful shutdown timeout

      childProcess.on('exit', (code, signal) => {
        clearTimeout(timeout);
        this.processes.delete(pid);
        this.logger.info(`MCP server process ${pid} exited with code ${code}, signal ${signal}`);
        resolve();
      });

      // Send graceful shutdown signal
      this.logger.debug(`Sending SIGTERM to process ${pid}`);
      childProcess.kill('SIGTERM');
    });
  }

  /**
   * Kill MCP server process forcefully
   */
  async kill(pid: number): Promise<void> {
    const childProcess = this.processes.get(pid);
    
    if (!childProcess) {
      // Process not tracked by us, try to kill by PID anyway
      this.logger.warn(`Process ${pid} not found in tracked processes, attempting direct kill`);
      try {
        process.kill(pid, 'SIGKILL');
        await this.waitForProcessExit(pid, 5000);
      } catch (error) {
        throw new Error(`Failed to kill process ${pid}: ${(error as Error).message}`);
      }
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.processes.delete(pid);
        reject(new Error(`Process ${pid} could not be killed`));
      }, 5000); // 5 second timeout for force kill

      childProcess.on('exit', (code, signal) => {
        clearTimeout(timeout);
        this.processes.delete(pid);
        this.logger.info(`MCP server process ${pid} force killed`);
        resolve();
      });

      // Force kill
      this.logger.warn(`Force killing process ${pid}`);
      childProcess.kill('SIGKILL');
    });
  }

  /**
   * Check if process is running
   */
  isRunning(pid: number): boolean {
    const childProcess = this.processes.get(pid);
    
    if (childProcess) {
      return !childProcess.killed && childProcess.exitCode === null;
    }
    
    // If not tracked by us, check system-wide
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all tracked processes
   */
  getTrackedProcesses(): number[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Clean up finished processes
   */
  cleanup(): void {
    for (const [pid, childProcess] of this.processes.entries()) {
      if (childProcess.killed || childProcess.exitCode !== null) {
        this.processes.delete(pid);
        this.logger.debug(`Cleaned up finished process ${pid}`);
      }
    }
  }

  /**
   * Setup event handlers for child process
   */
  private setupProcessHandlers(childProcess: ChildProcess, pid: number): void {
    // Handle stdout (should be MCP JSON-RPC)
    childProcess.stdout?.on('data', (data) => {
      // In production, this would go to the MCP client
      // For now, we just log it at debug level
      this.logger.debug(`MCP[${pid}][stdout]: ${data.toString().trim()}`);
    });

    // Handle stderr (logging from MCP server)
    childProcess.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      // MCP server logs to stderr, so we relay these as info
      this.logger.info(`MCP[${pid}]: ${message}`);
    });

    // Handle process exit
    childProcess.on('exit', (code, signal) => {
      this.processes.delete(pid);
      
      if (code === 0) {
        this.logger.info(`MCP server process ${pid} exited cleanly`);
      } else {
        this.logger.error(`MCP server process ${pid} exited with code ${code}, signal ${signal}`);
      }
    });

    // Handle process errors
    childProcess.on('error', (error) => {
      this.logger.error(`MCP server process ${pid} error:`, error);
      this.processes.delete(pid);
    });
  }

  /**
   * Wait for process to exit
   */
  private async waitForProcessExit(pid: number, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (!this.isRunning(pid)) {
        return;
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Process ${pid} did not exit within ${timeout}ms`);
  }
}

/**
 * Windows-specific MCP server executor
 */
export class WindowsMcpServerExecutor extends NodeMcpServerExecutor {
  constructor(logger: any) {
    super(logger);
  }

  /**
   * Windows-specific process spawning
   */
  async start(folderPath: string): Promise<number> {
    // On Windows, we might need different handling for process creation
    // For now, use the base implementation
    return super.start(folderPath);
  }
}

/**
 * Unix-specific MCP server executor
 */
export class UnixMcpServerExecutor extends NodeMcpServerExecutor {
  constructor(logger: any) {
    super(logger);
  }

  /**
   * Unix-specific process spawning with better signal handling
   */
  async start(folderPath: string): Promise<number> {
    // Unix systems have better signal handling, could optimize here
    return super.start(folderPath);
  }
}

/**
 * Factory function to create platform-appropriate MCP server executor
 */
export function createMcpServerExecutor(logger: any): IMcpServerExecutor {
  if (process.platform === 'win32') {
    return new WindowsMcpServerExecutor(logger);
  } else {
    return new UnixMcpServerExecutor(logger);
  }
}