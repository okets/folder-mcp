/**
 * Content Domain Module
 * 
 * This module contains pure business logic for content processing,
 * including chunking, metadata extraction, and content transformation.
 */

// Import standard types
import type { TextChunk, ParsedContent, ChunkedContent } from '../../types/index.js';

// Export chunking implementations
export {
  ContentProcessor,
  type ContentOperations,
  type ChunkingOptions,
  type ContentProcessingMetadata,
  type ProcessedContent,
  type ContentMetadata,
  createContentProcessor,
  chunkText,
  estimateTokenCount,
  findSentenceBoundaries
} from './chunking.js';

// Export processing implementations  
export {
  ContentProcessingService,
  type ContentProcessingOperations,
  type ContentTransformationOptions,
  type ContentEnhancement,
  type EnhancedContent,
  createContentProcessingService
} from './processing.js';

// Re-export types for convenience
export type { TextChunk, ParsedContent, ChunkedContent };
