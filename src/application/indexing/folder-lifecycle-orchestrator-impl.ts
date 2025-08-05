import type { IIndexingOrchestrator } from '../../di/interfaces.js';
import type { FMDMService } from '../../daemon/services/fmdm-service.js';
import type { IFileSystemService } from '../../domain/files/file-system-operations.js';
import type { SQLiteVecStorage } from '../../infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import type { 
  FolderLifecycleOrchestrator 
} from '../../domain/folders/folder-lifecycle-orchestrator.js';
import type { 
  FolderLifecycleState, 
  FolderProgress, 
  TaskResult, 
  FileChangeInfo,
  FileEmbeddingTask,
  FolderStatus
} from '../../domain/folders/folder-lifecycle-models.js';
import { FolderLifecycleStateMachine } from '../../domain/folders/folder-lifecycle-state-machine.js';
import { FolderTaskQueue } from '../../domain/folders/folder-task-queue.js';

/**
 * Implementation of FolderLifecycleOrchestrator that coordinates
 * the complete lifecycle of folder indexing
 */
export class FolderLifecycleOrchestratorImpl implements FolderLifecycleOrchestrator {
  private stateMachine: FolderLifecycleStateMachine;
  private taskQueue: FolderTaskQueue;
  private state: FolderLifecycleState;
  private stateChangeCallbacks: Set<(state: FolderLifecycleState) => void> = new Set();
  private progressCallbacks: Set<(progress: FolderProgress) => void> = new Set();
  private pendingIndexingTasks: Map<string, Promise<any>> = new Map();

