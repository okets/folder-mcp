/**
 * Daemon REST Client for MCP Server
 * Phase 9 - Sprint 2: Connect MCP server to daemon via REST API
 * 
 * This client communicates with the daemon's REST API on port 3002
 * instead of using WebSocket, providing stateless operations for MCP endpoints.
 */

import fetch, { RequestInit, Response } from 'node-fetch';

export interface FolderConfig {
  id: string;
  name: string;
  path: string;
  model: string;
  status: 'active' | 'indexing' | 'pending' | 'error';
  documentCount?: number;
  lastIndexed?: string;
  topics?: string[];
}

export interface DaemonRESTClientOptions {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface HealthResponse {
  status: 'healthy' | 'starting' | 'error';
  uptime: number;
  version: string;
  timestamp: string;
}

export interface ServerInfoResponse {
  version: string;
  capabilities: {
    cpuCount: number;
    totalMemory: number;
    supportedModels: string[];
  };
  daemon: {
    uptime: number;
    folderCount: number;
    activeFolders: number;
    indexingFolders: number;
    totalDocuments: number;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  path?: string;
}

/**
 * REST client for communicating with the daemon's REST API
 */
export class DaemonRESTClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private isConnected: boolean = false;

  constructor(options: DaemonRESTClientOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.DAEMON_URL || 'http://localhost:3002';
    this.timeout = options.timeout || 5000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Ensure baseUrl doesn't have trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  /**
   * Connect to the daemon REST API
   * Verifies the connection by calling the health endpoint
   */
  async connect(): Promise<void> {
    try {
      console.error(`[DaemonRESTClient] Connecting to daemon at ${this.baseUrl}`);
      
      const health = await this.getHealth();
      
      if (health.status === 'healthy' || health.status === 'starting') {
        this.isConnected = true;
        console.error(`[DaemonRESTClient] Connected to daemon (status: ${health.status}, version: ${health.version})`);
      } else {
        throw new Error(`Daemon is not healthy: ${health.status}`);
      }
    } catch (error) {
      this.isConnected = false;
      console.error(`[DaemonRESTClient] Failed to connect to daemon:`, error);
      throw new Error(`Failed to connect to daemon at ${this.baseUrl}: ${error}`);
    }
  }

  /**
   * Make a REST API request with retries and timeout
   */
  private async makeRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      // Create a local abort controller for this specific request attempt
      const localController = new AbortController();
      let timeoutId: NodeJS.Timeout | undefined;
      
      try {
        // Set up timeout with the local controller
        timeoutId = setTimeout(() => {
          localController.abort();
        }, this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: localController.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          try {
            const errorJson = JSON.parse(errorBody) as ErrorResponse;
            errorMessage = errorJson.message || errorMessage;
          } catch {
            // If not JSON, use the text body
            if (errorBody) {
              errorMessage = errorBody;
            }
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        return data as T;
        
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.name === 'AbortError') {
          throw new Error(`Request to ${url} timed out after ${this.timeout}ms`);
        }
        
        if (attempt < this.retryAttempts) {
          console.error(`[DaemonRESTClient] Request failed (attempt ${attempt}/${this.retryAttempts}), retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      } finally {
        // Clean up the timeout if it hasn't fired
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    throw lastError || new Error(`Failed to make request to ${url}`);
  }

  /**
   * Get health status from the daemon
   */
  async getHealth(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/api/v1/health');
  }

  /**
   * Get server information from the daemon
   */
  async getServerInfo(): Promise<ServerInfoResponse> {
    if (!this.isConnected) {
      throw new Error('Not connected to daemon. Call connect() first.');
    }
    return this.makeRequest<ServerInfoResponse>('/api/v1/server/info');
  }

  /**
   * Get configured folders from the daemon
   * Note: This endpoint will be implemented in a future sprint
   */
  async getFoldersConfig(): Promise<FolderConfig[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to daemon. Call connect() first.');
    }
    
    // For Sprint 2, we'll use the server info to simulate folders
    // This will be replaced with actual /api/v1/folders endpoint in Sprint 5
    const serverInfo = await this.getServerInfo();
    
    // Create mock folder data based on server info
    const mockFolders: FolderConfig[] = [];
    
    if (serverInfo.daemon.folderCount > 0) {
      // Add some example folders for testing
      mockFolders.push({
        id: 'sales',
        name: 'Sales',
        path: '/Users/hanan/Documents/Sales',
        model: 'all-MiniLM-L6-v2',
        status: 'active',
        documentCount: 42,
        lastIndexed: new Date().toISOString(),
        topics: ['Q4 Revenue', 'Sales Pipeline', 'Customer Analysis']
      });
      
      if (serverInfo.daemon.folderCount > 1) {
        mockFolders.push({
          id: 'engineering',
          name: 'Engineering',
          path: '/Users/hanan/Documents/Engineering',
          model: 'all-mpnet-base-v2',
          status: 'indexing',
          documentCount: 156,
          lastIndexed: new Date().toISOString(),
          topics: ['Architecture', 'API Design', 'Performance']
        });
      }
    }
    
    return mockFolders;
  }

  /**
   * Close the client and clean up resources
   */
  close(): void {
    // No active abort controllers to clean up since they're now local to each request
    this.isConnected = false;
    console.error('[DaemonRESTClient] Client closed');
  }

  /**
   * Check if connected to daemon
   */
  get connected(): boolean {
    return this.isConnected;
  }
}