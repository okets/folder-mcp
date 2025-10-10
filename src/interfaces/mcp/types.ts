/**
 * MCP-specific types and interfaces
 *
 * This file contains TypeScript types and interfaces specific to the MCP protocol
 * implementation. Following the interface layer guidelines, this only contains
 * types needed for MCP protocol handling.
 *
 * NOTE: Endpoint-specific types (SearchRequest, GetDocumentDataRequest, etc.) are
 * defined in src/daemon/rest/types.ts where they are actually used by the REST API.
 */

export interface MCPServerOptions {
  folderPath: string;
  transport?: 'stdio';
  name?: string;
  version?: string;
  enableEnhancedFeatures?: boolean;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}
