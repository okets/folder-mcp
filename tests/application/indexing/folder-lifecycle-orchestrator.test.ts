import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { FolderLifecycleService } from '../../../src/application/indexing/folder-lifecycle-service.js';
import type { IIndexingOrchestrator, ILoggingService } from '../../../src/di/interfaces.js';
import type { IFileSystemService } from '../../../src/domain/files/file-system-operations.js';
import type { SQLiteVecStorage } from '../../../src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import type { FileChangeInfo, FolderLifecycleState, TaskResult } from '../../../src/domain/folders/folder-lifecycle-models.js';

describe('FolderLifecycleService', () => {
  let orchestrator: FolderLifecycleService;
  let mockIndexingOrchestrator: IIndexingOrchestrator;
  let mockFileSystemService: IFileSystemService;
  let mockSqliteVecStorage: SQLiteVecStorage;
  let mockLogger: ILoggingService;
  
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
      getDocumentFingerprints: vi.fn().mockResolvedValue(new Map()),
      isReady: vi.fn().mockReturnValue(false), // Add missing isReady method
      buildIndex: vi.fn().mockResolvedValue(void 0) // Add missing buildIndex method
    } as any;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    orchestrator = new FolderLifecycleService(
      testFolderId,
      testFolderPath,
      mockIndexingOrchestrator,
      mockFileSystemService,
      mockSqliteVecStorage,
      mockLogger
    );
  });

  describe('Initialization', () => {
    it('should initialize with pending state', () => {
      const state = orchestrator.getState();
      expect(state.status).toBe('pending');
      expect(orchestrator.folderId).toBe(testFolderId);
      expect(orchestrator.getFolderPath()).toBe(testFolderPath);
    });

    it('should have empty task list initially', () => {
      const state = orchestrator.getState();
      expect(state.fileEmbeddingTasks).toHaveLength(0);
      expect(orchestrator.getProgress().totalTasks).toBe(0);
    });
  });

  describe('Scanning Phase', () => {
    it('should start scanning from pending state', async () => {
      // Mock scan to return no files, so we go to active
      vi.mocked(mockFileSystemService.scanFolder).mockResolvedValueOnce({ files: [], errors: [] });
      vi.mocked(mockSqliteVecStorage.getDocumentFingerprints).mockResolvedValue(new Map());
      
      await orchestrator.startScanning();
      
      const state = orchestrator.getState();
      // Should transition to active since no files need processing
      expect(state.status).toBe('active');
      expect(state.lastScanStarted).toBeInstanceOf(Date);
    });

    it('should handle scan errors gracefully', async () => {
      vi.mocked(mockFileSystemService.scanFolder).mockRejectedValueOnce(new Error('Scan failed'));
      
      await orchestrator.startScanning();
      
      const state = orchestrator.getState();
      expect(state.status).toBe('error');
      expect(state.errorMessage).toContain('Scan failed');
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
      
      const state = orchestrator.getState();
      expect(state.status).toBe('ready');
      expect(state.fileEmbeddingTasks).toHaveLength(1);
      expect(state.fileEmbeddingTasks[0]?.task).toBe('CreateEmbeddings');
      expect(state.fileEmbeddingTasks[0]?.file).toBe('/test/folder/path/new-file.pdf');
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
      
      const state = orchestrator.getState();
      expect(state.fileEmbeddingTasks[0]?.task).toBe('UpdateEmbeddings');
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
      
      const state = orchestrator.getState();
      expect(state.fileEmbeddingTasks[0]?.task).toBe('RemoveEmbeddings');
    });

    it('should transition to active if no changes detected', () => {
      orchestrator.processScanResults([]);
      
      const state = orchestrator.getState();
      expect(state.status).toBe('active');
      expect(state.fileEmbeddingTasks).toHaveLength(0);
    });
  });

  describe('Indexing Phase', () => {
    beforeEach(async () => {
      // Start scanning first to get to pending state
      await orchestrator.startScanning();
      
      // Add some tasks to get to ready state
      const changes: FileChangeInfo[] = [
        { path: '/test/file1.pdf', changeType: 'added', lastModified: new Date(), size: 1000 },
        { path: '/test/file2.docx', changeType: 'modified', lastModified: new Date(), size: 2000 }
      ];
      orchestrator.processScanResults(changes);
    });

    it('should start indexing from ready state', async () => {
      const state = orchestrator.getState();
      expect(state.status).toBe('ready');
      
      await orchestrator.startIndexing();
      
      const newState = orchestrator.getState();
      expect(newState.status).toBe('indexing');
      expect(newState.lastIndexStarted).toBeInstanceOf(Date);
    });

    it('should get next task respecting queue order', () => {
      const task1 = orchestrator.getNextTask();
      expect(task1).toBeDefined();
      
      orchestrator.startTask(task1!);
      
      const task2 = orchestrator.getNextTask();
      expect(task2).toBeDefined();
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
  });

  describe('Event Subscriptions', () => {
    it('should notify state changes via EventEmitter', () => {
      return new Promise<void>((resolve) => {
        const stateCallback = (state: any) => {
          if (state.status === 'ready') {
            expect(state.status).toBe('ready');
            orchestrator.off('stateChange', stateCallback);
            resolve();
          }
        };
        
        orchestrator.on('stateChange', stateCallback);
        
        orchestrator.processScanResults([
          { path: '/test/file.pdf', changeType: 'added', lastModified: new Date(), size: 1000 }
        ]);
      });
    });
  });

  describe('State Management', () => {
    it('should check if active correctly', () => {
      expect(orchestrator.isActive()).toBe(true);
    });

    it('should check completion correctly', () => {
      expect(orchestrator.isComplete()).toBe(false);
      
      // Process empty scan results to go to active
      orchestrator.processScanResults([]);
      expect(orchestrator.isComplete()).toBe(true);
    });
  });

  describe('Integration with IndexingOrchestrator', () => {
    it('should call IndexingOrchestrator for file processing', async () => {
      const changes: FileChangeInfo[] = [
        { path: '/test/file.pdf', changeType: 'added', lastModified: new Date(), size: 1000 }
      ];
      
      orchestrator.processScanResults(changes);
      
      const taskId = orchestrator.getNextTask()!;
      orchestrator.startTask(taskId);
      
      // Simulate task processing
      await orchestrator.processTask(taskId);
      
      expect(mockIndexingOrchestrator.processFile).toHaveBeenCalledWith('/test/file.pdf');
    });
  });

  describe('Error Handling', () => {
    it('should handle task failure with retry', () => {
      const changes: FileChangeInfo[] = [
        { path: '/test/file.pdf', changeType: 'added', lastModified: new Date(), size: 1000 }
      ];
      
      orchestrator.processScanResults(changes);
      const taskId = orchestrator.getNextTask()!;
      orchestrator.startTask(taskId);
      
      const result: TaskResult = { 
        taskId, 
        success: false, 
        error: new Error('Processing failed') 
      };
      orchestrator.onTaskComplete(taskId, result);
      
      // Task should be scheduled for retry
      const state = orchestrator.getState();
      const task = state.fileEmbeddingTasks.find(t => t.id === taskId);
      expect(task?.retryCount).toBe(1);
      expect(task?.status).toBe('pending'); // Back to pending for retry
    });
  });
});