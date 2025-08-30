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
   */
  async listFolders(): Promise<MCPToolResponse> {
    try {
      // For now, use the mock implementation from DaemonRESTClient
      // This will be replaced with actual /api/v1/folders endpoint in Sprint 5
      const folders = await this.daemonClient.getFoldersConfig();
      
      // Transform to MCP tool response format
      const folderText = folders.map(folder => 
        `📁 ${folder.name} (${folder.status})\n` +
        `   Path: ${folder.path}\n` +
        `   Model: ${folder.model}\n` +
        `   Documents: ${folder.documentCount || 0}\n` +
        `   Last indexed: ${folder.lastIndexed || 'Never'}`
      ).join('\n\n');
      
      return {
        content: [{
          type: 'text' as const,
          text: `Available Folders:\n\n${folderText}`
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
   * Search across folders (placeholder for Sprint 7)
   */
  async search(query: string, folderId?: string): Promise<MCPToolResponse> {
    return {
      content: [{
        type: 'text' as const,
        text: `Search functionality will be implemented in Sprint 7.\nQuery: "${query}"${folderId ? `\nFolder: ${folderId}` : ''}`
      }]
    };
  }

  /**
   * List documents in a folder (placeholder for Sprint 5)
   */
  async listDocuments(folderId: string): Promise<MCPToolResponse> {
    return {
      content: [{
        type: 'text' as const,
        text: `Document listing will be implemented in Sprint 5.\nFolder: ${folderId}`
      }]
    };
  }

  /**
   * Get document content (placeholder for Sprint 6)
   */
  async getDocument(folderId: string, documentId: string): Promise<MCPToolResponse> {
    return {
      content: [{
        type: 'text' as const,
        text: `Document retrieval will be implemented in Sprint 6.\nFolder: ${folderId}\nDocument: ${documentId}`
      }]
    };
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