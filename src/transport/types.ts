/**
 * Transport Layer Type Definitions
 * 
 * Core types for the transport layer abstraction supporting multiple
 * transport protocols: local (UDS/Named Pipes), remote (TCP gRPC), HTTP REST.
 */

/**
 * Transport protocol types
 */
export type TransportType = 'local' | 'remote' | 'http';

/**
 * Transport connection status
 */
export type TransportStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Transport configuration base interface
 */
export interface TransportConfig {
  type: TransportType;
  enabled: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Local transport configuration (Unix Domain Socket / Named Pipes)
 */
export interface LocalTransportConfig extends TransportConfig {
  type: 'local';
  socketPath?: string;        // Unix: /tmp/folder-mcp.sock, Windows: \\.\pipe\folder-mcp
  permissions?: number;       // Unix socket permissions (e.g., 0o600)
}

/**
 * Remote transport configuration (TCP gRPC)
 */
export interface RemoteTransportConfig extends TransportConfig {
  type: 'remote';
  host: string;
  port: number;
  enableTLS?: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  apiKey?: string;           // API key for authentication
}

/**
 * HTTP transport configuration (REST Gateway)
 */
export interface HttpTransportConfig extends TransportConfig {
  type: 'http';
  host: string;
  port: number;
  basePath?: string;         // API base path (e.g., '/v1')
  enableHTTPS?: boolean;
  corsEnabled?: boolean;
  apiKey?: string;           // API key for authentication
}

/**
 * Combined transport configuration
 */
export type AnyTransportConfig = LocalTransportConfig | RemoteTransportConfig | HttpTransportConfig;

/**
 * Transport selection strategy
 */
export type TransportSelectionStrategy = 'prefer-local' | 'prefer-remote' | 'http-only' | 'explicit';

/**
 * Transport selection configuration
 */
export interface TransportSelectionConfig {
  strategy: TransportSelectionStrategy;
  fallback: boolean;         // Allow fallback to other transports
  priority: TransportType[]; // Priority order for transport selection
}

/**
 * Complete transport layer configuration
 */
export interface TransportLayerConfig {
  selection: TransportSelectionConfig;
  local: LocalTransportConfig;
  remote: RemoteTransportConfig;
  http: HttpTransportConfig;
}

/**
 * Transport health check result
 */
export interface TransportHealthCheck {
  type: TransportType;
  status: TransportStatus;
  latency?: number;          // Connection latency in ms
  lastCheck: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transport connection metadata
 */
export interface TransportConnectionMetadata {
  transportType: TransportType;
  connectedAt: Date;
  clientId?: string;
  remoteAddress?: string;
  authenticated: boolean;
  apiKeyUsed?: boolean;
}

/**
 * Transport error types
 */
export type TransportErrorType = 
  | 'connection_failed'
  | 'authentication_failed'
  | 'timeout'
  | 'protocol_error'
  | 'permission_denied'
  | 'service_unavailable';

/**
 * Transport error information
 */
export interface TransportError {
  type: TransportErrorType;
  message: string;
  transportType: TransportType;
  recoverable: boolean;
  retryAfter?: number;       // Retry delay in ms
  details?: Record<string, unknown>;
}

/**
 * Transport statistics
 */
export interface TransportStats {
  type: TransportType;
  connectionsActive: number;
  connectionsTotal: number;
  requestsTotal: number;
  requestsSuccess: number;
  requestsError: number;
  bytesTransferred: number;
  averageLatency: number;
  uptime: number;            // Seconds since transport started
}

/**
 * Transport event types
 */
export type TransportEvent = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'request'
  | 'response'
  | 'health_check';

/**
 * Transport event data
 */
export interface TransportEventData {
  event: TransportEvent;
  transportType: TransportType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  error?: TransportError;
}

/**
 * Service endpoint definition
 */
export interface ServiceEndpoint {
  method: string;            // gRPC method name
  path: string;              // HTTP path
  description: string;
  requestType: string;       // Proto message type
  responseType: string;      // Proto message type
  streaming: boolean;        // Whether response is streamed
  authentication: boolean;   // Whether authentication is required
}

/**
 * Transport capabilities
 */
export interface TransportCapabilities {
  type: TransportType;
  supportsStreaming: boolean;
  supportsAuthentication: boolean;
  supportsBinaryData: boolean;
  maxConcurrentConnections: number;
  maxRequestSize: number;    // Bytes
  maxResponseSize: number;   // Bytes
}

/**
 * Transport capabilities
 */
export interface TransportCapabilities {
  type: TransportType;
  supportsStreaming: boolean;
  supportsAuthentication: boolean;
  supportsBinaryData: boolean;
  maxConcurrentConnections: number;
  maxRequestSize: number;    // Bytes
  maxResponseSize: number;   // Bytes
}

/**
 * Transport connection metadata
 */
export interface TransportConnectionMetadata {
  transportType: TransportType;
  connectedAt: Date;
  clientId?: string;
  remoteAddress?: string;
  authenticated: boolean;
  apiKeyUsed?: boolean;
}

/**
 * Transport health check result
 */
export interface TransportHealthCheck {
  type: TransportType;
  status: TransportStatus;
  latency?: number;          // Connection latency in ms
  lastCheck: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transport statistics
 */
export interface TransportStats {
  type: TransportType;
  connectionsActive: number;
  connectionsTotal: number;
  requestsTotal: number;
  requestsSuccess: number;
  requestsError: number;
  bytesTransferred: number;
  averageLatency: number;
  uptime: number;            // Seconds since transport started
}

/**
 * Default transport configurations
 */
export const DEFAULT_TRANSPORT_CONFIGS = {
  local: {
    type: 'local' as const,
    enabled: true,
    socketPath: process.platform === 'win32' ? '\\\\.\\pipe\\folder-mcp' : '/tmp/folder-mcp.sock',
    permissions: 0o600,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  } satisfies LocalTransportConfig,
  
  remote: {
    type: 'remote' as const,
    enabled: false,
    host: 'localhost',
    port: 50051,
    enableTLS: false,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  } satisfies RemoteTransportConfig,
  
  http: {
    type: 'http' as const,
    enabled: true,
    host: 'localhost',
    port: 8080,
    basePath: '/v1',
    enableHTTPS: false,
    corsEnabled: true,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  } satisfies HttpTransportConfig,
};

/**
 * Default transport selection configuration
 */
export const DEFAULT_TRANSPORT_SELECTION: TransportSelectionConfig = {
  strategy: 'prefer-local',
  fallback: true,
  priority: ['local', 'remote', 'http'],
};
