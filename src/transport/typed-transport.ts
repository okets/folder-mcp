/**
 * Typed Transport Implementation
 * 
 * Concrete implementation of the type-safe transport service that wraps
 * the base transport and provides compile-time type safety for all service calls.
 */

import { EventEmitter } from 'events';
import { ITransport } from './interfaces.js';
import { 
  ITypedFolderMCPService, 
  ITypedTransport,
  SERVICE_METHODS,
  ServiceMethodName,
  RequestTypeMap,
  ResponseTypeMap,
  isStreamingMethod,
  TransportStats
} from './typed-service.js';
import { folder_mcp } from '../generated/folder-mcp.js';
import { EnhancedTransportError, EnhancedTransportMetadata } from './types.js';

/**
 * Type-safe service implementation that delegates to the underlying transport
 */
export class TypedFolderMCPService implements ITypedFolderMCPService {
  constructor(private transport: ITransport) {}

  async searchDocs(
    request: folder_mcp.ISearchDocsRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.SearchDocsResponse> {
    return this.transport.request(SERVICE_METHODS.SEARCH_DOCS, request, metadata);
  }

  async searchChunks(
    request: folder_mcp.ISearchChunksRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.SearchChunksResponse> {
    return this.transport.request(SERVICE_METHODS.SEARCH_CHUNKS, request, metadata);
  }

  async listFolders(
    request: folder_mcp.IListFoldersRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.ListFoldersResponse> {
    return this.transport.request(SERVICE_METHODS.LIST_FOLDERS, request, metadata);
  }

  async listDocumentsInFolder(
    request: folder_mcp.IListDocumentsInFolderRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.ListDocumentsInFolderResponse> {
    return this.transport.request(SERVICE_METHODS.LIST_DOCUMENTS_IN_FOLDER, request, metadata);
  }

  async getDocMetadata(
    request: folder_mcp.IGetDocMetadataRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.GetDocMetadataResponse> {
    return this.transport.request(SERVICE_METHODS.GET_DOC_METADATA, request, metadata);
  }

  async *downloadDoc(
    request: folder_mcp.IDownloadDocRequest,
    metadata?: Record<string, string>
  ): AsyncIterable<folder_mcp.DownloadDocResponse> {
    yield* this.transport.streamRequest(SERVICE_METHODS.DOWNLOAD_DOC, request, metadata);
  }

  async getChunks(
    request: folder_mcp.IGetChunksRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.GetChunksResponse> {
    return this.transport.request(SERVICE_METHODS.GET_CHUNKS, request, metadata);
  }

  async getDocSummary(
    request: folder_mcp.IGetDocSummaryRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.GetDocSummaryResponse> {
    return this.transport.request(SERVICE_METHODS.GET_DOC_SUMMARY, request, metadata);
  }

  async batchDocSummary(
    request: folder_mcp.IBatchDocSummaryRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.BatchDocSummaryResponse> {
    return this.transport.request(SERVICE_METHODS.BATCH_DOC_SUMMARY, request, metadata);
  }

  async tableQuery(
    request: folder_mcp.ITableQueryRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.TableQueryResponse> {
    return this.transport.request(SERVICE_METHODS.TABLE_QUERY, request, metadata);
  }

  async ingestStatus(
    request: folder_mcp.IIngestStatusRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.IngestStatusResponse> {
    return this.transport.request(SERVICE_METHODS.INGEST_STATUS, request, metadata);
  }

  async refreshDoc(
    request: folder_mcp.IRefreshDocRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.RefreshDocResponse> {
    return this.transport.request(SERVICE_METHODS.REFRESH_DOC, request, metadata);
  }

  async getEmbedding(
    request: folder_mcp.IGetEmbeddingRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.GetEmbeddingResponse> {
    return this.transport.request(SERVICE_METHODS.GET_EMBEDDING, request, metadata);
  }
}

/**
 * Typed transport wrapper that provides type-safe access to the service
 */
export class TypedTransport extends EventEmitter implements ITypedTransport {
  private service: ITypedFolderMCPService;

  constructor(
    private transport: ITransport,
    service: ITypedFolderMCPService
  ) {
    super();
    this.service = service;
    
    // Forward events from the underlying transport
    this.transport.on('connected', () => this.emit('connected'));
    this.transport.on('disconnected', () => this.emit('disconnected'));
    this.transport.on('error', (error) => this.emit('error', error));
  }

  getService(): ITypedFolderMCPService {
    return this.service;
  }

  async start(): Promise<void> {
    return this.transport.start();
  }

  async stop(): Promise<void> {
    return this.transport.stop();
  }

  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.transport.healthCheck();
      return health.status === 'connected';
    } catch {
      return false;
    }
  }

  getStats(): TransportStats {
    const stats = this.transport.getStats();
    return {
      requestCount: stats.requestsTotal,
      errorCount: stats.requestsError,
      averageResponseTime: stats.averageLatency,
      uptime: stats.uptime,
      connectionCount: stats.connectionsActive
    };
  }
}

/**
 * Request validation utilities for proto messages
 */
export class ProtoRequestValidator {
  /**
   * Validate SearchDocsRequest
   */
  static validateSearchDocsRequest(request: folder_mcp.ISearchDocsRequest): folder_mcp.IResponseStatus | null {
    const errors: folder_mcp.IErrorDetail[] = [];

    if (!request.query || request.query.trim().length === 0) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_INVALID_REQUEST,
        message: 'Query parameter is required and cannot be empty',
        field: 'query'
      });
    }

    if (request.query && request.query.length > 1000) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_INVALID_REQUEST,
        message: 'Query parameter cannot exceed 1000 characters',
        field: 'query'
      });
    }

    if (request.topK && (request.topK < 1 || request.topK > 50)) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_OUT_OF_RANGE,
        message: 'topK parameter must be between 1 and 50',
        field: 'topK'
      });
    }

    if (request.documentTypes && request.documentTypes.length > 20) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_OUT_OF_RANGE,
        message: 'Cannot specify more than 20 document types',
        field: 'documentTypes'
      });
    }

    if (request.authors && request.authors.length > 10) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_OUT_OF_RANGE,
        message: 'Cannot specify more than 10 authors',
        field: 'authors'
      });
    }

    if (errors.length === 0) {
      return null;
    }

    return {
      success: false,
      errors: errors,
      warnings: [],
      requestId: generateRequestId(),
      processingTimeMs: 0
    };
  }

  /**
   * Validate ListDocumentsInFolderRequest
   */
  static validateListDocumentsInFolderRequest(
    request: folder_mcp.IListDocumentsInFolderRequest
  ): folder_mcp.IResponseStatus | null {
    const errors: folder_mcp.IErrorDetail[] = [];

    if (!request.folderPath || request.folderPath.trim().length === 0) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_INVALID_REQUEST,
        message: 'Folder path is required',
        field: 'folderPath'
      });
    }

    if (request.folderPath && request.folderPath.length > 500) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_INVALID_REQUEST,
        message: 'Folder path cannot exceed 500 characters',
        field: 'folderPath'
      });
    }

    if (request.page && request.page < 1) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_OUT_OF_RANGE,
        message: 'Page number must be >= 1',
        field: 'page'
      });
    }

    if (request.perPage && (request.perPage < 1 || request.perPage > 200)) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_OUT_OF_RANGE,
        message: 'Per page must be between 1 and 200',
        field: 'perPage'
      });
    }

    if (request.typeFilter && request.typeFilter.length > 20) {
      errors.push({
        code: folder_mcp.ErrorCode.ERROR_CODE_OUT_OF_RANGE,
        message: 'Cannot specify more than 20 document types in filter',
        field: 'typeFilter'
      });
    }

    if (errors.length === 0) {
      return null;
    }

    return {
      success: false,
      errors: errors,
      warnings: [],
      requestId: generateRequestId(),
      processingTimeMs: 0
    };
  }

  /**
   * Generic validation for all requests
   */
  static validateGenericRequest(method: ServiceMethodName, request: any): folder_mcp.IResponseStatus | null {
    switch (method) {
      case SERVICE_METHODS.SEARCH_DOCS:
        return this.validateSearchDocsRequest(request);
      case SERVICE_METHODS.LIST_DOCUMENTS_IN_FOLDER:
        return this.validateListDocumentsInFolderRequest(request);
      default:
        // For now, allow other requests to pass through
        // Additional validators can be added here
        return null;
    }
  }
}

