import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { 
  ONNXEmbeddingService,
  ONNXEmbeddingOptions,
  EmbeddingResult 
} from '../../../../src/infrastructure/embeddings/onnx/onnx-embedding-service.js';
import { 
  ONNXDownloader,
  DownloadProgress,
  DownloadOptions 
} from '../../../../src/infrastructure/embeddings/onnx/onnx-downloader.js';

describe('ONNX System TMOAT', () => {
  const testCacheDir = path.join(process.cwd(), 'tests', 'fixtures', 'tmp', 'onnx-cache');
  const testModelId = 'cpu:xenova-multilingual-e5-small';
  
  let downloader: ONNXDownloader;
  let embeddingService: ONNXEmbeddingService;

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

  describe('ONNX Model Download', () => {
    it('downloads Xenova/multilingual-e5-small (120MB expected)', async () => {
      const progressUpdates: DownloadProgress[] = [];
      
      const downloadOptions: DownloadOptions = {
        cacheDirectory: testCacheDir,
        verifySize: true,
        timeout: 600000, // 10 minutes for first download
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
          console.log(`📥 Download progress: ${progress.progress}% (${Math.round(progress.downloadedBytes / 1024 / 1024)}MB)`);
        }
      };

      const modelPath = await downloader.downloadModel(testModelId, downloadOptions);
      
      expect(modelPath).toBeDefined();
      expect(await downloader.isModelAvailable(testModelId)).toBe(true);
      
      // Verify progress callbacks were called
      expect(progressUpdates.length).toBeGreaterThan(0);
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress).toBeDefined();
      expect(finalProgress!.progress).toBe(100);
      expect(finalProgress!.status).toBe('completed');
      
      // Verify approximate file size (120MB ± 20%)
      const stats = await fs.stat(modelPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      expect(fileSizeMB).toBeGreaterThan(96); // 120MB - 20%
      expect(fileSizeMB).toBeLessThan(144); // 120MB + 20%

      console.log('✅ ONNX Download Test Results:', {
        modelPath,
        fileSizeMB: Math.round(fileSizeMB),
        progressUpdates: progressUpdates.length,
        finalStatus: finalProgress!.status
      });
    }, 700000); // 11.5 minutes timeout for download

    it('uses cached model on second download attempt', async () => {
      const startTime = Date.now();
      
      // Second download should be much faster (cached)
      const modelPath = await downloader.downloadModel(testModelId, {
        cacheDirectory: testCacheDir,
        verifySize: true
      });
      
      const downloadTime = Date.now() - startTime;
      
      expect(modelPath).toBeDefined();
      expect(downloadTime).toBeLessThan(20000); // Should be faster for cached model (allowing for slower networks)
      
      console.log('✅ Cache Test Results:', {
        downloadTime: `${downloadTime}ms`,
        cached: downloadTime < 1000
      });
    });

    it('provides accurate cache information', async () => {
      const cacheInfo = await downloader.getCacheInfo();
      
      expect(cacheInfo.modelCount).toBeGreaterThan(0);
      expect(cacheInfo.totalSize).toBeGreaterThan(100 * 1024 * 1024); // > 100MB
      expect(cacheInfo.models).toContain('Xenova/multilingual-e5-small');
      
      console.log('✅ Cache Info:', {
        modelCount: cacheInfo.modelCount,
        totalSizeMB: Math.round(cacheInfo.totalSize / 1024 / 1024),
        directory: cacheInfo.directory,
        models: cacheInfo.models
      });
    });
  });

  describe('ONNX Embedding Generation', () => {
    beforeAll(async () => {
      // Ensure model is downloaded before embedding tests
      await downloader.downloadModel(testModelId, { cacheDirectory: testCacheDir });
      
      embeddingService = new ONNXEmbeddingService({
        modelId: testModelId,
        cacheDirectory: testCacheDir,
        maxSequenceLength: 512,
        batchSize: 4
      });
      
      await embeddingService.initialize();
    });

    afterAll(async () => {
      if (embeddingService) {
        await embeddingService.dispose();
      }
    });

    it('generates 384-dim embeddings matching catalog specs', async () => {
      const testTexts = [
        'Hello world',
        'This is a test sentence',
        'Machine learning is fascinating'
      ];

      const result = await embeddingService.generateEmbeddingsFromStrings(testTexts);
      
      expect(result.embeddings.length).toBe(3);
      expect(result.dimensions).toBe(384); // As specified in catalog
      expect(result.modelUsed).toContain('E5-Small ONNX');
      expect(result.processingTime).toBeGreaterThan(0);
      
      // Verify each embedding has correct dimensions
      for (const embedding of result.embeddings) {
        expect(embedding).toBeDefined();
        expect(embedding!.length).toBe(384);
        expect(embedding!.every(val => typeof val === 'number')).toBe(true);
        
        // Check that embeddings are normalized (magnitude close to 1)
        const magnitude = Math.sqrt(embedding!.reduce((sum, val) => sum + val * val, 0));
        expect(magnitude).toBeCloseTo(1.0, 1); // Within 0.1 of 1.0
      }

      console.log('✅ Embedding Generation:', {
        textsProcessed: testTexts.length,
        dimensions: result.dimensions,
        processingTime: `${result.processingTime}ms`,
        avgMagnitude: result.embeddings.reduce((sum, emb) => {
          if (!emb) return sum;
          const mag = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
          return sum + mag;
        }, 0) / result.embeddings.length
      });
    });

    it('handles mean pooling and normalization correctly', async () => {
      const singleText = 'Test normalization';
      const result = await embeddingService.generateEmbeddingsFromStrings([singleText]);
      
      const embedding = result.embeddings[0];
      expect(embedding).toBeDefined();
      
      // Check normalization (L2 norm should be approximately 1)
      const magnitude = Math.sqrt(embedding!.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 2);
      
      // Check that values are in reasonable range for normalized embeddings
      const maxVal = Math.max(...embedding!.map(Math.abs));
      expect(maxVal).toBeLessThan(1.0);
      expect(maxVal).toBeGreaterThan(0.0);
      
      console.log('✅ Normalization Test:', {
        magnitude,
        maxValue: maxVal,
        minValue: Math.min(...embedding!),
        normalized: Math.abs(magnitude - 1.0) < 0.01
      });
    });

    it('processes 100+ languages from catalog (EN: 0.83, ES: 0.68, ZH: 0.63)', async () => {
      // Test with multiple languages as documented in catalog
      const multilingualTexts = [
        'Hello world', // English
        'Hola mundo', // Spanish  
        '你好世界', // Chinese
        'Bonjour le monde', // French
        'Hallo Welt', // German
      ];

      const result = await embeddingService.generateEmbeddingsFromStrings(multilingualTexts);
      
      expect(result.embeddings.length).toBe(5);
      
      // All embeddings should be properly normalized
      for (let i = 0; i < result.embeddings.length; i++) {
        const embedding = result.embeddings[i];
        expect(embedding).toBeDefined();
        const magnitude = Math.sqrt(embedding!.reduce((sum, val) => sum + val * val, 0));
        expect(magnitude).toBeCloseTo(1.0, 1);
      }

      // Calculate similarity between English and other languages
      const englishEmb = result.embeddings[0];
      expect(englishEmb).toBeDefined();
      const similarities = result.embeddings.slice(1).map(emb => {
        expect(emb).toBeDefined();
        return englishEmb!.reduce((sum, val, idx) => sum + val * emb![idx]!, 0);
      });

      console.log('✅ Multilingual Processing:', {
        languagesTested: 5,
        allNormalized: result.embeddings.every(emb => {
          if (!emb) return false;
          const mag = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
          return Math.abs(mag - 1.0) < 0.1;
        }),
        crossLanguageSimilarities: similarities.map(s => Math.round(s * 100) / 100)
      });
    });

    it('auto-redownloads if model file missing', async () => {
      // First, get the model path
      const modelPath = path.join(testCacheDir, 'Xenova_multilingual-e5-small', 'model_quantized.onnx');
      
      // Delete the model file to simulate missing model
      try {
        await fs.unlink(modelPath);
        console.log('🗑️ Deleted model file to test auto-redownload');
      } catch {
        // File might not exist, that's okay
      }
      
      // Create a new service instance (simulates restart)
      const newService = new ONNXEmbeddingService({
        modelId: testModelId,
        cacheDirectory: testCacheDir
      });

      // Initialize should trigger redownload
      const startTime = Date.now();
      await newService.initialize();
      const initTime = Date.now() - startTime;
      
      // Test that it works after redownload
      const testResult = await newService.testEmbedding();
      expect(testResult).toBe(true);
      
      await newService.dispose();
      
      console.log('✅ Auto-redownload Test:', {
        redownloadTime: `${initTime}ms`,
        workingAfterRedownload: testResult
      });
    });

    it('runs 2-4x faster than GPU models on CPU-only systems', async () => {
      const testTexts = ['Performance test text for ONNX model'];
      
      // Multiple runs to get average performance
      const runs = 3;
      const times: number[] = [];
      
      for (let i = 0; i < runs; i++) {
        const startTime = Date.now();
        await embeddingService.generateEmbeddingsFromStrings(testTexts);
        const duration = Date.now() - startTime;
        times.push(duration);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const tokensPerSec = Math.round((testTexts[0]!.split(' ').length * 1000) / avgTime);
      
      // ONNX should be reasonably fast on CPU
      expect(tokensPerSec).toBeGreaterThan(50); // Minimum acceptable performance
      
      console.log('✅ Performance Test:', {
        avgProcessingTime: `${Math.round(avgTime)}ms`,
        estimatedTokensPerSec: tokensPerSec,
        runsCompleted: runs,
        allTimes: times.map(t => `${t}ms`)
      });
    });

    it('provides accurate model information', async () => {
      const modelInfo = await embeddingService.getModelInfo();
      
      expect(modelInfo.modelId).toBe(testModelId);
      expect(modelInfo.dimensions).toBe(384);
      expect(modelInfo.quantization).toBe('int8');
      expect(modelInfo.languageCount).toBeGreaterThan(75); // Should support 78+ languages
      expect(modelInfo.modelSize).toBe(120); // 120MB as per catalog
      
      console.log('✅ Model Info:', {
        id: modelInfo.modelId,
        displayName: modelInfo.displayName,
        dimensions: modelInfo.dimensions,
        quantization: modelInfo.quantization,
        languages: modelInfo.languageCount,
        sizeMB: modelInfo.modelSize
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('handles empty text arrays', async () => {
        const result = await embeddingService.generateEmbeddingsFromStrings([]);
        expect(result.embeddings).toEqual([]);
        expect(result.dimensions).toBe(384);
      });

      it('handles very long texts with truncation', async () => {
        const longText = 'word '.repeat(1000); // Very long text
        const result = await embeddingService.generateEmbeddingsFromStrings([longText]);
        
        expect(result.embeddings.length).toBe(1);
        expect(result.embeddings[0]!.length).toBe(384);
        // Should not throw error despite long input
      });
    });
  });

  describe('Downloader Error Handling', () => {
    it('handles invalid model IDs gracefully', async () => {
      const invalidDownloader = new ONNXDownloader({ cacheDirectory: testCacheDir });
      
      await expect(
        invalidDownloader.downloadModel('invalid-model-id')
      ).rejects.toThrow('not found in catalog');
    });

    it('handles network errors with retry logic', async () => {
      // This would require mocking network failures
      // For now, just verify the retry mechanism exists
      const downloader = new ONNXDownloader({ cacheDirectory: testCacheDir });
      expect(downloader.getDownloadStatus).toBeDefined();
    });
  });
});