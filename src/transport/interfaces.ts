/**
 * Transport Layer Interface Definitions
 * 
 * Core abstractions for the transport layer supporting multiple protocols
 * with authentication, health checks, and graceful shutdown capabilities.
 */

import { EventEmitter } from 'events';
import { 
  TransportType, 
  TransportStatus, 
  TransportConfig, 
  TransportHealthCheck, 
  TransportConnectionMetadata,
  TransportError,
  TransportStats,
  TransportEventData,
  TransportCapabilities,
  ServiceEndpoint,
  AnyTransportConfig
} from './types.js';

// Import generated proto types and typed service
import { folder_mcp } from '../generated/folder-mcp.js';
import { 
  ITypedFolderMCPService, 
  ITypedTransport,
  ServiceMethodName,
  RequestTypeMap,
  ResponseTypeMap
} from './typed-service.js';

/**
 * Base transport interface
 * All transport implementations must implement this interface
 */
export interface ITransport extends EventEmitter {
  /**
   * Transport type identifier
   */
  readonly type: TransportType;
  
  /**
   * Current connection status
   */
  readonly status: TransportStatus;
  
  /**
   * Transport configuration
   */
  readonly config: TransportConfig;
  
  /**
   * Transport capabilities
   */
  readonly capabilities: TransportCapabilities;
  
  /**
   * Start the transport and begin accepting connections
   */
  start(): Promise<void>;
  
  /**
   * Stop the transport and close all connections gracefully
   */
  stop(): Promise<void>;
  
  /**
   * Perform health check on the transport
   */
  healthCheck(): Promise<TransportHealthCheck>;
  
  /**
   * Get current transport statistics
   */
  getStats(): TransportStats;
  
  /**
   * Get active connection metadata
   */
  getConnections(): TransportConnectionMetadata[];
  
  /**
   * Send a request through this transport
   * @param method - Service method name
   * @param request - Request data
   * @param metadata - Additional metadata (auth, tracing, etc.)
   */
  request<TRequest, TResponse>(
    method: string, 
    request: TRequest,
    metadata?: Record<string, string>
  ): Promise<TResponse>;
  
  /**
   * Send a streaming request through this transport
   * @param method - Service method name
   * @param request - Request data
   * @param metadata - Additional metadata
   */
  streamRequest<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): AsyncIterable<TResponse>;
  
  /**
   * Update transport configuration
   */
  updateConfig(config: Partial<TransportConfig>): Promise<void>;
}

/**
 * Transport factory interface
 * Creates and configures transport instances
 */
export interface ITransportFactory {
  /**
   * Create a transport instance of the specified type
   */
  createTransport(config: AnyTransportConfig): Promise<ITransport>;
  
  /**
   * Get supported transport types
   */
  getSupportedTypes(): TransportType[];
  
  /**
   * Validate transport configuration
   */
  validateConfig(config: AnyTransportConfig): Promise<ValidationResult>;
}

/**
 * Transport manager interface
 * Manages multiple transports and handles selection logic
 */
export interface ITransportManager extends EventEmitter {
  /**
   * Initialize the transport manager with configuration
   */
  initialize(config: TransportManagerConfig): Promise<void>;
  
  /**
   * Start all enabled transports
   */
  start(): Promise<void>;
  
  /**
   * Stop all transports gracefully
   */
  stop(): Promise<void>;
  
  /**
   * Get the currently active transport
   */
  getActiveTransport(): ITransport | null;
  
  /**
   * Get all available transports
   */
  getTransports(): ITransport[];
  
  /**
   * Select the best available transport based on configuration
   */
  selectTransport(): Promise<ITransport>;
  
  /**
   * Send a request using the best available transport
   */
  request<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): Promise<TResponse>;
  
  /**
   * Send a streaming request using the best available transport
   */
  streamRequest<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): AsyncIterable<TResponse>;
  
  /**
   * Perform health checks on all transports
   */
  healthCheckAll(): Promise<TransportHealthCheck[]>;
  
  /**
   * Get aggregated statistics from all transports
   */
  getAggregatedStats(): TransportManagerStats;
}

/**
 * Type-safe transport manager interface
 * Extends base transport manager with type-safe service methods
 */
export interface ITypedTransportManager extends ITransportManager {
  /**
   * Get the typed service interface for making calls
   */
  getTypedService(): ITypedFolderMCPService;
  
  /**
   * Type-safe request method with compile-time type checking
   */
  typedRequest<M extends ServiceMethodName>(
    method: M,
    request: RequestTypeMap[M],
    metadata?: Record<string, string>
  ): Promise<ResponseTypeMap[M]>;
  
  /**
   * Type-safe streaming request method
   */
  typedStreamRequest<M extends ServiceMethodName>(
    method: M,
    request: RequestTypeMap[M],
    metadata?: Record<string, string>
  ): AsyncIterable<ResponseTypeMap[M]>;
}

