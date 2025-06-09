import faiss from 'faiss-node';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EmbeddingVector } from '../types/index.js';

export interface VectorSearchResult {
  id: number;
  score: number;
  chunk: {
    content: string;
    metadata: {
      filePath: string;
      chunkIndex: number;
      startLine: number;
      endLine: number;
      fingerprint: string;
    };
  };
}

export interface IndexMapping {
  id: number;
  chunkId: string;
  filePath: string;
  chunkIndex: number;
  fingerprint: string;
}

// Interface for the stored embedding files
interface StoredEmbedding {
  chunk: {
    content: string;
    startPosition: number;
    endPosition: number;
    tokenCount: number;
    chunkIndex: number;
    metadata: {
      sourceFile: string;
      sourceType: string;
      totalChunks: number;
      hasOverlap: boolean;
      originalMetadata?: any;
    };
  };
  embedding: {
    vector: number[];
    dimensions: number;
    model: string;
    createdAt: string;
  };
  generatedAt: string;
  model: string;
  modelBackend: string;
  isGPUAccelerated: boolean;
  filename?: string; // Added to track the filename
}

export class VectorIndex {
  private index: any = null;
  private mappings: IndexMapping[] = [];
  private vectors: number[][] = [];
  private dimension: number = 0;
  private vectorsDir: string;
  private indexPath: string;
  private mappingsPath: string;
  private vectorsPath: string;

  constructor(cacheDir: string) {
    this.vectorsDir = path.join(cacheDir, 'vectors');
    this.indexPath = path.join(this.vectorsDir, 'index.faiss');
    this.mappingsPath = path.join(this.vectorsDir, 'mappings.json');
    this.vectorsPath = path.join(this.vectorsDir, 'vectors.json');
  }

  /**
   * Build FAISS index from existing embeddings
   */
  async buildIndex(embeddingsDir: string): Promise<void> {
    console.log('Building FAISS vector index...');

    // Ensure vectors directory exists
    await fs.mkdir(this.vectorsDir, { recursive: true });

    // Load all embedding files
    const embeddingFiles = await this.loadEmbeddingFiles(embeddingsDir);
    
    if (embeddingFiles.length === 0) {
      throw new Error('No embedding files found. Please run embedding generation first.');
    }

    // Get dimension from first embedding
    this.dimension = embeddingFiles[0].embedding.vector.length;
    console.log(`Vector dimension: ${this.dimension}`);

    // Create FAISS index
    this.index = new faiss.IndexFlatIP(this.dimension); // Inner Product similarity

    // Prepare vectors and mappings
    this.vectors = [];
    this.mappings = [];

    embeddingFiles.forEach((embeddingData, index) => {
      this.vectors.push(embeddingData.embedding.vector);
      
      // Extract fingerprint from filename
      const filename = embeddingData.filename || '';
      const fingerprint = filename.split('_chunk_')[0];
      
      this.mappings.push({
        id: index,
        chunkId: `${fingerprint}_${embeddingData.chunk.chunkIndex}`,
        filePath: embeddingData.chunk.metadata.sourceFile,
        chunkIndex: embeddingData.chunk.chunkIndex,
        fingerprint: fingerprint
      });
    });

    // Add vectors to index
    console.log(`Adding ${this.vectors.length} vectors to FAISS index...`);
    this.vectors.forEach(vector => {
      this.index.add(vector);
    });

    // Save index and mappings
    await this.saveIndex();
    
    console.log(`✅ FAISS index built with ${this.vectors.length} vectors`);
  }

  /**
   * Load existing FAISS index
   */
  async loadIndex(): Promise<boolean> {
    try {
      // Check if index files exist
      const mappingsExist = await this.fileExists(this.mappingsPath);
      const indexExist = await this.fileExists(this.indexPath);

      if (!mappingsExist) {
        console.log('Mappings file not found');
        return false;
      }

      // Load mappings
      const mappingsData = await fs.readFile(this.mappingsPath, 'utf-8');
      this.mappings = JSON.parse(mappingsData);

      if (indexExist) {
        // Load FAISS index from binary format
        console.log('Loading FAISS index from binary format...');
        this.index = faiss.IndexFlatIP.read(this.indexPath);
        this.dimension = this.index.getDimension();
        console.log(`✅ Loaded FAISS index with ${this.mappings.length} vectors (${this.dimension}D)`);
      } else {
        // Fallback: try to load from vectors.json if binary doesn't exist
        console.log('Binary index not found, attempting to load from vectors.json...');
        const vectorsExist = await this.fileExists(this.vectorsPath);
        
        if (!vectorsExist) {
          console.log('No index files found');
          return false;
        }

        // Load vectors from JSON and recreate FAISS index
        const vectorsData = await fs.readFile(this.vectorsPath, 'utf-8');
        this.vectors = JSON.parse(vectorsData);
        
        if (this.vectors.length === 0) {
          console.log('No vectors found in backup file');
          return false;
        }

        // Get dimension
        this.dimension = this.vectors[0].length;

        // Recreate FAISS index
        this.index = new faiss.IndexFlatIP(this.dimension);
        this.vectors.forEach(vector => {
          this.index.add(vector);
        });

        // Save the recreated index in binary format
        await this.saveIndex();
        console.log(`✅ Recreated and saved FAISS index with ${this.mappings.length} vectors (${this.dimension}D)`);
      }

      return true;
    } catch (error) {
      console.error('Failed to load FAISS index:', error);
      return false;
    }
  }

