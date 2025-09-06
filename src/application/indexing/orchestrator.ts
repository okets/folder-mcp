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
  IFileSystemService,
  IOnnxConfiguration
} from '../../di/interfaces.js';

// Required for path operations
import path from 'path';
import os from 'os';

// Domain types
import { FileFingerprint, ParsedContent, TextChunk } from '../../types/index.js';

export class IndexingOrchestrator implements IndexingWorkflow {
  private currentStatus: Map<string, IndexingStatus> = new Map();
  private embeddingServiceCache: Map<string, IEmbeddingService> = new Map();
  private embeddingServiceCreationPromises: Map<string, Promise<IEmbeddingService>> = new Map();
  
  // Performance tracking for benchmarking
  private performanceMetrics = {
    startTime: Date.now(), // Initialize with current time
    chunksProcessed: 0,
    embeddingsProcessed: 0,
    filesProcessed: 0,
    lastReportTime: Date.now(), // Initialize with current time
    lastChunkMilestone: 0 // Track chunk milestones for CPM calculation
  };
  constructor(
    private readonly fileParsingService: IFileParsingService,
    private readonly chunkingService: IChunkingService,
    private readonly embeddingService: IEmbeddingService, // Fallback service
    private readonly vectorSearchService: IVectorSearchService,
    private readonly cacheService: ICacheService,
    private readonly loggingService: ILoggingService,
    private readonly configService: IConfigurationService,
    private readonly fileSystemService: IFileSystemService,
    private readonly onnxConfiguration: IOnnxConfiguration
  ) {}

  /**
   * Get or create embedding service for a specific model
   */
  private async getEmbeddingServiceForModel(modelId: string): Promise<IEmbeddingService> {
    // Check cache first
    if (this.embeddingServiceCache.has(modelId)) {
      return this.embeddingServiceCache.get(modelId)!;
    }

    // Check if creation is already in progress
    if (this.embeddingServiceCreationPromises.has(modelId)) {
      // Wait for the existing creation to complete
      const service = await this.embeddingServiceCreationPromises.get(modelId)!;
      return service;
    }
    // Start creation and store the promise to prevent duplicate creation
    const creationPromise = this.createEmbeddingService(modelId);
    this.embeddingServiceCreationPromises.set(modelId, creationPromise);

    try {
      const service = await creationPromise;
      // Cache the completed service
      this.embeddingServiceCache.set(modelId, service);
      // Clean up the creation promise
      this.embeddingServiceCreationPromises.delete(modelId);
      return service;
    } catch (error) {
      // Clean up on error
      this.embeddingServiceCreationPromises.delete(modelId);
      throw error;
    }
  }

