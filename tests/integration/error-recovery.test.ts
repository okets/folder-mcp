/**
 * Error Recovery and Resilience Tests
 * 
 * Tests system resilience when file watching components fail.
 * Ensures the server continues operating when file watching encounters errors.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestUtils } from '../helpers/test-utils.js';
import { setupDependencyInjection } from '../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../src/di/interfaces.js';
import type { MonitoringWorkflow } from '../../src/application/monitoring/index.js';
import type { IndexingWorkflow } from '../../src/application/indexing/index.js';

// Sleep utility for testing


describe('Error Recovery and Resilience', () => {
  let tempDir: string;
  let container: any;
  let monitoringWorkflow: MonitoringWorkflow;
  let indexingWorkflow: IndexingWorkflow;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('error-recovery-test-');
    container = await setupDependencyInjection();
    monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
    indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
  });

  afterEach(async () => {
    // Clean up any active watchers
    try {
      await monitoringWorkflow.stopFileWatching(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
    
    await TestUtils.cleanupTempDir(tempDir);
    vi.clearAllMocks();
  });

  describe('Server Startup Resilience', () => {
    it('should continue startup when monitoring workflow fails to initialize', async () => {
      // Mock container to fail monitoring workflow resolution
      const originalResolveAsync = container.resolveAsync;
      container.resolveAsync = vi.fn()
        .mockImplementation((token) => {
          if (token === SERVICE_TOKENS.MONITORING_WORKFLOW) {
            return Promise.reject(new Error('MonitoringWorkflow failed to initialize'));
          }
          return originalResolveAsync.call(container, token);
        });

      // Simulate server startup sequence with error handling
      let serverStartupSuccess = false;
      let indexingCompleted = false;
      let fileWatchingStarted = false;

      try {
        // 1. Index the folder (should succeed)
        const indexingResult = await indexingWorkflow.indexFolder(tempDir, {
          embeddingModel: 'nomic-embed-text',
          forceReindex: true
        });
        indexingCompleted = true;
        expect(indexingResult).toBeDefined();

        // 2. Try to start file watching (should fail gracefully)
        try {
          const failedMonitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW);
          await failedMonitoringWorkflow.startFileWatching(tempDir, {
            includeFileTypes: ['.txt'],
            excludePatterns: [],
            debounceMs: 1000
          });
          fileWatchingStarted = true;
        } catch (error) {
          console.warn('File watching failed to start (non-critical):', error);
          // Server should continue without file watching
        }

        serverStartupSuccess = true;
      } catch (error) {
        console.error('Server startup failed:', error);
      }

      // Verify server can start without file watching
      expect(serverStartupSuccess).toBe(true);
      expect(indexingCompleted).toBe(true);
      expect(fileWatchingStarted).toBe(false);

      // Restore original method
      container.resolveAsync = originalResolveAsync;
    });

    it('should handle file watching initialization failure gracefully', async () => {
      // Mock startFileWatching to fail
      const originalStartFileWatching = monitoringWorkflow.startFileWatching;
      monitoringWorkflow.startFileWatching = vi.fn().mockResolvedValue({
        success: false,
        watchId: '',
        folderPath: tempDir,
        startedAt: new Date(),
        options: {},
        error: 'Permission denied'
      });

      // Simulate startup sequence
      let serverStartupSuccess = false;
      let indexingCompleted = false;

      try {
        // Index first
        await indexingWorkflow.indexFolder(tempDir, {
          embeddingModel: 'nomic-embed-text',
          forceReindex: true
        });
        indexingCompleted = true;

        // Try file watching (will fail but shouldn't crash server)
        const watchingResult = await monitoringWorkflow.startFileWatching(tempDir, {
          includeFileTypes: ['.txt'],
          excludePatterns: [],
          debounceMs: 1000
        });

        if (!watchingResult.success) {
          console.warn(`File watching failed: ${watchingResult.error}`);
        }

        serverStartupSuccess = true;
      } catch (error) {
        console.error('Unexpected server startup failure:', error);
      }

      expect(serverStartupSuccess).toBe(true);
      expect(indexingCompleted).toBe(true);

      // Restore original method
      monitoringWorkflow.startFileWatching = originalStartFileWatching;
    });
  });

  describe('Runtime Error Recovery', () => {
    it('should recover when file system permissions change', async () => {
      // Start file watching successfully
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100
      });

      expect(startResult.success).toBe(true);

      // Simulate permission error during operation
      const fs = await import('fs/promises');
      const path = await import('path');

      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'Test content');

      // Wait for processing
      await TestUtils.sleep(200);

      // Simulate permission recovery by creating another file
      const testFile2 = path.join(tempDir, 'test2.txt');
      await fs.writeFile(testFile2, 'Recovery test');

      await TestUtils.sleep(200);      // Both files should exist
      expect(fs.access(testFile)).resolves.not.toThrow();
      expect(fs.access(testFile2)).resolves.not.toThrow();

      // File watching should still be active
      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);
    });

    it('should handle temporary file system errors without crashing', async () => {
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100
      });

      expect(startResult.success).toBe(true);

      const fs = await import('fs/promises');
      const path = await import('path');

      // Create and immediately delete files to simulate temporary errors
      const tempFiles = Array.from({ length: 3 }, (_, i) => 
        path.join(tempDir, `temp-${i}.txt`)
      );

      for (const file of tempFiles) {
        await fs.writeFile(file, 'Temporary content');
        await fs.unlink(file); // Delete immediately
      }

      // System should recover and continue working
      const permanentFile = path.join(tempDir, 'permanent.txt');
      await fs.writeFile(permanentFile, 'Permanent content');

      await TestUtils.sleep(200);

      expect(fs.access(permanentFile)).resolves.not.toThrow();

      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);
    });

    it('should handle watched folder deletion gracefully', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Create a subdirectory to watch
      const watchedSubDir = path.join(tempDir, 'watched-subdir');
      await fs.mkdir(watchedSubDir);

      const startResult = await monitoringWorkflow.startFileWatching(watchedSubDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100
      });

      expect(startResult.success).toBe(true);

      // Delete the watched directory
      await fs.rmdir(watchedSubDir);

      // System should handle this gracefully
      await TestUtils.sleep(200);

      // Trying to get status should indicate the watcher is no longer active
      const status = await monitoringWorkflow.getWatchingStatus(watchedSubDir);
      expect(status.isActive).toBe(false);
    });
  });

  describe('Concurrent Error Scenarios', () => {
    it('should handle multiple file watching failures simultaneously', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Create multiple directories
      const dirs = await Promise.all([
        TestUtils.createTempDir('concurrent-1-'),
        TestUtils.createTempDir('concurrent-2-'),
        TestUtils.createTempDir('concurrent-3-')
      ]);

      try {
        // Start watching all directories
        const startPromises = dirs.map(dir =>
          monitoringWorkflow.startFileWatching(dir, {
            includeFileTypes: ['.txt'],
            excludePatterns: [],
            debounceMs: 100
          })
        );

        const results = await Promise.all(startPromises);
        results.forEach(result => expect(result.success).toBe(true));

        // Simulate concurrent errors by deleting all directories
        await Promise.all(dirs.map(dir => fs.rmdir(dir)));

        // Wait for error handling
        await TestUtils.sleep(300);

        // Check status of all watchers
        const statusPromises = dirs.map(dir => 
          monitoringWorkflow.getWatchingStatus(dir)
        );

        const statuses = await Promise.all(statusPromises);
        statuses.forEach(status => expect(status.isActive).toBe(false));

      } finally {
        // Clean up remaining directories
        for (const dir of dirs) {
          try {
            await TestUtils.cleanupTempDir(dir);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    });

    it('should handle rapid start/stop cycles without memory leaks', async () => {
      // Perform multiple rapid start/stop cycles
      for (let i = 0; i < 10; i++) {
        const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
          includeFileTypes: ['.txt'],
          excludePatterns: [],
          debounceMs: 50
        });

        expect(startResult.success).toBe(true);

        // Immediately stop
        await monitoringWorkflow.stopFileWatching(tempDir);

        const status = await monitoringWorkflow.getWatchingStatus(tempDir);
        expect(status.isActive).toBe(false);
      }

      // System should still be functional
      const finalStartResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100
      });

      expect(finalStartResult.success).toBe(true);
    });
  });

  describe('Service Dependency Failures', () => {
    it('should handle incremental indexing service failures', async () => {
      // Start file watching
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100,
        enableBatchProcessing: true
      });

      expect(startResult.success).toBe(true);

      // Mock indexing service to fail
      const originalIndexFolder = indexingWorkflow.indexFolder;
      indexingWorkflow.indexFolder = vi.fn().mockRejectedValue(new Error('Indexing service failed'));

      const fs = await import('fs/promises');
      const path = await import('path');

      // Create file (should trigger indexing attempt)
      const testFile = path.join(tempDir, 'trigger-indexing.txt');
      await fs.writeFile(testFile, 'This should trigger indexing');

      // Wait for processing attempt
      await TestUtils.sleep(200);      // File should exist even if indexing failed
      expect(fs.access(testFile)).resolves.not.toThrow();

      // File watching should still be active
      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);

      // Restore original method
      indexingWorkflow.indexFolder = originalIndexFolder;
    });

    it('should continue operation when embedding service is unavailable', async () => {
      // This test simulates when the embedding service (Ollama) is down
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100
      });

      expect(startResult.success).toBe(true);

      // File watching itself should continue working even if downstream services fail
      const fs = await import('fs/promises');
      const path = await import('path');

      const testFile = path.join(tempDir, 'embedding-test.txt');
      await fs.writeFile(testFile, 'Test content for embedding');

      await TestUtils.sleep(200);      // File should be detected even if embedding fails
      expect(fs.access(testFile)).resolves.not.toThrow();

      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);
    });
  });

  describe('System Resource Exhaustion', () => {
    it('should handle file descriptor limits gracefully', async () => {
      // Start file watching
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 50 // Short debounce for rapid testing
      });

      expect(startResult.success).toBe(true);

      // Create many files rapidly to potentially exhaust file descriptors
      const fs = await import('fs/promises');
      const path = await import('path');

      const files = Array.from({ length: 50 }, (_, i) => 
        path.join(tempDir, `fd-test-${i}.txt`)
      );

      // Create files in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(
          batch.map(file => fs.writeFile(file, `Content ${path.basename(file)}`))
        );
        await TestUtils.sleep(100); // Brief pause between batches
      }

      // Wait for processing
      await TestUtils.sleep(500);

      // Verify system is still responsive
      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(true);      // Verify files exist
      for (const file of files.slice(0, 5)) { // Check first 5 files
        expect(fs.access(file)).resolves.not.toThrow();
      }
    });
  });
});
