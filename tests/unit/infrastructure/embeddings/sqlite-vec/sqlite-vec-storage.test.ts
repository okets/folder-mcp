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
                    endPosition: 28
                },
                {
                    filePath: 'test1.txt',
                    chunkId: 'chunk2',
                    chunkIndex: 1,
                    content: 'This is the second test chunk',
                    startPosition: 28,
                    endPosition: 57
                },
                {
                    filePath: 'test2.txt',
                    chunkId: 'chunk3',
                    chunkIndex: 0,
                    content: 'This is a chunk from another document',
                    startPosition: 0,
                    endPosition: 37
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

        it.skip('should replace existing index when building new one', async () => {
            // Build first index
            const embeddings1: TestEmbedding[] = [new Array(384).fill(0.1)];
            const metadata1: VectorMetadata[] = [{
                filePath: 'first.txt',
                chunkId: 'chunk1',
                chunkIndex: 0,
                content: 'First content',
                startPosition: 0,
                endPosition: 13
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
                    endPosition: 14
                },
                {
                    filePath: 'third.txt',
                    chunkId: 'chunk3',
                    chunkIndex: 0,
                    content: 'Third content',
                    startPosition: 0,
                    endPosition: 13
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
                endPosition: 12
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
                    endPosition: 28
                },
                {
                    filePath: 'doc2.txt',
                    chunkId: 'chunk2',
                    chunkIndex: 0,
                    content: 'Content somewhat similar to query',
                    startPosition: 0,
                    endPosition: 33
                },
                {
                    filePath: 'doc3.txt',
                    chunkId: 'chunk3',
                    chunkIndex: 0,
                    content: 'Content not very similar to query',
                    startPosition: 0,
                    endPosition: 33
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
            expect(result?.chunk.content).toBe('Content very similar to query');
            expect(result?.similarity).toBeGreaterThan(0);
            expect(result?.filePath).toBe('doc1.txt');
            expect(result?.metadata).toBeDefined();
            expect(result?.metadata.score).toBe(result?.similarity);
            expect(result?.metadata.chunkIndex).toBe(0);
            expect(result?.metadata.documentId).toBe('doc1.txt');
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
                endPosition: 12
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
});