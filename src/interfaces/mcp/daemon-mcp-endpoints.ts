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
   * Get server information via daemon REST API
   * Maps to the getStatus endpoint in the original MCP implementation
   */
  async getServerInfo(): Promise<MCPToolResponse> {
    try {
      // Get server info from daemon REST API
      const serverInfo: ServerInfoResponse = await this.daemonClient.getServerInfo();
      
      // Transform to MCP tool response format
      const response: MCPToolResponse = {
        content: [{
          type: 'text' as const,
          text: this.formatServerInfo(serverInfo)
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
   * List available folders via daemon REST API
   * Shows path as primary identifier with all metadata for decision-making
   */
  async listFolders(): Promise<MCPToolResponse> {
    try {
      // Get folders configuration from daemon
      const folders = await this.daemonClient.getFoldersConfig();
      
      // Count folders by status
      const activeFolders = folders.filter(f => f.status === 'active').length;
      const indexingFolders = folders.filter(f => f.status === 'indexing').length;
      const errorFolders = folders.filter(f => f.status === 'error').length;
      const pendingFolders = folders.filter(f => f.status === 'pending').length;
      
      // Extract folder name from path (cross-platform)
      const extractFolderName = (folderPath: string): string => {
        return path.basename(folderPath) || folderPath;
      };
      
      // Format each folder with path as primary identifier
      const folderText = folders.map(folder => {
        const statusEmoji = {
          'active': '✅',
          'indexing': '⏳',
          'error': '❌',
          'pending': '⏸️'
        }[folder.status] || '❓';
        
        let lines = [
          `📁 ${folder.path}`,
          `   Name: ${folder.name || extractFolderName(folder.path)}`,
          `   Status: ${statusEmoji} ${folder.status}`
        ];
        
        // Add indexing progress if applicable
        if (folder.status === 'indexing' && folder.indexingProgress !== undefined) {
          lines.push(`   Progress: ${folder.indexingProgress}%`);
        }
        
        // Add error message if applicable
        if (folder.status === 'error' && folder.errorMessage) {
          lines.push(`   Error: ${folder.errorMessage}`);
        }
        
        lines.push(
          `   Model: ${folder.model}`,
          `   Documents: ${folder.documentCount || 0}`
        );
        
        // Add total size if available
        if (folder.totalSize !== undefined) {
          lines.push(`   Total Size: ${this.formatBytes(folder.totalSize)}`);
        }
        
        // Add document types breakdown if available
        if (folder.documentTypes) {
          const typesStr = Object.entries(folder.documentTypes)
            .map(([type, count]) => `${type.toUpperCase()} (${count})`)
            .join(', ');
          if (typesStr) {
            lines.push(`   Types: ${typesStr}`);
          }
        }
        
        lines.push(`   Last indexed: ${folder.lastIndexed || 'Never'}`);
        
        // Add last accessed if available
        if (folder.lastAccessed) {
          lines.push(`   Last accessed: ${folder.lastAccessed}`);
        }
        
        return lines.join('\n');
      }).join('\n\n');
      
      // Create header with summary
      const header = [
        `🗂️ Available Folders (${folders.length} total)`,
        `════════════════════════════════════`,
        ''
      ];
      
      if (folders.length > 0) {
        header.push(`Status Summary: ${activeFolders} active, ${indexingFolders} indexing, ${pendingFolders} pending, ${errorFolders} errors`);
        header.push('');
      }
      
      const responseText = header.join('\n') + (folderText || 'No folders configured.');
      
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
          text: `Error retrieving folders: ${error instanceof Error ? error.message : 'Unknown error'}`
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
   * List documents in a folder (Sprint 5 implementation)
   */
  async listDocuments(folderPath: string, limit: number = 20): Promise<MCPToolResponse> {
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
   * Format server info for human-readable display
   */
  private formatServerInfo(info: ServerInfoResponse): string {
    const lines = [
      '🖥️  folder-mcp Server Information',
      '════════════════════════════════════',
      '',
      `📌 Version: ${info.version}`,
      `⏱️  Uptime: ${this.formatUptime(info.daemon.uptime)}`,
      '',
      '💻 System Capabilities:',
      `   • CPU Cores: ${info.capabilities.cpuCount}`,
      `   • Total Memory: ${this.formatBytes(info.capabilities.totalMemory)}`,
      `   • Supported Models: ${info.capabilities.supportedModels.join(', ')}`,
      '',
      '📊 Daemon Status:',
      `   • Total Folders: ${info.daemon.folderCount}`,
      `   • Active Folders: ${info.daemon.activeFolders}`,
      `   • Indexing Folders: ${info.daemon.indexingFolders}`,
      `   • Total Documents: ${info.daemon.totalDocuments}`,
      '',
      '✅ Multi-folder mode active via REST API'
    ];
    
    return lines.join('\n');
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
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
}