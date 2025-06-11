/**
 * MCP Request Handlers
 * 
 * Individual handlers for different types of MCP requests,
 * delegating to application layer services.
 */

export { FileRequestHandler } from './files.js';
export { KnowledgeRequestHandler } from './knowledge.js';
export { SystemRequestHandler } from './system.js';

// Handler base interface
export interface MCPRequestHandler<TParams = any, TResult = any> {
  handle(params: TParams): Promise<TResult>;
  getToolDefinition(): MCPToolDefinition;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}
