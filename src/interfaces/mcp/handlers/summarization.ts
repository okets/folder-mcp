/**
 * Summarization MCP Handler - Document Summarization
 * 
 * This handler provides document summarization tools for Claude Desktop integration.
 * Implements summarize_document and batch_summarize tools using the same domain services as gRPC.
 */

import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPToolDefinition } from '../types.js';

// TODO: Import proper domain service interfaces when available
interface ISummarizationService {
  getDocumentSummary(params: any): Promise<any>;
  batchDocumentSummary(params: any): Promise<any>;
}

export class SummarizationHandler {
  constructor(
    private readonly logger: ILoggingService,
    private readonly summarizationService: ISummarizationService
  ) {}

  /**
   * Get tool definitions for summarization functionality
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'summarize_document',
        description: 'Generate a summary of a single document with different modes and detail levels',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Unique identifier for the document to summarize'
            },
            mode: {
              type: 'string',
              enum: ['brief', 'detailed', 'executive', 'technical'],
              description: 'Summary mode: brief (≤200 tokens), detailed (≤500 tokens), executive (≤300 tokens), technical (≤500 tokens)',
              default: 'brief'
            },
            sections: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific sections to summarize (e.g., sheet names, chapter titles)'
            },
            focus_areas: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific topics or areas to focus on in the summary'
            },
            include_key_points: {
              type: 'boolean',
              description: 'Include numbered key points in the summary',
              default: true
            },
            include_references: {
              type: 'boolean',
              description: 'Include page/section references for key information',
              default: false
            }
          },
          required: ['document_id']
        }
      },
      {
        name: 'batch_summarize',
        description: 'Generate summaries for multiple documents with a total token limit',
        inputSchema: {
          type: 'object',
          properties: {
            document_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of document IDs to summarize (max 20 documents)',
              maxItems: 20
            },
            mode: {
              type: 'string',
              enum: ['brief', 'detailed', 'executive', 'technical'],
              description: 'Summary mode for all documents',
              default: 'brief'
            },
            max_total_tokens: {
              type: 'number',
              description: 'Maximum total tokens across all summaries (100-2000)',
              minimum: 100,
              maximum: 2000,
              default: 1000
            },
            priority_order: {
              type: 'string',
              enum: ['document_order', 'size_desc', 'modified_desc', 'importance'],
              description: 'Order to prioritize documents if token limit is reached',
              default: 'document_order'
            },
            include_document_info: {
              type: 'boolean',
              description: 'Include document metadata (title, type, date) in each summary',
              default: true
            },
            group_by_type: {
              type: 'boolean',
              description: 'Group summaries by document type',
              default: false
            }
          },
          required: ['document_ids']
        }
      }
    ];
  }

  /**
   * Handle tool calls for summarization functionality
   */
  async handleToolCall(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'summarize_document':
          return await this.handleSummarizeDocument(args);
        case 'batch_summarize':
          return await this.handleBatchSummarize(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Summarization tool call failed', err, { tool: name });
      throw error;
    }
  }

