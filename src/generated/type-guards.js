/**
 * Type guard functions for Protocol Buffer messages
 * Generated automatically - do not edit manually
 */
/**
 * Type guard for SearchDocsRequest
 */
export function isSearchDocsRequest(obj) {
    return obj && typeof obj.query === 'string';
}
/**
 * Type guard for SearchDocsResponse
 */
export function isSearchDocsResponse(obj) {
    return obj && Array.isArray(obj.documents);
}
/**
 * Type guard for DocumentResult
 */
export function isDocumentResult(obj) {
    return obj && typeof obj.document_id === 'string' && typeof obj.similarity_score === 'number';
}
/**
 * Type guard for GetDocSummaryRequest
 */
export function isGetDocSummaryRequest(obj) {
    return obj && typeof obj.document_id === 'string';
}
/**
 * Type guard for GetDocSummaryResponse
 */
export function isGetDocSummaryResponse(obj) {
    return obj && typeof obj.summary === 'string';
}
/**
 * Type guard for DocumentType enum
 */
export function isDocumentType(value) {
    return typeof value === 'number' && value >= 0 && value <= 16;
}
/**
 * Type guard for SummaryMode enum
 */
export function isSummaryMode(value) {
    return typeof value === 'number' && value >= 0 && value <= 4;
}
/**
 * Type guard for IngestStatus enum
 */
export function isIngestStatus(value) {
    return typeof value === 'number' && value >= 0 && value <= 6;
}