/**
 * Utility functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Enhanced metadata builder for transport requests
 */
export class TransportMetadataBuilder {
  private metadata: EnhancedTransportMetadata = {};

  setRequestId(requestId: string): this {
    this.metadata['request-id'] = requestId;
    return this;
  }

  setPriority(priority: folder_mcp.Priority): this {
    this.metadata['priority'] = priority.toString();
    return this;
  }

  setDocumentTypes(types: folder_mcp.DocumentType[]): this {
    this.metadata['document-types'] = JSON.stringify(types);
    return this;
  }

  setSummaryMode(mode: folder_mcp.SummaryMode): this {
    this.metadata['summary-mode'] = mode.toString();
    return this;
  }

  setTraceId(traceId: string): this {
    this.metadata['trace-id'] = traceId;
    return this;
  }

  setClientVersion(version: string): this {
    this.metadata['client-version'] = version;
    return this;
  }

  build(): EnhancedTransportMetadata {
    return { ...this.metadata };
  }
}

/**
 * Factory function to create a typed service instance
 */
export function createTypedFolderMCPService(transport: ITransport): ITypedFolderMCPService {
  return new TypedFolderMCPService(transport);
}

/**
 * Factory function to create a typed transport instance
 */
export function createTypedTransport(
  transport: ITransport,
  service?: ITypedFolderMCPService
): ITypedTransport {
  const typedService = service || createTypedFolderMCPService(transport);
  return new TypedTransport(transport, typedService);
}
