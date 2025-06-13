/**
 * Navigation MCP Handler - Folder and Document Navigation
 * 
 * This handler provides folder and document navigation tools for Claude Desktop integration.
 * Implements list_folders and list_documents tools using the same domain services as gRPC.
 */

import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPToolDefinition } from '../types.js';

// TODO: Import proper domain service interfaces when available
interface INavigationService {
  listFolders(params: any): Promise<any>;
  listDocumentsInFolder(params: any): Promise<any>;
}

export class NavigationHandler {
  constructor(
    private readonly logger: ILoggingService,
    private readonly navigationService: INavigationService
  ) {}

  /**
   * Get tool definitions for navigation functionality
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'list_folders',
        description: 'List the folder hierarchy structure with document counts',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Optional path to start from (defaults to root)'
            },
            max_depth: {
              type: 'number',
              description: 'Maximum depth to traverse (1-10)',
              minimum: 1,
              maximum: 10,
              default: 3
            },
            include_counts: {
              type: 'boolean',
              description: 'Include document counts for each folder',
              default: true
            }
          }
        }
      },
      {
        name: 'list_documents',
        description: 'List documents within a specific folder with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            folder_path: {
              type: 'string',
              description: 'Path to the folder to list documents from'
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (1-based)',
              minimum: 1,
              default: 1
            },
            page_size: {
              type: 'number',
              description: 'Number of documents per page (1-200)',
              minimum: 1,
              maximum: 200,
              default: 50
            },
            document_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by document types (pdf, docx, pptx, xlsx, txt)'
            },
            sort_by: {
              type: 'string',
              enum: ['name', 'modified_date', 'size', 'type'],
              description: 'Sort documents by field',
              default: 'modified_date'
            },
            sort_order: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order',
              default: 'desc'
            }
          },
          required: ['folder_path']
        }
      }
    ];
  }

  /**
   * Handle tool calls for navigation functionality
   */
  async handleToolCall(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'list_folders':
          return await this.handleListFolders(args);
        case 'list_documents':
          return await this.handleListDocuments(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Navigation tool call failed', err, { tool: name });
      throw error;
    }
  }

  private async handleListFolders(args: any): Promise<any> {
    this.logger.info('Listing folders', { args });
    
    const params = {
      path: args.path || '',
      max_depth: args.max_depth || 3,
      include_counts: args.include_counts !== false
    };

    const result = await this.navigationService.listFolders(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${result.folders?.length || 0} folders:\n\n${this.formatFoldersResponse(result)}`
      }]
    };
  }

  private async handleListDocuments(args: any): Promise<any> {
    this.logger.info('Listing documents', { args });
    
    if (!args.folder_path) {
      throw new Error('folder_path is required');
    }

    const params = {
      folder_path: args.folder_path,
      page: args.page || 1,
      page_size: args.page_size || 50,
      document_types: args.document_types || [],
      sort_by: args.sort_by || 'modified_date',
      sort_order: args.sort_order || 'desc'
    };

    const result = await this.navigationService.listDocumentsInFolder(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${result.documents?.length || 0} documents in "${args.folder_path}":\n\n${this.formatDocumentsResponse(result)}`
      }]
    };
  }

  private formatFoldersResponse(result: any): string {
    if (!result.folders || result.folders.length === 0) {
      return 'No folders found.';
    }

    return result.folders.map((folder: any) => {
      const count = folder.document_count !== undefined ? ` (${folder.document_count} documents)` : '';
      const depth = '  '.repeat(folder.depth || 0);
      return `${depth}📁 ${folder.name}${count}`;
    }).join('\n');
  }

  private formatDocumentsResponse(result: any): string {
    if (!result.documents || result.documents.length === 0) {
      return 'No documents found.';
    }

    const docs = result.documents.map((doc: any) => {
      const type = doc.document_type || 'unknown';
      const size = doc.file_size ? this.formatFileSize(doc.file_size) : '';
      const modified = doc.modified_date ? new Date(doc.modified_date).toLocaleDateString() : '';
      const authors = doc.authors?.map((a: any) => a.name || a).join(', ') || '';
      
      let info = `📄 ${doc.title || doc.file_path}`;
      if (type !== 'unknown') info += ` (${type.toUpperCase()})`;
      if (size) info += ` - ${size}`;
      if (modified) info += ` - Modified: ${modified}`;
      if (authors) info += ` - Authors: ${authors}`;
      
      return info;
    }).join('\n');

    const pagination = result.pagination ? 
      `\nPage ${result.pagination.current_page} of ${result.pagination.total_pages} (${result.pagination.total_items} total)` : '';

    return docs + pagination;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }
}
