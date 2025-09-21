/**
 * Shared search types for vector search services
 * 
 * Extracted from basic-vector-search.ts to be used across multiple search services
 */

export interface StoredEmbedding {
  id: string;
  documentId: string;
  chunkId: string;
  vector: number[];
  folderPath: string;
  modelId: string;
  metadata: {
    content: string;
    page?: number;
    section?: string;
    sheet?: string;
    slide?: number;
    filePath?: string;
  };
}

export interface BasicSearchResult {
  id: string;
  documentId: string;
  chunkId: string;
  score: number;
  content: string;
  metadata: any;
  folderPath: string;
  modelId: string;
  // Semantic metadata fields
  keyPhrases?: string[];
  readabilityScore?: number;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  folderPath?: string;
  includeMetadata?: boolean;
}