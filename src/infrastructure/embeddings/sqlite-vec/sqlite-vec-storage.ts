/**
 * SQLite-vec Storage Implementation
 * 
 * Implements IVectorSearchService using SQLite-vec for persistent vector storage
 * and fast similarity search with SIMD acceleration.
 */

import { IVectorSearchService, ILoggingService } from '../../../di/interfaces.js';
import { EmbeddingVector, TextChunk, SemanticScore } from '../../../types/index.js';
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
     *
     * This method completely replaces existing data in the index (unlike addEmbeddings
     * which is incremental). It clears all existing data first, then adds the new
     * embeddings, ensuring a clean index rebuild.
     */
    async buildIndex(embeddings: EmbeddingVectorOrArray[], metadata: VectorMetadata[]): Promise<void> {
        // buildIndex should replace existing data completely (unlike addEmbeddings which is incremental)

        if (embeddings.length !== metadata.length) {
            throw new Error(`Embeddings count (${embeddings.length}) must match metadata count (${metadata.length})`);
        }

        try {
            // Initialize database if not already done
            if (!this.dbManager.isReady()) {
                await this.dbManager.initialize();
            }

            // Clear all existing data for full rebuild
            await this.clearIndex();

            if (embeddings.length === 0) {
                this.logger?.info('Building empty index');
                this.ready = true;
                return;
            }

            this.logger?.info(`Building index with ${embeddings.length} embeddings (replacing existing data)`);

            // Insert new data
            await this.insertEmbeddingsWithMetadata(embeddings, metadata);

            this.ready = true;
            this.logger?.info(`Successfully built index with ${embeddings.length} embeddings`);

        } catch (error) {
            const errorMessage = `Failed to build index: ${error instanceof Error ? error.message : String(error)}`;
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
            // Initialize database if not already done, even for empty data
            if (!this.dbManager.isReady()) {
                await this.dbManager.initialize();
            }
            this.ready = true;
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
     * Update document-level semantics (Sprint 11)
     * Stores document embedding and keywords for a specific document
     */
    async updateDocumentSemantics(
        filePath: string,
        documentEmbedding: string,
        documentKeywords: string,
        processingTimeMs: number
    ): Promise<void> {
        const db = this.dbManager.getDatabase();

        // Wrap entire update in transaction for atomicity (Sprint 7.5 consistency)
        const updateTransaction = db.transaction(() => {
            // Get document ID first
            const getDocStmt = db.prepare('SELECT id FROM documents WHERE file_path = ?');
            const doc = getDocStmt.get(filePath) as any;

            if (!doc) {
                throw new Error(`Document not found for semantics update: ${filePath}`);
            }

            const docId = doc.id;

            // Update document keywords and processing time
            const updateKeywordsStmt = db.prepare(QUERIES.updateDocumentKeywords);
            updateKeywordsStmt.run(documentKeywords, docId);

            const updateTimeStmt = db.prepare(QUERIES.updateDocumentProcessingTime);
            updateTimeStmt.run(processingTimeMs, docId);

            // Insert document embedding into vec0 table with document_id as INTEGER metadata column
            // Ensure document_id is a plain integer (better-sqlite3 can return BigInt)
            const docIdInt = Number(docId);

            // documentEmbedding is base64-encoded string from DocumentEmbeddingService.serializeEmbedding()
            // Convert base64 → Float32Array → JSON array for vec_f32()
            const buffer = Buffer.from(documentEmbedding, 'base64');
            const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
            const embeddingJson = JSON.stringify(Array.from(float32Array));

            // CRITICAL: Use CAST(? AS INTEGER) because better-sqlite3 sends parameters as FLOAT to vec0
            db.prepare('INSERT INTO document_embeddings (document_id, embedding) VALUES (CAST(? AS INTEGER), vec_f32(?))').run(docIdInt, embeddingJson);

            return docId; // Return for logging outside transaction
        });

        const docId = updateTransaction(); // Execute transaction

        this.logger?.info(`Document semantics updated for: ${filePath} (doc_id=${docId})`);
    }

    /**
     * Clear all data from the index
     */
    private async clearIndex(): Promise<void> {
        const db = this.dbManager.getDatabase();

        // CRITICAL: Vec0 virtual tables don't support foreign keys or CASCADE delete
        // Must manually delete in dependency order
        const clearTransaction = db.transaction(() => {
            // 1. Delete vec0 embeddings first (no foreign keys, so order matters)
            db.exec('DELETE FROM chunk_embeddings');
            db.exec('DELETE FROM document_embeddings');

            // 2. Delete chunks (CASCADE will handle this when deleting documents, but explicit is safer)
            db.exec('DELETE FROM chunks');

            // 3. Delete documents
            db.exec('DELETE FROM documents');

            // 4. Delete file states
            db.exec('DELETE FROM file_states');
        });

        clearTransaction();
        this.logger?.debug('Cleared existing vector index data (manual CASCADE for vec0 tables)');
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
        // Don't prepare chunk embedding statement - will use raw SQL with vec_f32() inside transaction

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

                // Ensure chunk_id is a plain integer (better-sqlite3 can return BigInt)
                const chunkId = Number(chunkResult.lastInsertRowid);

                // Insert embedding into vec0 table with chunk_id as INTEGER metadata column
                const embeddingArray = Array.isArray(embedding) ? embedding : (embedding?.vector || []);
                const embeddingJson = JSON.stringify(embeddingArray);

                // CRITICAL: Use CAST(? AS INTEGER) because better-sqlite3 sends parameters as FLOAT to vec0
                db.prepare('INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES (CAST(? AS INTEGER), vec_f32(?))').run(chunkId, embeddingJson);
            }
        });

        insertTransaction();
        this.logger?.info(`Inserted ${embeddings.length} embeddings with metadata`);
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
     * Manual CASCADE for vec0 tables (they don't support foreign keys)
     */
    async deleteDocument(filePath: string): Promise<void> {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }

        const db = this.dbManager.getDatabase();

        // Get document ID
        const getDocStmt = db.prepare(QUERIES.getDocument);
        const doc = getDocStmt.get(filePath) as any;

        if (!doc) {
            this.logger?.debug(`Document not found for deletion: ${filePath}`);
            return;
        }

        const docId = doc.id;

        // Get all chunk IDs before transaction
        const getChunksStmt = db.prepare('SELECT id FROM chunks WHERE document_id = ?');
        const chunks = getChunksStmt.all(docId) as any[];

        // Execute deletion in transaction with manual CASCADE for vec0 tables
        const deleteTransaction = db.transaction(() => {
            // 1. Delete chunk embeddings from vec0 table (manual CASCADE)
            const deleteChunkEmbStmt = db.prepare('DELETE FROM chunk_embeddings WHERE chunk_id = ?');
            for (const chunk of chunks) {
                deleteChunkEmbStmt.run(chunk.id);
            }

            // 2. Delete document embedding from vec0 table (manual CASCADE)
            const deleteDocEmbStmt = db.prepare(QUERIES.deleteDocumentEmbedding);
            deleteDocEmbStmt.run(docId);

            // 3. Delete document (regular CASCADE handles chunks table)
            const deleteDocStmt = db.prepare(QUERIES.deleteDocument);
            deleteDocStmt.run(filePath);
        });

        try {
            deleteTransaction();
            this.logger?.debug(`Deleted document and vec0 embeddings: ${filePath} (doc_id=${docId}, chunks=${chunks.length})`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger?.error(`Failed to delete document ${filePath}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
            throw error;
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
     * Batch delete multiple documents in a single transaction
     * Critical for bulk operations to prevent SQLite lock contention
     * @param filePaths Array of file paths to delete (max 1000 per batch)
     * @param maxBatchSize Maximum number of documents to delete in single transaction (default: 1000)
     */
    async deleteDocumentsBatch(filePaths: string[], maxBatchSize: number = 1000): Promise<void> {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }

        if (filePaths.length === 0) {
            this.logger?.debug('Batch deletion called with empty array');
            return;
        }

        // If batch exceeds max size, split into chunks and process recursively
        if (filePaths.length > maxBatchSize) {
            this.logger?.info(`Batch size ${filePaths.length} exceeds limit ${maxBatchSize}, splitting into chunks`);

            for (let i = 0; i < filePaths.length; i += maxBatchSize) {
                const chunk = filePaths.slice(i, i + maxBatchSize);
                this.logger?.debug(`Processing batch chunk ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(filePaths.length / maxBatchSize)}: ${chunk.length} files`);
                await this.deleteDocumentsBatch(chunk, maxBatchSize); // Recursive call with chunk
            }

            this.logger?.info(`Completed batch deletion of ${filePaths.length} documents in ${Math.ceil(filePaths.length / maxBatchSize)} chunks`);
            return;
        }

        const db = this.dbManager.getDatabase();

        // Collect all documents and chunks before transaction
        const docsToDelete: Array<{ docId: number; filePath: string; chunks: any[] }> = [];

        for (const filePath of filePaths) {
            const getDocStmt = db.prepare(QUERIES.getDocument);
            const doc = getDocStmt.get(filePath) as any;

            if (!doc) {
                this.logger?.debug(`Document not found for deletion: ${filePath}`);
                continue;
            }

            const getChunksStmt = db.prepare('SELECT id FROM chunks WHERE document_id = ?');
            const chunks = getChunksStmt.all(doc.id) as any[];

            docsToDelete.push({ docId: doc.id, filePath, chunks });
        }

        if (docsToDelete.length === 0) {
            this.logger?.debug('No documents found for batch deletion');
            return;
        }

        // Execute all deletions in a single transaction
        const batchDeleteTransaction = db.transaction(() => {
            const deleteChunkEmbStmt = db.prepare('DELETE FROM chunk_embeddings WHERE chunk_id = ?');
            const deleteDocEmbStmt = db.prepare(QUERIES.deleteDocumentEmbedding);
            const deleteDocStmt = db.prepare(QUERIES.deleteDocument);

            for (const { docId, filePath, chunks } of docsToDelete) {
                // 1. Delete chunk embeddings from vec0 table (manual CASCADE)
                for (const chunk of chunks) {
                    deleteChunkEmbStmt.run(chunk.id);
                }

                // 2. Delete document embedding from vec0 table (manual CASCADE)
                deleteDocEmbStmt.run(docId);

                // 3. Delete document (regular CASCADE handles chunks table)
                deleteDocStmt.run(filePath);
            }
        });

        try {
            batchDeleteTransaction();
            this.logger?.debug(`Batch deleted ${docsToDelete.length} documents with vec0 embeddings (total chunks: ${docsToDelete.reduce((sum, d) => sum + d.chunks.length, 0)})`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger?.error(`Batch deletion failed for ${filePaths.length} documents: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
            throw error;
        }
    }

    /**
     * Get all document paths from the database
     * Used for orphan detection - finding documents in DB that no longer exist on disk
     */
    async getAllDocumentPaths(): Promise<string[]> {
        if (!this.dbManager.isReady()) {
            throw new Error('Database not initialized');
        }

        const db = this.dbManager.getDatabase();
        const stmt = db.prepare('SELECT file_path FROM documents');
        const rows = stmt.all() as { file_path: string }[];
        return rows.map(row => row.file_path);
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