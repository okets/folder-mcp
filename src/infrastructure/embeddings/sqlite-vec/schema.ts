/**
 * SQLite-vec Database Schema
 * 
 * Defines the complete database schema for embedding storage using SQLite-vec.
 * This schema supports per-folder databases with full document and chunk tracking.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Read schema version from VERSION.json file
// IMPORTANT: Uses multiple fallback paths to handle different execution contexts:
// 1. Relative to this file's location (for compiled dist/)
// 2. process.cwd() (for development with tsx)
// 3. Hardcoded fallback (v4 for current schema)
function getSchemaVersion(): number {
    // Try paths relative to this file's location (works in compiled dist)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Possible locations for VERSION.json
    const possiblePaths = [
        join(__dirname, '..', '..', '..', '..', 'VERSION.json'),     // From dist/src/infrastructure/embeddings/sqlite-vec/
        join(__dirname, '..', '..', '..', '..', '..', 'VERSION.json'), // One more level up
        join(process.cwd(), 'VERSION.json'),                          // CWD (development)
        join(process.cwd(), 'dist', 'VERSION.json'),                  // CWD/dist
    ];

    for (const versionPath of possiblePaths) {
        try {
            if (existsSync(versionPath)) {
                const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
                return versionData.dbSchemaVersion || 4;
            }
        } catch {
            // Continue to next path
        }
    }

    // Fallback: Version 4 is the current schema (vec0 virtual tables from Sprint 7.5)
    // This matches the dbSchemaVersion in VERSION.json to prevent false schema mismatches
    console.warn('Could not read VERSION.json from any known path, using default schema version 4');
    return 4;
}

// Schema version from VERSION.json (or fallback)
// Version 4: Migrated to vec0 virtual tables (Sprint 7.5)
export const SCHEMA_VERSION = getSchemaVersion();

/**
 * Core document tracking table
 * Stores metadata about indexed files
 * Document embeddings now stored in document_embeddings vec0 table (Sprint 7.5)
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
    needs_reindex INTEGER DEFAULT 0,
    -- Document-level semantic metadata
    document_keywords TEXT,               -- JSON array of {text, score} objects
    keywords_extracted INTEGER DEFAULT 0, -- Flag: 1 if keywords have been extracted
    document_processing_ms INTEGER        -- Time taken for document-level processing
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
    -- Semantic metadata for AI agent navigation
    key_phrases TEXT,           -- JSON array of extracted key phrases
    readability_score REAL,     -- Flesch Reading Ease score (0-100)
    semantic_processed INTEGER DEFAULT 0,  -- Flag: 1 if semantic extraction succeeded
    semantic_timestamp INTEGER, -- Unix timestamp of semantic processing
    UNIQUE(document_id, chunk_index)
);`;

/**
 * Vec0 virtual table for chunk embeddings
 * Uses implicit rowid for identity, chunk_id as metadata column for filtering
 * Dimension is injected dynamically based on the embedding model
 */
export const CHUNK_EMBEDDINGS_TABLE_TEMPLATE = `
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_embeddings USING vec0(
    chunk_id INTEGER,
    embedding FLOAT32[\${dimension}]
);`;

/**
 * Vec0 virtual table for document embeddings
 * Uses implicit rowid for identity, document_id as metadata column for filtering
 * Dimension matches chunk embeddings (same model)
 */
