/**
 * SQLite implementation of file state storage
 * 
 * Stores file processing states in the same database as embeddings
 * to maintain consistency and enable transactional operations.
 */

import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { 
  IFileStateStorage,
  FileState,
  FileProcessingState
} from '../../domain/files/file-state-manager.js';

/**
 * File states table schema
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

/**
 * Indexes for file states table
 */
export const FILE_STATES_INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_file_states_hash ON file_states(content_hash);',
    'CREATE INDEX IF NOT EXISTS idx_file_states_state ON file_states(processing_state);',
    'CREATE INDEX IF NOT EXISTS idx_file_states_last_attempt ON file_states(last_attempt);'
];

/**
 * File state storage queries
 */
const QUERIES = {
    getFileState: 'SELECT * FROM file_states WHERE file_path = ?',
    
    insertFileState: `
        INSERT OR REPLACE INTO file_states 
        (file_path, content_hash, processing_state, last_attempt, success_timestamp, 
         failure_reason, attempt_count, chunk_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `,
    
    updateProcessingState: `
        UPDATE file_states 
        SET processing_state = ?, failure_reason = ?, updated_at = strftime('%s', 'now')
        WHERE file_path = ?
    `,
    
    markFileProcessed: `
        UPDATE file_states 
        SET processing_state = ?, success_timestamp = strftime('%s', 'now'), 
            chunk_count = ?, updated_at = strftime('%s', 'now')
        WHERE file_path = ?
    `,
    
    getFilesByState: 'SELECT * FROM file_states WHERE processing_state = ?',
    
    deleteFileStates: 'DELETE FROM file_states WHERE file_path NOT IN (',
    
    getProcessingStats: `
        SELECT 
            processing_state,
            COUNT(*) as count
        FROM file_states 
        GROUP BY processing_state
    `,
    
    getTotalCount: 'SELECT COUNT(*) as total FROM file_states'
};

/**
 * SQLite implementation of file state storage
 */
export class SqliteFileStateStorage implements IFileStateStorage {
    private db: Database.Database;
    private getFileStateStmt!: Database.Statement;
    private insertFileStateStmt!: Database.Statement;
    private updateProcessingStateStmt!: Database.Statement;
    private markFileProcessedStmt!: Database.Statement;
    private getFilesByStateStmt!: Database.Statement;
    private getProcessingStatsStmt!: Database.Statement;
    private getTotalCountStmt!: Database.Statement;
    private ownConnection: boolean;

    constructor(databaseOrPath: string | Database.Database) {
        // Support both path (for backward compatibility) and database instance
        if (typeof databaseOrPath === 'string') {
            this.db = new Database(databaseOrPath);
            this.ownConnection = true;
            
            // Enable foreign keys and WAL mode for better performance
            this.db.pragma('foreign_keys = ON');
            this.db.pragma('journal_mode = WAL');
        } else {
            // Use provided database connection
            this.db = databaseOrPath;
            this.ownConnection = false;
            // Don't set pragmas as they should be set by the owner
        }
        
        try {
            // Create table and indexes
            this.initializeSchema();
            
            // Prepare statements
            this.prepareStatements();
        } catch (error) {
            // If database initialization fails (e.g., corrupted database),
            // close the connection to prevent Windows file locking issues
            // But only if we own the connection
            if (this.ownConnection) {
                try {
                    this.db.close();
                } catch (closeError) {
                    // Ignore close errors, we're already in an error state
                }
            }
            
            // Re-throw the original error with context
            if (error instanceof Error) {
                throw new Error(`Failed to initialize file state storage: ${error.message}`);
            }
            throw error;
        }
    }

    private initializeSchema(): void {
        // Create file_states table
        this.db.exec(FILE_STATES_TABLE);
        
        // Create indexes
        for (const index of FILE_STATES_INDEXES) {
            this.db.exec(index);
        }
    }

    private prepareStatements(): void {
        this.getFileStateStmt = this.db.prepare(QUERIES.getFileState);
        this.insertFileStateStmt = this.db.prepare(QUERIES.insertFileState);
        this.updateProcessingStateStmt = this.db.prepare(QUERIES.updateProcessingState);
        this.markFileProcessedStmt = this.db.prepare(QUERIES.markFileProcessed);
        this.getFilesByStateStmt = this.db.prepare(QUERIES.getFilesByState);
        this.getProcessingStatsStmt = this.db.prepare(QUERIES.getProcessingStats);
        this.getTotalCountStmt = this.db.prepare(QUERIES.getTotalCount);
    }

