import type { 
  FolderLifecycleState, 
  FolderProgress, 
  TaskResult,
  FileChangeInfo
} from './folder-lifecycle-models.js';

/**
 * Domain interface for folder lifecycle orchestration
 * This interface defines the contract without infrastructure dependencies
 */
export interface FolderLifecycleOrchestrator {
  /**
   * Unique identifier for this folder
   */
  readonly folderId: string;

  /**
   * Current state of the folder lifecycle
   */
  readonly currentState: FolderLifecycleState;

  /**
   * Start the scanning phase to detect file changes
   * This will transition the state from active/error to scanning
   */
  startScanning(): Promise<void>;

  /**
   * Handle completion of a task
   * @param taskId The ID of the completed task
   * @param result The result of the task execution
   */
  onTaskComplete(taskId: string, result: TaskResult): void;

  /**
   * Get the current progress of the folder lifecycle
   */
  getProgress(): FolderProgress;

  /**
   * Check if the orchestrator is in an active state (not error)
   */
  isActive(): boolean;

  /**
   * Check if all tasks have been completed
   */
  isComplete(): boolean;

  /**
   * Subscribe to state change events
   * @param callback Function to call when state changes
   * @returns Unsubscribe function
   */
  onStateChange(callback: (newState: FolderLifecycleState) => void): () => void;

  /**
   * Subscribe to progress update events
   * @param callback Function to call when progress updates
   * @returns Unsubscribe function
   */
  onProgressUpdate(callback: (progress: FolderProgress) => void): () => void;

  /**
   * Get the folder path being orchestrated
   */
  getFolderPath(): string;

  /**
   * Process the results of a folder scan
   * This will create tasks based on file changes
   * @param changes The file changes detected during scanning
   */
  processScanResults(changes: FileChangeInfo[]): void;

  /**
   * Get the next task to process
   * Returns null if no tasks are available or max concurrent limit reached
   */
  getNextTask(): string | null;

  /**
   * Mark a task as started
   * @param taskId The ID of the task to start
   */
  startTask(taskId: string): void;

  /**
   * Reset the orchestrator to initial state
   * This clears all tasks and resets to scanning state
   */
  reset(): void;

  /**
   * Dispose of the orchestrator and clean up resources
   */
  dispose(): void;
}