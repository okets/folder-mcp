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
  /** Folder topics/tags (placeholder for future) */
  topics?: string[];
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