/**
 * Transport service interface
 * High-level service interface for handling gRPC service calls
 */
export interface ITransportService {
  /**
   * Register a service endpoint
   */
  registerEndpoint(endpoint: ServiceEndpoint): void;
  
  /**
   * Get all registered endpoints
   */
  getEndpoints(): ServiceEndpoint[];
  
  /**
   * Handle an incoming service call
   */
  handleCall<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata: Record<string, string>
  ): Promise<TResponse>;
  
  /**
   * Handle an incoming streaming call
   */
  handleStreamCall<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata: Record<string, string>
  ): AsyncIterable<TResponse>;
}

/**
 * Enhanced transport service interface with proto message support
 */
export interface IEnhancedTransportService extends ITransportService {
  /**
   * Handle incoming proto message calls
   */
  handleProtoCall<M extends ServiceMethodName>(
    method: M,
    request: RequestTypeMap[M],
    metadata: Record<string, string>
  ): Promise<ResponseTypeMap[M]>;
  
  /**
   * Handle incoming proto streaming calls
   */
  handleProtoStreamCall<M extends ServiceMethodName>(
    method: M,
    request: RequestTypeMap[M],
    metadata: Record<string, string>
  ): AsyncIterable<ResponseTypeMap[M]>;
  
  /**
   * Validate proto message request
   */
  validateProtoRequest<M extends ServiceMethodName>(
    method: M,
    request: RequestTypeMap[M]
  ): Promise<folder_mcp.IResponseStatus | null>;
}

/**
 * Authentication interface for transport layer
 */
export interface ITransportAuth {
  /**
   * Validate authentication credentials
   */
  validateCredentials(credentials: AuthCredentials): Promise<AuthResult>;
  
  /**
   * Extract credentials from transport metadata
   */
  extractCredentials(metadata: Record<string, string>): AuthCredentials | null;
  
  /**
   * Check if authentication is required for a method
   */
  isAuthRequired(method: string): boolean;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Transport manager configuration
 */
export interface TransportManagerConfig {
  transports: AnyTransportConfig[];
  selection: {
    strategy: 'prefer-local' | 'prefer-remote' | 'round-robin' | 'manual';
    fallback: boolean;
    healthCheckInterval: number; // ms
  };
  authentication?: {
    enabled: boolean;
    keyPath?: string;
    algorithms: string[];
  };
}

/**
 * Transport manager statistics
 */
export interface TransportManagerStats {
  activeTransports: number;
  totalTransports: number;
  totalRequests: number;
  totalErrors: number;
  averageLatency: number;
  uptime: number;
  transportStats: Record<TransportType, TransportStats>;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  type: 'api-key' | 'bearer-token' | 'mutual-tls';
  value: string;
  metadata?: Record<string, string>;
}

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  permissions: string[];
  error?: string;
  expiresAt?: Date;
}

/**
 * Transport middleware interface
 */
export interface ITransportMiddleware {
  /**
   * Process request before sending to transport
   */
  processRequest<TRequest>(
    method: string,
    request: TRequest,
    metadata: Record<string, string>
  ): Promise<{ request: TRequest; metadata: Record<string, string> }>;
  
  /**
   * Process response after receiving from transport
   */
  processResponse<TResponse>(
    method: string,
    response: TResponse,
    metadata: Record<string, string>
  ): Promise<{ response: TResponse; metadata: Record<string, string> }>;
  
  /**
   * Handle transport errors
   */
  handleError(error: TransportError, method: string): Promise<TransportError>;
}

/**
 * Transport event listener interface
 */
export interface ITransportEventListener {
  /**
   * Handle transport events
   */
  onTransportEvent(event: TransportEventData): Promise<void>;
}

/**
 * Connection pool interface for managing transport connections
 */
export interface ITransportConnectionPool {
  /**
   * Get a connection from the pool
   */
  getConnection(): Promise<ITransport>;
  
  /**
   * Return a connection to the pool
   */
  returnConnection(transport: ITransport): void;
  
  /**
   * Close all connections in the pool
   */
  closeAll(): Promise<void>;
  
  /**
   * Get pool statistics
   */
  getPoolStats(): ConnectionPoolStats;
}

/**
 * Connection pool statistics
 */
export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
}

/**
 * Transport discovery interface for finding available transports
 */
export interface ITransportDiscovery {
  /**
   * Discover available transports
   */
  discoverTransports(): Promise<TransportDiscoveryResult[]>;
  
  /**
   * Test transport connectivity
   */
  testTransport(config: AnyTransportConfig): Promise<boolean>;
}

/**
 * Transport discovery result
 */
export interface TransportDiscoveryResult {
  type: TransportType;
  config: AnyTransportConfig;
  available: boolean;
  latency?: number;
  error?: string;
}
