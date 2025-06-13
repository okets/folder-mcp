/**
 * Main gRPC Server Implementation
 * 
 * Implements the core gRPC server with multi-protocol transport support,
 * service registration, and middleware integration.
 */

import * as grpc from '@grpc/grpc-js';
import { IDependencyContainer, ILoggingService, SERVICE_TOKENS } from '../di/interfaces.js';
import { getFolderMCPService } from './utils/proto-loader.js';
import { createServiceImplementations } from './services/index.js';
import { createInterceptors } from './interceptors/index.js';
import { ApiKeyManager, AuthInterceptor, createAuthInterceptor } from './auth/index.js';

// Transport configuration interfaces
export interface UnixSocketConfig {
  enabled: boolean;
  path: string;
  permissions?: number;
}

export interface TcpConfig {
  enabled: boolean;
  port: number;
  host: string;
  enableTls?: boolean;
  certPath?: string;
  keyPath?: string;
  caCertPath?: string;
}

export interface GrpcServerConfig {
  unix: UnixSocketConfig;
  tcp: TcpConfig;
  maxReceiveMessageLength?: number;
  maxSendMessageLength?: number;
  enableHealthCheck?: boolean;
  folder: string; // The folder being served (needed for API key management)
  requireAuthForRemote?: boolean; // Whether to require authentication for remote connections
}

/**
 * Main gRPC Server class
 */
export class GrpcServer {
  private server: grpc.Server;
  private serviceDefinition: grpc.ServiceDefinition | null = null;
  private serviceImplementations: any = null;
  private isStarted: boolean = false;
  private logger: ILoggingService;
  private apiKeyManager: ApiKeyManager;
  private authInterceptor: AuthInterceptor | null = null;

