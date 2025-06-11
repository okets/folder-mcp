/**
 * System Request Handler
 * 
 * Handles MCP requests related to system operations and metadata.
 */

import { statSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { ContentServingWorkflow } from '../../../application/serving/index.js';
import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPToolDefinition } from './index.js';

export interface SystemHandlerOptions {
  folderPath: string;
}

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
}

interface PerformanceMetrics {
  averageSearchTime: number;
  totalSearches: number;
  cacheHitRate: number;
  errorRate: number;
}

interface FolderInfo {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  created: Date;
  modified: Date;
  serverStatus: {
    isRunning: boolean;
    uptime: number;
    indexedFiles: number;
    totalChunks: number;
    lastIndexUpdate: Date;
    memoryUsage: MemoryUsage;
    performance: PerformanceMetrics;
  };
}

interface MCPResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class SystemRequestHandler {
  constructor(
    private readonly options: SystemHandlerOptions,
    private readonly contentServing: ContentServingWorkflow,
    private readonly loggingService: ILoggingService
  ) {}

  /**
   * Handle get_folder_info requests
   */
  async handleGetFolderInfo(): Promise<MCPResponse> {
    try {
      this.loggingService.debug('MCP: Handling get_folder_info request');
      
      const folderPath = resolve(this.options.folderPath);
      
      if (!existsSync(folderPath)) {
        throw new Error(`Folder does not exist: ${folderPath}`);
      }

      const stats = statSync(folderPath);
      const serverStatus = await this.contentServing.getServerStatus();

      const folderInfo: FolderInfo = {
        path: folderPath,
        exists: true,
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        serverStatus: {
          isRunning: serverStatus.isRunning,
          uptime: serverStatus.uptime,
          indexedFiles: serverStatus.indexedFiles,
          totalChunks: serverStatus.totalChunks,
          lastIndexUpdate: serverStatus.lastIndexUpdate,
          memoryUsage: serverStatus.memoryUsage,
          performance: serverStatus.performance
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(folderInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('MCP: Failed to get folder info', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get tool definitions for system operations
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'get_folder_info',
        description: 'Get information about the served folder and server status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }
}
