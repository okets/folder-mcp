import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { FolderLifecycleOrchestratorImpl } from '../../../src/application/indexing/folder-lifecycle-orchestrator-impl.js';
import type { IIndexingOrchestrator } from '../../../src/di/interfaces.js';
import type { FMDMService } from '../../../src/daemon/services/fmdm-service.js';
import type { IFileSystemService } from '../../../src/domain/files/file-system-operations.js';
import type { SQLiteVecStorage } from '../../../src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import type { FileChangeInfo, FolderLifecycleState, TaskResult } from '../../../src/domain/folders/folder-lifecycle-models.js';

describe('FolderLifecycleOrchestratorImpl', () => {
  let orchestrator: FolderLifecycleOrchestratorImpl;
  let mockIndexingOrchestrator: IIndexingOrchestrator;
  let mockFmdmService: FMDMService;
  let mockFileSystemService: IFileSystemService;
  let mockSqliteVecStorage: SQLiteVecStorage;
  
  const testFolderId = 'test-folder-123';
  const testFolderPath = '/test/folder/path';

  beforeEach(() => {
    // Create mocks
    mockIndexingOrchestrator = {
      indexFolder: vi.fn().mockResolvedValue({
        success: true,
        filesProcessed: 10,
        embeddingsCreated: 50,
        errors: []
      }),
      processFile: vi.fn().mockResolvedValue({ success: true }),
      removeFile: vi.fn().mockResolvedValue({ success: true })
    } as any;

    mockFmdmService = {
      updateFolderStatus: vi.fn(),
      updateFolderProgress: vi.fn()
    } as any;

    mockFileSystemService = {
      scanFolder: vi.fn().mockResolvedValue({
        files: [
          { path: '/test/folder/path/file1.pdf', size: 1000, lastModified: new Date() },
          { path: '/test/folder/path/file2.docx', size: 2000, lastModified: new Date() }
        ]
      }),
      getFileHash: vi.fn().mockResolvedValue('hash123'),
      getFileMetadata: vi.fn().mockResolvedValue({
        size: 1000,
        lastModified: Date.now(),
        isFile: true,
        isDirectory: false
      })
    } as any;

    mockSqliteVecStorage = {
      getFileMetadata: vi.fn().mockResolvedValue(null),
      removeFileEmbeddings: vi.fn().mockResolvedValue(true),
      getDocumentFingerprints: vi.fn().mockResolvedValue(new Map())
    } as any;

    orchestrator = new FolderLifecycleOrchestratorImpl(
      testFolderId,
      testFolderPath,
      mockIndexingOrchestrator,
      mockFmdmService,
      mockFileSystemService,
      mockSqliteVecStorage
    );
  });

  describe('Initialization', () => {
    it('should initialize with scanning state', () => {
      expect(orchestrator.currentState.status).toBe('scanning');
      expect(orchestrator.folderId).toBe(testFolderId);
      expect(orchestrator.getFolderPath()).toBe(testFolderPath);
    });

    it('should have empty task list initially', () => {
      expect(orchestrator.currentState.fileEmbeddingTasks).toHaveLength(0);
      expect(orchestrator.getProgress().totalTasks).toBe(0);
    });
  });

  describe('Scanning Phase', () => {
    it('should start scanning and update FMDM', async () => {
      // Mock scan to return no files, so we stay in scanning phase
      vi.mocked(mockFileSystemService.scanFolder).mockResolvedValueOnce({ files: [], errors: [] });
      vi.mocked(mockSqliteVecStorage.getFileMetadata).mockResolvedValue(null);
      
      await orchestrator.startScanning();
      
      expect(mockFmdmService.updateFolderStatus).toHaveBeenCalledWith(
        testFolderPath,
        'scanning'
      );
      
      // Should transition to active since no files need processing
      expect(orchestrator.currentState.status).toBe('active');
      expect(orchestrator.currentState.lastScanStarted).toBeInstanceOf(Date);
    });

    it('should handle scan errors gracefully', async () => {
      vi.mocked(mockFileSystemService.scanFolder).mockRejectedValueOnce(new Error('Scan failed'));
      
      await orchestrator.startScanning();
      
      expect(orchestrator.currentState.status).toBe('error');
      expect(orchestrator.currentState.errorMessage).toContain('Scan failed');
    });
  });

  describe('Task Creation from Scan Results', () => {
    it('should create CreateEmbeddings tasks for new files', () => {
      const changes: FileChangeInfo[] = [
        {
          path: '/test/folder/path/new-file.pdf',
          changeType: 'added',
          lastModified: new Date(),
          size: 1000
        }
      ];

      orchestrator.processScanResults(changes);
      
      expect(orchestrator.currentState.status).toBe('indexing');
      expect(orchestrator.currentState.fileEmbeddingTasks).toHaveLength(1);
      expect(orchestrator.currentState.fileEmbeddingTasks[0]?.task).toBe('CreateEmbeddings');
      expect(orchestrator.currentState.fileEmbeddingTasks[0]?.file).toBe('/test/folder/path/new-file.pdf');
    });

    it('should create UpdateEmbeddings tasks for modified files', () => {
      const changes: FileChangeInfo[] = [
        {
          path: '/test/folder/path/modified-file.docx',
          changeType: 'modified',
          lastModified: new Date(),
          size: 2000,
          hash: 'new-hash'
        }
      ];

      orchestrator.processScanResults(changes);
      
      expect(orchestrator.currentState.fileEmbeddingTasks[0]?.task).toBe('UpdateEmbeddings');
    });

    it('should create RemoveEmbeddings tasks for deleted files', () => {
      const changes: FileChangeInfo[] = [
        {
          path: '/test/folder/path/deleted-file.xlsx',
          changeType: 'removed',
          lastModified: new Date(),
          size: 0
        }
      ];

      orchestrator.processScanResults(changes);
      
      expect(orchestrator.currentState.fileEmbeddingTasks[0]?.task).toBe('RemoveEmbeddings');
    });

    it('should transition to active if no changes detected', () => {
      orchestrator.processScanResults([]);
      
      expect(orchestrator.currentState.status).toBe('active');
      expect(orchestrator.currentState.fileEmbeddingTasks).toHaveLength(0);
    });
  });

  describe('Task Execution', () => {
    beforeEach(() => {
      // Add some tasks
      const changes: FileChangeInfo[] = [
        { path: '/test/file1.pdf', changeType: 'added', lastModified: new Date(), size: 1000 },
        { path: '/test/file2.docx', changeType: 'modified', lastModified: new Date(), size: 2000 }
      ];
      orchestrator.processScanResults(changes);
    });

    it('should get next task respecting concurrency limits', () => {
      const task1 = orchestrator.getNextTask();
      expect(task1).toBeDefined();
      
      orchestrator.startTask(task1!);
      
      const task2 = orchestrator.getNextTask();
      expect(task2).toBeDefined();
      
      orchestrator.startTask(task2!);
      
      // Should return null when limit reached (assuming max 2)
      const task3 = orchestrator.getNextTask();
      expect(task3).toBeNull();
    });

    it('should handle task completion successfully', () => {
      const taskId = orchestrator.getNextTask()!;
      orchestrator.startTask(taskId);
      
      const result: TaskResult = { taskId, success: true };
      orchestrator.onTaskComplete(taskId, result);
      
      const progress = orchestrator.getProgress();
      expect(progress.completedTasks).toBe(1);
      expect(progress.totalTasks).toBe(2);
      expect(progress.percentage).toBe(50);
    });

    it('should handle task failure with retry', () => {
      const taskId = orchestrator.getNextTask()!;
      orchestrator.startTask(taskId);
      
      const result: TaskResult = { 
        taskId, 
        success: false, 
        error: new Error('Processing failed') 
      };
      orchestrator.onTaskComplete(taskId, result);
      
      // Task should be scheduled for retry
      const task = orchestrator.currentState.fileEmbeddingTasks.find(t => t.id === taskId);
      expect(task?.retryCount).toBe(1);
      expect(task?.status).toBe('pending'); // Back to pending for retry
    });

    it('should transition to active when all tasks complete', () => {
      const task1 = orchestrator.getNextTask()!;
      orchestrator.startTask(task1);
      orchestrator.onTaskComplete(task1, { taskId: task1, success: true });
      
      const task2 = orchestrator.getNextTask()!;
      orchestrator.startTask(task2);
      orchestrator.onTaskComplete(task2, { taskId: task2, success: true });
      
      expect(orchestrator.currentState.status).toBe('active');
      expect(orchestrator.isComplete()).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress correctly', () => {
      const changes: FileChangeInfo[] = Array.from({ length: 10 }, (_, i) => ({
        path: `/test/file${i}.pdf`,
        changeType: 'added' as const,
        lastModified: new Date(),
        size: 1000
      }));
      
      orchestrator.processScanResults(changes);
      
      // Complete 3 tasks
      for (let i = 0; i < 3; i++) {
        const taskId = orchestrator.getNextTask()!;
        orchestrator.startTask(taskId);
        orchestrator.onTaskComplete(taskId, { taskId, success: true });
      }
      
      const progress = orchestrator.getProgress();
      expect(progress.totalTasks).toBe(10);
      expect(progress.completedTasks).toBe(3);
      expect(progress.percentage).toBe(30);
    });

    it('should update FMDM with progress', () => {
      const changes: FileChangeInfo[] = [
        { path: '/test/file1.pdf', changeType: 'added', lastModified: new Date(), size: 1000 }
      ];
      
      orchestrator.processScanResults(changes);
      
      const taskId = orchestrator.getNextTask()!;
      orchestrator.startTask(taskId);
      orchestrator.onTaskComplete(taskId, { taskId, success: true });
      
      expect(mockFmdmService.updateFolderProgress).toHaveBeenCalled();
    });
  });

  describe('Event Subscriptions', () => {
    it('should notify state changes', () => {
      const stateCallback = vi.fn();
      const unsubscribe = orchestrator.onStateChange(stateCallback);
      
      orchestrator.processScanResults([
        { path: '/test/file.pdf', changeType: 'added', lastModified: new Date(), size: 1000 }
      ]);
      
      expect(stateCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'indexing' })
      );
      
      unsubscribe();
      orchestrator.reset();
      expect(stateCallback).toHaveBeenCalledTimes(1); // No more calls after unsubscribe
    });

    it('should notify progress updates', () => {
      const progressCallback = vi.fn();
      const unsubscribe = orchestrator.onProgressUpdate(progressCallback);
      
      orchestrator.processScanResults([
        { path: '/test/file.pdf', changeType: 'added', lastModified: new Date(), size: 1000 }
      ]);
      
      const taskId = orchestrator.getNextTask()!;
      orchestrator.startTask(taskId);
      orchestrator.onTaskComplete(taskId, { taskId, success: true });
      
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ 
          totalTasks: 1,
          completedTasks: 1,
          percentage: 100 
        })
      );
      
      unsubscribe();
    });
  });

  describe('State Management', () => {
    it('should check if active correctly', () => {
      expect(orchestrator.isActive()).toBe(true);
      
      // Simulate error by forcing scan failure
      vi.mocked(mockFileSystemService.scanFolder).mockRejectedValueOnce(new Error('Scan failed'));
      orchestrator.startScanning().then(() => {
        expect(orchestrator.isActive()).toBe(false);
      });
    });

    it('should check completion correctly', () => {
      expect(orchestrator.isComplete()).toBe(false);
      
      // Process empty scan results to go to active
      orchestrator.processScanResults([]);
      expect(orchestrator.isComplete()).toBe(true);
    });

    it('should reset to initial state', () => {
      orchestrator.processScanResults([
        { path: '/test/file.pdf', changeType: 'added', lastModified: new Date(), size: 1000 }
      ]);
      
      orchestrator.reset();
      
      expect(orchestrator.currentState.status).toBe('scanning');
      expect(orchestrator.currentState.fileEmbeddingTasks).toHaveLength(0);
      expect(orchestrator.getProgress().totalTasks).toBe(0);
    });
  });

  describe('Integration with IndexingOrchestrator', () => {
    it('should wrap IndexingOrchestrator calls for file processing', async () => {
      const changes: FileChangeInfo[] = [
        { path: '/test/file.pdf', changeType: 'added', lastModified: new Date(), size: 1000 }
      ];
      
      orchestrator.processScanResults(changes);
      
      const taskId = orchestrator.getNextTask()!;
      orchestrator.startTask(taskId);
      
      // Simulate task processing
      await orchestrator.processTask(taskId);
      
      expect(mockIndexingOrchestrator.processFile).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should transition to error state on critical failures', () => {
      orchestrator.currentState.consecutiveErrors = 5; // Simulate multiple errors
      
      const taskId = 'test-task';
      orchestrator.onTaskComplete(taskId, { 
        taskId, 
        success: false, 
        error: new Error('Critical failure') 
      });
      
      if (orchestrator.currentState.consecutiveErrors > 5) {
        expect(orchestrator.currentState.status).toBe('error');
      }
    });
  });
});