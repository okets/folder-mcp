/**
 * Simple Real File Tests for FolderLifecycleOrchestrator
 * 
 * Tests basic lifecycle without embeddings dependency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { FolderLifecycleService } from '../../src/application/indexing/folder-lifecycle-service.js';
import { FolderTaskQueue } from '../../src/domain/folders/folder-task-queue.js';
import { FolderLifecycleStateMachine } from '../../src/domain/folders/folder-lifecycle-state-machine.js';
import { existsSync, rmSync, readFileSync, statSync } from 'fs';

// Mock fs module for generateContentHash
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('FolderLifecycleOrchestrator - Simple Real File Tests', () => {
  const testKnowledgeBase = join(process.cwd(), 'tests/fixtures/test-knowledge-base');
  
  let orchestrator: FolderLifecycleService;
  let mockFmdmService: any;
  let mockFileSystemService: any;
  let mockIndexingOrchestrator: any;
  let mockStorage: any;
  
  beforeEach(() => {
    // Mock filesystem operations for generateContentHash
    vi.mocked(readFileSync).mockImplementation((filePath) => {
      // Return different content based on file path for different hashes
      return Buffer.from(`mock content for ${filePath}`);
    });
    vi.mocked(statSync).mockImplementation((filePath) => ({
      size: 1000 + String(filePath).length, // Different size per file
      mtime: new Date('2024-01-01'),
    } as any));
    
    // Create minimal mocks
    mockFmdmService = {
      updateFolderStatus: vi.fn(),
      updateFolderProgress: vi.fn(),
      getFMDM: vi.fn(() => ({ folders: [] }))
    };
    
    mockFileSystemService = {
      scanFolder: vi.fn(),
      getFileMetadata: vi.fn(),
      getFileHash: vi.fn()
    };
    
    mockIndexingOrchestrator = {
      processFile: vi.fn(() => Promise.resolve({ success: true })),
      removeFile: vi.fn(() => Promise.resolve({ success: true }))
    };
    
    mockStorage = {
      getDocumentFingerprints: vi.fn(() => Promise.resolve(new Map())),
      isReady: vi.fn().mockReturnValue(true), // Fix: storage should be ready
      buildIndex: vi.fn().mockResolvedValue(void 0), // Add missing buildIndex method
      loadIndex: vi.fn().mockResolvedValue(void 0), // Fix: Add missing loadIndex method
      addEmbeddings: vi.fn().mockResolvedValue(void 0), // Add missing addEmbeddings method
      removeDocument: vi.fn().mockResolvedValue(void 0), // Add missing removeDocument method
      getDatabaseManager: vi.fn().mockReturnValue({
        getDatabase: vi.fn().mockReturnValue({
          prepare: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ chunk_count: 1 }) // Mock successful chunk count
          })
        })
      })
    };
    
    // Create mock logger
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      setLevel: vi.fn()
    };
    
    // Create mock file state service that ensures test files get processed
    const mockFileStateService = {
      makeProcessingDecision: vi.fn().mockImplementation((filePath: string) => {
        // For test files, always process them to satisfy test expectations
        if (filePath.includes('/test/') || filePath.includes('test-knowledge-base') || filePath.includes('fixtures')) {
          return Promise.resolve({ shouldProcess: true, reason: 'Test file needs processing', action: 'process' });
        }
        return Promise.resolve({ shouldProcess: false, reason: 'File skipped', action: 'skip' });
      }),
      startProcessing: vi.fn().mockResolvedValue(undefined),
      markProcessingSuccess: vi.fn().mockResolvedValue(undefined),
      markProcessingFailure: vi.fn().mockResolvedValue(undefined),
      markFileSkipped: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({ total: 0, byState: {}, processingEfficiency: 100 })
    };

    // Create orchestrator - FIXED parameter order and added logger
    orchestrator = new FolderLifecycleService(
      'test-simple',
      testKnowledgeBase,
      mockIndexingOrchestrator,
      mockFileSystemService,    // Fixed: fileSystemService in correct position
      mockStorage,              // Fixed: sqliteVecStorage in correct position
      mockFileStateService as any, // Added: fileStateService parameter
      mockLogger,               // Fixed: added missing logger parameter
      'test-model'              // Added: valid test model to avoid validation issues
    );

    // Mock the validateModel method to prevent actual model validation
    vi.spyOn(orchestrator as any, 'validateModel').mockResolvedValue({ valid: true });
  });
  
  afterEach(() => {
    orchestrator.dispose();
  });
  
  it('should scan real test knowledge base and find files', async () => {
    // Mock file system scan to return real files
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: [
        join(testKnowledgeBase, 'Technology/AI_Research.pdf'),
        join(testKnowledgeBase, 'Technology/Cloud_Architecture.docx'),
        join(testKnowledgeBase, 'Business/Q1_Sales_Report.xlsx'),
        join(testKnowledgeBase, 'Business/Marketing_Strategy.pptx'),
        join(testKnowledgeBase, 'Legal/Contract_Template.docx'),
        join(testKnowledgeBase, 'README.txt')
      ],
      errors: []
    });
    
    // Mock file metadata
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 1024,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('test-hash');
    
    const stateChanges: string[] = [];
    orchestrator.onStateChange((state) => {
      stateChanges.push(state.status);
    });
    
    // Start scanning  
    await orchestrator.startScanning();
    
    // Verify state transitions - scanning should go to 'ready' state waiting for startIndexing()
    expect(stateChanges).toContain('scanning');
    expect(orchestrator.currentState.status).toBe('ready');
    
    // Now explicitly start indexing to progress to 'indexing' state
    await orchestrator.startIndexing();

    // Wait for indexing to progress
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should now be in indexing or active state (active if indexing completed quickly on fast systems)
    const validStates = ['indexing', 'active'];
    expect(validStates).toContain(orchestrator.currentState.status);

    // Verify files were detected
    const state = orchestrator.currentState;

    // On fast systems (like Windows), indexing may complete so quickly that tasks are already cleared
    // In that case, check the progress instead
    if (state.status === 'active') {
      // If active, tasks have been cleared but we can check the total that was processed
      expect(state.progress.totalTasks).toBe(6);
    } else {
      // If still indexing, tasks should be present
      expect(state.fileEmbeddingTasks.length).toBe(6);

      // Verify file types were detected correctly
      const fileTypes = new Set(
        state.fileEmbeddingTasks.map((t: any) => t.file.split('.').pop()?.toLowerCase())
      );
      expect(fileTypes).toContain('pdf');
      expect(fileTypes).toContain('docx');
      expect(fileTypes).toContain('xlsx');
      expect(fileTypes).toContain('pptx');
      expect(fileTypes).toContain('txt');
    }
  });
  
  it('should create tasks for each detected file', async () => {
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: [
        join(testKnowledgeBase, 'doc1.pdf'),
        join(testKnowledgeBase, 'doc2.docx'),
        join(testKnowledgeBase, 'doc3.txt')
      ],
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 1024,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('test-hash');
    
    await orchestrator.startScanning();
    
    const state = orchestrator.currentState;
    
    // Verify tasks were created
    expect(state.fileEmbeddingTasks).toHaveLength(3);
    expect(state.fileEmbeddingTasks[0]?.task).toBe('CreateEmbeddings');
    expect(state.fileEmbeddingTasks[0]?.status).toBe('pending');
    expect(state.fileEmbeddingTasks[0]?.file).toContain('doc1.pdf');
    
    // Verify task queue
    expect(orchestrator.getNextTask()).toBeDefined();
  });
  
  it('should process tasks and update progress', async () => {
    mockFileSystemService.scanFolder.mockResolvedValue({
      files: [
        join(testKnowledgeBase, 'file1.txt'),
        join(testKnowledgeBase, 'file2.txt')
      ],
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 100,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('hash');
    
    const progressUpdates: number[] = [];
    orchestrator.onProgressUpdate((progress) => {
      progressUpdates.push(progress.percentage);
    });
    
    await orchestrator.startScanning();
    
    // Should be in ready state with tasks
    expect(orchestrator.currentState.status).toBe('ready');
    expect(orchestrator.currentState.fileEmbeddingTasks.length).toBe(2);
    
    // Now properly start indexing to process tasks
    await orchestrator.startIndexing();
    
    // Wait for async indexing to complete  
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Wait for completion
    await new Promise(resolve => {
      const checkComplete = () => {
        if (orchestrator.isComplete()) {
          resolve(undefined);
        } else {
          setTimeout(checkComplete, 50);
        }
      };
      checkComplete();
    });
    
    // Should be complete with progress at 100%
    expect(orchestrator.isComplete()).toBe(true);
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });
  
  it('should handle scan errors gracefully', async () => {
    mockFileSystemService.scanFolder.mockRejectedValue(
      new Error('Permission denied')
    );
    
    const stateChanges: string[] = [];
    orchestrator.onStateChange((state) => {
      stateChanges.push(state.status);
    });
    
    // This should NOT throw - error should be handled internally
    try {
      await orchestrator.startScanning();
    } catch (error) {
      // If we get here, our error handling is not working
      throw new Error(`startScanning() should handle errors gracefully but threw: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Should transition to error state
    expect(stateChanges).toContain('error');
    expect(orchestrator.currentState.status).toBe('error');
  });
  
  it('should respect concurrency limits', async () => {
    // Create 10 files
    const files = Array.from({ length: 10 }, (_, i) => 
      join(testKnowledgeBase, `file${i}.txt`)
    );
    
    mockFileSystemService.scanFolder.mockResolvedValue({
      files,
      errors: []
    });
    
    mockFileSystemService.getFileMetadata.mockResolvedValue({
      size: 100,
      lastModified: Date.now(),
      isFile: true,
      isDirectory: false
    });
    
    mockFileSystemService.getFileHash.mockResolvedValue('hash');
    
    await orchestrator.startScanning();
    
    // Start multiple tasks up to concurrency limit 
    // NOTE: This value comes from config-defaults.yaml onnx.maxConcurrentFiles
    // If this test fails, check if the configuration value changed
    const taskIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const taskId = orchestrator.getNextTask();
      if (taskId) {
        orchestrator.startTask(taskId);
        taskIds.push(taskId);
      }
    }
    
    // Should only start 4 tasks (maxConcurrentFiles: 4 from config-defaults.yaml)
    // NOTE: If this assertion fails, verify the value in config-defaults.yaml onnx.maxConcurrentFiles
    expect(taskIds.length).toBe(4);
    
    // Verify in-progress count matches concurrency limit
    const state = orchestrator.currentState;
    const inProgress = state.fileEmbeddingTasks.filter((t: any) => t.status === 'in-progress');
    expect(inProgress.length).toBe(4);
  });
});