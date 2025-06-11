/**
 * Application Layer - Indexing Workflow Tests
 * 
 * Tests for the indexing application layer interfaces and workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import type {
  IndexingWorkflow,
  IncrementalIndexing,
  IndexingOptions,
  IndexingResult,
  IndexingStatus,
  IndexingProgress,
  IndexingError,
  ChangeDetectionResult,
  ChangesSummary
} from '../../../src/application/indexing/index.js';

describe('Application Layer - Indexing', () => {
  let tempDir: string;
  let mockWorkflow: IndexingWorkflow;
  let mockIncremental: IncrementalIndexing;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('indexing-test-');

    // Initialize mock workflow
    mockWorkflow = {
      indexFolder: async (path: string, options: IndexingOptions): Promise<IndexingResult> => {
        return {
          success: true,
          filesProcessed: 0,
          chunksGenerated: 0,
          embeddingsCreated: 0,
          processingTime: 0,
          errors: [],
          statistics: {
            totalBytes: 0,
            totalWords: 0,
            averageChunkSize: 0,
            processingRate: 0,
            embeddingRate: 0
          }
        };
      },
      
      indexFiles: async (files: string[], options: IndexingOptions): Promise<IndexingResult> => {
        return {
          success: true,
          filesProcessed: files.length,
          chunksGenerated: files.length * 2, // Assume 2 chunks per file
          embeddingsCreated: files.length * 2,
          processingTime: files.length * 100, // 100ms per file
          errors: [],
          statistics: {
            totalBytes: files.length * 1000, // Assume 1KB per file
            totalWords: files.length * 100, // Assume 100 words per file
            averageChunkSize: 500,
            processingRate: 10, // 10 files per second
            embeddingRate: 20 // 20 embeddings per second
          }
        };
      },
      
      getIndexingStatus: async (path: string): Promise<IndexingStatus> => ({
        isRunning: false,
        progress: {
          totalFiles: 0,
          processedFiles: 0,
          totalChunks: 0,
          processedChunks: 0,
          percentage: 0
        }
      }),
      
      resumeIndexing: async (path: string): Promise<IndexingResult> => {
        return {
          success: true,
          filesProcessed: 0,
          chunksGenerated: 0,
          embeddingsCreated: 0,
          processingTime: 0,
          errors: [],
          statistics: {
            totalBytes: 0,
            totalWords: 0,
            averageChunkSize: 0,
            processingRate: 0,
            embeddingRate: 0
          }
        };
      }
    };

    // Initialize mock incremental indexing
    mockIncremental = {
      detectChanges: async (folderPath: string): Promise<ChangeDetectionResult> => {
        return {
          newFiles: ['new1.txt', 'new2.txt'],
          modifiedFiles: ['modified1.txt'],
          deletedFiles: ['deleted1.txt'],
          unchangedFiles: ['unchanged1.txt'],
          summary: {
            totalChanges: 4,
            estimatedProcessingTime: 400, // 100ms per file
            requiresFullReindex: false
          }
        };
      },

      indexChanges: async (changes: ChangeDetectionResult, options: IndexingOptions): Promise<IndexingResult> => {
        const totalFiles = changes.newFiles.length + changes.modifiedFiles.length;
        return {
          success: true,
          filesProcessed: totalFiles,
          chunksGenerated: totalFiles * 2,
          embeddingsCreated: totalFiles * 2,
          processingTime: totalFiles * 100,
          errors: [],
          statistics: {
            totalBytes: totalFiles * 1000,
            totalWords: totalFiles * 100,
            averageChunkSize: 500,
            processingRate: 10,
            embeddingRate: 20
          }
        };
      }
    };
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('IndexingWorkflow Interface', () => {
    it('should handle empty directory', async () => {
      const emptyDir = await TestUtils.createTempDir('empty-dir-');
      
      const result = await mockWorkflow.indexFolder(emptyDir, {
        includeFileTypes: ['*'],
        excludePatterns: []
      });

      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBe(0);
      expect(result.chunksGenerated).toBe(0);
      expect(result.embeddingsCreated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.statistics.totalBytes).toBe(0);
      expect(result.statistics.totalWords).toBe(0);
      expect(result.statistics.averageChunkSize).toBe(0);
      expect(result.statistics.processingRate).toBe(0);
      expect(result.statistics.embeddingRate).toBe(0);

      await TestUtils.cleanupTempDir(emptyDir);
    });

    it('should process multiple files', async () => {
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      const result = await mockWorkflow.indexFiles(files, {
        includeFileTypes: ['txt'],
        excludePatterns: []
      });

      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBe(3);
      expect(result.chunksGenerated).toBe(6);
      expect(result.embeddingsCreated).toBe(6);
      expect(result.processingTime).toBe(300);
      expect(result.errors).toHaveLength(0);
      expect(result.statistics.totalBytes).toBe(3000);
      expect(result.statistics.totalWords).toBe(300);
      expect(result.statistics.averageChunkSize).toBe(500);
      expect(result.statistics.processingRate).toBe(10);
      expect(result.statistics.embeddingRate).toBe(20);
    });

    it('should handle indexing errors', async () => {
      const error: IndexingError = {
        filePath: 'corrupted-file.pdf',
        error: 'Failed to parse PDF: Invalid format',
        stage: 'parsing',
        timestamp: new Date(),
        recoverable: false
      };

      expect(error.filePath).toBe('corrupted-file.pdf');
      expect(error.error).toContain('Failed to parse PDF');
      expect(error.stage).toBe('parsing');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.recoverable).toBe(false);
    });

    it('should track indexing status', async () => {
      const status = await mockWorkflow.getIndexingStatus(tempDir);
      
      expect(status.isRunning).toBe(false);
      expect(status.progress).toBeDefined();
      expect(status.progress.totalFiles).toBe(0);
      expect(status.progress.processedFiles).toBe(0);
      expect(status.progress.totalChunks).toBe(0);
      expect(status.progress.processedChunks).toBe(0);
      expect(status.progress.percentage).toBe(0);
    });
  });

  describe('IncrementalIndexing Interface', () => {
    it('should detect file changes', async () => {
      const changes = await mockIncremental.detectChanges(tempDir);
      
      expect(changes.newFiles).toHaveLength(2);
      expect(changes.modifiedFiles).toHaveLength(1);
      expect(changes.deletedFiles).toHaveLength(1);
      expect(changes.unchangedFiles).toHaveLength(1);
      expect(changes.summary.totalChanges).toBe(4);
      expect(changes.summary.estimatedProcessingTime).toBe(400);
      expect(changes.summary.requiresFullReindex).toBe(false);
    });

    it('should process detected changes', async () => {
      const changes = await mockIncremental.detectChanges(tempDir);
      const result = await mockIncremental.indexChanges(changes, {
        includeFileTypes: ['txt'],
        excludePatterns: []
      });

      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBe(3); // new + modified files
      expect(result.chunksGenerated).toBe(6);
      expect(result.embeddingsCreated).toBe(6);
      expect(result.processingTime).toBe(300);
      expect(result.errors).toHaveLength(0);
      expect(result.statistics.totalBytes).toBe(3000);
      expect(result.statistics.totalWords).toBe(300);
    });

    it('should handle empty changes', async () => {
      const emptyChanges: ChangeDetectionResult = {
        newFiles: [],
        modifiedFiles: [],
        deletedFiles: [],
        unchangedFiles: ['file1.txt'],
        summary: {
          totalChanges: 0,
          estimatedProcessingTime: 0,
          requiresFullReindex: false
        }
      };

      const result = await mockIncremental.indexChanges(emptyChanges, {
        includeFileTypes: ['txt'],
        excludePatterns: []
      });

      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBe(0);
      expect(result.chunksGenerated).toBe(0);
      expect(result.embeddingsCreated).toBe(0);
      expect(result.processingTime).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.statistics.totalBytes).toBe(0);
      expect(result.statistics.totalWords).toBe(0);
    });
  });
});
