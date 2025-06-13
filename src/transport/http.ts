/**
 * HTTP Transport Implementation (REST Gateway)
 * 
 * Implements HTTP REST gateway transport for document intelligence services
 * with JSON request/response translation and CORS support.
 */

import { EventEmitter } from 'events';
import { ITransport } from './interfaces.js';
import { 
  HttpTransportConfig, 
  TransportStatus, 
  TransportType,
  TransportCapabilities,
  TransportConnectionMetadata,
  TransportHealthCheck,
  TransportStats
} from './types.js';

/**
 * HTTP transport implementation using REST API
 */
export class HttpTransport extends EventEmitter implements ITransport {
  public readonly type: TransportType = 'http';
  public readonly capabilities: TransportCapabilities;
  
  private _status: TransportStatus = 'disconnected';
  private _stats: TransportStats;
  private _connections: TransportConnectionMetadata[] = [];
  
  constructor(public readonly config: HttpTransportConfig) {
    super();
    
    this.capabilities = {
      type: 'http',
      supportsStreaming: false, // HTTP REST doesn't support true streaming
      supportsAuthentication: true, // HTTP supports API key auth
      supportsBinaryData: true, // HTTP supports binary via base64 or multipart
      maxConcurrentConnections: 10000,
      maxRequestSize: 32 * 1024 * 1024, // 32MB
      maxResponseSize: 32 * 1024 * 1024, // 32MB
    };
    
    this._stats = {
      type: 'http',
      connectionsActive: 0,
      connectionsTotal: 0,
      requestsTotal: 0,
      requestsSuccess: 0,
      requestsError: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      uptime: 0,
    };
  }
  
  public get status(): TransportStatus {
    return this._status;
  }
  
  /**
   * Start the HTTP transport server
   */
  public async start(): Promise<void> {
    if (this._status !== 'disconnected') {
      throw new Error('Transport is already started or starting');
    }
    
    this._status = 'connecting';
    
    try {
      // TODO: Implement actual HTTP server startup
      await this.simulateStartup();
      
      this._status = 'connected';
      this._stats.uptime = Date.now();
      
      this.emit('connected', { 
        transportType: this.type, 
        timestamp: new Date() 
      });
      
    } catch (error) {
      this._status = 'error';
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Stop the HTTP transport server
   */
  public async stop(): Promise<void> {
    if (this._status === 'disconnected') {
      return;
    }
    
    try {
      // TODO: Implement actual cleanup
      await this.simulateShutdown();
      
      this._status = 'disconnected';
      this._connections = [];
      
      this.emit('disconnected', { 
        transportType: this.type, 
        timestamp: new Date() 
      });
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Perform health check
   */
  public async healthCheck(): Promise<TransportHealthCheck> {
    const startTime = Date.now();
    
    try {
      // TODO: Implement actual health check (GET /health)
      await this.simulateHealthCheck();
      
      return {
        type: this.type,
        status: this._status,
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        type: this.type,
        status: 'error',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Get transport statistics
   */
  public getStats(): TransportStats {
    return {
      ...this._stats,
      uptime: this._stats.uptime > 0 ? (Date.now() - this._stats.uptime) / 1000 : 0,
    };
  }
  
  /**
   * Get active connections
   */
  public getConnections(): TransportConnectionMetadata[] {
    return [...this._connections];
  }
  
  /**
   * Send a request through HTTP transport
   */
  public async request<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): Promise<TResponse> {
    if (this._status !== 'connected') {
      throw new Error('Transport is not connected');
    }
    
    // Validate API key for non-localhost connections
    if (!this.isLocalhostConnection() && !this.validateAuthentication(metadata)) {
      throw new Error('Authentication required for remote HTTP connections');
    }
    
    const startTime = Date.now();
    this._stats.requestsTotal++;
    
    try {
      // TODO: Implement actual HTTP request handling
      const response = await this.simulateRequest<TRequest, TResponse>(method, request, metadata);
      
      this._stats.requestsSuccess++;
      this.updateLatency(Date.now() - startTime);
      
      return response;
    } catch (error) {
      this._stats.requestsError++;
      throw error;
    }
  }
  
  /**
   * HTTP doesn't support true streaming, so this simulates chunked responses
   */
  public async* streamRequest<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): AsyncIterable<TResponse> {
    if (this._status !== 'connected') {
      throw new Error('Transport is not connected');
    }
    
    // For HTTP, we simulate streaming by making multiple requests
    // or using Server-Sent Events (SSE) / WebSockets
    yield* this.simulateStreamRequest<TRequest, TResponse>(method, request, metadata);
  }
  
  /**
   * Update transport configuration
   */
  public async updateConfig(config: Partial<HttpTransportConfig>): Promise<void> {
    // TODO: Implement configuration updates
    if (config.host && typeof config.host !== 'string') {
      throw new Error('Host must be a string');
    }
    if (config.port && (typeof config.port !== 'number' || config.port < 1 || config.port > 65535)) {
      throw new Error('Port must be a number between 1 and 65535');
    }
  }
  
  // Private helper methods
  
  private isLocalhostConnection(): boolean {
    return this.config.host === 'localhost' || 
           this.config.host === '127.0.0.1' || 
           this.config.host === '::1';
  }
  
  private validateAuthentication(metadata?: Record<string, string>): boolean {
    if (!metadata) return false;
    
    // Check for Authorization header
    const authHeader = metadata['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return token === this.config.apiKey;
    }
    
    // Check for x-api-key header
    const apiKeyHeader = metadata['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader === this.config.apiKey;
    }
    
    return false;
  }
  
  private async simulateStartup(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    if (!this.config.host || !this.config.port) {
      throw new Error('Host and port are required for HTTP transport');
    }
    
    const protocol = this.config.enableHTTPS ? 'https' : 'http';
    const basePath = this.config.basePath || '/v1';
    console.log(`[HttpTransport] Would start HTTP server at ${protocol}://${this.config.host}:${this.config.port}${basePath}`);
  }
  
  private async simulateShutdown(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 75));
    console.log(`[HttpTransport] Would stop HTTP server at ${this.config.host}:${this.config.port}`);
  }
  
  private async simulateHealthCheck(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  
  private async simulateRequest<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): Promise<TResponse> {
    await new Promise(resolve => setTimeout(resolve, 8));
    
    return { 
      success: true, 
      method, 
      transport: 'http',
      authenticated: !this.isLocalhostConnection(),
      path: `${this.config.basePath || '/v1'}/${method.toLowerCase()}`,
      echo: request 
    } as unknown as TResponse;
  }
  
  private async* simulateStreamRequest<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): AsyncIterable<TResponse> {
    // Simulate chunked HTTP response or SSE
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 25));
      yield { 
        chunk: i, 
        method, 
        transport: 'http',
        data: request 
      } as unknown as TResponse;
    }
  }
  
  private updateLatency(latency: number): void {
    const totalRequests = this._stats.requestsTotal;
    if (totalRequests === 1) {
      this._stats.averageLatency = latency;
    } else {
      this._stats.averageLatency = 
        (this._stats.averageLatency * (totalRequests - 1) + latency) / totalRequests;
    }
  }
}
