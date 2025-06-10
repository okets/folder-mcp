import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, resolve, extname, relative } from 'path';
import { glob } from 'glob';
import { FileFingerprint, TextChunk } from '../types/index.js';
import { generateFingerprints } from '../utils/fingerprint.js';
import { setupCacheDirectory, loadPreviousIndex, detectCacheStatus, displayCacheStatus, saveFingerprintsToCache } from '../cache/index.js';
import { parseTextFile, parsePdfFile, parseWordFile, parseExcelFile, parsePowerPointFile } from '../parsers/index.js';
import { chunkText, estimateTokenCount } from './chunking.js';
import { getDefaultEmbeddingModel } from '../embeddings/index.js';

async function saveContentToCache(parsedContent: any, hash: string, cacheDir: string): Promise<void> {
  const metadataDir = join(cacheDir, 'metadata');
  const metadataFile = join(metadataDir, `${hash}.json`);
  
  // Create chunks from the parsed content
  const chunkedContent = chunkText(parsedContent);
  
  const metadataContent = {
    originalContent: parsedContent,
    chunks: chunkedContent.chunks,
    totalChunks: chunkedContent.totalChunks,
    cachedAt: new Date().toISOString(),
    chunkingStats: {
      originalTokenCount: estimateTokenCount(parsedContent.content),
      averageChunkTokens: chunkedContent.chunks.length > 0 
        ? Math.round(chunkedContent.chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / chunkedContent.chunks.length)
        : 0,
      minChunkTokens: chunkedContent.chunks.length > 0 
        ? Math.min(...chunkedContent.chunks.map(c => c.tokenCount))
        : 0,
      maxChunkTokens: chunkedContent.chunks.length > 0 
        ? Math.max(...chunkedContent.chunks.map(c => c.tokenCount))
        : 0
    }
  };
    // Use atomic file operations to prevent cache corruption
  const { AtomicFileOperations } = await import('../utils/errorRecovery.js');
  await AtomicFileOperations.writeFileAtomic(metadataFile, JSON.stringify(metadataContent, null, 2));
  
  // Log chunking stats (concise)
  if (chunkedContent.totalChunks > 0) {
    console.log(`    → ${chunkedContent.totalChunks} chunks (${metadataContent.chunkingStats.averageChunkTokens} avg tokens)`);
  }
}

async function processFiles(fingerprints: FileFingerprint[], basePath: string, cacheDir: string): Promise<void> {
  console.log('Processing file content...');
  
  // Import error recovery system
  const { ErrorRecoveryManager, AtomicFileOperations, ResumableProgress } = await import('../utils/errorRecovery.js');
  const errorManager = new ErrorRecoveryManager(cacheDir);
  const progress = new ResumableProgress(cacheDir, 'file_processing');
  
  // Check for previous progress
  const previousProgress = progress.loadProgress();
  let startIndex = 0;
  
  if (previousProgress && previousProgress.total === fingerprints.length) {
    startIndex = previousProgress.current;
    if (startIndex > 0) {
      console.log(`📂 Resuming from file ${startIndex + 1}/${fingerprints.length} (${previousProgress.current} files already processed)`);
    }
  }
  
  let successCount = startIndex;
  let errorCount = 0;
  
  for (let i = startIndex; i < fingerprints.length; i++) {
    const fingerprint = fingerprints[i];
    const fullPath = join(basePath, fingerprint.path);
    const ext = extname(fingerprint.path).toLowerCase();
    
    console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
    
    try {
      // Use error recovery for file parsing
      const parsedContent = await errorManager.executeWithRetry(
        `parse_${ext.substring(1)}_file`,
        async () => {
          switch (ext) {
            case '.txt':
            case '.md':
              return await parseTextFile(fullPath, basePath);
            case '.pdf':
              return await parsePdfFile(fullPath, basePath);
            case '.docx':
              return await parseWordFile(fullPath, basePath);
            case '.xlsx':
              return await parseExcelFile(fullPath, basePath);
            case '.pptx':
              return await parsePowerPointFile(fullPath, basePath);
            default:
              throw new Error(`Unsupported file extension: ${ext}`);
          }
        },
        fingerprint.path
      );

      // Use error recovery for cache operations
      await errorManager.executeWithRetry(
        'save_content_to_cache',
        async () => {
          await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
        },
        fingerprint.path
      );

      successCount++;
      
    } catch (error) {
      errorCount++;
      console.warn(`  ❌ Failed to process ${fingerprint.path}: ${error}`);
      
      // Continue processing other files instead of stopping
      continue;
    }
    
    // Save progress periodically
    await progress.saveProgress(i + 1, fingerprints.length, { successCount, errorCount });
  }
  
  // Clear progress on completion
  progress.clearProgress();
  
  // Display processing summary
  console.log('\n📊 File Processing Summary:');
  console.log(`✅ Successfully processed: ${successCount}/${fingerprints.length} files`);
  if (errorCount > 0) {
    console.log(`❌ Failed to process: ${errorCount} files`);
  }
  
  // Show error summary if there were any errors
  if (errorCount > 0) {
    errorManager.displayErrorSummary();
  }
}

