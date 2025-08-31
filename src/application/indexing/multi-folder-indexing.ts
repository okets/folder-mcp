/**
 * Multi-Folder Indexing Workflow
 * 
 * Extends the indexing system to handle multiple folders with
 * folder-specific settings and progress tracking.
 */

import {
  IndexingWorkflow,
  IndexingOptions,
  IndexingResult,
  IndexingStatus,
  IndexingProgress,
  IndexingError,
  IndexingStatistics
} from './index.js';

import { ILoggingService } from '../../di/interfaces.js';
import { IFolderManager, ResolvedFolderConfig } from '../../domain/folders/index.js';
import { IMultiFolderStorageProvider } from '../../infrastructure/storage/index.js';
import { ResourceManager, ResourceLimits } from './resource-manager.js';

/**
 * Multi-folder indexing workflow interface
 */
export interface IMultiFolderIndexingWorkflow {
  /**
   * Index all configured folders
   */
  indexAllFolders(options?: MultiFolderIndexingOptions): Promise<MultiFolderIndexingResult>;

  /**
   * Index a specific folder by path
   */
  indexFolder(folderPath: string, options?: MultiFolderIndexingOptions): Promise<FolderIndexingResult>;

  /**
   * Get indexing status for all folders
   */
  getAllFoldersStatus(): Promise<MultiFolderIndexingStatus>;

  /**
   * Get indexing status for a specific folder
   */
  getFolderStatus(folderPath: string): Promise<FolderIndexingStatus>;

  /**
   * Cancel indexing for all folders
   */
  cancelAllIndexing(): Promise<void>;

  /**
   * Cancel indexing for a specific folder
   */
  cancelFolderIndexing(folderPath: string): Promise<void>;
}

/**
 * Multi-folder indexing options
 */
export interface MultiFolderIndexingOptions {
  /** Base indexing options */
  baseOptions?: IndexingOptions;
  /** Maximum concurrent folder indexing operations */
  maxConcurrentFolders?: number;
  /** Whether to continue on folder errors */
  continueOnError?: boolean;
  /** Folder paths to include (if not specified, includes all) */
  includeFolders?: string[];
  /** Folder paths to exclude */
  excludeFolders?: string[];
  /** Resource limits for indexing */
  resourceLimits?: Partial<ResourceLimits>;
}

/**
 * Result for multi-folder indexing operation
 */
export interface MultiFolderIndexingResult {
  /** Overall success status */
  success: boolean;
  /** Results for each folder */
  folderResults: FolderIndexingResult[];
  /** Total processing time */
  totalProcessingTime: number;
  /** Summary statistics */
  summary: MultiFolderIndexingSummary;
  /** System-wide errors */
  systemErrors: string[];
}

/**
 * Result for single folder indexing
 */
export interface FolderIndexingResult {
  /** Folder name */
  folderName: string;
  /** Folder path */
  folderPath: string;
  /** Success status for this folder */
  success: boolean;
  /** Basic indexing result */
  result?: IndexingResult;
  /** Folder-specific error if failed */
  error?: string;
  /** Processing time for this folder */
  processingTime: number;
  /** Folder-specific settings used */
  settingsUsed: FolderIndexingSettings;
}

/**
 * Multi-folder indexing status
 */
export interface MultiFolderIndexingStatus {
  /** Whether any folders are currently indexing */
  isIndexing: boolean;
  /** Total progress across all folders */
  overallProgress: IndexingProgress;
  /** Status for each folder */
  folderStatuses: FolderIndexingStatus[];
  /** Started time */
  startedAt?: Date;
  /** Estimated completion time */
  estimatedCompletion?: Date;
}

/**
 * Single folder indexing status
 */
export interface FolderIndexingStatus {
  /** Folder name */
  folderName: string;
  /** Folder path */
  folderPath: string;
  /** Whether this folder is currently indexing */
  isIndexing: boolean;
  /** Progress for this folder */
  progress: IndexingProgress;
  /** Current file being processed */
  currentFile?: string;
  /** Started time for this folder */
  startedAt?: Date;
  /** Settings applied to this folder */
  settings: FolderIndexingSettings;
  /** Folder-specific errors */
  errors: IndexingError[];
}

