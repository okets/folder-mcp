/**
 * SQLite-vec Database Schema
 * 
 * Defines the complete database schema for embedding storage using SQLite-vec.
 * This schema supports per-folder databases with full document and chunk tracking.
 */

export const SCHEMA_VERSION = 1;

/**
 * Core document tracking table
 * Stores metadata about indexed files
 */
export const DOCUMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    fingerprint TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT,
    last_modified TIMESTAMP NOT NULL,
    last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    needs_reindex INTEGER DEFAULT 0
);`;

/**
 * Text chunks from documents
 * Each document is split into multiple chunks for embedding
 */
export const CHUNKS_TABLE = `
CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    token_count INTEGER,
    UNIQUE(document_id, chunk_index)
);`;

/**
 * Vector embeddings storage using vec0 extension
 * Note: The dimension will be set dynamically based on the embedding model
 * TODO: Temporarily using regular table instead of vec0 virtual table for debugging
 */
export const EMBEDDINGS_TABLE_TEMPLATE = `
CREATE TABLE IF NOT EXISTS embeddings (
    chunk_id INTEGER PRIMARY KEY,
    embedding TEXT
);`;

/**
 * Metadata for search results and document structure
 * Stores additional context for chunks (page numbers, sections, etc.)
 */
export const CHUNK_METADATA_TABLE = `
CREATE TABLE IF NOT EXISTS chunk_metadata (
    chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
    page_number INTEGER,
    section_name TEXT,
    sheet_name TEXT,
    slide_number INTEGER
);`;

/**
 * Configuration tracking for the embedding model used
 * Ensures consistency and detects model changes
 */
export const EMBEDDING_CONFIG_TABLE = `
CREATE TABLE IF NOT EXISTS embedding_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    model_name TEXT NOT NULL,
    model_dimension INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

/**
 * Database performance indexes
 */
export const INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(file_path);',
    'CREATE INDEX IF NOT EXISTS idx_documents_fingerprint ON documents(fingerprint);',
    'CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);',
    'CREATE INDEX IF NOT EXISTS idx_documents_needs_reindex ON documents(needs_reindex);',
    'CREATE INDEX IF NOT EXISTS idx_chunks_content_search ON chunks(content);'
];

/**
 * Complete schema setup function
 * Creates all tables and indexes for a new database
 */
export function createEmbeddingsTable(dimension: number): string {
    return EMBEDDINGS_TABLE_TEMPLATE.replace('{DIMENSION}', dimension.toString());
}

/**
 * All table creation statements in dependency order
 */
export function getAllTableStatements(embeddingDimension: number): string[] {
    return [
        DOCUMENTS_TABLE,
        CHUNKS_TABLE,
        createEmbeddingsTable(embeddingDimension),
        CHUNK_METADATA_TABLE,
        EMBEDDING_CONFIG_TABLE,
        ...INDEXES
    ];
}

/**
 * Validation queries to check database integrity
 */
export const VALIDATION_QUERIES = {
    checkTables: `
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name IN ('documents', 'chunks', 'embeddings', 'chunk_metadata', 'embedding_config')
        ORDER BY name;
    `,
    checkIndexes: `
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        AND name LIKE 'idx_%'
        ORDER BY name;
    `,
    checkForeignKeys: 'PRAGMA foreign_key_check;',
    checkIntegrity: 'PRAGMA integrity_check;'
};

/**
 * Common queries for database operations
 */
export const QUERIES = {
    // Document operations
    insertDocument: `
        INSERT OR REPLACE INTO documents 
        (file_path, fingerprint, file_size, mime_type, last_modified, last_indexed)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    getDocument: 'SELECT * FROM documents WHERE file_path = ?',
    deleteDocument: 'DELETE FROM documents WHERE file_path = ?',
    markForReindex: 'UPDATE documents SET needs_reindex = 1 WHERE file_path = ?',
    
    // Chunk operations
    insertChunk: `
        INSERT INTO chunks 
        (document_id, chunk_index, content, start_offset, end_offset, token_count)
        VALUES (?, ?, ?, ?, ?, ?)
    `,
    getChunksByDocument: 'SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index',
    deleteChunksByDocument: 'DELETE FROM chunks WHERE document_id = ?',
    
    // Embedding operations
    insertEmbedding: 'INSERT INTO embeddings (chunk_id, embedding) VALUES (?, ?)',
    deleteEmbeddingsByDocument: `
        DELETE FROM embeddings 
        WHERE chunk_id IN (
            SELECT c.id FROM chunks c WHERE c.document_id = ?
        )
    `,
    
    // Search operations (temporarily simplified without vec0 functions)
    similaritySearch: `
        SELECT 
            c.id as chunk_id,
            c.content,
            c.chunk_index,
            d.file_path,
            d.mime_type,
            cm.page_number,
            cm.section_name,
            cm.sheet_name,
            cm.slide_number,
            (c.id * 0.1) as distance
        FROM embeddings e
        JOIN chunks c ON e.chunk_id = c.id
        JOIN documents d ON c.document_id = d.id
        LEFT JOIN chunk_metadata cm ON c.id = cm.chunk_id
        ORDER BY c.id ASC
        LIMIT ?
    `,
    
    // Configuration operations
    getConfig: 'SELECT * FROM embedding_config WHERE id = 1',
    insertConfig: `
        INSERT OR REPLACE INTO embedding_config 
        (id, model_name, model_dimension, updated_at)
        VALUES (1, ?, ?, CURRENT_TIMESTAMP)
    `,
    
    // Statistics
    getDocumentCount: 'SELECT COUNT(*) as count FROM documents',
    getChunkCount: 'SELECT COUNT(*) as count FROM chunks',
    getEmbeddingCount: 'SELECT COUNT(*) as count FROM embeddings',
    getDatabaseSize: 'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'
};