  /**
   * Search for similar vectors
   */
  async search(queryVector: number[], k: number = 5): Promise<VectorSearchResult[]> {
    if (!this.index) {
      throw new Error('Index not loaded. Call buildIndex() or loadIndex() first.');
    }

    if (queryVector.length !== this.dimension) {
      throw new Error(`Query vector dimension (${queryVector.length}) does not match index dimension (${this.dimension})`);
    }

    // Ensure k doesn't exceed available vectors
    const actualK = Math.min(k, this.mappings.length);

    // Perform search
    const results = this.index.search(queryVector, actualK);
    const distances = Array.isArray(results.distances) ? results.distances : [results.distances];
    const labels = Array.isArray(results.labels) ? results.labels : [results.labels];

    // Convert results to VectorSearchResult format
    const searchResults: VectorSearchResult[] = [];

    for (let i = 0; i < labels.length; i++) {
      const id = labels[i];
      const rawScore = distances[i];

      // Skip invalid results
      if (id === -1) continue;

      const mapping = this.mappings[id];
      if (!mapping) continue;

      // Load chunk data
      const chunkData = await this.loadChunkData(mapping);
      if (!chunkData) continue;

      // Normalize score to 0-1 range
      // FAISS IndexFlatIP returns inner product scores
      // For embedding models, higher scores = more similar
      // Use a simple normalization that preserves relative ordering
      // Raw scores can be large (100+), so we'll use a sigmoid-like function
      const normalizedScore = Math.max(0.0, Math.min(1.0, rawScore / 200.0));

      searchResults.push({
        id,
        score: normalizedScore,
        chunk: chunkData
      });
    }

    return searchResults;
  }

  /**
   * Get index statistics
   */
  getStats(): { vectorCount: number; dimension: number; isLoaded: boolean } {
    return {
      vectorCount: this.mappings.length,
      dimension: this.dimension,
      isLoaded: this.index !== null
    };
  }

  /**
   * Save index and mappings to disk
   */
  private async saveIndex(): Promise<void> {
    try {
      // Import atomic file operations for safe writes
      const { AtomicFileOperations } = await import('../utils/errorRecovery.js');
      
      // Save FAISS index to binary format
      if (this.index) {
        this.index.write(this.indexPath);
        console.log(`✅ FAISS index saved to ${this.indexPath}`);
      }
      
      // Save mappings with atomic operations
      await AtomicFileOperations.writeJSONAtomic(this.mappingsPath, this.mappings);
      console.log(`✅ Mappings saved to ${this.mappingsPath}`);
      
      // Keep vectors.json as backup for debugging (optional) - also atomic
      await AtomicFileOperations.writeJSONAtomic(this.vectorsPath, this.vectors);
      console.log(`✅ Vector backup saved to ${this.vectorsPath}`);
    } catch (error) {
      throw new Error(`Failed to save index: ${error}`);
    }
  }

  /**
   * Load all embedding files from embeddings directory
   */
  private async loadEmbeddingFiles(embeddingsDir: string): Promise<StoredEmbedding[]> {
    try {
      const files = await fs.readdir(embeddingsDir);
      const embeddingFiles = files.filter(file => file.endsWith('.json'));

      const embeddings: StoredEmbedding[] = [];

      for (const file of embeddingFiles) {
        const filePath = path.join(embeddingsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const embeddingData: StoredEmbedding = JSON.parse(content);
        
        // Validate embedding structure
        if (!embeddingData.embedding || !embeddingData.chunk || !embeddingData.embedding.vector) {
          console.warn(`Skipping invalid embedding file: ${file}`);
          continue;
        }

        // Add filename for tracking
        embeddingData.filename = file;
        embeddings.push(embeddingData);
      }

      console.log(`Loaded ${embeddings.length} embedding files`);
      return embeddings;
    } catch (error) {
      throw new Error(`Failed to load embedding files: ${error}`);
    }
  }

  /**
   * Load chunk data for a mapping
   */
  private async loadChunkData(mapping: IndexMapping): Promise<any> {
    try {
      // Reconstruct embedding file path  
      const embeddingFileName = `${mapping.fingerprint}_chunk_${mapping.chunkIndex}.json`;
      const embeddingPath = path.join(path.dirname(this.vectorsDir), 'embeddings', embeddingFileName);

      const content = await fs.readFile(embeddingPath, 'utf-8');
      const embeddingData: StoredEmbedding = JSON.parse(content);

      return {
        content: embeddingData.chunk.content,
        metadata: {
          filePath: embeddingData.chunk.metadata.sourceFile,
          chunkIndex: embeddingData.chunk.chunkIndex,
          startLine: embeddingData.chunk.startPosition,
          endLine: embeddingData.chunk.endPosition,
          fingerprint: mapping.fingerprint
        }
      };
    } catch (error) {
      console.warn(`Failed to load chunk data for mapping ${mapping.id}:`, error);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create and initialize vector index
 */
export async function createVectorIndex(cacheDir: string): Promise<VectorIndex> {
  return new VectorIndex(cacheDir);
}

/**
 * Build vector index from embeddings
 */
export async function buildVectorIndex(cacheDir: string): Promise<VectorIndex> {
  const vectorIndex = new VectorIndex(cacheDir);
  const embeddingsDir = path.join(cacheDir, 'embeddings');
  
  await vectorIndex.buildIndex(embeddingsDir);
  return vectorIndex;
}

/**
 * Load existing vector index
 */
export async function loadVectorIndex(cacheDir: string): Promise<VectorIndex | null> {
  const vectorIndex = new VectorIndex(cacheDir);
  const loaded = await vectorIndex.loadIndex();
  
  return loaded ? vectorIndex : null;
}
