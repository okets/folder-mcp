/**
 * Indexing Pipeline
 * 
 * Provides a flexible pipeline for processing individual files or batches
 * with configurable stages and error recovery.
 */

import { 
  IndexingOptions, 
  IndexingError,
  IndexingStatistics 
} from './index.js';

// Domain service interfaces
import { 
  IFileParsingService,
  IChunkingService,
  IEmbeddingService,
  ICacheService,
  ILoggingService 
} from '../../di/interfaces.js';

// Domain types
import { FileFingerprint, ParsedContent, TextChunk } from '../../types/index.js';

export interface PipelineStage {
  name: string;
  execute: (input: any, context: PipelineContext) => Promise<any>;
  canRetry: boolean;
  maxRetries: number;
}

export interface PipelineContext {
  filePath: string;
  options: IndexingOptions;
  metadata: Record<string, any>;
  statistics: IndexingStatistics;
  errors: IndexingError[];
}

export interface PipelineResult<T = any> {
  success: boolean;
  data?: T;
  error?: IndexingError | undefined;
  statistics: IndexingStatistics;
}

export class IndexingPipeline {
  private stages: PipelineStage[] = [];

  constructor(
    private readonly fileParsingService: IFileParsingService,
    private readonly chunkingService: IChunkingService,
    private readonly embeddingService: IEmbeddingService,
    private readonly cacheService: ICacheService,
    private readonly loggingService: ILoggingService
  ) {
    this.initializeStages();
  }

  /**
   * Process a single file through the complete pipeline
   */
  async processFile(
    fingerprint: FileFingerprint, 
    options: IndexingOptions = {}
  ): Promise<PipelineResult> {
    const context: PipelineContext = {
      filePath: fingerprint.path,
      options,
      metadata: {
        hash: fingerprint.hash,
        size: fingerprint.size,
        lastModified: fingerprint.modified
      },
      statistics: this.createEmptyStatistics(),
      errors: []
    };

    this.loggingService.debug('Starting pipeline for file', { filePath: fingerprint.path });

    try {
      let currentData: any = fingerprint;

      // Execute each stage in sequence
      for (const stage of this.stages) {
        const stageResult = await this.executeStageWithRetry(stage, currentData, context);
        
        if (!stageResult.success) {
          return {
            success: false,
            error: stageResult.error,
            statistics: context.statistics
          };
        }
        
        currentData = stageResult.data;
      }

      return {
        success: true,
        data: currentData,
        statistics: context.statistics
      };

    } catch (error) {
      const pipelineError: IndexingError = {
        filePath: fingerprint.path,
        error: error instanceof Error ? error.message : String(error),
        stage: 'parsing',
        timestamp: new Date(),
        recoverable: false
      };

      return {
        success: false,
        error: pipelineError,
        statistics: context.statistics
      };
    }
  }

