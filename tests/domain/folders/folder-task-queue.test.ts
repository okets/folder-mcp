import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FolderTaskQueue } from '../../../src/domain/folders/folder-task-queue.js';
import type { FileEmbeddingTask, TaskStatus } from '../../../src/domain/folders/folder-lifecycle-models.js';

describe('FolderTaskQueue', () => {
  let taskQueue: FolderTaskQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    taskQueue = new FolderTaskQueue({
      maxRetries: 3,
      retryDelayMs: 1000,
      maxConcurrentTasks: 2
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Task Management', () => {
    it('should add tasks to the queue', () => {
      const task: FileEmbeddingTask = {
        id: 'task-1',
        file: '/test/file1.pdf',
        task: 'CreateEmbeddings',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      taskQueue.addTask(task);
      
      expect(taskQueue.getQueueSize()).toBe(1);
      expect(taskQueue.getPendingTasks()).toHaveLength(1);
      expect(taskQueue.getPendingTasks()[0]?.id).toBe('task-1');
    });

    it('should add multiple tasks', () => {
      const tasks: FileEmbeddingTask[] = [
        {
          id: 'task-1',
          file: '/test/file1.pdf',
          task: 'CreateEmbeddings',
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date()
        },
        {
          id: 'task-2',
          file: '/test/file2.docx',
          task: 'UpdateEmbeddings',
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date()
        }
      ];

      taskQueue.addTasks(tasks);
      
      expect(taskQueue.getQueueSize()).toBe(2);
      expect(taskQueue.getPendingTasks()).toHaveLength(2);
    });

    it('should get next available task', () => {
      const task: FileEmbeddingTask = {
        id: 'task-1',
        file: '/test/file1.pdf',
        task: 'CreateEmbeddings',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      taskQueue.addTask(task);
      const nextTask = taskQueue.getNextTask();
      
      expect(nextTask).toBeDefined();
      expect(nextTask?.id).toBe('task-1');
      expect(nextTask?.status).toBe('in-progress');
      expect(nextTask?.startedAt).toBeInstanceOf(Date);
    });

    it('should respect max concurrent tasks limit', () => {
      const tasks: FileEmbeddingTask[] = Array.from({ length: 3 }, (_, i) => ({
        id: `task-${i + 1}`,
        file: `/test/file${i + 1}.pdf`,
        task: 'CreateEmbeddings',
        status: 'pending' as TaskStatus,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      }));

      taskQueue.addTasks(tasks);
      
      // Get first two tasks (max concurrent = 2)
      const task1 = taskQueue.getNextTask();
      const task2 = taskQueue.getNextTask();
      const task3 = taskQueue.getNextTask();
      
      expect(task1).toBeDefined();
      expect(task2).toBeDefined();
      expect(task3).toBeNull(); // Should be null as we've reached the limit
      
      expect(taskQueue.getInProgressTasks()).toHaveLength(2);
    });

    it('should update task status', () => {
      const task: FileEmbeddingTask = {
        id: 'task-1',
        file: '/test/file1.pdf',
        task: 'CreateEmbeddings',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      taskQueue.addTask(task);
      taskQueue.getNextTask(); // Move to in-progress
      
      taskQueue.updateTaskStatus('task-1', 'success');
      
      const completedTasks = taskQueue.getCompletedTasks();
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0]?.status).toBe('success');
      expect(completedTasks[0]?.completedAt).toBeInstanceOf(Date);
    });

    it('should handle task not found', () => {
      const result = taskQueue.updateTaskStatus('non-existent', 'success');
      expect(result).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed tasks with exponential backoff', () => {
      const task: FileEmbeddingTask = {
        id: 'task-1',
        file: '/test/file1.pdf',
        task: 'CreateEmbeddings',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      taskQueue.addTask(task);
      taskQueue.getNextTask(); // Move to in-progress
      
      // First failure
      taskQueue.updateTaskStatus('task-1', 'error', 'First failure');
      
      // Should not be available immediately
      expect(taskQueue.getNextTask()).toBeNull();
      
      // After 1 second (first retry delay)
      vi.advanceTimersByTime(1000);
      const retryTask = taskQueue.getNextTask();
      
      expect(retryTask).toBeDefined();
      expect(retryTask?.retryCount).toBe(1);
      expect(retryTask?.errorMessage).toBe('First failure');
    });

    it('should apply exponential backoff correctly', () => {
      const task: FileEmbeddingTask = {
        id: 'task-1',
        file: '/test/file1.pdf',
        task: 'CreateEmbeddings',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      taskQueue.addTask(task);
      
      // First attempt
      taskQueue.getNextTask();
      taskQueue.updateTaskStatus('task-1', 'error');
      
      // First retry after 1s
      vi.advanceTimersByTime(999);
      expect(taskQueue.getNextTask()).toBeNull();
      vi.advanceTimersByTime(1);
      expect(taskQueue.getNextTask()).toBeDefined();
      
      // Second failure
      taskQueue.updateTaskStatus('task-1', 'error');
      
      // Second retry after 2s (exponential backoff)
      vi.advanceTimersByTime(1999);
      expect(taskQueue.getNextTask()).toBeNull();
      vi.advanceTimersByTime(1);
      expect(taskQueue.getNextTask()).toBeDefined();
      
      // Third failure
      taskQueue.updateTaskStatus('task-1', 'error');
      
      // Third retry after 4s (exponential backoff)
      vi.advanceTimersByTime(3999);
      expect(taskQueue.getNextTask()).toBeNull();
      vi.advanceTimersByTime(1);
      const finalRetry = taskQueue.getNextTask();
      expect(finalRetry).toBeDefined();
      expect(finalRetry?.retryCount).toBe(3);
    });

    it('should not retry beyond max retries', () => {
      const task: FileEmbeddingTask = {
        id: 'task-1',
        file: '/test/file1.pdf',
        task: 'CreateEmbeddings',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      taskQueue.addTask(task);
      
      // Fail the task multiple times
      for (let i = 0; i < 4; i++) {
        taskQueue.getNextTask();
        taskQueue.updateTaskStatus('task-1', 'error');
        vi.advanceTimersByTime(10000); // Advance past any retry delay
      }
      
      // Should not get the task again
      expect(taskQueue.getNextTask()).toBeNull();
      
      // Task should be in failed tasks
      const failedTasks = taskQueue.getFailedTasks();
      expect(failedTasks).toHaveLength(1);
      expect(failedTasks[0]?.id).toBe('task-1');
      expect(failedTasks[0]?.retryCount).toBe(3);
    });
  });

  describe('Queue Statistics', () => {
    it('should provide accurate queue statistics', () => {
      const tasks: FileEmbeddingTask[] = [
        {
          id: 'task-1',
          file: '/test/file1.pdf',
          task: 'CreateEmbeddings',
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date()
        },
        {
          id: 'task-2',
          file: '/test/file2.docx',
          task: 'UpdateEmbeddings',
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date()
        },
        {
          id: 'task-3',
          file: '/test/file3.xlsx',
          task: 'RemoveEmbeddings',
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date()
        }
      ];

      taskQueue.addTasks(tasks);
      
      // Process tasks
      taskQueue.getNextTask(); // task-1 in progress
      taskQueue.getNextTask(); // task-2 in progress
      taskQueue.updateTaskStatus('task-1', 'success');
      taskQueue.updateTaskStatus('task-2', 'error');
      
      const stats = taskQueue.getStatistics();
      
      expect(stats.totalTasks).toBe(3);
      expect(stats.pendingTasks).toBe(1);
      expect(stats.inProgressTasks).toBe(0);
      expect(stats.completedTasks).toBe(1);
      expect(stats.failedTasks).toBe(0);  // Task is retrying, not failed yet
      expect(stats.retryingTasks).toBe(1); // Task-2 is scheduled for retry
    });
  });

  describe('Task Clearing', () => {
    it('should clear all tasks', () => {
      const tasks: FileEmbeddingTask[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i + 1}`,
        file: `/test/file${i + 1}.pdf`,
        task: 'CreateEmbeddings',
        status: 'pending' as TaskStatus,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      }));

      taskQueue.addTasks(tasks);
      taskQueue.getNextTask();
      taskQueue.updateTaskStatus('task-1', 'success');
      
      taskQueue.clearAll();
      
      expect(taskQueue.getQueueSize()).toBe(0);
      expect(taskQueue.getPendingTasks()).toHaveLength(0);
      expect(taskQueue.getInProgressTasks()).toHaveLength(0);
      expect(taskQueue.getCompletedTasks()).toHaveLength(0);
      expect(taskQueue.getFailedTasks()).toHaveLength(0);
    });

    it('should clear completed tasks only', () => {
      const tasks: FileEmbeddingTask[] = Array.from({ length: 3 }, (_, i) => ({
        id: `task-${i + 1}`,
        file: `/test/file${i + 1}.pdf`,
        task: 'CreateEmbeddings',
        status: 'pending' as TaskStatus,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      }));

      taskQueue.addTasks(tasks);
      
      // Complete one task
      taskQueue.getNextTask();
      taskQueue.updateTaskStatus('task-1', 'success');
      
      taskQueue.clearCompleted();
      
      expect(taskQueue.getCompletedTasks()).toHaveLength(0);
      expect(taskQueue.getPendingTasks()).toHaveLength(2);
    });
  });

  describe('Task Retrieval', () => {
    it('should get task by ID', () => {
      const task: FileEmbeddingTask = {
        id: 'task-1',
        file: '/test/file1.pdf',
        task: 'CreateEmbeddings',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      taskQueue.addTask(task);
      
      const retrieved = taskQueue.getTaskById('task-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('task-1');
    });

    it('should return null for non-existent task', () => {
      const retrieved = taskQueue.getTaskById('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should get all tasks', () => {
      const tasks: FileEmbeddingTask[] = Array.from({ length: 3 }, (_, i) => ({
        id: `task-${i + 1}`,
        file: `/test/file${i + 1}.pdf`,
        task: 'CreateEmbeddings',
        status: 'pending' as TaskStatus,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      }));

      taskQueue.addTasks(tasks);
      
      const allTasks = taskQueue.getAllTasks();
      expect(allTasks).toHaveLength(3);
    });
  });
});