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
 * Response types for daemon messages
 */
export interface DaemonSuccessResponse {
  type: 'success';
  id: string;
  folders?: FolderConfig[];
  [key: string]: any;
}

export interface DaemonErrorResponse {
  type: 'error';
  id: string;
  message: string;
  code?: string;
}

export type DaemonResponse = DaemonSuccessResponse | DaemonErrorResponse;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeoutId?: NodeJS.Timeout;
}

/**
 * WebSocket client for communicating with the daemon
 */
export class DaemonClient {
  private ws: WebSocket | null = null;
  private url: string;
  private timeout: number;
  private messageHandlers = new Map<string, PendingRequest>();
  private isConnecting = false;
  private connectPromise: Promise<void> | null = null;

  constructor(options: DaemonClientOptions = {}) {
    this.url = options.url || process.env.DAEMON_URL || 'ws://localhost:31850';  // WebSocket runs on daemon port + 1
    this.timeout = options.timeout || 5000;
  }

  /**
   * Connect to the daemon WebSocket server
   * Idempotent - can be called multiple times safely
   */
  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.connected) {
      return;
    }

    // If currently connecting, wait for that connection
    if (this.isConnecting && this.connectPromise) {
      return this.connectPromise;
    }

    this.isConnecting = true;
    this.connectPromise = new Promise<void>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        this.isConnecting = false;
        this.connectPromise = null;
      };

      const handleResolve = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve();
        }
      };

      const handleReject = (error: Error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(error);
        }
      };

      timeoutId = setTimeout(() => {
        handleReject(new Error(`Connection to daemon timed out (${this.timeout}ms)`));
      }, this.timeout);

      try {
        console.log(`[DaemonClient] Connecting to daemon at ${this.url}`);
        this.ws = new WebSocket(this.url);

        this.ws.once('open', () => {
          console.log('[DaemonClient] Connected to daemon');
          handleResolve();
        });

        this.ws.once('error', (error) => {
          console.error('[DaemonClient] WebSocket error:', error);
          handleReject(error);
        });

        // Set up persistent event handlers after connection
        this.ws.on('close', () => {
          console.log('[DaemonClient] Disconnected from daemon');
          // Clean up any pending requests on close
          this.rejectAllPendingRequests(new Error('WebSocket connection closed'));
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Validate message structure
            if (!message || typeof message !== 'object') {
              console.error('[DaemonClient] Invalid message format: not an object');
              return;
            }
            
            // Handle responses with correlation IDs
            if (message.id) {
              const handler = this.messageHandlers.get(message.id);
              if (handler) {
                this.messageHandlers.delete(message.id);
                if (handler.timeoutId) {
                  clearTimeout(handler.timeoutId);
                }
                
                // Determine response type and handle accordingly
                if (message.type === 'getFoldersConfigResponse') {
                  handler.resolve(message);
                } else if (message.type === 'error') {
                  handler.reject(new Error(message.message || 'Unknown error'));
                } else {
                  // Generic success response
                  handler.resolve(message);
                }
              } else {
                console.log(`[DaemonClient] No handler found for message ID: ${message.id}`);
              }
            } else {
              console.log('[DaemonClient] Message without ID received:', message.type);
            }
          } catch (error) {
            console.error('[DaemonClient] Error parsing message:', error);
          }
        });
      } catch (error) {
        cleanup();
        reject(error);
      }
    });

    return this.connectPromise;
  }

  /**
   * Get configured folders from the daemon
   */
  async getFoldersConfig(): Promise<FolderConfig[]> {
    // Check connection state first
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to daemon');
    }

    return new Promise((resolve, reject) => {
      const id = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      
      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(id);
        reject(new Error(`getFoldersConfig request timed out (${this.timeout}ms)`));
      }, this.timeout);

      // Register response handler with timeout cleanup
      const request: PendingRequest = {
        resolve: (response) => {
          // Validate response structure
          if (response && response.folders && Array.isArray(response.folders)) {
            resolve(response.folders);
          } else {
            reject(new Error('Invalid response: folders array missing or not an array'));
          }
        },
        reject,
        timeoutId
      };
      
      this.messageHandlers.set(id, request);

      // Send request
      const requestMessage = {
        type: 'getFoldersConfig',
        id
      };

      try {
        console.log('[DaemonClient] Sending getFoldersConfig request');
        this.ws!.send(JSON.stringify(requestMessage));
      } catch (error) {
        // Clean up on send failure
        this.messageHandlers.delete(id);
        clearTimeout(timeoutId);
        reject(new Error(`Failed to send request: ${error}`));
      }
    });
  }

  /**
   * Reject all pending requests - used during cleanup
   */
  private rejectAllPendingRequests(error: Error): void {
    for (const [id, handler] of this.messageHandlers) {
      if (handler.timeoutId) {
        clearTimeout(handler.timeoutId);
      }
      handler.reject(error);
    }
    this.messageHandlers.clear();
  }

  /**
   * Close the WebSocket connection and clean up resources
   */
  close(): void {
    // Reject all pending requests
    this.rejectAllPendingRequests(new Error('Client closing connection'));
    
    // Remove event listeners and close WebSocket
    if (this.ws) {
      // Remove all listeners to prevent memory leaks
      this.ws.removeAllListeners();
      
      // Close the WebSocket connection
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
      this.ws = null;
    }
    
    // Reset connection state
    this.isConnecting = false;
    this.connectPromise = null;
  }

  /**
   * Check if connected to daemon
   * Derives state from WebSocket readyState instead of internal flag
   */
  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}