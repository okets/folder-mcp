/**
 * Daemon REST Client for MCP Server
 * Phase 9 - Sprint 2: Connect MCP server to daemon via REST API
 * 
 * This client communicates with the daemon's REST API on port 3002
 * instead of using WebSocket, providing stateless operations for MCP endpoints.
 * 
 * Auto-discovers daemon just like TUI does - no configuration needed!
 */

import fetch, { RequestInit, Response } from 'node-fetch';
import { DaemonRegistry } from '../../daemon/registry/daemon-registry.js';

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
    // We'll set baseUrl dynamically during connect() through auto-discovery
    this.baseUrl = options.baseUrl || '';
    this.timeout = options.timeout || 5000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Auto-discover daemon REST API using registry
   * Returns the REST API URL constructed from discovered host and port
   */
  private async discoverDaemonUrl(): Promise<string> {
    // First check if baseUrl was explicitly provided
    if (this.baseUrl) {
      return this.baseUrl;
    }
    
    // Check environment variable
    if (process.env.DAEMON_URL) {
      return process.env.DAEMON_URL;
    }

    // Use daemon registry discovery
    try {
      const daemonInfo = await DaemonRegistry.discover();
      if (daemonInfo) {
        // Use discovered host and REST port
        // Normalize host to loopback if needed
        const host = daemonInfo.host || '127.0.0.1';
        const normalizedHost = (host === 'localhost' || host === '0.0.0.0') ? '127.0.0.1' : host;
        
        // Use explicit restPort if available, otherwise fallback to hardcoded 3002
        // (for backward compatibility with daemons that don't report restPort yet)
        const restPort = daemonInfo.restPort || 3002;
        
        const restUrl = `http://${normalizedHost}:${restPort}`;
        console.error(`[DaemonRESTClient] Auto-discovered daemon REST API at ${restUrl}`);
        return restUrl;
      }
    } catch (error) {
      console.error(`[DaemonRESTClient] Registry discovery failed: ${error}`);
    }

    // Fallback to default when no discovery info available
    const defaultUrl = 'http://localhost:3002';
    console.error(`[DaemonRESTClient] No daemon discovered, using default: ${defaultUrl}`);
    return defaultUrl;
  }

  /**
   * Connect to the daemon REST API
   * Auto-discovers daemon port using the same mechanism as TUI
   */
  async connect(): Promise<void> {
    try {
      // Auto-discover daemon URL if not already set
      this.baseUrl = await this.discoverDaemonUrl();
      // Ensure baseUrl doesn't have trailing slash
      this.baseUrl = this.baseUrl.replace(/\/$/, '');
      
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
   * Get folders configuration (Sprint 5 - real REST API implementation)
   */
  async getFoldersConfig(): Promise<FolderConfig[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to daemon. Call connect() first.');
    }
    
    interface FoldersResponse {
      folders: FolderConfig[];
      totalCount: number;
    }
    
    const response = await this.makeRequest<FoldersResponse>('/api/v1/folders');
    return response.folders;
  }

  /**
   * List documents in a specific folder (Sprint 5)
   */
  async getDocuments(
    folderId: string, 
    options: {
      limit?: number;
      offset?: number;
      sort?: 'name' | 'modified' | 'size' | 'type';
      order?: 'asc' | 'desc';
      type?: string;
    } = {}
  ): Promise<{
    folderContext: {
      id: string;
      name: string;
      path: string;
      model: string;
      status: string;
    };
    documents: Array<{
      id: string;
      name: string;
      path: string;
      type: string;
      size: number;
      modified: string;
      indexed: boolean;
      metadata?: any;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    if (!this.isConnected) {
      throw new Error('Not connected to daemon. Call connect() first.');
    }

    // Build query string
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.append('limit', options.limit.toString());
    if (options.offset !== undefined) params.append('offset', options.offset.toString());
    if (options.sort) params.append('sort', options.sort);
    if (options.order) params.append('order', options.order);
    if (options.type) params.append('type', options.type);

    const queryString = params.toString();
    const path = `/api/v1/folders/${encodeURIComponent(folderId)}/documents${queryString ? '?' + queryString : ''}`;

    return await this.makeRequest(path);
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