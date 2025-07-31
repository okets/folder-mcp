/**
 * SQLite-vec Storage Implementation
 * 
 * Implements IVectorSearchService using SQLite-vec for persistent vector storage
 * and fast similarity search with SIMD acceleration.
 */

import { IVectorSearchService, ILoggingService } from '../../../di/interfaces.js';
import { EmbeddingVector, TextChunk } from '../../../types/index.js';
import { SearchResult } from '../../../domain/search/index.js';

// Temporary type alias for compatibility with tests
type EmbeddingVectorOrArray = EmbeddingVector | number[];
import { DatabaseManager, DatabaseConfig } from './database-manager.js';
import { QUERIES } from './schema.js';

export interface SQLiteVecStorageConfig {
    folderPath: string;
    modelName: string;
    modelDimension: number;
    logger?: ILoggingService;
}

export interface VectorMetadata {
    filePath: string;
    chunkId: string;
    chunkIndex: number;
    content: string;
    startPosition: number;
    endPosition: number;
    pageNumber?: number;
    sectionName?: string;
    sheetName?: string;
    slideNumber?: number;
}

export class SQLiteVecStorage implements IVectorSearchService {
    private dbManager: DatabaseManager;
    private logger: ILoggingService | undefined;
    private ready: boolean = false;
    private config: SQLiteVecStorageConfig;

    constructor(config: SQLiteVecStorageConfig) {
        this.config = config;
        this.logger = config.logger;

        const dbConfig: DatabaseConfig = {
            folderPath: config.folderPath,
            modelName: config.modelName,
            modelDimension: config.modelDimension,
            enableWAL: true,
            enableForeignKeys: true
        };

        this.dbManager = new DatabaseManager(dbConfig);
    }

    /**
     * Build vector index from embeddings and metadata
     * This method replaces the existing index with new data
     */
    async buildIndex(embeddings: EmbeddingVectorOrArray[], metadata: VectorMetadata[]): Promise<void> {
        if (embeddings.length !== metadata.length) {
            throw new Error(`Embeddings count (${embeddings.length}) must match metadata count (${metadata.length})`);
        }

        if (embeddings.length === 0) {
            this.logger?.info('Building index with empty data set');
            // Initialize database if not already done
            if (!this.dbManager.isReady()) {
                await this.dbManager.initialize();
            }
            this.ready = true;
            return;
        }

        this.logger?.info(`Building vector index with ${embeddings.length} embeddings`);

        try {
            // Initialize database if not already done
            if (!this.dbManager.isReady()) {
                await this.dbManager.initialize();
            }

            // Clear existing data and rebuild from scratch
            await this.clearIndex();

            // Insert new data in a transaction
            await this.insertEmbeddingsWithMetadata(embeddings, metadata);

            this.ready = true;
            this.logger?.info('Vector index built successfully');

        } catch (error) {
            this.ready = false;
            const errorMessage = `Failed to build vector index: ${error instanceof Error ? error.message : String(error)}`;
            this.logger?.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
            throw new Error(errorMessage);
        }
    }

    /**
     * Load existing vector index (compatibility method)
     * In SQLite-vec, the index is always loaded when database is opened
     */
    async loadIndex(indexPath: string): Promise<void> {
        this.logger?.info(`Loading vector index from database: ${indexPath}`);

        try {
            // Initialize database if not already done
            if (!this.dbManager.isReady()) {
                await this.dbManager.initialize();
            }

            // Check if database has data
            const stats = await this.dbManager.getStats();
            if (stats.embeddingCount > 0) {
                this.ready = true;
                this.logger?.info(`Vector index loaded with ${stats.embeddingCount} embeddings`);
            } else {
                this.ready = false;
                this.logger?.warn('Vector index is empty');
            }

        } catch (error) {
            this.ready = false;
            const errorMessage = `Failed to load vector index: ${error instanceof Error ? error.message : String(error)}`;
            this.logger?.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
            throw new Error(errorMessage);
        }
    }

    /**
     * Search for similar vectors using cosine similarity
     */
    async search(queryVector: EmbeddingVectorOrArray, topK: number = 10, threshold: number = 0.7): Promise<SearchResult[]> {
        if (!this.ready) {
            throw new Error('Vector index is not ready. Call buildIndex() or loadIndex() first.');
        }

        const vectorLength = Array.isArray(queryVector) ? queryVector.length : queryVector.vector.length;
        if (!queryVector || vectorLength === 0) {
            throw new Error('Query vector cannot be empty');
        }

        this.logger?.debug(`Searching for ${topK} similar vectors with threshold ${threshold}`);

        try {
            const db = this.dbManager.getDatabase();
            const searchStmt = db.prepare(QUERIES.similaritySearch);

            // TODO: Temporarily simplified search without vector similarity
            // Execute simplified search
            const results = searchStmt.all(topK) as any[];

            // Convert database results to SearchResult objects
            const searchResults: SearchResult[] = results.map(row => {
                // Convert distance back to similarity
                const similarity = 1 - row.distance;

                // Create TextChunk from database data
                const chunk: TextChunk = {
                    content: row.content,
                    startPosition: 0, // Will be populated from chunk data if available
                    endPosition: row.content.length,
                    tokenCount: Math.ceil(row.content.length / 4), // Rough estimate
                    chunkIndex: row.chunk_index,
                    metadata: {
                        sourceFile: row.file_path,
                        sourceType: row.mime_type || 'unknown',
                        totalChunks: 1,
                        hasOverlap: false
                    }
                };

                // Create SearchResult
                const searchResult: SearchResult = {
                    chunk,
                    similarity,
                    filePath: row.file_path,
                    metadata: {
                        score: similarity,
                        distance: row.distance,
                        chunkIndex: row.chunk_index,
                        documentId: row.file_path,
                        relevanceFactors: [
                            {
                                factor: 'cosine_similarity',
                                weight: 1.0,
                                contribution: similarity
                            }
                        ]
                    }
                };

                return searchResult;
            });

            this.logger?.debug(`Found ${searchResults.length} similar vectors`);
            return searchResults;

        } catch (error) {
            const errorMessage = `Vector search failed: ${error instanceof Error ? error.message : String(error)}`;
            this.logger?.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
            throw new Error(errorMessage);
        }
    }

