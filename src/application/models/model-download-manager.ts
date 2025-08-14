import { ONNXDownloader, DownloadProgress } from '../../infrastructure/embeddings/onnx/onnx-downloader.js';
import { ModelCompatibilityEvaluator, CuratedModel } from '../../domain/models/model-evaluator.js';
import { IFMDMService } from '../../daemon/services/fmdm-service.js';

export interface ModelDownloadRequest {
  modelId: string;
  requestingFolders: string[];
  priority: 'high' | 'normal' | 'low';
}

export interface ActiveDownload {
  modelId: string;
  progress: number;
  affectedFolders: string[];
  startTime: Date;
  status: 'downloading' | 'verifying' | 'completed' | 'failed';
  error?: string;
}

export class GlobalModelDownloadManager {
  private onnxDownloader: ONNXDownloader;
  private evaluator: ModelCompatibilityEvaluator;
  private activeDownloads: Map<string, ActiveDownload> = new Map();
  private downloadQueue: ModelDownloadRequest[] = [];
  private isProcessingQueue = false;

  constructor(
    private fmdmService: IFMDMService,
    cacheDirectory?: string
  ) {
    this.onnxDownloader = new ONNXDownloader(cacheDirectory ? { cacheDirectory } : {});
    this.evaluator = new ModelCompatibilityEvaluator();
  }

