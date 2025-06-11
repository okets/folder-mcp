/**
 * DI-Enabled File Watcher for Folder-MCP
 * 
 * This is a refactored version of the FolderWatcher that uses dependency injection
 * instead of direct imports to reduce tight coupling.
 */

import { watch, FSWatcher } from 'chokidar';
import { join, extname, relative, resolve } from 'path';
import { existsSync } from 'fs';
import { FileFingerprint, PackageJson, ParsedContent, ProcessedContent } from '../types/index.js';
import { createFileFingerprint } from '../utils/fingerprint.js';
import { loadPreviousIndex, saveFingerprintsToCache } from '../cache/index.js';
import { ResolvedConfig } from '../config/resolver.js';
import { 
  IFileParsingService, 
  IChunkingService, 
  IEmbeddingService, 
  ICacheService,
  ILoggingService,
  IFileSystemService
} from '../di/interfaces.js';

export interface DIFileWatcherOptions {
  debounceDelay?: number;
  batchSize?: number;
  logLevel?: 'verbose' | 'normal' | 'quiet';
  resolvedConfig?: ResolvedConfig;
}

export interface WatchEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export class DIEnabledFolderWatcher {
  private watcher: FSWatcher | null = null;
  private folderPath: string;
  private cacheDir: string;
  private supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];
  private debounceDelay: number;
  private batchSize: number;
  private logLevel: 'verbose' | 'normal' | 'quiet';
  private resolvedConfig?: ResolvedConfig;
  private pendingEvents: Map<string, WatchEvent> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private packageJson: PackageJson;

  // DI Services
  private fileParsingService: IFileParsingService;
  private chunkingService: IChunkingService;
  private embeddingService: IEmbeddingService;
  private cacheService: ICacheService;
  private loggingService: ILoggingService;
  private fileSystemService: IFileSystemService;

  constructor(
    folderPath: string, 
    packageJson: PackageJson, 
    options: DIFileWatcherOptions,
    // DI Dependencies
    fileParsingService: IFileParsingService,
    chunkingService: IChunkingService,
    embeddingService: IEmbeddingService,
    cacheService: ICacheService,
    loggingService: ILoggingService,
    fileSystemService: IFileSystemService
  ) {
    this.folderPath = resolve(folderPath);
    this.cacheDir = join(this.folderPath, '.folder-mcp');
    this.debounceDelay = options.debounceDelay || options.resolvedConfig?.debounceDelay || 1000;
    this.batchSize = options.batchSize || options.resolvedConfig?.batchSize || 32;
    this.logLevel = options.logLevel || 'normal';
    this.packageJson = packageJson;
    
    if (options.resolvedConfig !== undefined) {
      this.resolvedConfig = options.resolvedConfig;
    }
    
    // Update supported extensions from config if available
    if (this.resolvedConfig?.fileExtensions) {
      this.supportedExtensions = this.resolvedConfig.fileExtensions;
    }

    // Inject dependencies
    this.fileParsingService = fileParsingService;
    this.chunkingService = chunkingService;
    this.embeddingService = embeddingService;
    this.cacheService = cacheService;
    this.loggingService = loggingService;
    this.fileSystemService = fileSystemService;
  }

  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error('Watcher is already running');
    }

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      throw new Error(`Cache directory not found. Please run 'folder-mcp index "${this.folderPath}"' first.`);
    }

    this.log('🔍 Starting DI-enabled file watcher...', 'normal');
    this.log(`📁 Watching folder: ${this.folderPath}`, 'normal');
    this.log(`⏱️  Debounce delay: ${this.debounceDelay}ms`, 'verbose');
    this.log(`📦 Batch size: ${this.batchSize}`, 'verbose');
    this.log('', 'normal');

    // Initialize chokidar watcher
    this.watcher = watch(this.folderPath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.folder-mcp/**',
        '**/.*' // Ignore hidden files
      ],
      ignoreInitial: true, // Don't emit events for existing files
      persistent: true,
      alwaysStat: false,
      awaitWriteFinish: {
        stabilityThreshold: 500, // Wait 500ms for file writes to finish
        pollInterval: 100
      }
    });

    // Set up event handlers
    this.watcher
      .on('add', (path: string) => this.handleFileEvent('add', path))
      .on('change', (path: string) => this.handleFileEvent('change', path))
      .on('unlink', (path: string) => this.handleFileEvent('unlink', path))
      .on('error', (err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        this.log(`⚠️  Watcher error: ${error.message}`, 'normal');
      })
      .on('ready', () => {
        this.log('✅ DI-enabled file watcher is ready and monitoring for changes', 'normal');
        this.log('   Press Ctrl+C to stop watching\n', 'normal');
      });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      this.log('\n🛑 Stopping DI-enabled file watcher...', 'normal');
      
      // Clear any pending debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      
      // Process any remaining events
      if (this.pendingEvents.size > 0) {
        this.log('📋 Processing remaining events...', 'normal');
        await this.processPendingEvents();
      }
      
      await this.watcher.close();
      this.watcher = null;
      this.log('✅ DI-enabled file watcher stopped', 'normal');
    }
  }

  private handleFileEvent(type: 'add' | 'change' | 'unlink', filePath: string): void {
    // Filter by supported file extensions
    const ext = extname(filePath).toLowerCase();
    if (!this.supportedExtensions.includes(ext)) {
      return; // Ignore unsupported file types
    }

    const relativePath = relative(this.folderPath, filePath);
    const event: WatchEvent = {
      type,
      path: filePath,
      timestamp: new Date()
    };

    // Store the event (overwrite previous event for the same file)
    this.pendingEvents.set(filePath, event);

    this.log(`📄 ${type.toUpperCase()}: ${relativePath}`, 'verbose');

    // Debounce: reset timer on each event
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingEvents();
    }, this.debounceDelay);
  }

  private async processPendingEvents(): Promise<void> {
    if (this.isProcessing || this.pendingEvents.size === 0) {
      return;
    }

    this.isProcessing = true;
    this.debounceTimer = null;

    try {
      const events = Array.from(this.pendingEvents.values());
      this.pendingEvents.clear();

      this.log(`\n🔄 Processing ${events.length} file change(s) with DI...`, 'normal');

      // Group events by type
      const addedFiles = events.filter(e => e.type === 'add').map(e => e.path);
      const changedFiles = events.filter(e => e.type === 'change').map(e => e.path);
      const deletedFiles = events.filter(e => e.type === 'unlink').map(e => e.path);

      // Load current index
      const previousIndex = loadPreviousIndex(this.cacheDir);
      let currentFingerprints = previousIndex?.files || [];

      // Handle deleted files
      if (deletedFiles.length > 0) {
        await this.handleDeletedFiles(deletedFiles, currentFingerprints);
        // Remove deleted files from fingerprints
        currentFingerprints = currentFingerprints.filter(fp => 
          !deletedFiles.some(deletedPath => resolve(this.folderPath, fp.path) === deletedPath)
        );
      }

      // Handle added and changed files
      const filesToProcess = [...addedFiles, ...changedFiles];
      if (filesToProcess.length > 0) {
        const newFingerprints = await this.handleModifiedFiles(filesToProcess, currentFingerprints);
        
        // Update fingerprints list
        for (const newFp of newFingerprints) {
          const existingIndex = currentFingerprints.findIndex(fp => fp.path === newFp.path);
          if (existingIndex >= 0) {
            currentFingerprints[existingIndex] = newFp; // Update existing
          } else {
            currentFingerprints.push(newFp); // Add new
          }
        }
      }

      // Save updated fingerprints to cache
      await saveFingerprintsToCache(currentFingerprints, this.cacheDir);

      // Rebuild vector index if embeddings were generated
      if (filesToProcess.length > 0) {
        await this.rebuildVectorIndex();
      }

      this.log(`✅ DI processing complete. Monitoring for changes...\n`, 'normal');

    } catch (error) {
      this.loggingService.error('Error processing file changes with DI', error instanceof Error ? error : new Error(String(error)));
      this.log(`❌ Error processing file changes: ${error}`, 'normal');
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleDeletedFiles(deletedFiles: string[], currentFingerprints: FileFingerprint[]): Promise<void> {
    this.log(`🗑️  Removing ${deletedFiles.length} deleted file(s) from index...`, 'normal');

    for (const deletedPath of deletedFiles) {
      const relativePath = relative(this.folderPath, deletedPath);
      const fingerprint = currentFingerprints.find(fp => resolve(this.folderPath, fp.path) === deletedPath);
      
      if (fingerprint) {
        this.log(`   Removing: ${relativePath}`, 'verbose');
        
        // TODO: Remove from embeddings cache, metadata cache, and vector index
        // For now, we'll just remove from the fingerprints list
        // Full cleanup will be implemented in future versions
      }
    }
  }

  private async handleModifiedFiles(filePaths: string[], currentFingerprints: FileFingerprint[]): Promise<FileFingerprint[]> {
    this.log(`📝 Processing ${filePaths.length} modified file(s) with DI services...`, 'normal');

    const newFingerprints: FileFingerprint[] = [];

    for (const filePath of filePaths) {
      try {
        const relativePath = relative(this.folderPath, filePath);
        
        // Generate new fingerprint
        const fingerprint = createFileFingerprint(filePath, this.folderPath);
        newFingerprints.push(fingerprint);

        // Check if file actually changed (compare with existing fingerprint)
        const existingFingerprint = currentFingerprints.find(fp => fp.path === fingerprint.path);
        if (existingFingerprint && existingFingerprint.hash === fingerprint.hash) {
          this.log(`   Skipping ${relativePath} (no content change)`, 'verbose');
          continue;
        }

        this.log(`   Processing: ${relativePath}`, 'verbose');

        // Parse file content using DI service
        const fileType = extname(fingerprint.path);
        const parsedContent = await this.fileParsingService.parseFile(filePath, fileType);
        if (!parsedContent) {
          this.log(`   ⚠️  Could not parse: ${relativePath}`, 'normal');
          continue;
        }

        // Chunk the content using DI service
        const chunkedResult = await this.chunkingService.chunkText(parsedContent);

        // Save to cache using DI service
        const processedContent: ProcessedContent = {
          ...parsedContent,
          chunks: chunkedResult.chunks,
          totalChunks: chunkedResult.totalChunks,
          cachedAt: new Date().toISOString(),
          chunkingStats: {
            originalTokenCount: chunkedResult.chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
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

        await this.cacheService.saveToCache(fingerprint.hash, processedContent, 'metadata');

        // Generate embeddings using DI service
        await this.generateEmbeddingsForFile(processedContent, fingerprint.hash);

      } catch (error) {
        const relativePath = relative(this.folderPath, filePath);
        this.loggingService.error(`Error processing file during watch: ${relativePath}`, error instanceof Error ? error : new Error(String(error)));
        this.log(`   ⚠️  Error processing ${relativePath}: ${error}`, 'normal');
      }
    }

    return newFingerprints;
  }

  /**
   * Generate embeddings for a processed file and save them to cache using DI services
   */
  private async generateEmbeddingsForFile(processedContent: ProcessedContent, hash: string): Promise<void> {
    if (!processedContent.chunks || !Array.isArray(processedContent.chunks)) {
      return;
    }

    try {
      // Initialize embedding service
      await this.embeddingService.initialize();
      
      const modelConfig = this.embeddingService.getModelConfig();
      let successCount = 0;
      let errorCount = 0;
      
      // Generate embeddings for all chunks at once
      const embeddings = await this.embeddingService.generateEmbeddings(processedContent.chunks);
      
      // Save each embedding to cache
      for (let i = 0; i < processedContent.chunks.length && i < embeddings.length; i++) {
        const chunk = processedContent.chunks[i];
        const embedding = embeddings[i];
        
        if (!chunk || !embedding) {
          errorCount++;
          continue;
        }
        
        try {
          // Save embedding to cache using DI service
          await this.cacheService.saveToCache(`${hash}_chunk_${chunk.chunkIndex}`, {
            text: chunk.content,
            embedding: embedding,
            tokenCount: chunk.tokenCount,
            chunkIndex: chunk.chunkIndex,
            embeddingModel: modelConfig?.name || embedding.model || 'unknown',
            embeddingDimensions: embedding.dimensions,
            generatedAt: new Date().toISOString()
          }, 'embeddings');
          
          successCount++;
        } catch (error) {
          errorCount++;
          this.loggingService.warn(`Failed to save embedding for chunk ${chunk.chunkIndex}`, {
            error: error instanceof Error ? error.message : String(error),
            hash,
            chunkIndex: chunk.chunkIndex
          });
        }
      }
      
      this.loggingService.info('Embedding generation completed for file', {
        hash,
        successCount,
        errorCount,
        totalChunks: processedContent.chunks.length
      });
      
    } catch (error) {
      this.loggingService.error('Failed to generate embeddings for file', error instanceof Error ? error : new Error(String(error)), {
        hash
      });
    }
  }

  private async rebuildVectorIndex(): Promise<void> {
    try {
      this.log('🔧 Rebuilding vector search index...', 'verbose');
      
      // Import and rebuild vector index
      const { buildVectorIndex } = await import('../search/index.js');
      await buildVectorIndex(this.cacheDir);
      
      this.log('✅ Vector index rebuilt', 'verbose');
    } catch (error) {
      this.loggingService.warn('Error rebuilding vector index', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.log(`⚠️  Error rebuilding vector index: ${error}`, 'verbose');
    }
  }

  private log(message: string, level: 'verbose' | 'normal' | 'quiet'): void {
    if (level === 'quiet') return;
    if (level === 'verbose' && this.logLevel !== 'verbose') return;
    
    if (message) {
      console.log(message);
    } else {
      console.log(); // Empty line
    }
  }

  // Getter for checking if watcher is running
  get isRunning(): boolean {
    return this.watcher !== null;
  }

  // Get statistics
  getStats(): { watchedFolder: string; isRunning: boolean; pendingEvents: number } {
    return {
      watchedFolder: this.folderPath,
      isRunning: this.isRunning,
      pendingEvents: this.pendingEvents.size
    };
  }
}

// Utility function to start watching a folder with DI
export async function startDIWatching(
  folderPath: string, 
  packageJson: PackageJson, 
  options: DIFileWatcherOptions = {},
  // DI Dependencies
  fileParsingService: IFileParsingService,
  chunkingService: IChunkingService,
  embeddingService: IEmbeddingService,
  cacheService: ICacheService,
  loggingService: ILoggingService,
  fileSystemService: IFileSystemService
): Promise<DIEnabledFolderWatcher> {
  const watcher = new DIEnabledFolderWatcher(
    folderPath, 
    packageJson, 
    options,
    fileParsingService,
    chunkingService,
    embeddingService,
    cacheService,
    loggingService,
    fileSystemService
  );
  await watcher.start();
  return watcher;
}

// Graceful shutdown setup
export function setupDIGracefulShutdown(watcher: DIEnabledFolderWatcher): void {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    await watcher.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}
