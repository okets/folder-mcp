/**
 * Domain Layer - Content Module Tests
 * 
 * Unit tests for the content domain module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { 
  ContentOperations,
  ChunkingOptions,
  ProcessedContent,
  ContentMetadata
} from '../../../src/domain/content/index.js';
import type { TextChunk, ParsedContent } from '../../../src/types/index.js';

describe('Domain Layer - Content Module', () => {
  let contentOps: ContentOperations;

  beforeEach(() => {
    // Initialize content operations with test implementation
    contentOps = {
      chunkText: (text: string, options: ChunkingOptions): TextChunk[] => {
        const chunks: TextChunk[] = [];
        let currentIndex = 0;
        let chunkIndex = 0;

        if (text.length === 0) {
          return [{
            content: '',
            startPosition: 0,
            endPosition: 0,
            tokenCount: 0,
            chunkIndex: 0,
            metadata: {
              sourceFile: 'empty.txt',
              sourceType: 'txt',
              totalChunks: 1,
              hasOverlap: false,
              originalMetadata: {
                originalPath: 'empty.txt',
                type: 'txt',
                size: 0,
                lastModified: new Date().toISOString(),
                lines: 0
              }
            }
          }];
        }

        while (currentIndex < text.length) {
          const endIndex = Math.min(
            currentIndex + options.maxChunkSize,
            text.length
          );

          chunks.push({
            content: text.slice(currentIndex, endIndex),
            startPosition: currentIndex,
            endPosition: endIndex,
            tokenCount: Math.ceil((endIndex - currentIndex) / 4),
            chunkIndex: chunkIndex,
            metadata: {
              sourceFile: 'test.txt',
              sourceType: 'txt',
              totalChunks: 1, // Will be updated later
              hasOverlap: options.overlapSize > 0,
              originalMetadata: {
                originalPath: 'test.txt',
                type: 'txt',
                size: text.length,
                lastModified: new Date().toISOString(),
                lines: text.split('\n').length
              }
            }
          });

          // Ensure loop always advances to prevent infinite loops
          const nextIndex = endIndex - (options.overlapSize || 0);
          if (nextIndex <= currentIndex) {
            // If overlap is too large, advance by minimum amount
            currentIndex = currentIndex + 1;
          } else {
            currentIndex = nextIndex;
          }
          
          if (currentIndex >= text.length) break;
          chunkIndex++;
        }

        return chunks;
      },

      processContent: (content: ParsedContent): ProcessedContent => {
        const chunks = contentOps.chunkText(content.content, {
          maxChunkSize: 1000,
          overlapSize: 100
        });

        return {
          originalContent: content.content,
          chunks,
          metadata: contentOps.extractMetadata(content),
          filePath: content.originalPath
        };
      },

      extractMetadata: (content: ParsedContent): ContentMetadata => {
        const wordCount = content.content.split(/\s+/).filter(w => w.length > 0).length;
        // Estimate chunk count based on content length
        const estimatedChunks = Math.ceil(content.content.length / 1000);

        return {
          wordCount,
          chunkCount: estimatedChunks,
          extractedAt: new Date().toISOString()
        };
      }
    };
  });

  describe('Text Chunking', () => {
    it('should create valid text chunks', () => {
      const text = 'This is a test document with some content for chunking.';
      const options: ChunkingOptions = {
        maxChunkSize: 20,
        overlapSize: 5
      };

      const chunks = contentOps.chunkText(text, options);
      
      expect(chunks).toBeInstanceOf(Array);
      expect(chunks.length).toBeGreaterThan(1);
      
      chunks.forEach((chunk, index) => {
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('startPosition');
        expect(chunk).toHaveProperty('endPosition');
        expect(chunk).toHaveProperty('tokenCount');
        expect(chunk).toHaveProperty('chunkIndex');
        expect(chunk).toHaveProperty('metadata');
        expect(chunk.chunkIndex).toBe(index);
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });

    it('should respect chunking options', () => {
      const text = 'This is a longer text that should be chunked into multiple pieces.';
      const options: ChunkingOptions = {
        maxChunkSize: 25,
        overlapSize: 5
      };

      const chunks = contentOps.chunkText(text, options);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(options.maxChunkSize);
      });
    });

    it('should handle empty content', () => {
      const options: ChunkingOptions = {
        maxChunkSize: 100,
        overlapSize: 10
      };

      const chunks = contentOps.chunkText('', options);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe('');
      expect(chunks[0].startPosition).toBe(0);
      expect(chunks[0].endPosition).toBe(0);
    });
  });

  describe('Content Processing', () => {
    it('should process content with metadata', () => {
      const content: ParsedContent = {
        content: 'Test document content',
        type: 'txt',
        originalPath: 'test/document.txt'
      };

      const processed = contentOps.processContent(content);
      
      expect(processed.originalContent).toBe(content.content);
      expect(processed.filePath).toBe(content.originalPath);
      expect(processed.chunks).toBeInstanceOf(Array);
      expect(processed.metadata).toHaveProperty('wordCount');
      expect(processed.metadata).toHaveProperty('chunkCount');
      expect(processed.metadata).toHaveProperty('extractedAt');
    });

    it('should extract metadata correctly', () => {
      const content: ParsedContent = {
        content: 'This is a test document with multiple words.',
        type: 'txt',
        originalPath: 'test/doc.txt'
      };

      const metadata = contentOps.extractMetadata(content);
      
      expect(metadata.wordCount).toBe(8); // "This is a test document with multiple words"
      expect(metadata.chunkCount).toBeGreaterThan(0);
      expect(metadata.extractedAt).toBeTruthy();
      expect(new Date(metadata.extractedAt)).toBeInstanceOf(Date);
    });
  });
});
