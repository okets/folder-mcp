/**
 * Folder Indexing Queue Service
 * 
 * Manages sequential processing of folder indexing to ensure only one folder
 * indexes at a time. This eliminates memory competition between models and
 * simplifies resource management.
 */

import { EventEmitter } from 'events';
import type { ILoggingService } from '../../di/interfaces.js';
import type { IEmbeddingModel, ModelLoadProgress } from '../../domain/models/embedding-model-interface.js';
import type { IFolderLifecycleManager } from '../../domain/folders/folder-lifecycle-manager.js';

export interface QueuedFolder {
  folderPath: string;
  modelId: string;
  manager: IFolderLifecycleManager;
  priority: 'normal' | 'immediate'; // Immediate for semantic search
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'loading-model' | 'indexing' | 'completed' | 'failed';
  error?: string;
}

export interface QueueStatus {
  currentFolder?: QueuedFolder;
  pendingFolders: QueuedFolder[];
  currentModel?: string;
  isProcessing: boolean;
}

/**
 * Events emitted by the queue
 */
export interface FolderIndexingQueueEvents {
  'queue:added': (folder: QueuedFolder) => void;
  'queue:started': (folder: QueuedFolder) => void;
  'queue:model-loading': (folder: QueuedFolder, progress: ModelLoadProgress) => void;
  'queue:model-loaded': (folder: QueuedFolder, modelId: string) => void;
  'queue:model-unloaded': (modelId: string) => void;
  'queue:completed': (folder: QueuedFolder) => void;
  'queue:failed': (folder: QueuedFolder, error: Error) => void;
  'queue:empty': () => void;
  'queue:paused': (reason: string) => void;
  'queue:resumed': () => void;
}

export class FolderIndexingQueue extends EventEmitter {
  private queue: QueuedFolder[] = [];
  private currentFolder: QueuedFolder | null = null;
  private currentModel: IEmbeddingModel | null = null;
  private currentModelId: string | null = null;
  private isProcessing = false;
  private isPaused = false;
  private pauseReason?: string;
  private modelFactory: any; // Will be injected

  constructor(
    private logger: ILoggingService
  ) {
    super();
  }

  /**
   * Set the model factory for creating embedding models
   */
  setModelFactory(factory: any): void {
    this.modelFactory = factory;
  }

  /**
   * Add a folder to the indexing queue
   */
  async addFolder(
    folderPath: string,
    modelId: string,
    manager: IFolderLifecycleManager,
    priority: 'normal' | 'immediate' = 'normal'
  ): Promise<void> {
    // Check if folder is already in queue
    const existing = this.queue.find(f => f.folderPath === folderPath);
    if (existing) {
      this.logger.debug(`[QUEUE] Folder already in queue: ${folderPath}`);
      return;
    }

    // Check if folder is currently being processed
    if (this.currentFolder?.folderPath === folderPath) {
      this.logger.debug(`[QUEUE] Folder currently being processed: ${folderPath}`);
      return;
    }

    const queuedFolder: QueuedFolder = {
      folderPath,
      modelId,
      manager,
      priority,
      addedAt: new Date(),
      status: 'pending'
    };

    // Add to queue based on priority
    if (priority === 'immediate') {
      // Add after any other immediate priority items, but before normal priority
      const lastImmediateIndex = this.queue.findIndex(f => f.priority === 'normal');
      if (lastImmediateIndex === -1) {
        this.queue.push(queuedFolder);
      } else {
        this.queue.splice(lastImmediateIndex, 0, queuedFolder);
      }
    } else {
      this.queue.push(queuedFolder);
    }

    this.logger.info(`[QUEUE] Added folder to queue: ${folderPath} (priority: ${priority}, position: ${this.queue.length})`);
    this.emit('queue:added', queuedFolder);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  /**
   * Remove a folder from the queue (if not currently processing)
   */
  removeFolder(folderPath: string): boolean {
    const index = this.queue.findIndex(f => f.folderPath === folderPath);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      this.logger.info(`[QUEUE] Removed folder from queue: ${folderPath}`);
      return true;
    }

    // Can't remove if currently processing
    if (this.currentFolder?.folderPath === folderPath) {
      this.logger.warn(`[QUEUE] Cannot remove currently processing folder: ${folderPath}`);
      return false;
    }

    return false;
  }