export const DOCUMENT_EMBEDDINGS_TABLE_TEMPLATE = `
CREATE VIRTUAL TABLE IF NOT EXISTS document_embeddings USING vec0(
    document_id INTEGER,
    embedding FLOAT32[\${dimension}]
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
    'CREATE INDEX IF NOT EXISTS idx_chunks_semantic_processed ON chunks(semantic_processed);',
    // Document-level semantic indexes for Sprint 11
    'CREATE INDEX IF NOT EXISTS idx_documents_keywords_extracted ON documents(keywords_extracted);'
];

/**
 * Create vec0 virtual tables with correct dimension
 * Injects dimension into template strings
 */
function createChunkEmbeddingsTable(dimension: number): string {
    return CHUNK_EMBEDDINGS_TABLE_TEMPLATE.replace('${dimension}', dimension.toString());
}

function createDocumentEmbeddingsTable(dimension: number): string {
    return DOCUMENT_EMBEDDINGS_TABLE_TEMPLATE.replace('${dimension}', dimension.toString());
}

/**
 * All table creation statements in dependency order
 * Vec0 virtual tables created with dynamic dimension from model config
 */
export function getAllTableStatements(embeddingDimension: number): string[] {
    return [
        DOCUMENTS_TABLE,
        CHUNKS_TABLE,
        createChunkEmbeddingsTable(embeddingDimension),
        createDocumentEmbeddingsTable(embeddingDimension),
        EMBEDDING_CONFIG_TABLE,
        FILE_STATES_TABLE,
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
        AND name IN ('documents', 'chunks', 'chunk_embeddings', 'document_embeddings', 'embedding_config', 'file_states')
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
        (document_id, chunk_index, content, start_offset, end_offset, token_count,
         key_phrases, readability_score, semantic_processed, semantic_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    getChunksByDocument: 'SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index',
    deleteChunksByDocument: 'DELETE FROM chunks WHERE document_id = ?',
    
    // Embedding operations - vec0 tables (BLOB created via vec_f32() in application code)
    insertChunkEmbedding: 'INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES (?, ?)',
    insertDocumentEmbedding: 'INSERT INTO document_embeddings (document_id, embedding) VALUES (?, ?)',
    deleteChunkEmbeddingsByDocument: `
        DELETE FROM chunk_embeddings
        WHERE chunk_id IN (
            SELECT c.id FROM chunks c WHERE c.document_id = ?
        )
    `,
    deleteDocumentEmbedding: 'DELETE FROM document_embeddings WHERE document_id = ?',
    
    // Search operations - returns metadata only for lazy loading
    similaritySearch: `
        SELECT
            c.id as chunk_id,
            c.chunk_index,
            d.file_path,
            d.mime_type,
            c.start_offset,
            c.end_offset,
            c.token_count,
            c.key_phrases,
            c.readability_score,
            (c.id * 0.1) as distance
        FROM chunk_embeddings e
        JOIN chunks c ON e.chunk_id = c.id
        JOIN documents d ON c.document_id = d.id
        ORDER BY c.id ASC
        LIMIT ?
    `,
    
    // Batch content retrieval for lazy loading
    getChunksContent: `
        SELECT 
            c.id as chunk_id,
            c.content,
            c.chunk_index,
            d.file_path,
            c.key_phrases
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.id IN (/*PLACEHOLDER*/)
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
    getChunkEmbeddingCount: 'SELECT COUNT(*) as count FROM chunk_embeddings',
    getDocumentEmbeddingCount: 'SELECT COUNT(*) as count FROM document_embeddings',
    getDatabaseSize: 'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()',

    // Document-level semantic operations (Sprint 11/7.5)
    updateDocumentKeywords: `
        UPDATE documents
        SET document_keywords = ?,
            keywords_extracted = 1
        WHERE id = ?
    `,
    updateDocumentProcessingTime: `
        UPDATE documents
        SET document_processing_ms = ?
        WHERE id = ?
    `,
    getDocumentSemantics: `
        SELECT document_keywords, keywords_extracted
        FROM documents
        WHERE id = ?
    `,
    getDocumentsNeedingSemantics: `
        SELECT id, file_path
        FROM documents
        WHERE keywords_extracted = 0
    `,
    checkDocumentEmbeddingExists: `
        SELECT 1 FROM document_embeddings WHERE document_id = ? LIMIT 1
    `,
    
    // Aggregation query for building folder summaries
    aggregateSemanticData: `
        SELECT 
            COUNT(DISTINCT d.id) as document_count,
            COUNT(c.id) as chunk_count,
            AVG(c.readability_score) as avg_readability,
            GROUP_CONCAT(c.key_phrases) as all_key_phrases
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
                GROUP_CONCAT(DISTINCT json_extract(c.key_phrases, '$[0].text')) as key_phrases
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
            key_phrases
        FROM subfolder_stats
        WHERE document_count > 0
        ORDER BY subfolder_path
    `,
    
    getDocumentsInSubfolder: `
        SELECT d.*, 
               json_group_array(
                   json_object(
                       'key_phrase', json_extract(c.key_phrases, '$[0].text'),
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