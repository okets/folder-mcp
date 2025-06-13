/**
 * gRPC Transport Configuration
 * 
 * Configuration interfaces and factories for gRPC transport setup
 */

import { GrpcServerConfig } from '../grpc/server.js';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Default gRPC server configuration
 */
export function createDefaultGrpcConfig(folder: string = process.cwd()): GrpcServerConfig {
  return {
    unix: {
      enabled: true,
      path: process.platform === 'win32' 
        ? '\\\\.\\pipe\\folder-mcp'  // Named pipe on Windows
        : '/tmp/folder-mcp.sock',    // Unix socket on Unix-like systems
      permissions: 0o600  // Owner read/write only
    },
    tcp: {
      enabled: false,  // Disabled by default for security
      port: 50051,
      host: '127.0.0.1',  // Local only by default
      enableTls: false
    },
    maxReceiveMessageLength: 4 * 1024 * 1024,  // 4MB
    maxSendMessageLength: 4 * 1024 * 1024,     // 4MB
    enableHealthCheck: true,
    folder: folder,
    requireAuthForRemote: true  // Require authentication for remote connections
  };
}

/**
 * Create gRPC config for remote access
 */
export function createRemoteGrpcConfig(options: {
  port?: number;
  host?: string;
  enableTls?: boolean;
  certPath?: string;
  keyPath?: string;
  enableUnix?: boolean;
}): GrpcServerConfig {
  const defaultConfig = createDefaultGrpcConfig();
  
  return {
    ...defaultConfig,
    unix: {
      ...defaultConfig.unix,
      enabled: options.enableUnix !== false  // Enable Unix by default
    },
    tcp: {
      enabled: true,
      port: options.port || 50051,
      host: options.host || '0.0.0.0',  // Accept external connections
      enableTls: options.enableTls || false,
      ...(options.certPath && { certPath: options.certPath }),
      ...(options.keyPath && { keyPath: options.keyPath })
    }
  };
}

/**
 * Create gRPC config from environment variables
 */
export function createGrpcConfigFromEnv(): GrpcServerConfig {
  const config = createDefaultGrpcConfig();
  
  // Unix socket configuration
  if (process.env.FOLDER_MCP_UNIX_SOCKET_PATH) {
    config.unix.path = process.env.FOLDER_MCP_UNIX_SOCKET_PATH;
  }
  
  if (process.env.FOLDER_MCP_UNIX_ENABLED !== undefined) {
    config.unix.enabled = process.env.FOLDER_MCP_UNIX_ENABLED === 'true';
  }
  
  // TCP configuration
  if (process.env.FOLDER_MCP_TCP_ENABLED !== undefined) {
    config.tcp.enabled = process.env.FOLDER_MCP_TCP_ENABLED === 'true';
  }
  
  if (process.env.FOLDER_MCP_TCP_PORT) {
    config.tcp.port = parseInt(process.env.FOLDER_MCP_TCP_PORT, 10);
  }
  
  if (process.env.FOLDER_MCP_TCP_HOST) {
    config.tcp.host = process.env.FOLDER_MCP_TCP_HOST;
  }
  
  if (process.env.FOLDER_MCP_TLS_ENABLED !== undefined) {
    config.tcp.enableTls = process.env.FOLDER_MCP_TLS_ENABLED === 'true';
  }
  
  if (process.env.FOLDER_MCP_TLS_CERT_PATH) {
    config.tcp.certPath = process.env.FOLDER_MCP_TLS_CERT_PATH;
  }
  
  if (process.env.FOLDER_MCP_TLS_KEY_PATH) {
    config.tcp.keyPath = process.env.FOLDER_MCP_TLS_KEY_PATH;
  }
  
  // Message size limits
  if (process.env.FOLDER_MCP_MAX_MESSAGE_SIZE) {
    const maxSize = parseInt(process.env.FOLDER_MCP_MAX_MESSAGE_SIZE, 10);
    config.maxReceiveMessageLength = maxSize;
    config.maxSendMessageLength = maxSize;
  }
  
  return config;
}

/**
 * Validate gRPC configuration
 */
export function validateGrpcConfig(config: GrpcServerConfig): string[] {
  const errors: string[] = [];
  
  // Validate that at least one transport is enabled
  if (!config.unix.enabled && !config.tcp.enabled) {
    errors.push('At least one transport (Unix or TCP) must be enabled');
  }
  
  // Validate Unix socket configuration
  if (config.unix.enabled) {
    if (!config.unix.path || config.unix.path.trim().length === 0) {
      errors.push('Unix socket path is required when Unix transport is enabled');
    }
  }
  
  // Validate TCP configuration
  if (config.tcp.enabled) {
    if (!config.tcp.host || config.tcp.host.trim().length === 0) {
      errors.push('TCP host is required when TCP transport is enabled');
    }
    
    if (!config.tcp.port || config.tcp.port < 1 || config.tcp.port > 65535) {
      errors.push('TCP port must be between 1 and 65535');
    }
    
    // Validate TLS configuration
    if (config.tcp.enableTls) {
      if (!config.tcp.certPath || !config.tcp.keyPath) {
        errors.push('TLS certificate and key paths are required when TLS is enabled');
      }
    }
  }
  
  // Validate message size limits
  if (config.maxReceiveMessageLength && config.maxReceiveMessageLength < 1024) {
    errors.push('Max receive message length must be at least 1024 bytes');
  }
  
  if (config.maxSendMessageLength && config.maxSendMessageLength < 1024) {
    errors.push('Max send message length must be at least 1024 bytes');
  }
  
  return errors;
}
