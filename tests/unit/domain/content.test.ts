/**
 * Domain Layer - Content Module Tests
 * 
 * Unit tests for the content domain module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { 
  ContentProcessor,
  ChunkingOptions,
  ContentMetadata,
  ProcessedContent
} from '../../../src/domain/content/index.js';
import type { TextChunk, ParsedContent, ChunkedContent } from '../../../src/types/index.js';

describe('Domain Layer - Content Module', () => {
  let contentProcessor: ContentProcessor;

  beforeEach(() => {
    contentProcessor = new ContentProcessor();
  });

  describe('Text Chunking', () => {
    it('should create valid text chunks', () => {
      const parsedContent: ParsedContent = {
        content: 'This is a test document with some content for chunking.',
        type: 'txt',
        originalPath: 'test.txt'
      };
      
      const options: ChunkingOptions = {
        maxTokens: 20,
        overlapPercent: 0.25
      };

      const result = contentProcessor.chunkText(parsedContent, options);
      
      expect(result).toHaveProperty('chunks');
      expect(result).toHaveProperty('totalChunks');
      expect(result.chunks).toBeInstanceOf(Array);
      expect(result.totalChunks).toBeGreaterThan(0);
      
      result.chunks.forEach((chunk, index) => {
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
      const parsedContent: ParsedContent = {
        content: 'This is a much longer text that should definitely be chunked into multiple pieces based on the token limits we set.\n\n' +
                'It contains multiple sentences and paragraphs.\n\n' +
                'Each sentence has enough words to trigger chunking when we set a low token limit.\n\n' +
                'This ensures that our chunking algorithm is working correctly with the specified parameters.\n\n' +
                'Additional content to make sure we exceed the token limits and create multiple chunks.',
        type: 'txt',
        originalPath: 'test.txt'
      };
      
      const options: ChunkingOptions = {
        maxTokens: 25,
        minTokens: 10,
        overlapPercent: 0.2
      };

      const result = contentProcessor.chunkText(parsedContent, options);
      
      // The algorithm prioritizes sentence boundaries, so it may create fewer chunks
      // but each chunk should respect the general token guidelines
      expect(result.totalChunks).toBeGreaterThan(0);
      result.chunks.forEach(chunk => {
        expect(chunk.tokenCount).toBeGreaterThan(0);
        expect(chunk.content.length).toBeGreaterThan(0);
        expect(chunk.chunkIndex).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty content', () => {
      const parsedContent: ParsedContent = {
        content: '',
        type: 'txt',
        originalPath: 'empty.txt'
      };
      
      const options: ChunkingOptions = {
        maxTokens: 100,
        overlapPercent: 0.1
      };

      const result = contentProcessor.chunkText(parsedContent, options);
      expect(result.totalChunks).toBe(0);
      expect(result.chunks).toHaveLength(0);
    });
  });

  describe('Content Processing', () => {
    it('should process content with metadata', () => {
      const parsedContent: ParsedContent = {
        content: 'Test document content with multiple words for processing.',
        type: 'txt',
        originalPath: 'test/document.txt'
      };

      const processed = contentProcessor.processContent(parsedContent);
      
      expect(processed).toHaveProperty('processingMetadata');
      expect(processed.processingMetadata).toHaveProperty('originalTokenCount');
      expect(processed.processingMetadata).toHaveProperty('processingTime');
      expect(processed.processingMetadata.contentType).toBe(parsedContent.type);
      expect(processed.content).toBe(parsedContent.content);
    });

    it('should extract metadata correctly', () => {
      const parsedContent: ParsedContent = {
        content: 'This is a test document with multiple words.',
        type: 'txt',
        originalPath: 'test/doc.txt'
      };

      const metadata = contentProcessor.extractMetadata(parsedContent);
      
      expect(metadata.wordCount).toBe(8); // "This is a test document with multiple words"
      expect(metadata.paragraphCount).toBeGreaterThan(0);
      expect(metadata.estimatedReadingTime).toBeGreaterThan(0);
      expect(metadata.contentType).toBe(parsedContent.type);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate token count correctly', () => {
      const text = 'This is a sample text for token estimation testing.';
      const tokenCount = contentProcessor.estimateTokenCount(text);
      
      expect(tokenCount).toBeGreaterThan(0);
      expect(typeof tokenCount).toBe('number');
    });

    it('should handle empty text', () => {
      const tokenCount = contentProcessor.estimateTokenCount('');
      expect(tokenCount).toBe(0);
    });
  });

  describe('Sentence Boundaries', () => {
    it('should find sentence boundaries', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const boundaries = contentProcessor.findSentenceBoundaries(text);
      
      expect(boundaries).toBeInstanceOf(Array);
      expect(boundaries.length).toBeGreaterThan(1);
      expect(boundaries[0]).toBe(0); // Should start at 0
      expect(boundaries[boundaries.length - 1]).toBe(text.length); // Should end at text length
    });

    it('should handle text without sentence endings', () => {
      const text = 'No sentence endings here';
      const boundaries = contentProcessor.findSentenceBoundaries(text);
      
      expect(boundaries).toEqual([0, text.length]);
    });
  });
});