  /**
   * Process multiple files in parallel with concurrency control
   */
  async processBatch(
    fingerprints: FileFingerprint[], 
    options: IndexingOptions = {}
  ): Promise<PipelineResult[]> {
    const concurrency = options.parallelWorkers || 3;
    const results: PipelineResult[] = [];

    // Process in batches to control concurrency
    for (let i = 0; i < fingerprints.length; i += concurrency) {
      const batch = fingerprints.slice(i, i + concurrency);
      const batchPromises = batch.map(fp => this.processFile(fp, options));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: {
              filePath: 'unknown',
              error: result.reason?.message || 'Unknown error',
              stage: 'parsing',
              timestamp: new Date(),
              recoverable: false
            },
            statistics: this.createEmptyStatistics()
          });
        }
      }
    }

    return results;
  }

  private initializeStages(): void {
    this.stages = [
      {
        name: 'parsing',
        execute: this.parseStage.bind(this),
        canRetry: true,
        maxRetries: 2
      },
      {
        name: 'chunking',
        execute: this.chunkingStage.bind(this),
        canRetry: true,
        maxRetries: 1
      },
      {
        name: 'embedding',
        execute: this.embeddingStage.bind(this),
        canRetry: true,
        maxRetries: 3
      },
      {
        name: 'storage',
        execute: this.cachingStage.bind(this),
        canRetry: true,
        maxRetries: 2
      }
    ];
  }

  private async executeStageWithRetry(
    stage: PipelineStage,
    input: any,
    context: PipelineContext
  ): Promise<PipelineResult> {
    let lastError: Error | null = null;
    let attempt = 0;
    const maxRetries = stage.canRetry ? stage.maxRetries : 0;

    while (attempt <= maxRetries) {
      try {
        this.loggingService.debug(`Executing stage: ${stage.name}`, { 
          filePath: context.filePath, 
          attempt: attempt + 1 
        });

        const result = await stage.execute(input, context);
        
        return {
          success: true,
          data: result,
          statistics: context.statistics
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt <= maxRetries) {
          this.loggingService.warn(`Stage ${stage.name} failed, retrying`, { 
            filePath: context.filePath, 
            attempt, 
            error: lastError.message 
          });
          
          // Exponential backoff for retries
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All retries exhausted
    const stageError: IndexingError = {
      filePath: context.filePath,
      error: lastError?.message || 'Unknown error',
      stage: stage.name as 'parsing' | 'chunking' | 'embedding' | 'storage',
      timestamp: new Date(),
      recoverable: stage.canRetry
    };

    context.errors.push(stageError);

    return {
      success: false,
      error: stageError,
      statistics: context.statistics
    };
  }

  private async parseStage(fingerprint: FileFingerprint, context: PipelineContext): Promise<ParsedContent> {
    const startTime = Date.now();
    
    // Extract file extension for file type
    const fileExtension = fingerprint.path.split('.').pop()?.toLowerCase() || 'txt';
    
    const parsedContent = await this.fileParsingService.parseFile(fingerprint.path, fileExtension);
    
    // Update statistics
    context.statistics.totalBytes += parsedContent.content.length;
    context.statistics.totalWords += this.countWords(parsedContent.content);
    
    this.loggingService.debug('File parsed', { 
      filePath: fingerprint.path, 
      contentLength: parsedContent.content.length,
      processingTime: Date.now() - startTime 
    });

    return parsedContent;
  }

  private async chunkingStage(parsedContent: ParsedContent, context: PipelineContext): Promise<TextChunk[]> {
    const startTime = Date.now();
    
    const chunkingResult = await this.chunkingService.chunkText(
      parsedContent, 
      context.options.chunkingOptions?.maxChunkSize,
      context.options.chunkingOptions?.overlapSize
    );

    const chunks = chunkingResult.chunks;

    // Update statistics
    const chunkSizes = chunks.map((c: TextChunk) => c.content.length);
    context.statistics.averageChunkSize = chunkSizes.length > 0
      ? Math.round(chunkSizes.reduce((sum: number, size: number) => sum + size, 0) / chunkSizes.length)
      : 0;

    this.loggingService.debug('Content chunked', { 
      filePath: context.filePath, 
      chunkCount: chunks.length,
      averageChunkSize: context.statistics.averageChunkSize,
      processingTime: Date.now() - startTime 
    });

    return chunks;
  }

  private async embeddingStage(chunks: TextChunk[], context: PipelineContext): Promise<TextChunk[]> {
    // Skip embedding generation if explicitly disabled
    if (context.options.embeddingModel === 'skip') {
      this.loggingService.debug('Skipping embedding generation', { filePath: context.filePath });
      return chunks;
    }

    const startTime = Date.now();
    
    const embeddings = await this.embeddingService.generateEmbeddings(chunks);
    
    // Attach embeddings to chunks
    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index]
    }));

    // Update statistics
    const processingTime = (Date.now() - startTime) / 1000;
    context.statistics.embeddingRate = embeddings.length / processingTime;

    this.loggingService.debug('Embeddings generated', { 
      filePath: context.filePath, 
      embeddingCount: embeddings.length,
      embeddingRate: context.statistics.embeddingRate,
      processingTime 
    });

    return chunksWithEmbeddings;
  }

  private async cachingStage(chunks: TextChunk[], context: PipelineContext): Promise<void> {
    const startTime = Date.now();
    
    // NOTE: Previously cached to JSON files, but now all data is stored in SQLite database
    // No need for duplicate caching - chunks are already saved via VectorSearchService
    
    this.loggingService.debug('Content processed (no duplicate caching)', { 
      filePath: context.filePath, 
      processingTime: Date.now() - startTime 
    });
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
