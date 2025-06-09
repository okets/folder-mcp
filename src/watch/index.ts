import { watch, FSWatcher } from 'chokidar';
import { join, extname, relative, resolve } from 'path';
import { existsSync } from 'fs';
import { FileFingerprint } from '../types/index.js';
import { createFileFingerprint } from '../utils/fingerprint.js';
import { loadPreviousIndex, saveFingerprintsToCache } from '../cache/index.js';
import { parseTextFile, parsePdfFile, parseWordFile, parseExcelFile, parsePowerPointFile } from '../parsers/index.js';
import { chunkText } from '../processing/chunking.js';
import { getDefaultEmbeddingModel } from '../embeddings/index.js';

export interface FileWatcherOptions {
  debounceDelay?: number;
  batchSize?: number;
  logLevel?: 'verbose' | 'normal' | 'quiet';
}

export interface WatchEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export class FolderWatcher {
  private watcher: FSWatcher | null = null;
  private folderPath: string;
  private cacheDir: string;
  private supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];
  private debounceDelay: number;
  private batchSize: number;
  private logLevel: 'verbose' | 'normal' | 'quiet';
  private pendingEvents: Map<string, WatchEvent> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private packageJson: any;
  constructor(folderPath: string, packageJson: any, options: FileWatcherOptions = {}) {
    this.folderPath = resolve(folderPath);
    this.cacheDir = join(this.folderPath, '.folder-mcp');
    this.debounceDelay = options.debounceDelay || 1000; // 1 second default
    this.batchSize = options.batchSize || 32;
    this.logLevel = options.logLevel || 'normal';
    this.packageJson = packageJson;
  }

  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error('Watcher is already running');
    }

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      throw new Error(`Cache directory not found. Please run 'folder-mcp index "${this.folderPath}"' first.`);
    }

    this.log('🔍 Starting file watcher...', 'normal');
    this.log(`📁 Watching folder: ${this.folderPath}`, 'normal');
    this.log(`⏱️  Debounce delay: ${this.debounceDelay}ms`, 'verbose');
    this.log(`📦 Batch size: ${this.batchSize}`, 'verbose');
    this.log('', 'normal');    // Initialize chokidar watcher
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
      depth: undefined, // Watch all subdirectories
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
        this.log('✅ File watcher is ready and monitoring for changes', 'normal');
        this.log('   Press Ctrl+C to stop watching\n', 'normal');
      });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      this.log('\n🛑 Stopping file watcher...', 'normal');
      
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
      this.log('✅ File watcher stopped', 'normal');
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

      this.log(`\n🔄 Processing ${events.length} file change(s)...`, 'normal');

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

      this.log(`✅ Update complete. Monitoring for changes...\n`, 'normal');

    } catch (error) {
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
    this.log(`📝 Processing ${filePaths.length} modified file(s)...`, 'normal');

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

        // Parse file content
        const parsedContent = await this.parseFile(filePath);
        if (!parsedContent) {
          this.log(`   ⚠️  Could not parse: ${relativePath}`, 'normal');
          continue;
        }

        // Save to metadata cache
        await this.saveContentToCache(parsedContent, fingerprint.hash);

        // Generate embeddings
        await this.generateEmbeddingsForFile(parsedContent, fingerprint.hash);

      } catch (error) {
        const relativePath = relative(this.folderPath, filePath);
        this.log(`   ⚠️  Error processing ${relativePath}: ${error}`, 'normal');
      }
    }

    return newFingerprints;
  }

  private async parseFile(filePath: string): Promise<any> {
    const ext = extname(filePath).toLowerCase();
    
    try {
      switch (ext) {
        case '.txt':
        case '.md':
          return await parseTextFile(filePath, this.folderPath);
        case '.pdf':
          return await parsePdfFile(filePath, this.folderPath);
        case '.docx':
          return await parseWordFile(filePath, this.folderPath);
        case '.xlsx':
          return await parseExcelFile(filePath, this.folderPath);
        case '.pptx':
          return await parsePowerPointFile(filePath, this.folderPath);
        default:
          return null;
      }
    } catch (error) {
      this.log(`   ⚠️  Parser error for ${relative(this.folderPath, filePath)}: ${error}`, 'verbose');
      return null;
    }
  }

  private async saveContentToCache(parsedContent: any, hash: string): Promise<void> {
    const metadataPath = join(this.cacheDir, 'metadata', `${hash}.json`);
    
    // Import the save function from indexing module
    const { writeFileSync } = await import('fs');
    writeFileSync(metadataPath, JSON.stringify(parsedContent, null, 2));
  }

  private async generateEmbeddingsForFile(parsedContent: any, hash: string): Promise<void> {
    if (!parsedContent.chunks || !Array.isArray(parsedContent.chunks)) {
      return;
    }

    try {
      const embeddingModel = await getDefaultEmbeddingModel();
      
      for (const chunk of parsedContent.chunks) {
        const embeddingPath = join(this.cacheDir, 'embeddings', `${hash}_chunk_${chunk.chunkIndex}.json`);
        
        // Skip if embedding already exists
        if (existsSync(embeddingPath)) {
          continue;
        }

        // Generate embedding
        const embedding = await embeddingModel.generateEmbedding(chunk.text);
        
        const embeddingData = {
          text: chunk.text,
          embedding: {
            model: embeddingModel.getModelInfo().name,
            vector: embedding,
            dimensions: Array.isArray(embedding) ? embedding.length : 768
          },
          metadata: chunk.metadata,
          hash,
          chunkIndex: chunk.chunkIndex,
          createdAt: new Date().toISOString()
        };

        // Save embedding
        const { writeFileSync } = await import('fs');
        writeFileSync(embeddingPath, JSON.stringify(embeddingData, null, 2));
      }
    } catch (error) {
      this.log(`   ⚠️  Error generating embeddings: ${error}`, 'verbose');
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

// Utility function to start watching a folder
export async function startWatching(
  folderPath: string, 
  packageJson: any, 
  options: FileWatcherOptions = {}
): Promise<FolderWatcher> {
  const watcher = new FolderWatcher(folderPath, packageJson, options);
  await watcher.start();
  return watcher;
}

// Utility function for graceful shutdown
export function setupGracefulShutdown(watcher: FolderWatcher): void {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    try {
      await watcher.stop();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Handle Windows Ctrl+C
  if (process.platform === 'win32') {
    // Use dynamic import for readline in ES modules
    import('readline').then(readline => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.on('SIGINT', () => shutdown('SIGINT'));
    }).catch(() => {
      // Fallback if readline import fails
      process.on('SIGINT', () => shutdown('SIGINT'));
    });
  }
}
