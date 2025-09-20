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
import { FileFingerprint, ParsedContent, TextChunk, SemanticMetadata } from '../../types/index.js';

// Semantic extraction service - using new KeyBERT-based service
import { ISemanticExtractionService, createSemanticExtractionService } from '../../domain/semantic/extraction-service.js';
import { IPythonSemanticService } from '../../domain/semantic/interfaces.js';

// Document semantic service for Sprint 0
import { DocumentSemanticService, DocumentContext } from '../../domain/semantic/document-semantic-service.js';
import type { ChunkSemanticData } from '../../domain/semantic/document-aggregator.js';
import type { DocumentAggregationResult } from '../../types/document-semantic.js';

// Model evaluation for context window detection
import { ModelCompatibilityEvaluator } from '../../domain/models/model-evaluator.js';

export class IndexingOrchestrator implements IndexingWorkflow {
  private currentStatus: Map<string, IndexingStatus> = new Map();
  private embeddingServiceCache: Map<string, IEmbeddingService> = new Map();
  private embeddingServiceCreationPromises: Map<string, Promise<IEmbeddingService>> = new Map();
  
  // Semantic extraction service - using new KeyBERT-based service
  private semanticExtractionService: ISemanticExtractionService | null = null;

  // Document semantic service for Sprint 0
  private documentSemanticService: DocumentSemanticService | null = null;
  
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
  ) {
    // Semantic extraction service will be initialized when needed
    // to access the Python service from the embedding service
  }

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
      // Python models for GPU - USE FACTORY TO ENSURE SINGLETON
      const { createPythonEmbeddingService } = await import('../../daemon/factories/model-factories.js');
      const { getSentenceTransformerIdFromModelId } = await import('../../config/model-registry.js');
      
      // Get the sentence-transformers model ID from the registry
      const sentenceTransformerId = getSentenceTransformerIdFromModelId(modelId);
      
      // Use factory function to get singleton instance
      embeddingService = await createPythonEmbeddingService({
        modelName: sentenceTransformerId // Use sentence-transformers ID, not our internal ID
      })
      
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
        this.loggingService.debug('Building vector index', { 
          embeddingsCount: result.embeddingsCreated,
          filesProcessed: result.filesProcessed
        });
          // For now, just enable the index (actual implementation TBD)
        await this.vectorSearchService.buildIndex(allEmbeddings, allMetadata);
        
        this.loggingService.debug('Vector index built successfully');
        
        // Force WAL checkpoint to ensure file_states are persisted
        // This is critical for fixing the re-indexing bug on first restart
        if ('getDatabaseManager' in this.vectorSearchService) {
          const storage = this.vectorSearchService as any;
          const dbManager = storage.getDatabaseManager();
          if (dbManager && typeof dbManager.checkpoint === 'function') {
            await dbManager.checkpoint();
            this.loggingService.debug('Forced WAL checkpoint after indexing');
          }
        }

        // Debug: Check if file states were persisted
        this.loggingService.debug('Checking file state persistence');
        
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
    // Log file processing start
    this.loggingService.debug(`Indexing file: ${filePath}`, { modelId });
    
    try {
    
    // Parse file content - need to determine file type
    const fileType = this.getFileType(filePath);
    if (!this.fileParsingService.isSupported(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const parsedContent = await this.fileParsingService.parseFile(filePath, fileType);
    
    // Chunk content with model-specific context window
    // Get model configuration to determine context window
    const evaluator = new ModelCompatibilityEvaluator();
    const modelConfig = evaluator.getModelById(modelId);
    
    // Calculate chunk size based on model's context window
    // Use a conservative approach: use 1/4 of context window for chunk size to allow for:
    // - Overlap between chunks
    // - Query tokens in search scenarios  
    // - Safety margin for edge cases
    const contextWindow = modelConfig?.contextWindow || 512; // Default to 512 if not specified
    const maxChunkTokens = Math.floor(contextWindow / 4); // Conservative: 1/4 of context window
    const baseChunkSize = maxChunkTokens * 4; // Convert tokens to approximate characters (4 chars per token)
    
    // Calculate safe chunk size based on model characteristics
    // Large context models require smaller chunks to prevent memory issues
    let chunkSizeMultiplier = 1.0;
    if (contextWindow >= 8192) {
      // Very large context (BGE-M3): use 50% of calculated size
      chunkSizeMultiplier = 0.5;
    } else if (contextWindow >= 2048) {
      // Large context: use 75% of calculated size
      chunkSizeMultiplier = 0.75;
    }
    
    const chunkSize = Math.floor(baseChunkSize * chunkSizeMultiplier);
    
    // Ensure minimum viable chunk size
    const MIN_CHUNK_SIZE = 500; // Minimum for meaningful content
    const finalChunkSize = Math.max(MIN_CHUNK_SIZE, chunkSize);
    
    this.loggingService.info('Chunking with model-aware settings', {
      modelId,
      contextWindow,
      maxChunkTokens,
      baseChunkSize,
      chunkSizeMultiplier,
      finalChunkSize,
      documentLength: parsedContent.content.length
    });
    
    const chunkResult = await this.chunkingService.chunkText(parsedContent, finalChunkSize);
    const chunks = chunkResult.chunks;

    // Extract semantic metadata for each chunk (Sprint 10)
    const chunksWithSemantics = await this.extractSemanticMetadata(chunks, modelId);

    // Document-level semantic aggregation removed - not used in production
    // Keeping only chunk-level semantics which are actually used

    // Report total chunks
    if (progressCallback) {
      progressCallback(chunksWithSemantics.length, 0);
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

      for (let i = 0; i < chunksWithSemantics.length; i += batchSize) {
        const batch = chunksWithSemantics.slice(i, Math.min(i + batchSize, chunksWithSemantics.length));
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
                    const metadataObj: any = {
                      filePath,
                      chunkId: `${filePath}_chunk_${originalChunkIndex}`,
                      chunkIndex: originalChunkIndex,
                      content: chunk.content,
                      startPosition: chunk.startPosition,
                      endPosition: chunk.endPosition,
                      fileHash
                    };

                    // Pass through extraction params from format-aware chunking
                    // Format-aware chunking services add extractionParams for accurate content reconstruction
                    const chunkMetadata = chunk.metadata as any;
                    if (chunkMetadata?.extractionParams) {
                      metadataObj.extractionParams = chunkMetadata.extractionParams;
                    }

                    // Add semantic metadata from KeyBERT extraction
                    if (chunk.semanticMetadata) {
                      // Store semantic fields directly in metadata for database storage
                      metadataObj.keyPhrases = chunk.semanticMetadata.keyPhrases || [];
                      metadataObj.topics = chunk.semanticMetadata.topics || [];
                      metadataObj.readabilityScore = chunk.semanticMetadata.readabilityScore || 50;

                      // Log that we're including semantic metadata
                      if (chunk.semanticMetadata.keyPhrases && chunk.semanticMetadata.keyPhrases.length > 0) {
                        this.loggingService.debug('Including semantic metadata in storage', {
                          chunkIndex: originalChunkIndex,
                          keyPhraseCount: chunk.semanticMetadata.keyPhrases.length,
                          samplePhrases: chunk.semanticMetadata.keyPhrases.slice(0, 3)
                        });
                      }
                    } else {
                      // FAIL LOUDLY if semantic metadata is missing
                      this.loggingService.error('CRITICAL: Semantic metadata missing for chunk!');
                      this.loggingService.error(`Details: chunkIndex=${originalChunkIndex}, filePath=${filePath}`);
                    }

                    successfulMetadata.push(metadataObj);
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
        
        // Log performance metrics periodically
        this.loggingService.debug(`Performance: ${chunksPerMinute.toFixed(0)} CPM, ${embeddingsPerMinute.toFixed(0)} EPM, ${this.performanceMetrics.filesProcessed} files processed`);
        
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
    
    // Log file processing completion
    this.loggingService.info(`Indexed ${filePath}: ${embeddingsCreated} embeddings created`, {
      modelId,
      chunks: chunks.length
    });
    
    return {
      chunksGenerated: chunks.length,
      embeddingsCreated,
      bytes: parsedContent.content.length,
      words: this.estimateWordCount(parsedContent.content),
      embeddings,
      metadata
    };
  } catch (error) {
    // Log file processing failure
    this.loggingService.error(`[INDEXING FAILED] Failed to index file: ${filePath}`, error instanceof Error ? error : new Error(String(error)));
    throw error; // Re-throw to maintain existing error handling
  }
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

  /**
   * Initialize semantic extraction service if not already initialized
   * @param embeddingService The embedding service to check for KeyBERT support (either fallback or model-specific)
   */
  private async initializeSemanticService(embeddingService?: IEmbeddingService): Promise<void> {
    this.loggingService.debug('[SEMANTIC-INIT] Starting semantic service initialization');

    if (this.semanticExtractionService) {
      this.loggingService.debug('[SEMANTIC-INIT] Service already initialized, returning');
      return; // Already initialized
    }

    // Try to get Python service from embedding service
    let pythonService: IPythonSemanticService | null = null;

    // Use the provided embedding service or fallback to the default one
    const serviceToCheck = embeddingService || this.embeddingService;

    // Check if the embedding service is a PythonEmbeddingService with semantic methods
    const embeddingServiceAny = serviceToCheck as any;
    this.loggingService.debug('[SEMANTIC-INIT] Checking embedding service for semantic methods', {
      hasIsKeyBERT: typeof embeddingServiceAny.isKeyBERTAvailable === 'function',
      hasExtractKeyPhrases: typeof embeddingServiceAny.extractKeyPhrasesKeyBERT === 'function',
      embeddingServiceType: embeddingServiceAny.constructor?.name,
      isProvidedService: !!embeddingService
    });

    if (typeof embeddingServiceAny.isKeyBERTAvailable === 'function' &&
        typeof embeddingServiceAny.extractKeyPhrasesKeyBERT === 'function') {
      // Check if KeyBERT is actually available (not just that the methods exist)
      // Add retry logic as the Python model might still be loading
      try {
        let isKeyBERTAvailable = false;
        const maxRetries = 5;
        const retryDelay = 1000; // 1 second between retries

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            isKeyBERTAvailable = await embeddingServiceAny.isKeyBERTAvailable();
            this.loggingService.debug(`[SEMANTIC-INIT] KeyBERT availability check attempt ${attempt}/${maxRetries}:`, { isKeyBERTAvailable });

            if (isKeyBERTAvailable) {
              break; // Success!
            }

            // If not available yet and not the last attempt, wait and retry
            if (attempt < maxRetries) {
              this.loggingService.debug(`[SEMANTIC-INIT] KeyBERT not ready yet, waiting ${retryDelay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          } catch (attemptError) {
            this.loggingService.debug(`[SEMANTIC-INIT] KeyBERT check attempt ${attempt} failed:`, attemptError);
            if (attempt === maxRetries) {
              throw attemptError; // Re-throw on last attempt
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

        if (isKeyBERTAvailable) {
          // The embedding service itself implements the semantic methods and KeyBERT is available
          pythonService = embeddingServiceAny as IPythonSemanticService;
          this.loggingService.info('[SEMANTIC-INIT] Using KeyBERT from Python embedding service for semantic extraction');
        } else {
          // Methods exist but KeyBERT is not actually available after retries
          const errorMsg = '[SEMANTIC-INIT] CRITICAL: KeyBERT is not available in Python environment after retries. ' +
                          'GPU models require Python with KeyBERT installed.';
          this.loggingService.error(errorMsg);
          throw new Error(errorMsg);
        }
      } catch (checkError) {
        // Error checking KeyBERT availability
        const errorMsg = `[SEMANTIC-INIT] CRITICAL: Failed to check KeyBERT availability: ${checkError}. ` +
                        'GPU models require Python with KeyBERT installed.';
        this.loggingService.error(errorMsg);
        throw new Error(errorMsg);
      }
    } else {
      // Check if we have an ONNX embedding service for N-gram extraction
      const isONNXModel = serviceToCheck.getServiceType() === 'onnx';

      if (!isONNXModel) {
        // Only fail for GPU models that need Python
        const errorMsg = '[SEMANTIC-INIT] CRITICAL: Python service with KeyBERT methods not available for GPU model. ' +
                        'GPU models require Python with KeyBERT installed.';
        this.loggingService.error(errorMsg);
        throw new Error(errorMsg);
      }

      // For ONNX, we'll use N-gram extraction
      this.loggingService.info('[SEMANTIC-INIT] ONNX model detected - will use N-gram extraction');
    }

    // Create the semantic extraction service with Python support or ONNX fallback
    this.loggingService.debug('[SEMANTIC-INIT] Creating semantic extraction service', {
      hasPython: !!pythonService,
      hasEmbeddingService: !!serviceToCheck
    });

    // Create an adapter for the embedding service if it's ONNX
    let embeddingModelAdapter: any = null;
    if (!pythonService && serviceToCheck) {
      embeddingModelAdapter = this.createEmbeddingAdapter(serviceToCheck);
    }

    this.semanticExtractionService = createSemanticExtractionService(
      pythonService,
      this.loggingService,
      embeddingModelAdapter
    );
    this.loggingService.debug('[SEMANTIC-INIT] Semantic extraction service created successfully');
  }

  /**
   * Process document-level semantic aggregation (Sprint 0)
   */
  private async processDocumentSemantics(
    filePath: string,
    chunks: TextChunk[],
    modelId: string
  ): Promise<DocumentAggregationResult> {
    // Initialize document semantic service if needed
    if (!this.documentSemanticService) {
      this.documentSemanticService = new DocumentSemanticService({}, this.loggingService);
    }

    // Get embedding service for the model
    const embeddingService = await this.getEmbeddingServiceForModel(modelId);

    // Convert chunks to ChunkSemanticData format
    const chunkSemanticData: ChunkSemanticData[] = chunks.map((chunk, index) => ({
      id: index, // Use index as temporary ID
      content: chunk.content,
      semanticMetadata: {
        topics: chunk.semanticMetadata?.topics || [],
        keyPhrases: chunk.semanticMetadata?.keyPhrases || [],
        readabilityScore: chunk.semanticMetadata?.readabilityScore ?? null
      }
    }));

    // Create document context
    const context: DocumentContext = {
      documentId: 0, // Will be updated when we get the actual document ID
      filePath,
      modelId,
      embeddingService
    };

    // Process document semantics
    const result = await this.documentSemanticService.processDocumentSemantics(context, chunkSemanticData);

    // NOTE: We no longer save here - deferred until after buildIndex creates the documents
    // The result will be returned and saved later in processFingerprints

    return result;
  }

  /**
   * Save document semantic data to database
   */
  private async saveDocumentSemanticData(
    filePath: string,
    result: DocumentAggregationResult
  ): Promise<void> {
    // Check if vector search service supports semantic updates
    const storage = this.vectorSearchService as any;
    if (storage && typeof storage.updateDocumentSemantics === 'function') {
      const semanticData = {
        semantic_summary: JSON.stringify(result.semantic_summary),
        primary_theme: result.primary_theme,
        avg_readability_score: result.semantic_summary.metrics.avg_readability,
        topic_diversity_score: result.semantic_summary.metrics.topic_diversity,
        phrase_richness_score: result.semantic_summary.metrics.phrase_richness,
        extraction_method: result.extraction_method,
        extraction_failed: !result.success,
        extraction_error: result.success ? undefined : result.warnings?.join('; '),
        extraction_attempts: 1
      };

      await storage.updateDocumentSemantics(filePath, semanticData);

      this.loggingService.debug(`[DOCUMENT-SEMANTICS] Saved semantic data for ${filePath}:`, {
        method: semanticData.extraction_method,
        theme: semanticData.primary_theme,
        topicsCount: result.semantic_summary.top_topics.length,
        phrasesCount: result.semantic_summary.top_phrases.length
      });
    } else {
      this.loggingService.warn(`[DOCUMENT-SEMANTICS] Vector search service does not support semantic updates for ${filePath}`);
    }
  }

  /**
   * Extract semantic metadata for ALL chunks using KeyBERT-based service
   * FAILS LOUDLY if extraction fails - no silent failures!
   * @param chunks The text chunks to process
   * @param modelId The model ID being used for embeddings (to get the correct service)
   */
  private async extractSemanticMetadata(chunks: TextChunk[], modelId?: string): Promise<TextChunk[]> {
    this.loggingService.debug('[SEMANTIC-EXTRACT] Starting semantic extraction', {
      chunkCount: chunks.length
    });

    // Get the model-specific embedding service if modelId is provided
    let embeddingService: IEmbeddingService | undefined;
    let isONNXModel = false;

    if (modelId) {
      // Check if it's a CPU/ONNX model from the model ID
      const isCPUModelId = modelId.startsWith('cpu:') || modelId.startsWith('onnx:');

      if (isCPUModelId) {
        isONNXModel = true;
        this.loggingService.info('[SEMANTIC-EXTRACT] Detected ONNX/CPU model - will use N-gram extraction', {
          modelId
        });
      }

      try {
        embeddingService = await this.getEmbeddingServiceForModel(modelId);
        this.loggingService.debug('[SEMANTIC-EXTRACT] Got model-specific embedding service', {
          modelId,
          serviceType: (embeddingService as any).constructor?.name
        });

        // Check if it's an ONNX model
        const embeddingServiceAny = embeddingService as any;
        isONNXModel = embeddingServiceAny.constructor?.name === 'ONNXEmbeddingService' ||
                            embeddingServiceAny.constructor?.name === 'ONNXBridge' ||
                            embeddingServiceAny.constructor?.name === 'ONNXEmbeddingServiceAdapter';
      } catch (error) {
        this.loggingService.error('[SEMANTIC-EXTRACT] Failed to get model-specific embedding service', error instanceof Error ? error : new Error(String(error)));
        // Will fall back to default service
      }
    } else {
      // No model ID provided, check the default service
      const embeddingServiceAny = this.embeddingService as any;
      isONNXModel = embeddingServiceAny.constructor?.name === 'ONNXEmbeddingService' ||
                          embeddingServiceAny.constructor?.name === 'ONNXBridge' ||
                          embeddingServiceAny.constructor?.name === 'ONNXEmbeddingServiceAdapter';
    }

    if (isONNXModel) {
      this.loggingService.info('[SEMANTIC-EXTRACT] Using N-gram extraction for ONNX model', {
        serviceType: embeddingService ? (embeddingService as any).constructor?.name : 'default service'
      });
    }

    // Initialize semantic service if needed - pass the model-specific service if available
    try {
      await this.initializeSemanticService(embeddingService);

      // For ONNX models, we need to recreate the semantic extraction service with a proper adapter
      // when we have a dynamically created embedding service
      if (isONNXModel && embeddingService) {
        this.loggingService.info('[SEMANTIC-EXTRACT] Recreating semantic extraction service with ONNX adapter for dynamic embedding service');

        // Create an adapter for the dynamically created embedding service
        const embeddingModelAdapter = this.createEmbeddingAdapter(embeddingService);

        // Recreate the semantic extraction service with the new adapter
        this.semanticExtractionService = createSemanticExtractionService(
          null, // No Python service for ONNX models
          this.loggingService,
          embeddingModelAdapter
        );

        this.loggingService.debug('[SEMANTIC-EXTRACT] Semantic extraction service recreated with ONNX adapter');
      }
    } catch (error) {
      this.loggingService.error('[SEMANTIC-EXTRACT] Failed to initialize semantic service: ' +
        (error instanceof Error ? error.message : String(error)));
      throw error;
    }

    if (!this.semanticExtractionService) {
      throw new Error('Semantic extraction service not initialized');
    }

    // For ONNX models, we need to generate embeddings FIRST before semantic extraction
    // because N-gram extraction requires embeddings to calculate cosine similarity
    let chunkEmbeddings: Map<number, Float32Array> | undefined;

    this.loggingService.debug('[SEMANTIC-EXTRACT] Pre-embedding check', {
      isONNXModel,
      hasEmbeddingService: !!embeddingService,
      embeddingServiceType: embeddingService ? (embeddingService as any).constructor?.name : 'none'
    });

    if (isONNXModel && embeddingService) {
      this.loggingService.info('[SEMANTIC-EXTRACT] Generating embeddings first for ONNX N-gram extraction');
      chunkEmbeddings = new Map<number, Float32Array>();

      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

        try {
          const batchEmbeddings = await embeddingService.generateEmbeddings(batch);

          // Store embeddings for each chunk
          batchEmbeddings.forEach((embedding, idx) => {
            if (embedding && embedding.vector && embedding.vector.length > 0) {
              const chunkIndex = i + idx;
              // Ensure it's a Float32Array
              const vector = embedding.vector instanceof Float32Array
                ? embedding.vector
                : new Float32Array(embedding.vector);
              chunkEmbeddings!.set(chunkIndex, vector);
              this.loggingService.debug('[SEMANTIC-EXTRACT] Stored embedding for chunk', {
                chunkIndex,
                vectorLength: embedding.vector.length
              });
            }
          });
        } catch (error) {
          this.loggingService.error('[SEMANTIC-EXTRACT] Failed to generate embeddings for batch', error instanceof Error ? error : new Error(String(error)));
          // Continue with other batches
        }
      }

      this.loggingService.info('[SEMANTIC-EXTRACT] Generated embeddings for chunks', {
        totalChunks: chunks.length,
        embeddingsGenerated: chunkEmbeddings.size
      });
    }

    const enhancedChunks: TextChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      this.loggingService.debug('[SEMANTIC-EXTRACT] Processing chunk', {
        chunkIndex: chunk.chunkIndex,
        contentLength: chunk.content.length,
        hasEmbedding: isONNXModel ? chunkEmbeddings?.has(i) : false
      });

      try {
        // For ONNX models, pass the embedding to extractFromText
        let semanticData;
        if (isONNXModel && chunkEmbeddings?.has(i)) {
          const chunkEmbedding = chunkEmbeddings.get(i);
          this.loggingService.debug('[SEMANTIC-EXTRACT] Using N-gram extraction with embedding', {
            chunkIndex: i,
            embeddingLength: chunkEmbedding?.length
          });
          semanticData = await this.semanticExtractionService.extractFromText(chunk.content, chunkEmbedding);
        } else {
          // For GPU models or if no embedding available, use KeyBERT
          semanticData = await this.semanticExtractionService.extractFromText(chunk.content);
        }

        const semanticMetadata: SemanticMetadata = {
          keyPhrases: semanticData.keyPhrases,
          topics: semanticData.topics,
          readabilityScore: semanticData.readabilityScore,
          semanticProcessed: true,
          semanticTimestamp: Date.now()
        };

        this.loggingService.info('Semantic extraction with KeyBERT successful', {
          chunkIndex: chunk.chunkIndex,
          keyPhrasesCount: semanticData.keyPhrases.length,
          topicsCount: semanticData.topics.length,
          readabilityScore: semanticData.readabilityScore,
          extractionMethod: semanticData.extractionMethod,
          multiwordRatio: semanticData.qualityMetrics?.multiwordRatio
        });

        // ALWAYS add semantic metadata
        const enhancedChunk: TextChunk = {
          ...chunk,
          semanticMetadata
        };

        enhancedChunks.push(enhancedChunk);

      } catch (error) {
        // FAIL LOUDLY - no silent failures!
        this.loggingService.error(`CRITICAL: Semantic extraction failed for chunk ${chunk.chunkIndex}: ` +
          (error instanceof Error ? error.message : String(error)));

        // Re-throw to fail the indexing process
        throw new Error(`Semantic extraction failed for chunk ${chunk.chunkIndex}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return enhancedChunks;
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
   * Create an embedding adapter for N-gram extraction
   * Extracted to avoid code duplication
   */
  private createEmbeddingAdapter(embeddingService: IEmbeddingService): any {
    return {
      generateEmbedding: async (text: string) => {
        // Create a minimal TextChunk for the embedding service
        const chunk: TextChunk = {
          content: text,
          metadata: {
            sourceFile: 'ngram-extraction',
            sourceType: 'text',
            totalChunks: 1,
            hasOverlap: false
          },
          startPosition: 0,
          endPosition: text.length,
          tokenCount: Math.ceil(text.length / 4),
          chunkIndex: 0,
          semanticMetadata: {
            keyPhrases: [],
            topics: [],
            readabilityScore: 50,
            semanticProcessed: false,
            semanticTimestamp: Date.now()
          }
        };

        const embeddings = await embeddingService.generateEmbeddings([chunk]);
        if (embeddings && embeddings.length > 0 && embeddings[0]) {
          const embedding = embeddings[0];
          // Ensure it's a Float32Array
          return embedding.vector instanceof Float32Array
            ? embedding.vector
            : new Float32Array(embedding.vector);
        }
        throw new Error('Failed to generate embedding');
      },
      getModelDimensions: () => {
        // Get dimensions based on service type or model name
        const serviceAny = embeddingService as any;
        if (typeof serviceAny.getModelDimensions === 'function') {
          return serviceAny.getModelDimensions();
        }
        // Default to common ONNX dimensions
        return 384; // E5-small dimension
      }
    };
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
