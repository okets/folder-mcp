/**
 * File Request Handler
 * 
 * Handles MCP requests related to file operations by delegating
 * to the ContentServingOrchestrator application service.
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';
import { glob } from 'glob';
import type { ContentServingWorkflow } from '../../../application/serving/index.js';
import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPRequestHandler, MCPToolDefinition } from './index.js';

export interface FileHandlerOptions {
  folderPath: string;
}

export class FileRequestHandler {
  constructor(
    private readonly options: FileHandlerOptions,
    private readonly contentServing: ContentServingWorkflow,
    private readonly loggingService: ILoggingService
  ) {}

  /**
   * Handle read_file requests
   */
  async handleReadFile(params: { file_path: string }): Promise<any> {
    try {
      this.loggingService.debug('MCP: Handling read_file request', { filePath: params.file_path });
      
      const result = await this.contentServing.getFileContent(params.file_path);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to read file');
      }

      return {
        content: [
          {
            type: 'text',
            text: result.content,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('MCP: Failed to read file', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle list_files requests
   */
  async handleListFiles(): Promise<any> {
    try {
      this.loggingService.debug('MCP: Handling list_files request');
      
      const result = await this.contentServing.getFileList();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to list files');
      }

      // Format as simple text response for now
      const fileList = result.files.map(file => 
        `${file.filePath || file.relativePath || 'unknown'} (${file.type}, ${file.size} bytes)`
      ).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: fileList || 'No files found.',
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('MCP: Failed to list files', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle search_files requests
   */
  async handleSearchFiles(params: { pattern?: string }): Promise<any> {
    try {
      this.loggingService.debug('MCP: Handling search_files request', { pattern: params.pattern });
      
      const pattern = params.pattern || '*';
      const searchPath = join(this.options.folderPath, '**', pattern);
      
      const files = await glob(searchPath, {
        ignore: ['**/node_modules/**', '**/.git/**', '**/.*'],
        nodir: true,
      });

      const relativeFiles = files.map(file => relative(this.options.folderPath, file));
      
      return {
        content: [
          {
            type: 'text',
            text: relativeFiles.length > 0 
              ? relativeFiles.join('\n')
              : `No files found matching pattern: ${pattern}`,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('MCP: Failed to search files', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get tool definitions for file operations
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file within the served folder',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Relative path to the file within the folder',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'list_files',
        description: 'List all files in the served folder recursively',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_files',
        description: 'Search for files matching a pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'File pattern to search for (e.g., "*.md", "*.txt")',
              default: '*',
            },
          },
        },
      },
    ];
  }
}
