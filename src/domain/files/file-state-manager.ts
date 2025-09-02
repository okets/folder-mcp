/**
 * File State Management Service
 * 
 * Provides intelligent file processing decisions based on content hashes
 * and previous processing outcomes. This solves the re-indexing problem
 * where corrupted/failed files are attempted repeatedly.
 */

/**
 * File processing states
 */
export enum FileProcessingState {
  /** File is queued for processing */
  PENDING = 'pending',
  
  /** File is currently being processed */
  PROCESSING = 'processing',
  
  /** File was successfully processed and indexed */
  INDEXED = 'indexed',
  
  /** File processing failed due to corruption or other issues */
  FAILED = 'failed',
  
  /** File was skipped (empty, unsupported format, etc.) */
  SKIPPED = 'skipped',
  
  /** File was detected as corrupted and should not be retried */
  CORRUPTED = 'corrupted'
}

/**
 * File state record
 */
export interface FileState {
  /** Absolute path to the file */
  filePath: string;
  
  /** MD5 hash of file content */
  contentHash: string;
  
  /** Current processing state */
  processingState: FileProcessingState;
  
  /** Timestamp of last processing attempt */
  lastAttempt: number;
  
  /** Timestamp of successful processing (if applicable) */
  successTimestamp?: number;
  
  /** Reason for failure/skip (if applicable) */
  failureReason?: string;
  
  /** Number of processing attempts */
  attemptCount: number;
  
  /** Number of chunks generated (for successful files) */
  chunkCount?: number;
}

/**
 * Processing decision based on file state analysis
 */
export interface ProcessingDecision {
  /** Whether the file should be processed */
  shouldProcess: boolean;
  
  /** Reason for the decision */
  reason: string;
  
  /** Current file state (if any) */
  currentState?: FileState;
  
  /** Recommended action */
  action: 'process' | 'skip' | 'retry' | 'ignore';
}

/**
 * File state storage interface
 */
export interface IFileStateStorage {
  /**
   * Get file state by path
   */
  getFileState(filePath: string): Promise<FileState | null>;
  
  /**
   * Set or update file state
   */
  setFileState(state: FileState): Promise<void>;
  
  /**
   * Update processing state for a file
   */
  updateProcessingState(
    filePath: string,
    state: FileProcessingState,
    failureReason?: string
  ): Promise<void>;
  
  /**
   * Mark file as successfully processed
   */
  markFileProcessed(
    filePath: string,
    chunkCount: number
  ): Promise<void>;
  
  /**
   * Get all files with a specific state
   */
  getFilesByState(state: FileProcessingState): Promise<FileState[]>;
  
  /**
   * Clean up states for files that no longer exist
   */
  cleanupMissingFiles(existingPaths: string[]): Promise<number>;
  
  /**
   * Get processing statistics
   */
  getProcessingStats(): Promise<{
    total: number;
    byState: Record<FileProcessingState, number>;
  }>;
}

/**
 * File state manager service
 */
export class FileStateManager {
  private static readonly RETRY_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(private storage: IFileStateStorage) {}

