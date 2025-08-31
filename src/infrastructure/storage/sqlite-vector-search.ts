/**
 * SQLite Vector Search Service
 * 
 * Connects to the existing embeddings database and performs real cosine similarity search.
 * Works with the current database schema without requiring schema changes.
 */

import { IVectorSearchService, ILoggingService } from '../../di/interfaces.js';
import { EmbeddingVector } from '../../types/index.js';
import { BasicSearchResult } from './basic-vector-search.js';
import { DEFAULT_MAX_RESULTS, SEMANTIC_THRESHOLD, MAX_RESULTS_LIMIT, MIN_SEMANTIC_THRESHOLD, MAX_SEMANTIC_THRESHOLD } from '../../constants/search.js';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';

export class SQLiteVectorSearchService implements IVectorSearchService {
  private db: Database.Database | null = null;
  private ready = false;

  constructor(
    private dbPath: string,
    private logger: ILoggingService
  ) {
    this.logger.info(`[SQLITE-VECTOR-SEARCH] SQLiteVectorSearchService initialized with database: ${dbPath}`);
    // Note: Index must be loaded explicitly via loadIndex() before use
  }

  /**
   * Build index from embeddings and metadata (not needed - database already contains embeddings)
   */
  async buildIndex(embeddings: EmbeddingVector[], metadata: any[]): Promise<void> {
    this.logger.debug('buildIndex called - not needed for SQLite implementation (database already contains embeddings)');
    await this.loadIndex(this.dbPath);
  }

