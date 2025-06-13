/**
 * Search MCP Handler - Document Intelligence
 * 
 * This handler provides document search tools for Claude Desktop integration.
 * Implements search_documents and search_chunks tools using the same domain services as gRPC.
 */

import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPToolDefinition } from '../types.js';

// TODO: Import proper domain service interfaces when available
interface ISearchService {
  searchDocuments(params: any): Promise<any>;
  searchChunks(params: any): Promise<any>;
}

export class SearchHandler {
  constructor(
    private readonly logger: ILoggingService,
    private readonly searchService: ISearchService
  ) {}

  /**
   * Get tool definitions for search functionality
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'search_documents',
        description: 'Search for documents using semantic similarity with optional metadata filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for semantic document discovery'
            },
            top_k: {
              type: 'number',
              description: 'Maximum number of documents to return (1-50)',
              minimum: 1,
              maximum: 50,
              default: 10
            },
            document_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by document types (pdf, docx, pptx, xlsx, txt)'
            },
            authors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by document authors'
            },
            date_from: {
              type: 'string',
              description: 'Filter documents created after this date (ISO 8601)'
            },
            date_to: {
              type: 'string',
              description: 'Filter documents created before this date (ISO 8601)'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'search_chunks',
        description: 'Search for specific text chunks within documents with preview context',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for chunk-level text search'
            },
            top_k: {
              type: 'number',
              description: 'Maximum number of chunks to return (1-50)',
              minimum: 1,
              maximum: 50,
              default: 10
            },
            document_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by document types'
            },
            include_context: {
              type: 'boolean',
              description: 'Include surrounding text context in results',
              default: true
            }
          },
          required: ['query']
        }
      }
    ];
  }

  /**
   * Handle search_documents tool calls
   */
  async handleSearchDocuments(args: {
    query: string;
    top_k?: number;
    document_types?: string[];
    authors?: string[];
    date_from?: string;
    date_to?: string;
  }): Promise<any> {
    try {
      this.logger.info('Search documents tool called', { args });

      // Input validation
      if (!args.query || args.query.trim().length === 0) {
        throw new Error('Query is required and cannot be empty');
      }

      const topK = args.top_k || 10;
      if (topK < 1 || topK > 50) {
        throw new Error('top_k must be between 1 and 50');
      }

      // Call domain service (same as gRPC endpoint)
      const results = await this.searchService.searchDocuments({
        query: args.query,
        topK,
        filters: {
          documentTypes: args.document_types,
          authors: args.authors,
          dateFrom: args.date_from,
          dateTo: args.date_to
        }
      });

      // Format for Claude Desktop (chat-friendly)
      const formattedResults = {
        query: args.query,
        total_results: results.totalResults,
        documents: results.documents.slice(0, topK).map((doc: any) => ({
          id: doc.id,
          title: doc.title || doc.path,
          path: doc.path,
          document_type: doc.documentType,
          author: doc.author,
          creation_date: doc.creationDate,
          modification_date: doc.modificationDate,
          similarity_score: Math.round(doc.similarityScore * 100) / 100,
          preview: doc.matchContext ? (doc.matchContext.substring(0, 200) + (doc.matchContext.length > 200 ? '...' : '')) : 'No preview available'
        }))
      };

      this.logger.info('Search documents completed', { 
        query: args.query, 
        resultsCount: formattedResults.documents.length 
      });

      return {
        content: [{
          type: 'text',
          text: this.formatSearchDocumentsResponse(formattedResults, args.query)
        }]
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Search documents error', err, { args });
      throw new Error(`Search failed: ${err.message}`);
    }
  }

  /**
   * Handle search_chunks tool calls
   */
  async handleSearchChunks(args: {
    query: string;
    top_k?: number;
    document_types?: string[];
    include_context?: boolean;
  }): Promise<any> {
    try {
      this.logger.info('Search chunks tool called', { args });

      // Input validation
      if (!args.query || args.query.trim().length === 0) {
        throw new Error('Query is required and cannot be empty');
      }

      const topK = args.top_k || 10;
      if (topK < 1 || topK > 50) {
        throw new Error('top_k must be between 1 and 50');
      }

      // Call domain service (same as gRPC endpoint)
      const results = await this.searchService.searchChunks({
        query: args.query,
        topK,
        filters: {
          documentTypes: args.document_types
        },
        includeContext: args.include_context ?? true
      });

      // Format for Claude Desktop (chat-friendly)
      const formattedResults = {
        query: args.query,
        total_results: results.totalResults,
        chunks: results.chunks.slice(0, topK).map((chunk: any) => ({
          chunk_id: chunk.id,
          document_id: chunk.documentId,
          document_title: chunk.documentTitle,
          document_path: chunk.documentPath,
          text: chunk.text ? chunk.text.substring(0, 1000) : '', // Limit for chat context
          similarity_score: Math.round(chunk.similarityScore * 100) / 100,
          context_before: args.include_context && chunk.contextBefore ? chunk.contextBefore.substring(0, 100) : undefined,
          context_after: args.include_context && chunk.contextAfter ? chunk.contextAfter.substring(0, 100) : undefined,
          page_number: chunk.pageNumber,
          section: chunk.section
        }))
      };

      this.logger.info('Search chunks completed', { 
        query: args.query, 
        resultsCount: formattedResults.chunks.length 
      });

      return {
        content: [{
          type: 'text',
          text: this.formatSearchChunksResponse(formattedResults, args.query)
        }]
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Search chunks error', err, { args });
      throw new Error(`Search failed: ${err.message}`);
    }
  }

  /**
   * Format search documents response for display
   */
  private formatSearchDocumentsResponse(results: any, query: string): string {
    const lines = [];
    
    lines.push(`Search Results for "${query}"`);
    lines.push(`Found ${results.total_results} documents:`);
    lines.push('');
    
    if (!results.documents || results.documents.length === 0) {
      return lines.join('\n') + 'No documents found.';
    }
    
    results.documents.forEach((doc: any, index: number) => {
      lines.push(`${index + 1}. ${doc.title || doc.path}`);
      if (doc.document_type) lines.push(`   Type: ${doc.document_type.toUpperCase()}`);
      if (doc.author) lines.push(`   Author: ${doc.author}`);
      if (doc.similarity_score) lines.push(`   Relevance: ${(doc.similarity_score * 100).toFixed(1)}%`);
      if (doc.preview) lines.push(`   Preview: ${doc.preview}`);
      lines.push('');
    });
    
    return lines.join('\n').trim();
  }

  /**
   * Format search chunks response for display
   */
  private formatSearchChunksResponse(results: any, query: string): string {
    const lines = [];
    
    lines.push(`Chunk Search Results for "${query}"`);
    lines.push(`Found ${results.total_results} chunks:`);
    lines.push('');
    
    if (!results.chunks || results.chunks.length === 0) {
      return lines.join('\n') + 'No chunks found.';
    }
    
    results.chunks.forEach((chunk: any, index: number) => {
      lines.push(`${index + 1}. ${chunk.document_title || chunk.document_path}`);
      lines.push(`   Chunk ID: ${chunk.chunk_id}`);
      if (chunk.page_number) lines.push(`   Page: ${chunk.page_number}`);
      if (chunk.section) lines.push(`   Section: ${chunk.section}`);
      if (chunk.similarity_score) lines.push(`   Relevance: ${(chunk.similarity_score * 100).toFixed(1)}%`);
      
      // Safely handle text content
      const text = chunk.text || '';
      const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
      if (preview) lines.push(`   Content: ${preview}`);
      
      // Safely handle context
      if (chunk.context_before) {
        const contextBefore = chunk.context_before.substring ? chunk.context_before.substring(0, 100) : String(chunk.context_before);
        lines.push(`   Context Before: ...${contextBefore}`);
      }
      if (chunk.context_after) {
        const contextAfter = chunk.context_after.substring ? chunk.context_after.substring(0, 100) : String(chunk.context_after);
        lines.push(`   Context After: ${contextAfter}...`);
      }
      
      lines.push('');
    });
    
    return lines.join('\n').trim();
  }
}
