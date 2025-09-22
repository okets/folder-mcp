/**
 * Document Keyword Scorer Service
 *
 * Efficiently collects keywords from all chunks and scores them against
 * the document embedding. Reuses keyword embeddings generated during
 * chunk processing to avoid regeneration.
 *
 * Key optimizations:
 * - Reuses cached keyword embeddings from chunk processing
 * - Deduplicates keywords across chunks
 * - Applies multi-factor scoring (document similarity + chunk frequency)
 * - Optional MMR (Maximal Marginal Relevance) for diversity
 */

import { ILoggingService } from '../../di/interfaces.js';
import { SemanticScore } from '../../types/index.js';

/**
 * Keyword candidate collected from chunks
 */
export interface DocumentKeywordCandidate {
  text: string;                    // Keyword text (normalized)
  embedding?: Float32Array | undefined;  // Cached embedding (reused from chunks)
  chunkFrequency: number;         // Number of chunks containing this keyword
  chunkScores: number[];          // Scores from each chunk
  avgChunkScore: number;          // Average score across chunks
  documentScore?: number;         // Cosine similarity to document embedding
  finalScore?: number;            // Combined score for final ranking
}

/**
 * Options for keyword scoring
 */
export interface KeywordScoringOptions {
  maxKeywords?: number;           // Maximum keywords to return (default: 30)
  minScore?: number;              // Minimum score threshold (default: 0.3)
  diversityFactor?: number;       // MMR diversity factor 0-1 (default: 0.3)
  useDiversity?: boolean;         // Enable MMR for diversity (default: true)
  weights?: {
    documentSimilarity?: number;  // Weight for document similarity (default: 0.7)
    chunkAverage?: number;        // Weight for average chunk score (default: 0.2)
    frequency?: number;           // Weight for chunk frequency (default: 0.1)
  };
}

/**
 * Result of keyword scoring
 */
export interface KeywordScoringResult {
  keywords: SemanticScore[];      // Final selected keywords with scores
  totalCandidates: number;        // Total unique candidates considered
  deduplicationRatio: number;     // Ratio of duplicates removed
  processingTimeMs: number;       // Time taken for scoring
}

/**
 * Interface for document keyword scorer
 */
export interface IDocumentKeywordScorer {
  /**
   * Collect keyword from a chunk
   */
  collectFromChunk(
    keywords: SemanticScore[],
    chunkIndex: number,
    keywordEmbeddings?: Map<string, Float32Array>
  ): void;

  /**
   * Score all collected keywords against document embedding
   */
  scoreAndSelect(
    documentEmbedding: Float32Array,
    options?: KeywordScoringOptions
  ): KeywordScoringResult;

  /**
   * Reset for a new document
   */
  reset(): void;

  /**
   * Get current statistics
   */
  getStats(): {
    totalKeywords: number;
    uniqueKeywords: number;
    chunksProcessed: number;
  };
}

/**
 * Document Keyword Scorer implementation
 */
export class DocumentKeywordScorer implements IDocumentKeywordScorer {
  private candidates: Map<string, DocumentKeywordCandidate> = new Map();
  private chunksProcessed: number = 0;
  private totalKeywords: number = 0;

  constructor(private logger: ILoggingService) {}

  /**
   * Collect keywords from a chunk
   * Deduplicates and accumulates scores/frequencies
   */
  collectFromChunk(
    keywords: SemanticScore[],
    chunkIndex: number,
    keywordEmbeddings?: Map<string, Float32Array>
  ): void {
    this.chunksProcessed++;

    for (const keyword of keywords) {
      this.totalKeywords++;

      // Normalize text for deduplication
      const normalized = keyword.text.toLowerCase().trim();

      if (this.candidates.has(normalized)) {
        // Update existing candidate
        const candidate = this.candidates.get(normalized)!;
        candidate.chunkFrequency++;
        candidate.chunkScores.push(keyword.score);

        // Update average score
        const sum = candidate.chunkScores.reduce((a, b) => a + b, 0);
        candidate.avgChunkScore = sum / candidate.chunkScores.length;

        // Preserve embedding if we have it
        if (!candidate.embedding && keywordEmbeddings?.has(keyword.text)) {
          const embeddingFromCache = keywordEmbeddings.get(keyword.text);
          if (embeddingFromCache) {
            candidate.embedding = embeddingFromCache;
          }
        }
      } else {
        // Create new candidate
        const embeddingFromCache = keywordEmbeddings?.get(keyword.text);
        const candidate: DocumentKeywordCandidate = {
          text: keyword.text, // Keep original casing
          embedding: embeddingFromCache,
          chunkFrequency: 1,
          chunkScores: [keyword.score],
          avgChunkScore: keyword.score
        };
        this.candidates.set(normalized, candidate);
      }
    }

    this.logger.debug(`Collected ${keywords.length} keywords from chunk ${chunkIndex}, total unique: ${this.candidates.size}`);
  }

