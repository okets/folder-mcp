/**
 * Knowledge Request Handler
 * 
 * Handles MCP requests related to knowledge operations by delegating
 * to the KnowledgeOperationsService application service.
 */

import type { KnowledgeOperations } from '../../../application/serving/index.js';
import type { ILoggingService } from '../../../di/interfaces.js';
import type { MCPToolDefinition } from './index.js';

export class KnowledgeRequestHandler {
  constructor(
    private readonly knowledgeOps: KnowledgeOperations,
    private readonly loggingService: ILoggingService
  ) {}

  /**
   * Handle search_knowledge requests
   */
  async handleSearchKnowledge(params: {
    query: string;
    top_k?: number;
    threshold?: number;
  }): Promise<any> {
    try {
      this.loggingService.debug('MCP: Handling search_knowledge request', { 
        query: params.query,
        topK: params.top_k,
        threshold: params.threshold
      });

      const result = await this.knowledgeOps.semanticSearch(params.query, {
        maxResults: params.top_k || 5,
        threshold: params.threshold || 0.0,
        includeContext: true
      });

      if (!result.success) {
        throw new Error('Search failed');
      }

      if (result.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No similar content found.',
            },
          ],
        };
      }

      // Format results
      let response = `Found ${result.results.length} similar results:\n\n`;
      
      for (const item of result.results) {
        response += `Score: ${item.similarity.toFixed(3)}\n`;
        response += `File: ${item.filePath}\n`;
        response += `Content: ${item.content}\n`;
        if (item.metadata) {
          response += `Metadata: ${JSON.stringify(item.metadata, null, 2)}\n`;
        }
        response += '\n';
      }

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('MCP: Failed to search knowledge', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle enhanced search_knowledge requests
   */
  async handleEnhancedSearchKnowledge(params: {
    query: string;
    top_k?: number;
    threshold?: number;
    include_context?: boolean;
    expand_paragraphs?: boolean;
    group_by_document?: boolean;
  }): Promise<any> {
    try {
      this.loggingService.debug('MCP: Handling enhanced search_knowledge request', { 
        query: params.query,
        options: params
      });

      const result = await this.knowledgeOps.enhancedSearch(params.query, {
        maxResults: params.top_k || 5,
        threshold: params.threshold || 0.0,
        includeContext: params.include_context !== false,
        expandParagraphs: params.expand_paragraphs !== false,
        groupByDocument: params.group_by_document !== false,
        includeRelated: true,
        includeSuggestions: true
      });

      if (!result.success) {
        throw new Error('Enhanced search failed');
      }

      if (result.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No similar content found.',
            },
          ],
        };
      }

      // Format enhanced results with grouping
      let response = `Found ${result.totalResults} similar results:\n\n`;
      
      // Show grouped results if available
      if (result.groupedResults?.byDocument?.length > 0) {
        response += '=== Results by Document ===\n';
        for (const group of result.groupedResults.byDocument) {
          response += `\n${group.filePath} (Score: ${group.documentScore.toFixed(3)}):\n`;
          for (const item of group.items) {
            response += `  • ${item.content.substring(0, 100)}...\n`;
            response += `    Similarity: ${item.similarity.toFixed(3)}\n`;
          }
        }
        response += '\n';
      }

      // Show suggestions if available
      if (result.suggestions?.length > 0) {
        response += '=== Search Suggestions ===\n';
        for (const suggestion of result.suggestions) {
          response += `• ${suggestion.suggestion} (${suggestion.type})\n`;
        }
        response += '\n';
      }

      // Show related queries if available
      if (result.relatedQueries?.length > 0) {
        response += '=== Related Queries ===\n';
        for (const query of result.relatedQueries) {
          response += `• ${query}\n`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      this.loggingService.error('MCP: Failed to perform enhanced search', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get tool definitions for knowledge operations
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'search_knowledge',
        description: 'Search for similar content using semantic vector search',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query text',
            },
            top_k: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5)',
              default: 5,
              minimum: 1,
              maximum: 50,
            },
            threshold: {
              type: 'number',
              description: 'Minimum similarity score threshold (0.0 to 1.0, default: 0.0)',
              default: 0,
              minimum: 0,
              maximum: 1,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_knowledge_enhanced',
        description: 'Enhanced semantic search with context, document structure, and result grouping',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query text',
            },
            top_k: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5)',
              default: 5,
              minimum: 1,
              maximum: 50,
            },
            threshold: {
              type: 'number',
              description: 'Minimum similarity score threshold (0.0 to 1.0, default: 0.0)',
              default: 0,
              minimum: 0,
              maximum: 1,
            },
            include_context: {
              type: 'boolean',
              description: 'Include previous/next chunks for context (default: true)',
              default: true,
            },
            expand_paragraphs: {
              type: 'boolean',
              description: 'Expand to paragraph boundaries (default: true)',
              default: true,
            },
            group_by_document: {
              type: 'boolean',
              description: 'Group results by source document (default: true)',
              default: true,
            },
          },
          required: ['query'],
        },
      },
    ];
  }
}