// Progress bar utility
function createProgressBar(total: number, startTime: number): { update: (current: number) => void; finish: () => void } {
  const width = 40;
  let lastRendered = '';
  
  return {
    update: (current: number) => {
      const percentage = Math.round((current / total) * 100);
      const filled = Math.round((current / total) * width);
      const empty = width - filled;
      
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      const eta = current > 0 ? Math.round(((Date.now() - startTime) / current) * (total - current) / 1000) : 0;
      const output = `  [${bar}] ${percentage}% (${current}/${total}) ETA: ${eta}s`;
      
      // Only update if output changed
      if (output !== lastRendered) {
        process.stdout.write('\r' + output);
        lastRendered = output;
      }
    },
    finish: () => {
      process.stdout.write('\n');
    }
  };
}



async function generateEmbeddingsForChunks(
  cacheDir: string, 
  batchSize: number = 32,
  forceRegenerate: boolean = false
): Promise<void> {
  const metadataDir = join(cacheDir, 'metadata');
  const embeddingsDir = join(cacheDir, 'embeddings');
  
  if (!existsSync(metadataDir)) {
    console.log('No metadata found. Run index command first.');
    return;
  }

  // Initialize error recovery system
  const { ErrorRecoveryManager, AtomicFileOperations, ResumableProgress } = await import('../utils/errorRecovery.js');
  const errorManager = new ErrorRecoveryManager(cacheDir);
  const progress = new ResumableProgress(cacheDir, 'embedding_generation');

  // Get all metadata files
  const metadataFiles = readdirSync(metadataDir).filter(f => f.endsWith('.json'));
  
  if (metadataFiles.length === 0) {
    console.log('No processed files found. Run index command first.');
    return;
  }

  // Collect all chunks that need embeddings
  console.log('🔍 Analyzing chunks for embedding generation...');
  const chunksToProcess: Array<{ chunk: TextChunk, embeddingPath: string, hash: string }> = [];
  let totalChunks = 0;
  
  for (const metadataFile of metadataFiles) {
    const metadataPath = join(metadataDir, metadataFile);
    const hash = metadataFile.replace('.json', '');
    
    try {
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
      
      if (metadata.chunks && Array.isArray(metadata.chunks)) {
        for (const chunk of metadata.chunks) {
          totalChunks++;
          const embeddingPath = join(embeddingsDir, `${hash}_chunk_${chunk.chunkIndex}.json`);
          
          // Check if embedding already exists (incremental processing - resume capability)
          if (!forceRegenerate && existsSync(embeddingPath)) {
            continue; // Skip already processed chunks for existing files
          }
          
          chunksToProcess.push({
            chunk,
            embeddingPath,
            hash
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read metadata file ${metadataFile}: ${error}`);
    }
  }

  // Check for previous progress
  const previousProgress = progress.loadProgress();
  let startIndex = 0;
  
  if (previousProgress && previousProgress.total === chunksToProcess.length) {
    startIndex = previousProgress.current;
    if (startIndex > 0) {
      console.log(`📂 Resuming embedding generation from chunk ${startIndex + 1}/${chunksToProcess.length}`);
    }
  }

  if (chunksToProcess.length === 0) {
    console.log(`✅ All ${totalChunks} chunks already have embeddings. Use --force to regenerate.`);
    return;
  }

  console.log(`📊 Found ${totalChunks} total chunks, ${chunksToProcess.length} need embeddings`);
  console.log('');

  // Initialize embedding model
  console.log('🚀 Initializing embedding model...');
  const embeddingModel = getDefaultEmbeddingModel();
  await embeddingModel.initialize();
  
  const modelInfo = embeddingModel.getModelInfo();
  console.log(`📊 Model: ${modelInfo.name} (${modelInfo.dimensions}D)`);
  console.log(`🔧 Backend: ${modelInfo.backend} ${modelInfo.isGPUAccelerated ? '(GPU-accelerated)' : '(CPU-only)'}`);
  console.log('');
  // Process chunks in batches with error recovery
  console.log(`🔄 Generating embeddings for ${chunksToProcess.length} chunks (batch size: ${batchSize})`);
  let startTime = Date.now();
  const progressBar = createProgressBar(chunksToProcess.length, startTime);
  
  let processed = startIndex;
  let successCount = startIndex;
  let errorCount = 0;

  try {
    for (let i = startIndex; i < chunksToProcess.length; i += batchSize) {
      const batch = chunksToProcess.slice(i, i + batchSize);
      const batchTexts = batch.map(item => item.chunk.content);
      
      try {
        // Use error recovery for embedding generation
        const embeddings = await errorManager.executeWithRetry(
          'generate_batch_embeddings',
          async () => {
            return await embeddingModel.generateBatchEmbeddings(batchTexts, batchSize);
          },
          `batch_${Math.floor(i / batchSize) + 1}`
        );
        
        // Save each embedding with atomic operations
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const embedding = embeddings[j];
          
          const embeddingData = {
            chunk: item.chunk,
            embedding: embedding,
            generatedAt: new Date().toISOString(),
            model: modelInfo.name,
            modelBackend: modelInfo.backend,
            isGPUAccelerated: modelInfo.isGPUAccelerated
          };
          
          // Use atomic file operations to prevent corruption
          await errorManager.executeWithRetry(
            'save_embedding_to_cache',
            async () => {
              await AtomicFileOperations.writeJSONAtomic(item.embeddingPath, embeddingData);
            },
            item.embeddingPath
          );
        }
        
        successCount += batch.length;
        processed = i + batch.length;
        progressBar.update(processed);
        
      } catch (error) {
        // Handle batch errors - log and continue processing
        console.log(`\n❌ Batch error at ${i}-${i + batch.length}: ${error}`);
        errorCount += batch.length;
        processed = i + batch.length;
        progressBar.update(processed);
        
        // Continue processing other batches instead of stopping
        continue;
      }
      
      // Save progress periodically
      await progress.saveProgress(processed, chunksToProcess.length, { successCount, errorCount });
    }
    
    progressBar.finish();
    
    // Clear progress on completion
    progress.clearProgress();
    
    const totalTime = Date.now() - startTime;
    
    console.log('');
    console.log('🎉 Embedding generation completed!');
    console.log(`✅ Successfully processed: ${successCount}/${chunksToProcess.length} chunks`);
    console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(1)}s`);
    if (successCount > 0) {
      console.log(`⚡ Average: ${(totalTime / successCount).toFixed(1)}ms per embedding`);
    }
    
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount} chunks`);
      errorManager.displayErrorSummary();
    }

    // Show performance stats
    const perfStats = modelInfo.performanceStats;
    if (perfStats && perfStats.embeddingsGenerated > 0) {
      console.log('');
      console.log('📈 Model Performance:');
      console.log(`   - Total embeddings generated: ${perfStats.embeddingsGenerated}`);
      console.log(`   - Model average time: ${perfStats.avgTimePerEmbedding.toFixed(1)}ms per embedding`);
    }
    
  } catch (error) {
    progressBar.finish();
    console.log('');
    console.error('💥 Fatal error during embedding generation:', error);
    
    // Save progress before exiting
    console.log(`📊 Progress before error: ${processed}/${chunksToProcess.length} chunks processed`);
    
    // Show error summary
    errorManager.displayErrorSummary();
    throw error;
  }
}

export async function indexFolder(
  folderPath: string, 
  packageJson: any, 
  options: { skipEmbeddings?: boolean } = {}
): Promise<void> {
  try {
    // Check if folder exists
    const resolvedPath = resolve(folderPath);
    if (!existsSync(resolvedPath)) {
      console.error(`Error: Folder "${folderPath}" does not exist.`);
      process.exit(1);
    }

    if (!statSync(resolvedPath).isDirectory()) {
      console.error(`Error: "${folderPath}" is not a directory.`);
      process.exit(1);
    }

    console.log(`Scanning folder: ${resolvedPath}`);
    console.log('');

    // Supported file extensions (case-insensitive)
    const supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];
    
    // Find all files recursively
    const pattern = join(resolvedPath, '**', '*').replace(/\\/g, '/');    const allFiles = await glob(pattern, { 
      nodir: true,  // Only files, not directories
      dot: false,   // Ignore hidden files
      ignore: ['**/.folder-mcp/**']  // Exclude our cache directory
    });    // Additional filter to ensure no cache files slip through
    const filteredFiles = allFiles.filter(file => {
      const relativePath = relative(resolvedPath, file);
      return !relativePath.includes('.folder-mcp');
    });

    // Filter by supported extensions (case-insensitive)
    const supportedFiles = filteredFiles.filter(file => {
      const ext = extname(file).toLowerCase();
      return supportedExtensions.includes(ext);
    });

    if (supportedFiles.length === 0) {
      console.log('No supported files found in the folder.');
      console.log(`Supported file types: ${supportedExtensions.join(', ')}`);
      return;
    }

    // Convert to relative paths from the target folder
    const relativePaths = supportedFiles.map(file => {
      return relative(resolvedPath, file);
    });

    // Count files by type
    const fileTypeCounts: { [key: string]: number } = {};
    const fileTypeNames: { [key: string]: string } = {
      '.txt': 'Text',
      '.md': 'Markdown',
      '.pdf': 'PDFs',
      '.docx': 'Word',
      '.xlsx': 'Excel',
      '.pptx': 'PowerPoint'
    };

    supportedFiles.forEach(file => {
      const ext = extname(file).toLowerCase();
      fileTypeCounts[ext] = (fileTypeCounts[ext] || 0) + 1;
    });

    // Display file counts by type
    const typeCountStrings = Object.entries(fileTypeCounts)
      .map(([ext, count]) => `${fileTypeNames[ext]}: ${count}`)
      .join(', ');
    
    console.log(`Found ${supportedFiles.length} supported files (${typeCountStrings})`);
    console.log('');

    // Setup cache directory
    await setupCacheDirectory(resolvedPath, packageJson);
    console.log('');    // Load previous index for comparison
    const cacheDir = join(resolvedPath, '.folder-mcp');
    const previousIndex = loadPreviousIndex(cacheDir);
    
    // Generate fingerprints for all supported files
    const fingerprints = await generateFingerprints(supportedFiles, resolvedPath);
    console.log('');

    // Detect cache status (new, modified, deleted files)
    const cacheStatus = detectCacheStatus(fingerprints, previousIndex);
    displayCacheStatus(cacheStatus);
    console.log('');

    // Process file content (parse and cache)
    await processFiles(fingerprints, resolvedPath, cacheDir);
    console.log('');    // Save fingerprints to cache
    await saveFingerprintsToCache(fingerprints, cacheDir);
    console.log('');    // Generate embeddings automatically (unless skipped)
    if (!options.skipEmbeddings) {
      console.log('🚀 Generating embeddings for processed chunks...');
      try {
        await generateEmbeddingsForChunks(cacheDir, 32, false);
        
        // Build vector index automatically after embeddings
        console.log('🔧 Building vector search index...');
        try {
          // Import the vector index building function
          const { buildVectorIndex } = await import('../search/index.js');
          const vectorIndex = await buildVectorIndex(cacheDir);
          const stats = vectorIndex.getStats();
          console.log(`✅ Vector index built successfully! (${stats.vectorCount} vectors, ${stats.dimension}D)`);
        } catch (indexError) {
          console.warn(`⚠️  Warning: Vector index building failed: ${indexError}`);
          console.log(`   You can build the vector index later with: folder-mcp build-index "${folderPath}"`);
        }
      } catch (error) {
        console.warn(`⚠️  Warning: Embedding generation failed: ${error}`);
        console.log(`   You can generate embeddings later with: folder-mcp embeddings "${folderPath}"`);
      }
      console.log('');
    } else {      console.log('⏭️  Skipped embedding generation (use --skip-embeddings)');
      console.log(`   Generate embeddings later with: folder-mcp embeddings "${folderPath}"`);
      console.log(`   Then build vector index with: folder-mcp build-index "${folderPath}"`);
      console.log('');
    }    // Display all files
    console.log('Supported files found:');
    relativePaths.forEach(file => {
      console.log(`  ${file}`);
    });

    console.log('');
    console.log(`Total supported files: ${supportedFiles.length}`);

    // Generate and cache runtime configuration
    try {
      const { generateRuntimeConfig, saveRuntimeConfig } = await import('../config/runtime.js');
      const { resolveConfig } = await import('../config/resolver.js');
      
      console.log('💾 Caching runtime configuration...');
      const resolvedConfig = resolveConfig(folderPath);
      const runtimeConfig = await generateRuntimeConfig(folderPath, resolvedConfig);
      await saveRuntimeConfig(runtimeConfig);
    } catch (configError) {
      console.warn(`⚠️  Warning: Failed to cache runtime configuration: ${configError}`);
    }

  } catch (error) {
    console.error(`Error scanning folder: ${error}`);
    process.exit(1);
  }
}

export async function showChunkingSummary(folderPath: string): Promise<void> {
  try {
    const resolvedPath = resolve(folderPath);
    const cacheDir = join(resolvedPath, '.folder-mcp');
    const metadataDir = join(cacheDir, 'metadata');
    
    if (!existsSync(metadataDir)) {
      console.log(`No cache found. Run 'folder-mcp index "${folderPath}"' first.`);
      return;
    }
    
    // Read all metadata files
    const metadataFiles = readdirSync(metadataDir).filter(f => f.endsWith('.json'));
    
    if (metadataFiles.length === 0) {
      console.log('No processed files found in cache.');
      return;
    }
    
    console.log(`\n📊 Chunking Summary for: ${resolvedPath}`);
    console.log('=' .repeat(60));
    
    let totalFiles = 0;
    let totalChunks = 0;
    let totalTokens = 0;
    const typeStats: { [key: string]: { files: number; chunks: number; tokens: number } } = {};
    
    for (const metadataFile of metadataFiles) {
      const filePath = join(metadataDir, metadataFile);
      const metadata = JSON.parse(readFileSync(filePath, 'utf8'));
      
      if (metadata.chunks && metadata.chunkingStats) {
        totalFiles++;
        totalChunks += metadata.totalChunks;
        totalTokens += metadata.chunkingStats.originalTokenCount;
        
        const fileType = metadata.originalContent.type;
        if (!typeStats[fileType]) {
          typeStats[fileType] = { files: 0, chunks: 0, tokens: 0 };
        }
        
        typeStats[fileType].files++;
        typeStats[fileType].chunks += metadata.totalChunks;
        typeStats[fileType].tokens += metadata.chunkingStats.originalTokenCount;
        
        // Show individual file details
        const fileName = metadata.originalContent.originalPath;
        const avgTokens = metadata.chunkingStats.averageChunkTokens;
        const minTokens = metadata.chunkingStats.minChunkTokens;
        const maxTokens = metadata.chunkingStats.maxChunkTokens;
        
        console.log(`\n📄 ${fileName}`);
        console.log(`   Type: ${fileType} | Chunks: ${metadata.totalChunks} | Tokens: ${avgTokens} avg (${minTokens}-${maxTokens})`);
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📈 Overall Statistics:`);
    console.log(`   Total Files: ${totalFiles}`);
    console.log(`   Total Chunks: ${totalChunks}`);
    console.log(`   Total Tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Average Chunks per File: ${Math.round(totalChunks / totalFiles)}`);
    console.log(`   Average Tokens per Chunk: ${Math.round(totalTokens / totalChunks)}`);
    
    console.log(`\n📋 By File Type:`);
    Object.entries(typeStats).forEach(([type, stats]) => {
      const avgChunksPerFile = Math.round(stats.chunks / stats.files);
      const avgTokensPerChunk = Math.round(stats.tokens / stats.chunks);
      console.log(`   ${type}: ${stats.files} files, ${stats.chunks} chunks (${avgChunksPerFile} avg/file, ${avgTokensPerChunk} tokens/chunk)`);
    });
    
    console.log('');
    
  } catch (error) {
    console.error(`Error reading chunking summary: ${error}`);
    process.exit(1);
  }
}

export async function generateEmbeddings(
  folderPath: string, 
  options: { batchSize?: number; force?: boolean } = {}
): Promise<void> {  try {
    const resolvedPath = resolve(folderPath);
    const cacheDir = join(resolvedPath, '.folder-mcp');
    
    if (!existsSync(cacheDir)) {
      console.error(`❌ No cache found in "${folderPath}". Run 'folder-mcp index "${folderPath}"' first.`);
      process.exit(1);
    }

    const { batchSize = 32, force = false } = options;
    
    console.log(`🎯 Generating embeddings for: ${resolvedPath}`);
    console.log(`⚙️  Batch size: ${batchSize}`);
    if (force) {
      console.log('🔄 Force regeneration enabled');
    }
    console.log('');
    
    await generateEmbeddingsForChunks(cacheDir, batchSize, force);
    
  } catch (error) {
    console.error(`❌ Error generating embeddings: ${error}`);
    process.exit(1);
  }
}
