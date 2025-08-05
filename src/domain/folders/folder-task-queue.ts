import type { FileEmbeddingTask, TaskStatus } from './folder-lifecycle-models.js';

export interface TaskQueueConfig {
  maxRetries: number;
  retryDelayMs: number;
  maxConcurrentTasks: number;
}

export interface TaskQueueStatistics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  retryingTasks: number;
}

/**
 * Task queue for managing file embedding tasks with retry logic
 */
export class FolderTaskQueue {
  private tasks: Map<string, FileEmbeddingTask> = new Map();
  private pendingQueue: string[] = [];
  private inProgressSet: Set<string> = new Set();
  private completedSet: Set<string> = new Set();
  private failedSet: Set<string> = new Set();
  private retrySchedule: Map<string, number> = new Map(); // taskId -> retry timestamp
  
  constructor(private config: TaskQueueConfig) {}

  /**
   * Add a single task to the queue
   */
  addTask(task: FileEmbeddingTask): void {
    this.tasks.set(task.id, { ...task });
    if (task.status === 'pending') {
      this.pendingQueue.push(task.id);
    }
  }

  /**
   * Add multiple tasks to the queue
   */
  addTasks(tasks: FileEmbeddingTask[]): void {
    tasks.forEach(task => this.addTask(task));
  }

  /**
   * Get the next available task respecting concurrency limits
   */
  getNextTask(): FileEmbeddingTask | null {
    // Check if we've reached the concurrent task limit
    if (this.inProgressSet.size >= this.config.maxConcurrentTasks) {
      return null;
    }

    // Check for tasks ready to retry
    const now = Date.now();
    const readyToRetry: string[] = [];
    
    for (const [taskId, retryTime] of this.retrySchedule.entries()) {
      if (retryTime <= now) {
        readyToRetry.push(taskId);
      }
    }

    // Process retry tasks first
    for (const taskId of readyToRetry) {
      this.retrySchedule.delete(taskId);
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'in-progress';
        task.startedAt = new Date();
        this.inProgressSet.add(taskId);
        return { ...task };
      }
    }

    // Get next pending task
    while (this.pendingQueue.length > 0) {
      const taskId = this.pendingQueue.shift()!;
      const task = this.tasks.get(taskId);
      
      if (task && task.status === 'pending') {
        task.status = 'in-progress';
        task.startedAt = new Date();
        this.inProgressSet.add(taskId);
        return { ...task };
      }
    }

    return null;
  }

  /**
   * Update the status of a task
   */
  updateTaskStatus(taskId: string, status: TaskStatus, errorMessage?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = status;
    this.inProgressSet.delete(taskId);

    switch (status) {
      case 'success':
        task.completedAt = new Date();
        this.completedSet.add(taskId);
        break;
        
      case 'error':
        if (errorMessage) {
          task.errorMessage = errorMessage;
        } else {
          delete task.errorMessage;
        }
        
        if (task.retryCount < task.maxRetries) {
          // Schedule retry with exponential backoff
          task.retryCount++;
          const delay = this.config.retryDelayMs * Math.pow(2, task.retryCount - 1);
          this.retrySchedule.set(taskId, Date.now() + delay);
        } else {
          // Max retries reached
          task.completedAt = new Date();
          this.failedSet.add(taskId);
        }
        break;
    }

    return true;
  }

  /**
   * Get queue size (pending + scheduled for retry)
   */
  getQueueSize(): number {
    return this.pendingQueue.length + this.retrySchedule.size;
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): FileEmbeddingTask[] {
    return this.pendingQueue
      .map(id => this.tasks.get(id))
      .filter((task): task is FileEmbeddingTask => task !== undefined)
      .map(task => ({ ...task }));
  }

  /**
   * Get in-progress tasks
   */
  getInProgressTasks(): FileEmbeddingTask[] {
    return Array.from(this.inProgressSet)
      .map(id => this.tasks.get(id))
      .filter((task): task is FileEmbeddingTask => task !== undefined)
      .map(task => ({ ...task }));
  }

  /**
   * Get completed tasks
   */
  getCompletedTasks(): FileEmbeddingTask[] {
    return Array.from(this.completedSet)
      .map(id => this.tasks.get(id))
      .filter((task): task is FileEmbeddingTask => task !== undefined)
      .map(task => ({ ...task }));
  }

  /**
   * Get failed tasks (exceeded max retries)
   */
  getFailedTasks(): FileEmbeddingTask[] {
    return Array.from(this.failedSet)
      .map(id => this.tasks.get(id))
      .filter((task): task is FileEmbeddingTask => task !== undefined)
      .map(task => ({ ...task }));
  }

  /**
   * Get task by ID
   */
  getTaskById(taskId: string): FileEmbeddingTask | null {
    const task = this.tasks.get(taskId);
    return task ? { ...task } : null;
  }

  /**
   * Get all tasks
   */
  getAllTasks(): FileEmbeddingTask[] {
    return Array.from(this.tasks.values()).map(task => ({ ...task }));
  }

  /**
   * Get queue statistics
   */
  getStatistics(): TaskQueueStatistics {
    return {
      totalTasks: this.tasks.size,
      pendingTasks: this.pendingQueue.length,
      inProgressTasks: this.inProgressSet.size,
      completedTasks: this.completedSet.size,
      failedTasks: this.failedSet.size,
      retryingTasks: this.retrySchedule.size
    };
  }

  /**
   * Clear all tasks
   */
  clearAll(): void {
    this.tasks.clear();
    this.pendingQueue = [];
    this.inProgressSet.clear();
    this.completedSet.clear();
    this.failedSet.clear();
    this.retrySchedule.clear();
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): void {
    for (const taskId of this.completedSet) {
      this.tasks.delete(taskId);
    }
    this.completedSet.clear();
  }
}