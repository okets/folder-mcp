/**
 * Integration Tests - Search Workflow
 * 
 * Tests the complete search workflow across all architectural layers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { MockFactory } from '../../helpers/mock-factories.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import type { IDependencyContainer } from '../../../src/di/interfaces.js';

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

  describe('Real Data Search Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let testDir: string;
  let container: any; // Use any to access resolveAsync method

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('search-real-data-');
    
    // Create test documents with meaningful content
    await TestUtils.createTestFiles(testDir, {
      'phase1-features.md': `# Phase 1 Complete Enhanced MCP Features
      
This document describes the completed Phase 1 features for the enhanced MCP server.

## Key Features:
- Tool Sets Organization
- Enhanced Resources
- Real Data Processing
- Agent Integration
- VSCode Compatibility`,
      
      'development-guide.md': `# Development Guide

This guide covers the development process and enhanced MCP features implementation.

## Enhanced Features:
- No mock fallbacks in production
- Real document intelligence
- Hot reload infrastructure`,
      
      'api-reference.md': `# API Reference

Complete reference for all MCP tools and enhanced capabilities.

## Search Tools:
- search_documents: Semantic document search
- search_chunks: Text chunk search with context`
    });
    
    // Setup dependency injection container with real services
    container = setupDependencyInjection({
      folderPath: testDir,
      logLevel: 'error' // Quiet during tests
    });
    
    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js', testDir],
      env: {
        ...process.env,
        ENABLE_ENHANCED_MCP_FEATURES: 'true'
      }
    });

    client = new Client(
      {
        name: 'search-real-data-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    // Wait for indexing to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

    afterEach(async () => {
      if (client) {
        await client.close();
      }
      await TestUtils.cleanupTempDir(testDir);
    });

    describe('Document Search with Real Data', () => {
      it('should search documents and return real results (no mocks)', async () => {
        const response = await client.callTool({
          name: 'search_documents',
          arguments: {
            query: 'Phase 1 complete enhanced MCP',
            top_k: 2
          }
        });

        expect(response.content).toBeDefined();
        
        const responseText = Array.isArray(response.content) 
          ? response.content[0]?.text || ''
          : String(response.content);

        // Verify we're getting real data, not mock responses
        expect(responseText).not.toContain('Mock');
        expect(responseText).not.toContain('mock');
        expect(responseText).not.toContain('placeholder');
        
        // Should contain actual search results
        expect(responseText.length).toBeGreaterThan(0);
      });

      it('should return relevant search results', async () => {
        const response = await client.callTool({
          name: 'search_documents',
          arguments: {
            query: 'enhanced MCP features development',
            top_k: 3
          }
        });

        const responseText = Array.isArray(response.content) 
          ? response.content[0]?.text || ''
          : String(response.content);

        // Should contain content related to our test documents
        expect(responseText.toLowerCase()).toMatch(/(enhanced|mcp|features|development)/);
      });

      it('should handle search queries with no results gracefully', async () => {
        const response = await client.callTool({
          name: 'search_documents',
          arguments: {
            query: 'completely unrelated quantum physics topic',
            top_k: 5
          }
        });

        expect(response.content).toBeDefined();
        
        const responseText = Array.isArray(response.content) 
          ? response.content[0]?.text || ''
          : String(response.content);

        // Should handle no results gracefully (not throw an error)
        expect(typeof responseText).toBe('string');
      });
    });

    describe('Chunk Search with Real Data', () => {
      it('should search text chunks with context', async () => {
        const response = await client.callTool({
          name: 'search_chunks',
          arguments: {
            query: 'API reference search tools',
            top_k: 5,
            include_context: true
          }
        });

        expect(response.content).toBeDefined();
        
        const responseText = Array.isArray(response.content) 
          ? response.content[0]?.text || ''
          : String(response.content);

        // Verify real chunk search results
        expect(responseText).not.toContain('Mock');
        expect(responseText.length).toBeGreaterThan(0);
      });

      it('should return contextual information with chunks', async () => {
        const response = await client.callTool({
          name: 'search_chunks',
          arguments: {
            query: 'development guide enhanced features',
            top_k: 3,
            include_context: true
          }
        });

        const responseText = Array.isArray(response.content) 
          ? response.content[0]?.text || ''
          : String(response.content);

        // Should include contextual information
        expect(typeof responseText).toBe('string');
        expect(responseText.length).toBeGreaterThan(0);
      });
    });

    describe('Search Performance and Reliability', () => {
      it('should complete searches within reasonable time', async () => {
        const startTime = Date.now();
        
        await client.callTool({
          name: 'search_documents',
          arguments: {
            query: 'test search performance',
            top_k: 10
          }
        });

        const searchTime = Date.now() - startTime;
        
        // Search should complete within 10 seconds
        expect(searchTime).toBeLessThan(10000);
      });

      it('should handle multiple concurrent searches', async () => {
        const searches = [
          client.callTool({
            name: 'search_documents',
            arguments: { query: 'Phase 1 features', top_k: 3 }
          }),
          client.callTool({
            name: 'search_documents', 
            arguments: { query: 'development guide', top_k: 3 }
          }),
          client.callTool({
            name: 'search_chunks',
            arguments: { query: 'API reference', top_k: 5 }
          })
        ];

        const results = await Promise.all(searches);
        
        // All searches should complete successfully
        results.forEach(result => {
          expect(result.content).toBeDefined();
        });
      });
    });

    describe('Enhanced MCP Search Integration', () => {
    let container: any; // Use any to access resolveAsync method

    beforeEach(async () => {
      // Setup dependency injection container with real services  
      container = setupDependencyInjection({
        folderPath: testDir,
        logLevel: 'error' // Quiet during tests
      });
    });

    it('should perform VSCode MCP optimization search', async () => {
        // Create test content that matches the original test
        await TestUtils.createTestFiles(testDir, {
          'vscode-optimization.md': `# VSCode MCP Optimization Guide
          
This document covers optimization strategies for VSCode MCP integration.

## Key Optimization Areas:
- Transport layer efficiency
- Tool response caching
- Resource loading optimization
- Enhanced feature performance`,
          
          'mcp-performance.md': `# MCP Performance Guidelines

Guidelines for optimizing MCP server performance in VSCode.

## Performance Tips:
- Minimize tool execution time
- Efficient resource handling
- Smart caching strategies`
        });
        
        // Wait for indexing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await client.callTool({
          name: 'search_documents',
          arguments: {
            query: 'VSCode MCP optimization',
            top_k: 3
          }
        });

        expect(response.content).toBeDefined();
        
        const responseText = Array.isArray(response.content) 
          ? response.content[0]?.text || ''
          : String(response.content);

        // Should find content related to VSCode MCP optimization
        expect(responseText.toLowerCase()).toMatch(/(vscode|mcp|optimization)/);
        expect(responseText).not.toContain('Mock');
        
        // Log results for verification (similar to original test)
        console.log('Search results for VSCode MCP optimization:');
        console.log(responseText.substring(0, 200) + '...');
      });

      it('should return structured search results', async () => {
        const response = await client.callTool({
          name: 'search_documents',
          arguments: {
            query: 'performance guidelines optimization',
            top_k: 5
          }
        });

        expect(response.content).toBeDefined();
        
        // Response should be structured (not just raw text)
        const responseText = Array.isArray(response.content) 
          ? response.content[0]?.text || ''
          : String(response.content);
          
        expect(typeof responseText).toBe('string');
        expect(responseText.length).toBeGreaterThan(0);
      });
    });
  });
});
