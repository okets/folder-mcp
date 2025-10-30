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
import { gitIgnoreService } from '../../infrastructure/filesystem/gitignore-service.js';
import { getIndexingLogger } from '../../utils/indexing-logger.js';
import { OnnxConfiguration } from '../../infrastructure/config/onnx-configuration.js';

/**
 * Service that manages the complete lifecycle of a single folder
 * including scanning, indexing, and progress tracking
 */
export class FolderLifecycleService extends EventEmitter implements IFolderLifecycleManager {
  private stateMachine: FolderLifecycleStateMachine;
  private taskQueue: FolderTaskQueue;
  private state: FolderLifecycleState;
  private pendingIndexingTasks: Map<string, Promise<any>> = new Map();
  private indexingLogger = getIndexingLogger();
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
    maxConcurrentFiles?: number,
  ) {
    super();
    this.model = model || 'unknown';
    this.stateMachine = new FolderLifecycleStateMachine();
    // Use provided value or fallback to environment variable or default
    const concurrentFiles = maxConcurrentFiles ?? 
      (process.env.MAX_CONCURRENT_FILES 
        ? parseInt(process.env.MAX_CONCURRENT_FILES, 10)
        : 4); // Fallback default from CPM testing
    
    // Log configuration for debugging
    this.logger.debug(`[FolderLifecycleService] Initialized with maxConcurrentFiles=${concurrentFiles} (source: ${
      maxConcurrentFiles !== undefined ? 'constructor param' : 
      process.env.MAX_CONCURRENT_FILES ? 'ENV var' : 
      'default'
    })`);
      
    this.taskQueue = new FolderTaskQueue({
      maxRetries: 3,
      retryDelayMs: 1000,
      maxConcurrentTasks: concurrentFiles,
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
      const extensionFilteredPaths = scanResult.files
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
      this.logger.debug(`[MANAGER-SCAN] Filtered to ${extensionFilteredPaths.length} supported files`);
      
      // Apply .gitignore filtering (optimized to avoid per-file logging)
      this.logger.debug(`[MANAGER-SCAN] Loading .gitignore rules from ${this.folderPath}`);
      const gitIgnore = await gitIgnoreService.loadGitIgnore(this.folderPath);
      
      const filePaths: string[] = [];
      let ignoredCount = 0;
      
      for (const path of extensionFilteredPaths) {
        if (!path) continue;
        
        const shouldIgnore = gitIgnoreService.shouldIgnore(gitIgnore, path, this.folderPath);
        if (shouldIgnore) {
          ignoredCount++;
        } else {
          filePaths.push(path);
        }
      }
      
      this.logger.debug(`[MANAGER-SCAN] After .gitignore filtering: ${filePaths.length} files (${ignoredCount} excluded by .gitignore)`);
      
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
      // Optimization: If already active, skip unnecessary re-transition
      // Periodic scans with no changes should not trigger state updates
      if (this.state.status === 'active') {
        this.logger.debug('[MANAGER-PROCESS] Already active with no changes, skipping re-transition');
        return;
      }

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
        // Collect indexing statistics before transitioning to active
        const indexingStats = await this.collectIndexingStatistics();
        this.logger.debug(`[MANAGER-PROCESS] Collected indexing statistics for no-changes path: ${indexingStats.fileCount} files, ${indexingStats.indexingTimeSeconds}s duration`);

        this.stateMachine.transitionTo('active');
        this.updateState({
          status: 'active',
          lastIndexCompleted: new Date(),
          fileEmbeddingTasks: [], // Empty task list
        });
        // Clear progress message when becoming active
        delete this.state.progressMessage;

        // Store indexing statistics in state for later retrieval (no-changes path)
        (this.state as any).indexingStats = indexingStats;
        
        // Emit scan complete with no tasks
        this.emit('scanComplete', this.getState());

        // Record indexing completion timestamp for re-queue grace period
        this.state.lastIndexingCompletedAt = Date.now();

        // Also emit indexComplete event with statistics for consistency
        this.emit('indexComplete', { ...this.getState(), indexingStats });
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
      fileSize: change.size,
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

    // Start processing tasks and wait for completion
    await this.processTaskQueue();
  }

  private async processTaskQueue(): Promise<void> {
    let lastProgressEmit = Date.now();
    const PROGRESS_THROTTLE_MS = 1000; // Only emit progress every 1 second
    
    // Process all tasks in queue, respecting concurrency limits
    while (this.active && this.state.status === 'indexing') {
      // Check if all tasks are complete
      if (this.isAllTasksComplete()) {
        await this.transitionToActive();
        break;
      }
      
      // Check if the task queue was cleared (fail-fast scenario)
      const stats = this.taskQueue.getStatistics();
      if (stats.pendingTasks === 0 && stats.inProgressTasks === 0 && this.pendingIndexingTasks.size === 0) {
        // Check if there are failed tasks indicating a model loading error
        const failedTasks = this.state.fileEmbeddingTasks.filter(t => t.status === 'error');
        if (failedTasks.length > 0 && failedTasks.some(t => t.errorMessage?.includes('model loading failure'))) {
          this.logger.warn('[MANAGER-QUEUE] Stopping task processing due to model loading failure');
          break;
        }
        
        // If no tasks at all and none in progress, we're done
        if (stats.completedTasks > 0 || stats.failedTasks > 0) {
          this.logger.info('[MANAGER-QUEUE] All tasks processed');
          await this.transitionToActive();
          break;
        }
      }
      
      // Try to start more tasks if we haven't hit the concurrency limit
      const taskId = this.getNextTask();
      if (taskId) {
        this.startTask(taskId);
        
        // Throttled progress update when starting new task
        const now = Date.now();
        if (now - lastProgressEmit > PROGRESS_THROTTLE_MS) {
          this.updateProgress();
          lastProgressEmit = now;
        }
      } else {
        // No tasks available - either at concurrency limit or waiting for tasks
        // Only wait if we have tasks in progress OR tasks scheduled for retry
        if (stats.inProgressTasks > 0 || this.pendingIndexingTasks.size > 0 || stats.retryingTasks > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 500ms
        } else {
          // No tasks in progress, none pending, and none retrying - break to avoid infinite loop
          this.logger.debug('[MANAGER-QUEUE] No tasks available, none in progress, and none retrying');
          break;
        }
      }
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

    // Start async processing
    // Progress updates are now throttled in the main processing loop
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
          // For UpdateEmbeddings: DELETE old document BEFORE adding new one (UPDATE = DELETE + RE-ADD)
          if (task.task === 'UpdateEmbeddings') {
            try {
              await this.sqliteVecStorage.deleteDocument(task.file);
              this.logger.debug(`[MANAGER-UPDATE] Deleted old document before re-indexing: ${task.file}`);
            } catch (deleteError) {
              // If document doesn't exist, that's fine - it might be a new file misclassified as update
              this.logger.debug(`[MANAGER-UPDATE] No existing document to delete (new file or already removed): ${task.file}`);
            }
          }

          // Create progress callback to update chunk progress
          const progressCallback = (totalChunks: number, processedChunks: number) => {
            // Update task in state with chunk progress
            const stateTask = this.state.fileEmbeddingTasks.find(t => t.id === taskId);
            if (stateTask) {
              stateTask.totalChunks = totalChunks;
              stateTask.processedChunks = processedChunks;

              // Trigger progress update to refresh the message
              this.updateProgress();
            }
          };

          // Process file with IndexingOrchestrator to get embeddings and metadata
          // Using per-folder model configuration for embeddings
          const fileResult = await this.indexingOrchestrator.processFile(task.file, this.model, {}, progressCallback);
          
          // Store results in SQLiteVecStorage if we have embeddings
          const fileName = task.file.split('/').pop() || task.file;
          if (fileResult.embeddings && fileResult.metadata && fileResult.embeddings.length > 0) {
            this.logger.info(`[HUGE-DEBUG] ${fileName}: Starting to store ${fileResult.embeddings.length} embeddings`);
            
            // Ensure database is initialized
            if (!this.sqliteVecStorage.isReady()) {
              // Load existing index or initialize if empty (does not wipe existing data)
              const dbPath = `${this.folderPath}/.folder-mcp/embeddings.db`;
              this.logger.info(`[HUGE-DEBUG] ${fileName}: Loading database index from ${dbPath}`);
              await this.sqliteVecStorage.loadIndex(dbPath);
            }
            
            // Store embeddings in SQLite database incrementally
            try {
              this.logger.info(`[HUGE-DEBUG] ${fileName}: Calling addEmbeddings with ${fileResult.embeddings.length} embeddings and ${fileResult.metadata.length} metadata`);
              
              // Validate that embeddings and metadata arrays have matching lengths
              // This should now always be true due to orchestrator fixes, but keep validation
              if (fileResult.embeddings.length !== fileResult.metadata.length) {
                const errorMsg = `CRITICAL: Embeddings/metadata count mismatch in ${fileName}: ${fileResult.embeddings.length} embeddings vs ${fileResult.metadata.length} metadata`;
                this.logger.error(`[HUGE-DEBUG] ${errorMsg}`);
                throw new Error(errorMsg);
              }
              
              await this.sqliteVecStorage.addEmbeddings(fileResult.embeddings, fileResult.metadata);
              this.logger.info(`[HUGE-DEBUG] ${fileName}: Successfully stored embeddings`);

              // Store document-level semantics if available (Sprint 11)
              if (fileResult.documentSemantics) {
                await this.sqliteVecStorage.updateDocumentSemantics(
                  task.file,
                  fileResult.documentSemantics.documentEmbedding,
                  fileResult.documentSemantics.documentKeywords,
                  fileResult.documentSemantics.processingTimeMs
                );
              }
            } catch (dbError) {
              const error = dbError as Error;
              this.logger.error(`[HUGE-DEBUG] ${fileName}: Failed to store embeddings: ${error.message}`, error);
              throw dbError;
            }
          } else {
            this.logger.warn(`[HUGE-DEBUG] ${fileName}: No embeddings generated (embeddings: ${!!fileResult.embeddings}, metadata: ${!!fileResult.metadata}, length: ${fileResult.embeddings?.length || 0})`);
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
            
            const fileName = stateTask.file.split('/').pop() || stateTask.file;
            
            if (chunkCount > 0) {
              this.logger.info(`[FILE-STATE-DEBUG] ${fileName}: Found ${chunkCount} chunks in database, marking as success`);
              try {
                console.error(`[FILE-STATE-DEBUG] About to call markProcessingSuccess for ${stateTask.file}`);
                await this.fileStateService.markProcessingSuccess(stateTask.file, chunkCount);
                this.logger.info(`[FILE-STATE-DEBUG] ${fileName}: Successfully marked as indexed in file_states table`);
                console.error(`[FILE-STATE-DEBUG] File state marked successfully for ${stateTask.file}`);
              } catch (stateError) {
                const error = stateError as Error;
                this.logger.error(`[FILE-STATE-DEBUG] ${fileName}: Failed to mark as success in file_states: ${error.message}`, error);
                console.error(`[FILE-STATE-DEBUG] ERROR marking file state: ${error.message}`);
              }
              
              // Log successful processing for huge files
              if (fileName === 'huge_test.txt' || fileName === 'huge_text.txt') {
                this.indexingLogger.logProcessingComplete(
                  stateTask.file,
                  'SUCCESS',
                  chunkCount,
                  true,
                  'indexed'
                );
              }
            } else {
              this.logger.warn(`[PROCESSING] ${fileName}: No chunks found in database after processing`);
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

    // Update progress (throttled internally)
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
    // All tasks are complete when there are no pending, in-progress, or retrying tasks
    // Failed tasks are considered "complete" (they won't be retried anymore)
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
      
      // Collect indexing statistics ONCE before transitioning to active
      const indexingStats = await this.collectIndexingStatistics();
      this.logger.debug(`[MANAGER-TRANSITION] Collected indexing statistics: ${indexingStats.fileCount} files, ${indexingStats.indexingTimeSeconds}s duration`);

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

      // Store indexing statistics in state for later retrieval (indexing path)
      (this.state as any).indexingStats = indexingStats;

      // Emit final 100% progress event
      this.emit('progressUpdate', finalProgress);

      // Record indexing completion timestamp for re-queue grace period
      this.state.lastIndexingCompletedAt = Date.now();

      // Emit indexComplete event with statistics
      this.emit('indexComplete', { ...this.getState(), indexingStats });
      this.logger.debug('[MANAGER-TRANSITION] Successfully transitioned to active state after model validation');
    }
  }

  getProgress(): FolderProgress {
    const stats = this.taskQueue.getStatistics();
    
    // Calculate total file size across all tasks for weighted progress
    let totalSize = 0;
    for (const task of this.state.fileEmbeddingTasks) {
      totalSize += task.fileSize || 0;
    }
    
    // Calculate file-size weighted progress to prevent regression on large files
    let weightedProgress = 0;
    
    if (totalSize > 0) {
      for (const task of this.state.fileEmbeddingTasks) {
        const fileWeight = (task.fileSize || 0) / totalSize;
        
        if (task.status === 'success') {
          // Completed files contribute their full weight
          weightedProgress += fileWeight * 100;
        } else if (task.status === 'in-progress' && task.totalChunks && task.totalChunks > 0) {
          // In-progress files contribute partial weight based on chunks
          const chunkProgress = (task.processedChunks || 0) / task.totalChunks;
          weightedProgress += fileWeight * chunkProgress * 100;
        }
        // Pending and failed files contribute 0
      }
    } else if (stats.totalTasks > 0) {
      // Fallback to task-based calculation if no file size info available
      const effectiveCompleted = stats.completedTasks + (stats.inProgressTasks * 0.5);
      weightedProgress = (effectiveCompleted / stats.totalTasks) * 100;
    }
    
    const percentage = Math.round(weightedProgress);
    
    // Ensure we don't exceed 99% until truly complete
    const cappedPercentage = (percentage > 99 && (stats.pendingTasks > 0 || stats.inProgressTasks > 0)) 
      ? 99 
      : Math.min(percentage, 100);

    return {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      failedTasks: stats.failedTasks,
      inProgressTasks: stats.inProgressTasks,
      percentage: cappedPercentage
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
    
    // Log scan started
    this.indexingLogger.logScanStarted(this.folderPath, currentFiles.length);
    
    try {
      // Ensure database is initialized before attempting to get fingerprints
      if (!this.sqliteVecStorage.isReady()) {
        this.logger.debug('[MANAGER-DETECT] Database not ready, loading existing index...');
        const dbPath = `${this.folderPath}/.folder-mcp/embeddings.db`;
        await this.sqliteVecStorage.loadIndex(dbPath);
      }
      
      // Check if embeddings exist - if not, force reprocessing of all files
      const embeddingCount = await this.getEmbeddingCount();
      const forceReprocess = embeddingCount === 0;
      if (forceReprocess) {
        this.logger.info('[MANAGER-DETECT] No embeddings found in database, forcing reprocessing of all files');
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
        
        // Override decision if we're forcing reprocessing due to missing embeddings
        if (forceReprocess && !decision.shouldProcess) {
          decision.shouldProcess = true;
          decision.action = 'process';
          decision.reason = 'No embeddings in database - forcing reprocess';
        }
        
        this.logger.debug(`[MANAGER-DETECT] File ${filePath}: ${decision.action} (${decision.reason})`);
        
        // Log file detection decision for debugging
        const fileName = filePath.split('/').pop() || filePath;
        if (fileName === 'huge_test.txt' || fileName === 'huge_text.txt') {
          // Get additional file state info for huge files
          let fileStateInfo: any = {};
          const decisionWithState = decision as any; // Type workaround for logging
          if (decisionWithState.currentState) {
            fileStateInfo = {
              processingState: decisionWithState.currentState.processingState,
              chunkCount: decisionWithState.currentState.chunkCount,
              attemptCount: decisionWithState.currentState.attemptCount
            };
          }
          
          const storedHash = decisionWithState.currentState?.contentHash || null;
          
          this.indexingLogger.logFileDetected(
            filePath,
            contentHash,
            storedHash,
            decision.shouldProcess ? (decision.action === 'retry' ? 'RETRY' : 'PROCESS') : 'SKIP',
            decision.reason,
            fileStateInfo
          );
        }
        
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
          const fileName = filePath.split('/').pop() || filePath;
          
          if (fileName === 'huge_test.txt' || fileName === 'huge_text.txt') {
            this.logger.info(`[HUGE-DEBUG] ${fileName}: Recording processing start in file_states`);
          }
          
          try {
            await this.fileStateService.startProcessing(filePath, contentHash);
            if (fileName === 'huge_test.txt' || fileName === 'huge_text.txt') {
              this.logger.info(`[HUGE-DEBUG] ${fileName}: Successfully recorded in file_states`);
            }
          } catch (stateError) {
            const error = stateError as Error;
            this.logger.error(`[HUGE-DEBUG] ${fileName}: Failed to record processing start: ${error.message}`, error);
          }
          
          // Log processing start for huge files
          if (fileName === 'huge_test.txt' || fileName === 'huge_text.txt') {
            const decisionWithState = decision as any; // Type workaround for logging
            const attemptCount = decisionWithState.currentState?.attemptCount || 1;
            this.indexingLogger.logProcessingStart(filePath, contentHash, attemptCount);
          }
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
      
      // Log scan completion
      this.indexingLogger.logScanCompleted(this.folderPath, toProcessCount, skippedCount);

      // CRITICAL: Detect orphaned records (files in database but no longer on disk)
      // Only run orphan cleanup periodically (once per hour) to avoid performance impact
      await this.detectAndHandleOrphanedRecordsIfNeeded(currentFiles, changes);

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
   * Normalize path for comparison - case-insensitive on Windows, case-sensitive elsewhere
   * Windows filesystems are case-insensitive, so "File.txt" and "file.txt" are the same file
   * Linux/macOS filesystems are case-sensitive, so "File.txt" and "file.txt" are different files
   */
  private normalizePathForComparison(path: string): string {
    return process.platform === 'win32' ? path.toLowerCase() : path;
  }

  /**
   * Detect and handle orphaned database records if enough time has passed since last cleanup
   * Only runs orphan cleanup once per hour to avoid performance impact on frequent scans
   */
  private async detectAndHandleOrphanedRecordsIfNeeded(currentFiles: string[], changes: FileChangeInfo[]): Promise<void> {
    const ORPHAN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

    const now = Date.now();
    const lastCleanup = this.state.lastOrphanCleanup || 0;
    const timeSinceLastCleanup = now - lastCleanup;

    if (timeSinceLastCleanup < ORPHAN_CLEANUP_INTERVAL_MS) {
      this.logger.debug(`[MANAGER-ORPHAN] Skipping orphan cleanup - last run ${Math.round(timeSinceLastCleanup / 1000 / 60)} minutes ago (runs once per hour)`);
      return;
    }

    this.logger.info(`[MANAGER-ORPHAN] Running periodic orphan cleanup (last run: ${Math.round(timeSinceLastCleanup / 1000 / 60)} minutes ago)`);

    try {
      // Get all documents from database
      const allDatabaseDocs = await this.sqliteVecStorage.getAllDocumentPaths();

      // Create a Set of current file paths for fast lookup (platform-aware comparison)
      const currentFilesSet = new Set(currentFiles.map(p => this.normalizePathForComparison(p)));

      // Find orphaned documents (in database but not on disk)
      // Platform-aware comparison: case-insensitive on Windows, case-sensitive on Linux/macOS
      const orphanedDocs = allDatabaseDocs.filter(dbPath =>
        !currentFilesSet.has(this.normalizePathForComparison(dbPath))
      );

      if (orphanedDocs.length > 0) {
        this.logger.info(`[MANAGER-ORPHAN] Found ${orphanedDocs.length} orphaned records to clean up`);

        // Remove orphaned documents using batch deletion (single transaction)
        try {
          this.logger.debug(`[MANAGER-ORPHAN] Starting batch deletion of ${orphanedDocs.length} orphaned records`);
          await this.sqliteVecStorage.deleteDocumentsBatch(orphanedDocs);
          this.logger.info(`[MANAGER-ORPHAN] Orphan cleanup complete: ${orphanedDocs.length} records removed`);
        } catch (batchError) {
          this.logger.error(`[MANAGER-ORPHAN] Batch orphan cleanup failed, falling back to individual deletions:`, batchError instanceof Error ? batchError : new Error(String(batchError)));

          // Fallback: individual deletions with small delay to prevent lock contention
          for (const orphanedPath of orphanedDocs) {
            try {
              this.logger.debug(`[MANAGER-ORPHAN] Removing orphaned record: ${orphanedPath}`);
              await this.sqliteVecStorage.removeDocument(orphanedPath);
              await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay between deletions
              this.logger.debug(`[MANAGER-ORPHAN] Successfully removed orphaned record: ${orphanedPath}`);
            } catch (error) {
              this.logger.warn(`[MANAGER-ORPHAN] Failed to remove orphaned record ${orphanedPath}:`, error);
            }
          }
          this.logger.info(`[MANAGER-ORPHAN] Orphan cleanup complete (fallback method used)`);
        }
      } else {
        this.logger.debug(`[MANAGER-ORPHAN] No orphaned records found - database is clean`);
      }

      // Update last cleanup timestamp
      this.state.lastOrphanCleanup = Date.now();

    } catch (error) {
      this.logger.error(`[MANAGER-ORPHAN] Error during orphan detection:`, error instanceof Error ? error : new Error(String(error)));
      // Don't throw - orphan cleanup is not critical enough to fail the entire scan
    }
  }

  /**
   * Generate content hash for a file
   */
  private generateContentHash(filePath: string): string {
    try {
      const content = readFileSync(filePath);
      const stats = statSync(filePath);
      const hash = createHash('md5');
      
      // Generate stable hash based on content only (not mtime)
      // This prevents re-indexing when files are accessed but not modified
      hash.update(filePath); // Include path for uniqueness
      hash.update(content);
      hash.update(stats.size.toString()); // Include size for quick change detection
      // NOTE: Deliberately NOT including mtime to prevent infinite indexing loops
      // when large files update their access times during processing
      
      const finalHash = hash.digest('hex');
      return finalHash;
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

  private lastProgressUpdateTime = 0;
  private readonly PROGRESS_UPDATE_THROTTLE = 1000; // Minimum 1 second between updates

  private updateProgress(): void {
    // Throttle progress updates to prevent excessive event emissions
    const now = Date.now();
    if (now - this.lastProgressUpdateTime < this.PROGRESS_UPDATE_THROTTLE) {
      return; // Skip this update, too soon since last one
    }
    this.lastProgressUpdateTime = now;
    
    const progress = this.getProgress();
    this.state.progress = progress;
    
    // Log progress updates at reasonable intervals
    const stats = this.taskQueue.getStatistics();
    this.logger.debug(`[MANAGER-PROGRESS] Progress: ${progress.percentage}% | Queue stats: total=${stats.totalTasks}, pending=${stats.pendingTasks}, inProgress=${stats.inProgressTasks}, completed=${stats.completedTasks}, failed=${stats.failedTasks}, retrying=${stats.retryingTasks}`);
    
    // Add detailed progress message for better UX
    if (this.state.status === 'indexing' && progress.totalTasks > 0) {
      // Get in-progress tasks with chunk progress
      const inProgressTasks = this.state.fileEmbeddingTasks.filter(t => t.status === 'in-progress');
      
      let progressMessage = '';
      
      // Build message showing individual file progress (original format)
      if (inProgressTasks.length > 0) {
        const fileProgresses = inProgressTasks.map(task => {
          const filename = task.file.split('/').pop() || task.file;
          
          // Calculate percentage based on chunks for smooth updates
          let percentage = 0;
          if (task.totalChunks && task.totalChunks > 0) {
            percentage = Math.round(((task.processedChunks || 0) / task.totalChunks) * 100);
          }
          
          return `${filename} (${percentage}%)`;
        });
        
        progressMessage = fileProgresses.join(', ');
        progressMessage += ` • ${progress.completedTasks}/${progress.totalTasks} files processed`;
        progressMessage += ` • ${inProgressTasks.length} in progress`;
      } else {
        // Fallback to simpler message when no files are actively processing
        progressMessage = `Processing ${progress.completedTasks} of ${progress.totalTasks} files`;
        
        const filesRemaining = progress.totalTasks - progress.completedTasks;
        if (filesRemaining > 0 && filesRemaining <= 5) {
          progressMessage += ` - Almost done!`;
        }
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
   * Collect indexing statistics for FMDM informational messages
   */
  private async collectIndexingStatistics(): Promise<{ fileCount: number; indexingTimeSeconds: number }> {
    // FIX: Return stored statistics if they exist to prevent time from growing on every periodic sync
    // This early return ensures statistics are calculated only once when transitioning to active,
    // then reused on all subsequent calls (e.g., during FMDM updates every 60 seconds)
    if ((this.state as any).indexingStats) {
      this.logger.debug(`[STATISTICS] Using stored indexing statistics from state`);
      return (this.state as any).indexingStats;
    }

    try {
      // Get file count from embeddings database (most accurate)
      let fileCount = 0;
      try {
        const embeddingCount = await this.getEmbeddingCount();
        // Get distinct file count by querying the documents table
        if (this.sqliteVecStorage && this.sqliteVecStorage.isReady()) {
          const db = this.sqliteVecStorage.getDatabaseManager().getDatabase();
          const result = db.prepare('SELECT COUNT(DISTINCT file_path) as file_count FROM documents').get() as { file_count: number };
          fileCount = result?.file_count || 0;
          this.logger.debug(`[STATISTICS] Database file count: ${fileCount}`);
        }
      } catch (error) {
        this.logger.debug(`[STATISTICS] Could not get database file count, using task count fallback:`, error);
        // Fallback to task queue statistics
        const taskStats = this.taskQueue.getStatistics();
        fileCount = taskStats.totalTasks || 0;
      }
      
      // Calculate indexing duration
      let indexingTimeSeconds = 0;
      const now = new Date();
      
      if (this.state.lastIndexStarted) {
        // Indexing path - use time from index start
        indexingTimeSeconds = Math.round((now.getTime() - this.state.lastIndexStarted.getTime()) / 1000);
        this.logger.debug(`[STATISTICS] Using indexing duration from lastIndexStarted: ${indexingTimeSeconds}s`);
      } else if (this.state.lastScanStarted) {
        // No-changes path - use time from scan start  
        indexingTimeSeconds = Math.round((now.getTime() - this.state.lastScanStarted.getTime()) / 1000);
        this.logger.debug(`[STATISTICS] Using scan duration as indexing time: ${indexingTimeSeconds}s`);
      } else {
        // Fallback - minimal time for immediate transitions
        indexingTimeSeconds = 1;
        this.logger.debug(`[STATISTICS] Using fallback duration: ${indexingTimeSeconds}s`);
      }
      
      return {
        fileCount: Math.max(0, fileCount),
        indexingTimeSeconds: Math.max(1, indexingTimeSeconds) // Minimum 1 second for display
      };
    } catch (error) {
      this.logger.warn(`[STATISTICS] Error collecting indexing statistics:`, error);
      // Return safe fallback values
      return {
        fileCount: 0,
        indexingTimeSeconds: 1
      };
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