  /**
   * Actually create the embedding service (separated for atomic creation)
   */
  private async createEmbeddingService(modelId: string): Promise<IEmbeddingService> {
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
      // Direct ONNX service creation - NO DI, NO singleton manager
      const { ONNXEmbeddingService } = await import('../../infrastructure/embeddings/onnx/onnx-embedding-service.js');
      
      // Use ONNX configuration service with 3-tier priority system
      // Priority: ENV var > config system > optimal default
      console.error(`[ORCHESTRATOR-DEBUG] Getting ONNX configuration values...`);
      const batchSize = await this.onnxConfiguration.getBatchSize();
      const workerPoolSize = await this.onnxConfiguration.getWorkerPoolSize();
      const numThreads = await this.onnxConfiguration.getNumThreadsPerWorker();
      console.error(`[ORCHESTRATOR-DEBUG] Got values: batchSize=${batchSize}, workerPoolSize=${workerPoolSize}, numThreads=${numThreads}`);
      
      const onnxConfig: any = {
        modelId: modelId,
        cacheDirectory: path.join(os.homedir(), '.cache', 'folder-mcp', 'onnx-models'),
        maxSequenceLength: 512,
        batchSize,
        workerPoolSize,
        numThreads
      };
      
      embeddingService = new ONNXEmbeddingService(onnxConfig);
      
      await embeddingService.initialize();
      
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
    
    // Reset performance metrics for this indexing run
    this.performanceMetrics = {
      startTime,
      chunksProcessed: 0,
      embeddingsProcessed: 0,
      filesProcessed: 0,
      lastReportTime: startTime,
      lastChunkMilestone: 0
    };
    
    console.error(`[CPM-LOG] START TIME=${startTime} CONFIG=${process.env.WORKER_POOL_SIZE || '?'}w${process.env.NUM_THREADS || '?'}t PATH=${path}`);
    
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
      let totalProcessed = 0; // Track actual number of successfully processed embeddings
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
        const batchStartIndex = i; // Store the starting index for this batch
        
        try {
          const batchEmbeddings = await embeddingService.generateEmbeddings(batch);
          
          // Only add embeddings and metadata if generation succeeded
          if (batchEmbeddings && batchEmbeddings.length > 0) {
            // Iterate over returned embeddings and use their positions to build metadata
            // This ensures proper alignment even if some embeddings failed or were filtered
            const successfulEmbeddings: any[] = [];
            const successfulMetadata: any[] = [];
            
            batchEmbeddings.forEach((embedding, embeddingIndex) => {
              // Skip null/undefined/failed embeddings
              if (embedding && embedding.vector && embedding.vector.length > 0) {
                successfulEmbeddings.push(embedding);
                
                // Use the original chunk index to maintain proper alignment
                const originalChunkIndex = batchStartIndex + embeddingIndex;
                
                // Only create metadata if we have a corresponding chunk
                if (embeddingIndex < batch.length) {
                  const chunk = batch[embeddingIndex];
                  if (chunk) {
                    successfulMetadata.push({
                      filePath,
                      chunkId: `${filePath}_chunk_${originalChunkIndex}`,
                      chunkIndex: originalChunkIndex,
                      content: chunk.content,
                      startPosition: chunk.startPosition,
                      endPosition: chunk.endPosition,
                      fileHash
                    });
                  }
                }
              }
            });
            
            // Only add successful embeddings and their metadata
            if (successfulEmbeddings.length > 0) {
              embeddings.push(...successfulEmbeddings);
              metadata.push(...successfulMetadata);
              totalProcessed += successfulEmbeddings.length;
            }
            
            // Log if some embeddings failed
            if (successfulEmbeddings.length < batch.length) {
              this.loggingService.warn(
                `Partial embedding generation for batch ${i}-${Math.min(i + batchSize, chunks.length)} in ${filePath}: ` +
                `${successfulEmbeddings.length}/${batch.length} succeeded`
              );
            }
          } else {
            this.loggingService.warn(`Failed to generate embeddings for batch ${i}-${Math.min(i + batchSize, chunks.length)} in ${filePath}`);
          }
        } catch (batchError) {
          const error = batchError as Error;
          this.loggingService.error(`Error generating embeddings for batch ${i}-${Math.min(i + batchSize, chunks.length)} in ${filePath}:`, error);
          // Continue with next batch rather than failing entire file
        }
        
        // Report progress based on actual processed embeddings
        if (progressCallback) {
          progressCallback(chunks.length, totalProcessed);
          
          // TUI progress-based continuous CPM logging as suggested by user
          const currentTime = Date.now();
          const firstChunkTime = this.performanceMetrics.startTime;
          const chunksProcessedSoFar = this.performanceMetrics.chunksProcessed + totalProcessed;
          
          if (chunksProcessedSoFar > 0 && firstChunkTime > 0) {
            const elapsedMs = currentTime - firstChunkTime;
            const elapsedMin = elapsedMs / 60000;
            const avgTimePerChunk = elapsedMs / chunksProcessedSoFar;
            const currentCpm = chunksProcessedSoFar / elapsedMin;
            
            // Log continuous CPM data (user's exact format suggestion)
            console.error(`[CONTINUOUS-CPM] current_time:${currentTime}, first_chunk_time:${firstChunkTime}, chunks_so_far:${chunksProcessedSoFar}, avg_time_per_chunk:${avgTimePerChunk.toFixed(2)}ms, CPM:${currentCpm.toFixed(1)}, config:${process.env.WORKER_POOL_SIZE || '?'}w${process.env.NUM_THREADS || '?'}t`);
          }
        }
      }
      embeddingsCreated = embeddings.length;
      
