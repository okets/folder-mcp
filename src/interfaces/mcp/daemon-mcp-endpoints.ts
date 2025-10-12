/**
 * Daemon MCP Endpoints Implementation
 * Phase 9 - Sprint 3: MCP endpoints that forward to daemon REST API
 * 
 * This implementation provides MCP endpoints that connect to the daemon's
 * REST API for multi-folder support. Each endpoint transforms daemon responses
 * to the MCP protocol format.
 */

import { DaemonRESTClient } from './daemon-rest-client.js';
import type { ServerInfoResponse } from './daemon-rest-client.js';
import type { EnhancedServerInfoResponse } from '../../daemon/rest/types.js';

/**
 * MCP content item format - matches MCP SDK's expected structure
 */
interface MCPContentItem {
  type: 'text' | 'resource';
  text?: string;
  resource?: {
    uri: string;
    mimeType?: string;
    text?: string;
  };
}

/**
 * MCP tool response format - matches CallToolResult from MCP SDK
 */
interface MCPToolResponse {
  content: MCPContentItem[];
}

/**
 * Daemon-aware MCP endpoints that forward to REST API
 */
export class DaemonMCPEndpoints {
  constructor(private daemonClient: DaemonRESTClient) {}

  /**
   * Get server information via daemon REST API - Phase 10 Sprint 0 Enhanced
   * Returns structured JSON instead of formatted text for LLM decision-making
   */
  async getServerInfo(): Promise<MCPToolResponse> {
    try {
      // Get enhanced server info from daemon REST API
      const serverInfo: EnhancedServerInfoResponse = await this.daemonClient.getServerInfo();

      // Return JSON directly for structured consumption
      const response: MCPToolResponse = {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(serverInfo, null, 2)
        }]
      };

