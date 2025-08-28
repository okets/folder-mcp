/**
 * Daemon Client for MCP Server
 * Phase 9 - Sprint 1 Task 1: Connect MCP server to daemon via WebSocket
 */

import WebSocket from 'ws';

export interface FolderConfig {
  name: string;
  path: string;
  model: string;
  status: string;
}

export interface DaemonClientOptions {
  url?: string;
  timeout?: number;
}

/**
 * WebSocket client for communicating with the daemon
 */
export class DaemonClient {
  private ws: WebSocket | null = null;
  private url: string;
  private timeout: number;
  private isConnected: boolean = false;
  private messageHandlers = new Map<string, (response: any) => void>();

  constructor(options: DaemonClientOptions = {}) {
    this.url = options.url || process.env.DAEMON_URL || 'ws://localhost:31850';  // WebSocket runs on daemon port + 1
    this.timeout = options.timeout || 5000;
  }

  /**
   * Connect to the daemon WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Connection to daemon timed out (${this.timeout}ms)`));
      }, this.timeout);

      try {
        console.error(`[DaemonClient] Connecting to daemon at ${this.url}`);
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          clearTimeout(timeoutId);
          this.isConnected = true;
          console.error('[DaemonClient] Connected to daemon');
          resolve();
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeoutId);
          console.error('[DaemonClient] WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          console.error('[DaemonClient] Disconnected from daemon');
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            // Handle responses with correlation IDs
            if (message.id && this.messageHandlers.has(message.id)) {
              const handler = this.messageHandlers.get(message.id);
              this.messageHandlers.delete(message.id);
              handler!(message);
            }
          } catch (error) {
            console.error('[DaemonClient] Error parsing message:', error);
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Get configured folders from the daemon
   */
  async getFoldersConfig(): Promise<FolderConfig[]> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to daemon');
    }

    return new Promise((resolve, reject) => {
      const id = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(id);
        reject(new Error(`getFoldersConfig request timed out (${this.timeout}ms)`));
      }, this.timeout);

      // Register response handler
      this.messageHandlers.set(id, (response) => {
        clearTimeout(timeoutId);
        if (response.type === 'getFoldersConfigResponse') {
          resolve(response.folders || []);
        } else if (response.type === 'error') {
          reject(new Error(response.message || 'Unknown error'));
        } else {
          reject(new Error(`Unexpected response type: ${response.type}`));
        }
      });

      // Send request
      const request = {
        type: 'getFoldersConfig',
        id
      };

      console.error('[DaemonClient] Sending getFoldersConfig request');
      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected to daemon
   */
  get connected(): boolean {
    return this.isConnected && this.ws !== null;
  }
}