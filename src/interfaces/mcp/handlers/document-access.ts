/**
 * Document Access MCP Handler - Document Content and Metadata Access
 * 
 * This handler provides document access tools for Claude Desktop integration.
 * Implements get_document_metadata, get_document_content, and get_chunks tools using the same domain services as gRPC.
 */

import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPToolDefinition } from '../types.js';

// TODO: Import proper domain service interfaces when available
interface IDocumentService {
  getDocumentMetadata(params: any): Promise<any>;
  downloadDocument(params: any): Promise<any>;
  getChunks(params: any): Promise<any>;
}

export class DocumentAccessHandler {
  constructor(
    private readonly logger: ILoggingService,
    private readonly documentService: IDocumentService
  ) {}

  /**
   * Get tool definitions for document access functionality
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'get_document_metadata',
        description: 'Get structural metadata for a document (sheets, slides, authors, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Unique identifier for the document'
            },
            include_structure: {
              type: 'boolean',
              description: 'Include document structure (sheets, slides, sections)',
              default: true
            },
            include_authors: {
              type: 'boolean',
              description: 'Include author information',
              default: true
            },
            include_stats: {
              type: 'boolean',
              description: 'Include document statistics (word count, page count)',
              default: true
            }
          },
          required: ['document_id']
        }
      },
      {
        name: 'get_document_content',
        description: 'Get the full text content of a document or specific sections',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Unique identifier for the document'
            },
            format: {
              type: 'string',
              enum: ['text', 'markdown', 'html'],
              description: 'Output format for the content',
              default: 'text'
            },
            sections: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific sections to retrieve (e.g., sheet names, slide numbers)'
            },
            max_length: {
              type: 'number',
              description: 'Maximum content length in characters (1-10000)',
              minimum: 1,
              maximum: 10000,
              default: 5000
            }
          },
          required: ['document_id']
        }
      },
      {
        name: 'get_chunks',
        description: 'Get processed text chunks from a document with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Unique identifier for the document'
            },
            chunk_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific chunk IDs to retrieve (optional)'
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (1-based)',
              minimum: 1,
              default: 1
            },
            page_size: {
              type: 'number',
              description: 'Number of chunks per page (1-100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            include_content: {
              type: 'boolean',
              description: 'Include full chunk content (may be large)',
              default: true
            },
            max_content_length: {
              type: 'number',
              description: 'Maximum content length per chunk (1-2000)',
              minimum: 1,
              maximum: 2000,
              default: 1000
            }
          },
          required: ['document_id']
        }
      }
    ];
  }

  /**
   * Handle tool calls for document access functionality
   */
  async handleToolCall(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'get_document_metadata':
          return await this.handleGetDocumentMetadata(args);
        case 'get_document_content':
          return await this.handleGetDocumentContent(args);
        case 'get_chunks':
          return await this.handleGetChunks(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Document access tool call failed', err, { tool: name });
      throw error;
    }
  }

  private async handleGetDocumentMetadata(args: any): Promise<any> {
    this.logger.info('Getting document metadata', { args });
    
    if (!args.document_id) {
      throw new Error('document_id is required');
    }

    const params = {
      document_id: args.document_id,
      include_structure: args.include_structure !== false,
      include_authors: args.include_authors !== false,
      include_stats: args.include_stats !== false
    };

    const result = await this.documentService.getDocumentMetadata(params);
    
    return {
      content: [{
        type: 'text',
        text: `Document Metadata:\n\n${this.formatMetadataResponse(result)}`
      }]
    };
  }

  private async handleGetDocumentContent(args: any): Promise<any> {
    this.logger.info('Getting document content', { args });
    
    if (!args.document_id) {
      throw new Error('document_id is required');
    }

    const params = {
      document_id: args.document_id,
      format: args.format || 'text',
      sections: args.sections || [],
      max_length: args.max_length || 5000
    };

    const result = await this.documentService.downloadDocument(params);
    
    return {
      content: [{
        type: 'text',
        text: result.content || 'No content available'
      }]
    };
  }

  private async handleGetChunks(args: any): Promise<any> {
    this.logger.info('Getting document chunks', { args });
    
    if (!args.document_id) {
      throw new Error('document_id is required');
    }

    const params = {
      document_id: args.document_id,
      chunk_ids: args.chunk_ids || [],
      page: args.page || 1,
      page_size: args.page_size || 20,
      include_content: args.include_content !== false,
      max_content_length: args.max_content_length || 1000
    };

    const result = await this.documentService.getChunks(params);
    
    return {
      content: [{
        type: 'text',
        text: `Document Chunks:\n\n${this.formatChunksResponse(result)}`
      }]
    };
  }

  private formatMetadataResponse(result: any): string {
    const lines = [];
    
    // Basic information
    if (result.title) lines.push(`Title: ${result.title}`);
    if (result.file_path) lines.push(`File: ${result.file_path}`);
    if (result.document_type) lines.push(`Type: ${result.document_type.toUpperCase()}`);
    if (result.file_size) lines.push(`Size: ${this.formatFileSize(result.file_size)}`);
    if (result.created_date) lines.push(`Created: ${new Date(result.created_date).toLocaleString()}`);
    if (result.modified_date) lines.push(`Modified: ${new Date(result.modified_date).toLocaleString()}`);
    
    // Authors
    if (result.authors && result.authors.length > 0) {
      lines.push('\nAuthors:');
      result.authors.forEach((author: any) => {
        lines.push(`  - ${author.name || author}`);
      });
    }
    
    // Structure
    if (result.structure) {
      lines.push('\nStructure:');
      if (result.structure.sheets) {
        lines.push(`  Sheets: ${result.structure.sheets.join(', ')}`);
      }
      if (result.structure.slides) {
        lines.push(`  Slides: ${result.structure.slides.length}`);
      }
      if (result.structure.sections) {
        lines.push(`  Sections: ${result.structure.sections.length}`);
      }
    }
    
    // Statistics
    if (result.stats) {
      lines.push('\nStatistics:');
      if (result.stats.page_count) lines.push(`  Pages: ${result.stats.page_count}`);
      if (result.stats.word_count) lines.push(`  Words: ${result.stats.word_count}`);
      if (result.stats.character_count) lines.push(`  Characters: ${result.stats.character_count}`);
    }
    
    return lines.join('\n');
  }

  private formatChunksResponse(result: any): string {
    if (!result.chunks || result.chunks.length === 0) {
      return 'No chunks found.';
    }

    const chunks = result.chunks.map((chunk: any, index: number) => {
      const lines = [`Chunk ${index + 1} (ID: ${chunk.chunk_id})`];
      
      if (chunk.page_number) lines.push(`  Page: ${chunk.page_number}`);
      if (chunk.section) lines.push(`  Section: ${chunk.section}`);
      if (chunk.content_type) lines.push(`  Type: ${chunk.content_type}`);
      
      if (chunk.content) {
        const content = chunk.content.length > 200 ? 
          chunk.content.substring(0, 200) + '...' : 
          chunk.content;
        lines.push(`  Content: ${content}`);
      }
      
      return lines.join('\n');
    }).join('\n\n');

    const pagination = result.pagination ? 
      `\nPage ${result.pagination.current_page} of ${result.pagination.total_pages} (${result.pagination.total_items} total chunks)` : '';

    return chunks + pagination;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }
}
