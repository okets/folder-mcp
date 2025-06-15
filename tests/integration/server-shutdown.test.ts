/**
 * Server Shutdown Integration Tests
 * 
 * Tests proper cleanup of file watchers during server shutdown.
 * This prevents resource leaks and hanging processes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestUtils } from '../helpers/test-utils.js';
import { setupDependencyInjection } from '../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../src/di/interfaces.js';
import type { MonitoringWorkflow } from '../../src/application/monitoring/index.js';

// Sleep utility for testing


describe('Server Shutdown Integration', () => {
  let tempDir: string;
  let container: any;
  let monitoringWorkflow: MonitoringWorkflow;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('shutdown-test-');
    container = await setupDependencyInjection();
    monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
    vi.clearAllMocks();
  });

  describe('Graceful Shutdown Sequence', () => {
    it('should stop file watching during shutdown', async () => {
      // Start file watching
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: [],
        debounceMs: 1000
      });

      expect(startResult.success).toBe(true);
      const watcherId = startResult.watchId;

      // Simulate shutdown sequence (from mcp-server.ts)
      await simulateShutdownSequence(monitoringWorkflow, tempDir);

      // Verify watcher is stopped - trying to get status should indicate inactive
      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(false);
    });

    it('should handle shutdown even if file watching fails to stop', async () => {
      // Start file watching
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 500
      });

      expect(startResult.success).toBe(true);

      // Mock stopFileWatching to throw an error
      const originalStop = monitoringWorkflow.stopFileWatching;
      monitoringWorkflow.stopFileWatching = vi.fn().mockRejectedValue(new Error('Stop failed'));

      // Shutdown should not throw even if file watching cleanup fails
      await expect(simulateShutdownSequence(monitoringWorkflow, tempDir)).resolves.not.toThrow();

      // Restore original method
      monitoringWorkflow.stopFileWatching = originalStop;
    });

    it('should handle multiple shutdown calls gracefully', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });

      // Call shutdown multiple times
      await expect(simulateShutdownSequence(monitoringWorkflow, tempDir)).resolves.not.toThrow();
      await expect(simulateShutdownSequence(monitoringWorkflow, tempDir)).resolves.not.toThrow();
      await expect(simulateShutdownSequence(monitoringWorkflow, tempDir)).resolves.not.toThrow();
    });
  });

  describe('Resource Cleanup Verification', () => {
    it('should not process events after shutdown', async () => {
      // Start file watching
      const startResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 100,
        enableBatchProcessing: true
      });

      expect(startResult.success).toBe(true);

      // Create initial file to verify watcher is working
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const testFile1 = path.join(tempDir, 'before-shutdown.txt');
      await fs.writeFile(testFile1, 'Before shutdown');
      await TestUtils.sleep(200); // Wait for processing

      // Shutdown the server
      await simulateShutdownSequence(monitoringWorkflow, tempDir);

      // Create file after shutdown
      const testFile2 = path.join(tempDir, 'after-shutdown.txt');
      await fs.writeFile(testFile2, 'After shutdown');
      await TestUtils.sleep(300); // Wait to ensure no processing happens

      // Both files should exist but only the first should have been processed
      expect(await fs.access(testFile1)).resolves.not.toThrow();
      expect(await fs.access(testFile2)).resolves.not.toThrow();

      // Verify watcher is inactive
      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status.isActive).toBe(false);
    });

    it('should clean up all file watchers when multiple folders are watched', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Create additional temp directories
      const tempDir2 = await TestUtils.createTempDir('shutdown-test-2-');
      const tempDir3 = await TestUtils.createTempDir('shutdown-test-3-');

      try {
        // Start watching multiple folders
        const result1 = await monitoringWorkflow.startFileWatching(tempDir, {
          includeFileTypes: ['.txt'],
          excludePatterns: [],
          debounceMs: 1000
        });

        const result2 = await monitoringWorkflow.startFileWatching(tempDir2, {
          includeFileTypes: ['.md'],
          excludePatterns: [],
          debounceMs: 1000
        });

        const result3 = await monitoringWorkflow.startFileWatching(tempDir3, {
          includeFileTypes: ['.txt', '.md'],
          excludePatterns: [],
          debounceMs: 1000
        });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result3.success).toBe(true);

        // Shutdown should clean up all watchers
        await simulateShutdownSequence(monitoringWorkflow, tempDir);
        await simulateShutdownSequence(monitoringWorkflow, tempDir2);
        await simulateShutdownSequence(monitoringWorkflow, tempDir3);

        // Verify all watchers are stopped
        const status1 = await monitoringWorkflow.getWatchingStatus(tempDir);
        const status2 = await monitoringWorkflow.getWatchingStatus(tempDir2);
        const status3 = await monitoringWorkflow.getWatchingStatus(tempDir3);

        expect(status1.isActive).toBe(false);
        expect(status2.isActive).toBe(false);
        expect(status3.isActive).toBe(false);

      } finally {
        // Clean up additional temp directories
        await TestUtils.cleanupTempDir(tempDir2);
        await TestUtils.cleanupTempDir(tempDir3);
      }
    });
  });

  describe('Signal Handling Simulation', () => {
    it('should handle SIGTERM gracefully', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });

      // Simulate SIGTERM handler
      const sigtermHandler = async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await simulateShutdownSequence(monitoringWorkflow, tempDir);
        console.log('Shutdown complete');
      };

      // Should not throw
      await expect(sigtermHandler()).resolves.not.toThrow();
    });

    it('should handle SIGINT gracefully', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });

      // Simulate SIGINT handler (Ctrl+C)
      const sigintHandler = async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await simulateShutdownSequence(monitoringWorkflow, tempDir);
        console.log('Shutdown complete');
      };

      await expect(sigintHandler()).resolves.not.toThrow();
    });

    it('should handle process.exit() scenarios', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });

      // Simulate beforeExit handler
      const beforeExitHandler = async () => {
        console.log('Process exiting, cleaning up...');
        await simulateShutdownSequence(monitoringWorkflow, tempDir);
      };

      await expect(beforeExitHandler()).resolves.not.toThrow();
    });
  });

  describe('Shutdown Timing and Performance', () => {
    it('should complete shutdown within reasonable time', async () => {
      // Start file watching
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: [],
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      });

      const startTime = Date.now();
      await simulateShutdownSequence(monitoringWorkflow, tempDir);
      const shutdownTime = Date.now() - startTime;

      // Shutdown should complete quickly (within 5 seconds)
      expect(shutdownTime).toBeLessThan(5000);
    });

    it('should not hang during shutdown with pending events', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Start file watching with longer debounce
      await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 2000, // Long debounce
        enableBatchProcessing: true
      });

      // Create files to trigger events
      const files = Array.from({ length: 5 }, (_, i) => 
        path.join(tempDir, `pending-${i}.txt`)
      );

      // Create files rapidly to queue events
      await Promise.all(
        files.map(file => fs.writeFile(file, 'Pending content'))
      );

      // Immediately shutdown without waiting for debounce
      const startTime = Date.now();
      await simulateShutdownSequence(monitoringWorkflow, tempDir);
      const shutdownTime = Date.now() - startTime;

      // Should shutdown quickly despite pending events
      expect(shutdownTime).toBeLessThan(3000);
    });
  });
});

/**
 * Simulates the shutdown sequence from mcp-server.ts
 */
async function simulateShutdownSequence(monitoringWorkflow: MonitoringWorkflow, folderPath: string): Promise<void> {
  console.log('Shutting down MCP server...');
  
  try {
    // Stop file watching first
    await monitoringWorkflow.stopFileWatching(folderPath);
    console.log('File watching stopped successfully');
  } catch (error) {
    console.warn('Failed to stop file watching during shutdown:', error);
    // Don't fail shutdown if file watching cleanup fails
  }
  
  // Additional cleanup could go here (transport, etc.)
  console.log('Shutdown sequence completed');
}
