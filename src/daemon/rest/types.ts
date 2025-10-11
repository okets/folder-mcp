/**
 * REST API Type Definitions for Multi-Folder Operations
 * Sprint 5: Folder and Document listing endpoints
 */

// Re-export existing types
export { HealthResponse, ErrorResponse } from './server.js';

/**
 * Phase 10 Sprint 0: Enhanced Server Info Types for Endpoint Discovery
 */

/**
 * Information about an available MCP endpoint
 */
export interface EndpointInfo {
  /** Endpoint name as used in MCP tools */
  name: string;
  /** Clear description of what this endpoint does */
  purpose: string;
  /** Description of what this endpoint returns */
  returns: string;
  /** Guidance on when to use this endpoint */
  use_when: string;
  /** Optional description of endpoint parameters */
  parameters?: Record<string, string>;
}

/**
 * Enhanced server capabilities for LLM decision-making
 */
export interface ServerCapabilities {
  /** Total configured folders */
  total_folders: number;
  /** Total indexed documents across all folders */
  total_documents: number;
  /** Total text chunks available for search */
  total_chunks: number;
  /** Whether semantic search is available */
  semantic_search: boolean;
  /** Whether key phrase extraction is working */
  key_phrase_extraction: boolean;
  /** Supported file types for processing */
  file_types_supported: string[];
  /** Whether binary files are supported */
  binary_file_support: boolean;
  /** Maximum file size in MB */
  max_file_size_mb: number;
  /** Available embedding models */
  embedding_models: string[];
}

/**
 * Available endpoints grouped by purpose
 */
export interface AvailableEndpoints {
  /** Endpoints for exploring and understanding the knowledge base */
  exploration: EndpointInfo[];
  /** Endpoints for retrieving document content */
  content_retrieval: EndpointInfo[];
  /** Endpoints for semantic search */
  search: EndpointInfo[];
}

/**
 * Usage guidance for LLMs
 */
export interface UsageHints {
  /** Recommended flow for general exploration */
  exploration_flow: string;
  /** Recommended flow for chunk-level content search */
  content_search_flow: string;
  /** Recommended flow for document-level discovery */
  document_discovery_flow: string;
  /** Additional helpful tip */
  tip: string;
}

/**
 * Enhanced server information response for Phase 10
 */
export interface EnhancedServerInfoResponse {
  /** Basic server information */
  server_info: {
    name: string;
    version: string;
    description: string;
  };
  /** Enhanced capabilities for decision-making */
  capabilities: ServerCapabilities;
  /** Available endpoints grouped by purpose */
  available_endpoints: AvailableEndpoints;
  /** Usage guidance for optimal navigation */
  usage_hints: UsageHints;
}

/**
 * Key phrase with relevance score
 */
export interface KeyPhrase {
  /** The key phrase text */
  text: string;
  /** Relevance/confidence score (0-1) */
  score: number;
}

/**
 * Recently changed file information
 */
export interface RecentlyChangedFile {
  /** Relative path from folder root */
  path: string;
  /** ISO timestamp of last modification */
  modified: string;
}

/**
 * Semantic preview of folder contents
 */
export interface SemanticPreview {
  /** Top diverse key phrases representing folder content (10-15 items) */
  top_key_phrases: KeyPhrase[];
  /** Complexity indicator based on readability scores */
  complexity_indicator: 'simple' | 'moderate' | 'technical';
  /** Average readability score across all documents */
  avg_readability: number;
}

/**
 * Folder indexing status
 */
export interface IndexingStatus {
  /** Whether folder is fully indexed */
  is_indexed: boolean;
  /** Number of documents indexed */
  documents_indexed: number;
}

/**
 * Phase 10 Enhanced Folder Information
 */
