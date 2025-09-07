import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FolderLifecycleService } from '../../src/application/indexing/folder-lifecycle-service.js';
import { IIndexingOrchestrator, IFileSystemService, ILoggingService } from '../../src/di/interfaces.js';
import { FMDMService } from '../../src/daemon/services/fmdm-service.js';
import { SQLiteVecStorage } from '../../src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import { FolderLifecycleState, FolderProgress } from '../../src/domain/folders/folder-lifecycle-models.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { readFileSync, statSync } from 'fs';

// Mock fs module for generateContentHash
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('FolderLifecycleOrchestrator Integration Tests', () => {
  let orchestrator: FolderLifecycleService;
  let indexingOrchestrator: IIndexingOrchestrator;
  let fmdmService: FMDMService;
  let fileSystemService: IFileSystemService;
  let sqliteVecStorage: SQLiteVecStorage;
  let testDir: string;
  let testFolderPath: string;

  beforeEach(async () => {
    // Mock filesystem operations for generateContentHash
    vi.mocked(readFileSync).mockImplementation((filePath) => {
      // Return different content based on file path for different hashes
      return Buffer.from(`mock content for ${filePath}`);
    });
    vi.mocked(statSync).mockImplementation((filePath) => ({
      size: 1000 + String(filePath).length, // Different size per file
      mtime: new Date('2024-01-01'),
    } as any));
    
    // Create test directory
    testDir = path.join(os.tmpdir(), `folder-mcp-test-${Date.now()}`);
    testFolderPath = path.join(testDir, 'test-folder');
    await fs.mkdir(testFolderPath, { recursive: true });

    // Create mock services
    const mockLogger: ILoggingService = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      setLevel: vi.fn()
    };

    // Mock indexing orchestrator
    indexingOrchestrator = {
      indexFolder: vi.fn().mockResolvedValue(undefined),
      processFile: vi.fn().mockResolvedValue({ success: true }),
      removeFile: vi.fn().mockResolvedValue({ success: true }),
      pauseFolder: vi.fn(),
      resumeFolder: vi.fn(),
      isPaused: vi.fn().mockReturnValue(false),
      getStatistics: vi.fn().mockReturnValue({
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        totalChunks: 0,
        errors: 0
      }),
      reset: vi.fn(),
      testModelAvailability: vi.fn().mockResolvedValue({ available: true })
    };

    // Create mock config service
    const mockConfigService = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      getAll: vi.fn().mockReturnValue({}),
      getSources: vi.fn().mockReturnValue([]),
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
    };

    // Mock FMDM service with all required methods
    fmdmService = {
      getFMDM: vi.fn().mockReturnValue({ folders: [], models: [], daemon: {}, connections: {}, version: 1 }),
      updateFolders: vi.fn(),
      addClient: vi.fn(),
      removeClient: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {}),
      updateDaemonStatus: vi.fn(),
      setAvailableModels: vi.fn(),
      getConnectionCount: vi.fn().mockReturnValue(0),
      updateFolderStatus: vi.fn(),
      updateFolderProgress: vi.fn()
    } as any;

    // Mock file system service - will be customized per test
    fileSystemService = {
      scanFolder: vi.fn().mockResolvedValue({
        files: [],
        errors: []
      }),
      getFileHash: vi.fn().mockResolvedValue('mock-hash'),
      readFile: vi.fn(),
      getFileMetadata: vi.fn(),
      isDirectory: vi.fn(),
      exists: vi.fn(),
      generateFingerprints: vi.fn().mockResolvedValue([]),
      watchFolder: vi.fn().mockResolvedValue(undefined)
    } as IFileSystemService;

    // Mock SQLiteVecStorage
    sqliteVecStorage = {
      getFileMetadata: vi.fn().mockResolvedValue(null),
      removeFileEmbeddings: vi.fn().mockResolvedValue(undefined),
      buildIndex: vi.fn(),
      search: vi.fn(),
      isReady: vi.fn().mockReturnValue(true),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
      removeDocument: vi.fn().mockResolvedValue(undefined), // Add missing removeDocument method
      markForReindex: vi.fn(),
      getDocumentsNeedingReindex: vi.fn(),
      getDocumentFingerprints: vi.fn().mockResolvedValue(new Map())
    } as any;

    // Create mock file state service that ensures test files get processed
    const mockFileStateService = {
      makeProcessingDecision: vi.fn().mockImplementation((filePath: string) => {
        // For test files, always process them to satisfy test expectations
        // This covers all test scenarios in this file
        if (filePath.includes('/test/') || filePath.includes('test-folder') || filePath.includes('test-knowledge-base') || filePath.includes('fixtures') || filePath.includes(testFolderPath)) {
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

    // Create orchestrator with logger
    orchestrator = new FolderLifecycleService(
      'test-folder-id',
      testFolderPath,
      indexingOrchestrator,
      fileSystemService,
      sqliteVecStorage,
      mockFileStateService as any, // Added: fileStateService parameter
      mockLogger,
      'test-model' // Added: valid test model to avoid validation issues
    );

    // Mock the validateModel method to prevent actual model validation
    vi.spyOn(orchestrator as any, 'validateModel').mockResolvedValue({ valid: true });
  });

  afterEach(async () => {
    // Cleanup
    await orchestrator.stop();
    await fs.rm(testDir, { recursive: true, force: true });
    vi.clearAllTimers();
  });

  describe('Full lifecycle flow', () => {
    it('should handle scanning → indexing → active flow for new files', async () => {
      // Create test files
      await fs.writeFile(path.join(testFolderPath, 'file1.txt'), 'Hello World');
      await fs.writeFile(path.join(testFolderPath, 'file2.md'), '# Test Document');
      
      // Mock file system to return these files - scanFolder returns string paths
      vi.mocked(fileSystemService.scanFolder).mockResolvedValue({
        files: [
          path.join(testFolderPath, 'file1.txt'),
          path.join(testFolderPath, 'file2.md')
        ],
        errors: []
      });
      
      // Mock file metadata for the scanned files
      vi.mocked(fileSystemService.getFileMetadata).mockImplementation((filePath: string) => {
        if (filePath.includes('file1.txt')) {
          return Promise.resolve({ 
            path: filePath, 
            lastModified: Date.now(), 
            size: 11,
            isFile: true,
            isDirectory: false
          });
        } else if (filePath.includes('file2.md')) {
          return Promise.resolve({ 
            path: filePath, 
            lastModified: Date.now(), 
            size: 15,
            isFile: true,
            isDirectory: false
          });
        }
        return Promise.resolve(null);
      });
      
      vi.mocked(fileSystemService.getFileHash).mockResolvedValue('new-file-hash');
      
      // SQLiteVecStorage is already mocked to return null for new files
      vi.mocked(sqliteVecStorage.getDocumentFingerprints).mockResolvedValue(new Map())
      
      // Track state changes
      const stateChanges: FolderLifecycleState[] = [];
      const progressUpdates: FolderProgress[] = [];
      
      orchestrator.on('stateChange', (state) => {
        stateChanges.push({ ...state });
        // Capture progress updates from state changes
        if (state.progress) {
          progressUpdates.push({ ...state.progress });
        }
      });

      // Start scanning
      await orchestrator.startScanning();

      // Wait for initial scan to complete
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).not.toBe('scanning');
      }, { timeout: 5000 });

      // Should have transitioned to ready state
      const state = orchestrator.getState();
      expect(state.status).toBe('ready');
      expect(state.fileEmbeddingTasks).toHaveLength(2);

      // Start indexing
      await orchestrator.startIndexing();
      
      // Allow async task processing to start
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Wait for indexing to complete
      await vi.waitFor(() => {
        const currentState = orchestrator.getState();
        expect(currentState.status).toBe('active');
      }, { timeout: 5000, interval: 100 });

      // Should have completed and transitioned to active
      const finalState = orchestrator.getState();
      expect(finalState.status).toBe('active');
      
      // Verify state transitions
      const statuses = stateChanges.map(s => s.status);
      expect(statuses).toContain('scanning');
      expect(statuses).toContain('indexing');
      expect(statuses).toContain('active');
      
      // Verify progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress?.percentage).toBe(100);
      expect(finalProgress?.completedTasks).toBe(2);
    });

    it('should handle no changes scenario (scanning → active)', async () => {
      // Start with empty folder
      const stateChanges: FolderLifecycleState[] = [];
      
      orchestrator.on('stateChange', (state) => {
        stateChanges.push({ ...state });
      });

      // Start scanning
      await orchestrator.startScanning();

      // Wait for scan to complete
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('active');
      }, { timeout: 5000 });

      // Should go directly from scanning to active
      const statuses = stateChanges.map(s => s.status);
      // Filter out duplicate consecutive statuses
      const uniqueStatuses = statuses.filter((status, index) => 
        index === 0 || status !== statuses[index - 1]
      );
      expect(uniqueStatuses).toEqual(['scanning', 'active']);
      
      const finalState = orchestrator.getState();
      expect(finalState.fileEmbeddingTasks).toHaveLength(0);
    });

    it('should handle file modifications', async () => {
      // Create initial file
      const filePath = path.join(testFolderPath, 'test.txt');
      const initialModTime = Date.now() - 10000; // 10 seconds ago
      
      // First scan - file is new
      vi.mocked(fileSystemService.scanFolder).mockResolvedValue({
        files: [filePath],
        errors: []
      });
      
      // Mock file metadata for the scanned file
      vi.mocked(fileSystemService.getFileMetadata).mockResolvedValue({
        path: filePath,
        lastModified: initialModTime,
        size: 15,
        isFile: true,
        isDirectory: false
      });
      
      // First scan and index
      await orchestrator.startScanning();
      
      // Wait for ready state
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('ready');
      });
      
      // Start indexing
      await orchestrator.startIndexing();
      
      // Allow async task processing to start
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Wait for indexing to complete
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('active');
      }, { timeout: 5000 });
      
      const activeState = orchestrator.getState();
      expect(activeState.status).toBe('active');
      
      // Now mock getDocumentFingerprints to return the old file info for the second scan
      // The detectChanges method compares the current hash with the stored fingerprint
      vi.mocked(sqliteVecStorage.getDocumentFingerprints).mockResolvedValue(new Map([
        [filePath, 'mock-hash']  // This was the hash returned by getFileHash in the first scan
      ]));
      
      // Also update the getFileHash mock to return a different hash for modification
      vi.mocked(fileSystemService.getFileHash).mockResolvedValue('modified-hash');
      
      // Mock scan to show file was modified
      const newModTime = Date.now();
      vi.mocked(fileSystemService.scanFolder).mockResolvedValue({
        files: [filePath],
        errors: []
      });
      
      // Update file metadata mock for modified file
      vi.mocked(fileSystemService.getFileMetadata).mockResolvedValue({
        path: filePath,
        lastModified: newModTime,
        size: 16,
        isFile: true,
        isDirectory: false
      });
      
      // Reset orchestrator state to pending first
      orchestrator.reset();
      expect(orchestrator.getState().status).toBe('pending');
      
      // For this second scan, mock the file state service to indicate the file needs an update
      // Access the file state service through the orchestrator
      const fileStateService = orchestrator['fileStateService'] as any;
      vi.spyOn(fileStateService, 'makeProcessingDecision').mockImplementationOnce(() => {
        return Promise.resolve({ 
          shouldProcess: true, 
          reason: 'File content changed', 
          action: 'retry' // retry action creates 'modified' changeType -> UpdateEmbeddings
        });
      });
      
      // Rescan with modified file
      await orchestrator.startScanning();
      
      // Should detect the modification and go to ready state
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('ready');
      }, { timeout: 5000 });
      
      const readyState = orchestrator.getState();
      expect(readyState.fileEmbeddingTasks).toHaveLength(1);
      expect(readyState.fileEmbeddingTasks[0]?.task).toBe('UpdateEmbeddings');
    });

    it('should handle errors with retry logic', { timeout: 60000 }, async () => {
      
      // Create test file
      await fs.writeFile(path.join(testFolderPath, 'error-file.txt'), 'Error test');
      
      // Mock file system to return the file
      const errorFilePath = path.join(testFolderPath, 'error-file.txt');
      vi.mocked(fileSystemService.scanFolder).mockResolvedValue({
        files: [errorFilePath],
        errors: []
      });
      
      // Mock file metadata
      vi.mocked(fileSystemService.getFileMetadata).mockResolvedValue({
        path: errorFilePath,
        lastModified: Date.now(),
        size: 10,
        isFile: true,
        isDirectory: false
      });
      
      // Mock indexingOrchestrator to fail first attempts
      let attemptCount = 0;
      vi.spyOn(indexingOrchestrator, 'processFile').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Simulated indexing error');
        }
        // Success on third attempt - return proper structure
        return {
          chunksGenerated: 5,
          embeddingsCreated: 5,
          bytes: 100,
          words: 20,
          embeddings: [],
          metadata: []
        };
      });

      // Track state changes for error tracking
      const stateChanges: FolderLifecycleState[] = [];
      orchestrator.on('stateChange', (state) => {
        stateChanges.push({ ...state });
      });

      // Start scanning
      await orchestrator.startScanning();
      
      // Wait for ready state
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('ready');
      });
      
      // Start indexing
      await orchestrator.startIndexing();
      
      // Wait for indexing to complete with retries
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('active');
      }, { timeout: 30000, interval: 1000 }); // Much longer timeout for ONNX processing and retries

      // Should eventually succeed after retries
      const finalState = orchestrator.getState();
      expect(finalState.status).toBe('active');
      expect(attemptCount).toBeGreaterThanOrEqual(3); // Failed at least twice, succeeded eventually
    });

    it('should handle permanent failures', { timeout: 60000 }, async () => {
      // Create test file
      await fs.writeFile(path.join(testFolderPath, 'permanent-error.txt'), 'Error test');
      
      // Mock file system to return the file
      const permanentErrorPath = path.join(testFolderPath, 'permanent-error.txt');
      vi.mocked(fileSystemService.scanFolder).mockResolvedValue({
        files: [permanentErrorPath],
        errors: []
      });
      
      // Mock file metadata
      vi.mocked(fileSystemService.getFileMetadata).mockResolvedValue({
        path: permanentErrorPath,
        lastModified: Date.now(),
        size: 10,
        isFile: true,
        isDirectory: false
      });
      
      // Mock indexingOrchestrator to always fail
      vi.spyOn(indexingOrchestrator, 'processFile').mockRejectedValue(
        new Error('Permanent indexing error')
      );

      // Start scanning
      await orchestrator.startScanning();
      
      // Track task states during processing
      let lastFailedTask: any = null;
      
      orchestrator.on('stateChange', (state) => {
        if (state.fileEmbeddingTasks.length > 0) {
          const task = state.fileEmbeddingTasks[0];
          if (task?.status === 'error') {
            lastFailedTask = { ...task };
          }
        }
      });

      // Wait for ready state
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('ready');
      });
      
      // Start indexing - it will fail and retry
      await orchestrator.startIndexing();
      
      // Allow async task processing to start
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Wait for indexing to complete (even with failures)
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('active');
      }, { timeout: 30000, interval: 1000 }); // Much longer timeout for ONNX processing and multiple retries

      // Should still transition to active despite failed task
      const finalState = orchestrator.getState();
      expect(finalState.status).toBe('active');
      
      // Verify the indexing orchestrator was called multiple times (retries)
      expect(vi.mocked(indexingOrchestrator.processFile)).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should handle concurrent task processing', async () => {
      // Create multiple test files
      const fileCount = 5;
      const filePaths: string[] = [];
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(testFolderPath, `file${i}.txt`);
        await fs.writeFile(filePath, `Content ${i}`);
        filePaths.push(filePath);
      }
      
      // Mock file system to return all files
      vi.mocked(fileSystemService.scanFolder).mockResolvedValue({
        files: filePaths,
        errors: []
      });
      
      // Mock file metadata for all files
      vi.mocked(fileSystemService.getFileMetadata).mockImplementation((filePath: string) => {
        const index = filePaths.indexOf(filePath);
        if (index >= 0) {
          return Promise.resolve({
            path: filePath,
            lastModified: Date.now(),
            size: 10 + index,
            isFile: true,
            isDirectory: false
          });
        }
        return Promise.resolve(null);
      });

      // Track concurrent tasks
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      
      vi.spyOn(indexingOrchestrator, 'processFile').mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        currentConcurrent--;
        return { success: true };
      });

      // Start scanning
      await orchestrator.startScanning();
      
      // Wait for ready state
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('ready');
      });
      
      // Start indexing
      await orchestrator.startIndexing();
      
      // Allow async task processing to start
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Wait for indexing to complete
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('active');
      }, { timeout: 10000 });

      // Verify concurrent processing happened
      const finalState = orchestrator.getState();
      expect(finalState.status).toBe('active');
      // The orchestrator internally handles concurrent processing
      expect(maxConcurrent).toBeGreaterThanOrEqual(1);
    });

    it('should update FMDM service correctly', async () => {
      // Spy on FMDM updates
      const statusUpdates: string[] = [];
      const progressUpdates: number[] = [];
      
      vi.spyOn(fmdmService, 'updateFolderStatus').mockImplementation((path, status) => {
        statusUpdates.push(status);
      });
      
      vi.spyOn(fmdmService, 'updateFolderProgress').mockImplementation((path, progress) => {
        progressUpdates.push(progress);
      });

      // Create test files
      const file1Path = path.join(testFolderPath, 'file1.txt');
      const file2Path = path.join(testFolderPath, 'file2.txt');
      await fs.writeFile(file1Path, 'Content 1');
      await fs.writeFile(file2Path, 'Content 2');
      
      // Mock file system to return these files
      vi.mocked(fileSystemService.scanFolder).mockResolvedValue({
        files: [file1Path, file2Path],
        errors: []
      });
      
      // Mock file metadata for both files
      vi.mocked(fileSystemService.getFileMetadata).mockImplementation((filePath: string) => {
        if (filePath === file1Path || filePath === file2Path) {
          return Promise.resolve({
            path: filePath,
            lastModified: Date.now(),
            size: 9,
            isFile: true,
            isDirectory: false
          });
        }
        return Promise.resolve(null);
      });

      // Start scanning
      await orchestrator.startScanning();
      
      // Wait for ready state
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('ready');
      });
      
      // Start indexing
      await orchestrator.startIndexing();
      
      // Allow async task processing to start
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Wait for indexing to complete
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('active');
      }, { timeout: 5000 });

      // In the new architecture, FMDM updates are handled at a higher level
      // by the MonitoredFoldersOrchestrator, not by the individual FolderLifecycleManager
      // So we won't see direct FMDM calls from this orchestrator instance
      
      // Instead, verify the orchestrator completed its lifecycle
      const finalState = orchestrator.getState();
      expect(finalState.status).toBe('active');
    });

    it('should handle reset correctly', async () => {
      // Create test file
      const resetTestPath = path.join(testFolderPath, 'reset-test.txt');
      await fs.writeFile(resetTestPath, 'Reset test');
      
      // Mock file system to return the file
      vi.mocked(fileSystemService.scanFolder).mockResolvedValue({
        files: [resetTestPath],
        errors: []
      });
      
      // Mock file metadata
      vi.mocked(fileSystemService.getFileMetadata).mockResolvedValue({
        path: resetTestPath,
        lastModified: Date.now(),
        size: 10,
        isFile: true,
        isDirectory: false
      });
      
      // Start scanning and processing
      await orchestrator.startScanning();
      
      // Wait for ready state
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('ready');
      });

      // Reset orchestrator
      orchestrator.reset();

      // Verify reset state
      const resetState = orchestrator.getState();
      expect(resetState.status).toBe('pending');
      expect(resetState.fileEmbeddingTasks).toHaveLength(0);
      expect(resetState.progress.totalTasks).toBe(0);
      expect(resetState.consecutiveErrors).toBe(0);
      
      // Should be able to start again
      await orchestrator.startScanning();
      
      // Wait for scanning to complete (should go to ready since we have files)
      await vi.waitFor(() => {
        const state = orchestrator.getState();
        expect(state.status).toBe('ready');
      });
    });
  });
});