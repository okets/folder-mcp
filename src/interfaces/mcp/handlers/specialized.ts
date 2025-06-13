/**
 * Specialized MCP Handler - Advanced Document Intelligence Tools
 * 
 * This handler provides specialized tools for Claude Desktop integration.
 * Implements query_table, get_status, refresh_document, and get_embeddings tools using the same domain services as gRPC.
 */

import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPToolDefinition } from '../types.js';

// TODO: Import proper domain service interfaces when available
interface ISpecializedService {
  tableQuery(params: any): Promise<any>;
  getIngestStatus(params: any): Promise<any>;
  refreshDocument(params: any): Promise<any>;
  getEmbedding(params: any): Promise<any>;
}

export class SpecializedHandler {
  constructor(
    private readonly logger: ILoggingService,
    private readonly specializedService: ISpecializedService
  ) {}

  /**
   * Get tool definitions for specialized functionality
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'query_table',
        description: 'Perform semantic queries over spreadsheet data with sheet and range selection',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Unique identifier for the spreadsheet document'
            },
            query: {
              type: 'string',
              description: 'Natural language query about the table data'
            },
            sheets: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific sheet names to search (optional, searches all if not specified)'
            },
            cell_range: {
              type: 'string',
              description: 'Specific cell range to search (e.g., "A1:D10")'
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of matching cells/rows to return (1-100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            include_context: {
              type: 'boolean',
              description: 'Include surrounding cells for context',
              default: true
            }
          },
          required: ['document_id', 'query']
        }
      },
      {
        name: 'get_status',
        description: 'Get document processing status and ingestion progress monitoring',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Specific document ID to check status for (optional)'
            },
            job_id: {
              type: 'string',
              description: 'Specific job ID to check status for (optional)'
            },
            status_filter: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'retry']
              },
              description: 'Filter by processing status'
            },
            include_details: {
              type: 'boolean',
              description: 'Include detailed processing information',
              default: true
            },
            include_errors: {
              type: 'boolean',
              description: 'Include error details for failed processes',
              default: true
            },
            limit: {
              type: 'number',
              description: 'Maximum number of status entries to return (1-100)',
              minimum: 1,
              maximum: 100,
              default: 50
            }
          }
        }
      },
      {
        name: 'refresh_document',
        description: 'Trigger document re-processing with job tracking',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Unique identifier for the document to refresh'
            },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high', 'urgent'],
              description: 'Processing priority for the refresh operation',
              default: 'normal'
            },
            force_reprocess: {
              type: 'boolean',
              description: 'Force complete reprocessing even if document hasn\'t changed',
              default: false
            },
            sections: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific sections to refresh (optional, refreshes all if not specified)'
            },
            notify_on_completion: {
              type: 'boolean',
              description: 'Request notification when processing completes',
              default: false
            }
          },
          required: ['document_id']
        }
      },
      {
        name: 'get_embeddings',
        description: 'Get raw vector embeddings for debugging and advanced queries',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Document ID to get embeddings for (optional if chunk_ids provided)'
            },
            chunk_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific chunk IDs to get embeddings for (optional if document_id provided)'
            },
            include_metadata: {
              type: 'boolean',
              description: 'Include chunk metadata with embeddings',
              default: true
            },
            format: {
              type: 'string',
              enum: ['array', 'base64', 'hex'],
              description: 'Format for embedding vectors',
              default: 'array'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of embeddings to return (1-50)',
              minimum: 1,
              maximum: 50,
              default: 10
            }
          }
        }
      }
    ];
  }

  /**
   * Handle tool calls for specialized functionality
   */
  async handleToolCall(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'query_table':
          return await this.handleQueryTable(args);
        case 'get_status':
          return await this.handleGetStatus(args);
        case 'refresh_document':
          return await this.handleRefreshDocument(args);
        case 'get_embeddings':
          return await this.handleGetEmbeddings(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Specialized tool call failed', err, { tool: name });
      throw error;
    }
  }

  private async handleQueryTable(args: any): Promise<any> {
    this.logger.info('Querying table data', { args });
    
    if (!args.document_id || !args.query) {
      throw new Error('document_id and query are required');
    }

    const params = {
      document_id: args.document_id,
      query: args.query,
      sheets: args.sheets || [],
      cell_range: args.cell_range,
      max_results: args.max_results || 20,
      include_context: args.include_context !== false
    };

    const result = await this.specializedService.tableQuery(params);
    
    return {
      content: [{
        type: 'text',
        text: `Table Query Results:\n\n${this.formatTableQueryResponse(result, args.query)}`
      }]
    };
  }

  private async handleGetStatus(args: any): Promise<any> {
    this.logger.info('Getting processing status', { args });

    const params = {
      document_id: args.document_id,
      job_id: args.job_id,
      status_filter: args.status_filter || [],
      include_details: args.include_details !== false,
      include_errors: args.include_errors !== false,
      limit: args.limit || 50
    };

    const result = await this.specializedService.getIngestStatus(params);
    
    return {
      content: [{
        type: 'text',
        text: `Processing Status:\n\n${this.formatStatusResponse(result)}`
      }]
    };
  }

  private async handleRefreshDocument(args: any): Promise<any> {
    this.logger.info('Refreshing document', { args });
    
    if (!args.document_id) {
      throw new Error('document_id is required');
    }

    const params = {
      document_id: args.document_id,
      priority: args.priority || 'normal',
      force_reprocess: args.force_reprocess === true,
      sections: args.sections || [],
      notify_on_completion: args.notify_on_completion === true
    };

    const result = await this.specializedService.refreshDocument(params);
    
    return {
      content: [{
        type: 'text',
        text: `Document Refresh Started:\n\n${this.formatRefreshResponse(result)}`
      }]
    };
  }