  /**
   * Score all collected keywords against document embedding
   */
  scoreAndSelect(
    documentEmbedding: Float32Array,
    options: KeywordScoringOptions = {}
  ): KeywordScoringResult {
    const startTime = Date.now();

    // Default options
    const maxKeywords = options.maxKeywords ?? 30;
    const minScore = options.minScore ?? 0.3;
    const diversityFactor = options.diversityFactor ?? 0.3;
    const useDiversity = options.useDiversity ?? true;
    const weights = {
      documentSimilarity: options.weights?.documentSimilarity ?? 0.7,
      chunkAverage: options.weights?.chunkAverage ?? 0.2,
      frequency: options.weights?.frequency ?? 0.1
    };

    // Normalize document embedding for cosine similarity
    const normDocEmbedding = this.normalizeVector(documentEmbedding);

    // Score all candidates
    const scoredCandidates: DocumentKeywordCandidate[] = [];

    for (const candidate of this.candidates.values()) {
      // Calculate document similarity if embedding available
      if (candidate.embedding) {
        const normKeywordEmbedding = this.normalizeVector(candidate.embedding);
        candidate.documentScore = this.cosineSimilarity(normDocEmbedding, normKeywordEmbedding);
      } else {
        // Fallback: use average chunk score as proxy
        candidate.documentScore = candidate.avgChunkScore;
        this.logger.debug(`No embedding for keyword "${candidate.text}", using chunk score as fallback`);
      }

      // Calculate combined score
      // Log frequency to reduce impact of very frequent keywords
      // Prevent division by zero when no chunks have been processed
      const safeChunksProcessed = Math.max(this.chunksProcessed, 1);
      const freqScore = Math.log(1 + candidate.chunkFrequency) / Math.log(1 + safeChunksProcessed);

      candidate.finalScore =
        weights.documentSimilarity * candidate.documentScore +
        weights.chunkAverage * candidate.avgChunkScore +
        weights.frequency * freqScore;

      // Filter by minimum score
      if (candidate.finalScore >= minScore) {
        scoredCandidates.push(candidate);
      }
    }

    // Sort by final score
    scoredCandidates.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    // Apply diversity selection if enabled
    let selectedKeywords: SemanticScore[];
    if (useDiversity && scoredCandidates.length > maxKeywords) {
      selectedKeywords = this.applyMMR(scoredCandidates, maxKeywords, diversityFactor);
    } else {
      // Simple top-K selection
      selectedKeywords = scoredCandidates
        .slice(0, maxKeywords)
        .map(c => ({
          text: c.text,
          score: c.finalScore || 0
        }));
    }

    const processingTimeMs = Date.now() - startTime;
    const deduplicationRatio = this.totalKeywords > 0
      ? (this.totalKeywords - this.candidates.size) / this.totalKeywords
      : 0;

    this.logger.info(`Document keyword scoring complete: ${selectedKeywords.length} keywords selected from ${this.candidates.size} unique candidates`, {
      totalCandidates: this.totalKeywords,
      uniqueCandidates: this.candidates.size,
      deduplicationRatio: (deduplicationRatio * 100).toFixed(1) + '%',
      processingTimeMs
    });

    return {
      keywords: selectedKeywords,
      totalCandidates: this.candidates.size,
      deduplicationRatio,
      processingTimeMs
    };
  }

