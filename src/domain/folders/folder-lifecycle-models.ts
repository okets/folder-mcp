/**
 * Domain models for folder lifecycle orchestration
 * These models represent the core business logic without infrastructure dependencies
 */

// Core lifecycle states
export type FolderStatus = 'pending' | 'scanning' | 'ready' | 'indexing' | 'active' | 'error';

// Task types for file operations
export type FileTaskType = 'CreateEmbeddings' | 'UpdateEmbeddings' | 'RemoveEmbeddings';

// Task execution status
export type TaskStatus = 'pending' | 'in-progress' | 'success' | 'error';

/**
 * Represents a single file embedding task
 */
export interface FileEmbeddingTask {
  id: string;
  file: string;
  task: FileTaskType;
  status: TaskStatus;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Progress tracking for the folder lifecycle
 */
export interface FolderProgress {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  inProgressTasks: number;
  percentage: number;
}

/**
 * Scanning progress for bidirectional file comparison
 */
export interface ScanningProgress {
  phase: 'folder-to-db' | 'db-to-folder';
  processedFiles: number;
  totalFiles: number;
  percentage: number;
}

/**
 * Complete state of a folder's lifecycle
 */
export interface FolderLifecycleState {
  folderId: string;
  folderPath: string;
  status: FolderStatus;
  model?: string;
  lastScanStarted?: Date;
  lastScanCompleted?: Date;
  lastIndexStarted?: Date;
  lastIndexCompleted?: Date;
  fileEmbeddingTasks: FileEmbeddingTask[];
  progress: FolderProgress;
  scanningProgress?: ScanningProgress;
  errorMessage?: string;
  consecutiveErrors: number;
}

/**
 * Result of a task execution
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Event emitted when lifecycle state changes
 */
export interface LifecycleStateChangeEvent {
  folderId: string;
  previousStatus: FolderStatus;
  newStatus: FolderStatus;
  timestamp: Date;
}

/**
 * Event emitted when task status changes
 */
export interface TaskStatusChangeEvent {
  folderId: string;
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  timestamp: Date;
}

/**
 * Configuration for lifecycle orchestration
 */
export interface LifecycleConfiguration {
  maxRetries: number;
  retryDelayMs: number;
  maxConcurrentTasks: number;
  progressThrottleMs: number;
  scanIntervalMs: number;
}

/**
 * File change information from scanning
 */
export interface FileChangeInfo {
  path: string;
  changeType: 'added' | 'modified' | 'removed';
  lastModified: Date;
  size: number;
  hash?: string;
}

/**
 * Result of a folder scan operation
 */
export interface ScanResult {
  addedFiles: FileChangeInfo[];
  modifiedFiles: FileChangeInfo[];
  removedFiles: FileChangeInfo[];
  totalFiles: number;
  scanDuration: number;
}