    async getFileState(filePath: string): Promise<FileState | null> {
        const row = this.getFileStateStmt.get(filePath) as any;
        if (!row) return null;

        return this.rowToFileState(row);
    }

    async setFileState(state: FileState): Promise<void> {
        this.insertFileStateStmt.run(
            state.filePath,
            state.contentHash,
            state.processingState,
            state.lastAttempt,
            state.successTimestamp || null,
            state.failureReason || null,
            state.attemptCount,
            state.chunkCount || null
        );
    }

    async updateProcessingState(
        filePath: string,
        state: FileProcessingState,
        failureReason?: string
    ): Promise<void> {
        this.updateProcessingStateStmt.run(
            state,
            failureReason || null,
            filePath
        );
    }

    async markFileProcessed(filePath: string, chunkCount: number): Promise<void> {
        console.error(`[FILE-STATE-DEBUG] Marking file as processed: ${filePath}`);
        console.error(`[FILE-STATE-DEBUG]   Chunks: ${chunkCount}, State: ${FileProcessingState.INDEXED}`);
        
        const result = this.markFileProcessedStmt.run(
            FileProcessingState.INDEXED,
            chunkCount,
            filePath
        );
        
        console.error(`[FILE-STATE-DEBUG]   Database changes after marking processed: ${result.changes}`);
        
        // Verify the update worked
        const verifyRow = this.getFileStateStmt.get(filePath) as any;
        if (verifyRow) {
            console.error(`[FILE-STATE-DEBUG]   Verification: State=${verifyRow.processing_state}, Chunks=${verifyRow.chunk_count}`);
        } else {
            console.error(`[FILE-STATE-DEBUG]   WARNING: File not found in database after marking processed!`);
        }
    }

    async getFilesByState(state: FileProcessingState): Promise<FileState[]> {
        const rows = this.getFilesByStateStmt.all(state) as any[];
        return rows.map(row => this.rowToFileState(row));
    }

    async cleanupMissingFiles(existingPaths: string[]): Promise<number> {
        if (existingPaths.length === 0) {
            // If no existing paths, delete all states
            const result = this.db.prepare('DELETE FROM file_states').run();
            return result.changes;
        }

        // Create placeholders for IN clause
        const placeholders = existingPaths.map(() => '?').join(',');
        const query = `DELETE FROM file_states WHERE file_path NOT IN (${placeholders})`;
        
        const result = this.db.prepare(query).run(...existingPaths);
        return result.changes;
    }

    async getProcessingStats(): Promise<{
        total: number;
        byState: Record<FileProcessingState, number>;
    }> {
        const totalResult = this.getTotalCountStmt.get() as { total: number };
        const statsRows = this.getProcessingStatsStmt.all() as Array<{
            processing_state: string;
            count: number;
        }>;

        const byState: Record<FileProcessingState, number> = {
            [FileProcessingState.PENDING]: 0,
            [FileProcessingState.PROCESSING]: 0,
            [FileProcessingState.INDEXED]: 0,
            [FileProcessingState.FAILED]: 0,
            [FileProcessingState.SKIPPED]: 0,
            [FileProcessingState.CORRUPTED]: 0,
            [FileProcessingState.DELETED]: 0
        };

        for (const row of statsRows) {
            const state = row.processing_state as FileProcessingState;
            byState[state] = row.count;
        }

        return {
            total: totalResult.total,
            byState
        };
    }

    /**
     * Generate content hash for a file
     */
    static generateContentHash(filePath: string, content: Buffer): string {
        const hash = createHash('md5');
        hash.update(filePath); // Include path to handle identical files in different locations
        hash.update(content);
        return hash.digest('hex');
    }

    /**
     * Close the database connection (only if we own it)
     */
    close(): void {
        if (this.ownConnection) {
            this.db.close();
        }
    }

    /**
     * Convert database row to FileState object
     */
    private rowToFileState(row: any): FileState {
        return {
            filePath: row.file_path,
            contentHash: row.content_hash,
            processingState: row.processing_state as FileProcessingState,
            lastAttempt: row.last_attempt,
            successTimestamp: row.success_timestamp || undefined,
            failureReason: row.failure_reason || undefined,
            attemptCount: row.attempt_count || 1,
            chunkCount: row.chunk_count || undefined
        };
    }
}