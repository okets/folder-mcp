/**
 * gRPC Health Check Service Implementation
 * 
 * Implements the standard gRPC health checking protocol as defined in:
 * https://github.com/grpc/grpc/blob/master/doc/health-checking.md
 */

import * as grpc from '@grpc/grpc-js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  ICacheService,
  IEmbeddingService,
  SERVICE_TOKENS 
} from '../../di/interfaces.js';

/**
 * Health check status enum matching gRPC health checking protocol
 */
export enum ServingStatus {
  UNKNOWN = 0,
  SERVING = 1,
  NOT_SERVING = 2,
  SERVICE_UNKNOWN = 3
}

/**
 * Health check request interface
 */
export interface HealthCheckRequest {
  service?: string;
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: ServingStatus;
}

/**
 * Health service implementation
 */
export class HealthService {
  private logger: ILoggingService;
  private fileSystemService: IFileSystemService;
  private cacheService: ICacheService;
  private embeddingService: IEmbeddingService;
  private serviceStatuses: Map<string, ServingStatus> = new Map();

  constructor(container: IDependencyContainer) {
    this.logger = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);
    this.fileSystemService = container.resolve<IFileSystemService>(SERVICE_TOKENS.FILE_SYSTEM);
    this.cacheService = container.resolve<ICacheService>(SERVICE_TOKENS.CACHE);
    this.embeddingService = container.resolve<IEmbeddingService>(SERVICE_TOKENS.EMBEDDING);

