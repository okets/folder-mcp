/**
 * SQLite-vec Database Manager
 * 
 * Manages SQLite database connections with vec0 extension for vector storage.
 * Handles database initialization, schema creation, and connection management.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { 
    getAllTableStatements, 
    VALIDATION_QUERIES, 
    QUERIES,
    SCHEMA_VERSION 
} from './schema.js';
import { DatabaseRecovery, RecoveryOptions } from './database-recovery.js';

export interface DatabaseConfig {
    folderPath: string;
    modelName: string;
    modelDimension: number;
    enableWAL?: boolean;
    enableForeignKeys?: boolean;
    cacheSize?: number;
    journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';
    recoveryOptions?: RecoveryOptions;
    logger?: any; // ILoggingService
}

export interface DatabaseStats {
    documentCount: number;
    chunkCount: number;
    embeddingCount: number;
    databaseSize: number;
    modelName: string;
    modelDimension: number;
}

export class DatabaseManager {
    private db: Database.Database | null = null;
    private config: DatabaseConfig;
    private databasePath: string;
    private recovery: DatabaseRecovery;

    constructor(config: DatabaseConfig) {
        this.config = {
            enableWAL: true,
            enableForeignKeys: true,
            cacheSize: 10000,
            journalMode: 'WAL',
            ...config
        };
        
        // Determine the correct database path
        // folderPath might be either:
        // 1. Base folder path (e.g., /path/to/folder)
        // 2. Cache directory path (e.g., /path/to/folder/.folder-mcp/storage)
        let folderMcpDir: string;
        
        if (this.config.folderPath.includes('.folder-mcp')) {
            // folderPath already contains .folder-mcp, extract the base and reconstruct
            const parts = this.config.folderPath.split('.folder-mcp');
            const baseFolderPath = (parts[0] || '').replace(/[\/\\]$/, ''); // Remove trailing slash
            folderMcpDir = join(baseFolderPath, '.folder-mcp');
        } else {
            // folderPath is the base folder, append .folder-mcp
            folderMcpDir = join(this.config.folderPath, '.folder-mcp');
        }
        
        this.databasePath = join(folderMcpDir, 'embeddings.db');
        
        // Initialize recovery system
        this.recovery = new DatabaseRecovery(
            this.databasePath,
            this.config.logger,
            this.config.recoveryOptions
        );
    }

    /**
     * Initialize and open the database connection
     * Creates the database file and folder structure if they don't exist
     * Automatically detects and recovers from corruption
     */
    async initialize(): Promise<void> {
        try {
            // Ensure .folder-mcp directory exists
            const folderMcpDir = dirname(this.databasePath);
            if (!existsSync(folderMcpDir)) {
                mkdirSync(folderMcpDir, { recursive: true });
            }

            // Check for corruption before opening
            if (existsSync(this.databasePath)) {
                const corruption = await this.recovery.checkCorruption();
                if (corruption.isCorrupted) {
                    this.config.logger?.warn(`Database corruption detected: ${corruption.severity} severity`);
                    
                    // Attempt automatic recovery
                    const result = await this.recovery.recover();
                    if (!result.success) {
                        throw new Error(`Database recovery failed: ${result.message}`);
                    }
                    
                    this.config.logger?.info(`Database recovery successful: ${result.message}`);
                    if (result.dataLoss) {
                        this.config.logger?.warn('Data loss occurred during recovery - reindexing may be required');
                    }
                }
            }

            // Open database connection
            this.db = new Database(this.databasePath);

            // Load vec0 extension
            // TODO: Temporarily disabled while debugging basic functionality
            // await this.loadVectorExtension();

            // Configure database settings
            await this.configureDatabase();

            // Initialize schema
            await this.initializeSchema();

            // Store/validate embedding configuration
            await this.validateEmbeddingConfig();

            // Create initial backup if enabled
            if (this.config.recoveryOptions?.autoBackup !== false) {
                try {
                    await this.recovery.createBackup('post-init');
                    this.config.logger?.info('Created post-initialization database backup');
                } catch (backupError) {
                    this.config.logger?.warn('Failed to create initial backup:', backupError);
                }
            }

        } catch (error) {
            await this.close();
            throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Load the vec0 extension for vector operations
     */
    private async loadVectorExtension(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            // sqlite-vec provides the extension through a different mechanism
            // First try to load it via the sqlite-vec package
            const sqliteVec = await import('sqlite-vec');
            
            // Enable the extension on this database connection
            sqliteVec.load(this.db);
            
            // Test that the extension is working
            this.db.exec('SELECT vec_version()');
        } catch (error) {
            // Fallback: try standard extension loading
            try {
                this.db.exec('SELECT load_extension("vec0")');
                this.db.exec('SELECT vec_version()');
            } catch (fallbackError) {
                throw new Error(
                    `Failed to load vec0 extension. Primary error: ${error instanceof Error ? error.message : String(error)}. ` +
                    `Fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
                );
            }
        }
    }

    /**
     * Configure database performance and behavior settings
     */
    private async configureDatabase(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const settings = [
            `PRAGMA journal_mode = ${this.config.journalMode}`,
            `PRAGMA foreign_keys = ${this.config.enableForeignKeys ? 'ON' : 'OFF'}`,
            `PRAGMA cache_size = ${this.config.cacheSize}`,
            'PRAGMA synchronous = NORMAL',
            'PRAGMA temp_store = MEMORY',
            'PRAGMA mmap_size = 268435456' // 256MB
        ];

        for (const setting of settings) {
            this.db.exec(setting);
        }
    }

    /**
     * Create database schema with all tables and indexes
     */
    private async initializeSchema(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const statements = getAllTableStatements(this.config.modelDimension);
        
        // Execute all schema statements in a transaction
        const transaction = this.db.transaction(() => {
            for (const statement of statements) {
                this.db!.exec(statement);
            }
        });

        transaction();
    }

    /**
     * Validate embedding configuration and detect model changes
     */
    private async validateEmbeddingConfig(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const configStmt = this.db.prepare(QUERIES.getConfig);
        const existingConfig = configStmt.get() as any;

        if (existingConfig) {
            // Check for model changes
            if (existingConfig.model_name !== this.config.modelName) {
                throw new Error(
                    `Model mismatch: Database was created with '${existingConfig.model_name}', ` +
                    `but current model is '${this.config.modelName}'. Please reindex the folder.`
                );
            }

            if (existingConfig.model_dimension !== this.config.modelDimension) {
                throw new Error(
                    `Dimension mismatch: Database was created with dimension ${existingConfig.model_dimension}, ` +
                    `but current model has dimension ${this.config.modelDimension}. Please reindex the folder.`
                );
            }
        } else {
            // Insert initial configuration
            const insertConfigStmt = this.db.prepare(QUERIES.insertConfig);
            insertConfigStmt.run(this.config.modelName, this.config.modelDimension);
        }
    }

    /**
     * Get the database connection
     * Throws if database is not initialized
     */
    getDatabase(): Database.Database {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    /**
     * Check if database is initialized and ready
     */
    isReady(): boolean {
        return this.db !== null;
    }

    /**
     * Get database statistics
     */
    async getStats(): Promise<DatabaseStats> {
        if (!this.db) throw new Error('Database not initialized');

        const docCountStmt = this.db.prepare(QUERIES.getDocumentCount);
        const chunkCountStmt = this.db.prepare(QUERIES.getChunkCount);
        const embeddingCountStmt = this.db.prepare(QUERIES.getEmbeddingCount);
        const dbSizeStmt = this.db.prepare(QUERIES.getDatabaseSize);
        const configStmt = this.db.prepare(QUERIES.getConfig);

        const docCount = (docCountStmt.get() as any)?.count || 0;
        const chunkCount = (chunkCountStmt.get() as any)?.count || 0;
        const embeddingCount = (embeddingCountStmt.get() as any)?.count || 0;
        const dbSize = (dbSizeStmt.get() as any)?.size || 0;
        const config = configStmt.get() as any;

        return {
            documentCount: docCount,
            chunkCount: chunkCount,
            embeddingCount: embeddingCount,
            databaseSize: dbSize,
            modelName: config?.model_name || this.config.modelName,
            modelDimension: config?.model_dimension || this.config.modelDimension
        };
    }

    /**
     * Validate database integrity
     */
    async validateIntegrity(): Promise<{ isValid: boolean; errors: string[] }> {
        if (!this.db) throw new Error('Database not initialized');

        const errors: string[] = [];

        try {
            // Check integrity
            const integrityStmt = this.db.prepare(VALIDATION_QUERIES.checkIntegrity);
            const integrityResult = integrityStmt.all() as any[];
            if (integrityResult.length > 0 && integrityResult[0]?.integrity_check !== 'ok') {
                errors.push(`Integrity check failed: ${JSON.stringify(integrityResult)}`);
            }

            // Check foreign keys
            const fkStmt = this.db.prepare(VALIDATION_QUERIES.checkForeignKeys);
            const fkResult = fkStmt.all() as any[];
            if (fkResult.length > 0) {
                errors.push(`Foreign key violations: ${JSON.stringify(fkResult)}`);
            }

            // Check required tables exist
            const tablesStmt = this.db.prepare(VALIDATION_QUERIES.checkTables);
            const tables = tablesStmt.all() as any[];
            const requiredTables = ['chunk_metadata', 'chunks', 'documents', 'embedding_config', 'embeddings'];
            const existingTables = tables.map(t => t.name).sort();
            
            for (const required of requiredTables) {
                if (!existingTables.includes(required)) {
                    errors.push(`Missing required table: ${required}`);
                }
            }

        } catch (error) {
            errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Optimize database (vacuum and analyze)
     */
    async optimize(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        this.db.exec('VACUUM');
        this.db.exec('ANALYZE');
    }

    /**
     * Get database file path
     */
    getDatabasePath(): string {
        return this.databasePath;
    }

    /**
     * Get folder path this database serves
     */
    getFolderPath(): string {
        return this.config.folderPath;
    }

    /**
     * Create a manual backup of the database
     */
    async createBackup(suffix?: string): Promise<string> {
        return await this.recovery.createBackup(suffix);
    }

    /**
     * Check database for corruption
     */
    async checkCorruption() {
        return await this.recovery.checkCorruption();
    }

    /**
     * Manually trigger database recovery
     */
    async recoverDatabase() {
        const result = await this.recovery.recover();
        
        // If recovery was successful, reinitialize the database
        if (result.success && result.action !== 'none') {
            await this.close();
            await this.initialize();
        }
        
        return result;
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /**
     * Create a backup of the database
     */
    async backup(backupPath: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.backup(backupPath);
    }

    /**
     * Execute a transaction
     */
    transaction<T>(fn: () => T): T {
        if (!this.db) throw new Error('Database not initialized');
        
        const transaction = this.db.transaction(fn);
        return transaction();
    }

    /**
     * Begin an immediate transaction for manual control
     */
    beginTransaction(): void {
        if (!this.db) throw new Error('Database not initialized');
        this.db.exec('BEGIN IMMEDIATE');
    }

    /**
     * Commit the current transaction
     */
    commit(): void {
        if (!this.db) throw new Error('Database not initialized');
        this.db.exec('COMMIT');
    }

    /**
     * Rollback the current transaction
     */
    rollback(): void {
        if (!this.db) throw new Error('Database not initialized');
        this.db.exec('ROLLBACK');
    }
}