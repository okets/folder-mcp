/**
 * Basic MCP Handler - Hello World
 * 
 * This handler provides a simple "hello_world" tool for testing MCP connectivity.
 * Following interface layer guidelines, this delegates to application services.
 */

import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPToolDefinition } from '../types.js';

export class BasicHandler {
  constructor(
    private readonly logger: ILoggingService
  ) {}

  /**
   * Get tool definitions for basic functionality
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'hello_world',
        description: 'Returns a hello world message to test MCP connectivity',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Optional name to include in greeting'
            }
          },
          required: []
        }
      }
    ];
  }

  /**
   * Handle hello_world tool calls
   */
  async handleHelloWorld(args: { name?: string }): Promise<{ message: string }> {
    // Log only to stderr
    process.stderr.write(`[INFO] Hello world tool called\n`);
    this.logger.info('Hello world tool called', { args });
    
    const name = args.name || 'World';
    const message = `Hello, ${name}! MCP server is working correctly.`;
    
    process.stderr.write(`[INFO] Hello world response: ${message}\n`);
    this.logger.info('Hello world response generated', { message });
    
    return { message };
  }
}
