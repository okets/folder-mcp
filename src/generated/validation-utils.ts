/**
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
