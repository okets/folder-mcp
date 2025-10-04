/**
 * Unit tests for SQLite-vec DatabaseManager
 * 
 * Tests database initialization, schema creation, and basic operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager, DatabaseConfig } from '../../../../../src/infrastructure/embeddings/sqlite-vec/database-manager.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, existsSync, mkdirSync } from 'fs';

describe('DatabaseManager', () => {
    let testDir: string;
    let dbManager: DatabaseManager;
    let config: DatabaseConfig;

    beforeEach(() => {
        // Create unique test directory for each test
        testDir = join(tmpdir(), `sqlite-vec-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        mkdirSync(testDir, { recursive: true });

        config = {
            folderPath: testDir,
            modelName: 'test-model',
            modelDimension: 384,
            enableWAL: false, // Disable WAL for easier cleanup in tests
            journalMode: 'DELETE'
        };

        dbManager = new DatabaseManager(config);
    });

    afterEach(async () => {
        // Clean up database connection and files
        if (dbManager) {
            await dbManager.close();
        }
        
        // Remove test directory
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        it('should create DatabaseManager with correct config', () => {
            expect(dbManager).toBeDefined();
            expect(dbManager.getFolderPath()).toBe(testDir);
            expect(dbManager.getDatabasePath()).toBe(join(testDir, '.folder-mcp', 'embeddings.db'));
        });

        it('should apply default config values', () => {
            const defaultConfig: DatabaseConfig = {
                folderPath: testDir,
                modelName: 'test-model',
                modelDimension: 384
            };
            
            const defaultDbManager = new DatabaseManager(defaultConfig);
            expect(defaultDbManager).toBeDefined();
            // Default values should be applied internally
        });
    });

    describe('initialize', () => {
        it('should initialize database successfully', async () => {
            await dbManager.initialize();
            
            expect(dbManager.isReady()).toBe(true);
            expect(existsSync(dbManager.getDatabasePath())).toBe(true);
            expect(existsSync(join(testDir, '.folder-mcp'))).toBe(true);
        });

        it('should create .folder-mcp directory if it does not exist', async () => {
            expect(existsSync(join(testDir, '.folder-mcp'))).toBe(false);
            
            await dbManager.initialize();
            
            expect(existsSync(join(testDir, '.folder-mcp'))).toBe(true);
        });

        it('should create all required tables', async () => {
            await dbManager.initialize();
            
            const db = dbManager.getDatabase();
            const tables = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                ORDER BY name
            `).all() as any[];
            
            const tableNames = tables.map(t => t.name);
            expect(tableNames).toContain('documents');
            expect(tableNames).toContain('chunks');
            expect(tableNames).toContain('document_embeddings'); // Vec0 virtual table
            expect(tableNames).toContain('chunk_embeddings'); // Vec0 virtual table
            expect(tableNames).toContain('embedding_config');
            expect(tableNames).toContain('file_states');
        });

        it('should create embedding_config with correct model info', async () => {
            await dbManager.initialize();
            
            const db = dbManager.getDatabase();
            const config = db.prepare('SELECT * FROM embedding_config WHERE id = 1').get() as any;
            
            expect(config).toBeDefined();
            expect(config.model_name).toBe('test-model');
            expect(config.model_dimension).toBe(384);
        });

        it('should throw error for model mismatch on existing database', async () => {
            // Initialize with first model
            await dbManager.initialize();
            await dbManager.close();

            // Try to initialize with different model
            const newConfig: DatabaseConfig = {
                ...config,
                modelName: 'different-model'
            };
            const newDbManager = new DatabaseManager(newConfig);

            await expect(newDbManager.initialize()).rejects.toThrow(/Model mismatch/);
            await newDbManager.close();
        });

        it('should throw error for dimension mismatch on existing database', async () => {
            // Initialize with first dimension
            await dbManager.initialize();
            await dbManager.close();

            // Try to initialize with different dimension
            const newConfig: DatabaseConfig = {
                ...config,
                modelDimension: 768
            };
            const newDbManager = new DatabaseManager(newConfig);

            await expect(newDbManager.initialize()).rejects.toThrow(/FATAL MODEL DIMENSION MISMATCH/);
            await newDbManager.close();
        });
    });

    describe('getDatabase', () => {
        it('should return database connection after initialization', async () => {
            await dbManager.initialize();
            
            const db = dbManager.getDatabase();
            expect(db).toBeDefined();
            expect(typeof db.exec).toBe('function');
        });

        it('should throw error if not initialized', () => {
            expect(() => dbManager.getDatabase()).toThrow(/Database not initialized/);
        });
    });

    describe('isReady', () => {
        it('should return false before initialization', () => {
            expect(dbManager.isReady()).toBe(false);
        });

        it('should return true after initialization', async () => {
            await dbManager.initialize();
            expect(dbManager.isReady()).toBe(true);
        });

        it('should return false after closing', async () => {
            await dbManager.initialize();
            expect(dbManager.isReady()).toBe(true);
            
            await dbManager.close();
            expect(dbManager.isReady()).toBe(false);
        });
    });

    describe('getStats', () => {
        it('should return correct stats for empty database', async () => {
            await dbManager.initialize();
            
            const stats = await dbManager.getStats();
            
            expect(stats.documentCount).toBe(0);
            expect(stats.chunkCount).toBe(0);
            expect(stats.embeddingCount).toBe(0);
            expect(stats.modelName).toBe('test-model');
            expect(stats.modelDimension).toBe(384);
            expect(stats.databaseSize).toBeGreaterThan(0);
        });

        it('should throw error if not initialized', async () => {
            await expect(dbManager.getStats()).rejects.toThrow(/Database not initialized/);
        });
    });

    describe('validateIntegrity', () => {
        it('should validate successfully for new database', async () => {
            await dbManager.initialize();
            
            const validation = await dbManager.validateIntegrity();
            
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it('should detect missing tables', async () => {
            await dbManager.initialize();
            
            // Manually drop a table to simulate corruption
            const db = dbManager.getDatabase();
            db.exec('DROP TABLE documents');
            
            const validation = await dbManager.validateIntegrity();
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(e => e.includes('Missing required table: documents'))).toBe(true);
        });
    });

    describe('transaction', () => {
        it('should execute transaction successfully', async () => {
            await dbManager.initialize();
            
            const result = dbManager.transaction(() => {
                const db = dbManager.getDatabase();
                db.exec("INSERT INTO documents (file_path, fingerprint, file_size, last_modified) VALUES ('test.txt', 'abc123', 100, '2024-01-01')");
                return 'success';
            });
            
            expect(result).toBe('success');
            
            // Verify data was inserted
            const db = dbManager.getDatabase();
            const doc = db.prepare('SELECT * FROM documents WHERE file_path = ?').get('test.txt');
            expect(doc).toBeDefined();
        });

        it('should rollback on transaction error', async () => {
            await dbManager.initialize();
            
            expect(() => {
                dbManager.transaction(() => {
                    const db = dbManager.getDatabase();
                    db.exec("INSERT INTO documents (file_path, fingerprint, file_size, last_modified) VALUES ('test.txt', 'abc123', 100, '2024-01-01')");
                    throw new Error('Test error');
                });
            }).toThrow('Test error');
            
            // Verify data was not inserted
            const db = dbManager.getDatabase();
            const doc = db.prepare('SELECT * FROM documents WHERE file_path = ?').get('test.txt');
            expect(doc).toBeUndefined();
        });
    });

    describe('optimize', () => {
        it('should optimize database without errors', async () => {
            await dbManager.initialize();
            
            await expect(dbManager.optimize()).resolves.not.toThrow();
        });
    });

    describe('close', () => {
        it('should close database connection', async () => {
            await dbManager.initialize();
            expect(dbManager.isReady()).toBe(true);
            
            await dbManager.close();
            expect(dbManager.isReady()).toBe(false);
        });

        it('should handle multiple close calls gracefully', async () => {
            await dbManager.initialize();
            
            await dbManager.close();
            await expect(dbManager.close()).resolves.not.toThrow();
        });
    });

    describe('paths', () => {
        it('should return correct database path', () => {
            const expectedPath = join(testDir, '.folder-mcp', 'embeddings.db');
            expect(dbManager.getDatabasePath()).toBe(expectedPath);
        });

        it('should return correct folder path', () => {
            expect(dbManager.getFolderPath()).toBe(testDir);
        });
    });
});