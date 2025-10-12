/**
 * MCP-specific types and interfaces
 *
 * This file contains TypeScript types and interfaces specific to the MCP protocol
 * implementation. Following the interface layer guidelines, this only contains
 * types needed for MCP protocol handling.
 *
 * NOTE: Endpoint-specific types (SearchRequest, GetDocumentDataRequest, etc.) are
 * defined in src/daemon/rest/types.ts where they are actually used by the REST API.
 */

export interface MCPServerOptions {
  folderPath: string;
  transport?: 'stdio';
  name?: string;
  version?: string;
  enableEnhancedFeatures?: boolean;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

/**
 * Phase 10 Sprint 9: find_documents MCP Tool Interface
 *
 * Document-level semantic discovery using averaged document embeddings.
 * Returns ranked documents with summaries instead of chunk-level content.
 *
 * NOTE: folder_id is passed to REST API as URL path parameter (:folderPath),
 * NOT included in request body. This MCP interface includes it because MCP
 * tools need all parameters, but DaemonRESTClient will extract it for the URL.
 */
export interface FindDocumentsMCPRequest {
  folder_id: string;              // Required: passed as URL path param to REST API
  query: string;                  // Required: natural language topic query
  limit?: number;                 // Optional: max results per page (default: 20, max: 50)
  continuation_token?: string;    // Optional: pagination token
}

/**
 * find_documents Response Structure
 *
 * Returns document-level results with rich summaries for topic discovery.
 * Complements search_content (chunk-level) with document-level exploration.
 */
export interface FindDocumentsResponse {
  data: {
    results: FindDocumentResult[];
    statistics: {
      total_results: number;           // Total matching documents (before pagination)
      avg_relevance: number;           // Average relevance_score across results
      query_understanding: string;     // Brief description of query interpretation
    };
  };
  status: {
    success: boolean;
    code: number;
    message: string;
  };
  continuation: {
    has_more: boolean;
    next_token?: string;                // Base64url-encoded pagination state
  };
  navigation_hints: {
    next_actions: string[];              // Suggested follow-up actions
    related_queries: string[];           // Query refinement suggestions
  };
}

export interface FindDocumentResult {
  file_path: string;                   // documents.file_path
  relevance_score: number;             // (1 - vec0_distance), range [0.0, 1.0]
  document_summary: {
    top_key_phrases: SemanticScore[];  // From documents.document_keywords (top 5)
    readability_score: number;         // Averaged from chunks
    chunk_count: number;               // Total chunks in document
    size: string;                      // Human-readable file size
    modified: string;                  // ISO 8601 timestamp
  };
  download_url: string;                // For retrieving full document content
}

export interface SemanticScore {
  text: string;                        // Key phrase text
  score: number;                       // Relevance score [0.0, 1.0]
}
