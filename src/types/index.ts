// Types used across the application

/**
 * Represents a unique fingerprint for a file based on its content and metadata
 */
export interface FileFingerprint {
  /** SHA-256 hash of the file content */
  hash: string;
  /** Relative path from the target folder */
  path: string;
  /** File size in bytes */
  size: number;
  /** ISO timestamp of last modification */
  modified: string;
}

/**
 * Index of cached files with metadata
 */
export interface CacheIndex {
  /** ISO timestamp when the cache was generated */
  generated: string;
  /** Total number of files in the cache */
  fileCount: number;
  /** Array of file fingerprints */
  files: FileFingerprint[];
}

/**
 * Status of files comparing current state to cache
 */
export interface CacheStatus {
  /** Files that are new (not in cache) */
  newFiles: FileFingerprint[];
  /** Files that have been modified (hash changed) */
  modifiedFiles: FileFingerprint[];
  /** Files that were deleted (in cache but not on disk) */
  deletedFiles: FileFingerprint[];
  /** Files that haven't changed */
  unchangedFiles: FileFingerprint[];
}

/**
 * Metadata for different file types
 */
export interface FileMetadata {
  /** Original file path */
  originalPath: string;
  /** File type (pdf, docx, xlsx, pptx, txt, md) */
  type: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  lastModified: string;
  /** Additional type-specific metadata */
  [key: string]: unknown;
}

/**
 * PDF-specific metadata
 */
export interface PDFMetadata extends FileMetadata {
  type: 'pdf';
  /** Number of pages in the PDF */
  pages: number;
  /** PDF metadata from the document */
  pdfInfo?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  };
}

/**
 * Word document metadata
 */
export interface WordMetadata extends FileMetadata {
  type: 'docx';
  /** Number of paragraphs */
  paragraphs: number;
  /** Character count */
  charCount?: number;
  /** Word count */
  wordCount?: number;
  /** HTML content */
  htmlContent?: string;
  /** Whether document has images */
  hasImages?: boolean;
  /** Whether document has tables */
  hasTables?: boolean;
  /** Whether document has links */
  hasLinks?: boolean;
  /** Parsing warnings */
  warnings?: string[];
  /** HTML parsing warnings */
  htmlWarnings?: string[];
  /** Document styles found */
  styles?: string[];
  /** Core properties from the document */
  coreProperties?: {
    title?: string;
    author?: string;
    subject?: string;
    description?: string;
    created?: string;
    modified?: string;
  };
}

/**
 * Excel spreadsheet metadata
 */
export interface ExcelMetadata extends FileMetadata {
  type: 'xlsx';
  /** Names of sheets in the workbook */
  sheets: string[];
  /** Number of sheets */
  sheetCount: number;
  /** Character count */
  charCount?: number;
  /** Worksheet details */
  worksheets?: any[];
  /** Total rows across all sheets */
  totalRows?: number;
  /** Total cells across all sheets */
  totalCells?: number;
  /** Total formulas across all sheets */
  totalFormulas?: number;
  /** Whether workbook has formulas */
  hasFormulas?: boolean;
  /** Workbook properties */
  workbookProperties?: {
    title?: string;
    author?: string;
    subject?: string;
    created?: string;
    modified?: string;
  };
}

/**
 * PowerPoint presentation metadata
 */
export interface PowerPointMetadata extends FileMetadata {
  type: 'pptx';
  /** Number of slides */
  slides: number;
  /** Character count */
  charCount?: number;
  /** Word count */
  wordCount?: number;
  /** Slide data */
  slideData?: any[];
  /** Whether presentation has images */
  hasImages?: boolean;
  /** Whether presentation has charts */
  hasCharts?: boolean;
  /** Whether presentation has tables */
  hasTables?: boolean;
  /** Total images count */
  totalImages?: number;
  /** Total charts count */
  totalCharts?: number;
  /** Total tables count */
  totalTables?: number;
  /** Slide titles */
  slideTitles?: string[];
  /** Presentation properties */
  presentationProperties?: {
    title?: string;
    author?: string;
    subject?: string;
    created?: string;
    modified?: string;
  };
}

/**
 * Text file metadata
 */
export interface TextMetadata extends FileMetadata {
  type: 'txt' | 'md';
  /** Number of lines in the file */
  lines: number;
  /** Character encoding */
  encoding?: string;
}

/**
 * Union type for all possible metadata types
 */
export type DocumentMetadata = PDFMetadata | WordMetadata | ExcelMetadata | PowerPointMetadata | TextMetadata;

/**
 * Content extracted from a parsed file
 */
export interface ParsedContent {
  /** Extracted text content */
  content: string;
  /** File type that was parsed */
  type: string;
  /** Original file path */
  originalPath: string;
  /** Type-specific metadata */
  metadata?: DocumentMetadata;
}

/**
 * Content that has been processed and chunked for embedding
 */
