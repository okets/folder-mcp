import { EventEmitter } from 'events';
import { readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import type { IIndexingOrchestrator, ILoggingService, IFileStateService } from '../../di/interfaces.js';
import type { IFileSystemService } from '../../domain/files/file-system-operations.js';
import type { SQLiteVecStorage } from '../../infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import type { IFolderLifecycleManager } from '../../domain/folders/folder-lifecycle-manager.js';
import type { 
  FolderLifecycleState, 
  FolderProgress, 
  TaskResult, 
  FileChangeInfo,
  FileEmbeddingTask,
  ScanningProgress,
} from '../../domain/folders/folder-lifecycle-models.js';
import { FolderLifecycleStateMachine } from '../../domain/folders/folder-lifecycle-state-machine.js';
import { FolderTaskQueue } from '../../domain/folders/folder-task-queue.js';
import { getSupportedExtensions } from '../../domain/files/supported-extensions.js';
import { EmbeddingErrors } from '../../infrastructure/embeddings/embedding-errors.js';

/**
 * Service that manages the complete lifecycle of a single folder
 * including scanning, indexing, and progress tracking
 */
export class FolderLifecycleService extends EventEmitter implements IFolderLifecycleManager {
  private stateMachine: FolderLifecycleStateMachine;
  private taskQueue: FolderTaskQueue;
  private state: FolderLifecycleState;
  private pendingIndexingTasks: Map<string, Promise<any>> = new Map();
  private model: string;
  private active = true;

  constructor(
    public readonly folderId: string,
    private folderPath: string,
    private indexingOrchestrator: IIndexingOrchestrator,
    private fileSystemService: IFileSystemService,
    private sqliteVecStorage: SQLiteVecStorage,
    private fileStateService: IFileStateService,
    private logger: ILoggingService,
    model?: string,
  ) {
    super();
    this.model = model || 'unknown';
    this.stateMachine = new FolderLifecycleStateMachine();
    this.taskQueue = new FolderTaskQueue({
      maxRetries: 3,
      retryDelayMs: 1000,
      maxConcurrentTasks: 2,
    });
    
    this.state = {
      folderId: this.folderId,
      folderPath: this.folderPath,
      status: 'pending',
      fileEmbeddingTasks: [],
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        inProgressTasks: 0,
        percentage: 0,
      },
      consecutiveErrors: 0,
    };

    // Initialize SQLite database asynchronously
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.logger.debug(`[MANAGER-DB-INIT] Initializing SQLite database for ${this.folderPath}`);
      
      if (!this.sqliteVecStorage.isReady()) {
        // Load existing index or initialize if empty (does not wipe existing data)
        this.logger.debug('[MANAGER-DB-INIT] Database not ready, loading existing index...');
        const dbPath = `${this.folderPath}/.folder-mcp/embeddings.db`;
        await this.sqliteVecStorage.loadIndex(dbPath);
        this.logger.info(`[MANAGER-DB-INIT] SQLite database loaded successfully for ${this.folderPath}`);
      } else {
        this.logger.debug(`[MANAGER-DB-INIT] SQLite database already initialized for ${this.folderPath}`);
      }
    } catch (error) {
      this.logger.error(`[MANAGER-DB-INIT-ERROR] Failed to initialize SQLite database for ${this.folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      
      // Don't fail the entire manager if database initialization fails
      // The system should gracefully degrade
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'Database initialization failed');
    }
  }

  getState(): FolderLifecycleState {
    return { 
      ...this.state,
      model: this.model, 
    };
  }

  get currentState(): FolderLifecycleState {
    return this.getState();
  }

  async stop(): Promise<void> {
    this.logger.debug(`[MANAGER-STOP] Stopping folder manager for ${this.folderPath}`);
    this.active = false;
    
    // Cancel any pending tasks
    for (const [taskId] of this.pendingIndexingTasks) {
      this.pendingIndexingTasks.delete(taskId);
    }
    
    // Clear task queue
    this.taskQueue.clearAll();
    
    // Close SQLite database connections to release file locks (critical for Windows cleanup)
    try {
      if (this.sqliteVecStorage && this.sqliteVecStorage.isReady()) {
        this.logger.debug(`[MANAGER-STOP] Closing SQLite VecStorage connection for ${this.folderPath}`);
        await this.sqliteVecStorage.close();
        this.logger.info(`[MANAGER-STOP] SQLite VecStorage connection closed for ${this.folderPath}`);
      }
    } catch (error) {
      this.logger.warn(`[MANAGER-STOP] Error closing SQLite VecStorage for ${this.folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      // Don't fail the stop operation if database closing fails
    }
    
    // Also close FileStateService database connection
    try {
      if (this.fileStateService) {
        this.logger.debug(`[MANAGER-STOP] Closing FileStateService database connection for ${this.folderPath}`);
        this.fileStateService.close();
        this.logger.info(`[MANAGER-STOP] FileStateService database connection closed for ${this.folderPath}`);
      }
    } catch (error) {
      this.logger.warn(`[MANAGER-STOP] Error closing FileStateService database for ${this.folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      // Don't fail the stop operation if database closing fails
    }
    
    // Emit final state
    this.emit('stateChange', this.getState());
  }

  async startScanning(): Promise<void> {
    this.logger.debug(`[MANAGER-SCAN] Starting scan for ${this.folderPath}`);
    
    // Allow scanning from pending or active states (for change detection)
    if (this.state.status !== 'pending' && this.state.status !== 'active') {
      this.logger.warn(`[MANAGER-SCAN] Cannot start scanning from ${this.state.status} state`);
      return;
    }
    
    // If transitioning from active, log this important event
    if (this.state.status === 'active') {
      this.logger.info(`[MANAGER-SCAN] Re-scanning active folder ${this.folderPath} due to detected changes`);
    }

    // Transition to scanning
    this.stateMachine.transitionTo('scanning');
    this.updateState({ 
      status: 'scanning',
      lastScanStarted: new Date(), 
    });


    try {
      this.logger.debug(`[MANAGER-SCAN] Scanning folder: ${this.folderPath}`);
      // Perform the actual scan
      const scanResult = await this.fileSystemService.scanFolder(this.folderPath);
      this.logger.debug(`[MANAGER-SCAN] Found ${scanResult.files.length} files in ${this.folderPath}`);
      
      // Define supported extensions from centralized configuration
      const supportedExtensions = getSupportedExtensions();
      this.logger.debug(`[MANAGER-SCAN] Supported extensions: ${supportedExtensions.join(', ')}`);
      
      // Extract and filter file paths by supported extensions
      const filePaths = scanResult.files
        .map(file => typeof file === 'string' ? file : file.path || file.filePath || file.absolutePath)
        .filter((path): path is string => {
          if (!path) return false;
          // Check if file has a supported extension
          const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
          const isSupported = supportedExtensions.includes(ext);
          if (!isSupported) {
            this.logger.debug(`[MANAGER-SCAN] Skipping unsupported file: ${path} (extension: ${ext})`);
          }
          return isSupported;
        });
      this.logger.debug(`[MANAGER-SCAN] Filtered to ${filePaths.length} supported files`);
      
      const changes = await this.detectChanges(filePaths);
      this.logger.debug(`[MANAGER-SCAN] Detected ${changes.length} changes in ${this.folderPath}`);
      
      this.updateState({ lastScanCompleted: new Date() });
      await this.processScanResults(changes);
    } catch (error) {
      this.logger.error(`[MANAGER-SCAN-ERROR] Scan failed for ${this.folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.handleError(errorObj, 'Scan failed');
    }
  }

  async processScanResults(changes: FileChangeInfo[]): Promise<void> {
    this.logger.debug(`[MANAGER-PROCESS] Processing ${changes.length} changes for ${this.folderPath}`);
    
    // If we're in pending state, transition to scanning first (for direct test calls)
    if (this.state.status === 'pending' && this.stateMachine.canTransitionTo('scanning')) {
      this.logger.debug('[MANAGER-PROCESS] Auto-transitioning from pending to scanning state');
      this.stateMachine.transitionTo('scanning');
      this.updateState({ status: 'scanning' });
    }
    
    if (changes.length === 0) {
      this.logger.debug('[MANAGER-PROCESS] No changes detected, validating model and embeddings before transitioning to active');
      
      // Validate model before transitioning to active
      const modelValidation = await this.validateModel();
      if (!modelValidation.valid) {
        this.logger.warn(`[MANAGER-PROCESS] Model validation failed: ${modelValidation.errorMessage}`);
        this.handleError(new Error(modelValidation.errorMessage || 'Model validation failed'), 'Model validation failed');
        return;
      }
      
      // CRITICAL FIX: Verify embeddings actually exist before transitioning to active
      // This prevents silent failures where files are processed but embeddings weren't created
      const embeddingValidation = await this.validateEmbeddingsExist();
      if (!embeddingValidation.valid) {
        this.logger.error(`[MANAGER-PROCESS] Embedding validation failed: ${embeddingValidation.errorMessage}`);
        this.handleError(new Error(embeddingValidation.errorMessage || 'No embeddings found despite files being processed'), 'Embedding validation failed');
        return;
      }
      
      // Both model and embedding validation passed, safe to transition to active
      this.logger.debug('[MANAGER-PROCESS] Model and embedding validation passed, transitioning to active');
      
      if (this.stateMachine.canTransitionTo('active')) {
        this.stateMachine.transitionTo('active');
        this.updateState({ 
          status: 'active',
          lastIndexCompleted: new Date(),
          fileEmbeddingTasks: [], // Empty task list
        });
        // Clear progress message when becoming active
        delete this.state.progressMessage;
        // Emit scan complete with no tasks
        this.emit('scanComplete', this.getState());
        this.logger.debug('[MANAGER-PROCESS] Successfully transitioned to active state');
      } else {
        this.logger.error(`[MANAGER-PROCESS] Cannot transition to active from ${this.state.status}`);
      }
      return;
    }

    // Apply file count limits for batch processing to prevent memory overload
    const maxFilesPerBatch = this.getMaxFilesPerBatch();
    const filesToProcess = changes.slice(0, maxFilesPerBatch);
    
    if (changes.length > maxFilesPerBatch) {
      this.logger.warn(`[MANAGER-PROCESS] File count exceeds batch limit: ${changes.length} files found, processing first ${maxFilesPerBatch} files`, {
        totalFiles: changes.length,
        batchLimit: maxFilesPerBatch,
        filesSkipped: changes.length - maxFilesPerBatch,
        folder: this.folderPath
      });
      
      // Store remaining files for next batch (future enhancement)
      // For now, we just log the limitation - production systems should implement
      // proper batch queuing or progressive scanning
    }

    // Create tasks from changes (limited batch)
    const tasks: FileEmbeddingTask[] = filesToProcess.map((change, index) => ({
      id: `${this.folderId}-task-${Date.now()}-${index}`,
      file: change.path,
      task: this.getTaskType(change.changeType),
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
    }));

    this.logger.info(`[MANAGER-PROCESS] Created ${tasks.length} tasks from ${changes.length} detected changes`, {
      batchLimit: maxFilesPerBatch,
      effectiveBatchSize: tasks.length,
      folder: this.folderPath
    });

    this.taskQueue.addTasks(tasks);
    
    // Transition to ready state (waiting for orchestrator to start indexing)
    if (this.stateMachine.canTransitionTo('ready')) {
      this.stateMachine.transitionTo('ready');
      this.updateState({ 
        status: 'ready',
        fileEmbeddingTasks: tasks,
        progress: {
          totalTasks: tasks.length,
          completedTasks: 0,
          failedTasks: 0,
          inProgressTasks: 0,
          percentage: 0,
        },
      });
      
      
      // Emit scan complete with tasks
      this.emit('scanComplete', this.getState());
      this.logger.debug(`[MANAGER-PROCESS] Transitioned to ready with ${tasks.length} tasks`);
    }
  }

  async startIndexing(): Promise<void> {
    this.logger.debug(`[MANAGER-INDEX] Starting indexing for ${this.folderPath}`);
    
    // Only allow indexing from ready state (orchestrator controls transitions)
    if (this.state.status !== 'ready') {
      this.logger.warn(`[MANAGER-INDEX] Cannot start indexing from ${this.state.status} state`);
      return;
    }

    // Log initial task state before starting indexing
    const initialStats = this.taskQueue.getStatistics();
    const initialProgress = this.getProgress();
    this.logger.debug(`[MANAGER-INDEX] Initial state: ${initialStats.totalTasks} total tasks, ${initialStats.pendingTasks} pending, progress: ${initialProgress.percentage}%`);

    // Transition to indexing
    this.stateMachine.transitionTo('indexing');
    this.updateState({ 
      status: 'indexing',
      lastIndexStarted: new Date(), 
    });

    // Start processing tasks
    this.processTaskQueue();
  }

  private async processTaskQueue(): Promise<void> {
    // Process all tasks in queue, respecting concurrency limits
    while (this.active && this.state.status === 'indexing') {
      // Check if all tasks are complete
      if (this.isAllTasksComplete()) {
        await this.transitionToActive();
        break;
      }
      
      // Check if the task queue was cleared (fail-fast scenario)
      const stats = this.taskQueue.getStatistics();
      if (stats.pendingTasks === 0 && this.pendingIndexingTasks.size === 0) {
        // Check if there are failed tasks indicating a model loading error
        const failedTasks = this.state.fileEmbeddingTasks.filter(t => t.status === 'error');
        if (failedTasks.length > 0 && failedTasks.some(t => t.errorMessage?.includes('model loading failure'))) {
          this.logger.warn('[MANAGER-QUEUE] Stopping task processing due to model loading failure');
          break;
        }
      }
      
      // Try to start more tasks if we haven't hit the concurrency limit
      const taskId = this.getNextTask();
      if (taskId) {
        this.startTask(taskId);
      } else {
        // No tasks available (either due to concurrency limit or no pending tasks)
        // Wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Small delay to prevent tight loop
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  getNextTask(): string | null {
    const stats = this.taskQueue.getStatistics();
    this.logger.debug(`[MANAGER-GET-NEXT-TASK] Queue stats before getting task: total=${stats.totalTasks}, pending=${stats.pendingTasks}, inProgress=${stats.inProgressTasks}, completed=${stats.completedTasks}`);
    
    const task = this.taskQueue.getNextTask();
    if (task) {
      this.logger.debug(`[MANAGER-GET-NEXT-TASK] Retrieved task ${task.id} for file: ${task.file}`);
    } else {
      this.logger.debug(`[MANAGER-GET-NEXT-TASK] No task available (concurrency limit: ${stats.inProgressTasks})`);
    }
    
    return task?.id || null;
  }

  startTask(taskId: string): void {
    const task = this.taskQueue.getTaskById(taskId);
    if (!task) {
      this.logger.warn(`[MANAGER-START-TASK] Task ${taskId} not found in queue`);
      return;
    }

    this.logger.debug(`[MANAGER-START-TASK] Starting task ${taskId} for file: ${task.file}`);

    // Update task in state
    const stateTask = this.state.fileEmbeddingTasks.find(t => t.id === taskId);
    if (stateTask) {
      stateTask.status = 'in-progress';
      stateTask.startedAt = new Date();
      this.logger.debug(`[MANAGER-START-TASK] Updated state task ${taskId} to in-progress`);
    } else {
      this.logger.warn(`[MANAGER-START-TASK] State task ${taskId} not found in fileEmbeddingTasks`);
    }

    // Update progress immediately when starting a task
    // This makes the progress bar more responsive
    this.updateProgress();

    // Start async processing
    const processingPromise = this.processTask(taskId);
    this.pendingIndexingTasks.set(taskId, processingPromise);
    
    processingPromise
      .then(() => {
        this.onTaskComplete(taskId, { taskId, success: true });
      })
      .catch((error) => {
        this.onTaskComplete(taskId, { taskId, success: false, error });
      })
      .finally(() => {
        this.pendingIndexingTasks.delete(taskId);
      });
  }

  async processTask(taskId: string): Promise<void> {
    const task = this.taskQueue.getTaskById(taskId);
    if (!task) {
return;
}

    switch (task.task) {
      case 'CreateEmbeddings':
      case 'UpdateEmbeddings':
        try {
          // Process file with IndexingOrchestrator to get embeddings and metadata
          // Using per-folder model configuration for embeddings
          const fileResult = await this.indexingOrchestrator.processFile(task.file, this.model);
          
          // Store results in SQLiteVecStorage if we have embeddings
          if (fileResult.embeddings && fileResult.metadata && fileResult.embeddings.length > 0) {
            this.logger.debug(`[MANAGER-STORE] Storing ${fileResult.embeddings.length} embeddings for ${task.file}`);
            
            // Ensure database is initialized
            if (!this.sqliteVecStorage.isReady()) {
              // Load existing index or initialize if empty (does not wipe existing data)
              const dbPath = `${this.folderPath}/.folder-mcp/embeddings.db`;
              await this.sqliteVecStorage.loadIndex(dbPath);
            }
            
            // Store embeddings in SQLite database incrementally
            await this.sqliteVecStorage.addEmbeddings(fileResult.embeddings, fileResult.metadata);
            this.logger.info(`[MANAGER-STORE] Successfully stored ${fileResult.embeddings.length} embeddings for ${task.file}`);
          } else {
            this.logger.warn(`[MANAGER-STORE] No embeddings generated for ${task.file}`);
          }
        } catch (error: any) {
          // Check if this is a model loading error - if so, fail fast
          const errorMessage = error.message || '';
          if (errorMessage.includes('Python embeddings disabled') || 
              errorMessage.includes('Python 3.8+ required') ||
              errorMessage.includes('Failed to initialize') ||
              errorMessage.includes('Model validation failed')) {
            this.logger.error(`[MANAGER-FAILFAST] Model loading failed, stopping all indexing for ${this.folderPath}: ${errorMessage}`);
            
            // Clear all pending tasks to stop processing
            this.taskQueue.clearAll();
            
            // Clear any pending indexing tasks
            for (const [pendingTaskId] of this.pendingIndexingTasks) {
              this.pendingIndexingTasks.delete(pendingTaskId);
            }
            
            // Mark all remaining tasks as failed
            for (const stateTask of this.state.fileEmbeddingTasks) {
              if (stateTask.status === 'pending' || stateTask.status === 'in-progress') {
                stateTask.status = 'error';
                stateTask.errorMessage = 'Stopped due to model loading failure';
              }
            }
            
            // Transition to error state
            this.state.status = 'error';
            this.state.errorMessage = errorMessage;
            this.emit('stateChange', this.state);
            this.emit('error', error);
            
            // Re-throw the error to be handled by the error handler
            throw error;
          }
          
          // For other errors, let normal error handling continue
          throw error;
        }
        break;
        
      case 'RemoveEmbeddings':
        // Use indexing orchestrator to remove the file
        await this.indexingOrchestrator.removeFile(task.file);
        
        // Also remove from SQLiteVecStorage
        try {
          await this.sqliteVecStorage.removeDocument(task.file);
          this.logger.info(`[MANAGER-REMOVE] Successfully removed ${task.file} from SQLite database`);
        } catch (error) {
          this.logger.error(`[MANAGER-REMOVE-ERROR] Failed to remove ${task.file} from SQLite database:`, error instanceof Error ? error : new Error(String(error)));
        }
        break;
    }
  }

  onTaskComplete(taskId: string, result: TaskResult): void {
    this.taskQueue.updateTaskStatus(
      taskId, 
      result.success ? 'success' : 'error',
      result.error?.message,
    );

    // Update task in state
    const stateTask = this.state.fileEmbeddingTasks.find(t => t.id === taskId);
    if (stateTask) {
      if (result.success) {
        stateTask.status = 'success';
        stateTask.completedAt = new Date();
        
        // Mark file as successfully processed in database
        // Since chunks were already stored, we can query the database for chunk count
        const markProcessed = async () => {
          try {
            const db = this.sqliteVecStorage.getDatabaseManager().getDatabase();
            const stmt = db.prepare(`
              SELECT COUNT(c.id) as chunk_count 
              FROM documents d 
              JOIN chunks c ON d.id = c.document_id 
              WHERE d.file_path = ?
            `);
            const result = stmt.get(stateTask.file) as { chunk_count: number };
            const chunkCount = result?.chunk_count || 0;
            
            if (chunkCount > 0) {
              await this.fileStateService.markProcessingSuccess(stateTask.file, chunkCount);
            } else {
              this.logger.warn(`No chunks found for successfully processed file: ${stateTask.file}`);
            }
          } catch (error) {
            this.logger.warn(`Failed to mark file as processed in database: ${stateTask.file}`, error);
          }
        };
        markProcessed();
      } else {
        // Check if task will be retried
        const queueTask = this.taskQueue.getTaskById(taskId);
        if (queueTask && queueTask.retryCount < queueTask.maxRetries) {
          // Task will be retried
          stateTask.status = 'pending';
          stateTask.retryCount = queueTask.retryCount;
          if (result.error?.message) {
            stateTask.errorMessage = result.error.message;
          } else {
            delete stateTask.errorMessage;
          }
        } else {
          // Task failed permanently
          stateTask.status = 'error';
          stateTask.completedAt = new Date();
          if (result.error?.message) {
            stateTask.errorMessage = result.error.message;
          } else {
            delete stateTask.errorMessage;
          }
        }
      }
    }

    // Update progress
    this.updateProgress();
    
    // Check if all tasks are complete (this will be handled by the processTaskQueue loop)
    if (this.isAllTasksComplete()) {
      this.transitionToActive().catch((error) => {
        this.logger.error('[MANAGER-TASK-COMPLETE] Error during transition to active:', error);
        this.handleError(error instanceof Error ? error : new Error(String(error)), 'Failed to transition to active after task completion');
      });
    }
  }

  private isAllTasksComplete(): boolean {
    const stats = this.taskQueue.getStatistics();
    return stats.totalTasks > 0 && 
           stats.pendingTasks === 0 && 
           stats.inProgressTasks === 0 &&
           stats.retryingTasks === 0;
  }

  private async transitionToActive(): Promise<void> {
    if (this.stateMachine.canTransitionTo('active')) {
      this.logger.debug('[MANAGER-TRANSITION] Validating model before transitioning to active after indexing completion');
      
      // Validate model before transitioning to active
      const modelValidation = await this.validateModel();
      if (!modelValidation.valid) {
        this.logger.warn(`[MANAGER-TRANSITION] Model validation failed: ${modelValidation.errorMessage}`);
        // Pass the error message directly without adding a prefix
        this.handleError(new Error(modelValidation.errorMessage || 'Model validation failed'), modelValidation.errorMessage || 'Model validation failed');
        return;
      }
      
      this.stateMachine.transitionTo('active');
      
      // Set progress to 100% when transitioning to active
      const finalProgress = this.getProgress();
      finalProgress.percentage = 100; // Force 100% completion when active
      
      this.updateState({ 
        status: 'active',
        progress: finalProgress,
        lastIndexCompleted: new Date(),
        fileEmbeddingTasks: [], // Clear tasks
        consecutiveErrors: 0,
      });
      // Clear progress message when becoming active
      delete this.state.progressMessage;
      
      // Emit indexComplete event
      this.emit('indexComplete', this.getState());
      this.logger.debug('[MANAGER-TRANSITION] Successfully transitioned to active state after model validation');
    }
  }

  getProgress(): FolderProgress {
    const stats = this.taskQueue.getStatistics();
    
    // Calculate percentage based on completed files vs total files
    // Show actual percentage for accurate progress tracking
    let percentage = 0;
    
    if (stats.totalTasks > 0) {
      // Include in-progress tasks as partially complete (50% weight)
      // This prevents the progress from appearing stuck while processing large files
      const effectiveCompleted = stats.completedTasks + (stats.inProgressTasks * 0.5);
      percentage = Math.round((effectiveCompleted / stats.totalTasks) * 100);
      
      // Ensure we don't exceed 99% until truly complete
      if (percentage > 99 && (stats.pendingTasks > 0 || stats.inProgressTasks > 0)) {
        percentage = 99;
      }
    }

    return {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      failedTasks: stats.failedTasks,
      inProgressTasks: stats.inProgressTasks,
      percentage,
    };
  }

  isActive(): boolean {
    return this.active && this.state.status !== 'error';
  }

  isComplete(): boolean {
    return this.state.status === 'active' && this.state.fileEmbeddingTasks.length === 0;
  }

  getFolderPath(): string {
    return this.folderPath;
  }


  private async detectChanges(currentFiles: string[]): Promise<FileChangeInfo[]> {
    this.logger.debug(`[MANAGER-DETECT] Starting intelligent scanning for ${currentFiles.length} files`);
    const changes: FileChangeInfo[] = [];
    
    try {
      // Ensure database is initialized before attempting to get fingerprints
      if (!this.sqliteVecStorage.isReady()) {
        this.logger.debug('[MANAGER-DETECT] Database not ready, loading existing index...');
        const dbPath = `${this.folderPath}/.folder-mcp/embeddings.db`;
        await this.sqliteVecStorage.loadIndex(dbPath);
      }
      
      // Phase 1: Intelligent processing decisions using file states
      this.updateScanningProgress({
        phase: 'intelligent-scanning',
        processedFiles: 0,
        totalFiles: currentFiles.length,
        percentage: 0,
      });
      
      let processedCount = 0;
      let skippedCount = 0;
      let toProcessCount = 0;
      
      for (let i = 0; i < currentFiles.length; i++) {
        const filePath = currentFiles[i];
        if (!filePath) {
          this.logger.debug(`[MANAGER-DETECT] Skipping undefined file path at index ${i}`);
          continue;
        }
        
        // Generate content hash for the file
        let contentHash: string;
        try {
          contentHash = this.generateContentHash(filePath);
        } catch (error) {
          this.logger.warn(`[MANAGER-DETECT] Cannot generate hash for ${filePath}, skipping:`, error);
          // Mark file as skipped due to read error
          try {
            await this.fileStateService.markFileSkipped(filePath, 'unknown', `Cannot read file: ${error}`);
          } catch (stateError) {
            this.logger.debug(`[MANAGER-DETECT] Failed to mark file as skipped: ${stateError}`);
          }
          continue;
        }
        
        // Make intelligent processing decision
        const decision = await this.fileStateService.makeProcessingDecision(filePath, contentHash);
        
        this.logger.debug(`[MANAGER-DETECT] File ${filePath}: ${decision.action} (${decision.reason})`);
        
        if (decision.shouldProcess) {
          toProcessCount++;
          
          // Get file metadata for change info
          let fileMetadata: any;
          try {
            fileMetadata = await this.fileSystemService.getFileMetadata(filePath);
          } catch (error) {
            this.logger.warn(`[MANAGER-DETECT] Cannot get metadata for ${filePath}, using defaults`);
            fileMetadata = { lastModified: Date.now() };
          }
          
          // Determine change type based on action
          let changeType: 'added' | 'modified' | 'removed';
          if (decision.action === 'retry') {
            changeType = 'modified'; // Retry as modified
          } else if (decision.action === 'process' && decision.reason.includes('changed')) {
            changeType = 'modified'; // File exists but changed
          } else {
            changeType = 'added'; // New file or first time processing
          }
          
          changes.push({
            path: filePath,
            changeType,
            lastModified: new Date(fileMetadata.lastModified),
            size: fileMetadata.size,
            hash: contentHash,
          });
          
          // Record the start of processing for this file
          await this.fileStateService.startProcessing(filePath, contentHash);
        } else {
          skippedCount++;
          this.logger.debug(`[MANAGER-DETECT] File skipped: ${filePath} - ${decision.reason}`);
        }
        
        processedCount++;
        
        // Update progress
        const progress = Math.round((processedCount / currentFiles.length) * 100);
        const shouldUpdate = processedCount === currentFiles.length || progress % 10 === 0;
        
        if (shouldUpdate) {
          this.updateScanningProgress({
            phase: 'intelligent-scanning',
            processedFiles: processedCount,
            totalFiles: currentFiles.length,
            percentage: progress,
          });
        }
      }
      
      // Phase 2: Clean up state for removed files
      this.updateScanningProgress({
        phase: 'cleanup',
        processedFiles: 0,
        totalFiles: 1,
        percentage: 0,
      });
      
      // Use the file state service to clean up orphaned states
      try {
        const cleanedCount = await this.fileStateService.getStats().then(stats => {
          this.logger.debug(`[MANAGER-DETECT] File state statistics before cleanup:`);
          this.logger.debug(`[MANAGER-DETECT]   Total files: ${stats.total}`);
          this.logger.debug(`[MANAGER-DETECT]   Processing efficiency: ${stats.processingEfficiency.toFixed(1)}%`);
          return 0; // TODO: Implement cleanup when we have the cleanup method in the interface
        });
        
        this.logger.debug(`[MANAGER-DETECT] Cleaned up ${cleanedCount || 0} orphaned file states`);
      } catch (error) {
        this.logger.warn(`[MANAGER-DETECT] Failed to clean up file states:`, error);
      }
      
      this.updateScanningProgress({
        phase: 'cleanup',
        processedFiles: 1,
        totalFiles: 1,
        percentage: 100,
      });
      
      // Summary of intelligent scanning results
      this.logger.info(`[MANAGER-DETECT] Intelligent scanning complete:`);
      this.logger.info(`[MANAGER-DETECT]   Files examined: ${processedCount}`);
      this.logger.info(`[MANAGER-DETECT]   Files to process: ${toProcessCount}`);
      this.logger.info(`[MANAGER-DETECT]   Files skipped: ${skippedCount}`);
      this.logger.info(`[MANAGER-DETECT]   Efficiency: ${((skippedCount / processedCount) * 100).toFixed(1)}% avoided unnecessary processing`);
      
      // Clear scanning progress when done
      this.clearScanningProgress();
      
    } catch (error) {
      this.logger.error('[MANAGER-DETECT-ERROR] Error in detectChanges:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
    
    this.logger.debug(`[MANAGER-DETECT] Final result: ${changes.length} changes detected`);
    return changes;
  }

  /**
   * Generate content hash for a file
   */
  private generateContentHash(filePath: string): string {
    try {
      const content = readFileSync(filePath);
      const stats = statSync(filePath);
      const hash = createHash('md5');
      hash.update(filePath); // Include path for uniqueness
      hash.update(content);
      hash.update(stats.size.toString()); // Include size
      hash.update(stats.mtime.toISOString()); // Include modification time
      return hash.digest('hex');
    } catch (error) {
      this.logger.warn(`[MANAGER-HASH] Cannot generate hash for ${filePath}:`, error);
      throw error;
    }
  }

  private getTaskType(changeType: 'added' | 'modified' | 'removed'): FileEmbeddingTask['task'] {
    switch (changeType) {
      case 'added':
        return 'CreateEmbeddings';
      case 'modified':
        return 'UpdateEmbeddings';
      case 'removed':
        return 'RemoveEmbeddings';
    }
  }

  private updateState(updates: Partial<FolderLifecycleState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChange', this.getState());
  }

  private updateProgress(): void {
    const progress = this.getProgress();
    this.state.progress = progress;
    
    // CRITICAL DEBUG: Always log progress updates to diagnose 0% stuck issue
    const stats = this.taskQueue.getStatistics();
    this.logger.debug(`[MANAGER-PROGRESS-DEBUG] Progress: ${progress.percentage}% | Queue stats: total=${stats.totalTasks}, pending=${stats.pendingTasks}, inProgress=${stats.inProgressTasks}, completed=${stats.completedTasks}, failed=${stats.failedTasks}, retrying=${stats.retryingTasks}`);
    
    // Add detailed progress message for better UX
    if (this.state.status === 'indexing' && progress.totalTasks > 0) {
      const filesRemaining = progress.totalTasks - progress.completedTasks;
      let progressMessage = `Processing ${progress.completedTasks} of ${progress.totalTasks} files`;
      
      if (progress.inProgressTasks > 0) {
        progressMessage += ` (${progress.inProgressTasks} in progress)`;
      }
      
      if (filesRemaining > 0 && filesRemaining <= 5) {
        progressMessage += ` - Almost done!`;
      }
      
      
      // Store progress message in state for UI display
      this.state.progressMessage = progressMessage;
    }
    
    // ENHANCED LOGGING: Log all progress updates during indexing for debugging
    if (this.state.status === 'indexing') {
      this.logger.debug(`[MANAGER-PROGRESS] Indexing progress: ${progress.percentage}% (${progress.completedTasks}/${progress.totalTasks} files complete, ${progress.inProgressTasks} in progress, ${progress.failedTasks} failed)`);
    }
    
    
    // Emit progress update
    this.emit('progressUpdate', progress);
    this.emit('stateChange', this.getState());
  }

  private updateScanningProgress(scanningProgress: ScanningProgress): void {
    this.state.scanningProgress = scanningProgress;
    this.logger.debug(`[MANAGER-SCAN-PROGRESS] ${scanningProgress.phase}: ${scanningProgress.processedFiles}/${scanningProgress.totalFiles} (${scanningProgress.percentage}%)`);
    this.emit('stateChange', this.getState());
  }

  private clearScanningProgress(): void {
    delete this.state.scanningProgress;
    this.emit('stateChange', this.getState());
  }

  private handleError(error: Error, context: string): void {
    this.state.consecutiveErrors++;
    this.state.errorMessage = `${context}: ${error.message}`;
    
    if (this.stateMachine.canTransitionTo('error')) {
      this.stateMachine.transitionTo('error');
      this.updateState({ status: 'error' });
      
      // Only emit error event if there are listeners to avoid unhandled error
      if (this.listenerCount('error') > 0) {
        this.emit('error', error);
      }
    }
  }

  // Convenience methods for tests and external API
  onStateChange(callback: (state: FolderLifecycleState) => void): void {
    this.on('stateChange', callback);
  }

  onProgressUpdate(callback: (progress: FolderProgress) => void): void {
    this.on('progressUpdate', callback);
  }

  async dispose(): Promise<void> {
    // Cleanup method that calls stop() and removes all listeners
    await this.stop();
    this.removeAllListeners();
  }
  
  /**
   * Get maximum files per batch for processing
   * This prevents memory overload from processing too many files simultaneously
   */
  private getMaxFilesPerBatch(): number {
    // No arbitrary file discovery limit - memory constraints are properly handled at:
    // - Embedding batch processing (32 files at a time)
    // - Task queue concurrency limits (2 concurrent tasks)  
    // - Individual file size limits and chunking
    //
    // Large projects (200-500+ files) should be fully indexed, not artificially limited.
    // The file discovery/scanning phase just creates task metadata - it doesn't consume
    // significant memory compared to actual file processing.
    
    return Number.MAX_SAFE_INTEGER; // No limit on file discovery
  }

  reset(): void {
    // Reset the state machine
    this.stateMachine.reset();
    
    // Reset the internal state
    this.state = {
      folderId: this.folderId,
      folderPath: this.folderPath,
      status: 'pending',
      fileEmbeddingTasks: [],
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        inProgressTasks: 0,
        percentage: 0,
      },
      consecutiveErrors: 0,
    };

    // Clear task queue
    this.taskQueue.clearAll();
    
    // Clear pending tasks
    this.pendingIndexingTasks.clear();
    
    // Set as active again
    this.active = true;
    
    // Emit state change
    this.emit('stateChange', this.getState());
  }

  /**
   * Validate that the model can be loaded for this folder
   * Lightweight check - just verify Python/Ollama is available, don't create embedding services
   */
  private async validateModel(): Promise<{ valid: boolean; errorMessage?: string }> {
    try {
      this.logger.debug(`[MANAGER-MODEL-VALIDATION] Lightweight validation for model ${this.model}`);
      
      // Determine model type based on prefix convention:
      // - gpu: = GPU models (use Python service)
      // - cpu: = CPU models (use ONNX, runs locally, no service needed)
      // - ollama: = External Ollama models
      // - Others = Default to Ollama for backward compatibility
      
      if (this.model.startsWith('gpu:')) {
        // GPU models - need Python service
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        try {
          // Use the same Python command detection as PythonEmbeddingService
          const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
          await execAsync(`${pythonCommand} --version`, { timeout: 1000 });
          this.logger.debug(`[MANAGER-MODEL-VALIDATION] Python available for GPU model ${this.model}`);
          return { valid: true };
        } catch (error) {
          const displayName = this.getModelDisplayName(this.model);
          return { valid: false, errorMessage: EmbeddingErrors.pythonNotFound(displayName) };
        }
        
      } else if (this.model.startsWith('cpu:')) {
        // CPU models - run locally via ONNX, no external service needed
        this.logger.debug(`[MANAGER-MODEL-VALIDATION] CPU/ONNX model ${this.model} - no service validation needed`);
        return { valid: true };
        
      } else {
        // Ollama models (explicit ollama: prefix or any other model ID)
        try {
          // Normalize OLLAMA_HOST: trim, remove trailing slashes, and remove /api suffix if present
          const ollamaHost = (process.env.OLLAMA_HOST || 'http://localhost:11434')
            .trim()
            .replace(/\/+$/, '')
            .replace(/\/api$/, '');
          const response = await fetch(`${ollamaHost}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });
          
          if (response.ok) {
            this.logger.debug(`[MANAGER-MODEL-VALIDATION] Ollama available for ${this.model}`);
            return { valid: true };
          } else {
            const displayName = this.getModelDisplayName(this.model);
            return { valid: false, errorMessage: `Ollama not running for ${displayName}` };
          }
        } catch (error) {
          const displayName = this.getModelDisplayName(this.model);
          return { valid: false, errorMessage: `Ollama service not available for ${displayName}` };
        }
      }
      
    } catch (error) {
      const modelDisplayName = this.getModelDisplayName(this.model);
      const errorMessage = error instanceof Error ? error.message : `Model ${modelDisplayName} validation failed`;
      this.logger.error(`[MANAGER-MODEL-VALIDATION] Validation error:`, error instanceof Error ? error : new Error(String(error)));
      return { valid: false, errorMessage };
    }
  }

  /**
   * Validate that embeddings actually exist in the database
   * This prevents silent failures where files are marked as processed but no embeddings were created
   */
  private async validateEmbeddingsExist(): Promise<{ valid: boolean; errorMessage?: string }> {
    try {
      this.logger.debug(`[MANAGER-EMBEDDING-VALIDATION] Checking if embeddings exist in database`);
      
      // Get actual embedding count and file state count from the database
      const embeddingCount = await this.getEmbeddingCount();
      const fileStateCount = await this.getFileStateCount();
      
      if (fileStateCount === 0) {
        // No files have been seen yet, this is a fresh scan - valid to have no embeddings
        this.logger.debug(`[MANAGER-EMBEDDING-VALIDATION] No file states found, fresh scan - validation passed`);
        return { valid: true };
      }
      
      // Check if database is ready
      if (!this.sqliteVecStorage.isReady()) {
        this.logger.debug('[MANAGER-EMBEDDING-VALIDATION] Database not ready, attempting to load...');
        const dbPath = `${this.folderPath}/.folder-mcp/embeddings.db`;
        await this.sqliteVecStorage.loadIndex(dbPath);
      }
      
      this.logger.debug(`[MANAGER-EMBEDDING-VALIDATION] File states: ${fileStateCount}, Embeddings: ${embeddingCount}`);
      
      if (fileStateCount > 0 && embeddingCount === 0) {
        // We have files that have been tracked but no embeddings exist
        const modelDisplayName = this.getModelDisplayName(this.model);
        return { 
          valid: false, 
          errorMessage: `Files detected for processing but no embeddings created. This usually indicates Python dependency issues. ${EmbeddingErrors.pythonDependenciesMissing(modelDisplayName)}`
        };
      }
      
      this.logger.debug(`[MANAGER-EMBEDDING-VALIDATION] Embeddings validation passed: ${embeddingCount} embeddings found`);
      return { valid: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Embedding validation failed';
      this.logger.error(`[MANAGER-EMBEDDING-VALIDATION] Validation error:`, error instanceof Error ? error : new Error(String(error)));
      return { valid: false, errorMessage: `Embedding validation failed: ${errorMessage}` };
    }
  }

  /**
   * Get the actual count of embeddings in the database
   */
  private async getEmbeddingCount(): Promise<number> {
    try {
      // Don't create new connections if service is inactive
      if (!this.active) {
        this.logger.debug(`[MANAGER-EMBEDDING-COUNT] Service inactive, returning 0`);
        return 0;
      }
      
      // Check if database file exists
      const fs = await import('fs');
      const dbPath = `${this.folderPath}/.folder-mcp/embeddings.db`;
      if (!fs.existsSync(dbPath)) {
        this.logger.debug(`[MANAGER-EMBEDDING-COUNT] Database file does not exist: ${dbPath}`);
        return 0;
      }
      
      // Use existing database connection if available
      if (this.sqliteVecStorage && this.sqliteVecStorage.isReady()) {
        try {
          // Use the existing connection through SQLiteVecStorage
          const stats = await this.sqliteVecStorage.getStats();
          return stats.embeddingCount || 0;
        } catch (error) {
          this.logger.debug(`[MANAGER-EMBEDDING-COUNT] Error using existing connection:`, error);
        }
      }
      
      // Fallback: create temporary readonly connection only if service is active
      if (this.active) {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath, { readonly: true });
        
        try {
          // Count embeddings in the embeddings table
          const result = db.prepare('SELECT COUNT(*) as count FROM embeddings').get() as { count: number };
          return result.count;
        } catch (error) {
          this.logger.debug(`[MANAGER-EMBEDDING-COUNT] Error querying embeddings table:`, error);
          return 0;
        } finally {
          db.close();
        }
      }
      
      return 0;
    } catch (error) {
      this.logger.debug(`[MANAGER-EMBEDDING-COUNT] Error accessing database:`, error);
      return 0;
    }
  }

  /**
   * Get the count of file states in the database
   */
  private async getFileStateCount(): Promise<number> {
    try {
      // Don't create new connections if service is inactive
      if (!this.active) {
        this.logger.debug(`[MANAGER-FILE-STATE-COUNT] Service inactive, returning 0`);
        return 0;
      }
      
      // Check if database file exists
      const fs = await import('fs');
      const dbPath = `${this.folderPath}/.folder-mcp/embeddings.db`;
      if (!fs.existsSync(dbPath)) {
        this.logger.debug(`[MANAGER-FILE-STATE-COUNT] Database file does not exist: ${dbPath}`);
        return 0;
      }
      
      // Use existing database connection if available
      if (this.fileStateService) {
        try {
          // Use the existing connection through FileStateService
          const stats = await this.fileStateService.getStats();
          return stats.total || 0;
        } catch (error) {
          this.logger.debug(`[MANAGER-FILE-STATE-COUNT] Error using existing connection:`, error);
        }
      }
      
      // Fallback: create temporary readonly connection only if service is active
      if (this.active) {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath, { readonly: true });
        
        try {
          // Count file states in the file_states table
          const result = db.prepare('SELECT COUNT(*) as count FROM file_states').get() as { count: number };
          return result.count;
        } catch (error) {
          this.logger.debug(`[MANAGER-FILE-STATE-COUNT] Error querying file_states table:`, error);
          return 0;
        } finally {
          db.close();
        }
      }
      
      return 0;
    } catch (error) {
      this.logger.debug(`[MANAGER-FILE-STATE-COUNT] Error accessing database:`, error);
      return 0;
    }
  }

  /**
   * Get model display name from model metadata or fallback to model name
   */
  private getModelDisplayName(modelName: string): string {
    // Import is done here to avoid circular dependencies
    try {
      const { getModelMetadata } = require('../../interfaces/tui-ink/models/modelMetadata.js');
      const metadata = getModelMetadata(modelName);
      return metadata?.displayName || modelName;
    } catch (error) {
      // Fallback to model name if metadata is not available
      return modelName;
    }
  }

}