/**
 * Daemon MCP Endpoints Implementation
 * Phase 9 - Sprint 3: MCP endpoints that forward to daemon REST API
 * 
 * This implementation provides MCP endpoints that connect to the daemon's
 * REST API for multi-folder support. Each endpoint transforms daemon responses
 * to the MCP protocol format.
 */

import { DaemonRESTClient } from './daemon-rest-client.js';
import * as path from 'path';
import type { ServerInfoResponse } from './daemon-rest-client.js';
import type { EnhancedServerInfoResponse } from '../../daemon/rest/types.js';
import { SEMANTIC_THRESHOLD, DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT } from '../../constants/search.js';

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
   * Search within a specific folder (Sprint 7 implementation)
   * Note: folderPath is REQUIRED for folder-specific search
   */
  async search(query: string, folderPath?: string, options?: { threshold?: number; limit?: number }): Promise<MCPToolResponse> {
    try {
      // Sprint 7: Folder parameter is now required for search
      if (!folderPath) {
        return {
          content: [{
            type: 'text' as const,
            text: '❌ Error: Folder path is required for search.\nPlease specify which folder to search in.\n\nUsage: search(query, folderPath)\nExample: search("revenue report", "/Users/alice/Work/Sales")'
          }]
        };
      }

      // Call daemon REST API search endpoint with bounds enforcement
      const searchResponse = await this.daemonClient.searchFolder(folderPath, {
        query,
        limit: Math.min(options?.limit || DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT),
        threshold: options?.threshold ?? SEMANTIC_THRESHOLD,
        includeContent: true
      });

      // Format search results for display
      if (searchResponse.results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `🔍 No results found for "${query}" in folder '${folderPath}'.\n\nTry:\n• Different search terms\n• Checking if the folder is indexed\n• Verifying the folder path is correct`
          }]
        };
      }

      const resultsText = searchResponse.results.map((result, index) => 
        `${index + 1}. 📄 ${result.documentName} (${result.relevance.toFixed(2)} relevance)\n` +
        `   Type: ${result.documentType || 'unknown'}\n` +
        `   Path: ${result.documentPath || result.documentId}\n` +
        `   ${result.pageNumber ? `Page: ${result.pageNumber}\n` : ''}` +
        `   Snippet: ${result.snippet.substring(0, 200)}${result.snippet.length > 200 ? '...' : ''}`
      ).join('\n\n');

      const responseText = [
        `🔍 Search Results for "${query}"`,
        '════════════════════════════════════',
        '',
        `📁 Folder: ${searchResponse.folderContext.name}`,
        `   • Path: ${searchResponse.folderContext.path}`,
        `   • Model: ${searchResponse.folderContext.model}`,
        `   • Status: ${searchResponse.folderContext.status}`,
        '',
        `📊 Search Performance:`,
        `   • Total time: ${searchResponse.performance.searchTime}ms`,
        `   • Model load time: ${searchResponse.performance.modelLoadTime}ms`,
        `   • Documents searched: ${searchResponse.performance.documentsSearched}`,
        `   • Total results: ${searchResponse.performance.totalResults}`,
        `   • Model used: ${searchResponse.performance.modelUsed}`,
        '',
        `📄 Results (showing ${searchResponse.results.length} of ${searchResponse.performance.totalResults}):`,
        '────────────────────────────────────',
        resultsText
      ].join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: responseText
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Error searching in folder '${folderPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * List documents in a folder (Old implementation - kept for compatibility)
   */
  async listDocumentsOld(folderPath: string, limit: number = 20): Promise<MCPToolResponse> {
    try {
      // Get documents from daemon REST API
      const response = await this.daemonClient.getDocuments(folderPath, { limit });
      
      // Transform to MCP tool response format
      const documentText = response.documents.map(doc => 
        `📄 ${doc.name} (${doc.type.toUpperCase()})\n` +
        `   Path: ${doc.path}\n` +
        `   Size: ${this.formatBytes(doc.size)}\n` +
        `   Modified: ${new Date(doc.modified).toLocaleDateString()}\n` +
        `   Indexed: ${doc.indexed ? '✅' : '❌'}`
      ).join('\n\n');

      const folderInfo = response.folderContext;
      const pagination = response.pagination;

      const responseText = [
        `📁 Documents in ${folderInfo.name}`,
        '════════════════════════════════════',
        '',
        `📊 Folder Info:`,
        `   • Model: ${folderInfo.model}`,
        `   • Status: ${folderInfo.status}`,
        `   • Path: ${folderInfo.path}`,
        '',
        `📄 Documents (${response.documents.length} of ${pagination.total}):`,
        '',
        documentText || '   No documents found.',
        '',
        `📊 Pagination:`,
        `   • Showing: ${response.documents.length > 0 ? `${pagination.offset + 1}-${pagination.offset + response.documents.length}` : '0'}`,
        `   • Total: ${pagination.total}`,
        `   • Has more: ${pagination.hasMore ? 'Yes' : 'No'}`
      ].join('\n');
      
      return {
        content: [{
          type: 'text' as const,
          text: responseText
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error listing documents in folder '${folderPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Get document content (Sprint 6)
   */
  async getDocument(folderPath: string, documentId: string): Promise<MCPToolResponse> {
    try {
      // Get document data from daemon REST API
      const response = await this.daemonClient.getDocumentData(folderPath, documentId);
      
      // Transform to MCP tool response format
      const document = response.document;
      const folderInfo = response.folderContext;

      const responseText = [
        `📄 ${document.name}`,
        '════════════════════════════════════',
        '',
        `📊 Document Info:`,
        `   • Type: ${document.type.toUpperCase()}`,
        `   • Size: ${this.formatBytes(document.size)}`,
        `   • Folder: ${folderInfo.name} (${folderInfo.model})`,
        '',
        `📖 Metadata:`,
        ...Object.entries(document.metadata || {}).map(([key, value]) => 
          `   • ${key}: ${value}`
        ),
        '',
        `📝 Content:`,
        '────────────────────────────────────',
        document.content
      ].join('\n');
      
      return {
        content: [{
          type: 'text' as const,
          text: responseText
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error retrieving document '${documentId}' from folder '${folderPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Get document outline/structure (Sprint 6)
   */
  async getDocumentOutline(folderPath: string, documentId: string): Promise<MCPToolResponse> {
    try {
      // Get document outline from daemon REST API
      const response = await this.daemonClient.getDocumentOutline(folderPath, documentId);
      
      // Transform to MCP tool response format
      const outline = response.outline;
      const folderInfo = response.folderContext;

      let outlineText = '';
      
      switch (outline.type) {
        case 'text':
          if (outline.headings && outline.headings.length > 0) {
            outlineText = outline.headings.map(heading => 
              `${'  '.repeat(heading.level - 1)}${'#'.repeat(heading.level)} ${heading.title} (Line ${heading.lineNumber})`
            ).join('\n');
          } else {
            outlineText = '   No headings found in document.';
          }
          break;
          
        case 'pdf':
          if (outline.pages && outline.pages.length > 0) {
            outlineText = outline.pages.map(page => 
              `   Page ${page.pageNumber}: ${page.title || 'Untitled'}`
            ).join('\n');
          } else {
            outlineText = '   No pages found in PDF.';
          }
          break;
          
        case 'xlsx':
          if (outline.sheets && outline.sheets.length > 0) {
            outlineText = outline.sheets.map(sheet => 
              `   Sheet ${sheet.sheetIndex + 1}: ${sheet.name} (${sheet.rowCount || '?'} rows, ${sheet.columnCount || '?'} columns)`
            ).join('\n');
          } else {
            outlineText = '   No sheets found in Excel file.';
          }
          break;
          
        case 'pptx':
          if (outline.slides && outline.slides.length > 0) {
            outlineText = outline.slides.map(slide => 
              `   Slide ${slide.slideNumber}: ${slide.title}`
            ).join('\n');
          } else {
            outlineText = '   No slides found in PowerPoint file.';
          }
          break;
          
        case 'docx':
          if (outline.sections && outline.sections.length > 0) {
            outlineText = outline.sections.map(section => 
              `${'  '.repeat(section.level - 1)}• ${section.title} (Page ${section.pageNumber || '?'})`
            ).join('\n');
          } else {
            outlineText = '   No sections found in Word document.';
          }
          break;
          
        default:
          outlineText = '   Outline not available for this document type.';
      }

      const responseText = [
        `📋 Document Outline: ${documentId}`,
        '════════════════════════════════════',
        '',
        `📊 Document Info:`,
        `   • Type: ${outline.type.toUpperCase()}`,
        `   • Total Items: ${outline.totalItems || 0}`,
        `   • Folder: ${folderInfo.name}`,
        '',
        `📝 Structure:`,
        '────────────────────────────────────',
        outlineText
      ].join('\n');
      
      return {
        content: [{
          type: 'text' as const,
          text: responseText
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error retrieving outline for document '${documentId}' from folder '${folderPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
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
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
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
}