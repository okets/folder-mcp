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

// ONNX Singleton Manager for memory efficiency
import { ONNXSingletonManager } from '../../infrastructure/embeddings/onnx-singleton-manager.js';

// Domain types
import { FileFingerprint, ParsedContent, TextChunk } from '../../types/index.js';

export class IndexingOrchestrator implements IndexingWorkflow {
  private currentStatus: Map<string, IndexingStatus> = new Map();
  private embeddingServiceCache: Map<string, IEmbeddingService> = new Map();
  constructor(
    private readonly fileParsingService: IFileParsingService,
    private readonly chunkingService: IChunkingService,
    private readonly embeddingService: IEmbeddingService, // Fallback service
    private readonly vectorSearchService: IVectorSearchService,
    private readonly cacheService: ICacheService,
    private readonly loggingService: ILoggingService,
    private readonly configService: IConfigurationService,
    private readonly fileSystemService: IFileSystemService
  ) {}

  /**
   * Get or create embedding service for a specific model
   */
  private async getEmbeddingServiceForModel(modelId: string): Promise<IEmbeddingService> {
    // Check cache first
    if (this.embeddingServiceCache.has(modelId)) {
      return this.embeddingServiceCache.get(modelId)!;
    }

    // Import necessary modules
    const { ModelCompatibilityEvaluator } = await import('../../domain/models/model-evaluator.js');
    const evaluator = new ModelCompatibilityEvaluator();
    
    // Parse model ID format: "provider:model-name" (e.g., "cpu:xenova-multilingual-e5-large")
    if (!modelId.includes(':')) {
      throw new Error(`Invalid model ID format: ${modelId}. Must specify provider (e.g., "cpu:model-name" or "gpu:model-name")`);
    }
    const [provider, modelName] = modelId.split(':');
    
    // Look up model in curated catalog
    const modelConfig = evaluator.getModelById(modelId);
    
    if (!modelConfig) {
      throw new Error(
        `Model ${modelId} not found in curated catalog. ` +
        `Available models can be found in src/config/curated-models.json`
      );
    }
    
    let embeddingService: IEmbeddingService;
    
    // Create appropriate service based on provider type
    if (provider === 'cpu' || provider === 'onnx') {
      // Use singleton manager for ONNX models to prevent memory leaks
      const onnxManager = ONNXSingletonManager.getInstance();
      embeddingService = await onnxManager.getModel(modelId);
      
    } else if (provider === 'gpu' || provider === 'python') {
      // Python models for GPU
      const { PythonEmbeddingService } = await import('../../infrastructure/embeddings/python-embedding-service.js');
      
      embeddingService = new PythonEmbeddingService({
        modelName: modelName || modelId // Use full modelId if modelName is undefined
      }, modelConfig); // Pass model config as second parameter for prefix support
      
      // Initialize the service
      await embeddingService.initialize();
      
    } else {
      throw new Error(
        `Unknown model provider: ${provider}. ` +
        `Expected 'cpu' (ONNX) or 'gpu' (Python). ` +
        `Model ID format should be 'provider:model-name'`
      );
    }
    
    // Cache the service for reuse
    this.embeddingServiceCache.set(modelId, embeddingService);
    
    this.loggingService.info('Created embedding service for model', { 
      modelId, 
      provider, 
      modelName,
      modelDisplayName: modelConfig.displayName 
    });
    
    return embeddingService;
  }

