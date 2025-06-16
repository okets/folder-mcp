/**
 * MCP Resources Handler - Save/Drag Functionality
 * 
 * This handler provides MCP resources for search results and document content
 * that can be saved via Save button or dragged to Explorer view in VSCode.
 * 
 * Following VSCode 1.101 MCP documentation:
 * - Resources returned from tool calls can be saved via Save button
 * - Drag resources onto Explorer view
 * - Attach as context via "Add Context... > MCP Resources"
 */

import type { ILoggingService } from '../../../di/interfaces.js';

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

export class MCPResourcesHandler {
  constructor(
    private readonly logger: ILoggingService
  ) {}

  /**
   * Create a resource from search results
   */
  createSearchResource(query: string, results: any[]): MCPResource {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uri = `search://folder-mcp/results/${encodeURIComponent(query)}-${timestamp}`;
    
    return {
      uri,
      name: `Search Results: ${query}`,
      description: `${results.length} search results for "${query}"`,
      mimeType: 'text/markdown'
    };
  }

  /**
   * Create a resource from document content
   */
  createDocumentResource(documentId: string, title: string, content: string): MCPResource {
    const uri = `document://folder-mcp/content/${encodeURIComponent(documentId)}`;
    
    return {
      uri,
      name: title || `Document ${documentId}`,
      description: `Content from document ${documentId}`,
      mimeType: 'text/markdown'
    };
  }

  /**
   * Create a resource from analysis results
   */
  createAnalysisResource(type: string, results: any): MCPResource {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uri = `analysis://folder-mcp/${type}/${timestamp}`;
    
    return {
      uri,
      name: `${type} Analysis Results`,
      description: `Analysis results from ${type} operation`,
      mimeType: 'application/json'
    };
  }

  /**
   * Get resource content for save/drag operations
   */
  async getResourceContent(uri: string): Promise<MCPResourceContent> {
    this.logger.info('Getting resource content', { uri });

    try {
      const url = new URL(uri);
      
      switch (url.protocol) {
        case 'search:':
          return this.getSearchResourceContent(url);
        case 'document:':
          return this.getDocumentResourceContent(url);
        case 'analysis:':
          return this.getAnalysisResourceContent(url);
        default:
          throw new Error(`Unsupported resource protocol: ${url.protocol}`);
      }
    } catch (error) {
      this.logger.error('Failed to get resource content', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async getSearchResourceContent(url: URL): Promise<MCPResourceContent> {
    // Extract search query and timestamp from URI
    const pathParts = url.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (!lastPart) {
      throw new Error('Invalid search resource URI');
    }
    
    const queryWithTimestamp = decodeURIComponent(lastPart);
    const lastDashIndex = queryWithTimestamp.lastIndexOf('-');
    const query = queryWithTimestamp.substring(0, lastDashIndex);
    
    // Generate markdown content for search results
    const content = `# Search Results: ${query}

Query executed at: ${new Date().toISOString()}

## Results

*Note: This is a placeholder resource. In a full implementation, this would contain the actual search results.*

Search Query: \`${query}\`
Results Count: 0
Execution Time: 0ms

## Next Steps

1. Review the search results above
2. Refine your query if needed
3. Use document access tools for detailed content
`;

    return {
      uri: url.toString(),
      mimeType: 'text/markdown',
      text: content
    };
  }

  private async getDocumentResourceContent(url: URL): Promise<MCPResourceContent> {
    // Extract document ID from URI
    const pathParts = url.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (!lastPart) {
      throw new Error('Invalid document resource URI');
    }
    
    const documentId = decodeURIComponent(lastPart);
    
    // Generate markdown content for document
    const content = `# Document Content: ${documentId}

Document ID: \`${documentId}\`
Retrieved at: ${new Date().toISOString()}

## Content

*Note: This is a placeholder resource. In a full implementation, this would contain the actual document content.*

Use the \`get_document_content\` tool to retrieve the actual document content.
`;

    return {
      uri: url.toString(),
      mimeType: 'text/markdown',
      text: content
    };
  }

  private async getAnalysisResourceContent(url: URL): Promise<MCPResourceContent> {
    // Extract analysis type from URI
    const pathParts = url.pathname.split('/');
    const analysisType = pathParts[1];
    const timestamp = pathParts[2];
    
    // Generate JSON content for analysis
    const content = {
      type: analysisType,
      timestamp: timestamp,
      results: {
        note: "This is a placeholder resource. In a full implementation, this would contain the actual analysis results."
      }
    };

    return {
      uri: url.toString(),
      mimeType: 'application/json',
      text: JSON.stringify(content, null, 2)
    };
  }
}