  private async handleSummarizeDocument(args: any): Promise<any> {
    this.logger.info('Summarizing document', { args });
    
    if (!args.document_id) {
      throw new Error('document_id is required');
    }

    const params = {
      document_id: args.document_id,
      mode: args.mode || 'brief',
      sections: args.sections || [],
      focus_areas: args.focus_areas || [],
      include_key_points: args.include_key_points !== false,
      include_references: args.include_references === true
    };

    const result = await this.summarizationService.getDocumentSummary(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatSummaryResponse(result, args.document_id)
      }]
    };
  }

  private async handleBatchSummarize(args: any): Promise<any> {
    this.logger.info('Batch summarizing documents', { args });
    
    if (!args.document_ids || args.document_ids.length === 0) {
      throw new Error('document_ids is required and must not be empty');
    }

    if (args.document_ids.length > 20) {
      throw new Error('Maximum 20 documents allowed for batch summarization');
    }

    const params = {
      document_ids: args.document_ids,
      mode: args.mode || 'brief',
      max_total_tokens: args.max_total_tokens || 1000,
      priority_order: args.priority_order || 'document_order',
      include_document_info: args.include_document_info !== false,
      group_by_type: args.group_by_type === true
    };

    const result = await this.summarizationService.batchDocumentSummary(params);
    
    return {
      content: [{
        type: 'text',
        text: this.formatBatchSummaryResponse(result, args.document_ids.length)
      }]
    };
  }

  private formatSummaryResponse(result: any, documentId: string): string {
    const lines = [];
    
    // Header
    lines.push(`📄 Document Summary (${documentId})\n`);
    
    // Document info if available
    if (result.document_info) {
      const info = result.document_info;
      if (info.title) lines.push(`Title: ${info.title}`);
      if (info.document_type) lines.push(`Type: ${info.document_type.toUpperCase()}`);
      if (info.page_count) lines.push(`Pages: ${info.page_count}`);
      if (info.word_count) lines.push(`Words: ${info.word_count}`);
      lines.push('');
    }
    
    // Summary mode info
    if (result.mode) {
      const modeDescriptions = {
        brief: 'Brief Summary (≤200 tokens)',
        detailed: 'Detailed Summary (≤500 tokens)',
        executive: 'Executive Summary (≤300 tokens)',
        technical: 'Technical Summary (≤500 tokens)'
      };
      lines.push(`Mode: ${modeDescriptions[result.mode as keyof typeof modeDescriptions] || result.mode}\n`);
    }
    
    // Main summary
    if (result.summary) {
      lines.push('Summary:');
      lines.push(result.summary);
      lines.push('');
    }
    
    // Key points
    if (result.key_points && result.key_points.length > 0) {
      lines.push('Key Points:');
      result.key_points.forEach((point: any, index: number) => {
        const ref = point.reference ? ` (${point.reference})` : '';
        lines.push(`${index + 1}. ${point.text || point}${ref}`);
      });
      lines.push('');
    }
    
    // Sections covered
    if (result.sections_covered && result.sections_covered.length > 0) {
      lines.push(`Sections Covered: ${result.sections_covered.join(', ')}`);
      lines.push('');
    }
    
    // Token usage
    if (result.token_count) {
      lines.push(`Tokens Used: ${result.token_count}`);
    }
    
    return lines.join('\n').trim();
  }

  private formatBatchSummaryResponse(result: any, documentCount: number): string {
    const lines = [];
    
    // Header
    lines.push(`📚 Batch Summary (${documentCount} documents)\n`);
    
    // Overall stats
    if (result.total_tokens) {
      lines.push(`Total Tokens: ${result.total_tokens}`);
    }
    if (result.documents_processed !== undefined) {
      lines.push(`Documents Processed: ${result.documents_processed} / ${documentCount}`);
    }
    if (result.processing_time) {
      lines.push(`Processing Time: ${result.processing_time}ms`);
    }
    lines.push('');
    
    // Group by type if requested
    if (result.grouped_by_type && result.summaries_by_type) {
      Object.entries(result.summaries_by_type).forEach(([type, summaries]) => {
        lines.push(`## ${type.toUpperCase()} Documents\n`);
        (summaries as any[]).forEach((summary, index) => {
          lines.push(this.formatIndividualSummary(summary, index + 1));
          lines.push('');
        });
      });
    } else if (result.summaries) {
      // Regular list format
      lines.push('## Document Summaries\n');
      result.summaries.forEach((summary: any, index: number) => {
        lines.push(this.formatIndividualSummary(summary, index + 1));
        lines.push('');
      });
    }
    
    // Warnings or notes
    if (result.truncated) {
      lines.push('⚠️ Some documents were truncated due to token limits.');
    }
    if (result.failed_documents && result.failed_documents.length > 0) {
      lines.push(`⚠️ Failed to process: ${result.failed_documents.join(', ')}`);
    }
    
    return lines.join('\n').trim();
  }

  private formatIndividualSummary(summary: any, index: number): string {
    const lines = [];
    
    // Document header
    const title = summary.document_info?.title || summary.document_id || `Document ${index}`;
    lines.push(`### ${index}. ${title}`);
    
    // Document metadata
    if (summary.document_info) {
      const info = summary.document_info;
      const metadata = [];
      if (info.document_type) metadata.push(info.document_type.toUpperCase());
      if (info.page_count) metadata.push(`${info.page_count} pages`);
      if (info.modified_date) metadata.push(`Modified: ${new Date(info.modified_date).toLocaleDateString()}`);
      
      if (metadata.length > 0) {
        lines.push(`*${metadata.join(' • ')}*`);
      }
    }
    
    // Summary content
    if (summary.summary) {
      lines.push('');
      lines.push(summary.summary);
    }
    
    // Key points (abbreviated for batch)
    if (summary.key_points && summary.key_points.length > 0) {
      lines.push('');
      lines.push('**Key Points:**');
      summary.key_points.slice(0, 3).forEach((point: any) => {
        lines.push(`• ${point.text || point}`);
      });
      if (summary.key_points.length > 3) {
        lines.push(`• ... and ${summary.key_points.length - 3} more`);
      }
    }
    
    return lines.join('\n');
  }
}
