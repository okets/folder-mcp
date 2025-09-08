/**
 * Content Chunking Domain Logic
 * 
 * Pure business logic for text chunking and content processing.
 * Contains algorithms for intelligent text segmentation without external dependencies.
 */

import { ParsedContent, TextChunk, ChunkedContent, createDefaultSemanticMetadata } from '../../types/index.js';

/**
 * Chunking configuration options
 */
export interface ChunkingOptions {
  minTokens?: number;
  maxTokens?: number;
  overlapPercent?: number;
  preserveSentences?: boolean;
  adjustForContentType?: boolean;
}

/**
 * Content processing metadata
 */
export interface ContentProcessingMetadata {
  originalTokenCount: number;
  chunksGenerated: number;
  averageChunkSize: number;
  processingTime: number;
  contentType: string;
}

/**
 * Domain interface for content operations
 */
export interface ContentOperations {
  chunkText(content: ParsedContent, options?: ChunkingOptions): ChunkedContent;
  estimateTokenCount(text: string): number;
  findSentenceBoundaries(text: string): number[];
  processContent(content: ParsedContent): ProcessedContent;
  extractMetadata(content: ParsedContent): ContentMetadata;
}

export interface ProcessedContent extends ParsedContent {
  processingMetadata: ContentProcessingMetadata;
}

export interface ContentMetadata {
  wordCount: number;
  paragraphCount: number;
  estimatedReadingTime: number;
  contentType: string;
  language?: string;
}

/**
 * Content Processor - Core domain logic for content processing and chunking
 */
export class ContentProcessor implements ContentOperations {
  private readonly defaultOptions: ChunkingOptions = {
    minTokens: 200,
    maxTokens: 500,
    overlapPercent: 0.1,
    preserveSentences: true,
    adjustForContentType: true
  };

  /**
   * Estimate token count using word-based approximation
   */
  estimateTokenCount(text: string): number {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return Math.ceil(words.length * 1.3); // Common rule of thumb
  }

  /**
   * Find sentence boundaries to avoid splitting mid-sentence
   */
  findSentenceBoundaries(text: string): number[] {
    const boundaries: number[] = [0];
    const sentenceEnders = /[.!?]+\s+/g;
    let match;
    
    while ((match = sentenceEnders.exec(text)) !== null) {
      const endPos = match.index + match[0].length;
      if (endPos < text.length) {
        boundaries.push(endPos);
      }
    }
    
    if (boundaries[boundaries.length - 1] !== text.length) {
      boundaries.push(text.length);
    }
    
    return boundaries;
  }

  /**
   * Smart text chunking with configurable options
   */
  chunkText(parsedContent: ParsedContent, options: ChunkingOptions = {}): ChunkedContent {
    const opts = { ...this.defaultOptions, ...options };
    const { content, type, originalPath, metadata } = parsedContent;
    
    if (!content || content.trim().length === 0) {
      return {
        originalContent: parsedContent,
        chunks: [],
        totalChunks: 0
      };
    }

    // Adjust parameters based on content type
    let adjustedMinTokens = opts.minTokens!;
    let adjustedMaxTokens = opts.maxTokens!;
    
    if (opts.adjustForContentType) {
      // For dense content types (Excel, CSV-like data), use larger chunk sizes
      if (type === 'excel' || type === 'powerpoint') {
        adjustedMinTokens = opts.minTokens! * 2;
        adjustedMaxTokens = opts.maxTokens! * 2;
      }
    }

    const chunks: TextChunk[] = [];
    
    // First, split on paragraph boundaries (double line breaks)
    const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    
    let globalPosition = 0;
    let chunkIndex = 0;
    let currentChunk = '';
    let chunkStartPos = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (!paragraph) continue;
      
      const paragraphStart = content.indexOf(paragraph, globalPosition);
      
      // Check if adding this paragraph would exceed max tokens
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
      const tokenCount = this.estimateTokenCount(potentialChunk);
      
      if (currentChunk && tokenCount > adjustedMaxTokens) {
        // Current chunk is ready, but we need to check if it meets minimum tokens
        const currentTokenCount = this.estimateTokenCount(currentChunk);
        
        if (currentTokenCount >= adjustedMinTokens) {
          // Create chunk from current content
          chunks.push({
            content: currentChunk,
            startPosition: chunkStartPos,
            endPosition: chunkStartPos + currentChunk.length,
            tokenCount: currentTokenCount,
            chunkIndex: chunkIndex++,
            metadata: {
              sourceFile: originalPath,
              sourceType: type,
              totalChunks: 0,
              hasOverlap: false,
              ...(metadata && { originalMetadata: metadata })
            },
            semanticMetadata: createDefaultSemanticMetadata()
          });
          
          // Calculate overlap for next chunk
          const overlapLength = Math.floor(currentChunk.length * opts.overlapPercent!);
          if (overlapLength > 0 && opts.preserveSentences) {
            // Find the best place to start overlap (sentence boundary if possible)
            const overlapStart = Math.max(0, currentChunk.length - overlapLength);
            const sentenceBoundaries = this.findSentenceBoundaries(currentChunk);
            
            // Find the sentence boundary closest to our desired overlap start
            let bestBoundary = overlapStart;
            for (const boundary of sentenceBoundaries) {
              if (boundary >= overlapStart) {
                bestBoundary = boundary;
                break;
              }
            }
            
            const overlapText = currentChunk.substring(bestBoundary);
            currentChunk = overlapText + '\n\n' + paragraph;
            chunkStartPos = chunkStartPos + bestBoundary;
          } else {
            currentChunk = paragraph;
            chunkStartPos = paragraphStart;
          }
        } else {
          // Current chunk is too small, add this paragraph anyway
          currentChunk = potentialChunk;
        }
      } else if (currentChunk && tokenCount >= adjustedMinTokens && tokenCount <= adjustedMaxTokens) {
        // Perfect size chunk
        currentChunk = potentialChunk;
      } else if (!currentChunk) {
        // Starting a new chunk
        currentChunk = paragraph;
        chunkStartPos = paragraphStart;
      } else {
        // Continue building current chunk
        currentChunk = potentialChunk;
      }
      
      // Update global position
      globalPosition = paragraphStart + paragraph.length;
    }
    