  /**
   * Apply Maximal Marginal Relevance for diversity
   */
  private applyMMR(
    candidates: DocumentKeywordCandidate[],
    maxKeywords: number,
    diversityFactor: number
  ): SemanticScore[] {
    const selected: DocumentKeywordCandidate[] = [];
    const remaining = [...candidates];

    // Start with highest scoring keyword
    if (remaining.length > 0) {
      selected.push(remaining.shift()!);
    }

    // Iteratively select keywords that balance relevance and diversity
    while (selected.length < maxKeywords && remaining.length > 0) {
      let bestCandidate: DocumentKeywordCandidate | null = null;
      let bestMMRScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        if (!candidate) continue;

        // Calculate relevance (original score)
        const relevance = candidate.finalScore || 0;

        // Calculate similarity to already selected keywords
        let maxSimilarity = 0;
        if (candidate.embedding) {
          for (const selectedCandidate of selected) {
            if (selectedCandidate.embedding) {
              const similarity = this.cosineSimilarity(
                this.normalizeVector(candidate.embedding),
                this.normalizeVector(selectedCandidate.embedding)
              );
              maxSimilarity = Math.max(maxSimilarity, similarity);
            }
          }
        }

        // MMR score = λ * relevance - (1 - λ) * maxSimilarity
        const mmrScore = diversityFactor * relevance - (1 - diversityFactor) * maxSimilarity;

        if (mmrScore > bestMMRScore) {
          bestMMRScore = mmrScore;
          bestCandidate = candidate;
          bestIndex = i;
        }
      }

      if (bestCandidate !== null && bestIndex >= 0) {
        selected.push(bestCandidate);
        remaining.splice(bestIndex, 1);
      } else {
        break;
      }
    }

    return selected.map(c => ({
      text: c.text,
      score: c.finalScore || 0
    }));
  }

  /**
   * Calculate cosine similarity between two normalized vectors
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    // Validate that both vectors have the same length
    if (a.length !== b.length) {
      throw new Error(
        `CRITICAL: Vector length mismatch in cosine similarity calculation! ` +
        `Vector A has ${a.length} dimensions, Vector B has ${b.length} dimensions. ` +
        `This indicates a serious embedding model inconsistency that must be fixed.`
      );
    }

    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        dotProduct += aVal * bVal;
      }
    }
    return dotProduct; // Vectors are already normalized
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: Float32Array): Float32Array {
    let magnitude = 0;
    for (let i = 0; i < vector.length; i++) {
      const val = vector[i];
      if (val !== undefined) {
        magnitude += val * val;
      }
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude === 0) {
      return vector; // Avoid division by zero
    }

    const normalized = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
      const val = vector[i];
      if (val !== undefined) {
        normalized[i] = val / magnitude;
      }
    }
    return normalized;
  }

  /**
   * Reset for a new document
   */
  reset(): void {
    this.candidates.clear();
    this.chunksProcessed = 0;
    this.totalKeywords = 0;
  }

  /**
   * Get current statistics
   */
  getStats(): { totalKeywords: number; uniqueKeywords: number; chunksProcessed: number } {
    return {
      totalKeywords: this.totalKeywords,
      uniqueKeywords: this.candidates.size,
      chunksProcessed: this.chunksProcessed
    };
  }
}

/**
 * Factory function for creating document keyword scorer
 */
export function createDocumentKeywordScorer(logger: ILoggingService): IDocumentKeywordScorer {
  return new DocumentKeywordScorer(logger);
}

/**
 * Example usage:
 *
 * ```typescript
 * const scorer = createDocumentKeywordScorer(logger);
 *
 * // Collect keywords from each chunk
 * for (const [index, chunk] of chunks.entries()) {
 *   const keywords = chunk.keyPhrases; // Already extracted
 *   const embeddings = keywordEmbeddingCache; // From NGramExtractor cache
 *   scorer.collectFromChunk(keywords, index, embeddings);
 * }
 *
 * // Score against document embedding
 * const result = scorer.scoreAndSelect(documentEmbedding, {
 *   maxKeywords: 30,
 *   minScore: 0.3,
 *   useDiversity: true,
 *   diversityFactor: 0.3
 * });
 *
 * // Store in database
 * const keywordsJson = JSON.stringify(result.keywords);
 * await database.updateDocumentKeywords(docId, keywordsJson);
 * ```
 */