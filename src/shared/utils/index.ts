/**
 * Shared Utilities Module
 * 
 * This module provides common utilities used across all layers,
 * including validation, helpers, and constants.
 */

// Utility functions and types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface TimeoutOptions {
  timeoutMs: number;
  timeoutMessage?: string;
}

// Common constants
export const FILE_EXTENSIONS = {
  DOCUMENTS: ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf'],
  SPREADSHEETS: ['.xlsx', '.xls', '.csv'],
  PRESENTATIONS: ['.pptx', '.ppt'],
  CODE: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs'],
  CONFIG: ['.json', '.yaml', '.yml', '.toml', '.ini'],
  ALL_SUPPORTED: [] as string[] // Will be populated by combining above
} as const;

export const CACHE_KEYS = {
  FILE_CONTENT: 'file:content:',
  FILE_METADATA: 'file:metadata:',
  EMBEDDINGS: 'embeddings:',
  SEARCH_RESULTS: 'search:',
  CONFIG: 'config:',
} as const;

export const ERROR_CODES = {
  // File operation errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  
  // Parsing errors
  PARSE_ERROR: 'PARSE_ERROR',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  
  // Configuration errors
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING: 'CONFIG_MISSING',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // System errors
  INSUFFICIENT_MEMORY: 'INSUFFICIENT_MEMORY',
  DISK_FULL: 'DISK_FULL',
} as const;

// Utility implementations (to be migrated/created)
// export { validateConfig } from './validation.js';
// export { retry, timeout, delay } from './async.js';
// export { formatBytes, formatDuration, sanitizePath } from './helpers.js';
