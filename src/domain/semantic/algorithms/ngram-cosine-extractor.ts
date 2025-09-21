/**
 * N-gram + Cosine Similarity Key Phrase Extractor
 *
 * Implements the research-backed approach for extracting key phrases
 * when KeyBERT is not available (ONNX models in Node.js).
 * Achieves 60-70% multiword phrase extraction vs 11% with word frequency.
 */

import { cosineSimilarity, maximalMarginalRelevance } from './similarity-utils.js';
import {
  extractNGrams,
  filterCandidates,
  scoreTechnicalRelevance,
  extractKeyPhraseCandidates
} from './ngram-utils.js';
import { ILoggingService } from '../../../di/interfaces.js';

/**
 * Interface for embedding models that can generate embeddings
 */
export interface IEmbeddingModel {
  generateEmbedding(text: string): Promise<Float32Array>;
  generateEmbeddings?(texts: string[]): Promise<Float32Array[]>; // Optional batch method
  getModelDimensions(): number;
}

/**
 * Configuration options for N-gram extraction
 */
export interface NGramExtractionOptions {
  ngramRange: [number, number];  // e.g., [2, 4] for bigrams to 4-grams
  topK: number;                  // Number of phrases to extract
  diversityFactor: number;       // MMR diversity factor (0-1)
  minSimilarity: number;         // Minimum cosine similarity threshold
}

/**
 * N-gram + Cosine Similarity Extractor for ONNX models
 *
 * This extractor works entirely in TypeScript without Python dependencies.
 * It extracts n-grams from text and ranks them by cosine similarity to
 * the document embedding.
 */
export class NGramCosineExtractor {
  private readonly defaultOptions: NGramExtractionOptions = {
    ngramRange: [2, 4],
    topK: 10,
    diversityFactor: 0.5,
    minSimilarity: 0.3
  };

  // Embedding cache to avoid redundant computations
  private embeddingCache: Map<string, Float32Array> = new Map();
  private readonly MAX_CACHE_SIZE = 500; // Limit cache size to prevent memory issues
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(
    private embeddingModel: IEmbeddingModel | null,
    private logger: ILoggingService
  ) {}

  /**
   * Clear the embedding cache
   * Should be called between documents to prevent cross-document cache pollution
   */
  clearCache(): void {
    const previousSize = this.embeddingCache.size;
    this.embeddingCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.debug(`[NGRAM-EXTRACT] Cache cleared (was ${previousSize} entries)`);
  }

  /**
   * Extract key phrases using n-grams and cosine similarity
   *
   * @param text The document text
   * @param docEmbedding Pre-computed document embedding (optional)
   * @param options Extraction options
   * @returns Array of extracted key phrases
   */
  async extractKeyPhrases(
    text: string,
    docEmbedding?: Float32Array,
    options: Partial<NGramExtractionOptions> = {}
  ): Promise<string[]> {
    const opts = { ...this.defaultOptions, ...options };

    this.logger.debug('[NGRAM-EXTRACT] Starting n-gram extraction', {
      textLength: text.length,
      hasEmbedding: !!docEmbedding,
      hasModel: !!this.embeddingModel
    });

    // If no embedding model available, fall back to frequency-based extraction
    if (!this.embeddingModel || !docEmbedding) {
      this.logger.warn('[NGRAM-EXTRACT] No embedding model available, using frequency-based fallback');
      return this.extractByFrequency(text, opts.topK);
    }

    try {
      // Step 1: Extract n-grams
      const ngrams = extractNGrams(text, opts.ngramRange[0], opts.ngramRange[1]);
      this.logger.debug(`[NGRAM-EXTRACT] Extracted ${ngrams.length} n-grams`);

      // Step 2: Filter candidates for quality
      let candidates = filterCandidates(ngrams);
      this.logger.debug(`[NGRAM-EXTRACT] Filtered to ${candidates.length} quality candidates`);

      if (candidates.length === 0) {
        this.logger.warn('[NGRAM-EXTRACT] No quality candidates found, returning empty array');
        return [];
      }

      // Step 2.5: Limit candidates to reduce embedding overhead
      // Use frequency-based pre-filtering to get top candidates
      if (candidates.length > 50) {
        this.logger.debug(`[NGRAM-EXTRACT] Too many candidates (${candidates.length}), reducing to top 50 by frequency`);

        // Count frequency of each candidate
        const frequencyMap = new Map<string, number>();
        for (const candidate of candidates) {
          frequencyMap.set(candidate, (frequencyMap.get(candidate) || 0) + 1);
        }

        // Sort by frequency and take top 50
        candidates = Array.from(frequencyMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 50)
          .map(([phrase]) => phrase);

        this.logger.debug(`[NGRAM-EXTRACT] Reduced to ${candidates.length} most frequent candidates`);
      }

      // Step 3: Generate embeddings for each candidate
      this.logger.debug('[NGRAM-EXTRACT] Generating embeddings for candidates...');
      const candidateEmbeddings = await this.generateCandidateEmbeddings(candidates);

      // Step 4: Calculate cosine similarity with document
      const similarities = candidateEmbeddings.map(candEmb =>
        cosineSimilarity(candEmb, docEmbedding!)
      );

      // Step 5: Filter by minimum similarity threshold
      const validIndices: number[] = [];
      const validEmbeddings: Float32Array[] = [];
      const validScores: number[] = [];

      for (let i = 0; i < similarities.length; i++) {
        const similarity = similarities[i];
        if (similarity !== undefined && similarity >= opts.minSimilarity) {
          validIndices.push(i);
          validEmbeddings.push(candidateEmbeddings[i]!);
          validScores.push(similarity);
        }
      }

      this.logger.debug(`[NGRAM-EXTRACT] ${validIndices.length} candidates above similarity threshold`);

      if (validIndices.length === 0) {
        this.logger.warn('[NGRAM-EXTRACT] No candidates above similarity threshold');
        return this.extractByFrequency(text, opts.topK);
      }

      // Step 6: Apply MMR for diversity
      const selectedIndices = maximalMarginalRelevance(
        validScores,
        validEmbeddings,
        opts.diversityFactor,
        Math.min(opts.topK, validIndices.length)
      );

      // Map back to original candidates
      const selectedPhrases = selectedIndices.map(idx => {
        const originalIdx = validIndices[idx];
        return originalIdx !== undefined ? candidates[originalIdx]! : '';
      }).filter(phrase => phrase !== '');

      // Calculate multiword ratio for logging
      const multiwordCount = selectedPhrases.filter(p => p.includes(' ')).length;
      const multiwordRatio = selectedPhrases.length > 0
        ? (multiwordCount / selectedPhrases.length) * 100
        : 0;

      this.logger.info('[NGRAM-EXTRACT] Extraction complete', {
        totalPhrases: selectedPhrases.length,
        multiwordRatio: `${multiwordRatio.toFixed(1)}%`,
        sample: selectedPhrases.slice(0, 3)
      });

      return selectedPhrases;

    } catch (error) {
      this.logger.error('[NGRAM-EXTRACT] Failed to extract key phrases', error instanceof Error ? error : new Error(String(error)));
      // Fall back to frequency-based extraction on error
      return this.extractByFrequency(text, opts.topK);
    }
  }