  /**
   * Request download of a model for specific folders
   * Prevents duplicate downloads and queues requests
   */
  async requestModelDownload(
    modelId: string, 
    requestingFolders: string[], 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    // Check if model is already downloaded
    if (await this.isModelAvailable(modelId)) {
      console.log(`✅ Model ${modelId} already available`);
      this.fmdmService.updateModelDownloadStatus(modelId, 'completed');
      return;
    }

    // Check if download is already active
    if (this.activeDownloads.has(modelId)) {
      const activeDownload = this.activeDownloads.get(modelId)!;
      // Add requesting folders to existing download
      const newFolders = requestingFolders.filter(
        folder => !activeDownload.affectedFolders.includes(folder)
      );
      activeDownload.affectedFolders.push(...newFolders);
      console.log(`📥 Added ${newFolders.length} folders to existing download of ${modelId}`);
      return;
    }

    // Check if already in queue
    const existingRequest = this.downloadQueue.find(req => req.modelId === modelId);
    if (existingRequest) {
      // Merge requesting folders and upgrade priority if needed
      const newFolders = requestingFolders.filter(
        folder => !existingRequest.requestingFolders.includes(folder)
      );
      existingRequest.requestingFolders.push(...newFolders);
      
      if (priority === 'high' && existingRequest.priority !== 'high') {
        existingRequest.priority = 'high';
        // Re-sort queue by priority
        this.sortQueueByPriority();
      }
      
      console.log(`📋 Updated queue request for ${modelId} with ${newFolders.length} new folders`);
      return;
    }

    // Add to queue
    this.downloadQueue.push({
      modelId,
      requestingFolders: [...requestingFolders],
      priority
    });

    this.sortQueueByPriority();
    console.log(`📋 Queued download request for ${modelId} (${requestingFolders.length} folders, priority: ${priority})`);

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      void this.processDownloadQueue();
    }
  }

  /**
   * Check if a model is available locally
   */
  async isModelAvailable(modelId: string): Promise<boolean> {
    try {
      const model = this.evaluator.getModelById(modelId);
      if (!model) {
        return false;
      }

      // Check ONNX models
      if (modelId.startsWith('folder-mcp-lite:')) {
        return await this.onnxDownloader.isModelAvailable(modelId);
      }

      // For GPU models, we'd check if they're in HuggingFace cache
      // For now, assume they need to be downloaded each time
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get current download status for a model
   */
  getDownloadStatus(modelId: string): ActiveDownload | null {
    return this.activeDownloads.get(modelId) || null;
  }

  /**
   * Get all active downloads
   */
  getActiveDownloads(): ActiveDownload[] {
    return Array.from(this.activeDownloads.values());
  }

  /**
   * Get download queue status
   */
  getQueueStatus(): {
    queueLength: number;
    activeDownloads: number;
    requests: ModelDownloadRequest[];
  } {
    return {
      queueLength: this.downloadQueue.length,
      activeDownloads: this.activeDownloads.size,
      requests: [...this.downloadQueue]
    };
  }

  /**
   * Process the download queue sequentially
   */
  private async processDownloadQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.downloadQueue.length > 0) {
        const request = this.downloadQueue.shift()!;
        await this.executeDownload(request);
      }
    } catch (error) {
      console.error('Error processing download queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Execute a single download request
   */
  private async executeDownload(request: ModelDownloadRequest): Promise<void> {
    const { modelId, requestingFolders } = request;

    // Create active download record
    const activeDownload: ActiveDownload = {
      modelId,
      progress: 0,
      affectedFolders: [...requestingFolders],
      startTime: new Date(),
      status: 'downloading'
    };

    this.activeDownloads.set(modelId, activeDownload);

    // Update FMDM to show downloading status
    this.fmdmService.updateModelDownloadStatus(modelId, 'downloading', 0);

    try {
      const model = this.evaluator.getModelById(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found in catalog`);
      }

      console.log(`📥 Starting download of ${model.displayName} for ${requestingFolders.length} folders`);

      // Download based on model type
      if (modelId.startsWith('folder-mcp-lite:')) {
        await this.downloadONNXModel(modelId, activeDownload);
      } else if (modelId.startsWith('folder-mcp:')) {
        await this.downloadGPUModel(modelId, activeDownload);
      } else {
        throw new Error(`Unknown model type for ${modelId}`);
      }

      // Mark as completed
      activeDownload.status = 'completed';
      activeDownload.progress = 100;

      this.fmdmService.updateModelDownloadStatus(modelId, 'completed');
      console.log(`✅ Successfully downloaded ${model.displayName}`);

    } catch (error) {
      // Mark as failed
      activeDownload.status = 'failed';
      activeDownload.error = error instanceof Error ? error.message : String(error);

      this.fmdmService.updateModelDownloadStatus(modelId, 'failed');
      console.error(`❌ Failed to download ${modelId}:`, error);

    } finally {
      // Clean up active download after a delay
      setTimeout(() => {
        this.activeDownloads.delete(modelId);
      }, 30000); // Keep status for 30 seconds
    }
  }

  /**
   * Download ONNX model using ONNXDownloader
   */
  private async downloadONNXModel(modelId: string, activeDownload: ActiveDownload): Promise<void> {
    const progressCallback = (progress: DownloadProgress) => {
      activeDownload.progress = progress.progress;
      
      if (progress.status === 'verifying') {
        activeDownload.status = 'verifying';
      }

      // Update FMDM with progress
      this.fmdmService.updateModelDownloadStatus(
        modelId, 
        'downloading', 
        progress.progress
      );
    };

    await this.onnxDownloader.downloadModel(modelId, {
      onProgress: progressCallback,
      verifySize: true,
      timeout: 600000, // 10 minutes
      retryAttempts: 3
    });
  }

  /**
   * Download GPU model (placeholder - would integrate with HuggingFace/sentence-transformers)
   */
  private async downloadGPUModel(modelId: string, activeDownload: ActiveDownload): Promise<void> {
    // For GPU models, this would typically involve:
    // 1. Ensuring Python environment is available
    // 2. Using sentence-transformers to download model
    // 3. Verifying model is accessible
    
    // For now, simulate download progress
    const model = this.evaluator.getModelById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const totalSteps = 10;
    for (let step = 1; step <= totalSteps; step++) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
      
      activeDownload.progress = Math.round((step / totalSteps) * 100);
      
      this.fmdmService.updateModelDownloadStatus(
        modelId, 
        'downloading', 
        activeDownload.progress
      );
    }

    // GPU models are typically downloaded on first use by sentence-transformers
    // This is just a placeholder to demonstrate the interface
    console.log(`📥 GPU model ${model.displayName} will be downloaded on first use`);
  }

  /**
   * Sort download queue by priority
   */
  private sortQueueByPriority(): void {
    const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
    this.downloadQueue.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  /**
   * Cancel all downloads and clear queue
   */
  async cancelAllDownloads(): Promise<void> {
    this.downloadQueue.length = 0;
    
    for (const [modelId, activeDownload] of this.activeDownloads) {
      activeDownload.status = 'failed';
      activeDownload.error = 'Download cancelled';
      this.fmdmService.updateModelDownloadStatus(modelId, 'failed');
    }
    
    this.activeDownloads.clear();
    this.isProcessingQueue = false;
    
    console.log('🛑 All downloads cancelled');
  }

  /**
   * Get statistics about download activity
   */
  getDownloadStats(): {
    activeDownloads: number;
    queueLength: number;
    totalFoldersWaiting: number;
    completedToday: number;
  } {
    const totalFoldersWaiting = this.downloadQueue.reduce(
      (sum, req) => sum + req.requestingFolders.length, 
      0
    );

    const activeDownloads = Array.from(this.activeDownloads.values()).reduce(
      (sum, download) => sum + download.affectedFolders.length,
      0
    );

    return {
      activeDownloads: this.activeDownloads.size,
      queueLength: this.downloadQueue.length,
      totalFoldersWaiting: totalFoldersWaiting + activeDownloads,
      completedToday: 0 // Would track completed downloads in a real implementation
    };
  }

  /**
   * Auto-redownload missing models before indexing
   */
  async ensureModelAvailable(modelId: string, requestingFolder: string): Promise<boolean> {
    if (await this.isModelAvailable(modelId)) {
      return true;
    }

    console.log(`📦 Model ${modelId} missing, requesting download for folder ${requestingFolder}`);
    
    // Request high priority download for missing model
    await this.requestModelDownload(modelId, [requestingFolder], 'high');
    
    // Wait for download to complete or fail
    return await this.waitForModelDownload(modelId, 600000); // 10 minute timeout
  }

  /**
   * Wait for a model download to complete
   */
  private async waitForModelDownload(modelId: string, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = this.getDownloadStatus(modelId);
      
      if (!status) {
        // Download not active, check if model is available
        if (await this.isModelAvailable(modelId)) {
          return true;
        }
      } else if (status.status === 'completed') {
        return true;
      } else if (status.status === 'failed') {
        return false;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false; // Timeout
  }
}