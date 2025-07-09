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

// Create a simple debug logger
const debug = (message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [DAEMON] ${message}`, ...args);
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

  constructor(config: DaemonConfig) {
    this.config = config;
    this.startTime = new Date();
  }

  async start(): Promise<void> {
    debug('Starting folder-mcp daemon...');
    
    // Write PID file
    this.writePidFile();
    
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