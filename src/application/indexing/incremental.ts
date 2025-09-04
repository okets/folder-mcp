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
import { getSupportedExtensions } from '../../domain/files/supported-extensions.js';

// Domain service interfaces
import { 
  IFileSystemService,
  ILoggingService,
  IVectorSearchService 
} from '../../di/interfaces.js';

// Domain types
import { FileFingerprint } from '../../types/index.js';
import { 
  FileState, 
  FileProcessingState, 
  IFileStateStorage 
} from '../../domain/files/file-state-manager.js';

// Import the main orchestrator for actual processing
import { IndexingOrchestrator } from './orchestrator.js';

export class IncrementalIndexer implements IncrementalIndexing {
  constructor(
    private readonly fileSystemService: IFileSystemService,
    private readonly fileStateStorage: IFileStateStorage,
    private readonly loggingService: ILoggingService,
    private readonly indexingOrchestrator: IndexingOrchestrator,
    private readonly vectorStorage: IVectorSearchService
  ) {}

  async detectChanges(folderPath: string): Promise<ChangeDetectionResult> {
    this.loggingService.info('Detecting changes', { folderPath });

    try {
      // Get current file state using FileSystemService
      const supportedExtensions = [...getSupportedExtensions()];
      const currentFingerprints = await this.fileSystemService.generateFingerprints(
        folderPath, 
        supportedExtensions, 
        []
      );
      
      // Get previous file state from SQLite storage
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
    // Check if we have valid changes object
    if (!changes) {
      this.loggingService.error('❌ No changes object provided to indexChanges');
      return this.createEmptyResult();
    }
    
    this.loggingService.info('📌 indexChanges called', {
      newFilesCount: changes.newFiles?.length || 0,
      newFiles: changes.newFiles || [],
      modifiedFilesCount: changes.modifiedFiles?.length || 0,
      modifiedFiles: changes.modifiedFiles || [],
      deletedFilesCount: changes.deletedFiles?.length || 0,
      deletedFiles: changes.deletedFiles || []
    });
    
    const filesToProcess = [
      ...changes.newFiles,
      ...changes.modifiedFiles
    ];

    // Check if there are any changes at all (including deletions)
    if (filesToProcess.length === 0 && changes.deletedFiles.length === 0) {
      this.loggingService.info('No changes to process');
      return this.createEmptyResult();
    }

    this.loggingService.info('Processing incremental changes', {
      newFiles: changes.newFiles.length,
      modifiedFiles: changes.modifiedFiles.length,
      deletedFiles: changes.deletedFiles.length,
      filesToProcess: filesToProcess
    });

    // Handle deletions first
    await this.handleDeletions(changes.deletedFiles);

    // CRITICAL: Delete old embeddings for modified files before re-indexing
    // This prevents accumulation of duplicate embeddings
    await this.handleModifiedFiles(changes.modifiedFiles);

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
      // Get all successfully indexed files from SQLite storage
      const indexedFiles = await this.fileStateStorage.getFilesByState(FileProcessingState.INDEXED);
      
      // Convert FileState to FileFingerprint format
      return indexedFiles
        .filter((state: FileState) => state.filePath.startsWith(folderPath)) // Only files from this folder
        .map((state: FileState) => this.fileStateToFingerprint(state));
    } catch (error) {
      this.loggingService.warn('Failed to load previous fingerprints from SQLite storage', { error });
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
        // Remove the document and its embeddings from the vector storage
        // This will cascade delete all chunks and embeddings due to foreign key constraints
        await this.vectorStorage.removeDocument(filePath);
        
        // Update file state to reflect deletion
        await this.fileStateStorage.updateProcessingState(
          filePath,
          FileProcessingState.DELETED
        );
        
        this.loggingService.debug('File and embeddings deleted successfully', { filePath });
      } catch (error) {
        this.loggingService.warn('Failed to handle deletion', { 
          filePath, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Handle modified files by removing old embeddings before re-indexing
   * This ensures we don't accumulate duplicate embeddings for the same file
   */
  private async handleModifiedFiles(modifiedFiles: string[]): Promise<void> {
    if (modifiedFiles.length === 0) return;

    this.loggingService.info('Removing old embeddings for modified files', { 
      count: modifiedFiles.length 
    });

    for (const filePath of modifiedFiles) {
      try {
        // Remove old embeddings for this file
        // The CASCADE DELETE will remove all related chunks and embeddings
        await this.vectorStorage.removeDocument(filePath);
        
        this.loggingService.debug('Old embeddings removed for modified file', { filePath });
      } catch (error) {
        // Log but don't fail - the file might be new or already removed
        this.loggingService.debug('Could not remove old embeddings for modified file', { 
          filePath, 
          error: error instanceof Error ? error.message : String(error)
        });
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

  /**
   * Convert FileState to FileFingerprint format for compatibility with existing change detection
   */
  private fileStateToFingerprint(state: FileState): FileFingerprint {
    return {
      path: state.filePath,
      hash: state.contentHash,
      size: 0, // Not tracked in FileState, but not critical for change detection
      modified: new Date(state.lastAttempt).toISOString()
    };
  }
}

/**
 * Factory function to create an IncrementalIndexer with all dependencies
 */
export function createIncrementalIndexer(
  fileSystemService: IFileSystemService,
  fileStateStorage: IFileStateStorage,
  loggingService: ILoggingService,
  indexingOrchestrator: IndexingOrchestrator,
  vectorStorage: IVectorSearchService
): IncrementalIndexer {
  return new IncrementalIndexer(
    fileSystemService,
    fileStateStorage,
    loggingService,
    indexingOrchestrator,
    vectorStorage
  );
}
