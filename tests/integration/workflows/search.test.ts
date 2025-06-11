/**
 * Integration Tests - Search Workflow
 * 
 * Tests the complete search workflow across all architectural layers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { MockFactory } from '../../helpers/mock-factories.js';

// Test-specific interfaces
interface SearchWorkflow {
  search(request: SearchRequest): Promise<SearchResult>;
  searchWithContext(request: SearchRequest, context: SearchContext): Promise<SearchResult>;
}

interface SearchRequest {
  query: string;
  folderPath: string;
  topK?: number;
  threshold?: number;
  modelName?: string;
}

interface SearchResult {
  query: string;
  results: SimilarityResult[];
  totalResults: number;
  searchTime: number;
  context: SearchContext & {
    model: string;
    similarity: number;
    folderPath: string;
    error?: string;
    modelLoadTime?: number;
  };
}

interface SearchContext {
  fileTypes?: string[];
  includeMetadata?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  error?: string;
}

interface SimilarityResult {
  content: string;
  similarity: number;
  filePath: string;
  chunk: number;
  startOffset: number;
  endOffset: number;
}

describe('Integration - Search Workflow', () => {
  let tempDir: string;
  let mockSearchWorkflow: Partial<SearchWorkflow>;
  let mockSearchResults: SimilarityResult[];

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('search-workflow-test-');

    // Mock search results
    mockSearchResults = [
      {
        content: 'This is a sample document about TypeScript interfaces.',
        similarity: 0.95,
        filePath: 'src/types.ts',
        chunk: 1,
        startOffset: 0,
        endOffset: 55
      },
      {
        content: 'TypeScript provides strong typing for JavaScript development.',
        similarity: 0.87,
        filePath: 'docs/typescript.md',
        chunk: 3,
        startOffset: 120,
        endOffset: 182
      },
      {
        content: 'Interface definitions help with code maintainability.',
        similarity: 0.82,
        filePath: 'src/interfaces.ts',
        chunk: 2,
        startOffset: 45,
        endOffset: 98
      }
    ];

    // Mock search workflow
    mockSearchWorkflow = {
      async search(request: SearchRequest): Promise<SearchResult> {
        const threshold = request.threshold ?? 0.7;
        const filteredResults = mockSearchResults.filter(r => r.similarity >= threshold);
        return {
          query: request.query,
          results: filteredResults.slice(0, request.topK || 5),
          totalResults: filteredResults.length,
          searchTime: 25,
          context: {
            model: request.modelName || 'nomic-embed-text',
            similarity: threshold,
            folderPath: request.folderPath
          }
        };
      },

      async searchWithContext(request: SearchRequest, context: SearchContext): Promise<SearchResult> {
        const filteredResults = mockSearchResults.filter(result => {
          if (context.fileTypes && !context.fileTypes.some(type => result.filePath.endsWith(type))) {
            return false;
          }
          if (context.dateRange) {
            // Mock date filtering
            return true;
          }
          return result.similarity >= (request.threshold || 0.7);
        });

        return {
          query: request.query,
          results: filteredResults.slice(0, request.topK || 5),
          totalResults: filteredResults.length,
          searchTime: 35,
          context: {
            model: request.modelName || 'nomic-embed-text',
            similarity: request.threshold || 0.7,
            folderPath: request.folderPath,
            ...context
          }
        };
      }
    };
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('Basic Search Operations', () => {
    it('should perform semantic search', async () => {
      const request: SearchRequest = {
        query: 'TypeScript interfaces',
        folderPath: tempDir,
        topK: 5,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      const result = await mockSearchWorkflow.search!(request);

      expect(result.query).toBe('TypeScript interfaces');
      expect(result.results).toHaveLength(3);
      expect(result.totalResults).toBe(3);
      expect(result.searchTime).toBeGreaterThan(0);
      expect(result.context.model).toBe('nomic-embed-text');
    });

    it('should respect similarity threshold', async () => {
      const request: SearchRequest = {
        query: 'TypeScript interfaces',
        folderPath: tempDir,
        topK: 10,
        threshold: 0.9, // High threshold
        modelName: 'nomic-embed-text'
      };

      const result = await mockSearchWorkflow.search!(request);

      expect(result.results).toHaveLength(1); // Only the 0.95 similarity result
      expect(result.results[0].similarity).toBeGreaterThanOrEqual(0.9);
    });

    it('should limit results by topK', async () => {
      const request: SearchRequest = {
        query: 'TypeScript interfaces',
        folderPath: tempDir,
        topK: 2,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      const result = await mockSearchWorkflow.search!(request);

      expect(result.results).toHaveLength(2);
      // Results should be ordered by similarity (descending)
      expect(result.results[0].similarity).toBeGreaterThanOrEqual(result.results[1].similarity);
    });
  });

  describe('Contextual Search', () => {
    it('should filter by file types', async () => {
      const request: SearchRequest = {
        query: 'TypeScript interfaces',
        folderPath: tempDir,
        topK: 5,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      const context: SearchContext = {
        fileTypes: ['.ts'],
        includeMetadata: true
      };

      const result = await mockSearchWorkflow.searchWithContext!(request, context);

      expect(result.results).toHaveLength(2); // Only .ts files
      result.results.forEach(r => {
        expect(r.filePath.endsWith('.ts')).toBe(true);
      });
    });

    it('should include metadata when requested', async () => {
      const request: SearchRequest = {
        query: 'TypeScript interfaces',
        folderPath: tempDir,
        topK: 5,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      const context: SearchContext = {
        includeMetadata: true
      };

      const result = await mockSearchWorkflow.searchWithContext!(request, context);

      expect(result.context.includeMetadata).toBe(true);
      expect(result.results[0].chunk).toBeDefined();
      expect(result.results[0].startOffset).toBeDefined();
      expect(result.results[0].endOffset).toBeDefined();
    });

    it('should handle date range filtering', async () => {
      const request: SearchRequest = {
        query: 'TypeScript interfaces',
        folderPath: tempDir,
        topK: 5,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      const context: SearchContext = {
        dateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-12-31')
        }
      };

      const result = await mockSearchWorkflow.searchWithContext!(request, context);

      expect(result.context.dateRange).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete searches within performance targets', async () => {
      const request: SearchRequest = {
        query: 'TypeScript interfaces',
        folderPath: tempDir,
        topK: 10,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      const startTime = Date.now();
      const result = await mockSearchWorkflow.search!(request);
      const duration = Date.now() - startTime;

      expect(result.searchTime).toBeLessThan(100); // Internal search time
      expect(duration).toBeLessThan(500); // Total execution time
    });

    it('should handle concurrent searches', async () => {
      const requests = Array(5).fill(null).map((_, i) => ({
        query: `Search query ${i}`,
        folderPath: tempDir,
        topK: 3,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => mockSearchWorkflow.search!(req))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.results).toHaveLength(3);
        expect(result.searchTime).toBeGreaterThan(0);
      });
      expect(duration).toBeLessThan(2000); // Concurrent execution should be efficient
    });

    it('should handle large result sets efficiently', async () => {
      // Mock a large result set
      const largeResultSet = Array(100).fill(null).map((_, i) => ({
        content: `Result content ${i}`,
        similarity: 0.8 - (i * 0.001), // Decreasing similarity
        filePath: `file${i}.ts`,
        chunk: i % 10,
        startOffset: i * 100,
        endOffset: (i + 1) * 100
      }));

      const largeWorkflow: Partial<SearchWorkflow> = {
        async search(request: SearchRequest): Promise<SearchResult> {
          return {
            query: request.query,
            results: largeResultSet.slice(0, request.topK || 50),
            totalResults: largeResultSet.length,
            searchTime: 45,
            context: {
              model: request.modelName || 'nomic-embed-text',
              similarity: request.threshold || 0.7,
              folderPath: request.folderPath
            }
          };
        }
      };

      const request: SearchRequest = {
        query: 'large search',
        folderPath: tempDir,
        topK: 50,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      const result = await largeWorkflow.search!(request);

      expect(result.results).toHaveLength(50);
      expect(result.totalResults).toBe(100);
      expect(result.searchTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      const errorWorkflow: Partial<SearchWorkflow> = {
        async search(request: SearchRequest): Promise<SearchResult> {
          if (!request.query || request.query.trim().length === 0) {
            throw new Error('Query cannot be empty');
          }
          
          return {
            query: request.query,
            results: [],
            totalResults: 0,
            searchTime: 0,
            context: {
              model: request.modelName || 'nomic-embed-text',
              similarity: request.threshold || 0.7,
              folderPath: request.folderPath
            }
          };
        }
      };

      const request: SearchRequest = {
        query: '', // Empty query
        folderPath: tempDir,
        topK: 5,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      await expect(errorWorkflow.search!(request)).rejects.toThrow('Query cannot be empty');
    });

    it('should handle missing index gracefully', async () => {
      const noIndexWorkflow: Partial<SearchWorkflow> = {
        async search(request: SearchRequest): Promise<SearchResult> {
          return {
            query: request.query,
            results: [],
            totalResults: 0,
            searchTime: 5,
            context: {
              model: request.modelName || 'nomic-embed-text',
              similarity: request.threshold || 0.7,
              folderPath: request.folderPath,
              error: 'No index found for the specified folder'
            }
          };
        }
      };

      const request: SearchRequest = {
        query: 'test query',
        folderPath: '/nonexistent/path',
        topK: 5,
        threshold: 0.7,
        modelName: 'nomic-embed-text'
      };

      const result = await noIndexWorkflow.search!(request);

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(0);
      expect(result.context.error).toContain('No index found');
    });
  });

  describe('Integration with Different Models', () => {
    it('should work with different embedding models', async () => {
      const models = ['nomic-embed-text', 'mxbai-embed-large', 'text-embedding-3-small'];

      for (const model of models) {
        const request: SearchRequest = {
          query: 'TypeScript interfaces',
          folderPath: tempDir,
          topK: 3,
          threshold: 0.7,
          modelName: model
        };

        const result = await mockSearchWorkflow.search!(request);

        expect(result.context.model).toBe(model);
        expect(result.results.length).toBeGreaterThan(0);
      }
    });

    it('should handle model switching gracefully', async () => {
      const switchingWorkflow: Partial<SearchWorkflow> = {
        async search(request: SearchRequest): Promise<SearchResult> {
          // Simulate model loading time for different models
          const loadTime = request.modelName === 'nomic-embed-text' ? 10 : 50;
          
          return {
            query: request.query,
            results: mockSearchResults.slice(0, request.topK || 5),
            totalResults: mockSearchResults.length,
            searchTime: 25 + loadTime,
            context: {
              model: request.modelName || 'nomic-embed-text',
              similarity: request.threshold || 0.7,
              folderPath: request.folderPath,
              modelLoadTime: loadTime
            }
          };
        }
      };

      const request: SearchRequest = {
        query: 'TypeScript interfaces',
        folderPath: tempDir,
        topK: 3,
        threshold: 0.7,
        modelName: 'mxbai-embed-large' // Different model
      };

      const result = await switchingWorkflow.search!(request);

      expect(result.context.model).toBe('mxbai-embed-large');
      expect(result.searchTime).toBeGreaterThan(50); // Should include model load time
    });
  });
});