    // Initialize service statuses
    this.initializeServiceStatuses();
  }

  /**
   * Check health of a specific service or overall system
   */
  async check(
    call: grpc.ServerUnaryCall<HealthCheckRequest, HealthCheckResponse>,
    callback: grpc.sendUnaryData<HealthCheckResponse>
  ): Promise<void> {
    try {
      const request = call.request;
      const service = request.service || '';
      
      this.logger.debug('Health check request', { service });

      let status: ServingStatus;

      if (service === '') {
        // Check overall system health
        status = await this.checkOverallHealth();
      } else {
        // Check specific service health
        status = await this.checkServiceHealth(service);
      }

      const response: HealthCheckResponse = { status };
      
      this.logger.debug('Health check response', { service, status });
      callback(null, response);

    } catch (error) {
      this.logger.error('Health check error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = {
        code: grpc.status.INTERNAL,
        message: 'Health check failed'
      } as grpc.ServiceError;
      callback(grpcError);
    }
  }

  /**
   * Watch service health (streaming response)
   */
  async watch(
    call: grpc.ServerWritableStream<HealthCheckRequest, HealthCheckResponse>
  ): Promise<void> {
    try {
      const request = call.request;
      const service = request.service || '';
      
      this.logger.info('Health watch started', { service });

      // Send initial status
      let currentStatus = service === '' 
        ? await this.checkOverallHealth()
        : await this.checkServiceHealth(service);
      
      call.write({ status: currentStatus });

      // Set up periodic health checks
      const interval = setInterval(async () => {
        try {
          const newStatus = service === '' 
            ? await this.checkOverallHealth()
            : await this.checkServiceHealth(service);
          
          // Only send update if status changed
          if (newStatus !== currentStatus) {
            currentStatus = newStatus;
            call.write({ status: currentStatus });
            this.logger.debug('Health status changed', { service, status: currentStatus });
          }
        } catch (error) {
          this.logger.error('Health watch check failed', error instanceof Error ? error : new Error(String(error)));
        }
      }, 5000); // Check every 5 seconds

      // Clean up on connection close
      call.on('cancelled', () => {
        clearInterval(interval);
        this.logger.debug('Health watch cancelled', { service });
      });

      call.on('error', (error) => {
        clearInterval(interval);
        this.logger.error('Health watch error', error);
      });

    } catch (error) {
      this.logger.error('Health watch setup error', error instanceof Error ? error : new Error(String(error)));
      call.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Set the status of a specific service
   */
  setServiceStatus(service: string, status: ServingStatus): void {
    this.serviceStatuses.set(service, status);
    this.logger.debug('Service status updated', { service, status });
  }

  /**
   * Get the status of a specific service
   */
  getServiceStatus(service: string): ServingStatus {
    return this.serviceStatuses.get(service) || ServingStatus.SERVICE_UNKNOWN;
  }

  /**
   * Initialize default service statuses
   */
  private initializeServiceStatuses(): void {
    // Initialize all known services as SERVING
    const services = [
      'folder_mcp.FolderMCPService',
      'folder_mcp.SearchService',
      'folder_mcp.NavigationService', 
      'folder_mcp.DocumentService',
      'folder_mcp.SummaryService',
      'folder_mcp.SpecializedService'
    ];

    for (const service of services) {
      this.serviceStatuses.set(service, ServingStatus.SERVING);
    }
  }

  /**
   * Check overall system health
   */
  private async checkOverallHealth(): Promise<ServingStatus> {
    try {
      // Check critical dependencies
      const checks = [
        this.checkFileSystemHealth(),
        this.checkCacheHealth(),
        this.checkEmbeddingHealth()
      ];

      const results = await Promise.allSettled(checks);
      
      // If any critical check fails, system is not serving
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.warn('Health check failed', { error: result.reason });
          return ServingStatus.NOT_SERVING;
        }
        if (result.value === ServingStatus.NOT_SERVING) {
          return ServingStatus.NOT_SERVING;
        }
      }

      return ServingStatus.SERVING;

    } catch (error) {
      this.logger.error('Overall health check failed', error instanceof Error ? error : new Error(String(error)));
      return ServingStatus.NOT_SERVING;
    }
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(service: string): Promise<ServingStatus> {
    try {
      // Check if service is in our registry
      if (!this.serviceStatuses.has(service)) {
        return ServingStatus.SERVICE_UNKNOWN;
      }

      // Get current status
      const currentStatus = this.serviceStatuses.get(service);
      
      // For now, return the stored status
      // In a more advanced implementation, you could run service-specific health checks
      return currentStatus || ServingStatus.UNKNOWN;

    } catch (error) {
      this.logger.error(`Health check failed for service: ${service}`, error instanceof Error ? error : new Error(String(error)));
      return ServingStatus.NOT_SERVING;
    }
  }

  /**
   * Check file system service health
   */
  private async checkFileSystemHealth(): Promise<ServingStatus> {
    try {
      // Simple check - verify we can check if a path exists
      this.fileSystemService.exists('.');
      return ServingStatus.SERVING;
    } catch (error) {
      this.logger.warn('File system health check failed', error instanceof Error ? error : new Error(String(error)));
      return ServingStatus.NOT_SERVING;
    }
  }

  /**
   * Check cache service health
   */
  private async checkCacheHealth(): Promise<ServingStatus> {
    try {
      // Try to setup cache directory
      await this.cacheService.setupCacheDirectory();
      return ServingStatus.SERVING;
    } catch (error) {
      this.logger.warn('Cache service health check failed', error instanceof Error ? error : new Error(String(error)));
      return ServingStatus.NOT_SERVING;
    }
  }

  /**
   * Check embedding service health
   */
  private async checkEmbeddingHealth(): Promise<ServingStatus> {
    try {
      // Check if embedding service is initialized
      if (this.embeddingService.isInitialized()) {
        return ServingStatus.SERVING;
      } else {
        return ServingStatus.NOT_SERVING;
      }
    } catch (error) {
      this.logger.warn('Embedding service health check failed', error instanceof Error ? error : new Error(String(error)));
      return ServingStatus.NOT_SERVING;
    }
  }
}

/**
 * Create gRPC service definition for health checking
 */
export function createHealthServiceDefinition() {
  return {
    Check: {
      path: '/grpc.health.v1.Health/Check',
      requestStream: false,
      responseStream: false,
      requestSerialize: (request: HealthCheckRequest) => Buffer.from(JSON.stringify(request)),
      requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as HealthCheckRequest,
      responseSerialize: (response: HealthCheckResponse) => Buffer.from(JSON.stringify(response)),
      responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as HealthCheckResponse
    },
    Watch: {
      path: '/grpc.health.v1.Health/Watch',
      requestStream: false,
      responseStream: true,
      requestSerialize: (request: HealthCheckRequest) => Buffer.from(JSON.stringify(request)),
      requestDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as HealthCheckRequest,
      responseSerialize: (response: HealthCheckResponse) => Buffer.from(JSON.stringify(response)),
      responseDeserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as HealthCheckResponse
    }
  };
}
