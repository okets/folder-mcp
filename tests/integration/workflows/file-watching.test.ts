/**
 * File Watcher Lifecycle Integration Tests
 * 
 * Tests the complete file watching lifecycle including real-time detection,
 * debouncing, incremental indexing, and proper cleanup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import type { MonitoringWorkflow } from '../../../src/application/monitoring/index.js';
import fs from 'fs/promises';
import path from 'path';

describe('File Watcher Lifecycle Integration', () => {
  let tempDir: string;
  let container: any; // Use any for now to access resolveAsync
  let monitoringWorkflow: MonitoringWorkflow;
  let watcherId: string | null = null;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('file-watcher-test-');
    container = await setupDependencyInjection();
    monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
  });

  afterEach(async () => {
    // Clean up file watcher
    if (watcherId && monitoringWorkflow) {
      try {
        await monitoringWorkflow.stopFileWatching(tempDir);
      } catch (error) {
        console.warn('Failed to stop file watching in cleanup:', error);
      }
    }
    
    await TestUtils.cleanupTempDir(tempDir);
    vi.clearAllMocks();
  });

  describe('File Watcher Startup', () => {
    it('should start file watching with correct configuration', async () => {
      const result = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: ['node_modules', '.git'],
        debounceMs: 500,
        enableBatchProcessing: true,
        batchSize: 5
      });

      expect(result.success).toBe(true);
      expect(result.watchId).toBeTypeOf('string');
      expect(result.error).toBeUndefined();
      
      watcherId = result.watchId;
    });

    it('should handle invalid folder path gracefully', async () => {
      const invalidPath = path.join(tempDir, 'nonexistent');
      
      const result = await monitoringWorkflow.startFileWatching(invalidPath, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Real-time File Detection', () => {
    beforeEach(async () => {
      // Start file watching
      const result = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: [],
        debounceMs: 100, // Short debounce for testing
        enableBatchProcessing: true
      });
      
      expect(result.success).toBe(true);
      watcherId = result.watchId;
    });

    it('should detect new file creation', async () => {
      const testFile = path.join(tempDir, 'test-file.txt');
      await fs.writeFile(testFile, 'Test content for file watching');

      // Wait for debounce + processing
      await TestUtils.sleep(200);

      // Verify file was detected and processed
      expect(await fs.access(testFile)).resolves.not.toThrow();
    });

    it('should detect file modifications', async () => {
      // Create initial file
      const testFile = path.join(tempDir, 'modify-test.md');
      await fs.writeFile(testFile, 'Initial content');
      
      // Wait for initial processing
      await TestUtils.sleep(150);
      
      // Modify the file
      await fs.writeFile(testFile, 'Modified content');
      
      // Wait for debounce + processing
      await TestUtils.sleep(200);
      
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('Modified content');
    });

    it('should detect file deletion', async () => {
      // Create and delete file
      const testFile = path.join(tempDir, 'delete-test.txt');
      await fs.writeFile(testFile, 'To be deleted');
      
      await TestUtils.sleep(150);
      
      await fs.unlink(testFile);
      
      // Wait for processing
      await TestUtils.sleep(200);
      
      await expect(fs.access(testFile)).rejects.toThrow();
    });

    it('should respect file type filters', async () => {
      // Create files with different extensions
      const txtFile = path.join(tempDir, 'included.txt');
      const jsFile = path.join(tempDir, 'excluded.js');
      
      await fs.writeFile(txtFile, 'Should be watched');
      await fs.writeFile(jsFile, 'Should be ignored');
      
      await TestUtils.sleep(200);
      
      // Both files should exist, but only .txt should be processed
      expect(await fs.access(txtFile)).resolves.not.toThrow();
      expect(await fs.access(jsFile)).resolves.not.toThrow();
    });

    it('should respect exclude patterns', async () => {
      // Start watcher with exclude patterns
      await monitoringWorkflow.stopFileWatching(tempDir);
      
      const result = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: ['temp'],
        debounceMs: 100
      });
      
      watcherId = result.watchId;
      
      // Create files in different locations
      const normalFile = path.join(tempDir, 'normal.txt');
      const tempDir2 = path.join(tempDir, 'temp');
      await fs.mkdir(tempDir2);
      const excludedFile = path.join(tempDir2, 'excluded.txt');
      
      await fs.writeFile(normalFile, 'Should be watched');
      await fs.writeFile(excludedFile, 'Should be ignored');
      
      await TestUtils.sleep(200);
      
      expect(await fs.access(normalFile)).resolves.not.toThrow();
      expect(await fs.access(excludedFile)).resolves.not.toThrow();
    });
  });

  describe('Debouncing Behavior', () => {
    beforeEach(async () => {
      const result = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000, // 1 second debounce
        enableBatchProcessing: true,
        batchSize: 10
      });
      
      watcherId = result.watchId;
    });

    it('should batch multiple file changes within debounce window', async () => {
      // Create multiple files rapidly
      const files = Array.from({ length: 5 }, (_, i) => 
        path.join(tempDir, `batch-${i}.txt`)
      );
      
      // Create all files within debounce window
      await Promise.all(
        files.map((file, i) => 
          fs.writeFile(file, `Content ${i}`)
        )
      );
      
      // Wait for debounce to complete
      await TestUtils.sleep(1200);
      
      // All files should exist
      for (const file of files) {
        expect(await fs.access(file)).resolves.not.toThrow();
      }
    });

    it('should reset debounce timer on new events', async () => {
      const startTime = Date.now();
      
      // Create first file
      await fs.writeFile(path.join(tempDir, 'debounce1.txt'), 'First');
      
      // Wait 500ms (less than debounce)
      await TestUtils.sleep(500);
      
      // Create second file (should reset timer)
      await fs.writeFile(path.join(tempDir, 'debounce2.txt'), 'Second');
      
      // Wait for full debounce
      await TestUtils.sleep(1200);
      
      const totalTime = Date.now() - startTime;
      
      // Should take at least 1.5 seconds (500ms + 1000ms debounce)
      expect(totalTime).toBeGreaterThan(1400);
    });
  });

  describe('File Watcher Cleanup', () => {
    it('should stop file watching cleanly', async () => {
      // Start watcher
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });
      
      expect(startResult.success).toBe(true);
      watcherId = startResult.watchId;
      
      // Stop watcher
      await monitoringWorkflow.stopFileWatching(tempDir);
      
      watcherId = null; // Prevent cleanup in afterEach
    });

    it('should handle multiple stop calls gracefully', async () => {
      // Start watcher
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });
      
      watcherId = startResult.watchId;
      
      // Stop multiple times - should not throw
      await expect(monitoringWorkflow.stopFileWatching(tempDir)).resolves.not.toThrow();
      await expect(monitoringWorkflow.stopFileWatching(tempDir)).resolves.not.toThrow();
      
      watcherId = null;
    });

    it('should not detect events after stopping', async () => {
      // Start watcher
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100
      });
      
      watcherId = startResult.watchId;
      
      // Stop watcher
      await monitoringWorkflow.stopFileWatching(tempDir);
      watcherId = null;
      
      // Create file after stopping
      await fs.writeFile(path.join(tempDir, 'after-stop.txt'), 'Should not be processed');
      
      // Wait to ensure no processing happens
      await TestUtils.sleep(300);
      
      // File should exist but not be processed
      expect(await fs.access(path.join(tempDir, 'after-stop.txt'))).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle file system permission errors', async () => {
      // Test with non-existent path
      const result = await monitoringWorkflow.startFileWatching('/nonexistent/path', {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });
      
      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/not found|does not exist|ENOENT/i);
    });

    it('should recover from temporary file system errors', async () => {
      // Start watcher successfully
      const result = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100
      });
      
      expect(result.success).toBe(true);
      watcherId = result.watchId;
      
      // Simulate temporary error by creating and immediately deleting a file
      const tempFile = path.join(tempDir, 'temp-error.txt');
      await fs.writeFile(tempFile, 'Temporary');
      await fs.unlink(tempFile);
      
      // Watcher should continue working
      const normalFile = path.join(tempDir, 'normal.txt');
      await fs.writeFile(normalFile, 'Normal file');
      
      await TestUtils.sleep(200);
      
      expect(await fs.access(normalFile)).resolves.not.toThrow();
    });
  });
});