  constructor(
    public readonly folderId: string,
    private folderPath: string,
    private indexingOrchestrator: IIndexingOrchestrator,
    private fmdmService: FMDMService,
    private fileSystemService: IFileSystemService,
    private sqliteVecStorage: SQLiteVecStorage
  ) {
    this.stateMachine = new FolderLifecycleStateMachine();
    this.taskQueue = new FolderTaskQueue({
      maxRetries: 3,
      retryDelayMs: 1000,
      maxConcurrentTasks: 2
    });
    
    this.state = {
      folderId: this.folderId,
      folderPath: this.folderPath,
      status: 'scanning',
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
  }

  get currentState(): FolderLifecycleState {
    return { ...this.state };
  }

  async startScanning(): Promise<void> {
    console.error(`[ORCHESTRATOR-SCAN] Starting scan for ${this.folderPath}`);
    
    // Allow starting scan if we're already in scanning (initial state) or can transition
    if (this.state.status !== 'scanning' && !this.stateMachine.canTransitionTo('scanning')) {
      console.error(`[ORCHESTRATOR-SCAN] Cannot transition to scanning from ${this.state.status}`);
      return;
    }

    if (this.state.status !== 'scanning') {
      this.stateMachine.transitionTo('scanning');
    }
    
    this.updateState({ 
      status: 'scanning',
      lastScanStarted: new Date() 
    });
    
    this.fmdmService.updateFolderStatus(this.folderPath, 'scanning');

    try {
      console.error(`[ORCHESTRATOR-SCAN] Scanning folder: ${this.folderPath}`);
      // Perform the actual scan
      const scanResult = await this.fileSystemService.scanFolder(this.folderPath);
      console.error(`[ORCHESTRATOR-SCAN] Found ${scanResult.files.length} files in ${this.folderPath}`);
      console.error(`[ORCHESTRATOR-SCAN] Sample file object:`, scanResult.files[0]);
      
      // Extract file paths from file objects
      const filePaths = scanResult.files.map(file => typeof file === 'string' ? file : file.path || file.filePath || file.absolutePath);
      console.error(`[ORCHESTRATOR-SCAN] Extracted ${filePaths.length} file paths:`, filePaths.slice(0, 3));
      
      const changes = await this.detectChanges(filePaths);
      console.error(`[ORCHESTRATOR-SCAN] Detected ${changes.length} changes in ${this.folderPath}`);
      
      this.updateState({ lastScanCompleted: new Date() });
      this.processScanResults(changes);
    } catch (error) {
      console.error(`[ORCHESTRATOR-SCAN-ERROR] Scan failed for ${this.folderPath}:`, error);
      this.handleError(error as Error, 'Scan failed');
    }
  }

  processScanResults(changes: FileChangeInfo[]): void {
    console.error(`[ORCHESTRATOR-PROCESS] Processing ${changes.length} changes for ${this.folderPath}`);
    
    if (changes.length === 0) {
      console.error(`[ORCHESTRATOR-PROCESS] No changes detected, transitioning to active`);
      // No changes, transition to active
      if (this.stateMachine.canTransitionTo('active')) {
        this.stateMachine.transitionTo('active');
        this.updateState({ 
          status: 'active',
          lastIndexCompleted: new Date()
        });
        this.fmdmService.updateFolderStatus(this.folderPath, 'active');
      }
      return;
    }

    // Create tasks from changes
    const tasks: FileEmbeddingTask[] = changes.map((change, index) => ({
      id: `${this.folderId}-task-${Date.now()}-${index}`,
      file: change.path,
      task: this.getTaskType(change.changeType),
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    }));

    console.error(`[ORCHESTRATOR-PROCESS] Created ${tasks.length} tasks: ${tasks.map(t => `${t.task}:${t.file}`).join(', ')}`);

    this.taskQueue.addTasks(tasks);
    
    // Transition to indexing
    if (this.stateMachine.canTransitionTo('indexing')) {
      this.stateMachine.transitionTo('indexing');
      this.updateState({ 
        status: 'indexing',
        lastIndexStarted: new Date(),
        fileEmbeddingTasks: tasks,
        progress: {
          totalTasks: tasks.length,
          completedTasks: 0,
          failedTasks: 0,
          inProgressTasks: 0,
          percentage: 0
        }
      });
      this.fmdmService.updateFolderStatus(this.folderPath, 'indexing');
      console.error(`[ORCHESTRATOR-PROCESS] Transitioned to indexing with ${tasks.length} tasks`);
    }
  }

  getNextTask(): string | null {
    const task = this.taskQueue.getNextTask();
    return task?.id || null;
  }

  startTask(taskId: string): void {
    const task = this.taskQueue.getTaskById(taskId);
    if (!task) return;

    // Update task in state
    const stateTask = this.state.fileEmbeddingTasks.find(t => t.id === taskId);
    if (stateTask) {
      stateTask.status = 'in-progress';
      stateTask.startedAt = new Date();
    }

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
    if (!task) return;

    switch (task.task) {
      case 'CreateEmbeddings':
      case 'UpdateEmbeddings':
        // Use indexing orchestrator to process the file
        await this.indexingOrchestrator.processFile(task.file);
        break;
        
      case 'RemoveEmbeddings':
        // Use indexing orchestrator to remove the file
        await this.indexingOrchestrator.removeFile(task.file);
        break;
    }
  }

  onTaskComplete(taskId: string, result: TaskResult): void {
    this.taskQueue.updateTaskStatus(
      taskId, 
      result.success ? 'success' : 'error',
      result.error?.message
    );

    // Update task in state
    const stateTask = this.state.fileEmbeddingTasks.find(t => t.id === taskId);
    if (stateTask) {
      if (result.success) {
        stateTask.status = 'success';
        stateTask.completedAt = new Date();
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

    // Check if all tasks are complete
    if (this.isAllTasksComplete()) {
      this.transitionToActive();
    }
  }

  private isAllTasksComplete(): boolean {
    const stats = this.taskQueue.getStatistics();
    return stats.totalTasks > 0 && 
           stats.pendingTasks === 0 && 
           stats.inProgressTasks === 0 &&
           stats.retryingTasks === 0;
  }

  private transitionToActive(): void {
    if (this.stateMachine.canTransitionTo('active')) {
      this.stateMachine.transitionTo('active');
      
      // Set progress to 100% when transitioning to active
      const finalProgress = this.getProgress();
      finalProgress.percentage = 100; // Force 100% completion when active
      
      this.updateState({ 
        status: 'active',
        progress: finalProgress,
        lastIndexCompleted: new Date(),
        fileEmbeddingTasks: [], // Clear tasks
        consecutiveErrors: 0
      });
      
      // Update FMDM with 100% progress and active status
      this.fmdmService.updateFolderProgress(this.folderPath, 100);
      this.fmdmService.updateFolderStatus(this.folderPath, 'active');
      
      // Notify final progress
      this.notifyProgressUpdate(finalProgress);
    }
  }

  getProgress(): FolderProgress {
    const stats = this.taskQueue.getStatistics();
    const percentage = stats.totalTasks > 0 
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

    return {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      failedTasks: stats.failedTasks,
      inProgressTasks: stats.inProgressTasks,
      percentage
    };
  }

  isActive(): boolean {
    return this.state.status !== 'error';
  }

  isComplete(): boolean {
    return this.state.status === 'active' && this.state.fileEmbeddingTasks.length === 0;
  }

  onStateChange(callback: (newState: FolderLifecycleState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  onProgressUpdate(callback: (progress: FolderProgress) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  getFolderPath(): string {
    return this.folderPath;
  }

  reset(): void {
    this.stateMachine.reset();
    this.taskQueue.clearAll();
    this.pendingIndexingTasks.clear();
    
    this.state = {
      folderId: this.folderId,
      folderPath: this.folderPath,
      status: 'scanning',
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
    
    this.notifyStateChange();
  }

  dispose(): void {
    // Cancel any pending tasks
    for (const [taskId, promise] of this.pendingIndexingTasks) {
      // In a real implementation, we'd have cancellation tokens
      this.pendingIndexingTasks.delete(taskId);
    }
    
    this.stateChangeCallbacks.clear();
    this.progressCallbacks.clear();
    this.taskQueue.clearAll();
  }

  private async detectChanges(currentFiles: string[]): Promise<FileChangeInfo[]> {
    console.error(`[ORCHESTRATOR-DETECT] Detecting changes for ${currentFiles.length} files`);
    const changes: FileChangeInfo[] = [];
    
    try {
      const existingFingerprints = await this.sqliteVecStorage.getDocumentFingerprints();
      console.error(`[ORCHESTRATOR-DETECT] Found ${existingFingerprints.size} existing fingerprints`);
      
      for (const filePath of currentFiles) {
        console.error(`[ORCHESTRATOR-DETECT] Processing file: ${filePath}`);
        
        // Get current file metadata
        const fileMetadata = await this.fileSystemService.getFileMetadata(filePath);
        if (!fileMetadata) {
          console.error(`[ORCHESTRATOR-DETECT] No metadata for ${filePath}, skipping`);
          continue;
        }
        
        const existingFingerprint = existingFingerprints.get(filePath);
        const currentHash = await this.fileSystemService.getFileHash(filePath);
        
        console.error(`[ORCHESTRATOR-DETECT] File ${filePath}: existingFingerprint=${existingFingerprint ? 'exists' : 'null'}, currentHash=${currentHash?.substring(0, 8)}...`);
        
        if (!existingFingerprint) {
          console.error(`[ORCHESTRATOR-DETECT] New file detected: ${filePath}`);
          // New file
          changes.push({
            path: filePath,
            changeType: 'added',
            lastModified: new Date(fileMetadata.lastModified),
            size: fileMetadata.size
          });
        } else if (existingFingerprint !== currentHash) {
          console.error(`[ORCHESTRATOR-DETECT] Modified file detected: ${filePath}`);
          // Modified file (hash changed)
          changes.push({
            path: filePath,
            changeType: 'modified',
            lastModified: new Date(fileMetadata.lastModified),
            size: fileMetadata.size,
            hash: currentHash
          });
        } else {
          console.error(`[ORCHESTRATOR-DETECT] File unchanged: ${filePath}`);
        }
      }
      
      // Detect removed files
      const currentFileSet = new Set(currentFiles);
      for (const [filePath, _] of existingFingerprints) {
        if (!currentFileSet.has(filePath)) {
          console.error(`[ORCHESTRATOR-DETECT] Removed file detected: ${filePath}`);
          changes.push({
            path: filePath,
            changeType: 'removed',
            lastModified: new Date(), // We don't have the original lastModified
            size: 0
          });
        }
      }
    } catch (error) {
      console.error(`[ORCHESTRATOR-DETECT-ERROR] Error in detectChanges:`, error);
      throw error;
    }
    
    console.error(`[ORCHESTRATOR-DETECT] Final result: ${changes.length} changes detected`);
    return changes;
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
    this.notifyStateChange();
  }

  private updateProgress(): void {
    const progress = this.getProgress();
    this.state.progress = progress;
    
    // Update FMDM with every progress change
    this.fmdmService.updateFolderProgress(this.folderPath, progress.percentage);
    
    this.notifyProgressUpdate(progress);
  }

  private notifyStateChange(): void {
    const currentState = this.currentState;
    this.stateChangeCallbacks.forEach(callback => callback(currentState));
  }

  private notifyProgressUpdate(progress: FolderProgress): void {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  private handleError(error: Error, context: string): void {
    this.state.consecutiveErrors++;
    this.state.errorMessage = `${context}: ${error.message}`;
    
    if (this.stateMachine.canTransitionTo('error')) {
      this.stateMachine.transitionTo('error');
      this.updateState({ status: 'error' });
      this.fmdmService.updateFolderStatus(this.folderPath, 'error');
    }
  }
}