export interface ProcessedContent extends ParsedContent {
  /** Array of text chunks */
  chunks: TextChunk[];
  /** Total number of chunks generated */
  totalChunks: number;
  /** Processing timestamp */
  cachedAt: string;
  /** Statistics about the chunking process */
  chunkingStats: {
    originalTokenCount: number;
    averageChunkTokens: number;
    minChunkTokens: number;
    maxChunkTokens: number;
  };
  /** Allow additional properties for JSON serialization */
  [key: string]: unknown;
}

/**
 * A chunk of text with position and metadata information
 */
export interface TextChunk {
  /** The text content of this chunk */
  content: string;
  /** Starting character position in the original content */
  startPosition: number;
  /** Ending character position in the original content */
  endPosition: number;
  /** Estimated token count for this chunk */
  tokenCount: number;
  /** Index of this chunk in the sequence */
  chunkIndex: number;
  /** Metadata about this chunk and its source */
  metadata: {
    /** Path to the source file */
    sourceFile: string;
    /** Type of the source file */
    sourceType: string;
    /** Total number of chunks from this file */
    totalChunks: number;
    /** Whether this chunk has overlap with adjacent chunks */
    hasOverlap: boolean;
    /** Original metadata from the parsed file */
    originalMetadata?: DocumentMetadata;
  };
}

/**
 * Content that has been chunked for processing
 */
export interface ChunkedContent {
  /** The original parsed content */
  originalContent: ParsedContent;
  /** Array of text chunks */
  chunks: TextChunk[];
  /** Total number of chunks generated */
  totalChunks: number;
}

/**
 * Vector embedding representation
 */
export interface EmbeddingVector {
  /** The vector embedding as an array of numbers */
  vector: number[];
  /** Number of dimensions in the vector */
  dimensions: number;
  /** Name of the model used to generate the embedding */
  model: string;
  /** ISO timestamp when the embedding was created */
  createdAt: string;
}

/**
 * Result of embedding generation for a text chunk
 */
export interface EmbeddingResult {
  /** Unique identifier for the chunk */
  chunkId: string;
  /** Path to the source file */
  sourceFile: string;
  /** Index of the chunk within its source file */
  chunkIndex: number;
  /** The embedding vector data */
  embedding: EmbeddingVector;
  /** Additional metadata about the chunk */
  metadata: {
    /** The text content that was embedded */
    content: string;
    /** Estimated token count */
    tokenCount: number;
    /** Type of the source file */
    sourceType: string;
  };
}

/**
 * Search result from vector similarity search
 */
export interface SearchResult {
  /** The matching text chunk */
  chunk: TextChunk;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
  /** Additional context chunks for better understanding */
  context?: {
    /** Previous chunk in the document */
    previous?: TextChunk;
    /** Next chunk in the document */
    next?: TextChunk;
  };
}

/**
 * Enhanced search result with document structure
 */
export interface EnhancedSearchResult extends SearchResult {
  /** Document outline/structure information */
  documentOutline?: OutlineItem[];
  /** Expanded content including paragraph boundaries */
  expandedContent?: string;
}

/**
 * Document outline item for structured documents
 */
export interface OutlineItem {
  /** Title or heading text */
  title: string;
  /** Nesting level (1 = top level) */
  level: number;
  /** Type of outline item */
  type: 'section' | 'slide' | 'sheet' | 'chapter' | 'heading';
  /** Child outline items */
  children?: OutlineItem[];
}

/**
 * Slide structure for PowerPoint documents
 */
export interface Slide {
  /** Slide number (1-based) */
  number: number;
  /** Slide title */
  title: string;
  /** Slide content sections */
  content: string[];
  /** Speaker notes */
  notes?: string;
}

/**
 * Section structure for Word documents
 */
export interface Section {
  /** Section title */
  title: string;
  /** Heading level */
  level: number;
  /** Section content */
  content: string;
  /** Position in document */
  position: number;
}

/**
 * Sheet structure for Excel documents
 */
export interface Sheet {
  /** Sheet name */
  name: string;
  /** Sheet index */
  index: number;
  /** Number of rows with data */
  rows: number;
  /** Number of columns with data */
  columns: number;
  /** Column headers if available */
  headers?: string[];
}

/**
 * Package.json structure for type safety
 */
export interface PackageJson {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package description */
  description?: string;
  /** Main entry point */
  main?: string;
  /** Binary executables */
  bin?: Record<string, string> | string;
  /** Package scripts */
  scripts?: Record<string, string>;
  /** Dependencies */
  dependencies?: Record<string, string>;
  /** Development dependencies */
  devDependencies?: Record<string, string>;
  /** Package keywords */
  keywords?: string[];
  /** Package author */
  author?: string | { name: string; email?: string; url?: string };
  /** Package license */
  license?: string;
  /** Repository information */
  repository?: {
    type: string;
    url: string;
  };
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Error context for error recovery system
 */
export interface ErrorContext {
  /** Operation being performed when error occurred */
  operation: string;
  /** File being processed */
  file?: string;
  /** Additional context data */
  metadata?: Record<string, unknown>;
  /** Timestamp when error occurred */
  timestamp: string;
  /** Error severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Progress tracking data
 */
export interface ProgressData {
  /** Current progress count */
  current: number;
  /** Total items to process */
  total: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp of last update */
  lastUpdated: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}