export interface EnhancedFolderInfo {
  /** Absolute base path to the folder (serves as unique identifier) */
  base_folder_path: string;
  /** Number of documents in folder */
  document_count: number;
  /** Semantic preview with key phrases and complexity */
  semantic_preview?: SemanticPreview;
  /** Recently changed files for context (provides modification times) */
  recently_changed_files?: RecentlyChangedFile[];
  /** Current indexing status */
  indexing_status: IndexingStatus;
}

/**
 * Phase 10 Enhanced Folders List Response
 */
export interface EnhancedFoldersListResponse {
  /** List of folders with semantic enrichment */
  folders: EnhancedFolderInfo[];
  /** Total number of configured folders */
  total_folders: number;
  /** Navigation hint for LLMs */
  navigation_hint: string;
}

/**
 * Legacy Folder information for backward compatibility
 */
export interface FolderInfo {
  /** Folder identifier (derived from path) */
  id: string;
  /** Human-friendly folder name */
  name: string;
  /** Absolute path to the folder */
  path: string;
  /** Embedding model used for this folder */
  model: string;
  /** Current indexing status */
  status: 'pending' | 'downloading-model' | 'scanning' | 'ready' | 'indexing' | 'indexed' | 'active' | 'error' | 'watching';
  /** Number of documents in folder */
  documentCount: number;
  /** ISO timestamp of last indexing */
  lastIndexed?: string;
  /** Key phrases extracted from content (Sprint 10) */
  keyPhrases?: string[];
  /** Content complexity level (Sprint 10) */
  contentComplexity?: string;
  /** Average readability score (Sprint 10) */
  avgReadabilityScore?: number;
  /** Progress percentage if indexing */
  progress?: number;
  /** Notification if any */
  notification?: {
    message: string;
    type: 'error' | 'warning' | 'info';
  };
}

/**
 * Legacy Response for GET /api/v1/folders
 */
export interface FoldersListResponse {
  folders: FolderInfo[];
  totalCount: number;
}

/**
 * Document information for REST API responses
 */
export interface DocumentInfo {
  /** Document identifier (filename or generated ID) */
  id: string;
  /** Document filename */
  name: string;
  /** Relative path from folder root */
  path: string;
  /** File type (pdf, docx, xlsx, pptx, txt, md) */
  type: string;
  /** File size in bytes */
  size: number;
  /** ISO timestamp of last modification */
  modified: string;
  /** Whether document is indexed */
  indexed: boolean;
  /** Additional metadata based on file type */
  metadata?: {
    /** PDF page count */
    pageCount?: number;
    /** Word count (for text documents) */
    wordCount?: number;
    /** Character count */
    charCount?: number;
    /** Sheet count (for Excel files) */
    sheetCount?: number;
    /** Slide count (for PowerPoint files) */
    slideCount?: number;
  };
}

/**
 * Folder context information included in document responses
 */
export interface FolderContext {
  id: string;
  name: string;
  path: string;
  model: string;
  status: string;
}

/**
 * Pagination information for document listings
 */
export interface PaginationInfo {
  /** Total number of documents in folder */
  total: number;
  /** Number of documents requested (limit) */
  limit: number;
  /** Starting offset */
  offset: number;
  /** Whether more documents are available */
  hasMore: boolean;
}

/**
 * Response for GET /api/v1/folders/{id}/documents
 */
export interface DocumentsListResponse {
  /** Context about the parent folder */
  folderContext: FolderContext;
  /** List of documents in the folder */
  documents: DocumentInfo[];
  /** Pagination information */
  pagination: PaginationInfo;
}

/**
 * Query parameters for document listing
 */
export interface DocumentListParams {
  /** Maximum number of documents to return (default: 50) */
  limit?: number;
  /** Starting offset (default: 0) */
  offset?: number;
  /** Sort field (default: 'name') */
  sort?: 'name' | 'modified' | 'size' | 'type';
  /** Sort direction (default: 'asc') */
  order?: 'asc' | 'desc';
  /** Filter by file type */
  type?: string;
}

/**
 * Full document data with content - Sprint 6
 */
