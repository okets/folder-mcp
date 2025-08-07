/**
 * Daemon Connector for TUI Auto-Discovery
 * 
 * Automatically discovers and connects to running daemon instances
 * without requiring manual port configuration.
 */

import WebSocket from 'ws';
import { DaemonRegistry } from '../../daemon/registry/daemon-registry.js';

export interface ConnectionOptions {
  /** Connection timeout in milliseconds */
  timeoutMs?: number;
  /** Number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Daemon connection information
 */
export interface ConnectionInfo {
  daemonUrl: string;
  httpPort: number;
  wsPort: number;
  pid: number;
  discoveryMethod: 'registry' | 'environment' | 'default' | 'scan';
}

/**
 * Auto-discovery connector for daemon WebSocket connections
 */
export class DaemonConnector {
  private options: Required<ConnectionOptions>;

  constructor(options: ConnectionOptions = {}) {
    this.options = {
      timeoutMs: options.timeoutMs ?? 5000,
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
      debug: options.debug ?? false
    };
  }

  /**
   * Connect to daemon using auto-discovery
   */
  async connect(): Promise<{ ws: WebSocket; connectionInfo: ConnectionInfo }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        this.log(`Connection attempt ${attempt}/${this.options.maxRetries}`);
        
        const connectionInfo = await this.discoverDaemon();
        this.log(`Discovered daemon via ${connectionInfo.discoveryMethod}: ${connectionInfo.daemonUrl}`);
        
        const ws = await this.testConnection(connectionInfo);
        this.log(`Successfully connected to daemon at ${connectionInfo.daemonUrl}`);
        
        return { ws, connectionInfo };
      } catch (error) {
        lastError = error as Error;
        this.log(`Connection attempt ${attempt} failed: ${lastError.message}`);
        
        if (attempt < this.options.maxRetries) {
          this.log(`Retrying in ${this.options.retryDelayMs}ms...`);
          await this.delay(this.options.retryDelayMs);
        }
      }
    }

    throw new Error(
      `Failed to connect to daemon after ${this.options.maxRetries} attempts. ` +
      `Last error: ${lastError?.message || 'Unknown error'}. ` +
      `Make sure the daemon is running: 'node dist/src/daemon/index.js'`
    );
  }

  /**
   * Discover daemon using multiple strategies
   */
  private async discoverDaemon(): Promise<ConnectionInfo> {
    // Strategy 1: Registry file discovery (primary method)
    try {
      const daemonInfo = await DaemonRegistry.discover();
      if (daemonInfo) {
        return {
          daemonUrl: `ws://127.0.0.1:${daemonInfo.wsPort}`,
          httpPort: daemonInfo.httpPort,
          wsPort: daemonInfo.wsPort,
          pid: daemonInfo.pid,
          discoveryMethod: 'registry'
        };
      }
    } catch (error) {
      this.log(`Registry discovery failed: ${(error as Error).message}`);
    }

    // Strategy 2: Environment variable (for testing)
    const envPort = process.env.FOLDER_MCP_DAEMON_PORT;
    if (envPort) {
      const httpPort = parseInt(envPort);
      const wsPort = httpPort + 1;
      
      try {
        await this.pingDaemon(wsPort);
        return {
          daemonUrl: `ws://127.0.0.1:${wsPort}`,
          httpPort,
          wsPort,
          pid: -1, // Unknown PID
          discoveryMethod: 'environment'
        };
      } catch (error) {
        this.log(`Environment port ${wsPort} not accessible: ${(error as Error).message}`);
      }
    }

    // Strategy 3: Default port
    const defaultHttpPort = 31849;
    const defaultWsPort = defaultHttpPort + 1;
    
    try {
      await this.pingDaemon(defaultWsPort);
      return {
        daemonUrl: `ws://127.0.0.1:${defaultWsPort}`,
        httpPort: defaultHttpPort,
        wsPort: defaultWsPort,
        pid: -1, // Unknown PID
        discoveryMethod: 'default'
      };
    } catch (error) {
      this.log(`Default port ${defaultWsPort} not accessible: ${(error as Error).message}`);
    }

    // Strategy 4: Port scanning (last resort)
    const commonPorts = [8765, 9001, 3000, 3001, 8080, 8081];
    
    for (const httpPort of commonPorts) {
      const wsPort = httpPort + 1;
      try {
        await this.pingDaemon(wsPort);
        return {
          daemonUrl: `ws://127.0.0.1:${wsPort}`,
          httpPort,
          wsPort,
          pid: -1, // Unknown PID
          discoveryMethod: 'scan'
        };
      } catch (error) {
        // Continue scanning
      }
    }

    throw new Error(
      'No daemon found. Tried: registry file, environment variable, default port (31850), and common ports. ' +
      'Please start the daemon: node dist/src/daemon/index.js'
    );
  }

  /**
   * Test daemon connectivity with ping
   */
  private async pingDaemon(wsPort: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);
      const timeoutId = setTimeout(() => {
        // Safely close the connection - handle different WebSocket implementations
        try {
          if (typeof ws.terminate === 'function') {
            ws.terminate();
          } else if (typeof ws.close === 'function') {
            ws.close();
          }
          // If neither method exists, the connection will be cleaned up when ws goes out of scope
        } catch (error) {
          // Ignore errors during cleanup
        }
        reject(new Error(`Connection timeout after ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);

      ws.on('open', () => {
        clearTimeout(timeoutId);
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Establish WebSocket connection and perform handshake
   */
  private async testConnection(connectionInfo: ConnectionInfo): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(connectionInfo.daemonUrl);
      let handshakeComplete = false;
      
      const timeoutId = setTimeout(() => {
        if (!handshakeComplete) {
          ws.terminate();
          reject(new Error(`Handshake timeout after ${this.options.timeoutMs}ms`));
        }
      }, this.options.timeoutMs);

      ws.on('open', () => {
        this.log('WebSocket connected, performing handshake...');
        
        // Send connection.init message to identify as TUI client
        const initMessage = {
          type: 'connection.init',
          clientType: 'tui'
        };
        
        ws.send(JSON.stringify(initMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.log(`Received handshake response: ${message.type}`);
          
          // Look for any response indicating daemon is alive
          if (message.type === 'connection.ack' || message.type === 'fmdm.update') {
            clearTimeout(timeoutId);
            handshakeComplete = true;
            resolve(ws);
          }
        } catch (error) {
          // Ignore parse errors during handshake
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });

      ws.on('close', () => {
        clearTimeout(timeoutId);
        if (!handshakeComplete) {
          reject(new Error('WebSocket closed before handshake completed'));
        }
      });
    });
  }

  /**
   * Get connection info for the last successful discovery (without connecting)
   */
  async getConnectionInfo(): Promise<ConnectionInfo | null> {
    try {
      return await this.discoverDaemon();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if daemon is available
   */
  async isDaemonAvailable(): Promise<boolean> {
    try {
      await this.discoverDaemon();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.error(`[DAEMON-CONNECTOR] ${message}`);
    }
  }
}