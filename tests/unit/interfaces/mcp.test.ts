/**
 * Interface Layer - MCP Interface Tests
 * 
 * Tests for the MCP (Model Context Protocol) interface layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import type {
  MCPServerInterface,
  MCPRequestHandler,
  MCPError,
  MCPCapabilities,
  MCPTool,
  MCPResource,
  MCPMessage
} from '../../../src/interfaces/mcp/index.js';

describe('Interface Layer - MCP', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('mcp-test-');
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('MCPServer Interface', () => {
    it('should define proper MCP server contract', () => {
      const mockServer: MCPServerInterface = {
        start: async (): Promise<void> => {},
        stop: async (): Promise<void> => {},
        isRunning: (): boolean => false,
        getCapabilities: (): MCPCapabilities => ({
          tools: true,
          resources: true,
          prompts: true,
          completion: true,
          roots: true
        })
      };

      expect(mockServer.start).toBeDefined();
      expect(mockServer.stop).toBeDefined();
      expect(mockServer.isRunning).toBeDefined();
      expect(mockServer.getCapabilities).toBeDefined();
    });

    it('should manage server lifecycle properly', async () => {
      let running = false;
      
      const mockServer: Partial<MCPServerInterface> = {
        start: async (): Promise<void> => {
          running = true;
        },
        
        stop: async (): Promise<void> => {
          running = false;
        },
        
        isRunning: (): boolean => running
      };

      expect(mockServer.isRunning?.()).toBe(false);
      
      await mockServer.start?.();
      expect(mockServer.isRunning?.()).toBe(true);
      
      await mockServer.stop?.();
      expect(mockServer.isRunning?.()).toBe(false);
    });

    it('should handle tool registration and management', () => {
      const tools = new Map<string, MCPTool>();
      
      const mockServer = {
        registerTool: (tool: MCPTool): void => {
          tools.set(tool.name, tool);
        },
        
        unregisterTool: (name: string): boolean => {
          return tools.delete(name);
        },
        
        listTools: (): MCPTool[] => {
          return Array.from(tools.values());
        }
      };

      const searchTool: MCPTool = {
        name: 'search',
        description: 'Search for files and content',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum results', default: 10 }
          },
          required: ['query']
        }
      };

      const indexTool: MCPTool = {
        name: 'index',
        description: 'Index directory contents',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' },
            recursive: { type: 'boolean', description: 'Index recursively', default: true }
          },
          required: ['path']
        }
      };

      mockServer.registerTool(searchTool);
      mockServer.registerTool(indexTool);
      
      expect(mockServer.listTools()).toHaveLength(2);
      expect(mockServer.listTools()[0].name).toBe('search');
      expect(mockServer.listTools()[1].name).toBe('index');
      
      const removed = mockServer.unregisterTool('search');
      expect(removed).toBe(true);
      expect(mockServer.listTools()).toHaveLength(1);
      expect(mockServer.listTools()[0].name).toBe('index');
    });

    it('should handle resource registration and management', () => {
      const resources = new Map<string, MCPResource>();
      
      const mockServer = {
        registerResource: (resource: MCPResource): void => {
          resources.set(resource.uri, resource);
        },
        
        unregisterResource: (uri: string): boolean => {
          return resources.delete(uri);
        },
        
        listResources: (): MCPResource[] => {
          return Array.from(resources.values());
        }
      };

      const fileResource: MCPResource = {
        uri: 'file:///project/src/main.ts',
        name: 'Main TypeScript File',
        description: 'Primary application entry point',
        mimeType: 'text/typescript'
      };

      const directoryResource: MCPResource = {
        uri: 'file:///project/docs/',
        name: 'Documentation Directory',
        description: 'Project documentation files',
        mimeType: 'inode/directory'
      };

      mockServer.registerResource(fileResource);
      mockServer.registerResource(directoryResource);
      
      expect(mockServer.listResources()).toHaveLength(2);
      
      const resources_list = mockServer.listResources();
      expect(resources_list.find(r => r.name === 'Main TypeScript File')).toBeDefined();
      expect(resources_list.find(r => r.name === 'Documentation Directory')).toBeDefined();
      
      const removed = mockServer.unregisterResource('file:///project/src/main.ts');
      expect(removed).toBe(true);
      expect(mockServer.listResources()).toHaveLength(1);
    });
  });

  describe('MCPHandler Interface', () => {
    it('should define proper handler contract', () => {
      const mockHandler: MCPRequestHandler<MCPMessage, MCPMessage> = {
        handle: async (request: MCPMessage): Promise<MCPMessage> => {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              success: true,
              data: 'Handler response'
            }
          };
        },
        
        validate: (request: MCPMessage): boolean => {
          return request.method === 'tools/call';
        },

        getMethodName: (): string => 'tools/call'
      };

      expect(mockHandler.handle).toBeDefined();
      expect(mockHandler.validate).toBeDefined();
      expect(mockHandler.getMethodName()).toBe('tools/call');
    });

    it('should handle different MCP methods', async () => {
      const handlers = new Map<string, MCPRequestHandler<MCPMessage, MCPMessage>>();

      // Tools call handler
      const toolsHandler: MCPRequestHandler<MCPMessage, MCPMessage> = {
        handle: async (request: MCPMessage): Promise<MCPMessage> => {
          const { name, arguments: args } = request.params;
          
          if (name === 'search') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [
                  { type: 'text', text: `Search results for: ${args.query}` }
                ]
              }
            };
          }
          
          throw new Error(`Unknown tool: ${name}`);
        },
        validate: (request: MCPMessage): boolean => request.method === 'tools/call',
        getMethodName: (): string => 'tools/call'
      };

      // Resources list handler
      const resourcesHandler: MCPRequestHandler<MCPMessage, MCPMessage> = {
        handle: async (request: MCPMessage): Promise<MCPMessage> => {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              resources: [
                {
                  uri: 'file:///test.txt',
                  name: 'Test File',
                  mimeType: 'text/plain'
                }
              ]
            }
          };
        },
        validate: (request: MCPMessage): boolean => request.method === 'resources/list',
        getMethodName: (): string => 'resources/list'
      };

      handlers.set('tools/call', toolsHandler);
      handlers.set('resources/list', resourcesHandler);

      // Test tools call
      const toolsRequest: MCPMessage = {
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'typescript' }
        }
      };

      const toolsResponse = await handlers.get('tools/call')?.handle(toolsRequest);
      expect(toolsResponse?.result.content[0].text).toContain('typescript');

      // Test resources list
      const resourcesRequest: MCPMessage = {
        jsonrpc: '2.0',
        id: '2',
        method: 'resources/list',
        params: {}
      };

      const resourcesResponse = await handlers.get('resources/list')?.handle(resourcesRequest);
      expect(resourcesResponse?.result.resources).toHaveLength(1);
      expect(resourcesResponse?.result.resources[0].name).toBe('Test File');
    });
  });

  describe('MCP Request and Response', () => {
    it('should handle proper request structure', () => {
      const request: MCPMessage = {
        jsonrpc: '2.0',
        id: 'req-123',
        method: 'tools/call',
        params: {
          name: 'index',
          arguments: {
            path: '/project/src',
            recursive: true,
            exclude: ['node_modules', '*.test.ts']
          }
        }
      };

      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe('req-123');
      expect(request.method).toBe('tools/call');
      expect(request.params.name).toBe('index');
      expect(request.params.arguments.path).toBe('/project/src');
      expect(request.params.arguments.recursive).toBe(true);
    });

    it('should handle different response types', () => {
      // Success response
      const successResponse: MCPMessage = {
        jsonrpc: '2.0',
        id: 'req-123',
        result: {
          content: [
            {
              type: 'text',
              text: 'Successfully indexed 42 files'
            }
          ],
          isError: false
        }
      };

      // Error response
      const errorResponse: MCPMessage = {
        jsonrpc: '2.0',
        id: 'req-456',
        error: {
          code: -32602,
          message: 'Invalid params',
          data: {
            field: 'path',
            reason: 'Directory does not exist'
          }
        }
      };

      expect(successResponse.result?.content[0].text).toContain('42 files');
      expect(successResponse.result?.isError).toBe(false);
      
      expect(errorResponse.error?.code).toBe(-32602);
      expect(errorResponse.error?.message).toBe('Invalid params');
      expect(errorResponse.error?.data.field).toBe('path');
    });

    it('should handle streaming responses', () => {
      const streamingResponse: MCPMessage = {
        jsonrpc: '2.0',
        id: 'req-789',
        result: {
          content: [
            {
              type: 'text',
              text: 'Processing file 1 of 100...'
            }
          ],
          isError: false,
          meta: {
            progress: {
              current: 1,
              total: 100,
              percentage: 1
            }
          }
        }
      };

      expect(streamingResponse.result?.meta?.progress?.current).toBe(1);
      expect(streamingResponse.result?.meta?.progress?.total).toBe(100);
      expect(streamingResponse.result?.meta?.progress?.percentage).toBe(1);
    });
  });

  describe('MCP Capabilities', () => {
    it('should define comprehensive server capabilities', () => {
      const capabilities: MCPCapabilities = {
        tools: true,
        resources: true,
        prompts: true,
        completion: true,
        roots: true
      };

      expect(capabilities.tools).toBe(true);
      expect(capabilities.resources).toBe(true);
      expect(capabilities.prompts).toBe(true);
      expect(capabilities.completion).toBe(true);
      expect(capabilities.roots).toBe(true);
    });

    it('should support capability negotiation', () => {
      const clientCapabilities: MCPCapabilities = {
        tools: true,
        resources: false,
        prompts: true,
        completion: true,
        roots: false
      };

      const serverCapabilities: MCPCapabilities = {
        tools: true,
        resources: true,
        prompts: false,
        completion: true,
        roots: true
      };

      // Negotiate common capabilities
      const negotiatedCapabilities: MCPCapabilities = {
        tools: clientCapabilities.tools && serverCapabilities.tools,
        resources: clientCapabilities.resources && serverCapabilities.resources,
        prompts: clientCapabilities.prompts && serverCapabilities.prompts,
        completion: clientCapabilities.completion && serverCapabilities.completion,
        roots: clientCapabilities.roots && serverCapabilities.roots
      };

      expect(negotiatedCapabilities.tools).toBe(true);   // Both support
      expect(negotiatedCapabilities.resources).toBe(false); // Client doesn't support
      expect(negotiatedCapabilities.prompts).toBe(false);   // Server doesn't support
      expect(negotiatedCapabilities.completion).toBe(true); // Both support
      expect(negotiatedCapabilities.roots).toBe(false);     // Client doesn't support
    });
  });

  describe('MCP Tools Definition', () => {
    it('should support comprehensive tool definitions', () => {
      const searchTool: MCPTool = {
        name: 'semantic_search',
        description: 'Perform semantic search across indexed content',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text',
              minLength: 1,
              maxLength: 500
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              minimum: 1,
              maximum: 100,
              default: 10
            },
            threshold: {
              type: 'number',
              description: 'Minimum similarity threshold (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.7
            },
            filters: {
              type: 'object',
              properties: {
                fileTypes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File extensions to include'
                },
                directories: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Directories to search in'
                }
              }
            }
          },
          required: ['query'],
          additionalProperties: false
        }
      };

      expect(searchTool.name).toBe('semantic_search');
      expect(searchTool.description).toBe('Perform semantic search across indexed content');
      expect(searchTool.inputSchema).toBeDefined();
    });

    it('should validate tool input schemas', () => {
      const validateToolInput = (tool: MCPTool, input: any): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        const schema = tool.inputSchema as any;
        
        if (schema.required) {
          for (const requiredField of schema.required) {
            if (!(requiredField in input)) {
              errors.push(`Missing required field: ${requiredField}`);
            }
          }
        }
        
        for (const [key, value] of Object.entries(input)) {
          const propSchema = schema.properties?.[key];
          if (!propSchema) {
            if (!schema.additionalProperties) {
              errors.push(`Unknown field: ${key}`);
            }
            continue;
          }
          
          if (propSchema.type === 'string') {
            if (typeof value !== 'string') {
              errors.push(`Field ${key} must be a string`);
            } else {
              if (propSchema.minLength && value.length < propSchema.minLength) {
                errors.push(`Field ${key} must be at least ${propSchema.minLength} characters`);
              }
              if (propSchema.maxLength && value.length > propSchema.maxLength) {
                errors.push(`Field ${key} must be at most ${propSchema.maxLength} characters`);
              }
            }
          } else if (propSchema.type === 'number') {
            if (typeof value !== 'number') {
              errors.push(`Field ${key} must be a number`);
            } else {
              if (propSchema.minimum !== undefined && value < propSchema.minimum) {
                errors.push(`Field ${key} must be at least ${propSchema.minimum}`);
              }
              if (propSchema.maximum !== undefined && value > propSchema.maximum) {
                errors.push(`Field ${key} must be at most ${propSchema.maximum}`);
              }
            }
          }
        }
        
        return { valid: errors.length === 0, errors };
      };

      const tool: MCPTool = {
        name: 'test',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 100 },
            limit: { type: 'number', minimum: 1, maximum: 50 }
          },
          required: ['query'],
          additionalProperties: false
        }
      };

      // Valid input
      expect(validateToolInput(tool, { query: 'test', limit: 10 })).toEqual({
        valid: true,
        errors: []
      });

      // Missing required field
      expect(validateToolInput(tool, { limit: 10 })).toEqual({
        valid: false,
        errors: ['Missing required field: query']
      });

      // Invalid type
      expect(validateToolInput(tool, { query: 123 })).toEqual({
        valid: false,
        errors: ['Field query must be a string']
      });

      // Value out of range
      expect(validateToolInput(tool, { query: 'test', limit: 100 })).toEqual({
        valid: false,
        errors: ['Field limit must be at most 50']
      });

      // Unknown field
      expect(validateToolInput(tool, { query: 'test', unknown: 'value' })).toEqual({
        valid: false,
        errors: ['Unknown field: unknown']
      });
    });
  });

  describe('MCP Resources', () => {
    it('should handle different resource types', () => {
      const resources: MCPResource[] = [
        {
          uri: 'file:///project/src/main.ts',
          name: 'Main Application File',
          description: 'Primary TypeScript entry point',
          mimeType: 'text/typescript'
        },
        {
          uri: 'file:///project/docs/api.md',
          name: 'API Documentation',
          description: 'REST API documentation in Markdown',
          mimeType: 'text/markdown'
        },
        {
          uri: 'file:///project/config.json',
          name: 'Configuration File',
          description: 'Application configuration in JSON format',
          mimeType: 'application/json'
        },
        {
          uri: 'file:///project/assets/',
          name: 'Assets Directory',
          description: 'Static assets and resources',
          mimeType: 'inode/directory'
        }
      ];

      expect(resources).toHaveLength(4);
      expect(resources[0].mimeType).toBe('text/typescript');
      expect(resources[1].mimeType).toBe('text/markdown');
      expect(resources[2].mimeType).toBe('application/json');
      expect(resources[3].mimeType).toBe('inode/directory');
    });

    it('should support resource metadata', () => {
      const resource: MCPResource = {
        uri: 'file:///project/src/utils.ts',
        name: 'Utility Functions',
        description: 'Common utility functions and helpers',
        mimeType: 'text/typescript'
      };

      expect(resource.uri).toBe('file:///project/src/utils.ts');
      expect(resource.name).toBe('Utility Functions');
      expect(resource.description).toBe('Common utility functions and helpers');
      expect(resource.mimeType).toBe('text/typescript');
    });
  });

  describe('Error Handling', () => {
    it('should handle MCP protocol errors properly', () => {
      const errors: MCPError[] = [
        {
          code: -32700,
          message: 'Parse error',
          data: { position: 42, expected: '}' }
        },
        {
          code: -32600,
          message: 'Invalid Request',
          data: { field: 'method', reason: 'missing' }
        },
        {
          code: -32601,
          message: 'Method not found',
          data: { method: 'unknown/method' }
        },
        {
          code: -32602,
          message: 'Invalid params',
          data: { param: 'limit', value: -1, expected: 'positive integer' }
        },
        {
          code: -32603,
          message: 'Internal error',
          data: { error: 'Database connection failed' }
        }
      ];

      expect(errors[0].code).toBe(-32700);
      expect(errors[1].code).toBe(-32600);
      expect(errors[2].code).toBe(-32601);
      expect(errors[3].code).toBe(-32602);
      expect(errors[4].code).toBe(-32603);
      
      expect(errors[2].data.method).toBe('unknown/method');
      expect(errors[3].data.param).toBe('limit');
      expect(errors[4].data.error).toBe('Database connection failed');
    });

    it('should handle request timeout and cancellation', async () => {
      const mockHandler: MCPRequestHandler<MCPMessage, MCPMessage> = {
        handle: async (request: MCPMessage): Promise<MCPMessage> => {
          // Simulate long-running operation
          await TestUtils.wait(100);
          
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: { success: true }
          };
        },
        validate: (): boolean => true,
        getMethodName: (): string => 'tools/call'
      };

      const request: MCPMessage = {
        jsonrpc: '2.0',
        id: 'timeout-test',
        method: 'tools/call',
        params: { name: 'slow-tool', arguments: {} }
      };

      // Test with timeout
      const timeoutPromise = new Promise<MCPMessage>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 50);
      });

      const requestPromise = mockHandler.handle(request);

      try {
        await Promise.race([requestPromise, timeoutPromise]);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('Request timeout');
      }
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requestCounts = new Map<string, number>();
      
      const mockHandler: MCPRequestHandler<MCPMessage, MCPMessage> = {
        handle: async (request: MCPMessage): Promise<MCPMessage> => {
          const toolName = request.params.name;
          requestCounts.set(toolName, (requestCounts.get(toolName) || 0) + 1);
          
          // Simulate processing time
          await TestUtils.wait(Math.random() * 10);
          
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: { 
              tool: toolName,
              requestNumber: requestCounts.get(toolName)
            }
          };
        },
        validate: (): boolean => true,
        getMethodName: (): string => 'tools/call'
      };

      // Create concurrent requests
      const requests: Promise<MCPMessage>[] = [];
      for (let i = 0; i < 10; i++) {
        const request: MCPMessage = {
          jsonrpc: '2.0',
          id: `req-${i}`,
          method: 'tools/call',
          params: { name: `tool-${i % 3}`, arguments: {} }
        };
        
        requests.push(mockHandler.handle(request));
      }

      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(10);
      expect(requestCounts.get('tool-0')).toBeGreaterThan(0);
      expect(requestCounts.get('tool-1')).toBeGreaterThan(0);
      expect(requestCounts.get('tool-2')).toBeGreaterThan(0);
      
      // Verify all requests completed
      responses.forEach(response => {
        expect(response.result?.tool).toMatch(/^tool-[0-2]$/);
      });
    });
  });
});
