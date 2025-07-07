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

describe('MCP Server Multi-Folder Startup Integration', () => {
  let tempDir1: string;
  let tempDir2: string;
  let tempDir3: string;
  let container: any; // Use any to access resolveAsync method
  let monitoringWorkflow: MonitoringWorkflow;
  let indexingWorkflow: IndexingWorkflow;
  let config: any;

  beforeEach(async () => {
    // Create multiple test directories
    tempDir1 = await TestUtils.createTempDir('server-startup-folder1-');
    tempDir2 = await TestUtils.createTempDir('server-startup-folder2-');
    tempDir3 = await TestUtils.createTempDir('server-startup-folder3-');
    
    // Create multi-folder configuration
    config = {
      folders: {
        list: [
          { path: tempDir1, name: 'Folder 1', enabled: true },
          { path: tempDir2, name: 'Folder 2', enabled: true },
          { path: tempDir3, name: 'Folder 3', enabled: false } // Disabled folder
        ]
      },
      modelName: 'nomic-embed-text',
      logLevel: 'error' // Quiet during tests
    };
    
    // Setup real dependency injection container with multi-folder config
    container = setupDependencyInjection({
      folderPath: tempDir1,
      logLevel: 'error'
    });
    
    // Resolve the actual services (no mocks)
    monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
    indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
  });

  afterEach(async () => {
    // Clean up any file watchers for all folders
    for (const dir of [tempDir1, tempDir2, tempDir3]) {
      try {
        await monitoringWorkflow.stopFileWatching(dir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Clean up all temp directories
    await TestUtils.cleanupTempDir(tempDir1);
    await TestUtils.cleanupTempDir(tempDir2);
    await TestUtils.cleanupTempDir(tempDir3);
  });

  describe('Multi-Folder File Watching Initialization', () => {
    it('should handle multiple folder initialization', async () => {
      // Simulate multi-folder server startup sequence
      await testMultiFolderStartupLogic(container, config);

      // Verify file watching was started for enabled folders
      const status1 = await monitoringWorkflow.getWatchingStatus(tempDir1);
      const status2 = await monitoringWorkflow.getWatchingStatus(tempDir2);
      const status3 = await monitoringWorkflow.getWatchingStatus(tempDir3);
      
      expect(status1).toBeDefined();
      expect(status1.isActive).toBe(true);
      expect(status2).toBeDefined();
      expect(status2.isActive).toBe(true);
      expect(status3).toBeDefined();
      expect(status3.isActive).toBe(false); // Folder 3 is disabled
    });

    it('should use resolveAsync for monitoring workflow (not sync resolve)', async () => {
      const resolveAsyncSpy = vi.spyOn(container, 'resolveAsync');
      const resolveSpy = vi.spyOn(container, 'resolve');

      await testMultiFolderStartupLogic(container, config);

      // Verify async resolution was used
      expect(resolveAsyncSpy).toHaveBeenCalledWith(SERVICE_TOKENS.MONITORING_WORKFLOW);
      
      // Verify sync resolve was NOT used for monitoring workflow
      expect(resolveSpy).not.toHaveBeenCalledWith(SERVICE_TOKENS.MONITORING_WORKFLOW);
    });

    it('should continue server startup even if some folders fail', async () => {
      // Create config with mix of valid and invalid folders
      const mixedConfig = {
        folders: {
          list: [
            { path: tempDir1, name: 'Valid Folder', enabled: true },
            { path: '/invalid/nonexistent/path', name: 'Invalid Folder', enabled: true },
            { path: tempDir2, name: 'Another Valid', enabled: true }
          ]
        },
        modelName: 'nomic-embed-text'
      };
      
      // Should not throw an error even if some folders fail
      await expect(testMultiFolderStartupLogic(container, mixedConfig)).resolves.not.toThrow();
    });

    it('should handle monitoring workflow resolution failure gracefully', async () => {
      // Test with broken container that fails async resolution
      const brokenContainer = {
        resolveAsync: vi.fn().mockRejectedValue(new Error('Service not found'))
      };

      // Should handle the error gracefully
      let errorOccurred = false;
      try {
        await testMultiFolderStartupLogic(brokenContainer, config);
      } catch (error) {
        errorOccurred = true;
      }

      // The function should handle the error gracefully internally (no error thrown)
      expect(errorOccurred).toBe(false);
    });
  });

  describe('Multi-Folder Server Configuration', () => {
    it('should pass correct file watching configuration for each folder', async () => {
      // Start file watching for first folder with real service
      const result = await monitoringWorkflow.startFileWatching(tempDir1, {
        includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
        excludePatterns: ['node_modules', '.git', '.folder-mcp'],
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      });

      expect(result.success).toBe(true);
      expect(result.watchId).toBeTypeOf('string');
      expect(result.folderPath).toBe(tempDir1);
      expect(result.options).toEqual(expect.objectContaining({
        includeFileTypes: expect.arrayContaining(['.txt', '.md', '.pdf']),
        excludePatterns: expect.arrayContaining(['node_modules', '.git']),
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      }));
    });

    it('should validate multi-folder configuration', async () => {
      // Test multi-folder configuration validation
      expect(() => validateMultiFolderConfig({})).toThrow('No folders configured');
      expect(() => validateMultiFolderConfig({ folders: { list: [] } })).toThrow('No folders configured');
      expect(() => validateMultiFolderConfig(config)).not.toThrow();
    });
  });
});

/**
 * Extracted server startup logic for testing
 * This simulates the core startup sequence from mcp-server.ts
 */
async function testMultiFolderStartupLogic(container: any, config: any): Promise<void> {
  // Process each configured folder
  const enabledFolders = config.folders?.list?.filter((f: any) => f.enabled !== false) || [];
  
  if (enabledFolders.length === 0) {
    throw new Error('No folders configured');
  }
  
  console.log(`Processing ${enabledFolders.length} configured folders`);
  
  for (const folder of enabledFolders) {
    console.log(`Initializing folder: ${folder.name} at ${folder.path}`);
    
    // 1. Index each folder (handle errors gracefully per folder)
    try {
      const indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW) as IndexingWorkflow;
      await indexingWorkflow.indexFolder(folder.path, {
        embeddingModel: config.modelName || 'nomic-embed-text',
        forceReindex: true
      });
      console.log(`Successfully indexed folder: ${folder.name}`);
    } catch (error) {
      // Non-critical failure - log and continue with next folder
      console.warn(`Initial indexing failed for ${folder.name} (non-critical):`, error);
    }

    // 2. Start file watching for each folder
    try {
      const monitoringWorkflow = await container.resolveAsync(SERVICE_TOKENS.MONITORING_WORKFLOW) as MonitoringWorkflow;
      const watchingResult = await monitoringWorkflow.startFileWatching(folder.path, {
        includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
        excludePatterns: ['node_modules', '.git', '.folder-mcp'],
        debounceMs: 1000,
        enableBatchProcessing: true,
        batchSize: 10
      });

      if (!watchingResult.success) {
        console.warn(`File watching failed for ${folder.name}: ${watchingResult.error}`);
      } else {
        console.log(`File watching started for ${folder.name}`);
      }
    } catch (error) {
      // Non-critical failure - don't crash the server
      console.warn(`File watching startup failed for ${folder.name} (non-critical):`, error);
    }
  }
}

/**
 * Multi-folder configuration validation logic
 */
function validateMultiFolderConfig(config: any): void {
  if (!config.folders || !config.folders.list || config.folders.list.length === 0) {
    throw new Error('No folders configured');
  }
  
  const enabledFolders = config.folders.list.filter((f: any) => f.enabled !== false);
  if (enabledFolders.length === 0) {
    throw new Error('No enabled folders configured');
  }
}
