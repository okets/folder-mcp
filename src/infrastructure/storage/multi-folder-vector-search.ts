/**
 * Multi-Folder SQLite Vector Search Service
 * 
 * Manages folder-specific embeddings databases and performs searches
 * in the correct database based on the folder context.
 */

import { IVectorSearchService, ILoggingService } from '../../di/interfaces.js';
import { EmbeddingVector } from '../../types/index.js';
import { BasicSearchResult } from '../../types/search.js';
import { DEFAULT_MAX_RESULTS, SEMANTIC_THRESHOLD, MAX_RESULTS_LIMIT, MIN_SEMANTIC_THRESHOLD, MAX_SEMANTIC_THRESHOLD } from '../../constants/search.js';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import path from 'path';

interface FolderDatabase {
  db: Database.Database;
  path: string;
  lastAccessed: Date;
  embeddingCount: number;
}

export class MultiFolderVectorSearchService implements IVectorSearchService {
  private databases: Map<string, FolderDatabase> = new Map();
  private maxOpenDatabases = 10; // Maximum number of databases to keep open

  constructor(
    private logger: ILoggingService
  ) {
  }

  /**
   * Get or create a database connection for a specific folder
   */
  private async getFolderDatabase(folderPath: string): Promise<FolderDatabase | null> {
    // Generate database path for this folder
    const dbPath = path.join(folderPath, '.folder-mcp', 'embeddings.db');
    
    // Check if we already have this database open
    const existing = this.databases.get(dbPath);
    if (existing) {
      existing.lastAccessed = new Date();
      return existing;
    }
    
    // Check if database file exists
    if (!existsSync(dbPath)) {
      this.logger.warn(`[MULTI-FOLDER-SEARCH] Database not found for folder: ${dbPath}`);
      return null;
    }
    
    try {
      // Evict least recently used database if at capacity
      if (this.databases.size >= this.maxOpenDatabases) {
        this.evictLeastRecentlyUsed();
      }
      
      // Open new database connection
      // Note: We need write access for updating document semantics
      const db = new Database(dbPath, { readonly: false });
      
      // Check if database has embeddings
      const embeddingCount = db.prepare('SELECT COUNT(*) as count FROM embeddings').get() as { count: number };
      
      if (embeddingCount.count === 0) {
        this.logger.warn(`[MULTI-FOLDER-SEARCH] Database is empty for folder: ${folderPath}`);
        db.close();
        return null;
      }
      
      const folderDb: FolderDatabase = {
        db,
        path: dbPath,
        lastAccessed: new Date(),
        embeddingCount: embeddingCount.count
      };
      
      this.databases.set(dbPath, folderDb);
      this.logger.info(`[MULTI-FOLDER-SEARCH] Opened database for folder: ${folderPath} (${embeddingCount.count} embeddings)`);
      
      return folderDb;
      
    } catch (error) {
      this.logger.error(`[MULTI-FOLDER-SEARCH] Failed to open database for folder ${folderPath}: ${error}`);
      return null;
    }
  }
  
  /**
   * Evict the least recently used database connection
   */
  private evictLeastRecentlyUsed(): void {
    let oldestPath: string | null = null;
    let oldestTime = new Date();
    
    for (const [dbPath, folderDb] of this.databases.entries()) {
      if (folderDb.lastAccessed < oldestTime) {
        oldestTime = folderDb.lastAccessed;
        oldestPath = dbPath;
      }
    }
    
    if (oldestPath) {
      const folderDb = this.databases.get(oldestPath);
      if (folderDb) {
        try {
          folderDb.db.close();
          this.logger.debug(`[MULTI-FOLDER-SEARCH] Closed database: ${oldestPath}`);
        } catch (error) {
          this.logger.warn(`[MULTI-FOLDER-SEARCH] Error closing database: ${error}`);
        }
        this.databases.delete(oldestPath);
      }
    }
  }
  
