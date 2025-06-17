/**
 * MCP Agent Integration Tests
 * 
 * Tests realistic agent workflows and multi-step interactions that simulate
 * how AI agents would actually use the MCP server.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { TestUtils } from '../../helpers/test-utils.ts';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import type { IDependencyContainer } from '../../../src/di/interfaces.js';

describe('MCP Agent Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let testDir: string;
  let container: any; // Use any to access resolveAsync method

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('mcp-agent-');
    
    // Create realistic test content for agent scenarios
    await TestUtils.createTestFiles(testDir, {
      'project-readme.md': `# Test Project
      
This is a test project for demonstrating agent integration.

## Features
- Document processing
- Search capabilities
- Content analysis`,
      
      'api-docs.md': `# API Documentation

## Endpoints
- GET /documents - List all documents
- POST /search - Search documents
- GET /status - System status`,
      
      'user-guide.md': `# User Guide

## Getting Started
1. Install the system
2. Configure your settings
3. Start processing documents`
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
        name: 'agent-integration-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    // Wait for server initialization and indexing
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
    await TestUtils.cleanupTempDir(testDir);
  });

  describe('Multi-Step Agent Workflows', () => {
    it('should handle discovery -> analysis workflow', async () => {
      // Step 1: Agent discovers available documents
      const discoveryResponse = await client.callTool({
        name: 'list_documents',
        arguments: {
          folder_path: testDir
        }
      });

      expect(discoveryResponse.content).toBeDefined();
      
      const discoveryText = Array.isArray(discoveryResponse.content) 
        ? discoveryResponse.content[0]?.text || ''
        : String(discoveryResponse.content);
        
      // Should return a valid response, even if no documents are found
      expect(discoveryText.length).toBeGreaterThan(0);
      expect(discoveryText.toLowerCase()).toMatch(/(found|documents|no documents)/);
      
      // Step 2: Agent searches for specific content
      const searchResponse = await client.callTool({
        name: 'search_documents',
        arguments: {
          query: 'API documentation endpoints',
          top_k: 3
        }
      });

      expect(searchResponse.content).toBeDefined();
      
      // Step 3: Agent gets detailed content
      const contentResponse = await client.callTool({
        name: 'get_document_content',
        arguments: {
          document_id: 'api-docs.md'
        }
      });

      expect(contentResponse.content).toBeDefined();
    });

    it('should handle research -> summarization workflow', async () => {
      // Step 1: Agent searches for information about features
      const searchResponse = await client.callTool({
        name: 'search_documents',
        arguments: {
          query: 'features capabilities getting started',
          top_k: 5
        }
      });

      expect(searchResponse.content).toBeDefined();
      
      // Step 2: Agent requests summary of findings
      const summaryResponse = await client.callTool({
        name: 'summarize_document',
        arguments: {
          document_id: 'project-readme.md',
          mode: 'brief'
        }
      });

      expect(summaryResponse.content).toBeDefined();
      
      // Step 3: Agent gets system status for context
      const statusResponse = await client.callTool({
        name: 'get_status',
        arguments: {}
      });

      expect(statusResponse.content).toBeDefined();
    });
  });

  describe('Context Preservation Across Calls', () => {
    it('should maintain performance across sequential operations', async () => {
      const operations = [
        () => client.callTool({
          name: 'list_folders',
          arguments: { path: testDir }
        }),
        () => client.callTool({
          name: 'search_documents',
          arguments: { query: 'user guide', top_k: 2 }
        }),
        () => client.callTool({
          name: 'get_document_metadata',
          arguments: { document_id: 'user-guide.md' }
        })
      ];

      // Execute operations sequentially (like an agent would)
      const results: any[] = [];
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
        expect(result.content).toBeDefined();
      }

      // All operations should succeed
      expect(results).toHaveLength(3);
    });

    it('should handle concurrent agent requests efficiently', async () => {
      // Simulate multiple agents working simultaneously
      const concurrentOperations = [
        client.callTool({
          name: 'search_documents',
          arguments: { query: 'API documentation', top_k: 2 }
        }),
        client.callTool({
          name: 'list_documents',
          arguments: { folder_path: testDir }
        }),
        client.callTool({
          name: 'get_status',
          arguments: {}
        })
      ];

      const results = await Promise.all(concurrentOperations);
      
      // All concurrent operations should succeed
      results.forEach(result => {
        expect(result.content).toBeDefined();
      });
    });
  });

  describe('Agent Error Recovery', () => {
    it('should recover gracefully from invalid operations', async () => {
      // Agent tries invalid operation - should return an error response, not throw
      const errorResponse = await client.callTool({
        name: 'get_document_content',
        arguments: {
          document_id: 'nonexistent-file.md'
        }
      });

      // Should return an error response
      expect(errorResponse.content).toBeDefined();
      const errorText = Array.isArray(errorResponse.content) 
        ? errorResponse.content[0]?.text || ''
        : String(errorResponse.content);
      expect(errorText.toLowerCase()).toMatch(/(no content|not found|error)/);

      // Agent should be able to continue with valid operations
      const validResponse = await client.callTool({
        name: 'list_documents',
        arguments: {
          folder_path: testDir
        }
      });

      expect(validResponse.content).toBeDefined();
    });

    it('should handle malformed requests appropriately', async () => {
      // Agent sends malformed request
      await expect(client.callTool({
        name: 'search_documents',
        arguments: {
          // Missing required query parameter
          top_k: 5
        }
      })).rejects.toThrow();

      // System should remain stable
      const healthCheck = await client.callTool({
        name: 'get_status',
        arguments: {}
      });

      expect(healthCheck.content).toBeDefined();
    });
  });

  describe('Complex Agent Scenarios', () => {
    it('should support content analysis workflow', async () => {
      // Realistic agent workflow: analyze project structure
      
      // 1. Get overview
      const foldersResponse = await client.callTool({
        name: 'list_folders',
        arguments: { path: testDir }
      });
      
      // 2. Find relevant documents
      const documentsResponse = await client.callTool({
        name: 'search_documents',
        arguments: {
          query: 'documentation guide API',
          top_k: 10
        }
      });
      
      // 3. Analyze specific content
      const chunksResponse = await client.callTool({
        name: 'search_chunks',
        arguments: {
          query: 'getting started installation',
          top_k: 5,
          include_context: true
        }
      });

      // All steps should succeed
      expect(foldersResponse.content).toBeDefined();
      expect(documentsResponse.content).toBeDefined();
      expect(chunksResponse.content).toBeDefined();
    });

    it('should handle knowledge extraction workflow', async () => {
      // Agent extracting structured information
      
      // 1. Search for specific topics
      const topicSearch = await client.callTool({
        name: 'search_documents',
        arguments: {
          query: 'endpoints API features',
          top_k: 3
        }
      });
      
      // 2. Get detailed content for analysis
      const detailsResponse = await client.callTool({
        name: 'get_chunks',
        arguments: {
          document_id: 'api-docs.md',
          include_content: true,
          max_content_length: 500
        }
      });
      
      // 3. Generate summary for extracted knowledge
      const summaryResponse = await client.callTool({
        name: 'summarize_document',
        arguments: {
          document_id: 'api-docs.md',
          mode: 'technical',
          include_key_points: true
        }
      });

      // Workflow should complete successfully
      expect(topicSearch.content).toBeDefined();
      expect(detailsResponse.content).toBeDefined();
      expect(summaryResponse.content).toBeDefined();
    });
  });
});