    // Handle the last chunk
    if (currentChunk.trim().length > 0) {
      const lastChunkTokenCount = this.estimateTokenCount(currentChunk);
      
      // If the last chunk is too small, try to merge it with the previous chunk
      if (chunks.length > 0 && lastChunkTokenCount < adjustedMinTokens) {
        const previousChunk = chunks[chunks.length - 1];
        if (previousChunk) {
          const mergedContent = previousChunk.content + '\n\n' + currentChunk;
          const mergedTokenCount = this.estimateTokenCount(mergedContent);
          
          if (mergedTokenCount <= adjustedMaxTokens * 1.2) { // Allow 20% flexibility for last chunk
            // Update the previous chunk with merged content
            chunks[chunks.length - 1] = {
              ...previousChunk,
              content: mergedContent,
              endPosition: chunkStartPos + currentChunk.length,
              tokenCount: mergedTokenCount,
              metadata: {
                ...previousChunk.metadata,
                hasOverlap: false,
                ...(metadata && { originalMetadata: metadata })
              }
            };
          } else {
            // Add as standalone chunk if merging would make it too large
            chunks.push({
              content: currentChunk,
              startPosition: chunkStartPos,
              endPosition: chunkStartPos + currentChunk.length,
              tokenCount: lastChunkTokenCount,
              chunkIndex: chunkIndex++,
              metadata: {
                sourceFile: originalPath,
                sourceType: type,
                totalChunks: 0,
                hasOverlap: false,
                ...(metadata && { originalMetadata: metadata })
              },
              semanticMetadata: createDefaultSemanticMetadata()
            });
          }
        }
      } else {
        chunks.push({
          content: currentChunk,
          startPosition: chunkStartPos,
          endPosition: chunkStartPos + currentChunk.length,
          tokenCount: lastChunkTokenCount,
          chunkIndex: chunkIndex++,
          metadata: {
            sourceFile: originalPath,
            sourceType: type,
            totalChunks: 0,
            hasOverlap: false,
            ...(metadata && { originalMetadata: metadata })
          },
          semanticMetadata: createDefaultSemanticMetadata()
        });
      }
    }
    
    // Update total chunks and overlap flags
    chunks.forEach((chunk, index) => {
      chunk.metadata.totalChunks = chunks.length;
      chunk.metadata.hasOverlap = index > 0;
    });
    
    return {
      originalContent: parsedContent,
      chunks,
      totalChunks: chunks.length
    };
  }

  /**
   * Process content and add processing metadata
   */
  processContent(content: ParsedContent): ProcessedContent {
    const startTime = Date.now();
    const tokenCount = this.estimateTokenCount(content.content);
    
    // For now, processing is just adding metadata
    // This could be extended with additional processing steps
    const processingTime = Date.now() - startTime;
    
    return {
      ...content,
      processingMetadata: {
        originalTokenCount: tokenCount,
        chunksGenerated: 0, // Will be set during chunking
        averageChunkSize: 0, // Will be calculated during chunking
        processingTime,
        contentType: content.type
      }
    };
  }

  /**
   * Extract content metadata for analysis
   */
  extractMetadata(content: ParsedContent): ContentMetadata {
    const text = content.content;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Estimate reading time (average 200 words per minute)
    const estimatedReadingTime = Math.ceil(words.length / 200);
    
    return {
      wordCount: words.length,
      paragraphCount: paragraphs.length,
      estimatedReadingTime,
      contentType: content.type,
      // Language detection could be added here in the future
    };
  }

  /**
   * Validate chunk quality
   */
  validateChunk(chunk: TextChunk): boolean {
    return !!(
      chunk.content &&
      chunk.content.trim().length > 0 &&
      chunk.tokenCount > 0 &&
      chunk.startPosition >= 0 &&
      chunk.endPosition > chunk.startPosition
    );
  }

  /**
   * Calculate chunk statistics
   */
  calculateChunkStatistics(chunks: TextChunk[]): {
    totalChunks: number;
    averageSize: number;
    minSize: number;
    maxSize: number;
    totalTokens: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        averageSize: 0,
        minSize: 0,
        maxSize: 0,
        totalTokens: 0
      };
    }

    const tokenCounts = chunks.map(chunk => chunk.tokenCount);
    const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);
    
    return {
      totalChunks: chunks.length,
      averageSize: Math.round(totalTokens / chunks.length),
      minSize: Math.min(...tokenCounts),
      maxSize: Math.max(...tokenCounts),
      totalTokens
    };
  }
}

/**
 * Default implementation for dependency injection
 */
export const createContentProcessor = (): ContentProcessor => new ContentProcessor();

/**
 * Utility functions for backward compatibility
 */
export function chunkText(parsedContent: ParsedContent, minTokens: number = 200, maxTokens: number = 500, overlapPercent: number = 0.1): ChunkedContent {
  const processor = new ContentProcessor();
  return processor.chunkText(parsedContent, { minTokens, maxTokens, overlapPercent });
}

export function estimateTokenCount(text: string): number {
  const processor = new ContentProcessor();
  return processor.estimateTokenCount(text);
}

export function findSentenceBoundaries(text: string): number[] {
  const processor = new ContentProcessor();
  return processor.findSentenceBoundaries(text);
}
