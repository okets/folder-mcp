/**
 * MCP Interface Module
 * 
 * This module provides the Model Context Protocol interface,
 * acting as a thin layer that delegates to application services.
 */

// Interface types
export interface MCPServerInterface {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getCapabilities(): MCPCapabilities;
}

export interface MCPRequestHandler<TRequest = any, TResponse = any> {
  handle(request: TRequest): Promise<TResponse>;
  getMethodName(): string;
  validate(request: TRequest): boolean;
}

export interface MCPCapabilities {
  resources: boolean;
  tools: boolean;
  prompts: boolean;
  completion: boolean;
  roots: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

export interface MCPTransport {
  send(message: MCPMessage): Promise<void>;
  onMessage(handler: (message: MCPMessage) => void): void;
  close(): Promise<void>;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPServerOptions {
  name: string;
  version: string;
  transport: MCPTransport;
  capabilities: MCPCapabilities;
}

// Interface implementations (to be migrated/created)
// export { MCPServer } from './server.js';
// export { FileHandler } from './handlers/files.js';
// export { SearchHandler } from './handlers/search.js';
// export { KnowledgeHandler } from './handlers/knowledge.js';
