/**
 * Search Service Implementation
 * 
 * Implements SearchDocs and SearchChunks gRPC service methods
 */

import * as grpc from '@grpc/grpc-js';
import { folder_mcp } from '../../generated/folder-mcp.js';
import { IDependencyContainer, ILoggingService, SERVICE_TOKENS } from '../../di/interfaces.js';
import { mapDomainErrorToGrpcStatus, createMissingFieldError, createOutOfRangeError } from '../utils/error-mapper.js';
import { createGrpcError } from '../utils/proto-loader.js';
import { AuthInterceptor } from '../auth/index.js';

/**
 * Search service implementation
 */
export class SearchService {
  private logger: ILoggingService;

  constructor(
    container: IDependencyContainer,
    private authInterceptor?: AuthInterceptor
  ) {
    this.logger = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);
  }

  /**
   * Search for documents using semantic search
   */
  async searchDocs(
    call: grpc.ServerUnaryCall<folder_mcp.ISearchDocsRequest, folder_mcp.ISearchDocsResponse>,
    callback: grpc.sendUnaryData<folder_mcp.ISearchDocsResponse>
  ): Promise<void> {
    try {
      // Check authentication if required
      const authError = await this.checkAuthentication(call);
      if (authError) {
        callback(authError);
        return;
      }

      const request = call.request;
      const startTime = Date.now();
      
      this.logger.info('SearchDocs request received', {
        query: request.query,
        topK: request.topK
      });

      // Validate request
      const validationError = this.validateSearchDocsRequest(request);
      if (validationError) {
        callback(validationError);
        return;
      }

      const executionTime = Date.now() - startTime;
      
      // Build mock response - will be replaced with real search implementation
      const response: folder_mcp.ISearchDocsResponse = {
        documents: [], // Empty for now
        totalFound: 0,
        maxScore: null,
        queryId: this.generateQueryId(),
        status: {
          success: true,
          requestId: this.generateQueryId(),
          processingTimeMs: executionTime,
          errors: [],
          warnings: []
        },
        pagination: {
          page: 1,
          perPage: request.topK || 10,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };

      this.logger.info('SearchDocs completed', {
        documentsFound: 0,
        executionTimeMs: executionTime
      });

      callback(null, response);
    } catch (error) {
      this.logger.error('SearchDocs error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = mapDomainErrorToGrpcStatus(error instanceof Error ? error : new Error(String(error)));
      callback(grpcError);
    }
  }

  /**
   * Search for chunks using semantic search
   */
  async searchChunks(
    call: grpc.ServerUnaryCall<folder_mcp.ISearchChunksRequest, folder_mcp.ISearchChunksResponse>,
    callback: grpc.sendUnaryData<folder_mcp.ISearchChunksResponse>
  ): Promise<void> {
    try {
      // Check authentication if required
      const authError = await this.checkAuthentication(call);
      if (authError) {
        callback(authError);
        return;
      }

      const request = call.request;
      const startTime = Date.now();
      
      this.logger.info('SearchChunks request received', {
        query: request.query,
        topK: request.topK
      });

      // Validate request
      const validationError = this.validateSearchChunksRequest(request);
      if (validationError) {
        callback(validationError);
        return;
      }

      const executionTime = Date.now() - startTime;
      
      // Build mock response - will be replaced with real search implementation
      const response: folder_mcp.ISearchChunksResponse = {
        chunks: [], // Empty for now
        totalFound: 0,
        maxScore: null,
        queryId: this.generateQueryId(),
        status: {
          success: true,
          requestId: this.generateQueryId(),
          processingTimeMs: executionTime,
          errors: [],
          warnings: []
        },
        pagination: {
          page: 1,
          perPage: request.topK || 10,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };

      this.logger.info('SearchChunks completed', {
        chunksFound: 0,
        executionTimeMs: executionTime
      });

      callback(null, response);
    } catch (error) {
      this.logger.error('SearchChunks error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = mapDomainErrorToGrpcStatus(error instanceof Error ? error : new Error(String(error)));
      callback(grpcError);
    }
  }

  /**
   * Validate SearchDocs request
   */
  private validateSearchDocsRequest(request: folder_mcp.ISearchDocsRequest): grpc.ServiceError | null {
    if (!request.query || request.query.trim().length === 0) {
      return createMissingFieldError('query');
    }

    if (request.topK !== undefined && request.topK !== null && (request.topK < 1 || request.topK > 100)) {
      return createOutOfRangeError('topK', request.topK, 1, 100);
    }

    return null;
  }

  /**
   * Validate SearchChunks request
   */
  private validateSearchChunksRequest(request: folder_mcp.ISearchChunksRequest): grpc.ServiceError | null {
    if (!request.query || request.query.trim().length === 0) {
      return createMissingFieldError('query');
    }

    if (request.topK !== undefined && request.topK !== null && (request.topK < 1 || request.topK > 100)) {
      return createOutOfRangeError('topK', request.topK, 1, 100);
    }

    return null;
  }

  /**
   * Generate a unique query ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check authentication for the request
   */
  private async checkAuthentication(call: any): Promise<grpc.ServiceError | null> {
    if (!this.authInterceptor) {
      // No authentication required
      return null;
    }

    const remoteAddress = this.getRemoteAddress(call);
    const isLocalConnection = this.isLocalConnection(call, remoteAddress);

    // Always allow local connections (Unix socket or localhost)
    // For demo purposes, only require auth for explicit remote addresses (not localhost)
    if (isLocalConnection || remoteAddress === '127.0.0.1') {
      this.logger.debug('Allowing local/localhost connection', { remoteAddress });
      return null;
    }

    // Extract and validate API key for remote connections
    const apiKey = this.extractApiKey(call);
    if (!apiKey) {
      this.logger.warn('Missing API key for remote connection', { remoteAddress });
      return createGrpcError(grpc.status.UNAUTHENTICATED, 'Authentication required');
    }

    // For now, we'll implement a simple API key check
    // In a full implementation, this would use the ApiKeyManager
    const validKey = 'yWF2jTw6fAlPDIqzM6PMsFNIOapMPo7t7eNR0kG4NGw='; // Hardcoded for demo
    if (apiKey !== validKey) {
      this.logger.warn('Invalid API key for remote connection', { 
        remoteAddress,
        keyPreview: apiKey.substring(0, 8) + '...'
      });
      return createGrpcError(grpc.status.UNAUTHENTICATED, 'Invalid API key');
    }

    this.logger.info('Authenticated remote connection', { remoteAddress });
    return null;
  }

  /**
   * Extract API key from gRPC call metadata
   */
  private extractApiKey(call: any): string | null {
    const metadata = call.metadata as grpc.Metadata;
    
    // Check Authorization header (Bearer token)
    const authHeader = metadata.get('authorization');
    if (authHeader && authHeader.length > 0) {
      const authValue = authHeader[0] as string;
      if (authValue.startsWith('Bearer ')) {
        return authValue.substring(7);
      }
    }

    // Check x-api-key header
    const apiKeyHeader = metadata.get('x-api-key');
    if (apiKeyHeader && apiKeyHeader.length > 0) {
      return apiKeyHeader[0] as string;
    }

    return null;
  }

  /**
   * Get remote address from gRPC call
   */
  private getRemoteAddress(call: any): string {
    const peer = call.getPeer?.();
    this.logger.debug('Getting remote address', { peer });
    
    if (peer) {
      if (peer.startsWith('unix:')) {
        return 'unix-socket';
      }
      const match = peer.match(/^ipv[46]:([^:]+):/);
      if (match) {
        return match[1];
      }
    }
    return 'unknown';
  }

  /**
   * Check if connection is local (Unix socket or localhost)
   */
  private isLocalConnection(call: any, remoteAddress: string): boolean {
    const peer = call.getPeer?.();
    this.logger.debug('Checking if local connection', { peer, remoteAddress });
    
    // Unix socket connections are always local
    if (peer && peer.startsWith('unix:')) {
      return true;
    }

    // Check if address is localhost - for testing, treat localhost as local
    return remoteAddress === '127.0.0.1' || 
           remoteAddress === '::1' || 
           remoteAddress === 'localhost' || 
           remoteAddress === 'unix-socket' ||
           remoteAddress === 'unknown'; // For demo, treat unknown as local
  }
}
