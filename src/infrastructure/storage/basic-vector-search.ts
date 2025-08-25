/**
 * Basic Vector Search Service
 * 
 * Simple in-memory vector storage and cosine similarity search implementation.
 * This is for testing the priority system in Step 7 - full multi-folder search is Task 12.
 * 
 * TODO: Task 12 - Replace with full multi-folder semantic search implementation
 */

import type { IVectorSearchService, ILoggingService } from '../../di/interfaces.js';
import type { EmbeddingVector } from '../../types/index.js';

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
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  folderPath?: string;
  includeMetadata?: boolean;
}

/**
 * Basic vector search service for testing priority system
 */
export class BasicVectorSearchService implements IVectorSearchService {
  private embeddings: StoredEmbedding[] = [];
  private ready = false;

  constructor(private logger: ILoggingService) {
    this.logger.debug('BasicVectorSearchService initialized for priority testing');
  }

  /**
   * Build index from embeddings and metadata
   */
  async buildIndex(embeddings: EmbeddingVector[], metadata: any[]): Promise<void> {
    this.logger.debug(`Building basic vector index with ${embeddings.length} embeddings`);
    
    this.embeddings = [];
    
    for (let i = 0; i < embeddings.length; i++) {
      const embedding = embeddings[i];
      const meta = metadata[i] || {};
      
      if (!embedding || !embedding.vector) {
        continue; // Skip invalid embeddings
      }
      
      const stored: StoredEmbedding = {
        id: `embedding_${i}`,
        documentId: meta.documentId || meta.filePath || `doc_${i}`,
        chunkId: meta.chunkId || `chunk_${i}`,
        vector: embedding.vector,
        folderPath: meta.folderPath || '',
        modelId: embedding.model || 'unknown',
        metadata: {
          content: meta.content || '',
          page: meta.page,
          section: meta.section,
          sheet: meta.sheet,
          slide: meta.slide,
          filePath: meta.filePath
        }
      };
      
      this.embeddings.push(stored);
    }
    
    this.ready = true;
    this.logger.info(`Vector index built successfully with ${this.embeddings.length} embeddings`);
  }

  /**
   * Load existing vector index (not implemented for basic version)
   */
  async loadIndex(indexPath: string): Promise<void> {
    this.logger.debug(`Loading index from ${indexPath} - using in-memory storage for testing`);
    // For basic implementation, we use in-memory storage only
    this.ready = true;
  }

  /**
   * Search for similar vectors using cosine similarity
   */
  async search(queryVector: EmbeddingVector, topK = 5, threshold = 0.1): Promise<BasicSearchResult[]> {
    if (!this.ready) {
      this.logger.warn('Vector search service not ready - returning empty results');
      return [];
    }

    this.logger.debug(`Searching for similar vectors, topK=${topK}, threshold=${threshold}`);
    
    const results: BasicSearchResult[] = [];
    
    for (const stored of this.embeddings) {
      const similarity = this.cosineSimilarity(queryVector.vector, stored.vector);
      
      if (similarity >= threshold) {
        results.push({
          id: stored.id,
          documentId: stored.documentId,
          chunkId: stored.chunkId,
          score: similarity,
          content: stored.metadata.content,
          metadata: stored.metadata,
          folderPath: stored.folderPath,
          modelId: stored.modelId
        });
      }
    }
    
    // Sort by similarity score (descending) and take top-k
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);
    
    this.logger.debug(`Found ${topResults.length} results above threshold ${threshold}`);
    return topResults;
  }

  /**
   * Search with options for folder filtering
   */
  async searchWithOptions(queryVector: EmbeddingVector, options: SearchOptions = {}): Promise<BasicSearchResult[]> {
    const { limit = 5, threshold = 0.1, folderPath, includeMetadata = true } = options;
    
    if (!this.ready) {
      this.logger.warn('Vector search service not ready - returning empty results');
      return [];
    }

    this.logger.debug(`Searching with options: limit=${limit}, folderPath=${folderPath}, threshold=${threshold}`);
    
    // Filter by folder if specified
    let searchEmbeddings = this.embeddings;
    if (folderPath) {
      searchEmbeddings = this.embeddings.filter(e => e.folderPath === folderPath);
      this.logger.debug(`Filtered to ${searchEmbeddings.length} embeddings from folder: ${folderPath}`);
    }
    
    const results: BasicSearchResult[] = [];
    
    for (const stored of searchEmbeddings) {
      const similarity = this.cosineSimilarity(queryVector.vector, stored.vector);
      
      if (similarity >= threshold) {
        results.push({
          id: stored.id,
          documentId: stored.documentId,
          chunkId: stored.chunkId,
          score: similarity,
          content: stored.metadata.content,
          metadata: includeMetadata ? stored.metadata : {},
          folderPath: stored.folderPath,
          modelId: stored.modelId
        });
      }
    }
    
    // Sort by similarity score (descending) and take top results
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);
    
    this.logger.info(`Search completed: ${topResults.length} results found`);
    return topResults;
  }

  /**
   * Check if index is loaded and ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Remove document from vector index
   */
  async removeDocument(filePath: string): Promise<void> {
    this.logger.debug(`Removing document: ${filePath}`);
    
    const beforeCount = this.embeddings.length;
    this.embeddings = this.embeddings.filter(e => 
      e.documentId !== filePath && 
      e.metadata.filePath !== filePath
    );
    const afterCount = this.embeddings.length;
    const removedCount = beforeCount - afterCount;
    
    this.logger.info(`Removed ${removedCount} embeddings for document: ${filePath}`);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      this.logger.error(`Vector dimension mismatch: ${vectorA.length} vs ${vectorB.length}`);
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      const a = vectorA[i] || 0;
      const b = vectorB[i] || 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    // Clamp to [0, 1] range (cosine similarity can be negative)
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Get storage statistics for debugging
   */
  getStorageStats(): {
    totalEmbeddings: number;
    folderCounts: { [folderPath: string]: number };
    modelCounts: { [modelId: string]: number };
    isReady: boolean;
  } {
    const folderCounts: { [folderPath: string]: number } = {};
    const modelCounts: { [modelId: string]: number } = {};
    
    for (const embedding of this.embeddings) {
      const folderPath = embedding.folderPath || 'unknown';
      const modelId = embedding.modelId || 'unknown';
      folderCounts[folderPath] = (folderCounts[folderPath] || 0) + 1;
      modelCounts[modelId] = (modelCounts[modelId] || 0) + 1;
    }
    
    return {
      totalEmbeddings: this.embeddings.length,
      folderCounts,
      modelCounts,
      isReady: this.ready
    };
  }

  /**
   * Clear all stored embeddings (for testing)
   */
  clear(): void {
    this.embeddings = [];
    this.ready = false;
    this.logger.debug('Vector search service cleared');
  }
}