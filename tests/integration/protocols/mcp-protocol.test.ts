/**
 * Integration Tests - MCP Protocol Compliance
 * 
 * Tests for Model Context Protocol implementation and compliance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { MockFactory } from '../../helpers/mock-factories.js';

// Test-specific interfaces
interface MCPServer {
  getCapabilities(): Promise<Capability[]>;
  listTools(): Promise<MCPTool[]>;
  callTool(call: ToolCall): Promise<MCPResponse>;
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  handleBatch?(requests: MCPRequest[]): Promise<MCPResponse[]>;
  handleNotification?(notification: Omit<MCPRequest, 'id'>): Promise<void>;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      default?: any;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
}

interface MCPRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params: Record<string, any>;
}

interface MCPResponse {
  success: boolean;
  result?: Record<string, any>;
  error?: string;
}

interface ToolCall {
  tool: string;
  arguments: Record<string, any>;
}

interface Capability {
  name: string;
  version: string;
}

describe('Integration - MCP Protocol Compliance', () => {
  let tempDir: string;
  let mockMCPServer: Partial<MCPServer>;
  let availableTools: MCPTool[];

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('mcp-protocol-test-');

    // Mock available tools
    availableTools = [
      {
        name: 'search_knowledge',
        description: 'Search for relevant information in the indexed knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query'
            },
            top_k: {
              type: 'number',
              description: 'Number of results to return',
              default: 5
            },
            threshold: {
              type: 'number',
              description: 'Similarity threshold',
              default: 0.7
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_file_content',
        description: 'Retrieve the content of a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the file'
            },
            format: {
              type: 'string',
              description: 'Output format for the file content',
              enum: ['raw', 'highlighted', 'markdown'],
              default: 'raw'
            }
          },
          required: ['file_path']
        }
      },
      {
        name: 'list_files',
        description: 'List files in the indexed folder',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'File pattern to match (glob syntax)'
            },
            file_types: {
              type: 'array',
              description: 'File extensions to include',
              items: { type: 'string' }
            }
          }
        }
      }
    ];

    // Mock MCP server
    mockMCPServer = {
      async getCapabilities(): Promise<Capability[]> {
        return [
          {
            name: 'tools',
            version: '1.0.0'
          },
          {
            name: 'resources',
            version: '1.0.0'
          }
        ];
      },

      async listTools(): Promise<MCPTool[]> {
        return availableTools;
      },

      async callTool(call: ToolCall): Promise<MCPResponse> {
        switch (call.tool) {
          case 'search_knowledge':
            return {
              success: true,
              result: {
                query: call.arguments.query,
                results: [
                  {
                    content: 'Sample search result content',
                    similarity: 0.95,
                    file_path: 'src/example.ts',
                    chunk: 1
                  }
                ],
                total_results: 1,
                search_time: 25
              }
            };

          case 'get_file_content':
            return {
              success: true,
              result: {
                file_path: call.arguments.file_path,
                content: 'Sample file content',
                format: call.arguments.format || 'raw',
                size: 19
              }
            };

          case 'list_files':
            return {
              success: true,
              result: {
                files: [
                  'src/index.ts',
                  'src/types.ts',
                  'docs/readme.md'
                ],
                total_files: 3,
                pattern: call.arguments.pattern
              }
            };

          default:
            return {
              success: false,
              error: `Unknown tool: ${call.tool}`
            };
        }
      },

      async handleRequest(request: MCPRequest): Promise<MCPResponse> {
        switch (request.method) {
          case 'initialize':
            return {
              success: true,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: await this.getCapabilities!(),
                serverInfo: {
                  name: 'folder-mcp',
                  version: '1.0.0'
                }
              }
            };

          case 'tools/list':
            return {
              success: true,
              result: {
                tools: await this.listTools!()
              }
            };

          case 'tools/call':
            return await this.callTool!(request.params as ToolCall);

          default:
            return {
              success: false,
              error: `Unknown method: ${request.method}`
            };
        }
      }
    };
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('Server Capabilities', () => {
    it('should declare proper capabilities', async () => {
      const capabilities = await mockMCPServer.getCapabilities!();

      expect(capabilities).toHaveLength(2);
      expect(capabilities.find(c => c.name === 'tools')).toBeDefined();
      expect(capabilities.find(c => c.name === 'resources')).toBeDefined();
      
      capabilities.forEach(capability => {
        expect(capability.name).toBeTruthy();
        expect(capability.version).toBeTruthy();
      });
    });

    it('should respond to initialization request', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      const response = await mockMCPServer.handleRequest!(request);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      if (response.result) {
        expect(response.result.protocolVersion).toBe('2024-11-05');
        expect(response.result.capabilities).toBeDefined();
        expect(response.result.serverInfo.name).toBe('folder-mcp');
      }
    });
  });

  describe('Tool Management', () => {
    it('should list all available tools', async () => {
      const tools = await mockMCPServer.listTools!();

      expect(tools).toHaveLength(3);
      expect(tools.find(t => t.name === 'search_knowledge')).toBeDefined();
      expect(tools.find(t => t.name === 'get_file_content')).toBeDefined();
      expect(tools.find(t => t.name === 'list_files')).toBeDefined();

      tools.forEach(tool => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it('should provide valid JSON schemas for tools', async () => {
      const tools = await mockMCPServer.listTools!();

      tools.forEach(tool => {
        const schema = tool.inputSchema;
        
        // Basic schema validation
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        
        // Check required fields if present
        if (schema.required) {
          expect(Array.isArray(schema.required)).toBe(true);
          schema.required.forEach(field => {
            expect(schema.properties[field]).toBeDefined();
          });
        }
      });
    });

    it('should handle tools/list request', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      const response = await mockMCPServer.handleRequest!(request);

      expect(response.success).toBe(true);
      expect(response.result?.tools).toHaveLength(3);
      expect(response.result?.tools[0].name).toBeTruthy();
    });
  });

  describe('Tool Execution', () => {
    it('should execute search_knowledge tool', async () => {
      const toolCall: ToolCall = {
        tool: 'search_knowledge',
        arguments: {
          query: 'TypeScript interfaces',
          top_k: 5,
          threshold: 0.8
        }
      };

      const response = await mockMCPServer.callTool!(toolCall);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      if (response.result) {
        expect(response.result.query).toBe('TypeScript interfaces');
        expect(response.result.results).toHaveLength(1);
        expect(response.result.results[0].similarity).toBe(0.95);
        expect(response.result.search_time).toBeGreaterThan(0);
      }
    });

    it('should execute get_file_content tool', async () => {
      const toolCall: ToolCall = {
        tool: 'get_file_content',
        arguments: {
          file_path: 'src/example.ts',
          format: 'highlighted'
        }
      };

      const response = await mockMCPServer.callTool!(toolCall);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      if (response.result) {
        expect(response.result.file_path).toBe('src/example.ts');
        expect(response.result.content).toBeTruthy();
        expect(response.result.format).toBe('highlighted');
        expect(response.result.size).toBeGreaterThan(0);
      }
    });

    it('should execute list_files tool', async () => {
      const toolCall: ToolCall = {
        tool: 'list_files',
        arguments: {
          pattern: '*.ts',
          file_types: ['.ts', '.js']
        }
      };

      const response = await mockMCPServer.callTool!(toolCall);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      if (response.result) {
        expect(response.result.files).toHaveLength(3);
        expect(response.result.total_files).toBe(3);
        expect(response.result.pattern).toBe('*.ts');
      }
    });

    it('should handle tool calls via request', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          tool: 'search_knowledge',
          arguments: {
            query: 'test query'
          }
        }
      };

      const response = await mockMCPServer.handleRequest!(request);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      if (response.result) {
        expect(response.result.query).toBe('test query');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool calls', async () => {
      const toolCall: ToolCall = {
        tool: 'unknown_tool',
        arguments: {}
      };

      const response = await mockMCPServer.callTool!(toolCall);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown tool');
    });

    it('should handle invalid tool arguments', async () => {
      const errorServer: Partial<MCPServer> = {
        async callTool(call: ToolCall): Promise<MCPResponse> {
          if (call.tool === 'search_knowledge' && !call.arguments.query) {
            return {
              success: false,
              error: 'Missing required argument: query'
            };
          }
          
          return { success: true, result: {} };
        }
      };

      const toolCall: ToolCall = {
        tool: 'search_knowledge',
        arguments: {
          top_k: 5
          // Missing required 'query' argument
        }
      };

      const response = await errorServer.callTool!(toolCall);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required argument');
    });

    it('should handle unknown methods', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'unknown/method',
        params: {}
      };

      const response = await mockMCPServer.handleRequest!(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown method');
    });
  });

  describe('Protocol Compliance', () => {
    it('should follow JSON-RPC 2.0 format', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/list',
        params: {}
      };

      const response = await mockMCPServer.handleRequest!(request);

      // Response should have success/error structure (MCP extension to JSON-RPC)
      expect(response).toHaveProperty('success');
      if (response.success) {
        expect(response).toHaveProperty('result');
      } else {
        expect(response).toHaveProperty('error');
      }
    });

    it('should handle batch requests', async () => {
      const batchServer: Partial<MCPServer> = {
        async handleBatch(requests: MCPRequest[]): Promise<MCPResponse[]> {
          return Promise.all(
            requests.map(req => mockMCPServer.handleRequest!(req))
          );
        }
      };

      const requests: MCPRequest[] = [
        {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/list',
          params: {}
        },
        {
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            tool: 'search_knowledge',
            arguments: { query: 'test' }
          }
        }
      ];

      const responses = await batchServer.handleBatch!(requests);

      expect(responses).toHaveLength(2);
      expect(responses[0].success).toBe(true);
      expect(responses[1].success).toBe(true);
    });

    it('should support notifications (requests without id)', async () => {
      const notificationServer: Partial<MCPServer> = {
        async handleNotification(notification: Omit<MCPRequest, 'id'>): Promise<void> {
          // Notifications don't return responses
          // In real implementation, this might log or update internal state
        }
      };

      const notification: Omit<MCPRequest, 'id'> = {
        jsonrpc: '2.0',
        method: 'logging/setLevel',
        params: { level: 'debug' }
      };

      // Should not throw
      await expect(notificationServer.handleNotification!(notification)).resolves.toBeUndefined();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent tool calls', async () => {
      const calls = Array(5).fill(null).map((_, i) => ({
        tool: 'search_knowledge',
        arguments: {
          query: `Query ${i}`,
          top_k: 3
        }
      }));

      const startTime = Date.now();
      const responses = await Promise.all(
        calls.map(call => mockMCPServer.callTool!(call))
      );
      const duration = Date.now() - startTime;

      expect(responses).toHaveLength(5);
      responses.forEach((response, i) => {
        expect(response.success).toBe(true);
        expect(response.result).toBeDefined();
        if (response.result) {
          expect(response.result.query).toBe(`Query ${i}`);
        }
      });
      expect(duration).toBeLessThan(1000); // Should handle concurrent calls efficiently
    });

    it('should respect tool execution timeouts', async () => {
      const timeoutServer: Partial<MCPServer> = {
        async callTool(call: ToolCall): Promise<MCPResponse> {
          // Simulate a long-running operation
          if (call.arguments.simulate_timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          return {
            success: true,
            result: { completed: true }
          };
        }
      };

      const toolCall: ToolCall = {
        tool: 'search_knowledge',
        arguments: {
          query: 'test',
          simulate_timeout: true
        }
      };

      const startTime = Date.now();
      const response = await timeoutServer.callTool!(toolCall);
      const duration = Date.now() - startTime;

      expect(response.success).toBe(true);
      expect(duration).toBeGreaterThan(90); // Should have waited
    });
  });
});
