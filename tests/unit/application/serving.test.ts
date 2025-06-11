/**
 * Application Layer - Serving Workflow Tests
 * 
 * Tests for the content serving application layer interfaces and workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import type {
  ContentServingWorkflow,
  KnowledgeOperations,
  FileContentResult,
  KnowledgeSearchResult,
  EnhancedKnowledgeResult,
  FileListResult,
  KnowledgeSearchItem,
  KnowledgeSearchOptions,
  EnhancedKnowledgeOptions,
  GroupedKnowledgeResults,
  SearchSuggestion,
  RelatedContentResult,
  FileServingMetadata,
  SearchItemMetadata,
  SearchItemContext,
  DocumentInfo,
  RankingWeights,
  FileListItem,
  ServerStatus,
  MemoryUsage,
  PerformanceMetrics
} from '../../../src/application/serving/index.js';

describe('Application Layer - Serving', () => {
  let tempDir: string;
  let mockWorkflow: ContentServingWorkflow;
  let mockKnowledgeOps: KnowledgeOperations;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('serving-test-');

    // Initialize mock workflow
    mockWorkflow = {
      getFileContent: async (filePath: string): Promise<FileContentResult> => {
        return {
          success: true,
          content: 'Mock file content',
          metadata: {
            size: 1000,
            lastModified: new Date(),
            contentType: 'text/plain',
            encoding: 'utf-8',
            isIndexed: true
          }
        };
      },

      searchKnowledge: async (query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeSearchResult> => {
        return {
          success: true,
          results: [{
            filePath: '/test/file.txt',
            content: 'Matching content',
            similarity: 0.95,
            metadata: {
              chunkIndex: 1,
              chunkCount: 5,
              fileSize: 1000,
              lastModified: new Date(),
              relevanceScore: 0.95
            },
            context: {
              beforeText: 'Previous content',
              afterText: 'Following content',
              documentTitle: 'Test Document',
              sectionHeading: 'Test Section'
            }
          }],
          totalResults: 1,
          processingTime: 50,
          query,
          options: options || {}
        };
      },

      getFileList: async (pattern?: string): Promise<FileListResult> => {
        return {
          success: true,
          files: [{
            filePath: '/test/file.txt',
            relativePath: 'file.txt',
            size: 1000,
            lastModified: new Date(),
            type: 'text/plain',
            isIndexed: true
          }],
          totalFiles: 1
        };
      },

      getServerStatus: async (): Promise<ServerStatus> => {
        return {
          isRunning: true,
          uptime: 3600,
          indexedFiles: 100,
          totalChunks: 500,
          lastIndexUpdate: new Date(),
          memoryUsage: {
            used: 500000000,
            total: 1000000000,
            percentage: 50
          },
          performance: {
            averageSearchTime: 50,
            totalSearches: 1000,
            cacheHitRate: 0.85,
            errorRate: 0.01
          }
        };
      }
    };

    // Initialize mock knowledge operations
    mockKnowledgeOps = {
      semanticSearch: async (query: string, options: KnowledgeSearchOptions): Promise<KnowledgeSearchResult> => {
        return {
          success: true,
          results: [{
            filePath: '/test/file.txt',
            content: 'Semantic match',
            similarity: 0.9,
            metadata: {
              chunkIndex: 1,
              chunkCount: 5,
              fileSize: 1000,
              lastModified: new Date(),
              relevanceScore: 0.9
            }
          }],
          totalResults: 1,
          processingTime: 75,
          query,
          options
        };
      },

      enhancedSearch: async (query: string, options: EnhancedKnowledgeOptions): Promise<EnhancedKnowledgeResult> => {
        return {
          success: true,
          results: [{
            filePath: '/test/file.txt',
            content: 'Enhanced match',
            similarity: 0.95,
            metadata: {
              chunkIndex: 1,
              chunkCount: 5,
              fileSize: 1000,
              lastModified: new Date(),
              relevanceScore: 0.95
            }
          }],
          totalResults: 1,
          processingTime: 100,
          query,
          options,
          groupedResults: {
            byDocument: [{
              filePath: '/test/file.txt',
              items: [],
              documentScore: 0.95,
              documentInfo: {
                title: 'Test Document',
                size: 1000,
                lastModified: new Date(),
                type: 'text/plain',
                chunkCount: 5
              }
            }],
            byType: [{
              fileType: 'text/plain',
              items: [],
              typeScore: 0.95
            }],
            byRelevance: [{
              relevanceRange: '0.9-1.0',
              items: [],
              averageScore: 0.95
            }]
          },
          suggestions: [{
            suggestion: 'related query',
            confidence: 0.8,
            type: 'related'
          }],
          relatedQueries: ['related query 1', 'related query 2']
        };
      },

      getRelatedContent: async (filePath: string, similarity?: number): Promise<RelatedContentResult> => {
        return {
          success: true,
          relatedFiles: [{
            filePath: '/test/related.txt',
            similarity: 0.8,
            relationship: 'content',
            summary: 'Related content summary'
          }],
          totalFound: 1
        };
      }
    };
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('ContentServingWorkflow Interface', () => {
    it('should get file content with metadata', async () => {
      const result = await mockWorkflow.getFileContent('/test/file.txt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Mock file content');
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.size).toBe(1000);
      expect(result.metadata?.contentType).toBe('text/plain');
      expect(result.metadata?.isIndexed).toBe(true);
    });

    it('should search knowledge base', async () => {
      const result = await mockWorkflow.searchKnowledge('test query', {
        threshold: 0.8,
        maxResults: 10,
        includeContext: true
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].similarity).toBe(0.95);
      expect(result.results[0].context).toBeDefined();
      expect(result.totalResults).toBe(1);
      expect(result.processingTime).toBe(50);
    });

    it('should get file list', async () => {
      const result = await mockWorkflow.getFileList('*.txt');
      
      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].type).toBe('text/plain');
      expect(result.files[0].isIndexed).toBe(true);
      expect(result.totalFiles).toBe(1);
    });

    it('should get server status', async () => {
      const status = await mockWorkflow.getServerStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.indexedFiles).toBe(100);
      expect(status.totalChunks).toBe(500);
      expect(status.memoryUsage.percentage).toBe(50);
      expect(status.performance.cacheHitRate).toBe(0.85);
    });
  });

  describe('KnowledgeOperations Interface', () => {
    it('should perform semantic search', async () => {
      const result = await mockKnowledgeOps.semanticSearch('test query', {
        threshold: 0.8,
        maxResults: 10
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].similarity).toBe(0.9);
      expect(result.processingTime).toBe(75);
    });

    it('should perform enhanced search', async () => {
      const result = await mockKnowledgeOps.enhancedSearch('test query', {
        threshold: 0.8,
        maxResults: 10,
        includeRelated: true,
        includeSuggestions: true,
        contextWindow: 100,
        rankingWeights: {
          semantic: 0.7,
          recency: 0.1,
          popularity: 0.1,
          exactMatch: 0.1
        }
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.groupedResults.byDocument).toHaveLength(1);
      expect(result.suggestions).toHaveLength(1);
      expect(result.relatedQueries).toHaveLength(2);
      expect(result.processingTime).toBe(100);
    });

    it('should get related content', async () => {
      const result = await mockKnowledgeOps.getRelatedContent('/test/file.txt', 0.8);
      
      expect(result.success).toBe(true);
      expect(result.relatedFiles).toHaveLength(1);
      expect(result.relatedFiles[0].similarity).toBe(0.8);
      expect(result.relatedFiles[0].relationship).toBe('content');
      expect(result.totalFound).toBe(1);
    });
  });
});