  async indexFolder(path: string, options: IndexingOptions = {}): Promise<IndexingResult> {
    const startTime = Date.now();
    
    // Embedding model MUST be provided - no fallback to reveal configuration issues
    if (!options.embeddingModel) {
      throw new Error(`No embedding model specified in indexing options. This indicates a configuration flow issue that must be fixed.`);
    }
    
    // Generate unique indexing ID for progress tracking
    const indexingId = `idx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.loggingService.info('Starting folder indexing', { 
      folderPath: path, 
      options,
      indexingId,
      timestamp: new Date().toISOString()
    });

    // Initialize status tracking with performance metrics
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
      
      // Get database size information for completion logging
      const dbStats = await this.getDatabaseStats(path);
      
      this.loggingService.info('Folder indexing completed', { 
        folderPath: path,
        indexingId,
        result: {
          filesProcessed: result.filesProcessed,
          chunksGenerated: result.chunksGenerated,
          embeddingsCreated: result.embeddingsCreated,
          processingTime: result.processingTime
        },
        performanceMetrics: {
          averageFileProcessingTime: result.filesProcessed > 0 ? result.processingTime / result.filesProcessed : 0,
          filesPerSecond: result.processingTime > 0 ? (result.filesProcessed * 1000) / result.processingTime : 0,
          chunksPerFile: result.filesProcessed > 0 ? result.chunksGenerated / result.filesProcessed : 0
        },
        databaseStats: dbStats,
        timestamp: new Date().toISOString()
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
    
    // Embedding model MUST be provided - no fallback to reveal configuration issues
    if (!options.embeddingModel) {
      throw new Error(`No embedding model specified in indexing options. This indicates a configuration flow issue that must be fixed.`);
    }
    
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
        if (!options.embeddingModel) {
          throw new Error(`No embedding model specified for file: ${filePath}`);
        }
        const fileResult = await this.processFile(filePath, options.embeddingModel, options, undefined);
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
        
        if (!options.embeddingModel) {
          throw new Error(`No embedding model specified for file: ${absoluteFilePath}`);
        }
        const fileResult = await this.processFile(absoluteFilePath, options.embeddingModel, options, undefined);
        this.mergeFileResult(result, fileResult);
        
        // Collect embeddings and metadata for vector index
        if (fileResult.embeddings && fileResult.metadata) {
          allEmbeddings.push(...fileResult.embeddings);
          allMetadata.push(...fileResult.metadata);
        }

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
      }

      // Update progress after each file attempt (success or failure)
      status.progress.processedFiles++;
      this.updateProgress(status);    }

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
  async processFile(
    filePath: string, 
    modelId: string, 
    options: IndexingOptions = {},
    progressCallback?: (totalChunks: number, processedChunks: number) => void
  ): Promise<{
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

    // Report total chunks
    if (progressCallback) {
      progressCallback(chunks.length, 0);
    }

    // Generate embeddings if not skipped
    let embeddingsCreated = 0;
    let embeddings: any[] = [];
    let metadata: any[] = [];
    
    if (!options.embeddingModel || options.embeddingModel !== 'skip') {
      // Use model-specific embedding service
      const embeddingService = await this.getEmbeddingServiceForModel(modelId);
      
      // Calculate file hash for proper fingerprinting
      let fileHash = '';
      try {
        fileHash = await this.fileSystemService.getFileHash(filePath);
      } catch (error) {
        // If we can't get the file hash, use content-based hash
        const crypto = await import('crypto');
        const contentHash = crypto.createHash('md5').update(parsedContent.content).digest('hex');
        fileHash = contentHash;
        this.loggingService.debug('Using content-based hash for file', { filePath, hash: fileHash });
      }
      
      // Process embeddings in batches and create metadata only for successful embeddings
      const batchSize = 10; // Process 10 chunks at a time
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
        
        try {
          const batchEmbeddings = await embeddingService.generateEmbeddings(batch);
          
          // Only add embeddings and metadata if generation succeeded
          if (batchEmbeddings && batchEmbeddings.length > 0) {
            embeddings.push(...batchEmbeddings);
            
            // Create metadata only for successfully embedded chunks
            const batchMetadata = batch.slice(0, batchEmbeddings.length).map((chunk, batchIndex) => ({
              filePath,
              chunkId: `${filePath}_chunk_${i + batchIndex}`,
              chunkIndex: i + batchIndex,
              content: chunk.content,
              startPosition: chunk.startPosition,
              endPosition: chunk.endPosition,
              fileHash
            }));
            
            metadata.push(...batchMetadata);
          } else {
            this.loggingService.warn(`Failed to generate embeddings for batch ${i}-${Math.min(i + batchSize, chunks.length)} in ${filePath}`);
          }
        } catch (batchError) {
          const error = batchError as Error;
          this.loggingService.error(`Error generating embeddings for batch ${i}-${Math.min(i + batchSize, chunks.length)} in ${filePath}:`, error);
          // Continue with next batch rather than failing entire file
        }
        
        // Report progress
        if (progressCallback) {
          progressCallback(chunks.length, Math.min(i + batchSize, chunks.length));
        }
      }
      embeddingsCreated = embeddings.length;
      
      // Validate that embeddings and metadata arrays match
      if (embeddings.length !== metadata.length) {
        this.loggingService.error(`CRITICAL: Embeddings/metadata count mismatch in ${filePath}: ${embeddings.length} embeddings vs ${metadata.length} metadata`);
        throw new Error(`Embeddings/metadata count mismatch: ${embeddings.length} embeddings vs ${metadata.length} metadata`);
      }
    }

    // NOTE: Previously cached to JSON files, but now all data is stored in SQLite database
    // No need for duplicate caching - chunks are already saved via VectorSearchService
    
    return {
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
      
    // Calculate performance telemetry
    let performanceMetrics = {};
    if (progress.processedFiles > 0 && status.startedAt) {
      const elapsed = Date.now() - status.startedAt.getTime();
      const rate = progress.processedFiles / elapsed;
      const remaining = progress.totalFiles - progress.processedFiles;
      const estimatedRemainingTime = remaining / rate;
      
      status.estimatedCompletion = new Date(Date.now() + estimatedRemainingTime);
      
      // Performance telemetry
      performanceMetrics = {
        averageFileProcessingTimeMs: elapsed / progress.processedFiles,
        filesPerSecond: (progress.processedFiles * 1000) / elapsed,
        chunksPerFile: progress.processedFiles > 0 ? progress.processedChunks / progress.processedFiles : 0,
        estimatedRemainingTimeMs: estimatedRemainingTime,
        elapsedTimeMs: elapsed
      };
    }

    // Log progress with performance telemetry for significant milestones
    const shouldLogProgress = 
      progress.percentage % 10 === 0 || // Every 10%
      progress.processedFiles === 1 || // First file
      progress.processedFiles === progress.totalFiles || // Completion
      Date.now() - (status.lastProgressLogTime || 0) > 30000; // Every 30 seconds

    if (shouldLogProgress) {
      this.loggingService.info('Indexing progress update', {
        progress: {
          processedFiles: progress.processedFiles,
          totalFiles: progress.totalFiles,
          percentage: progress.percentage,
          processedChunks: progress.processedChunks
        },
        performanceMetrics,
        estimatedCompletion: status.estimatedCompletion?.toISOString(),
        currentFile: status.currentFile
      });
      
      status.lastProgressLogTime = Date.now();
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

  async removeFile(filePath: string): Promise<any> {
    try {
      // Remove from cache
      await this.cacheService.invalidateCache(filePath);
      
      // Remove from vector search if available
      if (this.vectorSearchService) {
        await this.vectorSearchService.removeDocument(filePath);
      }
      
      this.loggingService.info('File removed from index', { filePath });
      
      return { success: true, filePath };
    } catch (error) {
      this.loggingService.error('Failed to remove file from index', error as Error, { filePath });
      return { success: false, filePath, error: (error as Error).message };
    }
  }

  pauseFolder(path: string): void {
    const status = this.currentStatus.get(path);
    if (status) {
      status.isPaused = true;
      this.loggingService.info('Folder indexing paused', { path });
    }
  }

  resumeFolder(path: string): void {
    const status = this.currentStatus.get(path);
    if (status) {
      status.isPaused = false;
      this.loggingService.info('Folder indexing resumed', { path });
    }
  }

  isPaused(path: string): boolean {
    const status = this.currentStatus.get(path);
    return status?.isPaused || false;
  }

  getStatistics(): any {
    const allStatuses = Array.from(this.currentStatus.values());
    return {
      activeFolders: allStatuses.filter(s => s.isRunning).length,
      pausedFolders: allStatuses.filter(s => s.isPaused).length,
      totalFolders: allStatuses.length
    };
  }

  reset(): void {
    this.currentStatus.clear();
    this.loggingService.info('IndexingOrchestrator reset');
  }

  /**
   * Test if a model is available and can be loaded
   * DEPRECATED: We now let indexing fail naturally and only do lightweight checks before active state
   */
  async testModelAvailability(modelName: string): Promise<{ available: boolean; error?: string }> {
    // Simplified stub - no longer creating expensive embedding services for validation
    this.loggingService.debug(`[ORCHESTRATOR-MODEL-TEST] Deprecated method called for ${modelName}`);
    return { available: false, error: 'Model validation has been simplified - use lightweight checks instead' };
  }
  
  /**
   * Get database statistics for completion logging
   */
  private async getDatabaseStats(folderPath: string): Promise<{
    totalFiles: number;
    totalChunks: number;
    totalEmbeddings: number;
    indexReady: boolean;
    embeddingServiceInitialized: boolean;
  }> {
    try {
      // Get current status for the folder
      const status = this.currentStatus.get(folderPath);
      const progress = status?.progress || { 
        totalFiles: 0, 
        processedFiles: 0, 
        totalChunks: 0, 
        processedChunks: 0 
      };

      // Check vector index readiness
      let indexReady = false;
      try {
        indexReady = this.vectorSearchService.isReady();
      } catch (error) {
        // Vector index status not available
        this.loggingService.debug('Vector index readiness check failed', { error: (error as Error).message });
      }

      // Check embedding service initialization
      let embeddingServiceInitialized = false;
      try {
        embeddingServiceInitialized = this.embeddingService.isInitialized();
      } catch (error) {
        // Embedding service status not available
        this.loggingService.debug('Embedding service status check failed', { error: (error as Error).message });
      }

      return {
        totalFiles: progress.processedFiles,
        totalChunks: progress.processedChunks,
        totalEmbeddings: progress.processedChunks, // Assuming 1:1 ratio for now
        indexReady,
        embeddingServiceInitialized
      };

    } catch (error) {
      this.loggingService.debug('Failed to get database statistics', { error: (error as Error).message });
      
      // Return basic stats if detailed stats fail
      const status = this.currentStatus.get(folderPath);
      const progress = status?.progress || { processedFiles: 0, processedChunks: 0 };
      
      return {
        totalFiles: progress.processedFiles,
        totalChunks: progress.processedChunks,
        totalEmbeddings: progress.processedChunks,
        indexReady: false,
        embeddingServiceInitialized: false
      };
    }
  }

  // Removed complex helper methods - using lightweight validation instead
}