  constructor(
    private config: GrpcServerConfig,
    private container: IDependencyContainer
  ) {
    this.logger = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);
    this.apiKeyManager = new ApiKeyManager(this.logger);
    this.server = new grpc.Server({
      'grpc.max_receive_message_length': config.maxReceiveMessageLength || 4 * 1024 * 1024, // 4MB
      'grpc.max_send_message_length': config.maxSendMessageLength || 4 * 1024 * 1024, // 4MB
    });
  }

  /**
   * Initialize the server with service definitions and interceptors
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing gRPC server...');

      // Initialize API key manager
      await this.apiKeyManager.initialize();
      this.logger.debug('API key manager initialized');

      // Create authentication interceptor if remote auth is required
      if (this.config.requireAuthForRemote) {
        this.authInterceptor = createAuthInterceptor(
          this.apiKeyManager,
          this.logger,
          this.config.folder,
          { requireAuth: true }
        );
        this.logger.debug('Authentication interceptor created');
      }

      // Load service definition from proto
      this.serviceDefinition = await getFolderMCPService();
      this.logger.debug('Loaded gRPC service definition');

      // Create service implementations with auth context
      this.serviceImplementations = createServiceImplementations(
        this.container, 
        this.authInterceptor || undefined
      );
      this.logger.debug('Created service implementations');

      // Register services with the server
      this.server.addService(this.serviceDefinition, this.serviceImplementations);
      this.logger.debug('Registered gRPC services');

      // Note: Interceptors in @grpc/grpc-js are handled differently
      // They will be implemented as part of the service method implementations
      const interceptors = createInterceptors(this.container);
      this.logger.debug('Interceptors created (will be applied at method level)');

      // Add health check service if enabled
      if (this.config.enableHealthCheck) {
        await this.addHealthCheckService();
      }

      this.logger.info('gRPC server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize gRPC server', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Start the gRPC server with configured transports
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('gRPC server is already started');
      return;
    }

    try {
      this.logger.info('Starting gRPC server...');

      // Initialize if not already done
      if (!this.serviceDefinition) {
        await this.initialize();
      }

      const bindPromises: Promise<void>[] = [];

      // Start Unix Domain Socket transport
      if (this.config.unix.enabled) {
        bindPromises.push(this.startUnixSocket());
      }

      // Start TCP transport
      if (this.config.tcp.enabled) {
        bindPromises.push(this.startTcpServer());
      }

      // Wait for all transports to start
      await Promise.all(bindPromises);

      this.isStarted = true;
      this.logger.info('gRPC server started successfully');
    } catch (error) {
      this.logger.error('Failed to start gRPC server', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop the gRPC server gracefully
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      this.logger.warn('gRPC server is not running');
      return;
    }

    try {
      this.logger.info('Stopping gRPC server...');

      // Attempt graceful shutdown first
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Graceful shutdown timeout'));
        }, 10000); // 10 second timeout

        this.server.tryShutdown((error) => {
          clearTimeout(timeout);
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.isStarted = false;
      this.logger.info('gRPC server stopped gracefully');
    } catch (error) {
      this.logger.warn('Graceful shutdown failed, forcing shutdown', error instanceof Error ? error : new Error(String(error)));
      
      // Force shutdown if graceful shutdown fails
      this.server.forceShutdown();
      this.isStarted = false;
      this.logger.info('gRPC server forced shutdown');
    }
  }

  /**
   * Get server status
   */
  getStatus(): { isStarted: boolean; transports: string[] } {
    const transports: string[] = [];
    
    if (this.config.unix.enabled) {
      transports.push(`unix:${this.config.unix.path}`);
    }
    
    if (this.config.tcp.enabled) {
      const protocol = this.config.tcp.enableTls ? 'https' : 'http';
      transports.push(`${protocol}://${this.config.tcp.host}:${this.config.tcp.port}`);
    }

    return {
      isStarted: this.isStarted,
      transports
    };
  }

  /**
   * Start Unix Domain Socket transport
   */
  private async startUnixSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socketPath = this.config.unix.path;
      
      this.logger.info(`Starting Unix Domain Socket transport on ${socketPath}`);
      
      this.server.bindAsync(
        `unix:${socketPath}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            this.logger.error('Failed to bind Unix Domain Socket', error);
            reject(error);
          } else {
            this.logger.info(`Unix Domain Socket bound successfully to ${socketPath}`);
            
            // Set file permissions if specified
            if (this.config.unix.permissions) {
              try {
                const fs = require('fs');
                fs.chmodSync(socketPath, this.config.unix.permissions);
                this.logger.debug(`Set Unix socket permissions to ${this.config.unix.permissions.toString(8)}`);
              } catch (chmodError) {
                this.logger.warn('Failed to set Unix socket permissions', chmodError instanceof Error ? chmodError : new Error(String(chmodError)));
              }
            }
            
            resolve();
          }
        }
      );
    });
  }

  /**
   * Start TCP transport
   */
  private async startTcpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { host, port, enableTls } = this.config.tcp;
      const address = `${host}:${port}`;
      
      this.logger.info(`Starting TCP transport on ${address} (TLS: ${enableTls ? 'enabled' : 'disabled'})`);
      
      let credentials: grpc.ServerCredentials;
      
      if (enableTls) {
        credentials = this.createTlsCredentials();
      } else {
        credentials = grpc.ServerCredentials.createInsecure();
      }
      
      this.server.bindAsync(address, credentials, (error, boundPort) => {
        if (error) {
          this.logger.error(`Failed to bind TCP server to ${address}`, error);
          reject(error);
        } else {
          this.logger.info(`TCP server bound successfully to ${host}:${boundPort}`);
          resolve();
        }
      });
    });
  }

  /**
   * Create TLS credentials for secure connections
   */
  private createTlsCredentials(): grpc.ServerCredentials {
    try {
      const fs = require('fs');
      const { certPath, keyPath, caCertPath } = this.config.tcp;
      
      if (!certPath || !keyPath) {
        throw new Error('TLS is enabled but cert/key paths are not provided');
      }
      
      const cert = fs.readFileSync(certPath);
      const key = fs.readFileSync(keyPath);
      
      let credentials: grpc.ServerCredentials;
      
      if (caCertPath) {
        // mTLS with client certificate validation
        const rootCert = fs.readFileSync(caCertPath);
        credentials = grpc.ServerCredentials.createSsl(rootCert, [{ cert_chain: cert, private_key: key }], true);
        this.logger.info('Created mTLS credentials with client certificate validation');
      } else {
        // Standard TLS
        credentials = grpc.ServerCredentials.createSsl(null, [{ cert_chain: cert, private_key: key }]);
        this.logger.info('Created TLS credentials');
      }
      
      return credentials;
    } catch (error) {
      this.logger.error('Failed to create TLS credentials', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Add health check service (placeholder for now)
   */
  private async addHealthCheckService(): Promise<void> {
    // TODO: Implement gRPC health check protocol
    this.logger.debug('Health check service setup - to be implemented');
  }

  /**
   * API Key Management Methods
   */

  /**
   * Get or generate API key for the served folder
   */
  async getOrGenerateApiKey(description?: string): Promise<string> {
    const existingKey = await this.apiKeyManager.getKey(this.config.folder);
    if (existingKey) {
      return existingKey;
    }
    
    this.logger.info('Generating new API key for folder', { folder: this.config.folder });
    return await this.apiKeyManager.generateKey(this.config.folder, description);
  }

  /**
   * Rotate API key for the served folder
   */
  async rotateApiKey(description?: string): Promise<string> {
    this.logger.info('Rotating API key for folder', { folder: this.config.folder });
    return await this.apiKeyManager.rotateKey(this.config.folder, description);
  }

  /**
   * Revoke API key for the served folder
   */
  async revokeApiKey(): Promise<boolean> {
    this.logger.info('Revoking API key for folder', { folder: this.config.folder });
    return await this.apiKeyManager.revokeKey(this.config.folder);
  }

  /**
   * Check if folder has an active API key
   */
  async hasApiKey(): Promise<boolean> {
    return await this.apiKeyManager.hasKey(this.config.folder);
  }
}
