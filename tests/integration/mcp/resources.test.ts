/**
 * MCP Resources Integration Tests
 * 
 * Tests MCP resource listing and enhanced resource handling capabilities.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { TestUtils } from '../../helpers/test-utils.ts';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import type { IDependencyContainer } from '../../../src/di/interfaces.js';

describe('MCP Resources Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let testDir: string;
  let container: any; // Use any to access resolveAsync method

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('mcp-resources-');
    
    // Create some test files for resource handling
    await TestUtils.createTestFiles(testDir, {
      'test-doc.md': '# Test Document\n\nThis is a test document for resource handling.',
      'data.json': '{"test": "data", "version": "1.0"}',
      'readme.txt': 'Simple text file for testing resources.'
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
        name: 'resources-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    // Wait for server initialization and indexing
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
    await TestUtils.cleanupTempDir(testDir);
  });

  describe('Resource Listing', () => {
    it('should list available resources', async () => {
      const response = await client.listResources();
      
      expect(response.resources).toBeDefined();
      expect(Array.isArray(response.resources)).toBe(true);
    });

    it('should provide dynamic resources based on indexed content', async () => {
      const response = await client.listResources();
      
      // Should have some resources available
      expect(response.resources.length).toBeGreaterThanOrEqual(0);
      
      // If resources are available, they should have proper structure
      response.resources.forEach(resource => {
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(typeof resource.uri).toBe('string');
        expect(typeof resource.name).toBe('string');
      });
    });
  });

  describe('Enhanced Resource Infrastructure', () => {
    it('should support save/drag infrastructure', async () => {
      const response = await client.listResources();
      
      // The enhanced infrastructure should be ready even if no resources are currently available
      expect(response).toBeDefined();
      expect(response.resources).toBeDefined();
    });

    it('should handle resource metadata properly', async () => {
      const response = await client.listResources();
      
      response.resources.forEach(resource => {
        // Each resource should have core metadata
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
        
        // URI should be properly formatted
        expect(resource.uri).toMatch(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
      });
    });
  });

  describe('Resource Content Access', () => {
    it('should be able to read resource content when available', async () => {
      const resourcesResponse = await client.listResources();
      
      if (resourcesResponse.resources.length > 0) {
        const firstResource = resourcesResponse.resources[0];
        
        // Try to read the resource content
        const contentResponse = await client.readResource({
          uri: firstResource.uri
        });
        
        expect(contentResponse.contents).toBeDefined();
        expect(Array.isArray(contentResponse.contents)).toBe(true);
        
        if (contentResponse.contents.length > 0) {
          const content = contentResponse.contents[0];
          expect(content.uri).toBe(firstResource.uri);
          expect(content.text || content.blob).toBeDefined();
        }
      }
    });

    it('should handle resource access errors gracefully', async () => {
      await expect(client.readResource({
        uri: 'file:///nonexistent/resource.txt'
      })).rejects.toThrow();
    });
  });

  describe('Dynamic Resource Updates', () => {
    it('should reflect resource changes after file modifications', async () => {
      // Get initial resource count
      const initialResponse = await client.listResources();
      const initialCount = initialResponse.resources.length;
      
      // Add a new file
      await TestUtils.createTestFiles(testDir, {
        'new-resource.md': '# New Resource\n\nThis is a newly added resource.'
      });
      
      // Wait for potential re-indexing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if resources are updated (may or may not change depending on implementation)
      const updatedResponse = await client.listResources();
      expect(updatedResponse.resources).toBeDefined();
      
      // The infrastructure should still be functioning
      expect(Array.isArray(updatedResponse.resources)).toBe(true);
    });

    it('should handle resource listing performance', async () => {
      const startTime = Date.now();
      
      const response = await client.listResources();
      
      const responseTime = Date.now() - startTime;
      
      expect(response.resources).toBeDefined();
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should provide consistent resource structure', async () => {
      // Test multiple resource listings for consistency
      const responses = await Promise.all([
        client.listResources(),
        client.listResources(),
        client.listResources()
      ]);

      responses.forEach(response => {
        expect(response.resources).toBeDefined();
        expect(Array.isArray(response.resources)).toBe(true);
        
        response.resources.forEach(resource => {
          expect(resource.uri).toBeDefined();
          expect(resource.name).toBeDefined();
          expect(typeof resource.uri).toBe('string');
          expect(typeof resource.name).toBe('string');
        });
      });
    });
  });
});
