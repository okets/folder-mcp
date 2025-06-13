/**
 * Type-Safe Transport Service Interface
 * 
 * Defines strongly-typed service interfaces using generated Protocol Buffer types
 * for all 13 service endpoints with compile-time type safety.
 */

import { folder_mcp } from '../generated/folder-mcp.js';

/**
 * Type-safe folder MCP service interface
 * All methods use generated protobuf types for complete type safety
 */
export interface ITypedFolderMCPService {
  // ===================================================================
  // Core Search Endpoints
  // ===================================================================
  
  /**
   * Semantic document discovery with metadata filters
   * Returns top_k documents (max 50) with similarity scores
   */
  searchDocs(
    request: folder_mcp.ISearchDocsRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.SearchDocsResponse>;
  
  /**
   * Chunk-level search with text previews and metadata
   * Returns top_k chunks (max 50) with content previews ≤1,000 tokens
   */
  searchChunks(
    request: folder_mcp.ISearchChunksRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.SearchChunksResponse>;
  
  // ===================================================================
  // Navigation Endpoints
  // ===================================================================
  
  /**
   * Top-level folder tree structure with pagination
   * Returns folder hierarchy with document counts
   */
  listFolders(
    request: folder_mcp.IListFoldersRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.ListFoldersResponse>;
  
  /**
   * Paginated document listing within a folder
   * Returns documents with metadata, max 200 per page
   */
  listDocumentsInFolder(
    request: folder_mcp.IListDocumentsInFolderRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.ListDocumentsInFolderResponse>;
  
  // ===================================================================
  // Document Access Endpoints
  // ===================================================================
  
  /**
   * Structural metadata for documents (sheets, slides, authors)
   * Returns document structure without content
   */
  getDocMetadata(
    request: folder_mcp.IGetDocMetadataRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.GetDocMetadataResponse>;
  
  /**
   * Binary document streaming for downloads
   * Streams document content with proper content-type headers
   */
  downloadDoc(
    request: folder_mcp.IDownloadDocRequest,
    metadata?: Record<string, string>
  ): AsyncIterable<folder_mcp.DownloadDocResponse>;
  
  /**
   * Full chunk text retrieval with metadata
   * Returns chunk content with ≤1,000 tokens per chunk
   */
  getChunks(
    request: folder_mcp.IGetChunksRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.GetChunksResponse>;
  
  // ===================================================================
  // Summarization Endpoints
  // ===================================================================
  
  /**
   * Single document summarization (brief/detailed modes)
   * Returns summary ≤500 tokens with source range references
   */
  getDocSummary(
    request: folder_mcp.IGetDocSummaryRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.GetDocSummaryResponse>;
  
  /**
   * Multi-document batch processing with total token cap
   * Returns batch summaries with ≤2,000 total tokens
   */
  batchDocSummary(
    request: folder_mcp.IBatchDocSummaryRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.BatchDocSummaryResponse>;
  
  // ===================================================================
  // Specialized Query Endpoints
  // ===================================================================
  
  /**
   * Semantic queries over spreadsheet data with sheet selection
   * Returns cell ranges and values matching query
   */
  tableQuery(
    request: folder_mcp.ITableQueryRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.TableQueryResponse>;
  
  /**
   * Document processing status monitoring
   * Returns ingestion progress and job tracking
   */
  ingestStatus(
    request: folder_mcp.IIngestStatusRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.IngestStatusResponse>;
  
  /**
   * Trigger document re-processing with job tracking
   * Initiates refresh operation and returns job ID
   */
  refreshDoc(
    request: folder_mcp.IRefreshDocRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.RefreshDocResponse>;
  
  /**
   * Raw vector access for debugging and advanced queries
   * Returns embedding vectors for specified documents/chunks
   */
  getEmbedding(
    request: folder_mcp.IGetEmbeddingRequest,
    metadata?: Record<string, string>
  ): Promise<folder_mcp.GetEmbeddingResponse>;
}

/**
 * Type-safe transport wrapper that ensures all service calls use proper types
 */
export interface ITypedTransport {
  /**
   * Get the typed service interface for making calls
   */
  getService(): ITypedFolderMCPService;
  
  /**
   * Start the transport
   */
  start(): Promise<void>;
  
  /**
   * Stop the transport gracefully
   */
  stop(): Promise<void>;
  
  /**
   * Check if the transport is healthy
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Get transport statistics
   */
  getStats(): TransportStats;
}

/**
 * Transport statistics interface
 */
export interface TransportStats {
  readonly requestCount: number;
  readonly errorCount: number;
  readonly averageResponseTime: number;
  readonly uptime: number;
  readonly connectionCount: number;
}

/**
 * Service method names as constants for type safety
 */
export const SERVICE_METHODS = {
  // Core Search
  SEARCH_DOCS: 'SearchDocs',
  SEARCH_CHUNKS: 'SearchChunks',
  
  // Navigation  
  LIST_FOLDERS: 'ListFolders',
  LIST_DOCUMENTS_IN_FOLDER: 'ListDocumentsInFolder',
  
  // Document Access
  GET_DOC_METADATA: 'GetDocMetadata',
  DOWNLOAD_DOC: 'DownloadDoc',
  GET_CHUNKS: 'GetChunks',
  
  // Summarization
  GET_DOC_SUMMARY: 'GetDocSummary',
  BATCH_DOC_SUMMARY: 'BatchDocSummary',
  
  // Specialized Queries
  TABLE_QUERY: 'TableQuery',
  INGEST_STATUS: 'IngestStatus',
  REFRESH_DOC: 'RefreshDoc',
  GET_EMBEDDING: 'GetEmbedding'
} as const;

/**
 * Service method name type
 */
export type ServiceMethodName = typeof SERVICE_METHODS[keyof typeof SERVICE_METHODS];

/**
 * Request type mapping for type-safe method dispatch
 */
export type RequestTypeMap = {
  [SERVICE_METHODS.SEARCH_DOCS]: folder_mcp.ISearchDocsRequest;
  [SERVICE_METHODS.SEARCH_CHUNKS]: folder_mcp.ISearchChunksRequest;
  [SERVICE_METHODS.LIST_FOLDERS]: folder_mcp.IListFoldersRequest;
  [SERVICE_METHODS.LIST_DOCUMENTS_IN_FOLDER]: folder_mcp.IListDocumentsInFolderRequest;
  [SERVICE_METHODS.GET_DOC_METADATA]: folder_mcp.IGetDocMetadataRequest;
  [SERVICE_METHODS.DOWNLOAD_DOC]: folder_mcp.IDownloadDocRequest;
  [SERVICE_METHODS.GET_CHUNKS]: folder_mcp.IGetChunksRequest;
  [SERVICE_METHODS.GET_DOC_SUMMARY]: folder_mcp.IGetDocSummaryRequest;
  [SERVICE_METHODS.BATCH_DOC_SUMMARY]: folder_mcp.IBatchDocSummaryRequest;
  [SERVICE_METHODS.TABLE_QUERY]: folder_mcp.ITableQueryRequest;
  [SERVICE_METHODS.INGEST_STATUS]: folder_mcp.IIngestStatusRequest;
  [SERVICE_METHODS.REFRESH_DOC]: folder_mcp.IRefreshDocRequest;
  [SERVICE_METHODS.GET_EMBEDDING]: folder_mcp.IGetEmbeddingRequest;
};

/**
 * Response type mapping for type-safe method dispatch
 */
export type ResponseTypeMap = {
  [SERVICE_METHODS.SEARCH_DOCS]: folder_mcp.SearchDocsResponse;
  [SERVICE_METHODS.SEARCH_CHUNKS]: folder_mcp.SearchChunksResponse;
  [SERVICE_METHODS.LIST_FOLDERS]: folder_mcp.ListFoldersResponse;
  [SERVICE_METHODS.LIST_DOCUMENTS_IN_FOLDER]: folder_mcp.ListDocumentsInFolderResponse;
  [SERVICE_METHODS.GET_DOC_METADATA]: folder_mcp.GetDocMetadataResponse;
  [SERVICE_METHODS.DOWNLOAD_DOC]: folder_mcp.DownloadDocResponse;
  [SERVICE_METHODS.GET_CHUNKS]: folder_mcp.GetChunksResponse;
  [SERVICE_METHODS.GET_DOC_SUMMARY]: folder_mcp.GetDocSummaryResponse;
  [SERVICE_METHODS.BATCH_DOC_SUMMARY]: folder_mcp.BatchDocSummaryResponse;
  [SERVICE_METHODS.TABLE_QUERY]: folder_mcp.TableQueryResponse;
  [SERVICE_METHODS.INGEST_STATUS]: folder_mcp.IngestStatusResponse;
  [SERVICE_METHODS.REFRESH_DOC]: folder_mcp.RefreshDocResponse;
  [SERVICE_METHODS.GET_EMBEDDING]: folder_mcp.GetEmbeddingResponse;
};

/**
 * Helper type for streaming methods
 */
export type StreamingMethods = typeof SERVICE_METHODS.DOWNLOAD_DOC;

/**
 * Check if a method is streaming
 */
export function isStreamingMethod(method: ServiceMethodName): method is StreamingMethods {
  return method === SERVICE_METHODS.DOWNLOAD_DOC;
}
