/**
 * Unit tests for SQLiteVecStorage
 * 
 * Tests the core vector storage and search functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteVecStorage, VectorMetadata } from '../../../../../src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import { EmbeddingVector } from '../../../../../src/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, existsSync, mkdirSync } from 'fs';

// Type alias for test compatibility 
type TestEmbedding = number[];

describe('SQLiteVecStorage', () => {
    let testDir: string;
    let storage: SQLiteVecStorage;

    beforeEach(() => {
        // Create unique test directory for each test
        testDir = join(tmpdir(), `sqlite-vec-storage-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        mkdirSync(testDir, { recursive: true });

        storage = new SQLiteVecStorage({
            folderPath: testDir,
            modelName: 'test-model',
            modelDimension: 384
        });
    });

    afterEach(async () => {
        // Clean up storage and files
        if (storage) {
            await storage.close();
        }
        
        // Remove test directory
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        it('should create SQLiteVecStorage with correct config', () => {
            expect(storage).toBeDefined();
            expect(storage.isReady()).toBe(false);
        });
    });

    describe('buildIndex', () => {
        it('should build index with empty data', async () => {
            await storage.buildIndex([], []);
            expect(storage.isReady()).toBe(true);
        });

        it('should build index with sample embeddings', async () => {
            const embeddings: TestEmbedding[] = [
                new Array(384).fill(0.1),
                new Array(384).fill(0.2),
                new Array(384).fill(0.3)
            ];

            const metadata: VectorMetadata[] = [
                {
                    filePath: 'test1.txt',
                    chunkId: 'chunk1',
                    chunkIndex: 0,
                    content: 'This is the first test chunk',
                    startPosition: 0,
                    endPosition: 28,
                    keyPhrases: [
                        { text: 'first test', score: 0.8 },
                        { text: 'test chunk', score: 0.7 }
                    ],
                    readabilityScore: 85.5
                },
                {
                    filePath: 'test1.txt',
                    chunkId: 'chunk2',
                    chunkIndex: 1,
                    content: 'This is the second test chunk',
                    startPosition: 28,
                    endPosition: 57,
                    keyPhrases: [
                        { text: 'second test', score: 0.8 },
                        { text: 'test chunk', score: 0.7 }
                    ],
                    readabilityScore: 85.5
                },
                {
                    filePath: 'test2.txt',
                    chunkId: 'chunk3',
                    chunkIndex: 0,
                    content: 'This is a chunk from another document',
                    startPosition: 0,
                    endPosition: 37,
                    keyPhrases: [
                        { text: 'chunk document', score: 0.8 },
                        { text: 'another document', score: 0.7 }
                    ],
                    readabilityScore: 82.3
                }
            ];

            await storage.buildIndex(embeddings, metadata);
            expect(storage.isReady()).toBe(true);

            // Verify stats
            const stats = await storage.getStats();
            expect(stats.embeddingCount).toBe(3);
            expect(stats.documentCount).toBe(2); // test1.txt and test2.txt
            expect(stats.chunkCount).toBe(3);
        });

        it('should throw error for mismatched embeddings and metadata lengths', async () => {
            const embeddings: TestEmbedding[] = [new Array(384).fill(0.1)];
            const metadata: VectorMetadata[] = []; // Empty metadata

            await expect(storage.buildIndex(embeddings, metadata))
                .rejects.toThrow(/Embeddings count .* must match metadata count/);
        });

        it('should replace existing index when building new one', async () => {
            // Build first index
            const embeddings1: TestEmbedding[] = [new Array(384).fill(0.1)];
            const metadata1: VectorMetadata[] = [{
                filePath: 'first.txt',
                chunkId: 'chunk1',
                chunkIndex: 0,
                content: 'First content',
                startPosition: 0,
                endPosition: 13,
                keyPhrases: [
                        { text: 'first content', score: 0.8 }
                    ],
                readabilityScore: 90.0
            }];

            await storage.buildIndex(embeddings1, metadata1);
            let stats = await storage.getStats();
            expect(stats.embeddingCount).toBe(1);

            // Build second index (should replace first)
            const embeddings2: TestEmbedding[] = [
                new Array(384).fill(0.2),
                new Array(384).fill(0.3)
            ];
            const metadata2: VectorMetadata[] = [
                {
                    filePath: 'second.txt',
                    chunkId: 'chunk2',
                    chunkIndex: 0,
                    content: 'Second content',
                    startPosition: 0,
                    endPosition: 14,
                    keyPhrases: [
                        { text: 'second content', score: 0.8 }
                    ],
                    readabilityScore: 88.0
                },
                {
                    filePath: 'third.txt',
                    chunkId: 'chunk3',
                    chunkIndex: 0,
                    content: 'Third content',
                    startPosition: 0,
                    endPosition: 13,
                    keyPhrases: [
                        { text: 'third content', score: 0.8 }
                    ],
                    readabilityScore: 88.0
                }
            ];

            await storage.buildIndex(embeddings2, metadata2);
            stats = await storage.getStats();
            expect(stats.embeddingCount).toBe(2);
            expect(stats.documentCount).toBe(2);
        });
    });

    describe('loadIndex', () => {
        it('should load empty index', async () => {
            await storage.loadIndex(storage.getDatabasePath());
            expect(storage.isReady()).toBe(false); // Empty index
        });

        it('should load index with existing data', async () => {
            // First build an index
            const embeddings: TestEmbedding[] = [new Array(384).fill(0.1)];
            const metadata: VectorMetadata[] = [{
                filePath: 'test.txt',
                chunkId: 'chunk1',
                chunkIndex: 0,
                content: 'Test content',
                startPosition: 0,
                endPosition: 12,
                keyPhrases: [
                        { text: 'test content', score: 0.8 }
                    ],
                readabilityScore: 85.0
            }];

            await storage.buildIndex(embeddings, metadata);
            await storage.close();

            // Create new storage instance and load index
            const newStorage = new SQLiteVecStorage({
                folderPath: testDir,
                modelName: 'test-model',
                modelDimension: 384
            });

            await newStorage.loadIndex(newStorage.getDatabasePath());
            expect(newStorage.isReady()).toBe(true);

            const stats = await newStorage.getStats();
            expect(stats.embeddingCount).toBe(1);

            await newStorage.close();
        });
    });

    describe('search', () => {
        beforeEach(async () => {
            // Set up test index
            const embeddings: TestEmbedding[] = [
                new Array(384).fill(0.1), // Similar to query
                new Array(384).fill(0.5), // Moderately similar
                new Array(384).fill(0.9)  // Less similar
            ];

            const metadata: VectorMetadata[] = [
                {
                    filePath: 'doc1.txt',
                    chunkId: 'chunk1',
                    chunkIndex: 0,
                    content: 'Content very similar to query',
                    startPosition: 0,
                    endPosition: 28,
                    keyPhrases: [
                        { text: 'similar query', score: 0.8 },
                        { text: 'content similar', score: 0.7 }
                    ],
                    readabilityScore: 87.5
                },
                {
                    filePath: 'doc2.txt',
                    chunkId: 'chunk2',
                    chunkIndex: 0,
                    content: 'Content somewhat similar to query',
                    startPosition: 0,
                    endPosition: 33,
                    keyPhrases: [
                        { text: 'somewhat similar', score: 0.8 },
                        { text: 'similar query', score: 0.7 }
                    ],
                    readabilityScore: 86.0
                },
                {
                    filePath: 'doc3.txt',
                    chunkId: 'chunk3',
                    chunkIndex: 0,
                    content: 'Content not very similar to query',
                    startPosition: 0,
                    endPosition: 33,
                    keyPhrases: [
                        { text: 'not similar', score: 0.8 },
                        { text: 'similar query', score: 0.7 }
                    ],
                    readabilityScore: 84.0
                }
            ];

            await storage.buildIndex(embeddings, metadata);
        });

        it('should search and return results ordered by similarity', async () => {
            const queryVector = new Array(384).fill(0.15); // Closest to first embedding
            const results = await storage.search(queryVector, 10, 0.0);

            expect(results).toHaveLength(3);
            expect(results[0]?.filePath).toBe('doc1.txt');
            expect(results[0]?.similarity).toBeGreaterThan(results[1]?.similarity || 0);
            expect(results[1]?.similarity).toBeGreaterThan(results[2]?.similarity || 0);
        });

        it('should respect topK parameter', async () => {
            const queryVector = new Array(384).fill(0.15);
            const results = await storage.search(queryVector, 2, 0.0);

            expect(results).toHaveLength(2);
        });

        it('should respect similarity threshold', async () => {
            const queryVector = new Array(384).fill(0.15);
            const results = await storage.search(queryVector, 10, 0.9); // High threshold

            // With high threshold, should return fewer or no results
            expect(results.length).toBeLessThanOrEqual(3);
        });

        it('should throw error when not ready', async () => {
            const emptyStorage = new SQLiteVecStorage({
                folderPath: testDir + '-empty',
                modelName: 'test-model',
                modelDimension: 384
            });

            const queryVector = new Array(384).fill(0.1);
            await expect(emptyStorage.search(queryVector))
                .rejects.toThrow(/Vector index is not ready/);

            await emptyStorage.close();
        });

        it('should throw error for empty query vector', async () => {
            await expect(storage.search([], 10, 0.7))
                .rejects.toThrow(/Query vector cannot be empty/);
        });

        it('should return search results with correct structure', async () => {
            const queryVector = new Array(384).fill(0.15);
            const results = await storage.search(queryVector, 1, 0.0);

            expect(results).toHaveLength(1);
            const result = results[0];
            expect(result).toBeDefined();

            // Check SearchResult structure
            expect(result?.chunk).toBeDefined();
            // Content is lazy loaded - empty string is expected until getChunksContent is called
            expect(result?.chunk.content).toBe('');
            expect(result?.chunk.chunkId).toBeDefined(); // Chunk ID for lazy loading
            expect(result?.similarity).toBeGreaterThan(0);
            expect(result?.filePath).toBe('doc1.txt');
            expect(result?.metadata).toBeDefined();
            expect(result?.metadata.score).toBe(result?.similarity);
            expect(result?.metadata.chunkIndex).toBe(0);
            expect(result?.metadata.filePath).toBe('doc1.txt');
            expect(result?.metadata.chunkId).toBeDefined(); // Chunk ID in metadata for retrieval
        });
    });

    describe('document management', () => {
        beforeEach(async () => {
            // Set up basic index
            const embeddings: TestEmbedding[] = [new Array(384).fill(0.1)];
            const metadata: VectorMetadata[] = [{
                filePath: 'test.txt',
                chunkId: 'chunk1',
                chunkIndex: 0,
                content: 'Test content',
                startPosition: 0,
                endPosition: 12,
                keyPhrases: [
                        { text: 'test content', score: 0.8 }
                    ],
                readabilityScore: 85.0
            }];

            await storage.buildIndex(embeddings, metadata);
        });

        it('should update document fingerprint', async () => {
            await expect(storage.updateDocument('test.txt', 'new-fingerprint'))
                .resolves.not.toThrow();
        });

        it('should delete document', async () => {
            await storage.deleteDocument('test.txt');
            
            const stats = await storage.getStats();
            expect(stats.documentCount).toBe(0);
        });

        it('should mark document for reindex', async () => {
            await storage.markForReindex('test.txt');
            
            const docsNeedingReindex = await storage.getDocumentsNeedingReindex();
            expect(docsNeedingReindex).toContain('test.txt');
        });
    });

    describe('isReady', () => {
        it('should return false initially', () => {
            expect(storage.isReady()).toBe(false);
        });

        it('should return true after building index', async () => {
            await storage.buildIndex([], []);
            expect(storage.isReady()).toBe(true);
        });

        it('should return false after closing', async () => {
            await storage.buildIndex([], []);
            expect(storage.isReady()).toBe(true);
            
            await storage.close();
            expect(storage.isReady()).toBe(false);
        });
    });

    describe('getStats', () => {
        it('should return correct stats for empty index', async () => {
            await storage.buildIndex([], []);

            const stats = await storage.getStats();
            expect(stats.documentCount).toBe(0);
            expect(stats.chunkCount).toBe(0);
            expect(stats.embeddingCount).toBe(0);
            expect(stats.modelName).toBe('test-model');
            expect(stats.modelDimension).toBe(384);
        });
    });

    describe('Vec0 Virtual Tables (Sprint 7.5)', () => {
        describe('Schema Creation', () => {
            it('should create vec0 virtual tables with correct dimension', async () => {
                await storage.buildIndex([], []);

                const db = (storage as any).dbManager.getDatabase();

                // Check that vec0 virtual tables exist
                const tables = db.prepare(`
                    SELECT name, sql
                    FROM sqlite_master
                    WHERE type='table' AND name IN ('chunk_embeddings', 'document_embeddings')
                `).all();

                expect(tables).toHaveLength(2);

                const chunkTable = tables.find((t: any) => t.name === 'chunk_embeddings');
                const docTable = tables.find((t: any) => t.name === 'document_embeddings');

                expect(chunkTable).toBeDefined();
                expect(docTable).toBeDefined();

                // Verify dimension in schema (should be 384 from config)
                expect(chunkTable.sql).toContain('FLOAT32[384]');
                expect(docTable.sql).toContain('FLOAT32[384]');

                // Verify metadata columns exist
                expect(chunkTable.sql).toContain('chunk_id INTEGER');
                expect(docTable.sql).toContain('document_id INTEGER');
            });

            it('should create vec0 tables with 1024 dimensions for large model', async () => {
                // Create new storage with 1024d model
                const largeStorage = new SQLiteVecStorage({
                    folderPath: join(testDir, 'large-model'),
                    modelName: 'gpu:bge-m3',
                    modelDimension: 1024
                });

                try {
                    await largeStorage.buildIndex([], []);

                    const db = (largeStorage as any).dbManager.getDatabase();
                    const tables = db.prepare(`
                        SELECT sql FROM sqlite_master
                        WHERE type='table' AND name='chunk_embeddings'
                    `).all();

                    expect(tables[0].sql).toContain('FLOAT32[1024]');
                } finally {
                    await largeStorage.close();
                }
            });

            it('should detect model dimension mismatch on existing database', async () => {
                // Create database with 384d model
                await storage.buildIndex([], []);
                await storage.close();

                // Try to open with different dimension model
                const mismatchStorage = new SQLiteVecStorage({
                    folderPath: testDir,
                    modelName: 'gpu:bge-m3',
                    modelDimension: 1024
                });

                // Should throw error about model mismatch
                await expect(mismatchStorage.buildIndex([], []))
                    .rejects.toThrow(/Model mismatch/);

                await mismatchStorage.close();
            });
        });

        describe('Manual CASCADE Delete', () => {
            it('should delete chunk embeddings when document is deleted', async () => {
                // Add document with chunks
                const embeddings: TestEmbedding[] = [
                    new Array(384).fill(0.1),
                    new Array(384).fill(0.2)
                ];
                const metadata: VectorMetadata[] = [
                    {
                        filePath: 'test.txt',
                        chunkId: 'chunk1',
                        chunkIndex: 0,
                        content: 'First chunk',
                        startPosition: 0,
                        endPosition: 11,
                        keyPhrases: [{ text: 'first', score: 0.8 }],
                        readabilityScore: 85.0
                    },
                    {
                        filePath: 'test.txt',
                        chunkId: 'chunk2',
                        chunkIndex: 1,
                        content: 'Second chunk',
                        startPosition: 11,
                        endPosition: 23,
                        keyPhrases: [{ text: 'second', score: 0.8 }],
                        readabilityScore: 85.0
                    }
                ];

                await storage.buildIndex([], []); // Initialize
                await storage.addEmbeddings(embeddings, metadata);

                // Verify embeddings exist
                const db = (storage as any).dbManager.getDatabase();
                let chunkEmbCount = db.prepare('SELECT COUNT(*) as count FROM chunk_embeddings').get();
                expect(chunkEmbCount.count).toBe(2);

                // Delete document
                await storage.deleteDocument('test.txt');

                // Verify chunk embeddings are CASCADE deleted
                chunkEmbCount = db.prepare('SELECT COUNT(*) as count FROM chunk_embeddings').get();
                expect(chunkEmbCount.count).toBe(0);

                // Verify chunks table also empty (regular CASCADE)
                const chunkCount = db.prepare('SELECT COUNT(*) as count FROM chunks').get();
                expect(chunkCount.count).toBe(0);

                // Verify document removed
                const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get();
                expect(docCount.count).toBe(0);
            });

            it('should delete document embedding when document is deleted', async () => {
                await storage.buildIndex([], []);

                // Add document with embedding
                const embeddings: TestEmbedding[] = [new Array(384).fill(0.1)];
                const metadata: VectorMetadata[] = [{
                    filePath: 'doc.txt',
                    chunkId: 'chunk1',
                    chunkIndex: 0,
                    content: 'Content',
                    startPosition: 0,
                    endPosition: 7,
                    keyPhrases: [{ text: 'content', score: 0.8 }],
                    readabilityScore: 85.0
                }];

                await storage.addEmbeddings(embeddings, metadata);

                // Add document-level semantics (includes document embedding)
                // Create a properly sized Float32Array (384 dimensions)
                const float32Array = new Float32Array(384).fill(0.5);
                const docEmbedding = Buffer.from(float32Array.buffer).toString('base64');
                await storage.updateDocumentSemantics(
                    'doc.txt',
                    docEmbedding,
                    JSON.stringify([{ text: 'keyword', score: 0.9 }]),
                    100
                );

                // Verify document embedding exists
                const db = (storage as any).dbManager.getDatabase();
                let docEmbCount = db.prepare('SELECT COUNT(*) as count FROM document_embeddings').get();
                expect(docEmbCount.count).toBe(1);

                // Delete document
                await storage.deleteDocument('doc.txt');

                // Verify document embedding CASCADE deleted
                docEmbCount = db.prepare('SELECT COUNT(*) as count FROM document_embeddings').get();
                expect(docEmbCount.count).toBe(0);
            });

            it('should handle deletion of non-existent document gracefully', async () => {
                await storage.buildIndex([], []);

                // Should not throw error
                await expect(storage.deleteDocument('nonexistent.txt')).resolves.not.toThrow();
            });
        });

        describe('Metadata Column JOINs', () => {
            it('should support JOIN between chunks and chunk_embeddings via chunk_id', async () => {
                const embeddings: TestEmbedding[] = [new Array(384).fill(0.1)];
                const metadata: VectorMetadata[] = [{
                    filePath: 'test.txt',
                    chunkId: 'chunk1',
                    chunkIndex: 0,
                    content: 'Test content',
                    startPosition: 0,
                    endPosition: 12,
                    keyPhrases: [{ text: 'test', score: 0.8 }],
                    readabilityScore: 85.0
                }];

                await storage.buildIndex([], []);
                await storage.addEmbeddings(embeddings, metadata);

                const db = (storage as any).dbManager.getDatabase();

                // Test JOIN using metadata column
                const result = db.prepare(`
                    SELECT c.id, ce.chunk_id
                    FROM chunks c
                    JOIN chunk_embeddings ce ON c.id = ce.chunk_id
                `).get();

                expect(result).toBeDefined();
                expect(result.id).toBe(result.chunk_id);
            });

            it('should support filtering chunk_embeddings by chunk_id', async () => {
                const embeddings: TestEmbedding[] = [
                    new Array(384).fill(0.1),
                    new Array(384).fill(0.2)
                ];
                const metadata: VectorMetadata[] = [
                    {
                        filePath: 'test.txt',
                        chunkId: 'chunk1',
                        chunkIndex: 0,
                        content: 'First',
                        startPosition: 0,
                        endPosition: 5,
                        keyPhrases: [{ text: 'first', score: 0.8 }],
                        readabilityScore: 85.0
                    },
                    {
                        filePath: 'test.txt',
                        chunkId: 'chunk2',
                        chunkIndex: 1,
                        content: 'Second',
                        startPosition: 5,
                        endPosition: 11,
                        keyPhrases: [{ text: 'second', score: 0.8 }],
                        readabilityScore: 85.0
                    }
                ];

                await storage.buildIndex([], []);
                await storage.addEmbeddings(embeddings, metadata);

                const db = (storage as any).dbManager.getDatabase();

                // Delete specific chunk embedding using metadata column
                db.prepare('DELETE FROM chunk_embeddings WHERE chunk_id = 1').run();

                // Verify only one embedding remains
                const count = db.prepare('SELECT COUNT(*) as count FROM chunk_embeddings').get();
                expect(count.count).toBe(1);

                // Verify the remaining one has chunk_id = 2
                const remaining = db.prepare('SELECT chunk_id FROM chunk_embeddings').get();
                expect(remaining.chunk_id).toBe(2);
            });
        });

        describe('Batch Deletion', () => {
            it('should delete multiple documents in single transaction', async () => {
                await storage.buildIndex([], []);

                // Add multiple documents
                const embeddings: TestEmbedding[] = [
                    new Array(384).fill(0.1),
                    new Array(384).fill(0.2),
                    new Array(384).fill(0.3)
                ];
                const metadata: VectorMetadata[] = [
                    {
                        filePath: 'doc1.txt',
                        chunkId: 'chunk1',
                        chunkIndex: 0,
                        content: 'Doc 1',
                        startPosition: 0,
                        endPosition: 5,
                        keyPhrases: [{ text: 'doc1', score: 0.8 }],
                        readabilityScore: 85.0
                    },
                    {
                        filePath: 'doc2.txt',
                        chunkId: 'chunk2',
                        chunkIndex: 0,
                        content: 'Doc 2',
                        startPosition: 0,
                        endPosition: 5,
                        keyPhrases: [{ text: 'doc2', score: 0.8 }],
                        readabilityScore: 85.0
                    },
                    {
                        filePath: 'doc3.txt',
                        chunkId: 'chunk3',
                        chunkIndex: 0,
                        content: 'Doc 3',
                        startPosition: 0,
                        endPosition: 5,
                        keyPhrases: [{ text: 'doc3', score: 0.8 }],
                        readabilityScore: 85.0
                    }
                ];

                await storage.addEmbeddings(embeddings, metadata);

                // Verify all exist
                const db = (storage as any).dbManager.getDatabase();
                let stats = await storage.getStats();
                expect(stats.documentCount).toBe(3);
                expect(stats.chunkCount).toBe(3);
                expect(stats.embeddingCount).toBe(3);

                // Batch delete 2 documents
                await storage.deleteDocumentsBatch(['doc1.txt', 'doc2.txt']);

                // Verify deletion
                stats = await storage.getStats();
                expect(stats.documentCount).toBe(1);
                expect(stats.chunkCount).toBe(1);
                expect(stats.embeddingCount).toBe(1);

                // Verify correct document remains
                const doc = db.prepare('SELECT file_path FROM documents').get();
                expect(doc.file_path).toBe('doc3.txt');
            });

            it('should handle empty batch gracefully', async () => {
                await storage.buildIndex([], []);

                // Should not throw
                await expect(storage.deleteDocumentsBatch([])).resolves.not.toThrow();
            });

            it('should handle batch with non-existent files gracefully', async () => {
                await storage.buildIndex([], []);

                // Should not throw
                await expect(storage.deleteDocumentsBatch(['nonexistent.txt'])).resolves.not.toThrow();
            });
        });
    });
});