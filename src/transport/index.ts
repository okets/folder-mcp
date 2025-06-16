/**
 * Transport Layer Module
 * 
 * Provides high-level transport layer abstraction supporting multiple protocols:
 * - Local transport (Unix Domain Socket / Named Pipes)
 * - Remote transport (TCP gRPC with authentication) 
 * - HTTP transport (REST Gateway with JSON translation)
 */

// Core interfaces and types
export type { 
  ITransport,
  ITransportFactory,
  ITransportManager,
  ITransportService,
  ITransportAuth,
  ITransportMiddleware,
  ITransportEventListener,
  ITransportConnectionPool,
  ITransportDiscovery,
  ValidationResult,
  TransportManagerConfig,
  TransportManagerStats,
  AuthCredentials,
  AuthResult,
  ConnectionPoolStats,
  TransportDiscoveryResult
} from './interfaces.js';

export type {
  TransportType,
  TransportStatus,
  TransportConfig,
  LocalTransportConfig,
  RemoteTransportConfig,
  HttpTransportConfig,
  AnyTransportConfig,
  TransportSelectionStrategy,
  TransportSelectionConfig,
  TransportLayerConfig,
  TransportCapabilities,
  TransportConnectionMetadata,
  TransportHealthCheck,
  TransportStats,
  TransportError,
  TransportErrorType,
  TransportEvent,
  TransportEventData,
  ServiceEndpoint
} from './types.js';

// Transport implementations
export { LocalTransport } from './local.js';
export { RemoteTransport } from './remote.js';
export { HttpTransport } from './http.js';

// Factory and utilities
export { 
  TransportFactory, 
  TransportSelector, 
  TransportConfigBuilder,
  type TransportMetrics 
} from './factory.js';

// Default configurations
export { 
  DEFAULT_TRANSPORT_CONFIGS, 
  DEFAULT_TRANSPORT_SELECTION 
} from './types.js';

/**
 * Transport Manager Implementation
 * 
 * High-level manager that coordinates multiple transport instances
 * and handles transport selection based on configuration strategy.
 */
import { EventEmitter } from 'events';
import { 
  ITransportManager, 
  ITransport, 
  TransportManagerConfig, 
  TransportManagerStats 
} from './interfaces.js';
import { 
  TransportHealthCheck, 
  TransportType, 
  AnyTransportConfig 
} from './types.js';
import { TransportFactory, TransportSelector } from './factory.js';

export class TransportManager extends EventEmitter implements ITransportManager {
  private transports: Map<TransportType, ITransport> = new Map();
  private activeTransport: ITransport | null = null;
  private config: TransportManagerConfig | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  /**
   * Initialize the transport manager with configuration
   */
  public async initialize(config: TransportManagerConfig): Promise<void> {
    this.config = config;
    
    const factory = TransportFactory.getInstance();
    
    // Create transport instances
    for (const transportConfig of config.transports) {
      if (transportConfig.enabled) {
        try {
          const transport = await factory.createTransport(transportConfig);
          this.transports.set(transport.type, transport);
          
          // Forward transport events
          transport.on('connected', (event) => this.emit('transport-connected', event));
          transport.on('disconnected', (event) => this.emit('transport-disconnected', event));
          transport.on('error', (error) => this.emit('transport-error', error));
          
        } catch (error) {
          process.stderr.write(`[ERROR] Failed to create ${transportConfig.type} transport: ${error}\n`);
        }
      }
    }
    
    // Start health check interval if configured
    if (config.selection.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(
        () => this.performHealthChecks(),
        config.selection.healthCheckInterval
      );
    }
  }
  
  /**
   * Start all enabled transports
   */
  public async start(): Promise<void> {
    const startPromises = Array.from(this.transports.values()).map(async (transport) => {
      try {
        await transport.start();
      } catch (error) {
        process.stderr.write(`[ERROR] Failed to start ${transport.type} transport: ${error}\n`);
      }
    });
    
    await Promise.all(startPromises);
    
    // Select initial active transport
    this.activeTransport = await this.selectTransport();
  }
  