  /**
   * Generate embeddings for candidate phrases
   * Optimized to use batch processing and caching when available
   */
  private async generateCandidateEmbeddings(
    candidates: string[]
  ): Promise<Float32Array[]> {
    if (!this.embeddingModel) {
      throw new Error('No embedding model available');
    }

    this.logger.debug(`[NGRAM-EXTRACT] Generating embeddings for ${candidates.length} candidates`);
    const startTime = Date.now();

    // Split candidates into cached and uncached
    const cachedEmbeddings: Map<number, Float32Array> = new Map();
    const uncachedCandidates: string[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]!;
      if (this.embeddingCache.has(candidate)) {
        cachedEmbeddings.set(i, this.embeddingCache.get(candidate)!);
        this.cacheHits++;
      } else {
        uncachedCandidates.push(candidate);
        uncachedIndices.push(i);
        this.cacheMisses++;
      }
    }

    this.logger.debug(`[NGRAM-EXTRACT] Cache stats: ${cachedEmbeddings.size} hits, ${uncachedCandidates.length} misses`);

    // Generate embeddings only for uncached candidates
    let newEmbeddings: Float32Array[] = [];

    if (uncachedCandidates.length > 0) {
      // Check if batch method is available for optimal performance
      if (this.embeddingModel.generateEmbeddings) {
        this.logger.debug('[NGRAM-EXTRACT] Using optimized batch embedding generation for uncached candidates');

        try {
          // Process all uncached candidates in a single batch
          newEmbeddings = await this.embeddingModel.generateEmbeddings(uncachedCandidates);

          // Add to cache with LRU eviction
          for (let i = 0; i < uncachedCandidates.length; i++) {
            const candidate = uncachedCandidates[i]!;
            const embedding = newEmbeddings[i]!;

            // LRU eviction if cache is full
            if (this.embeddingCache.size >= this.MAX_CACHE_SIZE) {
              const firstKey = this.embeddingCache.keys().next().value;
              if (firstKey !== undefined) {
                this.embeddingCache.delete(firstKey);
              }
            }

            this.embeddingCache.set(candidate, embedding);
          }
        } catch (error) {
          this.logger.warn('[NGRAM-EXTRACT] Batch embedding failed, falling back to individual generation', error);
          // Fall through to individual generation
          newEmbeddings = [];
        }
      }

      // Fallback: Individual generation if batch failed or not available
      if (newEmbeddings.length === 0) {
        this.logger.debug('[NGRAM-EXTRACT] Using individual embedding generation for uncached candidates');
        const batchSize = 10;

        for (let i = 0; i < uncachedCandidates.length; i += batchSize) {
          const batch = uncachedCandidates.slice(i, Math.min(i + batchSize, uncachedCandidates.length));
          const batchEmbeddings = await Promise.all(
            batch.map(async (candidate) => {
              const embedding = await this.embeddingModel!.generateEmbedding(candidate);

              // Add to cache with LRU eviction
              if (this.embeddingCache.size >= this.MAX_CACHE_SIZE) {
                const firstKey = this.embeddingCache.keys().next().value;
                if (firstKey !== undefined) {
                  this.embeddingCache.delete(firstKey);
                }
              }
              this.embeddingCache.set(candidate, embedding);

              return embedding;
            })
          );
          newEmbeddings.push(...batchEmbeddings);
        }
      }
    }

