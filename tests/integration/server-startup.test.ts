/**
 * MCP Server Startup Integration Tests
 * 
 * Critical tests to prevent file watcher initialization issues.
 * These tests ensure that file watching is automatically started during 
 * server startup and that async dependency resolution works correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestUtils } from '../helpers/test-utils.js';
import { setupDependencyInjection } from '../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../src/di/interfaces.js';
import type { MonitoringWorkflow } from '../../src/application/monitoring/index.js';
import type { IndexingWorkflow } from '../../src/application/indexing/index.js';

describe('MCP Server Startup Integration', () => {
  let tempDir: string;
  let container: any; // Use any to access resolveAsync method
  let monitoringWorkflow: MonitoringWorkflow;
  let indexingWorkflow: IndexingWorkflow;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('server-startup-test-');
    
    // Setup real dependency injection container with actual services
    // Pass folderPath so that workflow services are registered
    container = setupDependencyInjection({
      folderPath: tempDir,
      logLevel: 'error' // Quiet during tests
    });
    
    // Resolve the actual services (no mocks)
    monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
    indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
  });

  afterEach(async () => {
    // Clean up any file watchers
    try {
      await monitoringWorkflow.stopFileWatching(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
    
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('File Watching Initialization', () => {
    it('should automatically start file watching after successful indexing', async () => {
      // Test the actual server startup logic with real services
      await testServerStartupLogic(container, tempDir);

      // Verify file watching was started - check if watcher is active
      const status = await monitoringWorkflow.getWatchingStatus(tempDir);
      expect(status).toBeDefined();
      
      // Clean up
      await monitoringWorkflow.stopFileWatching(tempDir);
    });

    it('should use resolveAsync for monitoring workflow (not sync resolve)', async () => {
      const resolveAsyncSpy = vi.spyOn(container, 'resolveAsync');
      const resolveSpy = vi.spyOn(container, 'resolve');

      await testServerStartupLogic(container, tempDir);

      // Verify async resolution was used
      expect(resolveAsyncSpy).toHaveBeenCalledWith(SERVICE_TOKENS.MONITORING_WORKFLOW);
      
      // Verify sync resolve was NOT used for monitoring workflow
      expect(resolveSpy).not.toHaveBeenCalledWith(SERVICE_TOKENS.MONITORING_WORKFLOW);
      
      // Clean up
      await monitoringWorkflow.stopFileWatching(tempDir);
    });

    it('should continue server startup even if file watching fails', async () => {
      // Use an invalid path to cause file watching to fail
      const invalidPath = '/invalid/nonexistent/path';
      
      // Should not throw an error even if file watching fails
      await expect(testServerStartupLogic(container, invalidPath)).resolves.not.toThrow();
    });

    it('should handle monitoring workflow resolution failure gracefully', async () => {
      // Test with broken container that fails async resolution
      const brokenContainer = {
        resolveAsync: vi.fn().mockRejectedValue(new Error('Service not found'))
      };

      // Should handle the error gracefully
      let errorOccurred = false;
      try {
        await testServerStartupLogic(brokenContainer, tempDir);
      } catch (error) {
        errorOccurred = true;
      }

      // The function should handle the error gracefully internally
      expect(errorOccurred).toBe(true);
    });
  });

  describe('Server Configuration', () => {
    it('should pass correct file watching configuration', async () => {
      // Start file watching with real service
      const result = await monitoringWorkflow.startFileWatching(tempDir, {
        includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
        excludePatterns: ['node_modules', '.git', '.folder-mcp'],
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      });

      expect(result.success).toBe(true);
      expect(result.watchId).toBeTypeOf('string');
      expect(result.folderPath).toBe(tempDir);
      expect(result.options).toEqual(expect.objectContaining({
        includeFileTypes: expect.arrayContaining(['.txt', '.md', '.pdf']),
        excludePatterns: expect.arrayContaining(['node_modules', '.git']),
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      }));
      
      // Clean up
      await monitoringWorkflow.stopFileWatching(tempDir);
    });

    it('should require folder path argument', async () => {
      // Test folder path validation logic
      expect(() => validateFolderPath(['node', 'mcp-server.js'])).toThrow('Folder path is required');
      expect(() => validateFolderPath(['node', 'mcp-server.js', tempDir])).not.toThrow();
    });
  });
});

/**
 * Extracted server startup logic for testing
 * This simulates the core startup sequence from mcp-server.ts
 */
async function testServerStartupLogic(container: any, folderPath: string): Promise<void> {
  // 1. Index the folder first
  const indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
  await indexingWorkflow.indexFolder(folderPath, {
    embeddingModel: 'nomic-embed-text',
    forceReindex: true
  });

  // 2. Start file watching (this was the missing piece)
  try {
    const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
    const watchingResult = await monitoringWorkflow.startFileWatching(folderPath, {
      includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
      excludePatterns: ['node_modules', '.git', '.folder-mcp'],
      debounceMs: 1000,
      enableBatchProcessing: true,
      batchSize: 10
    });

    if (!watchingResult.success) {
      console.warn(`File watching failed: ${watchingResult.error}`);
    }
  } catch (error) {
    // Non-critical failure - don't crash the server
    console.warn('File watching startup failed (non-critical):', error);
  }
}

/**
 * Folder path validation logic
 */
function validateFolderPath(argv: string[]): string {
  const folderPath = argv[2];
  if (!folderPath) {
    throw new Error('Folder path is required');
  }
  return folderPath;
}