  /**
   * Search for similar vectors in a specific folder's database
   */
  async searchInFolder(
    queryVector: EmbeddingVector, 
    folderPath: string,
    topK = DEFAULT_MAX_RESULTS, 
    threshold = SEMANTIC_THRESHOLD
  ): Promise<BasicSearchResult[]> {
    this.logger.info(`[MULTI-FOLDER-SEARCH] Searching in folder: ${folderPath}`);
    
    // Get database for this folder
    const folderDb = await this.getFolderDatabase(folderPath);
    if (!folderDb) {
      this.logger.warn(`[MULTI-FOLDER-SEARCH] No valid database for folder: ${folderPath}`);
      return [];
    }
    
    // Validate and clamp parameters
    topK = Math.max(1, Math.min(Math.floor(topK), MAX_RESULTS_LIMIT));
    threshold = Math.max(MIN_SEMANTIC_THRESHOLD, Math.min(threshold, MAX_SEMANTIC_THRESHOLD));
    
    // Validate queryVector
    if (!queryVector || !queryVector.vector || !Array.isArray(queryVector.vector) || queryVector.vector.length === 0) {
      this.logger.error(`[MULTI-FOLDER-SEARCH] Invalid query vector`);
      return [];
    }
    
    this.logger.info(`[MULTI-FOLDER-SEARCH] Searching ${folderDb.embeddingCount} embeddings, topK=${topK}, threshold=${threshold}`);
    
    try {
      // Get all embeddings with metadata from database
      const query = `
        SELECT 
          e.chunk_id,
          e.embedding,
          c.content,
          c.chunk_index,
          c.key_phrases,
          c.readability_score,
          d.file_path,
          d.mime_type
        FROM embeddings e
        JOIN chunks c ON e.chunk_id = c.id
        JOIN documents d ON c.document_id = d.id
      `;
      
      const stmt = folderDb.db.prepare(query);
      const results: BasicSearchResult[] = [];
      let processed = 0;
      
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
              content: row.content,
              folderPath: folderPath, // Add required field
              modelId: 'unknown', // Add required field
              // Add semantic metadata from database
              keyPhrases: row.key_phrases ? JSON.parse(row.key_phrases) : [],
              readabilityScore: row.readability_score || 0,
              metadata: {
                chunkIndex: row.chunk_index,
                mimeType: row.mime_type
              }
            };
            
            results.push(candidate);
          }
        } catch (embError) {
          // Skip invalid embeddings
          continue;
        }
      }
      
      // Sort by score descending and limit results
      results.sort((a, b) => b.score - a.score);
      const finalResults = results.slice(0, topK);
      
      return finalResults;
      
    } catch (error) {
      this.logger.error(`[MULTI-FOLDER-SEARCH] Search failed: ${error}`);
      return [];
    }
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      const valA = a[i];
      const valB = b[i];
      
      if (valA === undefined || valB === undefined || !Number.isFinite(valA) || !Number.isFinite(valB)) {
        continue;
      }
      
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
  
  /**
   * Check if the service is ready (at least one database is loaded)
   */
  isReady(): boolean {
    return this.databases.size > 0;
  }
  
  /**
   * Remove a document from the index (not implemented in SQLite version)
   */
  async removeDocument(documentId: string): Promise<void> {
    this.logger.debug(`[MULTI-FOLDER-SEARCH] removeDocument called for ${documentId} - not implemented in SQLite version`);
  }
  
  // Legacy interface methods (use default database)
  async buildIndex(_embeddings: EmbeddingVector[], _metadata: any[]): Promise<void> {
    this.logger.debug('[MULTI-FOLDER-SEARCH] buildIndex called - not used in multi-folder mode');
  }
  
  async loadIndex(indexPath: string): Promise<void> {
    this.logger.debug(`[MULTI-FOLDER-SEARCH] loadIndex called with: ${indexPath}`);
    // Pre-load a specific database if needed
    const folderPath = path.dirname(path.dirname(indexPath)); // Go up from .folder-mcp/embeddings.db
    await this.getFolderDatabase(folderPath);
  }
  
  async search(_queryVector: EmbeddingVector, _topK?: number, _threshold?: number): Promise<BasicSearchResult[]> {
    // Legacy method - should not be used in multi-folder mode
    this.logger.error('[MULTI-FOLDER-SEARCH] Legacy search method called without folder context - this is an error');
    throw new Error('Legacy search() method called - use searchInFolder() with explicit folder path instead');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    openDatabases: number;
    maxDatabases: number;
    databases: Array<{
      path: string;
      embeddingCount: number;
      lastAccessed: Date;
    }>;
  } {
    const databases = Array.from(this.databases.entries()).map(([dbPath, folderDb]) => ({
      path: dbPath,
      embeddingCount: folderDb.embeddingCount,
      lastAccessed: folderDb.lastAccessed
    }));
    
    return {
      openDatabases: this.databases.size,
      maxDatabases: this.maxOpenDatabases,
      databases
    };
  }
  

  /**
   * Close all open databases
   */
  async shutdown(): Promise<void> {
    this.logger.info(`[MULTI-FOLDER-SEARCH] Shutting down, closing ${this.databases.size} databases`);

    for (const [dbPath, folderDb] of this.databases.entries()) {
      try {
        folderDb.db.close();
        this.logger.debug(`[MULTI-FOLDER-SEARCH] Closed database: ${dbPath}`);
      } catch (error) {
        this.logger.warn(`[MULTI-FOLDER-SEARCH] Error closing database ${dbPath}: ${error}`);
      }
    }

    this.databases.clear();
  }

  /**
   * Update document-level semantics in the database
   * Sprint 11: Support for document embeddings and keywords
   */
  async updateDocumentSemantics(
    filePath: string,
    documentEmbedding: string,
    documentKeywords: string,
    processingTimeMs: number
  ): Promise<void> {
    try {
      // Find the database that contains this file
      // Try to match by checking which database path is a prefix of the file path
      let db: FolderDatabase | null = null;
      // let matchedPath: string | null = null; // Unused variable

      // First, try to find an exact match by checking existing databases
      for (const [dbPath, folderDb] of this.databases.entries()) {
        // Extract folder path from database path
        const folderPath = dbPath.replace('/.folder-mcp/embeddings.db', '');
        if (filePath.startsWith(folderPath + '/')) {
          db = folderDb;
          break;
        }
      }

      // If not found in cache, try to open the database directly
      if (!db) {
        // Extract possible folder path - find .folder-mcp in the file path
        const parts = filePath.split('/');
        for (let i = parts.length - 1; i >= 0; i--) {
          const possibleFolderPath = parts.slice(0, i + 1).join('/');
          const dbPath = path.join(possibleFolderPath, '.folder-mcp', 'embeddings.db');

          if (existsSync(dbPath)) {
            // Open the database directly for this update
            const tempDb = new Database(dbPath, { readonly: false });

            // Get embedding count
            const embeddingCount = tempDb.prepare('SELECT COUNT(*) as count FROM embeddings').get() as { count: number };

            db = {
              db: tempDb,
              path: dbPath,
              lastAccessed: new Date(),
              embeddingCount: embeddingCount.count
            };
            // matchedPath = possibleFolderPath; // Unused variable

            // Cache it for future use if not null
            if (db) {
              this.databases.set(dbPath, db);
            }
            break;
          }
        }
      }

      if (!db) {
        this.logger.warn(`[MULTI-FOLDER-SEARCH] Cannot update document semantics - no database found for file: ${filePath}`);
        return;
      }

      // First check if document exists
      const checkStmt = db.db.prepare('SELECT id, file_path FROM documents WHERE file_path = ?');
      const existing = checkStmt.get(filePath) as any;

      if (!existing) {
        this.logger.error(`[MULTI-FOLDER-SEARCH] Document not found for update: ${filePath}`);
        return;
      }

      // Update document with semantics
      const stmt = db.db.prepare(`
        UPDATE documents
        SET document_embedding = ?,
            document_keywords = ?,
            keywords_extracted = 1,
            embedding_generated = 1,
            document_processing_ms = ?
        WHERE file_path = ?
      `);

      const result = stmt.run(
        documentEmbedding,
        documentKeywords,
        processingTimeMs,
        filePath
      );

      if (result.changes === 0) {
        this.logger.error(`[MULTI-FOLDER-SEARCH] Failed to update document semantics for: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`[MULTI-FOLDER-SEARCH] Failed to update document semantics for ${filePath}: ${error}`);
      throw error;
    }
  }
}