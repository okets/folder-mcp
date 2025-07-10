/**
 * MCP-specific types and interfaces
 * 
 * This file contains TypeScript types and interfaces specific to the MCP protocol
 * implementation. Following the interface layer guidelines, this only contains
 * types needed for MCP protocol handling.
 */

export interface MCPServerOptions {
  folderPath: string;
  transport?: 'stdio';
  name?: string;
  version?: string;
  enableEnhancedFeatures?: boolean;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// ========================================
// NEW MCP ENDPOINT TYPES (from PRD v2.0)
// ========================================

// Common types used across endpoints
export interface StandardResponse<T> {
  data: T & {
    token_count: number;
  };
  status: {
    code: 'success' | 'partial_success' | 'error';
    message: string;
  };
  continuation: {
    has_more: boolean;
    token?: string;
  };
  actions?: Array<{
    id: string;
    description: string;
    params?: Record<string, any>;
  }>;
}

export interface LocationInfo {
  page?: number | null;
  section?: string | null;
  sheet?: string | null;
  slide?: number | null;
}

export interface ContextInfo {
  before: string;
  after: string;
}

export interface DocumentMetadata {
  document_type: string;
  total_pages?: number | null;
  file_size?: string;
  title?: string;
  author?: string;
  created?: string;
  modified?: string;
}

// Search endpoint types
export interface SearchRequest {
  query: string;
  mode: 'semantic' | 'regex';
  scope: 'documents' | 'chunks';
  filters?: {
    folder?: string;  // Now accepts folder path instead of name
    fileType?: string;
  };
  max_tokens?: number;
  continuation_token?: string;
}

export interface SearchResult {
  document_id: string;
  preview: string;
  score: number;
  location: LocationInfo;
  context: ContextInfo;
  metadata: DocumentMetadata;
}

export type SearchResponse = StandardResponse<{
  results: SearchResult[];
}>;

// Document outline endpoint types
export interface GetDocumentOutlineRequest {
  document_id: string;
}

export interface PDFOutline {
  type: 'pdf';
  total_pages: number;
  bookmarks: Array<{
    title: string;
    page: number;
  }>;
  file_size: string;
}

export interface ExcelOutline {
  type: 'xlsx' | 'xls' | 'ods';
  sheets: Array<{
    name: string;
    rows: number;
    columns: number;
  }>;
  total_rows: number;
  file_size: string;
}

export interface PowerPointOutline {
  type: 'pptx' | 'ppt' | 'odp';
  total_slides: number;
  slides: Array<{
    number: number;
    title: string | null;
  }>;
  file_size: string;
}

export type GetDocumentOutlineResponse = PDFOutline | ExcelOutline | PowerPointOutline;

// Document data endpoint types
export interface GetDocumentDataRequest {
  document_id: string;
  format: 'raw' | 'chunks' | 'metadata';
  section?: string;
  max_tokens?: number;
  continuation_token?: string;
}

export interface DocumentChunk {
  chunk_id: string;
  content: string;
  metadata: Record<string, any>;
}

export type GetDocumentDataResponse = StandardResponse<{
  content?: string;
  chunks?: DocumentChunk[];
  metadata?: DocumentMetadata;
}>;

// List folders/documents endpoint types
export type ListFoldersResponse = StandardResponse<{
  folders: string[];
}>;

export interface ListDocumentsRequest {
  folder: string;
  max_tokens?: number;
  continuation_token?: string;
}

export interface DocumentInfo {
  name: string;
  document_id: string;
  modified: string;
}

export type ListDocumentsResponse = StandardResponse<{
  documents: DocumentInfo[];
}>;

// Sheet data endpoint types
export interface GetSheetDataRequest {
  document_id: string;
  sheet_name?: string;
  cell_range?: string;
  max_tokens?: number;
  continuation_token?: string;
}

export type GetSheetDataResponse = StandardResponse<{
  headers: string[];
  rows: string[][];
}>;

// Slides endpoint types
export interface GetSlidesRequest {
  document_id: string;
  slide_numbers?: string;
  max_tokens?: number;
  continuation_token?: string;
}

export interface SlideInfo {
  slide_number: number;
  title: string;
  content: string;
  notes: string;
}

export type GetSlidesResponse = StandardResponse<{
  slides: SlideInfo[];
  total_slides: number;
}>;

// Pages endpoint types
export interface GetPagesRequest {
  document_id: string;
  page_range?: string;
  max_tokens?: number;
  continuation_token?: string;
}

export interface PageInfo {
  page_number: number;
  content: string;
}

export type GetPagesResponse = StandardResponse<{
  pages: PageInfo[];
  total_pages: number;
}>;

// Embedding endpoint types
export interface GetEmbeddingRequest {
  text: string;
}

export interface GetEmbeddingResponse {
  embedding: number[];
}

// Status endpoint types
export interface GetStatusRequest {
  document_id?: string;
}

export interface GetStatusResponse {
  status: 'ready' | 'processing' | 'error';
  progress: number;
  message: string;
}

// Multi-folder info endpoint types
export interface FolderInfo {
  name: string;
  path: string;
  enabled: boolean;
  documentCount: number;
  indexingStatus: 'ready' | 'indexing' | 'error' | 'not_indexed';
  lastIndexed?: string;
  size: string;
  settings?: {
    model?: string;
    backend?: string;
    excludePatterns?: string[];
  };
}

export type FolderInfoResponse = StandardResponse<{
  folders: FolderInfo[];
  totalDocuments: number;
  systemStatus: 'ready' | 'partial' | 'error';
}>;