export interface DocumentData {
  /** Document identifier */
  id: string;
  /** Document filename */
  name: string;
  /** File type */
  type: string;
  /** File size in bytes */
  size: number;
  /** Full document content */
  content: string;
  /** Document metadata including format-specific info */
  metadata: {
    /** PDF page count */
    pageCount?: number;
    /** Word count */
    wordCount?: number;
    /** Character count */
    charCount?: number;
    /** Sheet count (Excel) */
    sheetCount?: number;
    /** Slide count (PowerPoint) */
    slideCount?: number;
    /** Additional format-specific metadata */
    [key: string]: any;
  };
  /** Semantic metadata - Sprint 10 */
  semanticMetadata?: {
    /** Primary purpose of the document */
    primaryPurpose: string;
    /** Key phrases extracted from content */
    keyPhrases: string[];
    /** Complexity level */
    complexityLevel: string;
    /** Content type classification */
    contentType: string;
    /** Whether document contains code examples */
    hasCodeExamples: boolean;
    /** Whether document contains diagrams */
    hasDiagrams: boolean;
  };
}

/**
 * Response for GET /api/v1/folders/{id}/documents/{docId}
 */
export interface DocumentDataResponse {
  /** Context about the parent folder */
  folderContext: FolderContext;
  /** Full document data including content */
  document: DocumentData;
}

/**
 * Document outline structures for different formats
 */
export interface DocumentOutline {
  /** Document type determines outline structure */
  type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'text';
  /** Total items in outline (pages, sheets, slides, etc.) */
  totalItems?: number;
  /** PDF outline - pages */
  pages?: Array<{
    pageNumber: number;
    title?: string;
    content?: string;
  }>;
  /** Word document outline - headings/sections */
  sections?: Array<{
    level: number;
    title: string;
    pageNumber?: number;
    /** Semantic enrichment for this section - Sprint 10 */
    semantics?: {
      keyPhrases: string[];
      hasCodeExamples: boolean;
      subsectionCount?: number;
      codeLanguages?: string[];
    };
  }>;
  /** Excel outline - sheets */
  sheets?: Array<{
    sheetIndex: number;
    name: string;
    rowCount?: number;
    columnCount?: number;
  }>;
  /** PowerPoint outline - slides */
  slides?: Array<{
    slideNumber: number;
    title: string;
    notes?: string;
  }>;
  /** Text document outline - headings */
  headings?: Array<{
    level: number;
    title: string;
    lineNumber?: number;
    /** Semantic enrichment for this heading - Sprint 10 */
    semantics?: {
      keyPhrases: string[];
      hasCodeExamples: boolean;
      subsectionCount?: number;
      codeLanguages?: string[];
    };
  }>;
  /** Metadata including file path for enrichment - Sprint 10 */
  metadata?: {
    filePath?: string;
    [key: string]: any;
  };
}

/**
 * Response for GET /api/v1/folders/{id}/documents/{docId}/outline
 */
export interface DocumentOutlineResponse {
  /** Context about the parent folder */
  folderContext: FolderContext;
  /** Structured document outline */
  outline: DocumentOutline;
}

/**
 * Phase 10 Sprint 2: Explore Endpoint Types
 */

/**
 * Request parameters for explore endpoint
 */
export interface ExploreRequest {
  /** Absolute base path to the folder */
  base_folder_path: string;
  /** Relative path from base folder (e.g., "src/domain" or "" for root) */
  relative_sub_path?: string;
  /** Maximum subdirectories to return (default: 50) */
  subdirectory_limit?: number;
  /** Maximum files to return (default: 20) */
  file_limit?: number;
  /** Token for pagination continuation */
  continuation_token?: string;
}

/**
 * Information about a subdirectory with semantic enrichment
 */
export interface SubdirectoryInfo {
  /** Directory name (not full path) */
  name: string;
  /** Count of ALL indexed documents under this path (recursive) */
  indexed_document_count: number;
  /** Top key phrases from ALL nested documents (0-5 items, often empty) */
  top_key_phrases: KeyPhrase[];
}