  /**
   * Pause the queue (for semantic search priority)
   */
  async pause(reason: string): Promise<void> {
    if (this.isPaused) {
      this.logger.debug(`[QUEUE] Already paused: ${this.pauseReason}`);
      return;
    }

    this.isPaused = true;
    this.pauseReason = reason;
    this.logger.info(`[QUEUE] Queue paused: ${reason}`);
    this.emit('queue:paused', reason);

    // If a model is loaded and we're pausing for a different model, unload it
    if (this.currentModel && this.currentFolder) {
      this.logger.info(`[QUEUE] Unloading model ${this.currentModelId} for pause`);
      await this.unloadCurrentModel();
    }
  }

  /**
   * Resume the queue
   */
  resume(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;
    const reason = this.pauseReason;
    delete this.pauseReason;
    this.logger.info(`[QUEUE] Queue resumed (was paused for: ${reason})`);
    this.emit('queue:resumed');

    // Continue processing if there's work to do
    if (this.currentFolder || this.queue.length > 0) {
      this.processNext();
    }
  }

  /**
   * Process a semantic search request with immediate priority
   * This will pause the queue, load the required model, and process the search
   */
  async processSemanticSearch(
    modelId: string,
    searchFunction: (model: IEmbeddingModel) => Promise<any>
  ): Promise<any> {
    this.logger.info(`[QUEUE] Processing semantic search with model: ${modelId}`);

    // Pause regular indexing
    await this.pause('semantic-search');

    try {
      // Load the required model if different from current
      if (this.currentModelId !== modelId) {
        await this.unloadCurrentModel();
        await this.loadModel(modelId, null); // null for no progress tracking in search
      }

      // Execute the search
      const result = await searchFunction(this.currentModel!);
      
      this.logger.info(`[QUEUE] Semantic search completed`);
      return result;

    } finally {
      // Resume normal processing
      this.resume();
    }
  }

  /**
   * Get the current queue status
   */
  getStatus(): QueueStatus {
    const status: QueueStatus = {
      pendingFolders: [...this.queue],
      isProcessing: this.isProcessing
    };
    
    if (this.currentFolder) {
      status.currentFolder = this.currentFolder;
    }
    
    if (this.currentModelId) {
      status.currentModel = this.currentModelId;
    }
    
    return status;
  }

  /**
   * Process the next folder in the queue
   */
  private async processNext(): Promise<void> {
    // Don't process if paused
    if (this.isPaused) {
      this.logger.debug(`[QUEUE] Queue is paused, skipping processNext`);
      return;
    }

    // Check if already processing
    if (this.isProcessing) {
      this.logger.debug(`[QUEUE] Already processing, skipping processNext`);
      return;
    }

    // Get next folder from queue
    const folder = this.queue.shift();
    if (!folder) {
      this.logger.debug(`[QUEUE] Queue is empty`);
      this.currentFolder = null;
      this.emit('queue:empty');
      
      // Unload model when queue is empty to free memory
      if (this.currentModel) {
        await this.unloadCurrentModel();
      }
      return;
    }

    this.isProcessing = true;
    this.currentFolder = folder;
    folder.status = 'loading-model';
    folder.startedAt = new Date();

    this.logger.info(`[QUEUE] Starting processing: ${folder.folderPath} with model ${folder.modelId}`);
    this.emit('queue:started', folder);

    try {
      // Load the model if needed
      if (this.currentModelId !== folder.modelId) {
        await this.unloadCurrentModel();
        await this.loadModel(folder.modelId, folder);
      }

      // Update status to indexing
      folder.status = 'indexing';

      // Start the folder manager's scanning/indexing
      await folder.manager.startScanning();

      // Wait for indexing to complete
      await this.waitForIndexingCompletion(folder);

      // Mark as completed
      folder.status = 'completed';
      folder.completedAt = new Date();
      this.logger.info(`[QUEUE] Completed processing: ${folder.folderPath}`);
      this.emit('queue:completed', folder);

    } catch (error) {
      folder.status = 'failed';
      folder.error = error instanceof Error ? error.message : String(error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[QUEUE] Failed to process folder ${folder.folderPath}:`, errorObj);
      this.emit('queue:failed', folder, errorObj);
    } finally {
      this.currentFolder = null;
      this.isProcessing = false;

      // Process next folder
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      } else {
        this.emit('queue:empty');
        // Unload model when queue is empty
        if (this.currentModel) {
          await this.unloadCurrentModel();
        }
      }
    }
  }

  /**
   * Load a model for processing
   */
  private async loadModel(modelId: string, folder: QueuedFolder | null): Promise<void> {
    this.logger.info(`[QUEUE] Loading model: ${modelId}`);

    if (!this.modelFactory) {
      throw new Error('Model factory not set. Call setModelFactory() first.');
    }

    const progressCallback = folder ? (progress: ModelLoadProgress) => {
      this.logger.debug(`[QUEUE] Model loading progress: ${progress.stage} ${progress.progress || 0}%`);
      this.emit('queue:model-loading', folder, progress);
    } : undefined;

    try {
      // Create and load the model
      this.currentModel = await this.modelFactory.createModel({
        modelId,
        modelType: this.getModelType(modelId)
      });

      if (this.currentModel) {
        await this.currentModel.load(progressCallback);
      }
      this.currentModelId = modelId;

      this.logger.info(`[QUEUE] Model loaded successfully: ${modelId}`);
      if (folder) {
        this.emit('queue:model-loaded', folder, modelId);
      }

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[QUEUE] Failed to load model ${modelId}:`, errorObj);
      throw errorObj;
    }
  }

