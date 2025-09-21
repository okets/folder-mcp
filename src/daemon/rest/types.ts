/**
 * REST API Type Definitions for Multi-Folder Operations
 * Sprint 5: Folder and Document listing endpoints
 */

// Re-export existing types
export { HealthResponse, ServerInfoResponse, ErrorResponse } from './server.js';

/**
 * Folder information for REST API responses
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
 * Response for GET /api/v1/folders
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
 * Search request body for POST /api/v1/folders/{id}/search - Sprint 7
 */
export interface SearchRequest {
  /** Search query string */
  query: string;
  /** Maximum number of results to return (default: 10, max: 100) */
  limit?: number;
  /** Minimum relevance threshold (0.0-1.0, default: 0.3) */
  threshold?: number;
  /** Whether to include document content in results (default: true) */
  includeContent?: boolean;
}

/**
 * Individual search result
 */
export interface SearchResult {
  /** Document identifier */
  documentId: string;
  /** Document filename */
  documentName: string;
  /** Relevance score (0.0-1.0) */
  relevance: number;
  /** Matching text snippet */
  snippet: string;
  /** Page/section number where match was found */
  pageNumber?: number;
  /** Chunk identifier for the matching text */
  chunkId?: string;
  /** Document type */
  documentType?: string;
  /** Full document path relative to folder */
  documentPath?: string;
}

/**
 * Performance metrics for search operation
 */
export interface SearchPerformance {
  /** Total search time in milliseconds */
  searchTime: number;
  /** Model loading time in milliseconds (0 if already loaded) */
  modelLoadTime: number;
  /** Number of documents searched */
  documentsSearched: number;
  /** Total number of matching results (before limit applied) */
  totalResults: number;
  /** Model used for this search */
  modelUsed: string;
}

/**
 * Response for POST /api/v1/folders/{id}/search - Sprint 7
 */
export interface SearchResponse {
  /** Context about the folder being searched */
  folderContext: FolderContext;
  /** Search results ordered by relevance */
  results: SearchResult[];
  /** Search performance metrics */
  performance: SearchPerformance;
  /** Query used for search (for verification) */
  query: string;
  /** Search parameters used */
  parameters: {
    limit: number;
    threshold: number;
    includeContent: boolean;
  };
}