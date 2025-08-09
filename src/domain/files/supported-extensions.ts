/**
 * Central configuration for supported file extensions
 * 
 * This is the single source of truth for all supported file types in the system.
 * Any changes to supported extensions should be made here and will automatically
 * propagate throughout the application.
 */

/**
 * Document extensions that can be parsed and indexed
 * These must have corresponding parsers in FileParser
 */
export const DOCUMENT_EXTENSIONS = [
  '.txt',   // Plain text files
  '.md',    // Markdown files
  '.pdf',   // PDF documents
  '.docx',  // Microsoft Word documents
  '.xlsx',  // Microsoft Excel spreadsheets
  '.pptx'   // Microsoft PowerPoint presentations
] as const;

/**
 * Code/config file extensions (for potential future support)
 * Currently not actively used for document indexing
 */
export const CODE_EXTENSIONS = [
  '.js',    // JavaScript
  '.ts',    // TypeScript
  '.json',  // JSON data
  '.yaml',  // YAML configuration
  '.yml'    // YAML configuration (alternative extension)
] as const;

/**
 * Type for document extensions
 */
export type DocumentExtension = typeof DOCUMENT_EXTENSIONS[number];

/**
 * Type for code extensions
 */
export type CodeExtension = typeof CODE_EXTENSIONS[number];

/**
 * Type for all supported extensions
 */
export type SupportedExtension = DocumentExtension | CodeExtension;

/**
 * Get all supported document extensions for indexing
 * This is the primary function that should be used throughout the application
 */
export function getSupportedExtensions(): readonly string[] {
  return DOCUMENT_EXTENSIONS;
}

/**
 * Get all code/config extensions (for future use)
 */
export function getCodeExtensions(): readonly string[] {
  return CODE_EXTENSIONS;
}

/**
 * Check if a file extension is supported for document indexing
 */
export function isDocumentExtension(extension: string): boolean {
  const normalizedExt = extension.toLowerCase();
  const extWithDot = normalizedExt.startsWith('.') ? normalizedExt : `.${normalizedExt}`;
  return (DOCUMENT_EXTENSIONS as readonly string[]).includes(extWithDot);
}

/**
 * Check if a file extension is a code/config file
 */
export function isCodeExtension(extension: string): boolean {
  const normalizedExt = extension.toLowerCase();
  const extWithDot = normalizedExt.startsWith('.') ? normalizedExt : `.${normalizedExt}`;
  return (CODE_EXTENSIONS as readonly string[]).includes(extWithDot);
}

/**
 * Get the appropriate parser type for an extension
 */
export function getExtensionCategory(extension: string): 'document' | 'code' | 'unsupported' {
  if (isDocumentExtension(extension)) {
    return 'document';
  } else if (isCodeExtension(extension)) {
    return 'code';
  }
  return 'unsupported';
}

/**
 * Configuration for extension handling
 */
export interface ExtensionConfig {
  /** Maximum file size for each extension type (in bytes) */
  maxFileSizes?: Record<string, number>;
  /** Whether to follow symlinks for this extension */
  followSymlinks?: Record<string, boolean>;
  /** Custom timeout for processing this extension (in ms) */
  processingTimeout?: Record<string, number>;
}

/**
 * Default configuration for extensions
 */
export const DEFAULT_EXTENSION_CONFIG: ExtensionConfig = {
  maxFileSizes: {
    '.txt': 10 * 1024 * 1024,  // 10MB
    '.md': 10 * 1024 * 1024,   // 10MB
    '.pdf': 50 * 1024 * 1024,  // 50MB
    '.docx': 50 * 1024 * 1024, // 50MB
    '.xlsx': 100 * 1024 * 1024, // 100MB
    '.pptx': 100 * 1024 * 1024, // 100MB
  },
  processingTimeout: {
    '.txt': 5000,   // 5 seconds
    '.md': 5000,    // 5 seconds
    '.pdf': 30000,  // 30 seconds
    '.docx': 15000, // 15 seconds
    '.xlsx': 30000, // 30 seconds
    '.pptx': 30000, // 30 seconds
  }
};