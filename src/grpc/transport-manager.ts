/**
 * Transport Manager Implementation
 * 
 * Manages multiple gRPC transport protocols (Unix Socket and TCP)
 * with health monitoring and graceful shutdown.
 */

import { GrpcServer, GrpcServerConfig } from './server.js';
import { IDependencyContainer, ILoggingService, SERVICE_TOKENS } from '../di/interfaces.js';

export interface TransportStatus {
  unix: {
    enabled: boolean;
    path?: string;
    active: boolean;
  } | null;
  tcp: {
    enabled: boolean;
    host?: string;
    port?: number;
    tls: boolean;
    active: boolean;
  } | null;
  health: {
    healthy: boolean;
    uptime: number;
    activeConnections: number;
  };
}

/**
 * Transport Manager class
 */
export class TransportManager {
  private grpcServer: GrpcServer;
  private logger: ILoggingService;
  private startTime: number = 0;
  private activeConnections: number = 0;

  constructor(
    private config: GrpcServerConfig,
    private container: IDependencyContainer
  ) {
    this.logger = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);
    this.grpcServer = new GrpcServer(config, container);
  }

  /**
   * Start all configured transports
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting transport manager...');
      this.startTime = Date.now();

      // Initialize and start the gRPC server
      await this.grpcServer.initialize();
      await this.grpcServer.start();

      // Setup graceful shutdown handlers
      this.setupGracefulShutdown();

      this.logger.info('Transport manager started successfully');
    } catch (error) {
      this.logger.error('Failed to start transport manager', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop all transports gracefully
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping transport manager...');
      
      await this.grpcServer.stop();
      
      this.logger.info('Transport manager stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping transport manager', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get current transport status
   */
  getStatus(): TransportStatus {
    const serverStatus = this.grpcServer.getStatus();
    const uptime = this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0;

    return {
      unix: this.config.unix.enabled ? {
        enabled: true,
        path: this.config.unix.path,
        active: serverStatus.isStarted
      } : null,
      tcp: this.config.tcp.enabled ? {
        enabled: true,
        host: this.config.tcp.host,
        port: this.config.tcp.port,
        tls: this.config.tcp.enableTls || false,
        active: serverStatus.isStarted
      } : null,
      health: {
        healthy: serverStatus.isStarted,
        uptime,
        activeConnections: this.activeConnections
      }
    };
  }

  /**
   * Check if transports are healthy
   */
  isHealthy(): boolean {
    const status = this.getStatus();
    return status.health.healthy;
  }

  /**
   * Get the gRPC server instance
   */
  getServer(): GrpcServer {
    return this.grpcServer;
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', new Error(`Unhandled promise rejection: ${reason}`));
      shutdown('unhandledRejection');
    });
  }
}
