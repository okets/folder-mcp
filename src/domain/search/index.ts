/**
 * Search Domain Module
 * 
 * This module contains pure business logic for search operations,
 * including vector similarity search, ranking, and result enhancement.
 */

// Import types from shared types module
import type { TextChunk, TextChunkMetadata, EmbeddingVector, ChunkId } from '../../types/index.js';

// Core domain services
export interface SearchOperations {
  findSimilar(query: EmbeddingVector, k: number): Promise<SearchResult[]>;
  searchByText(queryText: string, k: number): Promise<SearchResult[]>;
  rankResults(results: SearchResult[]): SearchResult[];
}

export interface EnhancedSearchOperations {
  semanticSearch(query: string, options: SearchOptions): Promise<EnhancedSearchResult[]>;
  contextualSearch(query: string, context: SearchContext): Promise<EnhancedSearchResult[]>;
  groupByDocument(results: SearchResult[]): GroupedSearchResults;
}

// Domain types
export interface SearchResult {
  chunk: TextChunk;
  similarity: number;
  filePath: string;
  metadata: SearchResultMetadata;
}

// Lazy loading search result without content
export interface LazySearchResult {
  chunk: TextChunkMetadata;  // Metadata only, no content field
  similarity: number;
  filePath: string;
  metadata: SearchResultMetadata;
}

export interface EnhancedSearchResult extends SearchResult {
  context?: SearchResultContext;
  ranking: ResultRanking;
  snippets: SearchSnippet[];
}

export interface SearchOptions {
  threshold?: number;
  maxResults?: number;
  includeContext?: boolean;
  groupByDocument?: boolean;
  expandParagraphs?: boolean;
}

export interface SearchContext {
  filePath?: string;
  timeRange?: TimeRange;
  contentType?: string[];
  keywords?: string[];
}

export interface SearchResultMetadata {
  score: number;
  distance: number;
  chunkIndex: number;
  chunkId?: ChunkId;  // Database ID for lazy loading content retrieval
  relevanceFactors: RelevanceFactor[];
}

export interface SearchResultContext {
  previousChunk?: TextChunk;
  nextChunk?: TextChunk;
  documentSummary?: string;
  relatedChunks?: TextChunk[];
}

export interface ResultRanking {
  semanticScore: number;
  contextualScore: number;
  recencyScore: number;
  finalScore: number;
}

export interface SearchSnippet {
  text: string;
  startOffset: number;
  endOffset: number;
  highlights: TextHighlight[];
}

export interface GroupedSearchResults {
  groups: DocumentGroup[];
  totalResults: number;
  totalDocuments: number;
}

export interface DocumentGroup {
  filePath: string;
  results: SearchResult[];
  documentScore: number;
  documentMetadata: DocumentMetadata;
}

export interface TextHighlight {
  start: number;
  end: number;
  type: 'match' | 'context' | 'keyword';
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface RelevanceFactor {
  factor: string;
  weight: number;
  contribution: number;
}

export interface DocumentMetadata {
  title?: string;
  lastModified: Date;
  size: number;
  type: string;
}

// Export types for other modules
export type { TextChunk, EmbeddingVector };