  private async handleGetEmbeddings(args: any): Promise<any> {
    this.logger.info('Getting embeddings', { args });
    
    if (!args.document_id && (!args.chunk_ids || args.chunk_ids.length === 0)) {
      throw new Error('Either document_id or chunk_ids must be provided');
    }

    const params = {
      document_id: args.document_id,
      chunk_ids: args.chunk_ids || [],
      include_metadata: args.include_metadata !== false,
      format: args.format || 'array',
      limit: args.limit || 10
    };

    const result = await this.specializedService.getEmbedding(params);
    
    return {
      content: [{
        type: 'text',
        text: `Embeddings:\n\n${this.formatEmbeddingsResponse(result)}`
      }]
    };
  }

  private formatTableQueryResponse(result: any, query: string): string {
    const lines = [];
    
    lines.push(`Query: "${query}"`);
    lines.push(`Found ${result.matches?.length || 0} matching results\n`);
    
    if (!result.matches || result.matches.length === 0) {
      return lines.join('\n') + 'No matches found.';
    }
    
    result.matches.forEach((match: any, index: number) => {
      lines.push(`Result ${index + 1}:`);
      if (match.sheet) lines.push(`  Sheet: ${match.sheet}`);
      if (match.cell_range) lines.push(`  Range: ${match.cell_range}`);
      if (match.value !== undefined) lines.push(`  Value: ${match.value}`);
      if (match.data_type) lines.push(`  Type: ${match.data_type}`);
      if (match.confidence) lines.push(`  Confidence: ${(match.confidence * 100).toFixed(1)}%`);
      
      if (match.context && match.context.length > 0) {
        lines.push('  Context:');
        match.context.forEach((ctx: any) => {
          lines.push(`    ${ctx.cell}: ${ctx.value}`);
        });
      }
      
      lines.push('');
    });
    
    return lines.join('\n').trim();
  }

  private formatStatusResponse(result: any): string {
    const lines = [];
    
    if (result.summary) {
      lines.push('Summary:');
      Object.entries(result.summary).forEach(([status, count]) => {
        lines.push(`  ${status}: ${count}`);
      });
      lines.push('');
    }
    
    if (result.jobs && result.jobs.length > 0) {
      lines.push('Recent Jobs:');
      result.jobs.forEach((job: any) => {
        const status = this.getStatusEmoji(job.status);
        const duration = job.duration ? ` (${job.duration}ms)` : '';
        
        lines.push(`${status} ${job.job_id || job.document_id}`);
        if (job.document_title) lines.push(`    Document: ${job.document_title}`);
        if (job.status) lines.push(`    Status: ${job.status}`);
        if (job.started_at) lines.push(`    Started: ${new Date(job.started_at).toLocaleString()}`);
        if (job.completed_at) lines.push(`    Completed: ${new Date(job.completed_at).toLocaleString()}`);
        if (job.progress !== undefined) lines.push(`    Progress: ${job.progress}%`);
        
        if (job.error && job.status === 'failed') {
          lines.push(`    Error: ${job.error}`);
        }
        
        lines.push('');
      });
    }
    
    return lines.join('\n').trim();
  }

  private formatRefreshResponse(result: any): string {
    const lines = [];
    
    if (result.job_id) lines.push(`Job ID: ${result.job_id}`);
    if (result.document_id) lines.push(`Document ID: ${result.document_id}`);
    if (result.priority) lines.push(`Priority: ${result.priority}`);
    if (result.estimated_completion) {
      lines.push(`Estimated Completion: ${new Date(result.estimated_completion).toLocaleString()}`);
    }
    
    if (result.sections && result.sections.length > 0) {
      lines.push(`Sections to refresh: ${result.sections.join(', ')}`);
    }
    
    lines.push(`Status: ${result.status || 'queued'}`);
    
    if (result.message) {
      lines.push(`Message: ${result.message}`);
    }
    
    return lines.join('\n');
  }

  private formatEmbeddingsResponse(result: any): string {
    const lines = [];
    
    if (result.embeddings && result.embeddings.length > 0) {
      lines.push(`Found ${result.embeddings.length} embeddings:`);
      lines.push('');
      
      result.embeddings.forEach((embedding: any, index: number) => {
        lines.push(`Embedding ${index + 1}:`);
        if (embedding.chunk_id) lines.push(`  Chunk ID: ${embedding.chunk_id}`);
        if (embedding.document_id) lines.push(`  Document ID: ${embedding.document_id}`);
        
        if (embedding.metadata) {
          lines.push('  Metadata:');
          Object.entries(embedding.metadata).forEach(([key, value]) => {
            lines.push(`    ${key}: ${value}`);
          });
        }
        
        if (embedding.vector) {
          const vectorInfo = Array.isArray(embedding.vector) 
            ? `Array of ${embedding.vector.length} dimensions`
            : `${typeof embedding.vector} format`;
          lines.push(`  Vector: ${vectorInfo}`);
          
          // Show first few dimensions if array format
          if (Array.isArray(embedding.vector) && embedding.vector.length > 0) {
            const preview = embedding.vector.slice(0, 5).map((v: number) => v.toFixed(4)).join(', ');
            const more = embedding.vector.length > 5 ? ', ...' : '';
            lines.push(`    Preview: [${preview}${more}]`);
          }
        }
        
        lines.push('');
      });
    } else {
      lines.push('No embeddings found.');
    }
    
    return lines.join('\n').trim();
  }

  private getStatusEmoji(status: string): string {
    const statusEmojis: Record<string, string> = {
      pending: '⏳',
      processing: '⚙️',
      completed: '✅',
      failed: '❌',
      cancelled: '🚫',
      retry: '🔄'
    };
    return statusEmojis[status] || '❓';
  }
}
