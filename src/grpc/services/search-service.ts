/**
 * Search Service Implementation
 * 
 * Implements SearchDocs and SearchChunks gRPC service methods
 */

import * as grpc from '@grpc/grpc-js';
import { folder_mcp } from '../../generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IVectorSearchService,
  IEmbeddingService,
  IFileSystemService,
  SERVICE_TOKENS 
} from '../../di/interfaces.js';
import { mapDomainErrorToGrpcStatus, createMissingFieldError, createOutOfRangeError } from '../utils/error-mapper.js';
import { createGrpcError } from '../utils/proto-loader.js';
import { AuthInterceptor } from '../auth/index.js';

/**
 * Search service implementation
 */
export class SearchService {
  private logger: ILoggingService;
  private vectorSearch: IVectorSearchService;
  private embeddingService: IEmbeddingService;
  private fileSystemService: IFileSystemService;

  constructor(
    container: IDependencyContainer,
    private authInterceptor?: AuthInterceptor
  ) {
    this.logger = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);
    this.vectorSearch = container.resolve<IVectorSearchService>(SERVICE_TOKENS.VECTOR_SEARCH);
    this.embeddingService = container.resolve<IEmbeddingService>(SERVICE_TOKENS.EMBEDDING);
    this.fileSystemService = container.resolve<IFileSystemService>(SERVICE_TOKENS.FILE_SYSTEM);
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

      // Check if vector search service is ready
      if (!this.vectorSearch.isReady()) {
        const grpcError = createGrpcError(
          grpc.status.FAILED_PRECONDITION,
          'Vector search index not ready. Please ensure documents have been indexed.',
          'VECTOR_INDEX_NOT_READY'
        );
        callback(grpcError);
        return;
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(request.query || '');
      
      // Perform vector search
      const searchResults = await this.vectorSearch.search(
        queryEmbedding,
        request.topK || 10,
        0.7 // Default similarity threshold
      );

      // Convert search results to gRPC response format
      const documents = searchResults.map((result, index) => ({
        documentId: result.documentId || `doc_${index}`,
        filename: result.filename || 'unknown',
        relativePath: result.relativePath || result.filename || 'unknown',
        title: result.title || result.filename || 'Untitled',
        lastModified: result.lastModified ? new Date(result.lastModified).toISOString() : new Date().toISOString(),
        fileSizeBytes: result.fileSize || 0,
        score: result.score || 0,
        snippet: result.snippet || '',
        metadata: result.metadata || {}
      }));

      const executionTime = Date.now() - startTime;
      
      // Calculate max score in SimilarityScore format
      const maxScore = documents.length > 0 ? {
        score: Math.max(...documents.map(d => d.score)),
        confidence: 0.95,
        rank: 1,
        method: 'cosine_similarity'
      } : null;
      
      const response: folder_mcp.ISearchDocsResponse = {
        documents,
        totalFound: documents.length,
        maxScore,
        queryId: this.generateQueryId(),
        status: {
          success: true,
          requestId: this.generateQueryId(),
          processingTimeMs: executionTime,
          errors: [],
          warnings: documents.length === 0 ? ['No documents found matching the query'] : []
        },
        pagination: {
          page: 1,
          perPage: request.topK || 10,
          totalCount: documents.length,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      };

      this.logger.info('SearchDocs completed', {
        documentsFound: documents.length,
        maxScore: maxScore?.score,
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

      // Check if vector search service is ready
      if (!this.vectorSearch.isReady()) {
        const grpcError = createGrpcError(
          grpc.status.FAILED_PRECONDITION,
          'Vector search index not ready. Please ensure documents have been indexed.',
          'VECTOR_INDEX_NOT_READY'
        );
        callback(grpcError);
        return;
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(request.query || '');
      
      // Perform vector search for chunks
      const searchResults = await this.vectorSearch.search(
        queryEmbedding,
        request.topK || 20,
        0.7 // Default similarity threshold
      );

      // Convert search results to chunk format
      const chunks = searchResults.map((result, index) => ({
        chunkId: result.chunkId || `chunk_${index}`,
        documentId: result.documentId || `doc_${Math.floor(index / 5)}`,
        text: result.text || result.snippet || '',
        startOffset: result.startOffset || 0,
        endOffset: result.endOffset || (result.text?.length || 0),
        metadata: result.metadata || {},
        score: result.score || 0,
        similarity: {
          score: result.score || 0,
          confidence: 0.95,
          rank: index + 1,
          method: 'cosine_similarity'
        }
      }));

      const executionTime = Date.now() - startTime;
      
      // Calculate max score in SimilarityScore format
      const maxScore = chunks.length > 0 ? {
        score: Math.max(...chunks.map(c => c.score)),
        confidence: 0.95,
        rank: 1,
        method: 'cosine_similarity'
      } : null;
      
      const response: folder_mcp.ISearchChunksResponse = {
        chunks,
        totalFound: chunks.length,
        maxScore,
        queryId: this.generateQueryId(),
        status: {
          success: true,
          requestId: this.generateQueryId(),
          processingTimeMs: executionTime,
          errors: [],
          warnings: chunks.length === 0 ? ['No chunks found matching the query'] : []
        },
        pagination: {
          page: 1,
          perPage: request.topK || 20,
          totalCount: chunks.length,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      };

      this.logger.info('SearchChunks completed', {
        chunksFound: chunks.length,
        maxScore: maxScore?.score,
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