    /**
     * Check if vector index is ready for search
     */
    isReady(): boolean {
        return this.ready && this.dbManager.isReady();
    }

    /**
     * Get database statistics
     */
    async getStats() {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }
        return await this.dbManager.getStats();
    }

    /**
     * Close database connection and cleanup
     */
    async close(): Promise<void> {
        this.ready = false;
        await this.dbManager.close();
    }

    /**
     * Get database path for debugging/inspection
     */
    getDatabasePath(): string {
        return this.dbManager.getDatabasePath();
    }

    /**
     * Clear all data from the index
     */
    private async clearIndex(): Promise<void> {
        const db = this.dbManager.getDatabase();
        
        // Use cascading deletes by deleting documents first
        // The CASCADE constraints should handle the rest
        db.exec('DELETE FROM documents');
        
        this.logger?.debug('Cleared existing vector index data');
    }

    /**
     * Insert embeddings and metadata in a transaction
     */
    private async insertEmbeddingsWithMetadata(embeddings: EmbeddingVectorOrArray[], metadata: VectorMetadata[]): Promise<void> {
        const db = this.dbManager.getDatabase();

        // Prepare all statements
        const insertDocStmt = db.prepare(QUERIES.insertDocument);
        const insertChunkStmt = db.prepare(QUERIES.insertChunk);
        const insertEmbeddingStmt = db.prepare(QUERIES.insertEmbedding);
        const insertMetadataStmt = db.prepare('INSERT INTO chunk_metadata (chunk_id, page_number, section_name, sheet_name, slide_number) VALUES (?, ?, ?, ?, ?)');

        // Execute in transaction
        const insertTransaction = db.transaction(() => {
            const documentMap = new Map<string, number>();
            let documentId = 1;

            for (let i = 0; i < embeddings.length; i++) {
                const embedding = embeddings[i];
                const meta = metadata[i];
                
                if (!meta) {
                    throw new Error(`Missing metadata for embedding at index ${i}`);
                }

                // Insert document if not already inserted
                if (!documentMap.has(meta.filePath)) {
                    insertDocStmt.run(
                        meta.filePath,
                        `fingerprint_${Date.now()}_${documentId}`, // Generate simple fingerprint
                        1000, // Default file size
                        'application/octet-stream', // Default mime type
                        new Date().toISOString()
                    );
                    documentMap.set(meta.filePath, documentId);
                    documentId++;
                }

                const docId = documentMap.get(meta.filePath)!;

                // Insert chunk
                const chunkResult = insertChunkStmt.run(
                    docId,
                    meta.chunkIndex,
                    meta.content,
                    meta.startPosition,
                    meta.endPosition,
                    Math.ceil(meta.content.length / 4) // Rough token count estimate
                );

                const chunkId = chunkResult.lastInsertRowid as number;

                // Insert embedding - temporarily store as JSON string for debugging
                // TODO: Will be replaced with proper vec0 format later
                const embeddingArray = Array.isArray(embedding) ? embedding : (embedding?.vector || []);
                const embeddingJson = JSON.stringify(embeddingArray);
                insertEmbeddingStmt.run(chunkId, embeddingJson);

                // Insert chunk metadata if available
                if (meta.pageNumber || meta.sectionName || meta.sheetName || meta.slideNumber) {
                    insertMetadataStmt.run(
                        chunkId,
                        meta.pageNumber || null,
                        meta.sectionName || null,
                        meta.sheetName || null,
                        meta.slideNumber || null
                    );
                }
            }
        });

        insertTransaction();
        this.logger?.debug(`Inserted ${embeddings.length} embeddings with metadata`);
    }

    /**
     * Update document fingerprint and metadata
     */
    async updateDocument(filePath: string, fingerprint: string): Promise<void> {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }

        const db = this.dbManager.getDatabase();
        const updateStmt = db.prepare('UPDATE documents SET fingerprint = ?, last_modified = CURRENT_TIMESTAMP WHERE file_path = ?');
        updateStmt.run(fingerprint, filePath);
    }

    /**
     * Delete document and all associated data
     */
    async deleteDocument(filePath: string): Promise<void> {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }

        const db = this.dbManager.getDatabase();
        
        // Get document ID
        const getDocStmt = db.prepare(QUERIES.getDocument);
        const doc = getDocStmt.get(filePath) as any;
        
        if (doc) {
            // Delete all associated data (cascading deletes will handle chunks/embeddings)
            const deleteStmt = db.prepare(QUERIES.deleteDocument);
            deleteStmt.run(filePath);
            this.logger?.debug(`Deleted document: ${filePath}`);
        }
    }

    /**
     * Mark document for reindexing
     */
    async markForReindex(filePath: string): Promise<void> {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }

        const db = this.dbManager.getDatabase();
        const markStmt = db.prepare(QUERIES.markForReindex);
        markStmt.run(filePath);
        this.logger?.debug(`Marked for reindex: ${filePath}`);
    }

    /**
     * Get documents that need reindexing
     */
    async getDocumentsNeedingReindex(): Promise<string[]> {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }

        const db = this.dbManager.getDatabase();
        const getStmt = db.prepare('SELECT file_path FROM documents WHERE needs_reindex = 1');
        const results = getStmt.all() as any[];
        
        return results.map(row => row.file_path);
    }
}