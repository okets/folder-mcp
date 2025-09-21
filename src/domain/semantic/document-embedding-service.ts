/**
 * Document Embedding Service
 *
 * Implements incremental document embedding generation using Welford's
 * numerically stable online algorithm. This allows processing documents
 * with 100+ chunks without loading all embeddings into memory at once.
 *
 * Key features:
 * - O(1) memory complexity regardless of chunk count
 * - Numerically stable averaging (avoids floating point errors)
 * - Supports both ONNX and Python model outputs
 * - Calculates embedding statistics for quality monitoring
 */

import { ILoggingService } from '../../di/interfaces.js';

/**
 * Statistics about a document embedding
 */
export interface DocumentEmbeddingStats {
  dimension: number;          // Embedding vector dimension
  chunkCount: number;        // Number of chunks averaged
  magnitude: number;         // L2 norm of the embedding
  sparsity: number;         // Percentage of near-zero values
  processingTimeMs: number; // Total processing time
}

/**
 * Result of document embedding generation
 */
export interface DocumentEmbeddingResult {
  embedding: Float32Array;
  stats: DocumentEmbeddingStats;
}

/**
 * Interface for document embedding service
 */
export interface IDocumentEmbeddingService {
  /**
   * Create a new averaging session for a document
   */
  createAverager(): IIncrementalEmbeddingAverager;

  /**
   * Calculate statistics for an embedding
   */
  calculateStats(embedding: Float32Array, chunkCount: number, processingTimeMs: number): DocumentEmbeddingStats;

  /**
   * Serialize embedding for database storage
   */
  serializeEmbedding(embedding: Float32Array): string;

  /**
   * Deserialize embedding from database
   */
  deserializeEmbedding(serialized: string): Float32Array;
}

/**
 * Interface for incremental embedding averaging
 */
export interface IIncrementalEmbeddingAverager {
  /**
   * Add a chunk embedding to the running average
   */
  add(embedding: Float32Array): void;

  /**
   * Get the current average embedding
   */
  getAverage(): Float32Array;

  /**
   * Get the number of chunks processed
   */
  getChunkCount(): number;

  /**
   * Reset the averager for a new document
   */
  reset(): void;
}

/**
 * Incremental embedding averager using Welford's algorithm
 *
 * Welford's algorithm provides numerically stable computation of mean
 * by updating the mean incrementally with each new value:
 * new_mean = old_mean + (value - old_mean) / n
 *
 * This avoids the numerical instability of summing large numbers
 * and dividing at the end, which can cause floating point overflow
 * or loss of precision.
 */
export class IncrementalEmbeddingAverager implements IIncrementalEmbeddingAverager {
  private n: number = 0;                    // Number of chunks processed
  private mean: Float32Array | null = null; // Running mean
  private dimension: number = 0;            // Embedding dimension

  constructor(private logger: ILoggingService) {}

  /**
   * Add a chunk embedding to the running average
   * Uses Welford's update formula for numerical stability
   */
  add(embedding: Float32Array): void {
    this.n++;

    if (this.n === 1) {
      // First embedding: initialize mean
      this.dimension = embedding.length;
      this.mean = new Float32Array(embedding);
      this.logger.debug(`Initialized document embedding averager with dimension ${this.dimension}`);
    } else {
      if (!this.mean) {
        throw new Error('Averager not properly initialized');
      }

      if (embedding.length !== this.dimension) {
        throw new Error(`Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`);
      }

      // Welford's update: new_mean = old_mean + (value - old_mean) / n
      for (let i = 0; i < this.dimension; i++) {
        const oldValue = this.mean![i]!;
        const newValue = embedding[i]!;
        this.mean![i] = oldValue + (newValue - oldValue) / this.n;
      }
    }
  }

  /**
   * Get the current average embedding
   */
  getAverage(): Float32Array {
    if (!this.mean || this.n === 0) {
      throw new Error('No embeddings have been added to the averager');
    }

    // Return a copy to prevent external modification
    return new Float32Array(this.mean);
  }

  /**
   * Get the number of chunks processed
   */
  getChunkCount(): number {
    return this.n;
  }

  /**
   * Reset the averager for a new document
   */
  reset(): void {
    this.n = 0;
    this.mean = null;
    this.dimension = 0;
  }
}

/**
 * Document Embedding Service implementation
 */
export class DocumentEmbeddingService implements IDocumentEmbeddingService {
  constructor(private logger: ILoggingService) {}

  /**
   * Create a new averaging session for a document
   */
  createAverager(): IIncrementalEmbeddingAverager {
    return new IncrementalEmbeddingAverager(this.logger);
  }

  /**
   * Calculate statistics for an embedding
   */
  calculateStats(embedding: Float32Array, chunkCount: number, processingTimeMs: number): DocumentEmbeddingStats {
    const dimension = embedding.length;

    // Calculate L2 norm (magnitude)
    let magnitudeSquared = 0;
    for (let i = 0; i < dimension; i++) {
      const value = embedding[i]!;
      magnitudeSquared += value * value;
    }
    const magnitude = Math.sqrt(magnitudeSquared);

    // Calculate sparsity (percentage of values close to zero)
    const threshold = 0.01; // Values below this are considered "near zero"
    let nearZeroCount = 0;
    for (let i = 0; i < dimension; i++) {
      const value = embedding[i];
      if (value !== undefined && Math.abs(value) < threshold) {
        nearZeroCount++;
      }
    }
    const sparsity = (nearZeroCount / dimension) * 100;

    return {
      dimension,
      chunkCount,
      magnitude,
      sparsity,
      processingTimeMs
    };
  }

  /**
   * Serialize embedding for database storage
   * Converts Float32Array to base64-encoded string
   */
  serializeEmbedding(embedding: Float32Array): string {
    // Convert Float32Array to Buffer
    const buffer = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
    // Convert to base64 for text storage in SQLite
    return buffer.toString('base64');
  }

  /**
   * Deserialize embedding from database
   * Converts base64-encoded string back to Float32Array
   */
  deserializeEmbedding(serialized: string): Float32Array {
    // Convert base64 back to Buffer
    const buffer = Buffer.from(serialized, 'base64');
    // Create Float32Array from buffer
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  }
}

/**
 * Factory function for creating document embedding service
 */
export function createDocumentEmbeddingService(logger: ILoggingService): IDocumentEmbeddingService {
  return new DocumentEmbeddingService(logger);
}

/**
 * Example usage for processing a document:
 *
 * ```typescript
 * const service = createDocumentEmbeddingService(logger);
 * const averager = service.createAverager();
 *
 * // Process chunks incrementally
 * for (const chunk of chunks) {
 *   const embedding = await getChunkEmbedding(chunk);
 *   averager.add(embedding);
 *   // Memory usage remains constant regardless of chunk count
 * }
 *
 * // Get final document embedding
 * const documentEmbedding = averager.getAverage();
 * const stats = service.calculateStats(
 *   documentEmbedding,
 *   averager.getChunkCount(),
 *   processingTime
 * );
 *
 * // Store in database
 * const serialized = service.serializeEmbedding(documentEmbedding);
 * await database.updateDocumentEmbedding(docId, serialized, stats.processingTimeMs);
 * ```
 */