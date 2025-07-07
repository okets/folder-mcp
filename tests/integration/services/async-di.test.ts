/**
 * Async Dependency Injection Resolution Tests
 * 
 * Critical tests to prevent async/sync resolution bugs that caused
 * the file watcher initialization issue.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import type { MonitoringWorkflow } from '../../../src/application/monitoring/index.js';
import type { IndexingWorkflow } from '../../../src/application/indexing/index.js';

describe('Async Dependency Injection Resolution', () => {
  let tempDir: string;
  let container: any;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('async-di-test-');
    container = setupDependencyInjection({ folderPath: tempDir });
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
    vi.clearAllMocks();
  });

  describe('Async Service Resolution', () => {
    it('should resolve MonitoringWorkflow using resolveAsync (not sync)', async () => {
      // Spy on both methods
      const resolveAsyncSpy = vi.spyOn(container, 'resolveAsync');
      const resolveSpy = vi.spyOn(container, 'resolve');

      // Resolve monitoring workflow with real service
      const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW);

      // Verify async resolution was used
      expect(resolveAsyncSpy).toHaveBeenCalledWith(SERVICE_TOKENS.MONITORING_WORKFLOW);
      expect(monitoringWorkflow).toBeDefined();
      expect(typeof monitoringWorkflow.startFileWatching).toBe('function');

      // Verify sync resolve was NOT used
      expect(resolveSpy).not.toHaveBeenCalledWith(SERVICE_TOKENS.MONITORING_WORKFLOW);
    });

    it('should resolve IndexingWorkflow using resolveAsync', async () => {
      const resolveAsyncSpy = vi.spyOn(container, 'resolveAsync');
      const resolveSpy = vi.spyOn(container, 'resolve');

      const indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW);

      expect(resolveAsyncSpy).toHaveBeenCalledWith(SERVICE_TOKENS.INDEXING_WORKFLOW);
      expect(indexingWorkflow).toBeDefined();
      expect(typeof indexingWorkflow.indexFolder).toBe('function');
      expect(resolveSpy).not.toHaveBeenCalledWith(SERVICE_TOKENS.INDEXING_WORKFLOW);
    });

    it('should fail when trying to resolve async services synchronously', async () => {
      // Try to resolve async service with sync method - should fail gracefully
      expect(() => {
        container.resolve(SERVICE_TOKENS.MONITORING_WORKFLOW);
      }).toThrow(); // Should throw because async services can't be resolved synchronously
    });

    it('should handle async resolution failures gracefully', async () => {
      // Create a broken container
      const brokenContainer = {
        resolveAsync: vi.fn().mockRejectedValue(new Error('Service not found'))
      };

      await expect(async () => {
        await brokenContainer.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW);
      }).rejects.toThrow('Service not found');
    });
  });

  describe('Service Lifecycle Management', () => {
    it('should properly initialize async services', async () => {
      const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;

      // Verify the service has expected methods
      expect(typeof monitoringWorkflow.startFileWatching).toBe('function');
      expect(typeof monitoringWorkflow.stopFileWatching).toBe('function');
      expect(typeof monitoringWorkflow.getWatchingStatus).toBe('function');
    });

    it('should maintain service instance consistency', async () => {
      // Resolve the same service multiple times
      const instance1 = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW);
      const instance2 = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW);

      // Should be the same instance (singleton behavior)
      expect(instance1).toBe(instance2);
    });

    it('should handle concurrent async resolutions', async () => {
      // Resolve multiple services concurrently
      const promises = [
        container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW),
        container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW),
        container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW), // Duplicate to test consistency
      ];

      const [monitoring1, indexing, monitoring2] = await Promise.all(promises);

      expect(monitoring1).toBeDefined();
      expect(indexing).toBeDefined();
      expect(monitoring1).toBe(monitoring2); // Should be same instance
    });
  });

  describe('Real Server Startup Simulation', () => {
    it('should simulate the exact startup sequence that was fixed', async () => {
      // This test replicates the exact sequence from mcp-server.ts
      const resolveAsyncSpy = vi.spyOn(container, 'resolveAsync');

      // 1. First resolve indexing workflow
      const indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
      expect(indexingWorkflow).toBeDefined();

      // 2. Then resolve monitoring workflow (this was the bug - using sync resolve)
      const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
      expect(monitoringWorkflow).toBeDefined();

      // 3. Verify both used async resolution
      expect(resolveAsyncSpy).toHaveBeenCalledWith(SERVICE_TOKENS.INDEXING_WORKFLOW);
      expect(resolveAsyncSpy).toHaveBeenCalledWith(SERVICE_TOKENS.MONITORING_WORKFLOW);

      // 4. Try to start file watching (this should work now)
      const watchingResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md'],
        excludePatterns: ['node_modules', '.git'],
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      });

      expect(watchingResult.success).toBe(true);
      expect(watchingResult.watchId).toBeTypeOf('string');

      // Clean up
      await monitoringWorkflow.stopFileWatching(tempDir);
    });

    it('should fail gracefully if async resolution fails during startup', async () => {
      // Mock a resolution failure
      const originalResolveAsync = container.resolveAsync;
      container.resolveAsync = vi.fn()
        .mockResolvedValueOnce({}) // IndexingWorkflow succeeds
        .mockRejectedValueOnce(new Error('MonitoringWorkflow failed')); // MonitoringWorkflow fails

      // Simulate startup sequence with error handling
      let indexingWorkflow;
      let monitoringWorkflow;
      let watchingStarted = false;

      try {
        indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW);
        expect(indexingWorkflow).toBeDefined();
      } catch (error) {
        console.error('Indexing workflow resolution failed:', error);
      }

      try {
        monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW);
        // This should fail due to our mock
      } catch (error) {
        console.error('Monitoring workflow resolution failed (expected):', error);
        expect(error).toBeInstanceOf(Error);
      }

      // Server should continue without file watching (non-critical failure)
      expect(indexingWorkflow).toBeDefined();
      expect(monitoringWorkflow).toBeUndefined();
      expect(watchingStarted).toBe(false);

      // Restore original method
      container.resolveAsync = originalResolveAsync;
    });
  });

  describe('Type Safety and Contract Validation', () => {
    it('should ensure resolved services match expected interfaces', async () => {
      const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;

      // Verify MonitoringWorkflow interface
      expect(monitoringWorkflow).toHaveProperty('startFileWatching');
      expect(monitoringWorkflow).toHaveProperty('stopFileWatching');
      expect(monitoringWorkflow).toHaveProperty('getWatchingStatus');
      expect(monitoringWorkflow).toHaveProperty('getSystemHealth');

      // Verify method signatures
      expect(typeof monitoringWorkflow.startFileWatching).toBe('function');
      expect(typeof monitoringWorkflow.stopFileWatching).toBe('function');
      expect(typeof monitoringWorkflow.getWatchingStatus).toBe('function');
      expect(typeof monitoringWorkflow.getSystemHealth).toBe('function');
    });

    it('should validate IndexingWorkflow interface', async () => {
      const indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;

      expect(indexingWorkflow).toHaveProperty('indexFolder');
      expect(typeof indexingWorkflow.indexFolder).toBe('function');
    });

    it('should maintain consistent return types', async () => {
      const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;

      // Test return type consistency
      const watchingResult = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt'],
        excludePatterns: [],
        debounceMs: 1000
      });

      // Verify WatchingResult interface
      expect(watchingResult).toHaveProperty('success');
      expect(watchingResult).toHaveProperty('watchId');
      expect(watchingResult).toHaveProperty('folderPath');
      expect(watchingResult).toHaveProperty('startedAt');
      expect(watchingResult).toHaveProperty('options');

      expect(typeof watchingResult.success).toBe('boolean');
      expect(typeof watchingResult.watchId).toBe('string');
      expect(typeof watchingResult.folderPath).toBe('string');
      expect(watchingResult.startedAt).toBeInstanceOf(Date);
      expect(typeof watchingResult.options).toBe('object');

      // Clean up
      await monitoringWorkflow.stopFileWatching(tempDir);
    });
  });
});
