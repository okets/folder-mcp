/**
 * Content Domain Module
 * 
 * This module contains pure business logic for content processing,
 * including chunking, metadata extraction, and content transformation.
 */

// Import standard types
import type { TextChunk, ParsedContent } from '../../types/index.js';

// Core domain services
export interface ContentOperations {
  chunkText(text: string, options: ChunkingOptions): TextChunk[];
  processContent(content: ParsedContent): ProcessedContent;
  extractMetadata(content: ParsedContent): ContentMetadata;
}

// Re-export TextChunk from shared types for convenience
export type { TextChunk } from '../../types/index.js';

export interface ChunkingOptions {
  maxChunkSize: number;
  overlapSize: number;
  preserveParagraphs?: boolean;
  preserveSentences?: boolean;
}

export interface ProcessedContent {
  originalContent: string;
  chunks: TextChunk[];
  metadata: ContentMetadata;
  filePath: string;
}

export interface ContentMetadata {
  title?: string;
  author?: string;
  language?: string;
  wordCount: number;
  chunkCount: number;
  extractedAt: string;
}

export interface ChunkMetadata {
  type: 'paragraph' | 'sentence' | 'section' | 'fragment';
  importance?: number;
  keywords?: string[];
}

// Domain implementations (to be migrated from existing code)
// export { ContentProcessor } from './processing.js';
// export { ContentChunker } from './chunking.js';
// export { MetadataExtractor } from './metadata.js';
