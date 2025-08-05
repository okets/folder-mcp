import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FolderLifecycleOrchestratorImpl } from '../../src/application/indexing/folder-lifecycle-orchestrator-impl.js';
import { IIndexingOrchestrator, IFileSystemService, ILoggingService } from '../../src/di/interfaces.js';
import { FMDMService } from '../../src/daemon/services/fmdm-service.js';
import { SQLiteVecStorage } from '../../src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import { FolderLifecycleState, FolderProgress } from '../../src/domain/folders/folder-lifecycle-models.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('FolderLifecycleOrchestrator Integration Tests', () => {
  let orchestrator: FolderLifecycleOrchestratorImpl;
  let indexingOrchestrator: IIndexingOrchestrator;
  let fmdmService: FMDMService;
  let fileSystemService: IFileSystemService;
  let sqliteVecStorage: SQLiteVecStorage;
  let testDir: string;
  let testFolderPath: string;

  beforeEach(async () => {
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
      reset: vi.fn()
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
      markForReindex: vi.fn(),
      getDocumentsNeedingReindex: vi.fn(),
      getDocumentFingerprints: vi.fn().mockResolvedValue(new Map())
    } as any;

    // Create orchestrator
    orchestrator = new FolderLifecycleOrchestratorImpl(
      'test-folder-id',
      testFolderPath,
      indexingOrchestrator,
      fmdmService,
      fileSystemService,
      sqliteVecStorage
    );
  });

  afterEach(async () => {
    // Cleanup
    orchestrator.dispose();
    await fs.rm(testDir, { recursive: true, force: true });
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
      
      // Track state changes
      const stateChanges: FolderLifecycleState[] = [];
      const progressUpdates: FolderProgress[] = [];
      
      orchestrator.onStateChange((state) => {
        stateChanges.push({ ...state });
      });
      
      orchestrator.onProgressUpdate((progress) => {
        progressUpdates.push({ ...progress });
      });

      // Start scanning
      await orchestrator.startScanning();

      // Wait for initial scan to complete
      await vi.waitFor(() => {
        expect(orchestrator.currentState.status).not.toBe('scanning');
      }, { timeout: 5000 });

      // Should have transitioned to indexing
      expect(orchestrator.currentState.status).toBe('indexing');
      expect(orchestrator.currentState.fileEmbeddingTasks).toHaveLength(2);

      // Process tasks
      while (orchestrator.currentState.status === 'indexing') {
        const nextTaskId = orchestrator.getNextTask();
        if (nextTaskId) {
          orchestrator.startTask(nextTaskId);
        }
        
        // Wait a bit for async processing
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Should have completed and transitioned to active
      expect(orchestrator.currentState.status).toBe('active');
      expect(orchestrator.isComplete()).toBe(true);
      
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
      
      orchestrator.onStateChange((state) => {
        stateChanges.push({ ...state });
      });

      // Start scanning
      await orchestrator.startScanning();

      // Wait for scan to complete
      await vi.waitFor(() => {
        expect(orchestrator.currentState.status).toBe('active');
      }, { timeout: 5000 });

      // Should go directly from scanning to active
      const statuses = stateChanges.map(s => s.status);
      // Filter out duplicate consecutive statuses
      const uniqueStatuses = statuses.filter((status, index) => 
        index === 0 || status !== statuses[index - 1]
      );
      expect(uniqueStatuses).toEqual(['scanning', 'active']);
      expect(orchestrator.currentState.fileEmbeddingTasks).toHaveLength(0);
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
      
      while (orchestrator.currentState.status === 'indexing') {
        const nextTaskId = orchestrator.getNextTask();
        if (nextTaskId) {
          orchestrator.startTask(nextTaskId);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      expect(orchestrator.currentState.status).toBe('active');
      
      // Now mock getDocumentFingerprints to return the old file info
      vi.mocked(sqliteVecStorage.getDocumentFingerprints).mockResolvedValue(new Map([
        [filePath, 'old-hash']
      ]));
      
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
      
      vi.mocked(fileSystemService.getFileHash).mockResolvedValue('modified-hash');
      
      // Rescan
      await orchestrator.startScanning();
      
      // Should detect the modification and start indexing
      await vi.waitFor(() => {
        expect(orchestrator.currentState.status).toBe('indexing');
      }, { timeout: 5000 });
      
      expect(orchestrator.currentState.fileEmbeddingTasks).toHaveLength(1);
      expect(orchestrator.currentState.fileEmbeddingTasks[0]?.task).toBe('UpdateEmbeddings');
    });

    it('should handle errors with retry logic', async () => {
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
        // Success on third attempt
        return { success: true };
      });

      const progressUpdates: FolderProgress[] = [];
      orchestrator.onProgressUpdate((progress) => {
        progressUpdates.push({ ...progress });
      });

      // Start scanning
      await orchestrator.startScanning();
      
      // Process with retries
      while (orchestrator.currentState.status === 'indexing') {
        const nextTaskId = orchestrator.getNextTask();
        if (nextTaskId) {
          orchestrator.startTask(nextTaskId);
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for retry delay
      }

      // Should eventually succeed after retries
      expect(orchestrator.currentState.status).toBe('active');
      expect(attemptCount).toBe(3); // Failed twice, succeeded on third
    });

    it('should handle permanent failures', async () => {
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
      
      orchestrator.onStateChange((state) => {
        if (state.fileEmbeddingTasks.length > 0) {
          const task = state.fileEmbeddingTasks[0];
          if (task?.status === 'error') {
            lastFailedTask = { ...task };
          }
        }
      });

      // Process with retries
      let retryAttempts = 0;
      while (orchestrator.currentState.status === 'indexing' && retryAttempts < 10) {
        const nextTaskId = orchestrator.getNextTask();
        if (nextTaskId) {
          orchestrator.startTask(nextTaskId);
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        retryAttempts++;
      }

      // Should still transition to active despite failed task
      expect(orchestrator.currentState.status).toBe('active');
      
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
      
      // Process tasks concurrently
      const processingPromises: Promise<void>[] = [];
      
      while (orchestrator.currentState.status === 'indexing') {
        const nextTaskId = orchestrator.getNextTask();
        if (nextTaskId) {
          orchestrator.startTask(nextTaskId);
        }
        
        // Small delay to allow concurrent processing
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify concurrent processing happened
      expect(maxConcurrent).toBe(2); // Max concurrent tasks is 2
      expect(orchestrator.currentState.status).toBe('active');
      // Tasks are cleared after completion, but processing should have happened
      expect(maxConcurrent).toBeGreaterThan(1);
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
      
      // Process tasks
      while (orchestrator.currentState.status === 'indexing') {
        const nextTaskId = orchestrator.getNextTask();
        if (nextTaskId) {
          orchestrator.startTask(nextTaskId);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify status updates
      expect(statusUpdates).toContain('scanning');
      expect(statusUpdates).toContain('indexing');
      expect(statusUpdates).toContain('active');
      
      // Verify progress updates (should have multiple updates)
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates).toContain(50);  // After first file
      expect(progressUpdates).toContain(100); // After completion
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
      
      // Wait for indexing to start
      await vi.waitFor(() => {
        expect(orchestrator.currentState.status).toBe('indexing');
      });

      // Reset orchestrator
      orchestrator.reset();

      // Verify reset state
      expect(orchestrator.currentState.status).toBe('scanning');
      expect(orchestrator.currentState.fileEmbeddingTasks).toHaveLength(0);
      expect(orchestrator.currentState.progress.totalTasks).toBe(0);
      expect(orchestrator.currentState.consecutiveErrors).toBe(0);
      
      // Should be able to start again
      await orchestrator.startScanning();
      expect(orchestrator.currentState.status).toBe('indexing');
    });
  });
});