  /**
   * Unload the current model to free memory
   */
  private async unloadCurrentModel(): Promise<void> {
    if (!this.currentModel) {
      return;
    }

    const modelId = this.currentModelId;
    this.logger.info(`[QUEUE] Unloading model: ${modelId}`);

    try {
      await this.currentModel.unload();
      await this.currentModel.dispose();
      this.currentModel = null;
      this.currentModelId = null;
      
      this.logger.info(`[QUEUE] Model unloaded: ${modelId}`);
      this.emit('queue:model-unloaded', modelId!);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[QUEUE] Error unloading model ${modelId}:`, errorObj);
      // Continue anyway - model reference will be cleared
      this.currentModel = null;
      this.currentModelId = null;
    }
  }

  /**
   * Wait for a folder's indexing to complete
   */
  private async waitForIndexingCompletion(folder: QueuedFolder): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = 1000; // Check every second
      const maxWaitTime = 3600000; // 1 hour max
      const startTime = Date.now();

      const checkStatus = async () => {
        // Check if paused - if so, wait
        if (this.isPaused) {
          setTimeout(checkStatus, checkInterval);
          return;
        }

        const state = folder.manager.getState();
        
        if (state.status === 'active' || state.status === 'ready') {
          resolve();
        } else if (state.status === 'error') {
          reject(new Error(`Indexing failed: ${state.status}`));
        } else if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Indexing timeout'));
        } else {
          // Continue checking
          setTimeout(checkStatus, checkInterval);
        }
      };

      checkStatus();
    });
  }

  /**
   * Determine model type from model ID
   * This is a simplified version - in reality would check against curated models
   */
  private getModelType(modelId: string): 'python' | 'onnx' | 'ollama' {
    if (modelId.includes('onnx') || modelId.includes('ONNX')) {
      return 'onnx';
    } else if (modelId.includes('ollama')) {
      return 'ollama';
    } else {
      return 'python'; // Default to Python models
    }
  }

  /**
   * Stop the queue and clean up
   */
  async stop(): Promise<void> {
    this.logger.info('[QUEUE] Stopping folder indexing queue');
    
    // Clear the queue
    this.queue = [];
    
    // Stop current processing
    if (this.currentFolder) {
      try {
        await this.currentFolder.manager.stop();
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        this.logger.error('[QUEUE] Error stopping current folder:', errorObj);
      }
    }

    // Unload model
    if (this.currentModel) {
      await this.unloadCurrentModel();
    }

    this.currentFolder = null;
    this.isProcessing = false;
    this.isPaused = false;
  }
}