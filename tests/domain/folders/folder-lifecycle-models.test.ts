import { describe, it, expect } from 'vitest';
import type {
  FolderStatus,
  FileTaskType,
  TaskStatus,
  FileEmbeddingTask,
  FolderProgress,
  FolderLifecycleState,
  TaskResult,
  LifecycleStateChangeEvent,
  TaskStatusChangeEvent,
  LifecycleConfiguration,
  FileChangeInfo,
  ScanResult
} from '../../../src/domain/folders/folder-lifecycle-models.js';

describe('FolderLifecycleModels', () => {
  describe('Type Definitions', () => {
    it('should allow valid FolderStatus values', () => {
      const validStatuses: FolderStatus[] = ['scanning', 'indexing', 'active', 'error'];
      expect(validStatuses).toHaveLength(4);
    });

    it('should allow valid FileTaskType values', () => {
      const validTaskTypes: FileTaskType[] = ['CreateEmbeddings', 'UpdateEmbeddings', 'RemoveEmbeddings'];
      expect(validTaskTypes).toHaveLength(3);
    });

    it('should allow valid TaskStatus values', () => {
      const validTaskStatuses: TaskStatus[] = ['pending', 'in-progress', 'success', 'error'];
      expect(validTaskStatuses).toHaveLength(4);
    });
  });

  describe('FileEmbeddingTask', () => {
    it('should create a valid FileEmbeddingTask', () => {
      const task: FileEmbeddingTask = {
        id: 'task-123',
        file: '/path/to/file.pdf',
        task: 'CreateEmbeddings',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      expect(task.id).toBe('task-123');
      expect(task.file).toBe('/path/to/file.pdf');
      expect(task.task).toBe('CreateEmbeddings');
      expect(task.status).toBe('pending');
      expect(task.retryCount).toBe(0);
      expect(task.maxRetries).toBe(3);
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it('should allow optional fields', () => {
      const task: FileEmbeddingTask = {
        id: 'task-456',
        file: '/path/to/file.docx',
        task: 'UpdateEmbeddings',
        status: 'error',
        errorMessage: 'Failed to process',
        retryCount: 1,
        maxRetries: 3,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date()
      };

      expect(task.errorMessage).toBe('Failed to process');
      expect(task.startedAt).toBeInstanceOf(Date);
      expect(task.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('FolderProgress', () => {
    it('should create a valid FolderProgress', () => {
      const progress: FolderProgress = {
        totalTasks: 100,
        completedTasks: 45,
        failedTasks: 2,
        inProgressTasks: 3,
        percentage: 45
      };

      expect(progress.totalTasks).toBe(100);
      expect(progress.completedTasks).toBe(45);
      expect(progress.failedTasks).toBe(2);
      expect(progress.inProgressTasks).toBe(3);
      expect(progress.percentage).toBe(45);
    });
  });

  describe('FolderLifecycleState', () => {
    it('should create initial scanning state', () => {
      const state: FolderLifecycleState = {
        folderId: 'folder-123',
        folderPath: '/test/folder',
        status: 'scanning',
        lastScanStarted: new Date(),
        fileEmbeddingTasks: [],
        progress: {
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          inProgressTasks: 0,
          percentage: 0
        },
        consecutiveErrors: 0
      };

      expect(state.status).toBe('scanning');
      expect(state.fileEmbeddingTasks).toHaveLength(0);
      expect(state.progress.totalTasks).toBe(0);
    });

    it('should create indexing state with tasks', () => {
      const tasks: FileEmbeddingTask[] = [
        {
          id: 'task-1',
          file: 'file1.pdf',
          task: 'CreateEmbeddings',
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date()
        },
        {
          id: 'task-2',
          file: 'file2.docx',
          task: 'UpdateEmbeddings',
          status: 'in-progress',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date()
        }
      ];

      const state: FolderLifecycleState = {
        folderId: 'folder-123',
        folderPath: '/test/folder',
        status: 'indexing',
        lastScanStarted: new Date(),
        lastScanCompleted: new Date(),
        lastIndexStarted: new Date(),
        fileEmbeddingTasks: tasks,
        progress: {
          totalTasks: 2,
          completedTasks: 0,
          failedTasks: 0,
          inProgressTasks: 1,
          percentage: 0
        },
        consecutiveErrors: 0
      };

      expect(state.status).toBe('indexing');
      expect(state.fileEmbeddingTasks).toHaveLength(2);
      expect(state.progress.inProgressTasks).toBe(1);
    });

    it('should create active state', () => {
      const state: FolderLifecycleState = {
        folderId: 'folder-123',
        folderPath: '/test/folder',
        status: 'active',
        lastScanStarted: new Date(),
        lastScanCompleted: new Date(),
        lastIndexStarted: new Date(),
        lastIndexCompleted: new Date(),
        fileEmbeddingTasks: [],
        progress: {
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          inProgressTasks: 0,
          percentage: 100
        },
        consecutiveErrors: 0
      };

      expect(state.status).toBe('active');
      expect(state.lastIndexCompleted).toBeInstanceOf(Date);
      expect(state.progress.percentage).toBe(100);
    });

    it('should create error state', () => {
      const state: FolderLifecycleState = {
        folderId: 'folder-123',
        folderPath: '/test/folder',
        status: 'error',
        errorMessage: 'Failed to connect to embedding service',
        fileEmbeddingTasks: [],
        progress: {
          totalTasks: 10,
          completedTasks: 3,
          failedTasks: 7,
          inProgressTasks: 0,
          percentage: 30
        },
        consecutiveErrors: 3
      };

      expect(state.status).toBe('error');
      expect(state.errorMessage).toBe('Failed to connect to embedding service');
      expect(state.consecutiveErrors).toBe(3);
    });
  });

  describe('TaskResult', () => {
    it('should create successful TaskResult', () => {
      const result: TaskResult = {
        taskId: 'task-123',
        success: true,
        metadata: {
          duration: 1500,
          chunksProcessed: 10
        }
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.metadata?.duration).toBe(1500);
    });

    it('should create failed TaskResult', () => {
      const result: TaskResult = {
        taskId: 'task-123',
        success: false,
        error: new Error('Processing failed')
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Processing failed');
    });
  });

  describe('LifecycleStateChangeEvent', () => {
    it('should create state change event', () => {
      const event: LifecycleStateChangeEvent = {
        folderId: 'folder-123',
        previousStatus: 'scanning',
        newStatus: 'indexing',
        timestamp: new Date()
      };

      expect(event.previousStatus).toBe('scanning');
      expect(event.newStatus).toBe('indexing');
      expect(event.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('TaskStatusChangeEvent', () => {
    it('should create task status change event', () => {
      const event: TaskStatusChangeEvent = {
        folderId: 'folder-123',
        taskId: 'task-456',
        previousStatus: 'pending',
        newStatus: 'in-progress',
        timestamp: new Date()
      };

      expect(event.taskId).toBe('task-456');
      expect(event.previousStatus).toBe('pending');
      expect(event.newStatus).toBe('in-progress');
    });
  });

  describe('LifecycleConfiguration', () => {
    it('should create valid configuration', () => {
      const config: LifecycleConfiguration = {
        maxRetries: 3,
        retryDelayMs: 1000,
        maxConcurrentTasks: 5,
        progressThrottleMs: 500,
        scanIntervalMs: 60000
      };

      expect(config.maxRetries).toBe(3);
      expect(config.retryDelayMs).toBe(1000);
      expect(config.maxConcurrentTasks).toBe(5);
      expect(config.progressThrottleMs).toBe(500);
      expect(config.scanIntervalMs).toBe(60000);
    });
  });

  describe('FileChangeInfo', () => {
    it('should create file change info for added file', () => {
      const change: FileChangeInfo = {
        path: '/test/new-file.pdf',
        changeType: 'added',
        lastModified: new Date(),
        size: 1024000
      };

      expect(change.changeType).toBe('added');
      expect(change.size).toBe(1024000);
      expect(change.hash).toBeUndefined();
    });

    it('should create file change info with hash', () => {
      const change: FileChangeInfo = {
        path: '/test/modified-file.docx',
        changeType: 'modified',
        lastModified: new Date(),
        size: 2048000,
        hash: 'sha256:abcdef123456'
      };

      expect(change.changeType).toBe('modified');
      expect(change.hash).toBe('sha256:abcdef123456');
    });
  });

  describe('ScanResult', () => {
    it('should create scan result with changes', () => {
      const scanResult: ScanResult = {
        addedFiles: [
          {
            path: '/test/new1.pdf',
            changeType: 'added',
            lastModified: new Date(),
            size: 1000
          }
        ],
        modifiedFiles: [
          {
            path: '/test/existing.docx',
            changeType: 'modified',
            lastModified: new Date(),
            size: 2000
          }
        ],
        removedFiles: [
          {
            path: '/test/deleted.xlsx',
            changeType: 'removed',
            lastModified: new Date(),
            size: 0
          }
        ],
        totalFiles: 10,
        scanDuration: 1500
      };

      expect(scanResult.addedFiles).toHaveLength(1);
      expect(scanResult.modifiedFiles).toHaveLength(1);
      expect(scanResult.removedFiles).toHaveLength(1);
      expect(scanResult.totalFiles).toBe(10);
      expect(scanResult.scanDuration).toBe(1500);
    });

    it('should create empty scan result', () => {
      const scanResult: ScanResult = {
        addedFiles: [],
        modifiedFiles: [],
        removedFiles: [],
        totalFiles: 5,
        scanDuration: 100
      };

      expect(scanResult.addedFiles).toHaveLength(0);
      expect(scanResult.modifiedFiles).toHaveLength(0);
      expect(scanResult.removedFiles).toHaveLength(0);
    });
  });
});