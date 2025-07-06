/**
 * Indexing Orchestrator
 * 
 * Coordinates the indexing workflow by orchestrating domain services
 * to scan, parse, chunk, embed, and cache content.
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

// Domain service interfaces
import { 
  IFileParsingService,
  IChunkingService,
  IEmbeddingService,
  IVectorSearchService,
  ICacheService,
  ILoggingService,
  IConfigurationService,
  IFileSystemService
} from '../../di/interfaces.js';

// Domain types
import { FileFingerprint, ParsedContent, TextChunk } from '../../types/index.js';

export class IndexingOrchestrator implements IndexingWorkflow {
  private currentStatus: Map<string, IndexingStatus> = new Map();
  constructor(
    private readonly fileParsingService: IFileParsingService,
    private readonly chunkingService: IChunkingService,
    private readonly embeddingService: IEmbeddingService,
    private readonly vectorSearchService: IVectorSearchService,
    private readonly cacheService: ICacheService,
    private readonly loggingService: ILoggingService,
    private readonly configService: IConfigurationService,
    private readonly fileSystemService: IFileSystemService
  ) {}

  async indexFolder(path: string, options: IndexingOptions = {}): Promise<IndexingResult> {
    const startTime = Date.now();
    this.loggingService.info('Starting folder indexing', { folderPath: path, options });

    // Initialize status tracking
    const status: IndexingStatus = {
      isRunning: true,
      progress: {
        totalFiles: 0,
        processedFiles: 0,
        totalChunks: 0,
        processedChunks: 0,
        percentage: 0
      },
      startedAt: new Date()
    };
    this.currentStatus.set(path, status);

    try {
      const result = await this.executeIndexingWorkflow(path, options, status);
      
      // Update final status
      status.isRunning = false;
      // processingTime is already calculated in executeIndexingWorkflow
      
      this.loggingService.info('Folder indexing completed', { 
        folderPath: path, 
        result: {
          filesProcessed: result.filesProcessed,
          chunksGenerated: result.chunksGenerated,
          embeddingsCreated: result.embeddingsCreated,
          processingTime: result.processingTime
        }
      });

      return result;

    } catch (error) {
      status.isRunning = false;
      this.loggingService.error('Folder indexing failed', error instanceof Error ? error : new Error(String(error)), { folderPath: path });
      
      // Re-throw specific errors that should not be caught
      if (error instanceof Error && error.message.includes('Folder does not exist')) {
        throw error;
      }
      
      return {
        success: false,
        filesProcessed: status.progress.processedFiles,
        chunksGenerated: status.progress.processedChunks,
        embeddingsCreated: 0,
        processingTime: Date.now() - startTime,
        errors: [{
          filePath: path,
          error: error instanceof Error ? error.message : String(error),
          stage: 'parsing',
          timestamp: new Date(),
          recoverable: false
        }],
        statistics: this.createEmptyStatistics()
      };
    }
  }

  async indexFiles(files: string[], options: IndexingOptions = {}): Promise<IndexingResult> {
    const startTime = Date.now();
    this.loggingService.info('Starting file indexing', { fileCount: files.length, options });

    const result: IndexingResult = {
      success: true,
      filesProcessed: 0,
      chunksGenerated: 0,
      embeddingsCreated: 0,
      processingTime: 0,
      errors: [],
      statistics: this.createEmptyStatistics()
    };

    // Process files individually
    for (const filePath of files) {
      try {
        const fileResult = await this.processFile(filePath, options);
        this.mergeFileResult(result, fileResult);
      } catch (error) {
        const indexingError: IndexingError = {
          filePath,
          error: error instanceof Error ? error.message : String(error),
          stage: 'parsing',
          timestamp: new Date(),
          recoverable: true
        };
        result.errors.push(indexingError);
      }
    }

    // Success if we processed at least some files, and all errors are recoverable
    result.success = result.filesProcessed > 0 && result.errors.every(e => e.recoverable);

    this.loggingService.info('File indexing completed', { 
      filesProcessed: result.filesProcessed,
      errors: result.errors.length 
    });

    return result;
  }

  async getIndexingStatus(path: string): Promise<IndexingStatus> {
    const status = this.currentStatus.get(path);
    if (!status) {
      return {
        isRunning: false,
        progress: {
          totalFiles: 0,
          processedFiles: 0,
          totalChunks: 0,
          processedChunks: 0,
          percentage: 0
        }
      };
    }
    return { ...status };
  }

  async resumeIndexing(path: string): Promise<IndexingResult> {
    this.loggingService.info('Resuming indexing', { path });
    
    // Resume with force reindex disabled to leverage existing cache
    return this.indexFolder(path, { 
      forceReindex: false,
    });
  }

  private async executeIndexingWorkflow(
    folderPath: string, 
    options: IndexingOptions,
    status: IndexingStatus
  ): Promise<IndexingResult> {
    // 0. Validate folder exists
    const { existsSync } = await import('fs');
    if (!existsSync(folderPath)) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }
    
    // 1. Generate fingerprints for all supported files
    const extensions = this.fileParsingService.getSupportedExtensions();
    const fingerprints = await this.fileSystemService.generateFingerprints(
      folderPath, 
      extensions, 
      options.excludePatterns || []
    );

    status.progress.totalFiles = fingerprints.length;
    this.updateProgress(status);

    // 2. Determine which files need processing based on cache
    const filesToProcess = options.forceReindex 
      ? fingerprints 
      : await this.filterChangedFiles(fingerprints);

    this.loggingService.info('Files to process', { 
      total: fingerprints.length, 
      toProcess: filesToProcess.length 
    });

    // 3. Process files: parse → chunk → embed → cache
    const result = await this.processFingerprints(filesToProcess, folderPath, options, status);

    return result;
  }

  private async filterChangedFiles(fingerprints: FileFingerprint[]): Promise<FileFingerprint[]> {
    // Use cache service to determine which files have changed
    const cacheStatus = await this.cacheService.getCacheStatus(fingerprints);
    
    // Return new and modified files
    return [
      ...(cacheStatus.newFiles || []),
      ...(cacheStatus.modifiedFiles || [])
    ];
  }

  private async processFingerprints(
    fingerprints: FileFingerprint[],
    folderPath: string,
    options: IndexingOptions,
    status: IndexingStatus
  ): Promise<IndexingResult> {
    const processingStartTime = Date.now();
    
    const result: IndexingResult = {
      success: true,
      filesProcessed: 0,
      chunksGenerated: 0,
      embeddingsCreated: 0,
      processingTime: 0,
      errors: [],
      statistics: this.createEmptyStatistics()
    };

    let totalBytes = 0;
    let totalWords = 0;
    const chunkSizes: number[] = [];
    const allEmbeddings: any[] = [];
    const allMetadata: any[] = [];

    for (const fingerprint of fingerprints) {
      status.currentFile = fingerprint.path;
      
      try {
        // Import path module for joining paths
        const { join } = await import('path');
        const absoluteFilePath = join(folderPath, fingerprint.path);
        
        const fileResult = await this.processFile(absoluteFilePath, options);
        this.mergeFileResult(result, fileResult);
        
        // Collect embeddings and metadata for vector index
        if (fileResult.embeddings && fileResult.metadata) {
          allEmbeddings.push(...fileResult.embeddings);
          allMetadata.push(...fileResult.metadata);
        }

        status.progress.processedFiles++;
        this.updateProgress(status);

      } catch (error) {
        const indexingError: IndexingError = {
          filePath: fingerprint.path,
          error: error instanceof Error ? error.message : String(error),
          stage: 'parsing',
          timestamp: new Date(),
          recoverable: true
        };
        
        result.errors.push(indexingError);
        this.loggingService.error('File processing failed', error instanceof Error ? error : new Error(String(error)), { 
          filePath: fingerprint.path 
        });
      }    }

    // 4. Build vector index if embeddings were created
    if (result.embeddingsCreated > 0) {
      try {
        this.loggingService.info('Building vector index', { 
          embeddingsCount: result.embeddingsCreated 
        });
          // For now, just enable the index (actual implementation TBD)
        await this.vectorSearchService.buildIndex(allEmbeddings, allMetadata);
        
        this.loggingService.info('Vector index built successfully');
      } catch (error) {
        this.loggingService.error('Failed to build vector index', error instanceof Error ? error : new Error(String(error)));
        // Don't fail the whole indexing for vector index issues
      }
    }

    // Calculate processing time for just the file processing
    result.processingTime = Date.now() - processingStartTime;
    
    // Success if we processed at least some files, and all errors are recoverable
    result.success = result.filesProcessed > 0 && result.errors.every(e => e.recoverable);
    
    return result;
  }
  private async processFile(filePath: string, options: IndexingOptions): Promise<{
    chunksGenerated: number;
    embeddingsCreated: number;
    bytes: number;
    words: number;
    embeddings?: any[];
    metadata?: any[];
  }> {
    // Parse file content - need to determine file type
    const fileType = this.getFileType(filePath);
    if (!this.fileParsingService.isSupported(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const parsedContent = await this.fileParsingService.parseFile(filePath, fileType);
    
    // Chunk content
    const chunkResult = await this.chunkingService.chunkText(parsedContent);
    const chunks = chunkResult.chunks;

    // Generate embeddings if not skipped
    let embeddingsCreated = 0;
    let embeddings: any[] = [];
    let metadata: any[] = [];
    
    if (!options.embeddingModel || options.embeddingModel !== 'skip') {
      embeddings = await this.embeddingService.generateEmbeddings(chunks);
      embeddingsCreated = embeddings.length;
        // Create metadata for each chunk
      metadata = chunks.map((chunk, index) => ({
        filePath,
        chunkId: `${filePath}_chunk_${index}`,
        chunkIndex: index,
        content: chunk.content,
        startPosition: chunk.startPosition,
        endPosition: chunk.endPosition
      }));
    }

    // Cache the processed content using available cache methods
    const cacheKey = this.generateCacheKey(filePath);
    await this.cacheService.saveToCache(cacheKey, {
      parsedContent,
      chunks,
      processedAt: new Date().toISOString()
    }, 'metadata');    return {
      chunksGenerated: chunks.length,
      embeddingsCreated,
      bytes: parsedContent.content.length,
      words: this.estimateWordCount(parsedContent.content),
      embeddings,
      metadata
    };
  }

  private estimateWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private mergeFileResult(target: IndexingResult, source: {
    chunksGenerated: number;
    embeddingsCreated: number;
    bytes: number;
    words: number;
  }): void {
    target.filesProcessed++;
    target.chunksGenerated += source.chunksGenerated;
    target.embeddingsCreated += source.embeddingsCreated;
    target.statistics.totalBytes += source.bytes;
    target.statistics.totalWords += source.words;
  }

  private updateProgress(status: IndexingStatus): void {
    const progress = status.progress;
    progress.percentage = progress.totalFiles > 0 
      ? Math.round((progress.processedFiles / progress.totalFiles) * 100)
      : 0;
      
    // Estimate completion time based on current progress
    if (progress.processedFiles > 0 && status.startedAt) {
      const elapsed = Date.now() - status.startedAt.getTime();
      const rate = progress.processedFiles / elapsed;
      const remaining = progress.totalFiles - progress.processedFiles;
      const estimatedRemainingTime = remaining / rate;
      
      status.estimatedCompletion = new Date(Date.now() + estimatedRemainingTime);
    }
  }

  private getFileType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    return `.${extension}`;
  }

  private generateCacheKey(filePath: string): string {
    // Simple cache key based on file path
    return filePath.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private createEmptyStatistics(): IndexingStatistics {
    return {
      totalBytes: 0,
      totalWords: 0,
      averageChunkSize: 0,
      processingRate: 0,
      embeddingRate: 0
    };
  }
}