  /**
   * Make intelligent processing decision for a file
   */
  async makeProcessingDecision(
    filePath: string,
    currentContentHash: string
  ): Promise<ProcessingDecision> {
    const existingState = await this.storage.getFileState(filePath);
    
    // File is new - process it
    if (!existingState) {
      return {
        shouldProcess: true,
        reason: 'New file, needs initial processing',
        action: 'process'
      };
    }
    
    // Content hash changed - file was modified, process it
    if (existingState.contentHash !== currentContentHash) {
      return {
        shouldProcess: true,
        reason: 'File content changed, needs reprocessing',
        currentState: existingState,
        action: 'process'
      };
    }

    // Content unchanged - check previous processing outcome
    switch (existingState.processingState) {
      case FileProcessingState.INDEXED:
        return {
          shouldProcess: false,
          reason: 'File already successfully processed with same content',
          currentState: existingState,
          action: 'skip'
        };

      case FileProcessingState.CORRUPTED:
        return {
          shouldProcess: false,
          reason: `File is corrupted: ${existingState.failureReason || 'unknown reason'}`,
          currentState: existingState,
          action: 'ignore'
        };

      case FileProcessingState.SKIPPED:
        return {
          shouldProcess: false,
          reason: `File was skipped: ${existingState.failureReason || 'unsupported format'}`,
          currentState: existingState,
          action: 'skip'
        };

      case FileProcessingState.FAILED:
        // Consider retry if enough time has passed and not too many attempts
        const shouldRetry = this.shouldRetryFailedFile(existingState);
        if (shouldRetry) {
          return {
            shouldProcess: true,
            reason: `Retrying failed file (attempt ${existingState.attemptCount + 1}/${FileStateManager.MAX_RETRY_ATTEMPTS})`,
            currentState: existingState,
            action: 'retry'
          };
        } else {
          return {
            shouldProcess: false,
            reason: `File failed too many times or retry delay not elapsed`,
            currentState: existingState,
            action: 'ignore'
          };
        }

      case FileProcessingState.PROCESSING:
        // File might be stuck in processing state - allow retry if old enough
        const processingAge = Date.now() - existingState.lastAttempt;
        if (processingAge > 60 * 60 * 1000) { // 1 hour timeout
          return {
            shouldProcess: true,
            reason: 'File stuck in processing state, retrying',
            currentState: existingState,
            action: 'retry'
          };
        } else {
          return {
            shouldProcess: false,
            reason: 'File is currently being processed',
            currentState: existingState,
            action: 'skip'
          };
        }

      case FileProcessingState.PENDING:
      default:
        return {
          shouldProcess: true,
          reason: 'File is pending processing',
          currentState: existingState,
          action: 'process'
        };
    }
  }

  /**
   * Record start of file processing
   */
  async startProcessing(filePath: string, contentHash: string): Promise<void> {
    const existingState = await this.storage.getFileState(filePath);
    const attemptCount = existingState ? existingState.attemptCount + 1 : 1;

    const state: FileState = {
      filePath,
      contentHash,
      processingState: FileProcessingState.PROCESSING,
      lastAttempt: Date.now(),
      attemptCount,
      ...(existingState?.successTimestamp !== undefined && { successTimestamp: existingState.successTimestamp })
    };

    await this.storage.setFileState(state);
  }

  /**
   * Record successful processing completion
   */
  async markProcessingSuccess(
    filePath: string,
    chunkCount: number
  ): Promise<void> {
    await this.storage.markFileProcessed(filePath, chunkCount);
  }

  /**
   * Record processing failure
   */
  async markProcessingFailure(
    filePath: string,
    failureReason: string,
    isCorrupted = false
  ): Promise<void> {
    const state = isCorrupted 
      ? FileProcessingState.CORRUPTED 
      : FileProcessingState.FAILED;
    
    await this.storage.updateProcessingState(filePath, state, failureReason);
  }

  /**
   * Mark file as skipped (empty, unsupported, etc.)
   */
  async markFileSkipped(
    filePath: string,
    contentHash: string,
    reason: string
  ): Promise<void> {
    const state: FileState = {
      filePath,
      contentHash,
      processingState: FileProcessingState.SKIPPED,
      lastAttempt: Date.now(),
      attemptCount: 1,
      failureReason: reason
    };

    await this.storage.setFileState(state);
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<{
    total: number;
    byState: Record<FileProcessingState, number>;
    processingEfficiency: number; // percentage of files successfully processed
  }> {
    const stats = await this.storage.getProcessingStats();
    const indexed = stats.byState[FileProcessingState.INDEXED] || 0;
    const processingEfficiency = stats.total > 0 ? (indexed / stats.total) * 100 : 0;

    return {
      ...stats,
      processingEfficiency
    };
  }

  /**
   * Clean up orphaned file states
   */
  async cleanup(currentFilePaths: string[]): Promise<number> {
    return await this.storage.cleanupMissingFiles(currentFilePaths);
  }

  /**
   * Check if a failed file should be retried
   */
  private shouldRetryFailedFile(state: FileState): boolean {
    // Don't retry if too many attempts
    if (state.attemptCount >= FileStateManager.MAX_RETRY_ATTEMPTS) {
      return false;
    }

    // Check if enough time has passed since last attempt
    const timeSinceLastAttempt = Date.now() - state.lastAttempt;
    return timeSinceLastAttempt >= FileStateManager.RETRY_DELAY_MS;
  }
}