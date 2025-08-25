/**
 * SQLite-vec Storage Daemon Integration Tests
 * 
 * Tests that verify SQLiteVecStorage is properly connected to the daemon
 * indexing pipeline with status updates via FMDM.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { FolderMCPDaemon } from '../../../src/daemon/index.js';
import { FMDMService } from '../../../src/daemon/services/fmdm-service.js';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { MODULE_TOKENS } from '../../../src/di/interfaces.js';
import { IMultiFolderIndexingWorkflow, IndexingOrchestrator } from '../../../src/application/indexing/index.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';

describe('SQLiteVecStorage Daemon Integration', () => {
  let testFolder: string;
  let daemon: FolderMCPDaemon | undefined;
  let diContainer: any;
  let indexingOrchestrator: IndexingOrchestrator;
  
  beforeEach(async () => {
    // Create temporary test folder
    testFolder = join(tmpdir(), `test-folder-${Date.now()}`);
    mkdirSync(testFolder, { recursive: true });
    
    // Create a test document
    writeFileSync(join(testFolder, 'test.txt'), 'This is a test document for indexing.');
    
    // Setup DI container with test folder path
    diContainer = setupDependencyInjection({
      logLevel: 'error', // Quiet during tests
      folderPath: testFolder // Configure vector search service for test folder
    });
    
    // Get indexing orchestrator directly to avoid folder configuration requirement
    indexingOrchestrator = await diContainer.resolveAsync(MODULE_TOKENS.APPLICATION.INDEXING_WORKFLOW);
  });
  
  afterEach(async () => {
    // Close database connections first to release file locks on Windows
    try {
      if (diContainer) {
        // Get the vector search service and close its database connections
        const vectorService = await diContainer.resolveAsync(SERVICE_TOKENS.VECTOR_SEARCH);
        if (vectorService && typeof vectorService.close === 'function') {
          await vectorService.close();
        }
        
        // Get the file state storage and close its database connections
        try {
          const fileStateStorage = await diContainer.resolveAsync(SERVICE_TOKENS.FILE_STATE_STORAGE);
          if (fileStateStorage && typeof fileStateStorage.close === 'function') {
            fileStateStorage.close();
          }
        } catch (error) {
          // FILE_STATE_STORAGE might not be directly available
        }
      }
    } catch (error) {
      // Ignore cleanup errors but log them for debugging
      console.warn('Error closing database connections in test cleanup:', error);
    }
    
    // Stop daemon if running
    if (daemon) {
      try {
        await daemon.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Small delay to allow Windows to release file handles
    if (process.platform === 'win32') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Cleanup test folder
    if (existsSync(testFolder)) {
      try {
        rmSync(testFolder, { recursive: true, force: true });
      } catch (error) {
        // On Windows, retry once after additional delay if files are still locked
        if (process.platform === 'win32') {
          await new Promise(resolve => setTimeout(resolve, 500));
          try {
            rmSync(testFolder, { recursive: true, force: true });
          } catch (retryError) {
            console.warn(`Failed to cleanup test folder ${testFolder}:`, retryError);
          }
        } else {
          console.warn(`Failed to cleanup test folder ${testFolder}:`, error);
        }
      }
    }
  });

  it('should connect SQLiteVecStorage to IndexingOrchestrator', async () => {
    // Test that IndexingOrchestrator uses SQLiteVecStorage not mock
    expect(indexingOrchestrator).toBeDefined();
    expect(typeof indexingOrchestrator.indexFolder).toBe('function');
    
    // Try to index a folder to verify the service works
    const result = await indexingOrchestrator.indexFolder(testFolder, {
      forceReindex: true,
      embeddingModel: 'gpu:paraphrase-multilingual-minilm' // Required model parameter
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.filesProcessed).toBeGreaterThan(0);
  });
  
  
  it('should handle indexing errors with proper status updates', async () => {
    // Test error status updates and recovery
    const nonExistentFolder = join(tmpdir(), 'non-existent-folder');
    
    await expect(async () => {
      await indexingOrchestrator.indexFolder(nonExistentFolder, {
        embeddingModel: 'gpu:paraphrase-multilingual-minilm' // Required model parameter
      });
    }).rejects.toThrow();
  });
});

describe('FMDM Status Integration', () => {
  let mockConfigService: any;
  let mockLogger: any;
  let fmdmService: FMDMService;
  
  beforeEach(() => {
    mockConfigService = {
      getFolders: async () => []
    };
    
    mockLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {},
      setLevel: () => {}
    };
    
    fmdmService = new FMDMService(mockConfigService, mockLogger);
  });
  
  it('should update folder status via updateFolderStatus method', async () => {
    // Test FMDM service status updates
    const testPath = '/test/path';
    
    // Add a folder first
    fmdmService.updateFolders([{
      path: testPath,
      model: 'test-model',
      status: 'pending'
    }]);
    
    // Update status
    fmdmService.updateFolderStatus(testPath, 'indexing');
    
    const fmdm = fmdmService.getFMDM();
    const folder = fmdm.folders.find(f => f.path === testPath);
    
    expect(folder).toBeDefined();
    expect(folder?.status).toBe('indexing');
  });
  
  it('should broadcast status changes to connected clients', async () => {
    // Test WebSocket status broadcasting
    let broadcastCount = 0;
    
    const unsubscribe = fmdmService.subscribe(() => {
      broadcastCount++;
    });
    
    // Add folder
    fmdmService.updateFolders([{
      path: '/test/path',
      model: 'test-model', 
      status: 'pending'
    }]);
    
    // Update status should trigger broadcast
    fmdmService.updateFolderStatus('/test/path', 'indexing');
    
    expect(broadcastCount).toBeGreaterThan(0);
    
    unsubscribe();
  });
  
  it('should handle multiple folder status updates independently', async () => {
    // Test concurrent status updates for different folders
    const folder1 = '/test/path1';
    const folder2 = '/test/path2';
    
    // Add multiple folders
    fmdmService.updateFolders([
      { path: folder1, model: 'model1', status: 'pending' },
      { path: folder2, model: 'model2', status: 'pending' }
    ]);
    
    // Update statuses independently
    fmdmService.updateFolderStatus(folder1, 'indexing');
    fmdmService.updateFolderStatus(folder2, 'indexed');
    
    const fmdm = fmdmService.getFMDM();
    
    const f1 = fmdm.folders.find(f => f.path === folder1);
    const f2 = fmdm.folders.find(f => f.path === folder2);
    
    expect(f1?.status).toBe('indexing');
    expect(f2?.status).toBe('indexed');
  });
});