/**
 * MCP Transport Integration Tests
 * 
 * Tests MCP client-server connectivity and transport layer functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { TestUtils } from '../../helpers/test-utils.ts';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import type { IDependencyContainer } from '../../../src/di/interfaces.js';

describe('MCP Transport Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let testDir: string;
  let container: any; // Use any to access resolveAsync method

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('mcp-transport-');
    
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
        name: 'transport-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
    await TestUtils.cleanupTempDir(testDir);
  });

  describe('Connection Establishment', () => {
    it('should successfully connect to MCP server', async () => {
      await expect(client.connect(transport)).resolves.not.toThrow();
    });

    it('should connect with enhanced features enabled', async () => {
      await client.connect(transport);
      
      // Verify connection is established by listing tools
      const tools = await client.listTools();
      expect(tools.tools).toBeDefined();
      expect(tools.tools.length).toBeGreaterThan(0);
    });

    it('should handle connection errors gracefully', async () => {
      const badTransport = new StdioClientTransport({
        command: 'nonexistent-command',
        args: []
      });

      const badClient = new Client(
        { name: 'bad-client', version: '1.0.0' },
        { capabilities: {} }
      );

      await expect(badClient.connect(badTransport)).rejects.toThrow();
    });
  });

  describe('Client-Server Communication', () => {
    beforeEach(async () => {
      await client.connect(transport);
      // Wait for server initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should maintain persistent connection', async () => {
      // Test multiple requests on same connection
      const tools1 = await client.listTools();
      const tools2 = await client.listTools();
      
      expect(tools1).toEqual(tools2);
    });

    it('should handle concurrent requests', async () => {
      const [toolsResult, resourcesResult] = await Promise.all([
        client.listTools(),
        client.listResources()
      ]);

      expect(toolsResult.tools).toBeDefined();
      expect(resourcesResult.resources).toBeDefined();
    });

    it('should handle transport errors gracefully', async () => {
      // Close connection and try to use it
      await client.close();
      
      await expect(client.listTools()).rejects.toThrow();
    });
  });

  describe('Basic MCP Server Functionality', () => {
    it('should connect and provide basic capabilities', async () => {
      await client.connect(transport);
      
      // Test basic connectivity by listing tools
      const toolsResponse = await client.listTools();
      expect(toolsResponse.tools).toBeDefined();
      expect(toolsResponse.tools.length).toBeGreaterThan(0);
      
      // Test resource listing
      const resourcesResponse = await client.listResources();
      expect(resourcesResponse.resources).toBeDefined();
      
      console.log(`Connected successfully with ${toolsResponse.tools.length} tools and ${resourcesResponse.resources.length} resources`);
    });

    it('should handle enhanced MCP features', async () => {
      await client.connect(transport);
      
      // Verify enhanced features are enabled through environment
      const toolsResponse = await client.listTools();
      const toolNames = toolsResponse.tools.map(t => t.name);
      
      // Should have advanced tools available (indicating enhanced features)
      const enhancedTools = ['search_documents', 'batch_summarize', 'query_table'];
      const hasEnhancedTools = enhancedTools.some(tool => toolNames.includes(tool));
      
      expect(hasEnhancedTools).toBe(true);
    });

    it('should provide detailed tool information', async () => {
      await client.connect(transport);
      
      const toolsResponse = await client.listTools();
      
      // Each tool should have proper metadata
      toolsResponse.tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        
        // Log tool details for verification
        console.log(`Tool: ${tool.name} - ${tool.description}`);
      });
    });
  });
});
