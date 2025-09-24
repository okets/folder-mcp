/**
 * Daemon REST Client for MCP Server
 * Phase 9 - Sprint 2: Connect MCP server to daemon via REST API
 * 
 * This client communicates with the daemon's REST API on port 3002
 * instead of using WebSocket, providing stateless operations for MCP endpoints.
 * 
 * Auto-discovers daemon just like TUI does - no configuration needed!
 */

import fetch, { RequestInit } from 'node-fetch';
import { DaemonRegistry } from '../../daemon/registry/daemon-registry.js';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

export interface FolderConfig {
  id: string;
  name: string;
  path: string;
  model: string;
  status: 'active' | 'indexing' | 'pending' | 'error';
  documentCount?: number;
  lastIndexed?: string;
  keyPhrases?: string[];
  contentComplexity?: string;
  avgReadabilityScore?: number;
  
  // Enhanced metadata for better decision making
  indexingProgress?: number;      // 0-100 for indexing status
  errorMessage?: string;           // Error details if status is 'error'
  documentTypes?: Record<string, number>;  // e.g., {"pdf": 45, "docx": 30}
  totalSize?: number;              // Total size in bytes
  lastAccessed?: string;           // ISO timestamp of last access
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
 * Check if an error indicates the daemon is down
 */
function isDaemonDownError(error: any): boolean {
  // Check error codes first (most reliable)
  if (error.code) {
    const daemonDownCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH'];
    if (daemonDownCodes.includes(error.code)) {
      return true;
    }
  }
  
  // Check error names
  if (error.name) {
    const daemonDownNames = ['FetchError', 'AbortError', 'TypeError', 'NetworkError'];
    if (daemonDownNames.includes(error.name)) {
      return true;
    }
  }
  
  // Check message patterns (case-insensitive)
  const message = error.message?.toLowerCase() || '';
  const daemonDownPatterns = [
    'econnrefused',
    'connection refused',
    'connect econnrefused',
    'failed to connect',
    'socket hang up',
    'connection reset',
    'network timeout',
    'request to http',
    'fetch failed',
    'unable to connect',
    'connection failed',
    'connection dropped',
    'connection closed',
    'enotfound',
    'etimedout',
    'ehostunreach'
  ];
  
  return daemonDownPatterns.some(pattern => message.includes(pattern));
}

/**
 * Find the daemon executable path
 */
function findDaemonExecutable(): string | null {
  // Get the directory of the current module
  const currentDir = dirname(fileURLToPath(import.meta.url));
  
  // Try different possible paths relative to current script
  const possiblePaths = [
    // Build output structure from mcp client
    resolve(currentDir, '..', '..', 'daemon', 'index.js'),
    // Development structure
    resolve(currentDir, '..', '..', '..', 'dist', 'daemon', 'index.js'),
    // Same directory structure as mcp-server
    resolve(currentDir, '..', '..', 'dist', 'src', 'daemon', 'index.js'),
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  return null;
}

/**
 * Attempt to auto-spawn the daemon process
 */
async function attemptDaemonAutoStart(): Promise<boolean> {
  // Check if auto-spawn is disabled
  if (process.env.FOLDER_MCP_AUTO_SPAWN_DAEMON === 'false') {
    return false;
  }
  
  let daemonProcess: any = null;
  let healthCheckTimeout: NodeJS.Timeout | null = null;
  let processCleanedUp = false;
  
  try {
    // Find the daemon executable
    const daemonPath = findDaemonExecutable();
    if (!daemonPath) {
      return false;
    }
    
    // Spawn daemon process with detachment
    daemonProcess = spawn('node', [daemonPath, '--auto-start'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'], // Capture stderr/stdout for debugging
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production'
      }
    });
    
    // Set up error and exit listeners to detect immediate failures
    const handleProcessError = (error: Error) => {
      if (!processCleanedUp) {
        console.error('[DaemonRESTClient] Daemon process error:', error);
        cleanupDaemonProcess();
      }
    };
    
    const handleProcessExit = (code: number | null, signal: string | null) => {
      if (!processCleanedUp && (code !== 0 || signal)) {
        console.error(`[DaemonRESTClient] Daemon process exited unexpectedly: code=${code}, signal=${signal}`);
        cleanupDaemonProcess();
      }
    };
    
    // Function to cleanup the daemon process
    const cleanupDaemonProcess = () => {
      if (processCleanedUp) return;
      processCleanedUp = true;
      
      if (daemonProcess) {
        // Remove listeners
        daemonProcess.removeListener('error', handleProcessError);
        daemonProcess.removeListener('exit', handleProcessExit);
        
        // Try to kill the process group
        try {
          // Kill the entire process group (negative PID)
          process.kill(-daemonProcess.pid, 'SIGTERM');
        } catch (killError) {
          // If group kill fails, try killing just the process
          try {
            daemonProcess.kill('SIGTERM');
          } catch (err) {
            console.error('[DaemonRESTClient] Failed to kill daemon process:', err);
          }
        }
      }
      
      if (healthCheckTimeout) {
        clearTimeout(healthCheckTimeout);
        healthCheckTimeout = null;
      }
    };
    
    // Attach error and exit listeners
    daemonProcess.on('error', handleProcessError);
    daemonProcess.on('exit', handleProcessExit);
    
    // Capture and log stderr for debugging (but don't block on it)
    if (daemonProcess.stderr) {
      daemonProcess.stderr.on('data', (data: Buffer) => {
        console.error('[DaemonRESTClient] Daemon stderr:', data.toString());
      });
    }
    
    // Set up cleanup on parent process exit
    const cleanupOnExit = () => {
      if (!processCleanedUp) {
        console.error('[DaemonRESTClient] Parent process exiting, cleaning up daemon...');
        cleanupDaemonProcess();
      }
    };
    
    process.once('exit', cleanupOnExit);
    process.once('SIGINT', cleanupOnExit);
    process.once('SIGTERM', cleanupOnExit);
    
    // Wait for daemon to be ready with polling
    const startTime = Date.now();
    const timeoutMs = 10000; // 10 seconds
    const pollInterval = 500; // 500ms
    
    while (Date.now() - startTime < timeoutMs) {
      let tempClient: DaemonRESTClient | null = null;
      try {
        tempClient = new DaemonRESTClient();
        await tempClient.connect();
        const health = await tempClient.getHealth();
        
        if (health.status === 'healthy' || health.status === 'starting') {
          // Health check succeeded - daemon is ready
          // Clean up parent process exit handlers since daemon is now independent
          process.removeListener('exit', cleanupOnExit);
          process.removeListener('SIGINT', cleanupOnExit);
          process.removeListener('SIGTERM', cleanupOnExit);
          
          // Remove error/exit listeners from daemon process
          if (daemonProcess) {
            daemonProcess.removeListener('error', handleProcessError);
            daemonProcess.removeListener('exit', handleProcessExit);
            
            // Now safe to unref so parent can exit without waiting
            daemonProcess.unref();
          }
          
          processCleanedUp = true;
          return true;
        }
      } catch (error) {
        // Daemon not ready yet, continue polling
      } finally {
        // Always close the client to prevent resource leaks
        if (tempClient) {
          try {
            tempClient.close();
          } catch (closeError) {
            // Log but don't throw - cleanup should never abort the caller
            console.error('[DaemonRESTClient] Error closing temp client during health polling:', closeError);
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    // Health check timed out - cleanup and fail
    console.error('[DaemonRESTClient] Daemon health check timed out after', timeoutMs, 'ms');
    cleanupDaemonProcess();
    return false;
    
  } catch (error) {
    console.error('[DaemonRESTClient] Failed to spawn daemon:', error);
    // Ensure cleanup happens even on unexpected errors
    if (!processCleanedUp && daemonProcess) {
      try {
        process.kill(-daemonProcess.pid, 'SIGTERM');
      } catch (killError) {
        try {
          daemonProcess.kill('SIGTERM');
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
    return false;
  }
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
    options: RequestInit = {},
    recoveryAttempted: boolean = false
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

    // Before giving up, attempt daemon recovery if this appears to be a daemon-down error
    const finalError = lastError || new Error(`Failed to make request to ${url}`);
    
    // Only attempt recovery once to prevent infinite recursion
    if (!recoveryAttempted && isDaemonDownError(finalError)) {
      console.error('[DaemonRESTClient] Daemon appears down, attempting recovery...');
      
      try {
        // Attempt to restart the daemon
        const recoverySuccess = await attemptDaemonAutoStart();
        
        if (recoverySuccess) {
          console.error('[DaemonRESTClient] Daemon restarted, reconnecting and retrying request...');
          
          // Reconnect this client
          this.isConnected = false;
          await this.connect();
          
          // Retry the original request once more, marking recovery as attempted
          return await this.makeRequest(path, options, true);
        } else {
          console.error('[DaemonRESTClient] Daemon restart failed');
        }
      } catch (recoveryError) {
        console.error('[DaemonRESTClient] Recovery attempt failed:', recoveryError);
      }
    }
    
    throw finalError;
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
  async getServerInfo(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to daemon. Call connect() first.');
    }
    return this.makeRequest<any>('/api/v1/server/info');
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
   * Phase 10 Sprint 1: Get enhanced folders with semantic previews
   * Returns the full response structure for LLM consumption
   */
  async getFoldersEnhanced(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to daemon. Call connect() first.');
    }

    // Return the full enhanced response
    const response = await this.makeRequest<any>('/api/v1/folders');
    return response;
  }

  /**
   * List documents in a specific folder (Sprint 5)
   */
  async getDocuments(
    folderPath: string, 
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
    // Use path as identifier - encode it properly for URL
    const path = `/api/v1/folders/${encodeURIComponent(folderPath)}/documents${queryString ? '?' + queryString : ''}`;

    return await this.makeRequest(path);
  }

  /**
   * Get specific document content (Sprint 6)
   */
  async getDocumentData(
    folderPath: string,
    docId: string
  ): Promise<{
    folderContext: {
      id: string;
      name: string;
      path: string;
      model: string;
      status: string;
    };
    document: {
      id: string;
      name: string;
      type: string;
      size: number;
      content: string;
      metadata: any;
    };
  }> {
    const path = `/api/v1/folders/${encodeURIComponent(folderPath)}/documents/${encodeURIComponent(docId)}`;
    return await this.makeRequest(path);
  }

  /**
   * Get document outline/structure (Sprint 6)
   */
  async getDocumentOutline(
    folderPath: string,
    docId: string
  ): Promise<{
    folderContext: {
      id: string;
      name: string;
      path: string;
      model: string;
      status: string;
    };
    outline: {
      type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'text';
      totalItems?: number;
      pages?: Array<{
        pageNumber: number;
        title?: string;
        content?: string;
      }>;
      sections?: Array<{
        level: number;
        title: string;
        pageNumber?: number;
      }>;
      sheets?: Array<{
        sheetIndex: number;
        name: string;
        rowCount?: number;
        columnCount?: number;
      }>;
      slides?: Array<{
        slideNumber: number;
        title: string;
        notes?: string;
      }>;
      headings?: Array<{
        level: number;
        title: string;
        lineNumber?: number;
      }>;
    };
  }> {
    const path = `/api/v1/folders/${encodeURIComponent(folderPath)}/documents/${encodeURIComponent(docId)}/outline`;
    return await this.makeRequest(path);
  }

  /**
   * Search within a specific folder (Sprint 7)
   */
  async searchFolder(
    folderPath: string,
    searchParams: {
      query: string;
      limit?: number;
      threshold?: number;
      includeContent?: boolean;
    }
  ): Promise<{
    folderContext: {
      id: string;
      name: string;
      path: string;
      model: string;
      status: string;
    };
    results: Array<{
      documentId: string;
      documentName: string;
      relevance: number;
      snippet: string;
      pageNumber?: number;
      chunkId?: string;
      documentType?: string;
      documentPath?: string;
    }>;
    performance: {
      searchTime: number;
      modelLoadTime: number;
      documentsSearched: number;
      totalResults: number;
      modelUsed: string;
    };
    query: string;
    parameters: {
      limit: number;
      threshold: number;
      includeContent: boolean;
    };
  }> {
    if (!this.isConnected) {
      throw new Error('Not connected to daemon. Call connect() first.');
    }

    const path = `/api/v1/folders/${encodeURIComponent(folderPath)}/search`;
    
    // Make POST request with search parameters in body
    return await this.makeRequest(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchParams)
    });
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
   * Phase 10 Sprint 2: Explore folder with ls-like navigation
   */
  async exploreFolder(
    folderPath: string,
    options: {
      subPath?: string;
      subdirLimit?: number;
      fileLimit?: number;
      continuationToken?: string;
    } = {}
  ): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to daemon. Call connect() first.');
    }

    // Build query string
    const params = new URLSearchParams();
    if (options.subPath !== undefined) params.append('sub_path', options.subPath);
    if (options.subdirLimit !== undefined) params.append('subdir_limit', options.subdirLimit.toString());
    if (options.fileLimit !== undefined) params.append('file_limit', options.fileLimit.toString());
    if (options.continuationToken) params.append('continuation_token', options.continuationToken);

    const queryString = params.toString();
    const path = `/api/v1/folders/${encodeURIComponent(folderPath)}/explore${queryString ? '?' + queryString : ''}`;

    return await this.makeRequest(path);
  }

  /**
   * Check if connected to daemon
   */
  get connected(): boolean {
    return this.isConnected;
  }
}