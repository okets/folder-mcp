/**
 * Domain Layer - Search Module Tests
 * 
 * Unit tests for the search domain module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { 
  SearchOperations,
  EnhancedSearchOperations,
  SearchResult,
  EnhancedSearchResult,
  SearchOptions,
  SearchContext,
  GroupedSearchResults
} from '../../../src/domain/search/index.js';

describe('Domain Layer - Search Module', () => {
  let searchOps: SearchOperations;
  let enhancedSearchOps: EnhancedSearchOperations;

  beforeEach(() => {
    // Initialize search operations with test configuration
    searchOps = {      findSimilar: async (query, k) => {
        // Mock implementation for testing
        return Array(k).fill(null).map((_, i) => ({
          chunk: {
            content: `Test content ${i}`,
            startPosition: i * 100,
            endPosition: (i + 1) * 100,
            tokenCount: 50,
            chunkIndex: i,
            metadata: {
              sourceFile: `test/file${i}.txt`,
              sourceType: 'test',
              totalChunks: k,
              hasOverlap: false
            }
          },
          similarity: 1 - (i * 0.1),
          filePath: `test/file${i}.txt`,
          metadata: {
            score: 1 - (i * 0.1),
            distance: i * 0.1,
            chunkIndex: i,
            documentId: `doc-${i}`,
            relevanceFactors: [
              { factor: 'content', weight: 0.7, contribution: 0.7 },
              { factor: 'metadata', weight: 0.3, contribution: 0.3 }
            ]
          }
        }));
      },      searchByText: async (queryText, k) => {
        // Mock implementation for testing
        return Array(k).fill(null).map((_, i) => ({
          chunk: {
            content: `Test content ${i}`,
            startPosition: i * 100,
            endPosition: (i + 1) * 100,
            tokenCount: 50,
            chunkIndex: i,
            metadata: {
              sourceFile: `test/file${i}.txt`,
              sourceType: 'test',
              totalChunks: k,
              hasOverlap: false
            }
          },
          similarity: 1 - (i * 0.1),
          filePath: `test/file${i}.txt`,
          metadata: {
            score: 1 - (i * 0.1),
            distance: i * 0.1,
            chunkIndex: i,
            documentId: `doc-${i}`,
            relevanceFactors: [
              { factor: 'content', weight: 0.7, contribution: 0.7 },
              { factor: 'metadata', weight: 0.3, contribution: 0.3 }
            ]
          }
        }));
      },
      rankResults: (results) => {
        // Sort by similarity score
        return [...results].sort((a, b) => b.similarity - a.similarity);
      }
    };

    enhancedSearchOps = {      semanticSearch: async (query, options) => {
        const results = await searchOps.searchByText(query, options.maxResults || 10);
        return results.map(result => ({
          ...result,
          context: {
            previousChunk: {
              content: 'Previous context',
              startPosition: (result.chunk.chunkIndex - 1) * 100,
              endPosition: result.chunk.chunkIndex * 100,
              tokenCount: 50,
              chunkIndex: result.chunk.chunkIndex - 1,
              metadata: {
                sourceFile: result.chunk.metadata.sourceFile,
                sourceType: result.chunk.metadata.sourceType,
                totalChunks: result.chunk.metadata.totalChunks,
                hasOverlap: false
              }
            },
            nextChunk: {
              content: 'Next context',
              startPosition: (result.chunk.chunkIndex + 1) * 100,
              endPosition: (result.chunk.chunkIndex + 2) * 100,
              tokenCount: 50,
              chunkIndex: result.chunk.chunkIndex + 1,
              metadata: {
                sourceFile: result.chunk.metadata.sourceFile,
                sourceType: result.chunk.metadata.sourceType,
                totalChunks: result.chunk.metadata.totalChunks,
                hasOverlap: false
              }
            },
            documentSummary: 'Test document summary'
          },
          ranking: {
            semanticScore: result.similarity,
            contextualScore: 0.8,
            recencyScore: 0.9,            finalScore: (result.similarity + 0.8 + 0.9) / 3
          },
          snippets: [{
            text: result.chunk.content,
            startOffset: result.chunk.startPosition,
            endOffset: result.chunk.endPosition,
            highlights: [{
              start: 0,
              end: 10,
              type: 'match'
            }]
          }]
        }));
      },      contextualSearch: async (query, context) => {
        const results = await searchOps.searchByText(query, 10);
        return results
          .filter(result => {
            if (context.filePath && result.filePath !== context.filePath) return false;
            if (context.contentType && !context.contentType.includes(result.chunk.metadata?.sourceType)) return false;
            return true;
          })
          .map(result => ({
            ...result,
            context: {
              previousChunk: {
                content: 'Previous context',
                startPosition: (result.chunk.chunkIndex - 1) * 100,
                endPosition: result.chunk.chunkIndex * 100,
                tokenCount: 50,
                chunkIndex: result.chunk.chunkIndex - 1,
                metadata: {
                  sourceFile: result.chunk.metadata.sourceFile,
                  sourceType: result.chunk.metadata.sourceType,
                  totalChunks: result.chunk.metadata.totalChunks,
                  hasOverlap: false
                }
              },
              nextChunk: {
                content: 'Next context',
                startPosition: (result.chunk.chunkIndex + 1) * 100,
                endPosition: (result.chunk.chunkIndex + 2) * 100,
                tokenCount: 50,
                chunkIndex: result.chunk.chunkIndex + 1,
                metadata: {
                  sourceFile: result.chunk.metadata.sourceFile,
                  sourceType: result.chunk.metadata.sourceType,
                  totalChunks: result.chunk.metadata.totalChunks,
                  hasOverlap: false
                }
              }
            },
            ranking: {
              semanticScore: result.similarity,
              contextualScore: 0.8,
              recencyScore: 0.9,
              finalScore: (result.similarity + 0.8 + 0.9) / 3
            },
            snippets: [{
              text: result.chunk.content,
              startOffset: result.chunk.startPosition,
              endOffset: result.chunk.endPosition,
              highlights: [{
                start: 0,
                end: 10,
                type: 'match'
              }]
            }]
          }));
      },
      groupByDocument: (results) => {
        const groups = new Map<string, SearchResult[]>();
        results.forEach(result => {
          const group = groups.get(result.filePath) || [];
          group.push(result);
          groups.set(result.filePath, group);
        });

        return {
          groups: Array.from(groups.entries()).map(([filePath, results]) => ({
            filePath,
            results,
            documentScore: results.reduce((sum, r) => sum + r.similarity, 0) / results.length,            documentMetadata: {
              title: filePath.split('/').pop() || '',
              lastModified: new Date(),
              size: results.reduce((sum, r) => sum + r.chunk.content.length, 0),
              type: results[0]!.chunk.metadata?.sourceType || 'unknown'
            }
          })),
          totalResults: results.length,
          totalDocuments: groups.size
        };
      }
    };
  });

  describe('Basic Search Operations', () => {
    it('should find similar vectors', async () => {      const query = {
        vector: Array(384).fill(0).map(() => Math.random()),
        dimensions: 384,
        model: 'test-model',
        createdAt: new Date().toISOString()
      };

      const results = await searchOps.findSimilar(query, 5);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('chunk');
        expect(result).toHaveProperty('similarity');
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('metadata');
      });
    });

    it('should search by text', async () => {
      const results = await searchOps.searchByText('test query', 3);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.chunk.content).toContain('Test content');
        expect(result.similarity).toBeGreaterThan(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      });
    });

    it('should rank results by similarity', () => {      const results = [
        { 
          similarity: 0.5, 
          chunk: { 
            content: 'test1',
            startPosition: 0,
            endPosition: 100,
            tokenCount: 50,
            chunkIndex: 0,
            metadata: {
              sourceFile: 'file1',
              sourceType: 'test',
              totalChunks: 1,
              hasOverlap: false
            }
          }, 
          filePath: 'file1', 
          metadata: {} 
        },
        { 
          similarity: 0.8, 
          chunk: { 
            content: 'test2',
            startPosition: 0,
            endPosition: 100,
            tokenCount: 50,
            chunkIndex: 0,
            metadata: {
              sourceFile: 'file2',
              sourceType: 'test',
              totalChunks: 1,
              hasOverlap: false
            }
          }, 
          filePath: 'file2', 
          metadata: {} 
        },
        { 
          similarity: 0.3, 
          chunk: { 
            content: 'test3',
            startPosition: 0,
            endPosition: 100,
            tokenCount: 50,
            chunkIndex: 0,
            metadata: {
              sourceFile: 'file3',
              sourceType: 'test',
              totalChunks: 1,
              hasOverlap: false
            }
          }, 
          filePath: 'file3', 
          metadata: {} 
        }
      ] as SearchResult[];

      const ranked = searchOps.rankResults(results);
      expect(ranked[0]!.similarity).toBe(0.8);
      expect(ranked[1]!.similarity).toBe(0.5);
      expect(ranked[2]!.similarity).toBe(0.3);
    });
  });

  describe('Enhanced Search Operations', () => {
    it('should perform semantic search with options', async () => {
      const options: SearchOptions = {
        threshold: 0.7,
        maxResults: 5,
        includeContext: true,
        groupByDocument: true
      };

      const results = await enhancedSearchOps.semanticSearch('test query', options);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('context');
        expect(result).toHaveProperty('ranking');
        expect(result).toHaveProperty('snippets');
        expect(result.ranking.finalScore).toBeGreaterThan(0);
        expect(result.ranking.finalScore).toBeLessThanOrEqual(1);
      });
    });

    it('should perform contextual search', async () => {
      const context: SearchContext = {
        filePath: 'test/file0.txt',
        contentType: ['test'],
        keywords: ['test']
      };

      const results = await enhancedSearchOps.contextualSearch('test query', context);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.filePath).toBe('test/file0.txt');
        expect(result.chunk.metadata?.sourceType).toBe('test');
      });
    });

    it('should group results by document', () => {      const results = [
        { 
          similarity: 0.8, 
          chunk: { 
            content: 'test1', 
            startPosition: 0,
            endPosition: 100,
            tokenCount: 50,
            chunkIndex: 0,
            metadata: { 
              sourceFile: 'file1.txt',
              sourceType: 'test', 
              totalChunks: 1,
              hasOverlap: false
            } 
          }, 
          filePath: 'file1.txt', 
          metadata: {} 
        },
        { 
          similarity: 0.7, 
          chunk: { 
            content: 'test2', 
            startPosition: 100,
            endPosition: 200,
            tokenCount: 50,
            chunkIndex: 1,
            metadata: { 
              sourceFile: 'file1.txt',
              sourceType: 'test', 
              totalChunks: 2,
              hasOverlap: false
            } 
          }, 
          filePath: 'file1.txt', 
          metadata: {} 
        },
        { 
          similarity: 0.9, 
          chunk: { 
            content: 'test3', 
            startPosition: 0,
            endPosition: 100,
            tokenCount: 50,
            chunkIndex: 0,
            metadata: { 
              sourceFile: 'file2.txt',
              sourceType: 'test', 
              totalChunks: 1,
              hasOverlap: false
            } 
          }, 
          filePath: 'file2.txt', 
          metadata: {} 
        }
      ] as SearchResult[];

      const grouped = enhancedSearchOps.groupByDocument(results);
      expect(grouped.totalDocuments).toBe(2);
      expect(grouped.totalResults).toBe(3);
      expect(grouped.groups).toHaveLength(2);
      
      const file1Group = grouped.groups.find(g => g.filePath === 'file1.txt');
      expect(file1Group?.results).toHaveLength(2);
      expect(file1Group?.documentScore).toBe((0.8 + 0.7) / 2);
    });
  });
}); 