/**
 * Settings applied to folder indexing
 */
export interface FolderIndexingSettings {
  /** Embedding backend used */
  embeddingBackend: string;
  /** Model used */
  model?: string;
  /** Batch size */
  batchSize?: number;
  /** Max concurrency */
  maxConcurrency?: number;
  /** Exclude patterns */
  excludePatterns: string[];
}

/**
 * Summary statistics for multi-folder indexing
 */
export interface MultiFolderIndexingSummary {
  /** Total folders processed */
  totalFolders: number;
  /** Successful folders */
  successfulFolders: number;
  /** Failed folders */
  failedFolders: number;
  /** Total files processed across all folders */
  totalFilesProcessed: number;
  /** Total chunks generated across all folders */
  totalChunksGenerated: number;
  /** Total embeddings created across all folders */
  totalEmbeddingsCreated: number;
  /** Average processing rate */
  averageProcessingRate: number;
}

/**
 * Multi-folder indexing workflow implementation
 */
export class MultiFolderIndexingWorkflow implements IMultiFolderIndexingWorkflow {
  private folderStatuses: Map<string, FolderIndexingStatus> = new Map();
  private cancellationTokens: Map<string, boolean> = new Map();
  private resourceManager: ResourceManager | null = null;

  private getFolderName(folderPath: string): string {
    return folderPath.split('/').pop() || folderPath;
  }

  constructor(
    private folderManager: IFolderManager,
    private storageProvider: IMultiFolderStorageProvider,
    private indexingWorkflow: IndexingWorkflow,
    private loggingService: ILoggingService
  ) {}