      // Track performance metrics
      this.performanceMetrics.chunksProcessed += chunks.length;
      this.performanceMetrics.embeddingsProcessed += embeddings.length;
      
      // Strategic CPM logging every 100 chunks for precise measurement
      const chunkMilestone = Math.floor(this.performanceMetrics.chunksProcessed / 100) * 100;
      if (chunkMilestone > this.performanceMetrics.lastChunkMilestone && chunkMilestone > 0) {
        const now = Date.now();
        const elapsedMs = now - this.performanceMetrics.startTime;
        const elapsedMin = elapsedMs / 60000;
        const currentCpm = this.performanceMetrics.chunksProcessed / elapsedMin;
        
        console.error(`[CPM-LOG] MILESTONE=${chunkMilestone} TOTAL=${this.performanceMetrics.chunksProcessed} TIME=${now} ELAPSED=${elapsedMs}ms CPM=${currentCpm.toFixed(1)} CONFIG=${process.env.WORKER_POOL_SIZE || '?'}w${process.env.NUM_THREADS || '?'}t`);
        
        this.performanceMetrics.lastChunkMilestone = chunkMilestone;
      }
      
      // Report performance every 30 seconds
      const now = Date.now();
      const timeSinceLastReport = now - this.performanceMetrics.lastReportTime;
      
      if (timeSinceLastReport > 30000) {
        // Safety check: ensure startTime is reasonable (within last 24 hours)
        const maxReasonableAge = 24 * 60 * 60 * 1000; // 24 hours in ms
        const startTimeAge = now - this.performanceMetrics.startTime;
        
        if (startTimeAge > maxReasonableAge || this.performanceMetrics.startTime < 1000000000000) {
          console.error(`[PERF WARNING] Resetting corrupted startTime. Age: ${startTimeAge}ms, startTime: ${this.performanceMetrics.startTime}`);
          this.performanceMetrics.startTime = now - 30000; // Assume started 30 seconds ago
          this.performanceMetrics.lastReportTime = now - 30000;
        }
        
        const elapsed = (now - this.performanceMetrics.startTime) / 60000; // minutes
        const chunksPerMinute = this.performanceMetrics.chunksProcessed / elapsed;
        const embeddingsPerMinute = this.performanceMetrics.embeddingsProcessed / elapsed;
        
        // Write to performance log file
        const perfLogPath = './tmp/onnx-performance-log.jsonl';
        const perfData = {
          timestamp: new Date().toISOString(),
          elapsed: elapsed.toFixed(2),
          chunksProcessed: this.performanceMetrics.chunksProcessed,
          embeddingsProcessed: this.performanceMetrics.embeddingsProcessed,
          filesProcessed: this.performanceMetrics.filesProcessed,
          chunksPerMinute: chunksPerMinute.toFixed(1),
          embeddingsPerMinute: embeddingsPerMinute.toFixed(1),
          model: modelId,
          workerPoolSize: process.env.WORKER_POOL_SIZE || 'default',
          numThreads: process.env.NUM_THREADS || 'default',
          batchSize: options.batchSize || 32
        };
        
        try {
          const fs = await import('fs/promises');
          await fs.appendFile(perfLogPath, JSON.stringify(perfData) + '\n');
          this.loggingService.info(`[PERFORMANCE] CPM: ${chunksPerMinute.toFixed(1)}, EPM: ${embeddingsPerMinute.toFixed(1)}, Files: ${this.performanceMetrics.filesProcessed}`);
        } catch (e) {
          // Ignore file write errors - performance logging is non-critical
        }
        
        this.performanceMetrics.lastReportTime = now;
      }
      
      // Validate that embeddings and metadata arrays match
      if (embeddings.length !== metadata.length) {
        this.loggingService.error(`CRITICAL: Embeddings/metadata count mismatch in ${filePath}: ${embeddings.length} embeddings vs ${metadata.length} metadata`);
        throw new Error(`Embeddings/metadata count mismatch: ${embeddings.length} embeddings vs ${metadata.length} metadata`);
      }
    }

    // NOTE: Previously cached to JSON files, but now all data is stored in SQLite database
    // No need for duplicate caching - chunks are already saved via VectorSearchService
    
    // Track file completion
    this.performanceMetrics.filesProcessed++;
    
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
