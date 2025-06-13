/**
 * Transport Factory Implementation
 * 
 * Creates and configures transport instances based on configuration.
 * Supports local (UDS/Named Pipes), remote (TCP gRPC), and HTTP transports.
 */

import { 
  ITransportFactory, 
  ITransport, 
  ValidationResult 
} from './interfaces.js';
import { 
  TransportType, 
  AnyTransportConfig, 
  LocalTransportConfig, 
  RemoteTransportConfig, 
  HttpTransportConfig 
} from './types.js';
import { LocalTransport } from './local.js';
import { RemoteTransport } from './remote.js';
import { HttpTransport } from './http.js';

/**
 * Transport factory implementation
 */
export class TransportFactory implements ITransportFactory {
  private static instance: TransportFactory | null = null;
  
  /**
   * Get singleton instance of transport factory
   */
  public static getInstance(): TransportFactory {
    if (!TransportFactory.instance) {
      TransportFactory.instance = new TransportFactory();
    }
    return TransportFactory.instance;
  }
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Create a transport instance of the specified type
   */
  public async createTransport(config: AnyTransportConfig): Promise<ITransport> {
    // Validate configuration first
    const validation = await this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid transport configuration: ${validation.errors.join(', ')}`);
    }
    
    switch (config.type) {
      case 'local':
        return new LocalTransport(config as LocalTransportConfig);
        
      case 'remote':
        return new RemoteTransport(config as RemoteTransportConfig);
        
      case 'http':
        return new HttpTransport(config as HttpTransportConfig);
        
      default:
        throw new Error(`Unsupported transport type: ${(config as any).type}`);
    }
  }
  
  /**
   * Get supported transport types
   */
  public getSupportedTypes(): TransportType[] {
    return ['local', 'remote', 'http'];
  }
  
  /**
   * Validate transport configuration
   */
  public async validateConfig(config: AnyTransportConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (!config) {
      errors.push('Configuration is required');
      return { valid: false, errors, warnings };
    }
    
    if (!config.type) {
      errors.push('Transport type is required');
    } else if (!this.getSupportedTypes().includes(config.type)) {
      errors.push(`Unsupported transport type: ${config.type}`);
    }
    
    if (typeof config.enabled !== 'boolean') {
      errors.push('enabled field must be a boolean');
    }
    
    // Type-specific validation
    switch (config.type) {
      case 'local':
        this.validateLocalConfig(config as LocalTransportConfig, errors, warnings);
        break;
        
      case 'remote':
        this.validateRemoteConfig(config as RemoteTransportConfig, errors, warnings);
        break;
        
      case 'http':
        this.validateHttpConfig(config as HttpTransportConfig, errors, warnings);
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate local transport configuration
   */
  private validateLocalConfig(
    config: LocalTransportConfig, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (config.socketPath) {
      // Validate socket path format
      if (process.platform === 'win32') {
        if (!config.socketPath.startsWith('\\\\.\\pipe\\')) {
          errors.push('Windows socket path must start with \\\\.\\pipe\\');
        }
      } else {
        if (!config.socketPath.startsWith('/')) {
          errors.push('Unix socket path must be absolute');
        }
      }
    }
    
    if (config.permissions !== undefined) {
      if (process.platform === 'win32') {
        warnings.push('Permissions are not supported on Windows named pipes');
      } else if (typeof config.permissions !== 'number') {
        errors.push('Permissions must be a number');
      }
    }
    
    if (config.timeout && config.timeout < 1000) {
      warnings.push('Timeout less than 1 second may cause connection issues');
    }
  }
  
  /**
   * Validate remote transport configuration
   */
  private validateRemoteConfig(
    config: RemoteTransportConfig, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (!config.host) {
      errors.push('Host is required for remote transport');
    }
    
    if (!config.port) {
      errors.push('Port is required for remote transport');
    } else if (config.port < 1 || config.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }
    
    if (config.enableTLS) {
      if (config.certPath && !config.keyPath) {
        errors.push('Key path is required when cert path is provided');
      }
      if (config.keyPath && !config.certPath) {
        errors.push('Cert path is required when key path is provided');
      }
    }
    
    if (config.apiKey) {
      if (config.apiKey.length < 32) {
        warnings.push('API key should be at least 32 characters for security');
      }
    } else {
      warnings.push('API key is recommended for remote transport security');
    }
  }
  
  /**
   * Validate HTTP transport configuration
   */
  private validateHttpConfig(
    config: HttpTransportConfig, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (!config.host) {
      errors.push('Host is required for HTTP transport');
    }
    
    if (!config.port) {
      errors.push('Port is required for HTTP transport');
    } else if (config.port < 1 || config.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }
    
    if (config.basePath && !config.basePath.startsWith('/')) {
      errors.push('Base path must start with /');
    }
    
    if (config.enableHTTPS && config.host === 'localhost') {
      warnings.push('HTTPS with localhost may require self-signed certificates');
    }
    
    if (!config.apiKey && config.host !== 'localhost' && config.host !== '127.0.0.1') {
      warnings.push('API key is recommended for non-localhost HTTP transport');
    }
  }
}

/**
 * Transport selection utilities
 */
export class TransportSelector {
  /**
   * Select the best transport from available options
   */
  public static selectBestTransport(
    transports: ITransport[],
    strategy: 'prefer-local' | 'prefer-remote' | 'round-robin' | 'manual' = 'prefer-local'
  ): ITransport | null {
    const availableTransports = transports.filter(t => t.status === 'connected');
    
    if (availableTransports.length === 0) {
      return null;
    }
    
    switch (strategy) {
      case 'prefer-local':
        return this.selectPreferLocal(availableTransports);
        
      case 'prefer-remote':
        return this.selectPreferRemote(availableTransports);
        
      case 'round-robin':
        return this.selectRoundRobin(availableTransports);
        
      case 'manual':
        return availableTransports[0] || null;
        
      default:
        return availableTransports[0] || null;
    }
  }
  
  /**
   * Select transport preferring local first
   */
  private static selectPreferLocal(transports: ITransport[]): ITransport {
    if (transports.length === 0) {
      throw new Error('No transports available');
    }
    
    const local = transports.find(t => t.type === 'local');
    if (local) return local;
    
    const remote = transports.find(t => t.type === 'remote');
    if (remote) return remote;
    
    return transports[0]!; // Non-null assertion since we checked length above
  }
  
  /**
   * Select transport preferring remote first
   */
  private static selectPreferRemote(transports: ITransport[]): ITransport {
    if (transports.length === 0) {
      throw new Error('No transports available');
    }
    
    const remote = transports.find(t => t.type === 'remote');
    if (remote) return remote;
    
    const local = transports.find(t => t.type === 'local');
    if (local) return local;
    
    return transports[0]!; // Non-null assertion since we checked length above
  }
  
  /**
   * Select transport using round-robin strategy
   */
  private static selectRoundRobin(transports: ITransport[]): ITransport {
    if (transports.length === 0) {
      throw new Error('No transports available');
    }
    
    // Simple round-robin implementation
    // In a real implementation, this would maintain state
    const index = Math.floor(Math.random() * transports.length);
    return transports[index]!; // Non-null assertion since we checked length above
  }
  
  /**
   * Test transport connectivity
   */
  public static async testTransportConnectivity(transport: ITransport): Promise<boolean> {
    try {
      const healthCheck = await transport.healthCheck();
      return healthCheck.status === 'connected';
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get transport performance metrics
   */
  public static getTransportMetrics(transport: ITransport): TransportMetrics {
    const stats = transport.getStats();
    return {
      type: transport.type,
      latency: stats.averageLatency,
      successRate: stats.requestsTotal > 0 ? 
        (stats.requestsSuccess / stats.requestsTotal) * 100 : 0,
      throughput: stats.requestsTotal / (stats.uptime || 1),
      connections: stats.connectionsActive
    };
  }
}

/**
 * Transport performance metrics
 */
export interface TransportMetrics {
  type: TransportType;
  latency: number;
  successRate: number;
  throughput: number;
  connections: number;
}

/**
 * Transport configuration builder
 */
export class TransportConfigBuilder {
  /**
   * Build local transport configuration
   */
  public static buildLocalConfig(overrides?: Partial<LocalTransportConfig>): LocalTransportConfig {
    const defaultSocketPath = process.platform === 'win32' 
      ? '\\\\.\\pipe\\folder-mcp'
      : '/tmp/folder-mcp.sock';
      
    const baseConfig = {
      type: 'local' as const,
      enabled: true,
      socketPath: defaultSocketPath,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };
    
    // Handle permissions separately for Windows compatibility
    const fullConfig = process.platform === 'win32' 
      ? baseConfig 
      : { ...baseConfig, permissions: 0o600 };
      
    return { ...fullConfig, ...overrides };
  }
  
  /**
   * Build remote transport configuration
   */
  public static buildRemoteConfig(overrides?: Partial<RemoteTransportConfig>): RemoteTransportConfig {
    return {
      type: 'remote',
      enabled: false,
      host: 'localhost',
      port: 50051,
      enableTLS: false,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...overrides
    };
  }
  
  /**
   * Build HTTP transport configuration
   */
  public static buildHttpConfig(overrides?: Partial<HttpTransportConfig>): HttpTransportConfig {
    return {
      type: 'http',
      enabled: true,
      host: 'localhost',
      port: 8080,
      basePath: '/v1',
      enableHTTPS: false,
      corsEnabled: true,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...overrides
    };
  }
}