  async indexAllFolders(options: MultiFolderIndexingOptions = {}): Promise<MultiFolderIndexingResult> {
    const startTime = Date.now();
    this.loggingService.info('Starting multi-folder indexing with resource management');

    // Get all folders to index
    const allFolders = await this.folderManager.getFolders();
    const foldersToIndex = this.filterFolders(allFolders, options);

    this.loggingService.info(`Indexing ${foldersToIndex.length} folders`, {
      folderPaths: foldersToIndex.map(f => f.path)
    });

    // Initialize status tracking
    this.initializeStatusTracking(foldersToIndex);

    const folderResults: FolderIndexingResult[] = [];
    const systemErrors: string[] = [];

    // Initialize resource manager
    const resourceLimits = {
      maxConcurrentOperations: options.maxConcurrentFolders || 3,
      ...options.resourceLimits
    };
    this.resourceManager = new ResourceManager(this.loggingService, resourceLimits);

    // Monitor resource usage
    this.resourceManager.on('stats', (stats) => {
      if (stats.isThrottled) {
        this.loggingService.warn('Resource throttling active', {
          memoryUsedMB: Math.round(stats.memoryUsedMB),
          cpuPercent: Math.round(stats.cpuPercent),
          throttleFactor: stats.throttleFactor
        });
      }
    });

    try {
      // Submit all folders to resource manager for controlled execution
      const indexingPromises = foldersToIndex.map(async (folder) => {
        const operationId = `index-${folder.path}`;
        
        try {
          // Estimate memory based on folder size (simplified)
          const estimatedMemoryMB = 50; // Base estimate, could be improved
          
          const result = await this.resourceManager!.submitOperation(
            operationId,
            folder.path,
            () => this.indexSingleFolderInternal(folder, options.baseOptions || {}),
            {
              priority: 0, // Default priority, could be enhanced
              estimatedMemoryMB
            }
          );
          
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes('Queue is full')) {
            systemErrors.push(`Queue full for folder ${this.getFolderName(folder.path)}`);
          } else if (errorMessage.includes('cancelled')) {
            systemErrors.push(`Indexing cancelled for folder ${this.getFolderName(folder.path)}`);
          }
          
          const errorResult: FolderIndexingResult = {
            folderName: this.getFolderName(folder.path),
            folderPath: folder.resolvedPath,
            success: false,
            error: errorMessage,
            processingTime: 0,
            settingsUsed: this.createFolderSettings(folder)
          };
          
          if (!options.continueOnError) {
            // Cancel remaining operations
            await this.resourceManager!.cancelAll();
            throw error;
          }
          
          return errorResult;
        }
      });

      // Wait for all operations to complete
      const results = await Promise.allSettled(indexingPromises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          folderResults.push(result.value);
        } else {
          const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
          systemErrors.push(`Indexing failed: ${errorMessage}`);
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      systemErrors.push(`Multi-folder indexing failed: ${errorMessage}`);
      this.loggingService.error('Multi-folder indexing failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      // Get final resource stats
      if (this.resourceManager) {
        const finalStats = this.resourceManager.getStats();
        this.loggingService.info('Final resource usage', {
          memoryUsedMB: Math.round(finalStats.memoryUsedMB),
          peakMemoryMB: Math.round(finalStats.memoryLimitMB),
          totalOperations: folderResults.length
        });
        
        // Shutdown resource manager
        await this.resourceManager.shutdown();
        this.resourceManager = null;
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    const summary = this.createSummary(folderResults);

    const result: MultiFolderIndexingResult = {
      success: systemErrors.length === 0 && folderResults.every(r => r.success),
      folderResults,
      totalProcessingTime,
      summary,
      systemErrors
    };

    this.loggingService.info('Multi-folder indexing completed', {
      success: result.success,
      totalFolders: summary.totalFolders,
      successfulFolders: summary.successfulFolders,
      processingTime: totalProcessingTime
    });

    return result;
  }

  async indexFolder(folderPath: string, options: MultiFolderIndexingOptions = {}): Promise<FolderIndexingResult> {
    this.loggingService.debug(`indexFolder called with path: "${folderPath}"`);
    
    // Log all available folders for debugging
    const allFolders = await this.folderManager.getFolders();
    this.loggingService.debug(`Available folders: ${JSON.stringify(allFolders.map(f => ({ path: f.path, resolvedPath: f.resolvedPath })))}`);
    
    const folder = await this.folderManager.getFolderByPath(folderPath);
    if (!folder) {
      // Try to understand why folder wasn't found
      this.loggingService.error(`Folder not found: "${folderPath}". Available paths: ${allFolders.map(f => f.path).join(', ')}`);
      throw new Error(`Folder not found: ${folderPath}`);
    }

    // Validate folder has required properties
    if (!folder.resolvedPath) {
      this.loggingService.error(`Folder configuration missing resolvedPath for ${folderPath}`, 
        new Error(`Folder object: ${JSON.stringify(folder)}`));
      throw new Error(`Invalid folder configuration: missing resolvedPath for ${folderPath}`);
    }

    this.loggingService.info(`Starting indexing for folder: ${folderPath} (resolved: ${folder.resolvedPath})`);

    return this.indexSingleFolderInternal(folder, options.baseOptions || {});
  }

  async getAllFoldersStatus(): Promise<MultiFolderIndexingStatus> {
    const folderStatuses = Array.from(this.folderStatuses.values());
    const isIndexing = folderStatuses.some(status => status.isIndexing);

    // Calculate overall progress
    const totalFiles = folderStatuses.reduce((sum, status) => sum + status.progress.totalFiles, 0);
    const processedFiles = folderStatuses.reduce((sum, status) => sum + status.progress.processedFiles, 0);
    const totalChunks = folderStatuses.reduce((sum, status) => sum + status.progress.totalChunks, 0);
    const processedChunks = folderStatuses.reduce((sum, status) => sum + status.progress.processedChunks, 0);

    const overallProgress: IndexingProgress = {
      totalFiles,
      processedFiles,
      totalChunks,
      processedChunks,
      percentage: totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0
    };

    // Find earliest start time
    const startTimes = folderStatuses
      .map(status => status.startedAt)
      .filter((time): time is Date => time !== undefined);
    const startedAt = startTimes.length > 0 ? new Date(Math.min(...startTimes.map(t => t.getTime()))) : undefined;

    const status: MultiFolderIndexingStatus = {
      isIndexing,
      overallProgress,
      folderStatuses
    };
    
    if (startedAt) {
      status.startedAt = startedAt;
    }
    
    return status;
  }

  async getFolderStatus(folderPath: string): Promise<FolderIndexingStatus> {
    const status = this.folderStatuses.get(folderPath);
    if (!status) {
      throw new Error(`No status found for folder: ${folderPath}`);
    }
    return status;
  }

  async cancelAllIndexing(): Promise<void> {
    this.loggingService.info('Cancelling all folder indexing operations');
    
    // Cancel through resource manager if active
    if (this.resourceManager) {
      await this.resourceManager.cancelAll();
    }
    
    for (const folderName of this.cancellationTokens.keys()) {
      this.cancellationTokens.set(folderName, true);
    }
  }

  async cancelFolderIndexing(folderPath: string): Promise<void> {
    this.loggingService.info(`Cancelling indexing for folder: ${folderPath}`);
    
    // Cancel through resource manager if active
    if (this.resourceManager) {
      const operationId = `index-${folderPath}`;
      await this.resourceManager.cancelOperation(operationId);
    }
    
    this.cancellationTokens.set(folderPath, true);
  }

  private async indexSingleFolderInternal(folder: ResolvedFolderConfig, baseOptions: IndexingOptions): Promise<FolderIndexingResult> {
    const startTime = Date.now();
    const folderPath = folder.path;
    const folderName = this.getFolderName(folderPath);

    // Check for cancellation
    if (this.cancellationTokens.get(folderPath)) {
      throw new Error(`Indexing cancelled for folder: ${folderPath}`);
    }

    // Create folder-specific options
    const folderOptions = this.createFolderIndexingOptions(folder, baseOptions);
    const settings = this.createFolderSettings(folder);

    // Ensure status/cancellation entries exist for direct single-folder invocations
    if (!this.folderStatuses.has(folderPath)) {
      this.folderStatuses.set(folderPath, {
        folderName,
        folderPath: folder.resolvedPath,
        isIndexing: false,
        progress: { totalFiles: 0, processedFiles: 0, totalChunks: 0, processedChunks: 0, percentage: 0 },
        settings,
        errors: []
      });
    }
    if (!this.cancellationTokens.has(folderPath)) {
      this.cancellationTokens.set(folderPath, false);
    }

    // Update status
    this.updateFolderStatus(folderPath, {
      isIndexing: true,
      startedAt: new Date(),
      settings
    });

    try {
      this.loggingService.debug(`Indexing folder: ${folderName} with settings`, settings);

      // Use the underlying indexing workflow for this folder
      const result = await this.indexingWorkflow.indexFolder(folder.resolvedPath, folderOptions);

      // Store embeddings in the multi-folder storage provider
      // Note: This would need to be coordinated with the actual embedding generation
      // For now, we assume the storage provider will be updated by other components

      const processingTime = Date.now() - startTime;

      // Update status
      this.updateFolderStatus(folderPath, {
        isIndexing: false,
        progress: {
          totalFiles: result.filesProcessed,
          processedFiles: result.filesProcessed,
          totalChunks: result.chunksGenerated,
          processedChunks: result.chunksGenerated,
          percentage: 100
        }
      });

      this.loggingService.info(`Completed indexing for folder: ${folderName}`, {
        filesProcessed: result.filesProcessed,
        chunksGenerated: result.chunksGenerated,
        processingTime
      });

      return {
        folderName,
        folderPath: folder.resolvedPath,
        success: result.success,
        result,
        processingTime,
        settingsUsed: settings
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update status
      this.updateFolderStatus(folderPath, {
        isIndexing: false,
        errors: [{
          filePath: folder.resolvedPath,
          error: errorMessage,
          stage: 'indexing' as any,
          timestamp: new Date(),
          recoverable: false
        }]
      });

      this.loggingService.error(`Failed to index folder: ${folderName}`, error instanceof Error ? error : new Error(String(error)));

      return {
        folderName,
        folderPath: folder.resolvedPath,
        success: false,
        error: errorMessage,
        processingTime,
        settingsUsed: settings
      };
    }
  }

  private filterFolders(folders: ResolvedFolderConfig[], options: MultiFolderIndexingOptions): ResolvedFolderConfig[] {
    let filtered = folders; // Remove enabled filter since field doesn't exist

    if (options.includeFolders && options.includeFolders.length > 0) {
      filtered = filtered.filter(folder => options.includeFolders!.includes(folder.path));
    }

    if (options.excludeFolders && options.excludeFolders.length > 0) {
      filtered = filtered.filter(folder => !options.excludeFolders!.includes(folder.path));
    }

    return filtered;
  }

  private initializeStatusTracking(folders: ResolvedFolderConfig[]): void {
    this.folderStatuses.clear();
    this.cancellationTokens.clear();

    for (const folder of folders) {
      const status: FolderIndexingStatus = {
        folderName: this.getFolderName(folder.path),
        folderPath: folder.resolvedPath,
        isIndexing: false,
        progress: {
          totalFiles: 0,
          processedFiles: 0,
          totalChunks: 0,
          processedChunks: 0,
          percentage: 0
        },
        settings: this.createFolderSettings(folder),
        errors: []
      };

      this.folderStatuses.set(folder.path, status);
      this.cancellationTokens.set(folder.path, false);
    }
  }

  private updateFolderStatus(folderPath: string, updates: Partial<FolderIndexingStatus>): void {
    const current = this.folderStatuses.get(folderPath);
    if (current) {
      this.folderStatuses.set(folderPath, { ...current, ...updates });
    }
  }

  private createFolderIndexingOptions(folder: ResolvedFolderConfig, baseOptions: IndexingOptions): IndexingOptions {
    const options: IndexingOptions = {
      ...baseOptions,
      excludePatterns: [...(baseOptions.excludePatterns || []), ...folder.exclude]
    };
    
    const embeddingModel = folder.model || baseOptions.embeddingModel;
    if (embeddingModel) {
      options.embeddingModel = embeddingModel;
    }
    
    const batchSize = folder.performance?.batchSize || baseOptions.batchSize;
    if (batchSize) {
      options.batchSize = batchSize;
    }
    
    return options;
  }

  private createFolderSettings(folder: ResolvedFolderConfig): FolderIndexingSettings {
    const settings: FolderIndexingSettings = {
      embeddingBackend: 'auto', // Default to auto since embeddings.backend doesn't exist
      excludePatterns: folder.exclude
    };
    
    if (folder.model) {
      settings.model = folder.model;
    }
    
    if (folder.performance?.batchSize) {
      settings.batchSize = folder.performance.batchSize;
    }
    
    if (folder.performance?.maxConcurrency) {
      settings.maxConcurrency = folder.performance.maxConcurrency;
    }
    
    return settings;
  }

  private createSummary(results: FolderIndexingResult[]): MultiFolderIndexingSummary {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const totalFilesProcessed = successful.reduce((sum, r) => sum + (r.result?.filesProcessed || 0), 0);
    const totalChunksGenerated = successful.reduce((sum, r) => sum + (r.result?.chunksGenerated || 0), 0);
    const totalEmbeddingsCreated = successful.reduce((sum, r) => sum + (r.result?.embeddingsCreated || 0), 0);
    
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const averageProcessingRate = totalProcessingTime > 0 ? totalFilesProcessed / (totalProcessingTime / 1000) : 0;

    return {
      totalFolders: results.length,
      successfulFolders: successful.length,
      failedFolders: failed.length,
      totalFilesProcessed,
      totalChunksGenerated,
      totalEmbeddingsCreated,
      averageProcessingRate
    };
  }
}