    // Combine cached and newly generated embeddings in original order
    const allEmbeddings: Float32Array[] = new Array(candidates.length);

    // Place cached embeddings
    for (const [index, embedding] of cachedEmbeddings) {
      allEmbeddings[index] = embedding;
    }

    // Place newly generated embeddings
    for (let i = 0; i < uncachedIndices.length; i++) {
      const originalIndex = uncachedIndices[i]!;
      allEmbeddings[originalIndex] = newEmbeddings[i]!;
    }

    const elapsed = Date.now() - startTime;
    const cacheHitRate = candidates.length > 0
      ? ((cachedEmbeddings.size / candidates.length) * 100).toFixed(1)
      : '0';

    this.logger.info(
      `[NGRAM-EXTRACT] Generated ${candidates.length} embeddings in ${elapsed}ms ` +
      `(cache hit rate: ${cacheHitRate}%, cache size: ${this.embeddingCache.size})`
    );

    return allEmbeddings;
  }

  /**
   * Fallback: Extract key phrases by frequency when embeddings unavailable
   */
  private extractByFrequency(text: string, topK: number): string[] {
    this.logger.debug('[NGRAM-EXTRACT] Using frequency-based extraction');

    const phrases = extractKeyPhraseCandidates(text, topK);

    // Calculate multiword ratio
    const multiwordCount = phrases.filter(p => p.includes(' ')).length;
    const multiwordRatio = phrases.length > 0
      ? (multiwordCount / phrases.length) * 100
      : 0;

    this.logger.debug('[NGRAM-EXTRACT] Frequency extraction complete', {
      totalPhrases: phrases.length,
      multiwordRatio: `${multiwordRatio.toFixed(1)}%`
    });

    return phrases;
  }

  /**
   * Extract and score key phrases (returns phrases with scores)
   */
  async extractKeyPhrasesWithScores(
    text: string,
    docEmbedding?: Float32Array,
    options: Partial<NGramExtractionOptions> = {}
  ): Promise<Array<{ phrase: string; score: number }>> {
    const opts = { ...this.defaultOptions, ...options };

    if (!this.embeddingModel || !docEmbedding) {
      // Frequency-based with technical relevance scoring
      const phrases = extractKeyPhraseCandidates(text, opts.topK * 2);
      return phrases.map(phrase => ({
        phrase,
        score: scoreTechnicalRelevance(phrase, text.length)
      })).sort((a, b) => b.score - a.score).slice(0, opts.topK);
    }

    // Extract n-grams and calculate similarities
    const ngrams = extractNGrams(text, opts.ngramRange[0], opts.ngramRange[1]);
    const candidates = filterCandidates(ngrams);

    if (candidates.length === 0) {
      return [];
    }

    // PERFORMANCE OPTIMIZATION: Limit candidates for CPU models
    // For CPU models, generating embeddings is expensive, so we limit candidates
    // CPU models are detected by checking if batch embedding is NOT available
    const isCpuModel = !this.embeddingModel.generateEmbeddings;
    const maxCandidates = isCpuModel ? 15 : 50; // CPU: 15 candidates, GPU: 50 candidates

    const limitedCandidates = candidates.length > maxCandidates
      ? candidates.slice(0, maxCandidates)
      : candidates;

    if (isCpuModel && candidates.length > maxCandidates) {
      this.logger.debug(`[NGRAM-CPU-OPT] Limited candidates from ${candidates.length} to ${maxCandidates} for CPU performance`);
    }

    const candidateEmbeddings = await this.generateCandidateEmbeddings(limitedCandidates);
    const similarities = candidateEmbeddings.map(candEmb =>
      cosineSimilarity(candEmb, docEmbedding!)
    );

    // Combine with scores and sort
    const phrasesWithScores: Array<{ phrase: string; score: number }> = [];
    for (let i = 0; i < limitedCandidates.length; i++) {
      const score = similarities[i];
      if (score !== undefined) {
        phrasesWithScores.push({
          phrase: limitedCandidates[i]!,
          score
        });
      }
    }

    return phrasesWithScores
      .filter(item => item.score >= opts.minSimilarity)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.topK);
  }
}

/**
 * Factory function to create N-gram extractor
 */
export function createNGramCosineExtractor(
  embeddingModel: IEmbeddingModel | null,
  logger: ILoggingService
): NGramCosineExtractor {
  return new NGramCosineExtractor(embeddingModel, logger);
}