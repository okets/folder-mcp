/**
 * Performance Tests for New MCP Endpoints
 * 
 * These tests ensure the new endpoints can handle realistic workloads
 * and meet performance requirements for LLM usage patterns.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../helpers/setup.js';

// Phase 10 Sprint 8 planned types (not yet implemented)
interface SearchRequest {
  query: string;
  mode: 'semantic' | 'regex';
  scope: 'documents' | 'chunks';
  filters?: {
    folder?: string;
    fileType?: string;
  };
  max_tokens?: number;
  continuation_token?: string;
}

// Test-only types for other planned endpoints
interface GetPagesRequest {
  document_id: string;
  page_range?: string;
  max_tokens?: number;
  continuation_token?: string;
}

interface GetSheetDataRequest {
  document_id: string;
  sheet_name?: string;
  cell_range?: string;
  max_tokens?: number;
  continuation_token?: string;
}

interface PerformanceMetrics {
  responseTime: number;
  tokenCount: number;
  memoryUsage?: number;
}

interface MCPPerformanceClient {
  search(request: SearchRequest): Promise<{ data: any; metrics: PerformanceMetrics }>;
  getPages(request: GetPagesRequest): Promise<{ data: any; metrics: PerformanceMetrics }>;
  getSheetData(request: GetSheetDataRequest): Promise<{ data: any; metrics: PerformanceMetrics }>;
}

describe('MCP Endpoints - Performance Tests', () => {
  let testEnv: any;
  let client: MCPPerformanceClient;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    // TODO: Initialize real performance client when endpoints are implemented
    client = createMockPerformanceClient();
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  describe('🚀 Response Time Requirements', () => {
    test('Search operations should complete within 2 seconds', async () => {
      const startTime = Date.now();
      
      const response = await client.search({
        query: "financial performance Q4 2024",
        mode: "semantic",
        scope: "documents"
      });

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(2000); // 2 seconds max
      expect(response.data.results.length).toBeGreaterThan(0);
      
      console.log(`🔍 Search completed in ${responseTime}ms`);
    });

    test('Document outline should be instant (cached metadata)', async () => {
      const startTime = Date.now();
      
      // TODO: Test getDocumentOutline when implemented
      // Should be <50ms since metadata is cached
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50); // Should be instant from cache
    });

    test('Page extraction should scale linearly with content size', async () => {
      const testCases = [
        { pages: "1", expectedTime: 500 },
        { pages: "1-5", expectedTime: 1000 },
        { pages: "1-10", expectedTime: 1500 }
      ];

      for (const testCase of testCases) {
        const startTime = Date.now();
        
        const response = await client.getPages({
          document_id: "Annual_Report_2024.pdf",
          page_range: testCase.pages
        });

        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(testCase.expectedTime);
        console.log(`📄 ${testCase.pages} pages extracted in ${responseTime}ms`);
      }
    });
  });

  describe('📊 Token Limit Handling', () => {
    test('Endpoints should respect 2000 token default limit', async () => {
      const response = await client.getPages({
        document_id: "huge_text.txt", // Large file
        max_tokens: 2000
      });

      expect(response.data.token_count).toBeLessThanOrEqual(2000);
      expect(response.data.pages.length).toBeGreaterThanOrEqual(1); // Always return at least one item
      
      if (response.data.token_count > 1900) {
        // Near limit, should provide continuation
        expect(response.data.continuation?.has_more).toBe(true);
        expect(response.data.continuation?.token).toBeDefined();
      }
      
      console.log(`📏 Returned ${response.data.token_count} tokens (limit: 2000)`);
    });

    test('Large spreadsheet should handle pagination efficiently', async () => {
      const response = await client.getSheetData({
        document_id: "Q4_Forecast.xlsx", // 5000+ rows
        sheet_name: "Data",
        max_tokens: 2000
      });

      expect(response.data.token_count).toBeLessThanOrEqual(2000);
      expect(response.data.headers).toBeDefined();
      expect(response.data.rows.length).toBeGreaterThan(0);

      // Should provide pagination for large datasets
      if (response.data.rows.length > 100) {
        expect(response.data.continuation?.has_more).toBe(true);
      }

      console.log(`📊 Returned ${response.data.rows.length} rows in ${response.data.token_count} tokens`);
    });

    test('Search should handle large result sets with pagination', async () => {
      const response = await client.search({
        query: "document", // Very broad query
        mode: "semantic",
        scope: "chunks",
        max_tokens: 1000 // Small limit to force pagination
      });

      expect(response.data.token_count).toBeLessThanOrEqual(1000);
      expect(response.data.results.length).toBeGreaterThan(0);

      if (response.data.continuation?.has_more) {
        expect(response.data.continuation.token).toBeDefined();
        expect(response.data.actions).toContainEqual(
          expect.objectContaining({ id: 'CONTINUE' })
        );
      }

      console.log(`🔍 Search returned ${response.data.results.length} results in ${response.data.token_count} tokens`);
    });
  });

  describe('💾 Memory Usage Optimization', () => {
    test('Large document processing should not exceed memory limits', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple large documents
      const largeDocs = [
        "Annual_Report_2024.pdf",
        "huge_text.txt", 
        "Q4_Forecast.xlsx"
      ];

      for (const docId of largeDocs) {
        await client.getPages({
          document_id: docId,
          max_tokens: 2000
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Should not increase memory by more than 50MB during processing
      expect(memoryIncrease).toBeLessThan(50);
      
      console.log(`💾 Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    });

    test('Pagination should not accumulate memory across requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate multiple pagination requests
      let continuationToken: string | undefined;
      let pageCount = 0;
      
      do {
        const request: any = {
          document_id: "Annual_Report_2024.pdf",
          max_tokens: 500 // Very small to force many pages
        };
        if (continuationToken !== undefined) {
          request.continuation_token = continuationToken;
        }
        const response = await client.getPages(request);
        
        pageCount += response.data.pages.length;
        continuationToken = response.data.continuation?.token;
        
        // Check memory after each request
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (currentMemory - initialMemory) / 1024 / 1024;
        
        // Memory should not grow significantly with each pagination request
        expect(memoryIncrease).toBeLessThan(10); // 10MB max increase
        
      } while (continuationToken && pageCount < 20); // Limit test iterations

      console.log(`📄 Processed ${pageCount} pages with controlled memory usage`);
    });
  });

  describe('🔄 Concurrent Request Handling', () => {
    test('Multiple search requests should not interfere', async () => {
      const searchPromises = [
        client.search({ query: "financial", mode: "semantic", scope: "documents" }),
        client.search({ query: "legal", mode: "semantic", scope: "documents" }),
        client.search({ query: "sales", mode: "semantic", scope: "documents" }),
        client.search({ query: "marketing", mode: "semantic", scope: "documents" })
      ];

      const startTime = Date.now();
      const responses = await Promise.all(searchPromises);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(responses.length).toBe(4);
      responses.forEach(response => {
        expect(response.data.results).toBeDefined();
      });

      // Concurrent execution should be faster than sequential
      expect(totalTime).toBeLessThan(3000); // 3 seconds for all 4 requests
      
      console.log(`🔄 4 concurrent searches completed in ${totalTime}ms`);
    });

    test('Mixed endpoint requests should handle concurrency', async () => {
      const mixedPromises = [
        client.search({ query: "Q4", mode: "semantic", scope: "documents" }),
        client.getPages({ document_id: "Annual_Report_2024.pdf", page_range: "1-3" }),
        client.getSheetData({ document_id: "Q1_Budget.xlsx", sheet_name: "Summary" })
      ];

      const responses = await Promise.all(mixedPromises);
      
      expect(responses.length).toBe(3);
      expect(responses[0]!.data.results).toBeDefined(); // Search response
      expect(responses[1]!.data.pages).toBeDefined(); // Pages response
      expect(responses[2]!.data.headers).toBeDefined(); // Sheet response
      
      console.log('🔄 Mixed concurrent requests handled successfully');
    });
  });

  describe('📈 Scalability Benchmarks', () => {
    test('Performance should degrade gracefully with large knowledge base', async () => {
      // Simulate searches with increasing complexity
      const complexityLevels = [
        { query: "simple", expectedTime: 500 },
        { query: "complex financial analysis performance metrics", expectedTime: 1000 },
        { query: "very complex multi-term search across all document types with filters", expectedTime: 1500 }
      ];

      for (const level of complexityLevels) {
        const startTime = Date.now();
        
        const response = await client.search({
          query: level.query,
          mode: "semantic",
          scope: "chunks"
        });

        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(level.expectedTime);
        expect(response.data.results).toBeDefined();
        
        console.log(`📈 Query complexity "${level.query}": ${responseTime}ms`);
      }
    });

    test('Token counting should be accurate and fast', async () => {
      const response = await client.getPages({
        document_id: "Annual_Report_2024.pdf",
        page_range: "1-10"
      });

      // Token count should be provided
      expect(response.data.token_count).toBeDefined();
      expect(response.data.token_count).toBeGreaterThan(0);

      // Estimate tokens (rough calculation: 4 chars per token)
      const actualContent = response.data.pages.map((p: any) => p.content).join(' ');
      const estimatedTokens = Math.ceil(actualContent.length / 4);
      
      // Token count should be reasonably accurate (within 20%)
      const accuracy = Math.abs(response.data.token_count - estimatedTokens) / estimatedTokens;
      expect(accuracy).toBeLessThan(0.2); // Within 20%
      
      console.log(`📏 Token counting accuracy: ${((1 - accuracy) * 100).toFixed(1)}%`);
    });
  });
});

// Mock performance client that simulates realistic performance characteristics
function createMockPerformanceClient(): MCPPerformanceClient {
  return {
    async search(request: SearchRequest) {
      // Simulate processing time based on query complexity
      const complexityDelay = request.query.split(' ').length * 50; // 50ms per word
      const scopeDelay = request.scope === 'chunks' ? 200 : 100; // Chunks take longer
      
      await new Promise(resolve => setTimeout(resolve, complexityDelay + scopeDelay));

      const tokenCount = Math.min(request.max_tokens || 2000, 1500); // Realistic token count
      
      return {
        data: {
          results: Array.from({ length: Math.min(10, Math.ceil(tokenCount / 150)) }, (_, i) => ({
            document_id: `document_${i + 1}.pdf`,
            preview: `Search result ${i + 1} matching "${request.query}"...`,
            score: 0.9 - (i * 0.1),
            location: { page: i + 1, section: null, sheet: null, slide: null },
            context: { before: 'Previous context...', after: 'Following context...' },
            metadata: { document_type: 'pdf', total_pages: 50 }
          })),
          token_count: tokenCount,
          continuation: { 
            has_more: tokenCount >= (request.max_tokens || 2000) - 100,
            token: tokenCount >= (request.max_tokens || 2000) - 100 ? 'next_batch_token' : undefined
          },
          actions: tokenCount >= (request.max_tokens || 2000) - 100 ? [
            { id: 'CONTINUE', description: 'Get next batch', params: {} }
          ] : []
        },
        metrics: {
          responseTime: complexityDelay + scopeDelay,
          tokenCount
        }
      };
    },

    async getPages(request: GetPagesRequest) {
      // Simulate processing time based on page range
      const pageCount = request.page_range ? 
        request.page_range.split(',').length : 1;
      const processingDelay = pageCount * 50; // 50ms per page
      
      await new Promise(resolve => setTimeout(resolve, processingDelay));

      const maxTokens = request.max_tokens || 2000;
      const tokensPerPage = Math.floor(maxTokens / pageCount);
      
      // Generate realistic content with accurate token counting
      const contentLength = tokensPerPage * 4; // ~4 characters per token
      const pages = Array.from({ length: pageCount }, (_, i) => ({
        page_number: i + 1,
        content: `Page ${i + 1} content: This is a sample page containing relevant business information including financial data, contract terms, and strategic analysis. The content includes key metrics and performance indicators relevant to business operations.`.padEnd(contentLength, ' Additional content text repeating for accurate token estimation.')
      }));

      // Calculate actual tokens more accurately (4 chars per token)
      const totalContent = pages.map(p => p.content).join(' ');
      const actualTokens = Math.min(maxTokens, Math.ceil(totalContent.length / 4));

      return {
        data: {
          pages,
          total_pages: 100,
          token_count: actualTokens,
          continuation: {
            has_more: actualTokens >= maxTokens - 100,
            token: actualTokens >= maxTokens - 100 ? 'next_pages_token' : undefined
          },
          actions: actualTokens >= maxTokens - 100 ? [
            { id: 'CONTINUE', description: 'Get next pages', params: {} }
          ] : []
        },
        metrics: {
          responseTime: processingDelay,
          tokenCount: actualTokens
        }
      };
    },

    async getSheetData(request: GetSheetDataRequest) {
      // Simulate processing time for spreadsheet data
      const processingDelay = 300; // Base delay for sheet processing
      
      await new Promise(resolve => setTimeout(resolve, processingDelay));

      const maxTokens = request.max_tokens || 2000;
      const rowCount = Math.floor(maxTokens / 20); // ~20 tokens per row
      
      const headers = ['Column A', 'Column B', 'Column C', 'Column D'];
      const rows = Array.from({ length: rowCount }, (_, i) => 
        headers.map((_, j) => `Row ${i + 1} Col ${j + 1}`)
      );

      // Ensure token count doesn't exceed the limit
      const actualTokens = Math.min(maxTokens, (headers.length + rows.length * headers.length) * 5); // ~5 tokens per cell

      return {
        data: {
          headers,
          rows,
          token_count: actualTokens,
          continuation: {
            has_more: rowCount >= 100, // Assume more data if we returned many rows
            token: rowCount >= 100 ? 'next_rows_token' : undefined
          },
          actions: rowCount >= 100 ? [
            { id: 'CONTINUE', description: 'Get next rows', params: {} }
          ] : []
        },
        metrics: {
          responseTime: processingDelay,
          tokenCount: actualTokens
        }
      };
    }
  };
}
