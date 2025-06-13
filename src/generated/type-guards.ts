/**
 * Type guard functions for Protocol Buffer messages
 * Generated automatically - do not edit manually
 */

import { folder_mcp } from './folder-mcp.d';

/**
 * Type guard for SearchDocsRequest
 */
export function isSearchDocsRequest(obj: any): obj is folder_mcp.ISearchDocsRequest {
  return obj && typeof obj.query === 'string';
}

/**
 * Type guard for SearchDocsResponse
 */
export function isSearchDocsResponse(obj: any): obj is folder_mcp.ISearchDocsResponse {
  return obj && Array.isArray(obj.documents);
}

/**
 * Type guard for DocumentResult
 */
export function isDocumentResult(obj: any): obj is folder_mcp.IDocumentResult {
  return obj && typeof obj.document_id === 'string' && typeof obj.similarity_score === 'number';
}

/**
 * Type guard for GetDocSummaryRequest
 */
export function isGetDocSummaryRequest(obj: any): obj is folder_mcp.IGetDocSummaryRequest {
  return obj && typeof obj.document_id === 'string';
}

/**
 * Type guard for GetDocSummaryResponse
 */
export function isGetDocSummaryResponse(obj: any): obj is folder_mcp.IGetDocSummaryResponse {
  return obj && typeof obj.summary === 'string';
}

/**
 * Type guard for DocumentType enum
 */
export function isDocumentType(value: any): value is folder_mcp.DocumentType {
  return typeof value === 'number' && value >= 0 && value <= 16;
}

/**
 * Type guard for SummaryMode enum
 */
export function isSummaryMode(value: any): value is folder_mcp.SummaryMode {
  return typeof value === 'number' && value >= 0 && value <= 4;
}

/**
 * Type guard for IngestStatus enum
 */
export function isIngestStatus(value: any): value is folder_mcp.IngestStatus {
  return typeof value === 'number' && value >= 0 && value <= 6;
}
