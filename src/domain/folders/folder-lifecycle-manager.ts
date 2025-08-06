import { EventEmitter } from 'events';
import type { 
  FolderLifecycleState, 
  FolderProgress
} from './folder-lifecycle-models.js';

/**
 * Domain interface for managing a single folder's lifecycle
 * Handles scanning, indexing, and monitoring for one folder
 */
export interface IFolderLifecycleManager extends EventEmitter {
  /**
   * Unique identifier for this folder
   */
  readonly folderId: string;

  /**
   * Get the current state of the folder lifecycle
   */
  getState(): FolderLifecycleState;

  /**
   * Start the scanning phase to detect file changes
   * Only works if current state is 'pending'
   */
  startScanning(): Promise<void>;

  /**
   * Start the indexing phase to process embedding tasks
   * Only works if current state is 'ready'
   */
  startIndexing(): Promise<void>;

  /**
   * Stop all operations and clean up resources
   */
  stop(): Promise<void>;

  /**
   * Check if the manager is in an active state (not error)
   */
  isActive(): boolean;

  /**
   * Events emitted by the manager:
   * - 'stateChange': When state transitions
   * - 'scanComplete': When scanning finishes
   * - 'indexComplete': When all tasks are processed
   * - 'changesDetected': When file changes are detected in active state
   * - 'error': When an error occurs
   */
}