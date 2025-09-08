/**
 * SQLite-vec Database Schema
 * 
 * Defines the complete database schema for embedding storage using SQLite-vec.
 * This schema supports per-folder databases with full document and chunk tracking.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Read schema version from VERSION.json file
function getSchemaVersion(): number {
    try {
        const versionPath = join(process.cwd(), 'VERSION.json');
        const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
        return versionData.dbSchemaVersion || 2;
    } catch (error) {
        // Fallback to default if VERSION.json is not found
        console.warn('Could not read VERSION.json, using default schema version');
        return 2;
    }
}

// Schema version from VERSION.json (or fallback)
export const SCHEMA_VERSION = getSchemaVersion();

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
 * Enhanced with semantic metadata for AI agent navigation
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
    -- Semantic metadata columns for Sprint 10
    key_phrases TEXT,           -- JSON array of extracted key phrases
    topics TEXT,                -- JSON array of detected topics
    readability_score REAL,     -- Flesch Reading Ease score (0-100)
    semantic_processed INTEGER DEFAULT 0,  -- Flag: 1 if semantic extraction succeeded
    semantic_timestamp INTEGER, -- Unix timestamp of semantic processing
    UNIQUE(document_id, chunk_index)
);`;

/**
 * Vector embeddings storage using vec0 extension
 * Note: The dimension will be set dynamically based on the embedding model
 * TODO: Temporarily using regular table instead of vec0 virtual table for debugging
 */
export const EMBEDDINGS_TABLE_TEMPLATE = `
CREATE TABLE IF NOT EXISTS embeddings (
    chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
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
 * File processing states table
 * Tracks processing outcomes for intelligent scanning decisions
 */
export const FILE_STATES_TABLE = `
CREATE TABLE IF NOT EXISTS file_states (
    file_path TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,
    processing_state TEXT NOT NULL,
    last_attempt INTEGER NOT NULL,
    success_timestamp INTEGER,
    failure_reason TEXT,
    attempt_count INTEGER DEFAULT 1,
    chunk_count INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);`;

// REMOVED: folder_semantic_summary table (Phase 5 cleanup)
// Using pure runtime aggregation instead of caching for consistency

/**
 * Schema version tracking table
 * Used to detect when database needs to be rebuilt due to schema changes
 */
export const SCHEMA_VERSION_TABLE = `
CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
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
    'CREATE INDEX IF NOT EXISTS idx_chunks_content_search ON chunks(content);',
    'CREATE INDEX IF NOT EXISTS idx_file_states_hash ON file_states(content_hash);',
    'CREATE INDEX IF NOT EXISTS idx_file_states_state ON file_states(processing_state);',
    'CREATE INDEX IF NOT EXISTS idx_file_states_last_attempt ON file_states(last_attempt);',
    // Semantic indexes for Sprint 10
    'CREATE INDEX IF NOT EXISTS idx_chunks_semantic_processed ON chunks(semantic_processed);'
    // REMOVED: idx_folder_summary_updated (Phase 5 cleanup - table no longer exists)
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
        FILE_STATES_TABLE,
        // REMOVED: FOLDER_SEMANTIC_SUMMARY_TABLE (Phase 5 cleanup - using runtime aggregation)
        SCHEMA_VERSION_TABLE,
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
        AND name IN ('documents', 'chunks', 'embeddings', 'chunk_metadata', 'embedding_config', 'file_states')
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
    
    // Chunk operations (updated for Sprint 10 with semantic columns)
    insertChunk: `
        INSERT INTO chunks 
        (document_id, chunk_index, content, start_offset, end_offset, token_count,
         key_phrases, topics, readability_score, semantic_processed, semantic_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            c.key_phrases,
            c.topics,
            c.readability_score,
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
    getDatabaseSize: 'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()',
    
    // REMOVED: folder semantic summary queries (Phase 5 cleanup)
    // Using runtime aggregation with aggregateSemanticData query instead
    
    // Aggregation query for building folder summaries
    aggregateSemanticData: `
        SELECT 
            COUNT(DISTINCT d.id) as document_count,
            COUNT(c.id) as chunk_count,
            AVG(c.readability_score) as avg_readability,
            GROUP_CONCAT(c.key_phrases) as all_key_phrases,
            GROUP_CONCAT(c.topics) as all_topics
        FROM documents d
        JOIN chunks c ON d.id = c.document_id
        WHERE c.semantic_processed = 1
    `,
    
    // Phase 5: Runtime path parsing for subfolder support
    getSubfoldersWithSemanticData: `
        WITH path_analysis AS (
            SELECT 
                d.file_path,
                d.id,
                CASE 
                    WHEN d.file_path LIKE ? || '/%' 
                    THEN SUBSTR(d.file_path, LENGTH(?) + 2)
                    ELSE d.file_path 
                END as relative_path
            FROM documents d
            WHERE d.file_path LIKE ? || '/%'
        ),
        subfolder_extraction AS (
            SELECT 
                CASE 
                    WHEN relative_path LIKE '%/%' 
                    THEN '/' || SUBSTR(relative_path, 1, INSTR(relative_path, '/') - 1)
                    ELSE '/'  
                END as subfolder_path,
                relative_path,
                id, file_path
            FROM path_analysis
        ),
        subfolder_stats AS (
            SELECT 
                se.subfolder_path,
                COUNT(DISTINCT se.id) as document_count,
                AVG(c.readability_score) as avg_readability,
                GROUP_CONCAT(DISTINCT json_extract(c.topics, '$[0]')) as top_topics,
                GROUP_CONCAT(DISTINCT json_extract(c.key_phrases, '$[0]')) as key_phrases
            FROM subfolder_extraction se
            JOIN chunks c ON se.id = (SELECT id FROM documents WHERE file_path = se.file_path)
            WHERE c.semantic_processed = 1
            AND se.subfolder_path != '/'
            GROUP BY se.subfolder_path
        )
        SELECT 
            subfolder_path,
            document_count,
            ROUND(avg_readability, 1) as avg_readability,
            top_topics,
            key_phrases
        FROM subfolder_stats
        WHERE document_count > 0
        ORDER BY subfolder_path
    `,
    
    getDocumentsInSubfolder: `
        SELECT d.*, 
               json_group_array(
                   json_object(
                       'topic', json_extract(c.topics, '$[0]'),
                       'key_phrase', json_extract(c.key_phrases, '$[0]'),
                       'readability', c.readability_score
                   )
               ) as semantic_data
        FROM documents d
        JOIN chunks c ON d.id = c.document_id
        WHERE d.file_path LIKE ? || '%'
        AND c.semantic_processed = 1
        GROUP BY d.id
        ORDER BY d.last_modified DESC
        LIMIT ? OFFSET ?
    `
};