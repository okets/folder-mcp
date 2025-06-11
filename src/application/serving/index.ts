/**
 * Serving Application Module
 * 
 * This module orchestrates content serving workflows,
 * including file retrieval, search operations, and knowledge base queries.
 */

// Application workflow interfaces
export interface ContentServingWorkflow {
  getFileContent(filePath: string): Promise<FileContentResult>;
  searchKnowledge(query: string, options?: SearchOptions): Promise<KnowledgeSearchResult>;
  getFileList(pattern?: string): Promise<FileListResult>;
  getServerStatus(): Promise<ServerStatus>;
}

export interface KnowledgeOperations {
  semanticSearch(query: string, options: KnowledgeSearchOptions): Promise<KnowledgeSearchResult>;
  enhancedSearch(query: string, options: EnhancedKnowledgeOptions): Promise<EnhancedKnowledgeResult>;
  getRelatedContent(filePath: string, similarity?: number): Promise<RelatedContentResult>;
}

// Forward declare types from domain layer
interface SearchOptions {
  threshold?: number;
  maxResults?: number;
  includeContext?: boolean;
  groupByDocument?: boolean;
  expandParagraphs?: boolean;
}

// Application types
export interface FileContentResult {
  success: boolean;
  content?: string;
  metadata?: FileServingMetadata;
  error?: string;
}

export interface KnowledgeSearchResult {
  success: boolean;
  results: KnowledgeSearchItem[];
  totalResults: number;
  processingTime: number;
  query: string;
  options: KnowledgeSearchOptions;
}

export interface EnhancedKnowledgeResult extends KnowledgeSearchResult {
  groupedResults: GroupedKnowledgeResults;
  suggestions: SearchSuggestion[];
  relatedQueries: string[];
}

export interface FileListResult {
  success: boolean;
  files: FileListItem[];
  totalFiles: number;
  error?: string;
}

export interface KnowledgeSearchItem {
  filePath: string;
  content: string;
  similarity: number;
  metadata: SearchItemMetadata;
  context?: SearchItemContext;
}

export interface KnowledgeSearchOptions {
  threshold?: number;
  maxResults?: number;
  includeContext?: boolean;
  expandParagraphs?: boolean;
  groupByDocument?: boolean;
  fileTypes?: string[];
}

export interface EnhancedKnowledgeOptions extends KnowledgeSearchOptions {
  includeRelated?: boolean;
  includeSuggestions?: boolean;
  contextWindow?: number;
  rankingWeights?: RankingWeights;
}

export interface GroupedKnowledgeResults {
  byDocument: DocumentKnowledgeGroup[];
  byType: TypeKnowledgeGroup[];
  byRelevance: RelevanceKnowledgeGroup[];
}

export interface DocumentKnowledgeGroup {
  filePath: string;
  items: KnowledgeSearchItem[];
  documentScore: number;
  documentInfo: DocumentInfo;
}

export interface TypeKnowledgeGroup {
  fileType: string;
  items: KnowledgeSearchItem[];
  typeScore: number;
}

export interface RelevanceKnowledgeGroup {
  relevanceRange: string; // e.g., "0.9-1.0", "0.8-0.9"
  items: KnowledgeSearchItem[];
  averageScore: number;
}

export interface SearchSuggestion {
  suggestion: string;
  confidence: number;
  type: 'typo' | 'expansion' | 'related' | 'refinement';
}

export interface RelatedContentResult {
  success: boolean;
  relatedFiles: RelatedFileItem[];
  totalFound: number;
  error?: string;
}

export interface RelatedFileItem {
  filePath: string;
  similarity: number;
  relationship: 'content' | 'topic' | 'reference' | 'structure';
  summary?: string;
}

export interface FileServingMetadata {
  size: number;
  lastModified: Date;
  contentType: string;
  encoding?: string;
  isIndexed: boolean;
}

export interface SearchItemMetadata {
  chunkIndex: number;
  chunkCount: number;
  fileSize: number;
  lastModified: Date;
  relevanceScore: number;
}

export interface SearchItemContext {
  beforeText?: string;
  afterText?: string;
  documentTitle?: string;
  sectionHeading?: string;
}

export interface DocumentInfo {
  title?: string;
  size: number;
  lastModified: Date;
  type: string;
  chunkCount: number;
}

export interface RankingWeights {
  semantic: number;
  recency: number;
  popularity: number;
  exactMatch: number;
}

export interface FileListItem {
  filePath: string;
  relativePath: string;
  size: number;
  lastModified: Date;
  type: string;
  isIndexed: boolean;
}

export interface ServerStatus {
  isRunning: boolean;
  uptime: number;
  indexedFiles: number;
  totalChunks: number;
  lastIndexUpdate: Date;
  memoryUsage: MemoryUsage;
  performance: PerformanceMetrics;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
}

export interface PerformanceMetrics {
  averageSearchTime: number;
  totalSearches: number;
  cacheHitRate: number;
  errorRate: number;
}

// Application implementations (to be created)
// export { ContentServingOrchestrator } from './content.js';
// export { KnowledgeOrchestrator } from './knowledge.js';
// export { SearchOrchestrator } from './search.js';