  /**
   * Load existing vector index from SQLite database
   */
  async loadIndex(indexPath: string): Promise<void> {
    this.logger.debug(`Loading vector index from SQLite database: ${indexPath}`);
    
    if (!existsSync(indexPath)) {
      throw new Error(`Database file not found: ${indexPath}`);
    }

    try {
      this.db = new Database(indexPath, { readonly: true });
      
      // Check if database has the expected tables and data
      const embeddingCount = this.db.prepare('SELECT COUNT(*) as count FROM embeddings').get() as { count: number };
      const chunkCount = this.db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
      
      if (embeddingCount.count === 0) {
        this.logger.warn('Database is empty - no embeddings found');
        this.ready = false;
      } else {
        this.logger.info(`Vector index loaded: ${embeddingCount.count} embeddings, ${chunkCount.count} chunks`);
        this.ready = true;
      }
    } catch (error) {
      this.ready = false;
      const errorMessage = `Failed to load SQLite vector database: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Search for similar vectors using cosine similarity calculation
   */
  async search(queryVector: EmbeddingVector, topK = DEFAULT_MAX_RESULTS, threshold = SEMANTIC_THRESHOLD): Promise<BasicSearchResult[]> {
    this.logger.info(`[SQLITE-VECTOR-SEARCH] Search called - ready: ${this.ready}, db: ${this.db ? 'connected' : 'null'}`);
    
    if (!this.ready || !this.db) {
      this.logger.error(`[SQLITE-VECTOR-SEARCH] Vector search service not ready - returning empty results (ready: ${this.ready}, db: ${this.db ? 'connected' : 'null'})`);
      return [];
    }

    // Validate and clamp input parameters
    const originalTopK = topK;
    const originalThreshold = threshold;
    
    // Clamp topK to safe range [1, MAX_RESULTS_LIMIT]
    topK = Math.max(1, Math.min(Math.floor(topK), MAX_RESULTS_LIMIT));
    
    // Clamp threshold to valid range [MIN_SEMANTIC_THRESHOLD, MAX_SEMANTIC_THRESHOLD]
    threshold = Math.max(MIN_SEMANTIC_THRESHOLD, Math.min(threshold, MAX_SEMANTIC_THRESHOLD));
    
    // Validate queryVector
    if (!queryVector || !queryVector.vector || !Array.isArray(queryVector.vector) || queryVector.vector.length === 0) {
      this.logger.error(`[SQLITE-VECTOR-SEARCH] Invalid query vector: must be non-empty array`);
      return [];
    }
    
    // Check for finite numbers in vector
    const hasInvalidValues = queryVector.vector.some(val => !Number.isFinite(val));
    if (hasInvalidValues) {
      this.logger.error(`[SQLITE-VECTOR-SEARCH] Invalid query vector: contains non-finite values`);
      return [];
    }
    
    // Log parameter adjustments if any
    if (originalTopK !== topK) {
      this.logger.info(`[SQLITE-VECTOR-SEARCH] Clamped topK from ${originalTopK} to ${topK} (range: 1-${MAX_RESULTS_LIMIT})`);
    }
    if (Math.abs(originalThreshold - threshold) > 1e-10) {
      this.logger.info(`[SQLITE-VECTOR-SEARCH] Clamped threshold from ${originalThreshold} to ${threshold} (range: ${MIN_SEMANTIC_THRESHOLD}-${MAX_SEMANTIC_THRESHOLD})`);
    }

    this.logger.info(`[SQLITE-VECTOR-SEARCH] Searching for similar vectors, topK=${topK}, threshold=${threshold}, vectorDim=${queryVector.vector.length}`);
    
    try {
      // Get all embeddings with metadata from database
      const query = `
        SELECT 
          e.chunk_id,
          e.embedding,
          c.content,
          c.chunk_index,
          d.file_path,
          d.mime_type,
          cm.page_number,
          cm.section_name,
          cm.sheet_name,
          cm.slide_number
        FROM embeddings e
        JOIN chunks c ON e.chunk_id = c.id
        JOIN documents d ON c.document_id = d.id
        LEFT JOIN chunk_metadata cm ON c.id = cm.chunk_id
      `;
      
      const stmt = this.db.prepare(query);
      const results: BasicSearchResult[] = [];
      let processed = 0;
      this.logger.info(`[SQLITE-VECTOR-SEARCH] Processing stored embeddings (streaming) for similarity calculation`);

      for (const row of stmt.iterate() as Iterable<any>) {
        processed++;
        try {
          // Parse stored embedding (JSON format)
          const storedEmbedding: number[] = JSON.parse(row.embedding);
          
          // Calculate cosine similarity
          const similarity = this.cosineSimilarity(queryVector.vector, storedEmbedding);
          
          if (similarity >= threshold) {
            const candidate: BasicSearchResult = {
              id: `chunk_${row.chunk_id}`,
              documentId: row.file_path,
              chunkId: `chunk_${row.chunk_id}`,
              score: similarity,
              content: row.content || '',
              metadata: {
                page: row.page_number,
                section: row.section_name,
                sheet: row.sheet_name,
                slide: row.slide_number,
                chunkIndex: row.chunk_index,
                mimeType: row.mime_type
              },
              folderPath: row.file_path,
              modelId: queryVector.model || 'unknown'
            };
            if (results.length < topK) {
              results.push(candidate);
            } else {
              let minIdx = 0;
              let minScore = results[0]?.score ?? Infinity;
              for (let i = 1; i < results.length; i++) {
                const currentScore = results[i]?.score ?? Infinity;
                if (currentScore < minScore) { 
                  minScore = currentScore; 
                  minIdx = i; 
                }
              }
              if (similarity > minScore && results[minIdx]) {
                results[minIdx] = candidate;
              }
            }
          }
        } catch (parseError) {
          // Skip invalid embeddings
          this.logger.debug(`Skipping invalid embedding for chunk ${row.chunk_id}: ${parseError}`);
          continue;
        }
      }
      
      // Sort final bounded buffer by score (desc)
      results.sort((a, b) => b.score - a.score);
      this.logger.info(`[SQLITE-VECTOR-SEARCH] Found ${results.length} results above threshold ${threshold} (processed ${processed} embeddings)`);
      this.logger.info(`[SQLITE-VECTOR-SEARCH] Search completed successfully - returning ${results.length} results`);
      return results;
      
    } catch (error) {
      this.logger.error(`Vector search failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Check if index is loaded and ready
   */
  isReady(): boolean {
    return this.ready && this.db !== null;
  }

  /**
   * Remove document from vector index (not implemented for read-only access)
   */
  async removeDocument(filePath: string): Promise<void> {
    this.logger.debug(`Remove document requested: ${filePath} (not implemented for read-only database)`);
    // Not implemented for read-only database access
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      this.logger.debug(`Vector dimension mismatch: ${vectorA.length} vs ${vectorB.length}`);
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
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.ready = false;
    this.logger.debug('SQLite vector search service closed');
  }
}