/**
 * Statistics about the current directory
 */
export interface ExploreStatistics {
  /** Number of subdirectories in current level */
  subdirectory_count: number;
  /** Number of files in current level (ALL files) */
  file_count: number;
  /** Number of indexed documents in current level only */
  indexed_document_count: number;
  /** Total indexed documents including all subdirectories */
  total_nested_documents: number;
}

/**
 * Pagination details for a result set
 */
export interface ExplorePaginationDetails {
  /** Number of items returned */
  returned: number;
  /** Total number of items available */
  total: number;
  /** Maximum items per request */
  limit: number;
  /** Whether more items are available */
  has_more: boolean;
  /** Token for continuing pagination */
  continuation_token?: string;
}

/**
 * Response for GET /api/v1/folders/{folderPath}/explore
 */
export interface ExploreResponse {
  /** Absolute base folder path */
  base_folder_path: string;
  /** Relative path from base (normalized) */
  relative_sub_path: string;
  /** List of subdirectories with semantic data */
  subdirectories: SubdirectoryInfo[];
  /** List of ALL files in current directory with download URLs */
  files: Array<{
    name: string;
    download_url: string;
  }>;
  /** Statistics about current location */
  statistics: ExploreStatistics;
  /** Semantic context for current directory */
  semantic_context?: {
    /** Key phrases from documents directly in this directory */
    key_phrases: KeyPhrase[];
  };
  /** Pagination information */
  pagination: {
    /** Pagination for subdirectories */
    subdirectories: ExplorePaginationDetails;
    /** Pagination for files */
    documents: ExplorePaginationDetails;
  };
  /** Navigation hints for LLM */
  navigation_hints: {
    /** Suggested next actions */
    next_actions: string[];
    /** General tip */
    tip?: string;
    /** Warning if applicable */
    warning?: string;
  };
}

/**
 * Phase 10 Sprint 3: Enhanced list_documents response
 */
export interface EnhancedDocumentInfo {
  /** File path relative to base folder */
  file_path: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  last_modified: string;
  /** Top key phrases extracted from document */
  top_key_phrases: KeyPhrase[];
  /** Readability score (0-100) */
  readability_score: number;
  /** Download URL for the document (Sprint 7) */
  download_url: string;
}

/**
 * Phase 10 Sprint 3: Enhanced list_documents response with pagination
 */
export interface EnhancedDocumentsListResponse {
  /** Base folder path as provided in request */
  base_folder_path: string;
  /** Relative sub-path within the folder */
  relative_sub_path: string;
  /** List of documents with semantic metadata */
  documents: EnhancedDocumentInfo[];
  /** Pagination information */
  pagination: {
    /** Maximum items per page */
    limit: number;
    /** Current offset */
    offset: number;
    /** Total available documents */
    total: number;
    /** Number of documents returned */
    returned: number;
    /** Whether more documents are available */
    has_more: boolean;
    /** Token for continuing pagination */
    continuation_token?: string;
  };
  /** Navigation hints for LLM */
  navigation_hints: {
    /** Hint for continuing listing */
    continue_listing?: string;
    /** Hint for recursive listing */
    set_recursive_true?: string;
    /** Hint for exploration */
    use_explore?: string;
  };
}

/**
 * Phase 10 Sprint 6: Extraction quality metadata for get_document_text
 */
export interface ExtractionMetadata {
  /** Total characters in the document */
  total_characters: number;
  /** Number of characters returned in this response */
  characters_returned: number;
  /** Total number of chunks in database */
  total_chunks: number;
  /** Whether formatting was lost during extraction */
  has_formatting_loss?: boolean;
  /** Specific warnings about what was lost or transformed */
  extraction_warnings?: string[];
}

/**
 * Phase 10 Sprint 6: Dynamic navigation hints for get_document_text
 */
