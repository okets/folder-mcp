/**
 * Indexing service with dependency injection
 * 
 * Refactored version of the indexing logic that uses proper dependency injection
 * instead of directly importing and instantiating dependencies.
 */

import { join, extname } from 'path';
import { FileFingerprint, TextChunk, ParsedContent, PackageJson } from '../types/index.js';
import { ResolvedConfig } from '../config/resolver.js';
import {
  IConfigurationService,
  IFileParsingService,
  IChunkingService,
  IEmbeddingService,
  ICacheService,
  IFileSystemService,
  ILoggingService
} from '../di/interfaces.js';

export interface IndexingOptions {
  skipEmbeddings?: boolean;
  force?: boolean;
  resolvedConfig?: ResolvedConfig;
}

/**
 * Indexing service with proper dependency injection
 */
export class IndexingService {
  constructor(
    private readonly configService: IConfigurationService,
    private readonly fileParsingService: IFileParsingService,
    private readonly chunkingService: IChunkingService,
    private readonly embeddingService: IEmbeddingService,
    private readonly cacheService: ICacheService,
    private readonly fileSystemService: IFileSystemService,
    private readonly loggingService: ILoggingService
  ) {}

  /**
   * Index a folder with proper error recovery and progress tracking
   */
  async indexFolder(
    folderPath: string, 
    packageJson: PackageJson, 
    options: IndexingOptions = {}
  ): Promise<void> {
    this.loggingService.info('Starting folder indexing', { folderPath, options });

    try {
      // Setup cache directory
      await this.cacheService.setupCacheDirectory();

      // Resolve configuration if not provided
      const config = options.resolvedConfig || await this.configService.resolveConfig(folderPath);
      
      // Validate configuration
      const validationErrors = this.configService.validateConfig(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      // Generate file fingerprints
      this.loggingService.info('Generating file fingerprints');
      const fingerprints = await this.fileSystemService.generateFingerprints(
        folderPath,
        config.fileExtensions,
        config.ignorePatterns
      );

      if (fingerprints.length === 0) {
        this.loggingService.warn('No supported files found in folder');
        return;
      }

      // Get cache status
      const cacheStatus = await this.cacheService.getCacheStatus(fingerprints);
      this.displayCacheStatus(cacheStatus);

      // Process files that need processing
      const filesToProcess = [
        ...cacheStatus.newFiles,
        ...cacheStatus.modifiedFiles
      ];

      if (filesToProcess.length > 0) {
        await this.processFiles(filesToProcess, folderPath, config);
      }

      // Generate embeddings if requested
      if (!options.skipEmbeddings) {
        await this.generateEmbeddingsForFiles(filesToProcess, config);
      }

      this.loggingService.info('Folder indexing completed successfully', {
        totalFiles: fingerprints.length,
        processedFiles: filesToProcess.length
      });

    } catch (error) {
      this.loggingService.error('Folder indexing failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Process files with parsing and chunking
   */
  private async processFiles(
    fingerprints: FileFingerprint[],
    basePath: string,
    config: ResolvedConfig
  ): Promise<void> {
    this.loggingService.info('Processing files', { count: fingerprints.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < fingerprints.length; i++) {
      const fingerprint = fingerprints[i];
      if (!fingerprint) {
        this.loggingService.warn(`Skipping undefined fingerprint at index ${i}`);
        continue;
      }
      
      const fullPath = join(basePath, fingerprint.path);
      const ext = extname(fingerprint.path).toLowerCase();

      this.loggingService.debug(`Processing file ${i + 1}/${fingerprints.length}`, {
        path: fingerprint.path,
        extension: ext
      });

      try {
        // Parse the file
        const parsedContent = await this.fileParsingService.parseFile(fullPath, ext);

        // Chunk the content
        const chunkedResult = await this.chunkingService.chunkText(
          parsedContent,
          config.chunkSize,
          config.overlap
        );

        // Save to cache
        await this.saveContentToCache(parsedContent, chunkedResult, fingerprint.hash);

        successCount++;
        this.loggingService.debug(`Successfully processed ${fingerprint.path}`, {
          chunks: chunkedResult.totalChunks
        });

      } catch (error) {
        errorCount++;
        this.loggingService.error(`Failed to process ${fingerprint.path}`, error instanceof Error ? error : new Error(String(error)));
        // Continue processing other files
      }
    }

    this.loggingService.info('File processing completed', {
      successful: successCount,
      errors: errorCount,
      total: fingerprints.length
    });
  }

  /**
   * Generate embeddings for processed files
   */
  private async generateEmbeddingsForFiles(
    fingerprints: FileFingerprint[],
    config: ResolvedConfig
  ): Promise<void> {
    if (fingerprints.length === 0) {
      this.loggingService.debug('No files to generate embeddings for');
      return;
    }

    this.loggingService.info('Generating embeddings', { fileCount: fingerprints.length });

    // Initialize embedding service
    if (!this.embeddingService.isInitialized()) {
      await this.embeddingService.initialize();
    }

    let totalChunks = 0;
    let processedChunks = 0;

    for (const fingerprint of fingerprints) {
      try {
        // Load chunks from cache
        const cachedContent = await this.cacheService.loadFromCache(
          fingerprint.hash,
          'metadata'
        ) as any; // Type assertion for cached metadata

        if (!cachedContent || !cachedContent.chunks) {
          this.loggingService.warn(`No cached chunks found for ${fingerprint.path}`);
          continue;
        }

        const chunks = cachedContent.chunks as TextChunk[];
        totalChunks += chunks.length;

        // Generate embeddings in batches
        const batchSize = config.batchSize || 32;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          
          try {
            const embeddings = await this.embeddingService.generateEmbeddings(batch);
            
            // Save embeddings to cache
            for (let j = 0; j < batch.length; j++) {
              const chunkId = `${fingerprint.hash}_${i + j}`;
              await this.cacheService.saveToCache(chunkId, {
                embedding: embeddings[j],
                chunk: batch[j],
                metadata: {
                  sourceFile: fingerprint.path,
                  chunkIndex: i + j,
                  totalChunks: chunks.length
                }
              }, 'embeddings');
            }

            processedChunks += batch.length;
            this.loggingService.debug(`Generated embeddings for batch`, {
              file: fingerprint.path,
              batchSize: batch.length,
              progress: `${processedChunks}/${totalChunks}`
            });

          } catch (error) {
            this.loggingService.error(`Failed to generate embeddings for batch in ${fingerprint.path}`, error instanceof Error ? error : new Error(String(error)));
          }
        }

      } catch (error) {
        this.loggingService.error(`Failed to process embeddings for ${fingerprint.path}`, error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.loggingService.info('Embedding generation completed', {
      totalChunks,
      processedChunks,
      successRate: totalChunks > 0 ? (processedChunks / totalChunks * 100).toFixed(1) + '%' : '0%'
    });
  }

  /**
   * Save parsed and chunked content to cache
   */
  private async saveContentToCache(
    parsedContent: ParsedContent,
    chunkedResult: { chunks: TextChunk[]; totalChunks: number },
    hash: string
  ): Promise<void> {
    const metadataContent = {
      originalContent: parsedContent,
      chunks: chunkedResult.chunks,
      totalChunks: chunkedResult.totalChunks,
      cachedAt: new Date().toISOString(),
      chunkingStats: {
        originalTokenCount: this.chunkingService.estimateTokenCount(parsedContent.content),
        averageChunkTokens: chunkedResult.chunks.length > 0 
          ? Math.round(chunkedResult.chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / chunkedResult.chunks.length)
          : 0,
        minChunkTokens: chunkedResult.chunks.length > 0 
          ? Math.min(...chunkedResult.chunks.map(c => c.tokenCount))
          : 0,
        maxChunkTokens: chunkedResult.chunks.length > 0 
          ? Math.max(...chunkedResult.chunks.map(c => c.tokenCount))
          : 0
      }
    };

    await this.cacheService.saveToCache(hash, metadataContent, 'metadata');
    
    this.loggingService.debug('Content saved to cache', {
      hash,
      chunks: chunkedResult.totalChunks,
      avgTokens: metadataContent.chunkingStats.averageChunkTokens
    });
  }

  /**
   * Display cache status information
   */
  private displayCacheStatus(cacheStatus: any): void {
    const total = cacheStatus.newFiles.length + cacheStatus.modifiedFiles.length + 
                  cacheStatus.deletedFiles.length + cacheStatus.unchangedFiles.length;

    console.log('\n📊 Cache Status:');
    if (cacheStatus.newFiles.length > 0) {
      console.log(`   ✅ New files: ${cacheStatus.newFiles.length}`);
    }
    if (cacheStatus.modifiedFiles.length > 0) {
      console.log(`   📝 Modified files: ${cacheStatus.modifiedFiles.length}`);
    }
    if (cacheStatus.deletedFiles.length > 0) {
      console.log(`   🗑️  Deleted files: ${cacheStatus.deletedFiles.length}`);
    }
    if (cacheStatus.unchangedFiles.length > 0) {
      console.log(`   ⏩ Unchanged files: ${cacheStatus.unchangedFiles.length}`);
    }
    console.log(`   📁 Total files: ${total}\n`);
  }
}

/**
 * Legacy wrapper function for backward compatibility
 */
export async function indexFolder(
  folderPath: string, 
  packageJson: PackageJson, 
  options: IndexingOptions = {}
): Promise<void> {
  // This would need to be called with proper DI setup
  // For now, this maintains the existing interface
  const { indexFolder: legacyIndexFolder } = await import('./indexing.js');
  return legacyIndexFolder(folderPath, packageJson, options);
}