      return response;
    } catch (error) {
      // Return error in MCP format
      return {
        content: [{
          type: 'text' as const,
          text: `Error retrieving server information: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Phase 10 Sprint 1: List available folders with semantic previews
   * Returns structured JSON for LLM decision-making
   */
  async listFolders(): Promise<MCPToolResponse> {
    try {
      // Get enhanced folders data from daemon REST API
      const response = await this.daemonClient.getFoldersEnhanced();

      // Return JSON directly for structured consumption
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error retrieving folders: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Phase 10 Sprint 3: List documents in a folder with semantic metadata
   */
  async listDocumentsEnhanced(args: {
    base_folder_path?: string;
    relative_sub_path?: string;
    recursive?: boolean;
    limit?: number;
    continuation_token?: string;
  }): Promise<MCPToolResponse> {
    try {
      // Handle continuation token case
      if (args.continuation_token && !args.base_folder_path) {
        // Decode continuation token to get the base_folder_path
        try {
          const tokenData = JSON.parse(Buffer.from(args.continuation_token, 'base64').toString());
          args.base_folder_path = tokenData.path;
        } catch (e) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Invalid continuation token`
            }]
          };
        }
      }

      if (!args.base_folder_path) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: base_folder_path is required`
          }]
        };
      }

      // Build query parameters
      const queryParams = new URLSearchParams();

      if (args.relative_sub_path !== undefined) {
        queryParams.append('sub_path', args.relative_sub_path);
      }
      if (args.recursive !== undefined) {
        queryParams.append('recursive', args.recursive.toString());
      }
      if (args.limit !== undefined) {
        queryParams.append('limit', args.limit.toString());
      }
      if (args.continuation_token) {
        queryParams.append('continuation_token', args.continuation_token);
      }

      // Make request to daemon REST API
      const path = `/api/v1/folders/${encodeURIComponent(args.base_folder_path)}/documents?${queryParams.toString()}`;
      const response = await (this.daemonClient as any).makeRequest(path);

      // Return JSON directly for structured consumption
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error listing documents: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Phase 10 Sprint 4: Get document metadata with chunk navigation
   * Returns document metadata and chunks for intelligent exploration
   */
  async getDocumentMetadata(
    baseFolderPath: string,
    filePath: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<MCPToolResponse> {
    try {
      // We need to add a public method to DaemonRESTClient for this endpoint
      // For now, we can use the existing pattern and add the method there
      const response = await (this.daemonClient as any).getDocumentMetadata(baseFolderPath, filePath, options);

      // Return the structured JSON response for LLM consumption
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error retrieving metadata for document '${filePath}' from folder '${baseFolderPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Phase 10 Sprint 2: Explore folder with ls-like navigation
   * Shows both directories and files with semantic enrichment
   */
  async explore(
    baseFolderPath: string,
    relativePath?: string,
    options?: {
      subdirectoryLimit?: number;
      fileLimit?: number;
      continuationToken?: string;
    }
  ): Promise<MCPToolResponse> {
    try {
      // Call REST API through daemon client
      const exploreOptions: any = {
        subPath: relativePath || ''
      };

      if (options?.subdirectoryLimit !== undefined) {
        exploreOptions.subdirLimit = options.subdirectoryLimit;
      }
      if (options?.fileLimit !== undefined) {
        exploreOptions.fileLimit = options.fileLimit;
      }
      if (options?.continuationToken !== undefined) {
        exploreOptions.continuationToken = options.continuationToken;
      }

      const response = await this.daemonClient.exploreFolder(
        baseFolderPath,
        exploreOptions
      );

      // Return JSON for LLM consumption
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error exploring folder '${baseFolderPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Get specific chunks by ID (Sprint 5)
   * Lean response with just content and navigation aids
   */
  async getChunks(
    baseFolderPath: string,
    filePath: string,
    chunkIds: string[]
  ): Promise<MCPToolResponse> {
    try {
      const response = await (this.daemonClient as any).getChunks(baseFolderPath, filePath, chunkIds);

      // Return the structured JSON response for LLM consumption
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Phase 10 Sprint 6: Get document text with character-based pagination
   * Returns clean extracted text with extraction quality metadata
   */
  async getDocumentText(
    baseFolderPath: string,
    filePath: string,
    options?: {
      maxChars?: number;
      continuationToken?: string;
    }
  ): Promise<MCPToolResponse> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      if (options?.maxChars !== undefined) {
        queryParams.append('max_chars', options.maxChars.toString());
      }
      if (options?.continuationToken) {
        queryParams.append('continuation_token', options.continuationToken);
      }

      // Make request to daemon REST API
      const path = `/api/v1/folders/${encodeURIComponent(baseFolderPath)}/documents/${encodeURIComponent(filePath)}/text?${queryParams.toString()}`;
      const response = await (this.daemonClient as any).makeRequest(path);

      // Return JSON directly for structured consumption
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting document text: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Phase 10 Sprint 8: Search content with hybrid scoring
   * Performs chunk-level semantic search with vec0 MATCH and exact term boosting
   */
  async searchContent(args: {
    folder_id: string;
    semantic_concepts?: string[];
    exact_terms?: string[];
    limit?: number;
    continuation_token?: string;
  }): Promise<MCPToolResponse> {
    try {
      // Validate: folder_id is required
      if (!args.folder_id || typeof args.folder_id !== 'string' || args.folder_id.trim() === '') {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: folder_id is required and must be a non-empty string`
          }]
        };
      }

      // Validate: at least one search parameter required
      if (!args.semantic_concepts?.length && !args.exact_terms?.length) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: At least one of semantic_concepts or exact_terms must be provided`
          }]
        };
      }

      // Build request body (folder_id comes from URL path, not body)
      const requestBody = {
        semantic_concepts: args.semantic_concepts,
        exact_terms: args.exact_terms,
        limit: args.limit,
        continuation_token: args.continuation_token
      };

      // Make POST request to daemon REST API
      const path = `/api/v1/folders/${encodeURIComponent(args.folder_id)}/search_content`;
      const response = await (this.daemonClient as any).makeRequest(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Return JSON directly for structured consumption
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error searching content: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Phase 10 Sprint 9: Find documents using document-level embeddings
   * Performs document-level semantic discovery for topic exploration
   *
   * Sprint 8 Lesson Applied: Fail-fast validation in Phase 1, not Phase 4
   */
  async findDocuments(args: {
    folder_id: string;
    query: string;
    limit?: number;
    continuation_token?: string;
  }): Promise<MCPToolResponse> {
    try {
      // FAIL-FAST VALIDATION (Sprint 8 lesson)
      if (!args.folder_id || typeof args.folder_id !== 'string' || args.folder_id.trim() === '') {
        return {
          content: [{
            type: 'text' as const,
            text: 'Error: folder_id is required and must be a non-empty string'
          }]
        };
      }

      if (!args.query || typeof args.query !== 'string' || args.query.trim() === '') {
        return {
          content: [{
            type: 'text' as const,
            text: 'Error: query is required and must be a non-empty string'
          }]
        };
      }

      // Build request body (folder_id goes to URL path, NOT body)
      const requestBody = {
        query: args.query,
        limit: args.limit,
        continuation_token: args.continuation_token
      };

      // Call daemon REST endpoint
      const path = `/api/v1/folders/${encodeURIComponent(args.folder_id)}/find-documents`;
      const response = await (this.daemonClient as any).makeRequest(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Return JSON directly for structured consumption
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error finding documents: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}