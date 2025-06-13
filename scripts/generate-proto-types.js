#!/usr/bin/env node

/**
 * Generate TypeScript types from Protocol Buffer definitions
 * Enhanced version with validation utilities and type guards
 */

import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const protoDir = join(rootDir, 'proto');
const outputDir = join(rootDir, 'src', 'generated');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Generate TypeScript definitions using protobufjs-cli
const cmd = `npx pbjs -t static-module -w es6 -o ${join(outputDir, 'folder-mcp.js')} ${join(protoDir, 'folder-mcp.proto')} && npx pbts -o ${join(outputDir, 'folder-mcp.d.ts')} ${join(outputDir, 'folder-mcp.js')}`;

console.log('Generating TypeScript types from Protocol Buffers...');
console.log('Command:', cmd);

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('Error generating proto types:', error);
    process.exit(1);
  }
  
  if (stderr) {
    console.warn('Warnings:', stderr);
  }
  
  if (stdout) {
    console.log(stdout);
  }
  
  // Generate additional utility files
  generateValidationUtils();
  generateTypeGuards();
  generateMessageBuilders();
  
  console.log('✅ TypeScript types generated successfully in src/generated/');
});

function generateValidationUtils() {
  const validationUtils = `/**
 * Validation utilities for Protocol Buffer messages
 * Generated automatically - do not edit manually
 */

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validate SearchDocsRequest fields
 */
export function validateSearchDocsRequest(request: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!request.query || typeof request.query !== 'string') {
    errors.push({ field: 'query', message: 'Query is required and must be a string' });
  } else if (request.query.length < 1 || request.query.length > 1000) {
    errors.push({ field: 'query', message: 'Query must be between 1 and 1000 characters' });
  }
  
  if (request.top_k !== undefined) {
    if (typeof request.top_k !== 'number' || request.top_k < 1 || request.top_k > 50) {
      errors.push({ field: 'top_k', message: 'top_k must be a number between 1 and 50' });
    }
  }
  
  if (request.document_types && Array.isArray(request.document_types)) {
    if (request.document_types.length > 10) {
      errors.push({ field: 'document_types', message: 'Maximum 10 document types allowed' });
    }
  }
  
  if (request.authors && Array.isArray(request.authors)) {
    if (request.authors.length > 10) {
      errors.push({ field: 'authors', message: 'Maximum 10 authors allowed' });
    }
    for (const author of request.authors) {
      if (typeof author !== 'string' || author.length > 200) {
        errors.push({ field: 'authors', message: 'Each author must be a string with max 200 characters' });
        break;
      }
    }
  }
  
  return errors;
}

/**
 * Validate GetDocSummaryRequest fields
 */
export function validateGetDocSummaryRequest(request: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!request.document_id || typeof request.document_id !== 'string') {
    errors.push({ field: 'document_id', message: 'Document ID is required and must be a string' });
  } else if (request.document_id.length < 1 || request.document_id.length > 255) {
    errors.push({ field: 'document_id', message: 'Document ID must be between 1 and 255 characters' });
  }
  
  if (request.max_tokens !== undefined) {
    if (typeof request.max_tokens !== 'number' || request.max_tokens < 10 || request.max_tokens > 500) {
      errors.push({ field: 'max_tokens', message: 'max_tokens must be a number between 10 and 500' });
    }
  }
  
  if (request.focus_areas && Array.isArray(request.focus_areas)) {
    if (request.focus_areas.length > 10) {
      errors.push({ field: 'focus_areas', message: 'Maximum 10 focus areas allowed' });
    }
  }
  
  return errors;
}

/**
 * Validate BatchDocSummaryRequest fields
 */
export function validateBatchDocSummaryRequest(request: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!request.document_ids || !Array.isArray(request.document_ids)) {
    errors.push({ field: 'document_ids', message: 'Document IDs array is required' });
  } else if (request.document_ids.length < 1 || request.document_ids.length > 50) {
    errors.push({ field: 'document_ids', message: 'Must provide between 1 and 50 document IDs' });
  }
  
  if (request.max_total_tokens !== undefined) {
    if (typeof request.max_total_tokens !== 'number' || request.max_total_tokens < 100 || request.max_total_tokens > 2000) {
      errors.push({ field: 'max_total_tokens', message: 'max_total_tokens must be between 100 and 2000' });
    }
  }
  
  return errors;
}
`;

  writeFileSync(join(outputDir, 'validation-utils.ts'), validationUtils);
}

function generateTypeGuards() {
  const typeGuards = `/**
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
`;

  writeFileSync(join(outputDir, 'type-guards.ts'), typeGuards);
}

function generateMessageBuilders() {
  const messageBuilders = `/**
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
`;

  writeFileSync(join(outputDir, 'message-builders.ts'), messageBuilders);
}
