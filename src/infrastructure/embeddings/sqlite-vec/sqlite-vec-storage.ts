/**
 * SQLite-vec Storage Implementation
 * 
 * Implements IVectorSearchService using SQLite-vec for persistent vector storage
 * and fast similarity search with SIMD acceleration.
 */

import { IVectorSearchService, ILoggingService } from '../../../di/interfaces.js';
import { EmbeddingVector, TextChunk, TextChunkMetadata, ChunkId, SemanticScore } from '../../../types/index.js';
import { SearchResult, LazySearchResult } from '../../../domain/search/index.js';

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
    fileHash?: string;  // MD5 hash of the file for fingerprinting
    pageNumber?: number;
    sectionName?: string;
    sheetName?: string;
    slideNumber?: number;
    extractionParams?: string;  // Sprint 11: Pre-computed extraction params from format-aware chunking
    // Semantic metadata fields from KeyBERT extraction
    keyPhrases?: SemanticScore[];
    readabilityScore?: number;
}

export interface FileMetadata {
    filePath: string;
    lastModified: number;
    size: number;
    hash?: string;
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
            enableForeignKeys: true,
            logger: config.logger,
            recoveryOptions: {
                autoBackup: false,  // Disabled: source files are the truth, can reindex anytime
                autoRecover: true,  // Keep corruption detection for emergency scenarios
                maxBackups: 0,      // No backups needed
                backupInterval: 24
            }
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
     * Add embeddings incrementally without clearing existing data
     */
    async addEmbeddings(embeddings: EmbeddingVectorOrArray[], metadata: VectorMetadata[]): Promise<void> {
        if (embeddings.length !== metadata.length) {
            throw new Error(`Embeddings count (${embeddings.length}) must match metadata count (${metadata.length})`);
        }

        if (embeddings.length === 0) {
            this.logger?.info('No embeddings to add');
            return;
        }

        this.logger?.info(`Adding ${embeddings.length} embeddings to existing index`);

        try {
            // Initialize database if not already done
            if (!this.dbManager.isReady()) {
                await this.dbManager.initialize();
            }

            // Insert new data without clearing existing data
            await this.insertEmbeddingsWithMetadata(embeddings, metadata);

            this.ready = true;
            this.logger?.info(`Successfully added ${embeddings.length} embeddings`);

        } catch (error) {
            const errorMessage = `Failed to add embeddings: ${error instanceof Error ? error.message : String(error)}`;
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

                // Create TextChunk without content for lazy loading
                const chunk: TextChunk = {
                    content: '', // Empty for lazy loading - content retrieved via getChunksContent
                    startPosition: row.start_offset || 0,
                    endPosition: row.end_offset || 0,
                    tokenCount: row.token_count || 0,
                    chunkIndex: row.chunk_index,
                    chunkId: String(row.chunk_id), // Convert to string for consistency
                    metadata: {
                        sourceFile: row.file_path,
                        sourceType: row.mime_type || 'unknown',
                        totalChunks: 1,
                        hasOverlap: false
                    },
                    semanticMetadata: {
                        keyPhrases: row.key_phrases ? JSON.parse(row.key_phrases) : [],
                        readabilityScore: row.readability_score || 0,
                        semanticProcessed: row.key_phrases !== null,
                        semanticTimestamp: Date.now()
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
                        chunkId: String(row.chunk_id), // Store in metadata as string
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
     * Batch retrieve chunk content for lazy loading
     * @param chunkIds Array of chunk IDs to retrieve content for
     * @returns Map of chunk ID to chunk content with metadata
     */
    async getChunksContent(chunkIds: string[]): Promise<Map<string, any>> {
        if (chunkIds.length === 0) {
            return new Map();
        }

        const db = this.dbManager.getDatabase();
        
        // Build placeholders for IN clause
        const placeholders = chunkIds.map(() => '?').join(',');
        const query = QUERIES.getChunksContent.replace('/*PLACEHOLDER*/', placeholders);
        
        // Convert string IDs to numbers for database query
        const numericIds = chunkIds.map(id => parseInt(id, 10));
        const stmt = db.prepare(query);
        const results = stmt.all(...numericIds) as any[];
        
        const contentMap = new Map<string, any>();
        for (const row of results) {
            contentMap.set(String(row.chunk_id), {
                content: row.content,
                filePath: row.file_path,
                chunkIndex: row.chunk_index,
                semanticMetadata: {
                    keyPhrases: row.key_phrases ? JSON.parse(row.key_phrases) : []
                }
            });
        }
        
        this.logger?.debug(`Retrieved content for ${contentMap.size} of ${chunkIds.length} chunks`);
        return contentMap;
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
     * Get direct database access for advanced queries
     * Used for operations that need custom SQL queries
     */
    getDatabaseManager() {
        return this.dbManager;
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

        // Import required modules outside transaction
        const fs = await import('fs');
        const crypto = await import('crypto');

        // Prepare all statements
        const insertDocStmt = db.prepare(QUERIES.insertDocument);
        const insertChunkStmt = db.prepare(QUERIES.insertChunk);
        const insertEmbeddingStmt = db.prepare(QUERIES.insertEmbedding);

        // Execute in transaction
        const insertTransaction = db.transaction(() => {
            const documentMap = new Map<string, number>();

            for (let i = 0; i < embeddings.length; i++) {
                const embedding = embeddings[i];
                const meta = metadata[i];
                
                if (!meta) {
                    throw new Error(`Missing metadata for embedding at index ${i}`);
                }

                // Insert document if not already inserted
                if (!documentMap.has(meta.filePath)) {
                    // Get the actual file hash to use as fingerprint
                    let fileHash = '';
                    
                    // Check if metadata already contains fileHash (from orchestrator)
                    if ('fileHash' in meta && meta.fileHash) {
                        fileHash = meta.fileHash as string;
                        this.logger?.debug(`Using provided file hash for ${meta.filePath}: ${fileHash}`);
                    } else {
                        // Generate hash from file or content
                        try {
                            const fileBuffer = fs.readFileSync(meta.filePath);
                            fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
                            this.logger?.debug(`Generated MD5 hash for ${meta.filePath}: ${fileHash}`);
                        } catch (error) {
                            // If we can't read the file, generate a content-based hash from the chunks
                            const contentHash = crypto.createHash('md5');
                            // Use the content from this file's chunks to generate a hash
                            for (let j = i; j < metadata.length; j++) {
                                const chunkMeta = metadata[j];
                                if (chunkMeta && chunkMeta.filePath === meta.filePath) {
                                    contentHash.update(chunkMeta.content);
                                }
                            }
                            fileHash = contentHash.digest('hex');
                            this.logger?.warn(`Could not read file ${meta.filePath}, using content-based hash: ${fileHash}`);
                        }
                    }
                    
                    const docResult = insertDocStmt.run(
                        meta.filePath,
                        fileHash, // Use actual file hash as fingerprint
                        1000, // Default file size
                        'application/octet-stream', // Default mime type
                        new Date().toISOString()
                    );
                    // Use the actual auto-generated ID from the database
                    const docId = docResult.lastInsertRowid as number;
                    documentMap.set(meta.filePath, docId);
                }

                const docId = documentMap.get(meta.filePath)!;

                // Use semantic metadata from orchestrator if available, otherwise use fallback
                // Handle partial semantic metadata - each field independently
                let keyPhrases: string = '';
                let readabilityScore: number = 50;

                // Key phrases MUST be provided by orchestrator - no fallbacks!
                if (meta.keyPhrases && meta.keyPhrases.length > 0) {
                    // Store SemanticScore[] as JSON to preserve scores
                    keyPhrases = JSON.stringify(meta.keyPhrases);
                    this.logger?.debug(`Using semantic key phrases for chunk ${meta.chunkIndex}`, {
                        keyPhraseCount: meta.keyPhrases.length,
                        multiwordRatio: meta.keyPhrases.filter(p => p.text.includes(' ')).length / Math.max(1, meta.keyPhrases.length),
                        samplePhrases: meta.keyPhrases.slice(0, 3).map(p => `${p.text}(${p.score.toFixed(3)})`)
                    });
                } else {
                    // FAIL LOUDLY - no silent failures!
                    const errorMsg = `CRITICAL: No key phrases provided for chunk ${meta.chunkIndex} in file ${meta.filePath}. Semantic extraction must complete before storage!`;
                    this.logger?.error(errorMsg);
                    throw new Error(errorMsg);
                }

                // Readability score MUST be provided by orchestrator - no fallbacks!
                if (meta.readabilityScore !== undefined && meta.readabilityScore !== null && meta.readabilityScore > 0) {
                    readabilityScore = meta.readabilityScore;
                } else {
                    // FAIL LOUDLY - no silent failures!
                    const errorMsg = `CRITICAL: No readability score provided for chunk ${meta.chunkIndex} in file ${meta.filePath}. Semantic extraction must complete before storage!`;
                    this.logger?.error(errorMsg);
                    throw new Error(errorMsg);
                }

                // Insert chunk with semantic processing results
                const chunkResult = insertChunkStmt.run(
                    docId,
                    meta.chunkIndex,
                    meta.content,
                    meta.startPosition,
                    meta.endPosition,
                    Math.ceil(meta.content.length / 4), // Rough token count estimate
                    keyPhrases, // key_phrases as JSON array
                    readabilityScore, // readability_score as number
                    1,    // semantic_processed - true (1) since processed
                    new Date().toISOString()  // semantic_timestamp - current timestamp
                );

                const chunkId = chunkResult.lastInsertRowid as number;

                // Insert embedding - temporarily store as JSON string for debugging
                const embeddingArray = Array.isArray(embedding) ? embedding : (embedding?.vector || []);
                const embeddingJson = JSON.stringify(embeddingArray);
                insertEmbeddingStmt.run(chunkId, embeddingJson);
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
     * Remove document from vector index (alias for deleteDocument)
     * Implements IVectorSearchService interface method
     */
    async removeDocument(filePath: string): Promise<void> {
        await this.deleteDocument(filePath);
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

    /**
     * Get file metadata for change detection
     */
    async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
        if (!this.dbManager.isReady()) {
            // If database not ready, assume file is new
            return null;
        }

        try {
            const db = this.dbManager.getDatabase();
            const stmt = db.prepare(`
                SELECT file_path, last_modified, file_size, fingerprint 
                FROM documents 
                WHERE file_path = ?
            `);
            const result = stmt.get(filePath) as any;
            
            if (!result) {
                return null;
            }

            return {
                filePath: result.file_path,
                lastModified: new Date(result.last_modified).getTime(),
                size: result.file_size || 0,
                hash: result.fingerprint
            };
        } catch (error) {
            this.logger?.error(`Failed to get file metadata for ${filePath}`, error as Error);
            return null;
        }
    }

    /**
     * Remove embeddings for a specific file
     */
    async removeFileEmbeddings(filePath: string): Promise<void> {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }

        try {
            await this.deleteDocument(filePath);
            this.logger?.info(`Removed embeddings for file: ${filePath}`);
        } catch (error) {
            const errorMessage = `Failed to remove embeddings for ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
            this.logger?.error(errorMessage, error as Error);
            throw new Error(errorMessage);
        }
    }

    /**
     * Get all document fingerprints for change detection
     * Returns a map of file path to fingerprint/hash
     */
    async getDocumentFingerprints(): Promise<Map<string, string>> {
        if (!this.dbManager.isReady()) {
            // If database not ready, return empty map
            return new Map();
        }

        try {
            const db = this.dbManager.getDatabase();
            const stmt = db.prepare(`
                SELECT file_path, fingerprint 
                FROM documents 
                WHERE fingerprint IS NOT NULL
            `);
            const results = stmt.all() as any[];
            
            const fingerprints = new Map<string, string>();
            for (const row of results) {
                fingerprints.set(row.file_path, row.fingerprint);
            }
            
            this.logger?.debug(`Retrieved ${fingerprints.size} document fingerprints`);
            return fingerprints;
        } catch (error) {
            this.logger?.error('Failed to get document fingerprints', error as Error);
            // Return empty map on error to allow indexing to proceed
            return new Map();
        }
    }
}