import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, resolve, extname, relative } from 'path';
import { glob } from 'glob';
import { FileFingerprint } from '../types/index.js';
import { generateFingerprints } from '../utils/fingerprint.js';
import { setupCacheDirectory, loadPreviousIndex, detectCacheStatus, displayCacheStatus, saveFingerprintsToCache } from '../cache/index.js';
import { parseTextFile, parsePdfFile, parseWordFile, parseExcelFile, parsePowerPointFile } from '../parsers/index.js';
import { chunkText, estimateTokenCount } from './chunking.js';

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
  
  writeFileSync(metadataFile, JSON.stringify(metadataContent, null, 2));
  
  // Log chunking stats (concise)
  if (chunkedContent.totalChunks > 0) {
    console.log(`    → ${chunkedContent.totalChunks} chunks (${metadataContent.chunkingStats.averageChunkTokens} avg tokens)`);
  }
}

async function processFiles(fingerprints: FileFingerprint[], basePath: string, cacheDir: string): Promise<void> {
  console.log('Processing file content...');
  
  for (let i = 0; i < fingerprints.length; i++) {
    const fingerprint = fingerprints[i];
    const fullPath = join(basePath, fingerprint.path);
    const ext = extname(fingerprint.path).toLowerCase();
    
    try {
      if (ext === '.txt' || ext === '.md') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parseTextFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else if (ext === '.pdf') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parsePdfFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else if (ext === '.docx') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parseWordFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else if (ext === '.xlsx') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parseExcelFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else if (ext === '.pptx') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parsePowerPointFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else {
        console.log(`  ${i + 1}/${fingerprints.length}: Skipping ${fingerprint.path} (parser not implemented yet)`);
      }
    } catch (error) {
      console.warn(`  Warning: Could not process ${fingerprint.path}: ${error}`);
    }
  }
}

export async function indexFolder(folderPath: string, packageJson: any): Promise<void> {
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
    const pattern = join(resolvedPath, '**', '*').replace(/\\/g, '/');
    const allFiles = await glob(pattern, { 
      nodir: true,  // Only files, not directories
      dot: false,   // Ignore hidden files
      ignore: ['**/.folder-mcp-cache/**']  // Exclude our cache directory
    });

    // Additional filter to ensure no cache files slip through
    const filteredFiles = allFiles.filter(file => {
      const relativePath = relative(resolvedPath, file);
      return !relativePath.includes('.folder-mcp-cache');
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
    console.log('');

    // Load previous index for comparison
    const cacheDir = join(resolvedPath, '.folder-mcp-cache');
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
    console.log('');

    // Save fingerprints to cache
    await saveFingerprintsToCache(fingerprints, cacheDir);
    console.log('');

    // Display all files
    console.log('Supported files found:');
    relativePaths.forEach(file => {
      console.log(`  ${file}`);
    });

    console.log('');
    console.log(`Total supported files: ${supportedFiles.length}`);

  } catch (error) {
    console.error(`Error scanning folder: ${error}`);
    process.exit(1);
  }
}

export async function showChunkingSummary(folderPath: string): Promise<void> {
  try {
    const resolvedPath = resolve(folderPath);
    const cacheDir = join(resolvedPath, '.folder-mcp-cache');
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