export interface DocumentTextNavigationHints {
  /** How to continue reading (when truncated) */
  continue_reading?: string;
  /** Information about remaining content */
  remaining_content?: string;
  /** Alternative for better formatting fidelity */
  formatting_alternative?: string;
  /** Hint about visual content availability */
  visual_content?: string;
  /** Hint about table data availability */
  table_data?: string;
  /** General tip for the user */
  tip: string;
}

/**
 * Phase 10 Sprint 6: Pagination info for get_document_text
 */
export interface DocumentTextPagination {
  /** Maximum characters requested */
  max_chars: number;
  /** Current offset in characters */
  offset: number;
  /** Total characters available */
  total: number;
  /** Characters returned in this response */
  returned: number;
  /** Whether more content is available */
  has_more: boolean;
  /** Token for continuing reading */
  continuation_token?: string;
}

/**
 * Phase 10 Sprint 6: get_document_text response
 */
export interface GetDocumentTextResponse {
  /** Base folder path as provided in request */
  base_folder_path: string;
  /** File path relative to base folder */
  file_path: string;
  /** MIME type of the original file */
  mime_type: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  last_modified: string;
  /** Extracted text content */
  extracted_text: string;
  /** Extraction quality metadata */
  metadata: ExtractionMetadata;
  /** Pagination information */
  pagination: DocumentTextPagination;
  /** Dynamic navigation hints based on context */
  navigation_hints: DocumentTextNavigationHints;
}

/**
 * Phase 10 Sprint 8: Content Search Types
 */

/**
 * Request for POST /api/v1/folders/{folderPath}/search_content
 * Enables chunk-level semantic search with hybrid scoring
 * Note: folder_id comes from URL path parameter, not request body
 */
export interface SearchContentRequest {
  /** Semantic concepts for embedding-based similarity (optional) */
  semantic_concepts?: string[];

  /** Exact terms that must match (optional) */
  exact_terms?: string[];

  /** Minimum relevance threshold (default: 0.5) */
  min_score?: number;

  /** Maximum results per page (default: 10, max: 50) */
  limit?: number;

  /** Base64url-encoded pagination state */
  continuation_token?: string;
}

/**
 * Individual search result with full chunk content
 */
export interface SearchChunkResult {
  /** Database chunk ID */
  chunk_id: string;

  /** Relative file path (reusable with other endpoints) */
  file_path: string;

  /** Full chunk text content (always included) */
  content: string;

  /** Match quality score [0.0, 1.0+] */
  relevance_score: number;

  /** Position within document (0-based) */
  chunk_index: number;

  /** Top key phrases from parent document (optional) */
  document_keywords?: string[];
}

/**
 * Search statistics for the current query
 */
export interface SearchContentStatistics {
  /** Total matching chunks across all documents */
  total_results: number;

  /** Unique file paths in results */
  files_covered: string[];

  /** Average relevance score of returned results */
  avg_relevance: number;

  /** LLM-friendly interpretation of what was searched */
  search_interpretation: string;
}

/**
 * Navigation hints based on search results
 */
export interface SearchContentNavigationHints {
  /** Suggested follow-up actions */
  next_actions: string[];

  /** Query refinement suggestions */
  related_queries: string[];
}

/**
 * Response for POST /api/v1/folders/{folderPath}/search_content
 */
export interface SearchContentResponse {
  /** Search result data */
  data: {
    /** Matching chunks ordered by relevance */
    results: SearchChunkResult[];

    /** Search statistics */
    statistics: SearchContentStatistics;
  };

  /** Status information */
  status: {
    success: boolean;
    code: number;
    message: string;
  };

  /** Pagination state */
  continuation: {
    /** Whether more results are available */
    has_more: boolean;

    /** Token for next page (base64url-encoded) */
    next_token?: string;
  };

  /** Context-aware navigation suggestions */
  navigation_hints: SearchContentNavigationHints;
}