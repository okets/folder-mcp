// Types used across the application

export interface FileFingerprint {
  hash: string;
  path: string;
  size: number;
  modified: string;
}

export interface CacheIndex {
  generated: string;
  fileCount: number;
  files: FileFingerprint[];
}

export interface CacheStatus {
  newFiles: FileFingerprint[];
  modifiedFiles: FileFingerprint[];
  deletedFiles: FileFingerprint[];
  unchangedFiles: FileFingerprint[];
}

export interface ParsedContent {
  content: string;
  type: string;
  originalPath: string;
  metadata?: any;
}

export interface TextChunk {
  content: string;
  startPosition: number;
  endPosition: number;
  tokenCount: number;
  chunkIndex: number;
  metadata: {
    sourceFile: string;
    sourceType: string;
    totalChunks: number;
    hasOverlap: boolean;
    originalMetadata?: any;
  };
}

export interface ChunkedContent {
  originalContent: ParsedContent;
  chunks: TextChunk[];
  totalChunks: number;
}
