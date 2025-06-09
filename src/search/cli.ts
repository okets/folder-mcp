import * as path from 'path';
import { EmbeddingModel } from '../embeddings/index.js';
import { VectorIndex, loadVectorIndex, buildVectorIndex } from './index.js';

export interface SearchOptions {
  k: number;
  rebuildIndex?: boolean;
}

export async function searchVectorIndex(folderPath: string, query: string, options: SearchOptions): Promise<void> {
  console.log(`🔍 Searching for: "${query}"`);
  console.log(`📁 Folder: ${folderPath}`);
  console.log(`📊 Results: ${options.k}\n`);

  try {
    // Check if folder is indexed
    const cacheDir = path.join(folderPath, '.folder-mcp');
    const embeddingsDir = path.join(cacheDir, 'embeddings');

    // Try to access embeddings directory
    try {
      const fs = await import('fs/promises');
      await fs.access(embeddingsDir);
    } catch (error) {
      console.error('❌ Folder is not indexed. Please run indexing first:');
      console.error(`   folder-mcp index "${folderPath}"`);
      process.exit(1);
    }

    // Load or build vector index
    let vectorIndex: VectorIndex;

    if (options.rebuildIndex) {
      console.log('🔄 Rebuilding vector index...');
      vectorIndex = await buildVectorIndex(cacheDir);
    } else {
      console.log('📖 Loading vector index...');
      const existingIndex = await loadVectorIndex(cacheDir);
      
      if (!existingIndex) {
        console.log('🔄 No existing index found. Building new index...');
        vectorIndex = await buildVectorIndex(cacheDir);
      } else {
        vectorIndex = existingIndex;
        console.log('✅ Vector index loaded successfully!');
      }
    }

    // Show index stats
    const stats = vectorIndex.getStats();
    console.log(`📊 Index: ${stats.vectorCount} vectors, ${stats.dimension}D\n`);

    // Generate query embedding
    console.log('🧠 Generating query embedding...');
    const embeddingModel = new EmbeddingModel();
    await embeddingModel.initialize();
    
    const queryEmbedding = await embeddingModel.generateEmbedding(query);
    console.log('✅ Query embedding generated\n');

    // Perform search
    console.log('🎯 Searching for similar content...');
    const searchResults = await vectorIndex.search(queryEmbedding.vector, options.k);

    if (searchResults.length === 0) {
      console.log('💭 No similar content found.');
      return;
    }

    // Display results
    console.log(`\n🎯 Found ${searchResults.length} similar chunks:\n`);
    
    searchResults.forEach((result, index) => {
      console.log(`${index + 1}. 📄 ${result.chunk.metadata.filePath}`);
      console.log(`   📊 Score: ${result.score.toFixed(4)}`);
      console.log(`   📏 Lines: ${result.chunk.metadata.startLine}-${result.chunk.metadata.endLine}`);
      console.log(`   📝 Content: ${result.chunk.content.slice(0, 200)}${result.chunk.content.length > 200 ? '...' : ''}`);
      console.log('');
    });

    console.log('✅ Search completed successfully!');

  } catch (error) {
    console.error('❌ Search failed:', error);
    process.exit(1);
  }
}

/**
 * Build vector index for a folder
 */
export async function buildVectorIndexCLI(folderPath: string): Promise<void> {
  console.log(`🔧 Building vector index for: ${folderPath}\n`);

  try {
    const cacheDir = path.join(folderPath, '.folder-mcp');
    const embeddingsDir = path.join(cacheDir, 'embeddings');

    // Check if embeddings exist
    try {
      const fs = await import('fs/promises');
      await fs.access(embeddingsDir);
    } catch (error) {
      console.error('❌ No embeddings found. Please run embedding generation first:');
      console.error(`   folder-mcp embeddings "${folderPath}"`);
      process.exit(1);
    }

    // Build index
    const vectorIndex = await buildVectorIndex(cacheDir);
    const stats = vectorIndex.getStats();

    console.log(`\n✅ Vector index built successfully!`);
    console.log(`📊 Indexed ${stats.vectorCount} vectors with ${stats.dimension} dimensions`);

  } catch (error) {
    console.error('❌ Failed to build vector index:', error);
    process.exit(1);
  }
}
