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

  private getFolderName(folderPath: string): string {
    return folderPath.split('/').pop() || folderPath;
  }

  constructor(
    private folderManager: IFolderManager,
    private storageProvider: IMultiFolderStorageProvider,
    private singleFolderIndexing: IndexingWorkflow,
    private loggingService: ILoggingService
  ) {}

  async indexAllFolders(options: MultiFolderIndexingOptions = {}): Promise<MultiFolderIndexingResult> {
    const startTime = Date.now();
    this.loggingService.info('Starting multi-folder indexing');

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
    const maxConcurrent = options.maxConcurrentFolders || 3;

    try {
      // Process folders in batches to respect concurrency limits
      for (let i = 0; i < foldersToIndex.length; i += maxConcurrent) {
        const batch = foldersToIndex.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(folder => 
          this.indexSingleFolder(folder, options.baseOptions || {})
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, j) => {
          const folder = batch[j];
          if (!folder) return; // Skip if folder is undefined

          if (result.status === 'fulfilled') {
            folderResults.push(result.value);
          } else {
            const errorResult: FolderIndexingResult = {
              folderName: this.getFolderName(folder.path),
              folderPath: folder.resolvedPath,
              success: false,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
              processingTime: 0,
              settingsUsed: this.createFolderSettings(folder)
            };
            folderResults.push(errorResult);
            
            if (!options.continueOnError) {
              systemErrors.push(`Failed to index folder ${this.getFolderName(folder.path)}: ${errorResult.error}`);
            }
          }
        });

        // Break if we hit an error and shouldn't continue
        if (!options.continueOnError && systemErrors.length > 0) {
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      systemErrors.push(`Multi-folder indexing failed: ${errorMessage}`);
      this.loggingService.error('Multi-folder indexing failed', error instanceof Error ? error : new Error(String(error)));
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
    const folder = await this.folderManager.getFolderByPath(folderPath);
    if (!folder) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    this.loggingService.info(`Starting indexing for folder: ${folderPath}`);

    return this.indexSingleFolder(folder, options.baseOptions || {});
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
    
    for (const folderName of this.cancellationTokens.keys()) {
      this.cancellationTokens.set(folderName, true);
    }
  }

  async cancelFolderIndexing(folderPath: string): Promise<void> {
    this.loggingService.info(`Cancelling indexing for folder: ${folderPath}`);
    this.cancellationTokens.set(folderPath, true);
  }

  private async indexSingleFolder(folder: ResolvedFolderConfig, baseOptions: IndexingOptions): Promise<FolderIndexingResult> {
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

    // Update status
    this.updateFolderStatus(folderPath, {
      isIndexing: true,
      startedAt: new Date(),
      settings
    });

    try {
      this.loggingService.debug(`Indexing folder: ${folderName} with settings`, settings);

      // Use the single-folder indexing workflow
      const result = await this.singleFolderIndexing.indexFolder(folder.resolvedPath, folderOptions);

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