/**
 * Message builder functions for Protocol Buffer messages
 * Generated automatically - do not edit manually
 */

import { folder_mcp } from './folder-mcp.d';

/**
 * Builder for SearchDocsRequest
 */
export function createSearchDocsRequest(
  query: string,
  options: {
    topK?: number;
    documentTypes?: folder_mcp.DocumentType[];
    dateFrom?: string;
    dateTo?: string;
    authors?: string[];
    metadataFilters?: Record<string, string>;
  } = {}
): folder_mcp.ISearchDocsRequest {
  return {
    query,
    topK: options.topK || 10,
    documentTypes: options.documentTypes || [],
    dateFrom: options.dateFrom || null,
    dateTo: options.dateTo || null,
    authors: options.authors || [],
    metadataFilters: options.metadataFilters || {}
  };
}

/**
 * Builder for GetDocSummaryRequest
 */
export function createGetDocSummaryRequest(
  documentId: string,
  options: {
    mode?: folder_mcp.SummaryMode;
    maxTokens?: number;
    focusAreas?: string[];
  } = {}
): folder_mcp.IGetDocSummaryRequest {
  return {
    documentId: documentId,
    mode: options.mode || folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF,
    maxTokens: options.maxTokens || 500,
    focusAreas: options.focusAreas || []
  };
}

/**
 * Builder for BatchDocSummaryRequest
 */
export function createBatchDocSummaryRequest(
  documentIds: string[],
  options: {
    mode?: folder_mcp.SummaryMode;
    maxTotalTokens?: number;
    includeCrossReferences?: boolean;
  } = {}
): folder_mcp.IBatchDocSummaryRequest {
  return {
    documentIds: documentIds,
    mode: options.mode || folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF,
    maxTotalTokens: options.maxTotalTokens || 2000,
    includeCrossReferences: options.includeCrossReferences || false
  };
}

/**
 * Builder for ListDocumentsInFolderRequest
 */
export function createListDocumentsInFolderRequest(
  folderPath: string,
  options: {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortOrder?: string;
    typeFilter?: folder_mcp.DocumentType[];
    modifiedAfter?: string;
    modifiedBefore?: string;
  } = {}
): folder_mcp.IListDocumentsInFolderRequest {
  return {
    folderPath: folderPath,
    page: options.page || 1,
    perPage: options.perPage || 50,
    sortBy: options.sortBy || 'modified',
    sortOrder: options.sortOrder || 'desc',
    typeFilter: options.typeFilter || [],
    modifiedAfter: options.modifiedAfter || null,
    modifiedBefore: options.modifiedBefore || null
  };
}

/**
 * Helper function to convert file extension to DocumentType enum
 */
export function getDocumentTypeFromExtension(extension: string): folder_mcp.DocumentType {
  const ext = extension.toLowerCase().replace('.', '');
  
  switch (ext) {
    case 'pdf': return folder_mcp.DocumentType.DOCUMENT_TYPE_PDF;
    case 'docx': return folder_mcp.DocumentType.DOCUMENT_TYPE_DOCX;
    case 'doc': return folder_mcp.DocumentType.DOCUMENT_TYPE_DOC;
    case 'xlsx': return folder_mcp.DocumentType.DOCUMENT_TYPE_XLSX;
    case 'xls': return folder_mcp.DocumentType.DOCUMENT_TYPE_XLS;
    case 'pptx': return folder_mcp.DocumentType.DOCUMENT_TYPE_PPTX;
    case 'ppt': return folder_mcp.DocumentType.DOCUMENT_TYPE_PPT;
    case 'txt': return folder_mcp.DocumentType.DOCUMENT_TYPE_TXT;
    case 'md': return folder_mcp.DocumentType.DOCUMENT_TYPE_MD;
    case 'csv': return folder_mcp.DocumentType.DOCUMENT_TYPE_CSV;
    case 'rtf': return folder_mcp.DocumentType.DOCUMENT_TYPE_RTF;
    case 'odt': return folder_mcp.DocumentType.DOCUMENT_TYPE_ODT;
    case 'ods': return folder_mcp.DocumentType.DOCUMENT_TYPE_ODS;
    case 'odp': return folder_mcp.DocumentType.DOCUMENT_TYPE_ODP;
    case 'html': return folder_mcp.DocumentType.DOCUMENT_TYPE_HTML;
    case 'xml': return folder_mcp.DocumentType.DOCUMENT_TYPE_XML;
    default: return folder_mcp.DocumentType.DOCUMENT_TYPE_UNSPECIFIED;
  }
}
