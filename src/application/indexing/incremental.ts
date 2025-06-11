/**
 * Incremental Indexer
 * 
 * Handles incremental indexing by detecting changes and processing
 * only modified, added, or deleted files.
 */

import { 
  IncrementalIndexing,
  ChangeDetectionResult,
  ChangesSummary,
  IndexingOptions,
  IndexingResult
} from './index.js';

// Domain service interfaces
import { 
  IFileSystemService,
  ICacheService,
  ILoggingService 
} from '../../di/interfaces.js';

// Domain types
import { FileFingerprint } from '../../types/index.js';

// Import the main orchestrator for actual processing
import { IndexingOrchestrator } from './orchestrator.js';

export class IncrementalIndexer implements IncrementalIndexing {
  constructor(
    private readonly fileSystemService: IFileSystemService,
    private readonly cacheService: ICacheService,
    private readonly loggingService: ILoggingService,
    private readonly indexingOrchestrator: IndexingOrchestrator
  ) {}

  async detectChanges(folderPath: string): Promise<ChangeDetectionResult> {
    this.loggingService.info('Detecting changes', { folderPath });

    try {
      // Get current file state using FileSystemService
      const supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];
      const currentFingerprints = await this.fileSystemService.generateFingerprints(
        folderPath, 
        supportedExtensions, 
        []
      );
      
      // Get previous file state from cache (simplified approach)
      const previousFingerprints = await this.loadPreviousFingerprints(folderPath);
      
      // Compare states to detect changes
      const changes = this.compareStates(currentFingerprints, previousFingerprints);
      
      this.loggingService.info('Change detection completed', {
        folderPath,
        summary: changes.summary
      });

      return changes;

    } catch (error) {
      this.loggingService.error('Change detection failed', error instanceof Error ? error : new Error(String(error)), { folderPath });
      throw error;
    }
  }

  async indexChanges(
    changes: ChangeDetectionResult, 
    options: IndexingOptions = {}
  ): Promise<IndexingResult> {
    const filesToProcess = [
      ...changes.newFiles,
      ...changes.modifiedFiles
    ];

    if (filesToProcess.length === 0) {
      this.loggingService.info('No changes to process');
      return this.createEmptyResult();
    }

    this.loggingService.info('Processing incremental changes', {
      newFiles: changes.newFiles.length,
      modifiedFiles: changes.modifiedFiles.length,
      deletedFiles: changes.deletedFiles.length
    });

    // Handle deletions first
    await this.handleDeletions(changes.deletedFiles);

    // Process new and modified files
    const result = await this.indexingOrchestrator.indexFiles(filesToProcess, {
      ...options,
      forceReindex: false // Incremental updates don't force reindex
    });

    this.loggingService.info('Incremental indexing completed', {
      filesProcessed: result.filesProcessed,
      deletionsHandled: changes.deletedFiles.length,
      success: result.success
    });

    return result;
  }

  private async loadPreviousFingerprints(folderPath: string): Promise<FileFingerprint[]> {
    try {
      // Try to load previous fingerprints from cache
      // Using a simplified approach since loadPreviousIndex isn't available
      const cacheKey = 'previous_fingerprints';
      const cached = await this.cacheService.loadFromCache<FileFingerprint[]>(cacheKey, 'metadata');
      return cached || [];
    } catch (error) {
      this.loggingService.warn('Failed to load previous fingerprints', { error });
      return [];
    }
  }

  private compareStates(
    current: FileFingerprint[], 
    previous: FileFingerprint[]
  ): ChangeDetectionResult {
    const previousMap = new Map(previous.map(fp => [fp.path, fp]));
    const currentMap = new Map(current.map(fp => [fp.path, fp]));

    const newFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const unchangedFiles: string[] = [];

    // Check current files against previous state
    for (const currentFp of current) {
      const previousFp = previousMap.get(currentFp.path);
      
      if (!previousFp) {
        newFiles.push(currentFp.path);
      } else if (previousFp.hash !== currentFp.hash) {
        modifiedFiles.push(currentFp.path);
      } else {
        unchangedFiles.push(currentFp.path);
      }
    }

    // Find deleted files
    const deletedFiles: string[] = [];
    for (const previousFp of previous) {
      if (!currentMap.has(previousFp.path)) {
        deletedFiles.push(previousFp.path);
      }
    }

    const totalChanges = newFiles.length + modifiedFiles.length + deletedFiles.length;
    const summary: ChangesSummary = {
      totalChanges,
      estimatedProcessingTime: this.estimateProcessingTime(totalChanges),
      requiresFullReindex: this.shouldReindexFully(current, previous)
    };

    return {
      newFiles,
      modifiedFiles,
      deletedFiles,
      unchangedFiles,
      summary
    };
  }

  private async handleDeletions(deletedFiles: string[]): Promise<void> {
    if (deletedFiles.length === 0) return;

    this.loggingService.info('Handling file deletions', { count: deletedFiles.length });

    for (const filePath of deletedFiles) {
      try {
        // Since removeFromCache isn't available, we'll log the deletion
        // In a real implementation, this would clean up related cache entries
        this.loggingService.debug('File deleted', { filePath });
      } catch (error) {
        this.loggingService.warn('Failed to handle deletion', { filePath, error });
      }
    }
  }

  private estimateProcessingTime(changeCount: number): number {
    // Rough estimation: ~1 second per file for parsing + chunking + embedding
    return changeCount * 1000; // milliseconds
  }

  private shouldReindexFully(current: FileFingerprint[], previous: FileFingerprint[]): boolean {
    // Determine if changes are significant enough to warrant full reindexing
    const changeRatio = Math.abs(current.length - previous.length) / Math.max(current.length, previous.length, 1);
    
    // If more than 50% of files have changed, recommend full reindex
    return changeRatio > 0.5;
  }

  private createEmptyResult(): IndexingResult {
    return {
      success: true,
      filesProcessed: 0,
      chunksGenerated: 0,
      embeddingsCreated: 0,
      processingTime: 0,
      errors: [],
      statistics: {
        totalBytes: 0,
        totalWords: 0,
        averageChunkSize: 0,
        processingRate: 0,
        embeddingRate: 0
      }
    };
  }
}

/**
 * Factory function to create an IncrementalIndexer with all dependencies
 */
export function createIncrementalIndexer(
  fileSystemService: IFileSystemService,
  cacheService: ICacheService,
  loggingService: ILoggingService,
  indexingOrchestrator: IndexingOrchestrator
): IncrementalIndexer {
  return new IncrementalIndexer(
    fileSystemService,
    cacheService,
    loggingService,
    indexingOrchestrator
  );
}
