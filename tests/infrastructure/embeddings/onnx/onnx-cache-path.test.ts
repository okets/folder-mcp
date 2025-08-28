import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { ONNXDownloader } from '../../../../src/infrastructure/embeddings/onnx/onnx-downloader.js';

describe('ONNX Cache Path Structure', () => {
  const testCacheDir = path.join(process.cwd(), 'tests', 'fixtures', 'tmp', 'onnx-cache-test');
  const testModelId = 'cpu:xenova-multilingual-e5-small';
  
  let downloader: ONNXDownloader;

  beforeAll(async () => {
    // Ensure clean test cache directory
    await fs.rm(testCacheDir, { recursive: true, force: true });
    await fs.mkdir(testCacheDir, { recursive: true });
    
    downloader = new ONNXDownloader({ cacheDirectory: testCacheDir });
  });

  afterAll(async () => {
    // Clean up test cache
    await fs.rm(testCacheDir, { recursive: true, force: true });
  });

  describe('Cache Path Validation', () => {
    it('creates correct cache directory structure for Xenova models', async () => {
      // Manually create the expected cache structure to test isModelAvailable
      const expectedPath = path.join(testCacheDir, 'Xenova', 'multilingual-e5-small', 'onnx');
      await fs.mkdir(expectedPath, { recursive: true });
      
      // Create a dummy model file
      const modelFile = path.join(expectedPath, 'model_quantized.onnx');
      await fs.writeFile(modelFile, 'dummy model content for testing');
      
      // Test that isModelAvailable correctly identifies the cached model
      const isAvailable = await downloader.isModelAvailable(testModelId);
      expect(isAvailable).toBe(true);
      
      console.log('✅ Cache path structure test:', {
        expectedPath,
        modelFile,
        isAvailable
      });
    });

    it('returns false for non-existent models', async () => {
      const isAvailable = await downloader.isModelAvailable('cpu:non-existent-model');
      expect(isAvailable).toBe(false);
    });

    it('handles cache info with correct nested structure', async () => {
      // Create multiple model directories with correct structure
      const models = [
        'Xenova/multilingual-e5-small',
        'Xenova/all-MiniLM-L6-v2'
      ];
      
      for (const modelPath of models) {
        const fullPath = path.join(testCacheDir, modelPath, 'onnx');
        await fs.mkdir(fullPath, { recursive: true });
        const modelFile = path.join(fullPath, 'model_quantized.onnx');
        await fs.writeFile(modelFile, 'x'.repeat(1024 * 1024)); // 1MB dummy file
      }
      
      const cacheInfo = await downloader.getCacheInfo();
      
      expect(cacheInfo.modelCount).toBe(2);
      expect(cacheInfo.totalSize).toBeGreaterThan(2 * 1024 * 1024 * 0.9); // At least 90% of 2MB
      expect(cacheInfo.models).toContain('Xenova/multilingual-e5-small');
      expect(cacheInfo.models).toContain('Xenova/all-MiniLM-L6-v2');
      
      console.log('✅ Cache info test:', {
        modelCount: cacheInfo.modelCount,
        totalSizeMB: Math.round(cacheInfo.totalSize / 1024 / 1024),
        models: cacheInfo.models
      });
    });
  });
});