  /**
   * Stop all transports gracefully
   */
  public async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    const stopPromises = Array.from(this.transports.values()).map(async (transport) => {
      try {
        await transport.stop();
      } catch (error) {
        process.stderr.write(`[ERROR] Failed to stop ${transport.type} transport: ${error}\n`);
      }
    });
    
    await Promise.all(stopPromises);
    
    this.activeTransport = null;
    this.transports.clear();
  }
  
  /**
   * Get the currently active transport
   */
  public getActiveTransport(): ITransport | null {
    return this.activeTransport;
  }
  
  /**
   * Get all available transports
   */
  public getTransports(): ITransport[] {
    return Array.from(this.transports.values());
  }
  
  /**
   * Select the best available transport based on configuration
   */
  public async selectTransport(): Promise<ITransport> {
    if (!this.config) {
      throw new Error('Transport manager not initialized');
    }
    
    const availableTransports = Array.from(this.transports.values());
    const selectedTransport = TransportSelector.selectBestTransport(
      availableTransports,
      this.config.selection.strategy
    );
    
    if (!selectedTransport) {
      throw new Error('No available transports');
    }
    
    this.activeTransport = selectedTransport;
    return selectedTransport;
  }
  
  /**
   * Send a request using the best available transport
   */
  public async request<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): Promise<TResponse> {
    const transport = this.activeTransport || await this.selectTransport();
    return transport.request<TRequest, TResponse>(method, request, metadata);
  }
  
  /**
   * Send a streaming request using the best available transport
   */
  public async* streamRequest<TRequest, TResponse>(
    method: string,
    request: TRequest,
    metadata?: Record<string, string>
  ): AsyncIterable<TResponse> {
    const transport = this.activeTransport || await this.selectTransport();
    yield* transport.streamRequest<TRequest, TResponse>(method, request, metadata);
  }
  
  /**
   * Perform health checks on all transports
   */
  public async healthCheckAll(): Promise<TransportHealthCheck[]> {
    const healthChecks = Array.from(this.transports.values()).map(transport => 
      transport.healthCheck()
    );
    
    return Promise.all(healthChecks);
  }
  
  /**
   * Get aggregated statistics from all transports
   */
  public getAggregatedStats(): TransportManagerStats {
    const transportStats = {} as Record<TransportType, any>;
    let totalRequests = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    let activeTransports = 0;
    
    for (const transport of this.transports.values()) {
      const stats = transport.getStats();
      transportStats[transport.type] = stats;
      
      totalRequests += stats.requestsTotal;
      totalErrors += stats.requestsError;
      totalLatency += stats.averageLatency;
      
      if (transport.status === 'connected') {
        activeTransports++;
      }
    }
    
    return {
      activeTransports,
      totalTransports: this.transports.size,
      totalRequests,
      totalErrors,
      averageLatency: this.transports.size > 0 ? totalLatency / this.transports.size : 0,
      uptime: 0, // TODO: Track manager uptime
      transportStats
    };
  }
  
  /**
   * Perform periodic health checks
   */
  private async performHealthChecks(): Promise<void> {
    try {
      await this.healthCheckAll();
      
      // Re-select transport if current one is unhealthy
      if (this.activeTransport && this.activeTransport.status !== 'connected') {
        try {
          await this.selectTransport();
        } catch (error) {
          console.warn('Failed to select new transport during health check:', error);
        }
      }
    } catch (error) {
      process.stderr.write(`[ERROR] Health check failed: ${error}\n`);
    }
  }
}

// Type-safe transport interfaces
export type {
  ITypedFolderMCPService,
  ITypedTransport,
  ServiceMethodName,
  RequestTypeMap,
  ResponseTypeMap,
  TransportStats as TypedTransportStats
} from './typed-service.js';

export type {
  ITypedTransportManager,
  IEnhancedTransportService
} from './interfaces.js';

// Concrete implementations
export { 
  TypedFolderMCPService,
  TypedTransport,
  ProtoRequestValidator,
  TransportMetadataBuilder,
  createTypedFolderMCPService,
  createTypedTransport
} from './typed-transport.js';

export { 
  SERVICE_METHODS,
  isStreamingMethod
} from './typed-service.js';
