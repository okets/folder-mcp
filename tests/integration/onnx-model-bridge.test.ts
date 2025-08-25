/**
 * Integration test for ONNX Model Bridge
 * 
 * Tests that ONNX models can be:
 * 1. Downloaded via the unified model system
 * 2. Loaded through the IEmbeddingModel interface
 * 3. Used to generate embeddings
 * 4. Unloaded to free memory
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnifiedModelFactory } from '../../src/daemon/factories/unified-model-factory.js';
import type { IEmbeddingModel, EmbeddingModelConfig } from '../../src/domain/models/embedding-model-interface.js';
import type { TextChunk } from '../../src/types/index.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('ONNX Model Bridge Integration', () => {
  let factory: UnifiedModelFactory;
  let model: IEmbeddingModel | null = null;
  const testCacheDir = path.join(os.tmpdir(), 'folder-mcp-test', 'onnx-bridge-test');
  
  // Mock logger
  const mockLogger = {
    info: (msg: string, ...args: any[]) => console.log('[TEST]', msg, ...args),
    debug: (msg: string, ...args: any[]) => {},
    error: (msg: string, ...args: any[]) => console.error('[TEST ERROR]', msg, ...args),
    warn: (msg: string, ...args: any[]) => console.warn('[TEST WARN]', msg, ...args)
  } as any;

  beforeEach(async () => {
    // Ensure clean cache directory
    await fs.rm(testCacheDir, { recursive: true, force: true });
    await fs.mkdir(testCacheDir, { recursive: true });
    
    factory = new UnifiedModelFactory(mockLogger);
  });

  afterEach(async () => {
    // Clean up model
    if (model) {
      try {
        await model.dispose();
      } catch (error) {
        // Ignore disposal errors in cleanup
      }
      model = null;
    }
    
    // Clean up cache
    await fs.rm(testCacheDir, { recursive: true, force: true });
  });

  it('should create ONNX model through unified factory', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir
    };

    model = await factory.createModel(config);
    
    expect(model).toBeDefined();
    
    const status = await model.getStatus();
    expect(status.modelType).toBe('onnx');
    expect(status.isLoaded).toBe(false);
    expect(status.device).toBe('CPU');
  });

  it('should detect ONNX model type from model ID', () => {
    const modelType = UnifiedModelFactory.getModelTypeFromId('cpu:xenova-multilingual-e5-small');
    expect(modelType).toBe('onnx');
  });

  it('should load ONNX model with progress tracking', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir,
      batchSize: 16
    };

    model = await factory.createModel(config);
    
    const progressEvents: any[] = [];
    
    await model.load((progress) => {
      progressEvents.push(progress);
      console.log(`[PROGRESS] ${progress.stage}: ${progress.message || ''} ${progress.progress !== undefined ? `(${progress.progress}%)` : ''}`);
    });
    
    // Check that we got progress events
    expect(progressEvents.length).toBeGreaterThan(0);
    
    // Check final status
    const finalEvent = progressEvents[progressEvents.length - 1];
    expect(finalEvent.stage).toBe('ready');
    
    // Verify model is loaded
    const status = await model.getStatus();
    expect(status.isLoaded).toBe(true);
    expect(await model.isLoaded()).toBe(true);
  }, 120000); // Allow 2 minutes for download

  it('should generate embeddings for text chunks', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir
    };

    model = await factory.createModel(config);
    await model.load();
    
    const chunks: TextChunk[] = [
      {
        content: 'This is a test sentence for ONNX embeddings.',
        startPosition: 0,
        endPosition: 44,
        tokenCount: 10,
        chunkIndex: 0,
        metadata: {
          sourceFile: 'test-file.txt',
          sourceType: 'txt',
          totalChunks: 2,
          hasOverlap: false
        }
      },
      {
        content: 'Another test to verify batch processing works.',
        startPosition: 45,
        endPosition: 91,
        tokenCount: 9,
        chunkIndex: 1,
        metadata: {
          sourceFile: 'test-file.txt',
          sourceType: 'txt',
          totalChunks: 2,
          hasOverlap: false
        }
      }
    ];
    
    const embeddings = await model.generateEmbeddings(chunks);
    
    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]?.vector).toBeInstanceOf(Array);
    expect(embeddings[0]?.dimensions).toBe(384); // E5-small has 384 dimensions
    expect(embeddings[0]?.model).toContain('e5-small');
    expect(embeddings[0]?.createdAt).toBeDefined();
  }, 120000);

  it('should generate single embedding', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir
    };

    model = await factory.createModel(config);
    await model.load();
    
    const text = 'Single text for embedding generation';
    const embedding = await model.generateSingleEmbedding(text);
    
    expect(embedding.vector).toBeInstanceOf(Array);
    expect(embedding.vector.length).toBe(384);
    expect(embedding.dimensions).toBe(384);
    expect(embedding.model).toContain('e5-small');
  }, 120000);

  it('should process batch with progress', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir,
      batchSize: 2
    };

    model = await factory.createModel(config);
    await model.load();
    
    const chunks: TextChunk[] = Array.from({ length: 5 }, (_, i) => ({
      content: `Test chunk number ${i + 1}`,
      startPosition: i * 20,
      endPosition: (i + 1) * 20,
      tokenCount: 5,
      chunkIndex: i,
      metadata: {
        sourceFile: 'test-batch.txt',
        sourceType: 'txt',
        totalChunks: 5,
        hasOverlap: false
      }
    }));
    
    const results = await model.processBatch(chunks, 2);
    
    expect(results).toHaveLength(5);
    results.forEach((result, i) => {
      expect(result.chunk).toEqual(chunks[i]);
      expect(result.embedding?.vector).toBeInstanceOf(Array);
      expect(result.success).toBe(true);
    });
  }, 120000);

  it('should calculate similarity between vectors', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir
    };

    model = await factory.createModel(config);
    await model.load();
    
    // Generate embeddings for similar texts
    const text1 = 'The cat sits on the mat';
    const text2 = 'A cat is sitting on a mat';
    const text3 = 'The weather is sunny today';
    
    const embedding1 = await model.generateSingleEmbedding(text1);
    const embedding2 = await model.generateSingleEmbedding(text2);
    const embedding3 = await model.generateSingleEmbedding(text3);
    
    // Similar texts should have higher similarity
    const similarity12 = model.calculateSimilarity(embedding1, embedding2);
    const similarity13 = model.calculateSimilarity(embedding1, embedding3);
    
    expect(similarity12).toBeGreaterThan(0.7); // Similar sentences
    expect(similarity13).toBeLessThan(0.9); // Different topics (updated threshold)
    expect(similarity12).toBeGreaterThan(similarity13);
  }, 120000);

  it('should unload model and free resources', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir
    };

    model = await factory.createModel(config);
    await model.load();
    
    expect(await model.isLoaded()).toBe(true);
    
    await model.unload();
    
    expect(await model.isLoaded()).toBe(false);
    
    // Should throw error when trying to generate embeddings
    await expect(model.generateSingleEmbedding('test')).rejects.toThrow('Model not loaded');
  }, 120000);

  it('should handle immediate/priority requests', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir
    };

    model = await factory.createModel(config);
    await model.load();
    
    // Test immediate flag (for semantic search priority)
    const embedding = await model.generateSingleEmbedding('priority search query', true);
    
    expect(embedding).toBeDefined();
    expect(embedding.vector).toBeInstanceOf(Array);
    
    // Test batch with immediate flag
    const chunks: TextChunk[] = [{
      content: 'Priority batch processing',
      startPosition: 0,
      endPosition: 24,
      tokenCount: 3,
      chunkIndex: 0,
      metadata: {
        sourceFile: 'priority-test.txt',
        sourceType: 'txt',
        totalChunks: 1,
        hasOverlap: false
      }
    }];
    
    const results = await model.processBatch(chunks, 1, true);
    expect(results).toHaveLength(1);
  }, 120000);

  it('should estimate processing time', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir
    };

    model = await factory.createModel(config);
    
    // Should estimate time even without loading
    const estimatedTime = model.estimateProcessingTime(100);
    
    expect(estimatedTime).toBeGreaterThan(0);
    expect(estimatedTime).toBeLessThan(10000); // Less than 10 seconds for 100 chunks
  });

  it('should cache model instances in factory', async () => {
    const config: EmbeddingModelConfig = {
      modelId: 'cpu:xenova-multilingual-e5-small',
      modelType: 'onnx',
      cacheDirectory: testCacheDir
    };

    const model1 = await factory.createModel(config);
    const model2 = await factory.createModel(config);
    
    // Should return the same instance
    expect(model1).toBe(model2);
    
    // Clean up
    model = model1; // Will be disposed in afterEach
  });
});