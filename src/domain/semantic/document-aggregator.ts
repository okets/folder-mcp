/**
 * Document Semantic Aggregator - Sprint 0
 *
 * Aggregates chunk-level semantic data into document-level summaries.
 * This is the base aggregation engine that works for ALL embedding models.
 *
 * Key Principles:
 * - Model-agnostic base functionality
 * - Fail-loud error handling (no silent fallbacks)
 * - Quality validation with configurable thresholds
 * - Performance monitoring and timeouts
 */

import type {
  DocumentSemanticSummary,
  DocumentAggregationOptions,
  DocumentAggregationResult,
  DocumentAggregationError,
  ExtractionMethod
} from '../../types/document-semantic.js';
import { DEFAULT_AGGREGATION_OPTIONS } from '../../types/document-semantic.js';

/**
 * Interface for chunk data with semantic metadata
 */
export interface ChunkSemanticData {
  id: number;
  content: string;
  semanticMetadata: {
    topics?: string[];
    keyPhrases?: string[];
    readabilityScore?: number | null;
    sentenceCount?: number;
    wordCount?: number;
    avgSentenceLength?: number;
  };
}

/**
 * Aggregated semantic statistics for quality validation
 */
interface AggregationStats {
  totalChunks: number;
  chunksWithTopics: number;
  chunksWithPhrases: number;
  chunksWithReadability: number;
  topicCoverage: number;        // % chunks with topics
  phraseCoverage: number;       // % chunks with phrases
  readabilityCoverage: number;  // % chunks with readability
  multiwordPhraseRatio: number; // % phrases that are multiword
}

/**
 * Document Semantic Aggregator
 *
 * Implements base aggregation logic that works across all embedding models.
 * Model-specific enhancements are handled by separate enhancement services.
 */
export class DocumentSemanticAggregator {
  private readonly options: DocumentAggregationOptions;

  constructor(options: Partial<DocumentAggregationOptions> = {}) {
    this.options = { ...DEFAULT_AGGREGATION_OPTIONS, ...options };
  }

  /**
   * Aggregate chunk-level semantics into document-level summary
   */
  async aggregateDocument(params: {
    documentId: number;
    filePath: string;
    chunks: ChunkSemanticData[];
  }): Promise<DocumentAggregationResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (params.chunks.length === 0) {
        throw new Error('No chunks provided for aggregation');
      }

      // Calculate aggregation statistics
      const stats = this.calculateAggregationStats(params.chunks);

      // Validate quality thresholds
      this.validateQualityThresholds(stats);

      // Perform base aggregation
      const semanticSummary = await this.performBaseAggregation(params.chunks, stats);

      // Determine extraction method (base aggregation only for now)
      const extractionMethod: ExtractionMethod = 'aggregation_only';

      // Extract primary theme
      const primaryTheme = this.extractPrimaryTheme(semanticSummary.top_topics);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Validate processing time threshold
      if (processingTime > this.options.max_processing_time_ms) {
        throw new Error(`Aggregation exceeded time limit: ${processingTime}ms > ${this.options.max_processing_time_ms}ms`);
      }

      // Calculate overall quality score
      const extractionQuality = this.calculateQualityScore(semanticSummary, stats);

      // Build successful result
      const result: DocumentAggregationResult = {
        success: true,
        document_id: params.documentId,
        file_path: params.filePath,
        semantic_summary: semanticSummary,
        primary_theme: primaryTheme,
        extraction_method: extractionMethod,
        processing_time_ms: processingTime,
        chunks_processed: params.chunks.length,
        extraction_quality: extractionQuality,
        warnings: this.generateWarnings(stats)
      };

      return result;

    } catch (error) {
      // Fail-loud: return detailed error information
      const processingTime = Date.now() - startTime;

      const errorResult: DocumentAggregationResult = {
        success: false,
        document_id: params.documentId,
        file_path: params.filePath,
        semantic_summary: this.createEmptySemanticSummary(),
        primary_theme: 'ERROR',
        extraction_method: 'aggregation_only',
        processing_time_ms: processingTime,
        chunks_processed: params.chunks.length,
        extraction_quality: 0,
        warnings: [`Aggregation failed: ${error instanceof Error ? error.message : String(error)}`]
      };

      return errorResult;
    }
  }

  /**
   * Calculate aggregation statistics for quality validation
   */
  private calculateAggregationStats(chunks: ChunkSemanticData[]): AggregationStats {
    let chunksWithTopics = 0;
    let chunksWithPhrases = 0;
    let chunksWithReadability = 0;
    let totalPhrases = 0;
    let multiwordPhrases = 0;

    for (const chunk of chunks) {
      const semantic = chunk.semanticMetadata;

      if (semantic.topics && semantic.topics.length > 0) {
        chunksWithTopics++;
      }

      if (semantic.keyPhrases && semantic.keyPhrases.length > 0) {
        chunksWithPhrases++;

        // Count multiword phrases
        for (const phrase of semantic.keyPhrases) {
          totalPhrases++;
          if (phrase.trim().split(/\s+/).length > 1) {
            multiwordPhrases++;
          }
        }
      }

      if (typeof semantic.readabilityScore === 'number') {
        chunksWithReadability++;
      }
    }

    const totalChunks = chunks.length;
    const multiwordPhraseRatio = totalPhrases > 0 ? multiwordPhrases / totalPhrases : 0;

    return {
      totalChunks,
      chunksWithTopics,
      chunksWithPhrases,
      chunksWithReadability,
      topicCoverage: chunksWithTopics / totalChunks,
      phraseCoverage: chunksWithPhrases / totalChunks,
      readabilityCoverage: chunksWithReadability / totalChunks,
      multiwordPhraseRatio
    };
  }

  /**
   * Validate quality thresholds - fail loud if not met
   */
  private validateQualityThresholds(stats: AggregationStats): void {
    // Check minimum chunk coverage
    if (stats.topicCoverage < this.options.min_chunk_coverage) {
      throw new Error(
        `Insufficient topic coverage: ${(stats.topicCoverage * 100).toFixed(1)}% < ${(this.options.min_chunk_coverage * 100)}%`
      );
    }

    // Check minimum phrase richness
    if (stats.multiwordPhraseRatio < this.options.min_phrase_richness) {
      throw new Error(
        `Insufficient phrase richness: ${(stats.multiwordPhraseRatio * 100).toFixed(1)}% < ${(this.options.min_phrase_richness * 100)}%`
      );
    }
  }

  /**
   * Perform base aggregation of topics and phrases
   */
  private async performBaseAggregation(
    chunks: ChunkSemanticData[],
    stats: AggregationStats
  ): Promise<DocumentSemanticSummary> {
    // Aggregate topics with frequency counting
    const topicFrequency = new Map<string, number>();
    const phraseFrequency = new Map<string, number>();

    let totalReadability = 0;
    let readabilityCount = 0;

    for (const chunk of chunks) {
      const semantic = chunk.semanticMetadata;

      // Aggregate topics
      if (semantic.topics) {
        for (const topic of semantic.topics) {
          const cleanTopic = topic.trim().toLowerCase();
          if (cleanTopic.length > 0) {
            topicFrequency.set(cleanTopic, (topicFrequency.get(cleanTopic) || 0) + 1);
          }
        }
      }

      // Aggregate phrases
      if (semantic.keyPhrases) {
        for (const phrase of semantic.keyPhrases) {
          const cleanPhrase = phrase.trim().toLowerCase();
          if (cleanPhrase.length > 0) {
            phraseFrequency.set(cleanPhrase, (phraseFrequency.get(cleanPhrase) || 0) + 1);
          }
        }
      }

      // Aggregate readability
      if (typeof semantic.readabilityScore === 'number') {
        totalReadability += semantic.readabilityScore;
        readabilityCount++;
      }
    }

    // Sort and limit topics
    const sortedTopics = Array.from(topicFrequency.entries())
      .sort((a, b) => b[1] - a[1])  // Sort by frequency descending
      .slice(0, this.options.max_topics)
      .map(([topic]) => topic);

    // Sort and limit phrases
    const sortedPhrases = Array.from(phraseFrequency.entries())
      .sort((a, b) => b[1] - a[1])  // Sort by frequency descending
      .slice(0, this.options.max_phrases)
      .map(([phrase]) => phrase);

    // Calculate metrics
    const avgReadability = readabilityCount > 0 ? totalReadability / readabilityCount : 0;
    const topicDiversity = this.calculateTopicDiversity(Array.from(topicFrequency.values()));
    const phraseRichness = stats.multiwordPhraseRatio;
    const semanticCoherence = this.calculateSemanticCoherence(sortedTopics);

    // Build semantic summary
    const semanticSummary: DocumentSemanticSummary = {
      // Aggregated data
      aggregated_topics: sortedTopics,
      aggregated_phrases: sortedPhrases,

      // Final merged results (same as aggregated for base implementation)
      top_topics: sortedTopics,
      top_phrases: sortedPhrases,

      // Statistical metrics
      metrics: {
        total_chunks: stats.totalChunks,
        avg_readability: avgReadability,
        topic_diversity: topicDiversity,
        phrase_richness: phraseRichness,
        semantic_coherence: semanticCoherence
      },

      // Quality indicators
      quality: {
        extraction_confidence: this.calculateExtractionConfidence(stats),
        coverage: Math.min(stats.topicCoverage, stats.phraseCoverage),
        method: 'aggregation_only',
        processing_time_ms: 0  // Will be set by caller
      }
    };

    return semanticSummary;
  }

  /**
   * Calculate topic diversity using Shannon entropy
   */
  private calculateTopicDiversity(frequencies: number[]): number {
    if (frequencies.length === 0) return 0;

    const total = frequencies.reduce((sum, freq) => sum + freq, 0);
    if (total === 0) return 0;

    let entropy = 0;
    for (const freq of frequencies) {
      if (freq > 0) {
        const probability = freq / total;
        entropy -= probability * Math.log2(probability);
      }
    }

    // Normalize to 0-1 range
    const maxEntropy = Math.log2(frequencies.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Calculate semantic coherence based on topic overlap
   */
  private calculateSemanticCoherence(topics: string[]): number {
    if (topics.length < 2) return 1.0;

    // Simple coherence metric: ratio of unique words to total words
    const allWords = topics.flatMap(topic => topic.split(/\s+/));
    const uniqueWords = new Set(allWords);

    return allWords.length > 0 ? uniqueWords.size / allWords.length : 0;
  }

  /**
   * Calculate extraction confidence based on coverage
   */
  private calculateExtractionConfidence(stats: AggregationStats): number {
    // Weighted average of different coverage metrics
    const weights = {
      topic: 0.4,
      phrase: 0.4,
      readability: 0.2
    };

    return (
      stats.topicCoverage * weights.topic +
      stats.phraseCoverage * weights.phrase +
      stats.readabilityCoverage * weights.readability
    );
  }

  /**
   * Extract primary theme from top topics
   */
  private extractPrimaryTheme(topics: string[]): string {
    if (topics.length === 0) return 'No topics identified';

    // Return the most frequent topic
    return topics[0] || 'Unknown theme';
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(summary: DocumentSemanticSummary, stats: AggregationStats): number {
    const factors = {
      coverage: summary.quality.coverage,
      diversity: summary.metrics.topic_diversity,
      richness: summary.metrics.phrase_richness,
      confidence: summary.quality.extraction_confidence
    };

    // Weighted average
    return (
      factors.coverage * 0.3 +
      factors.diversity * 0.2 +
      factors.richness * 0.3 +
      factors.confidence * 0.2
    );
  }

  /**
   * Generate warnings for quality issues
   */
  private generateWarnings(stats: AggregationStats): string[] {
    const warnings: string[] = [];

    if (stats.topicCoverage < 0.9) {
      warnings.push(`Low topic coverage: ${(stats.topicCoverage * 100).toFixed(1)}%`);
    }

    if (stats.multiwordPhraseRatio < 0.7) {
      warnings.push(`Low phrase richness: ${(stats.multiwordPhraseRatio * 100).toFixed(1)}%`);
    }

    if (stats.readabilityCoverage < 0.8) {
      warnings.push(`Low readability coverage: ${(stats.readabilityCoverage * 100).toFixed(1)}%`);
    }

    return warnings;
  }

  /**
   * Create empty semantic summary for error cases
   */
  private createEmptySemanticSummary(): DocumentSemanticSummary {
    return {
      aggregated_topics: [],
      aggregated_phrases: [],
      top_topics: [],
      top_phrases: [],
      metrics: {
        total_chunks: 0,
        avg_readability: 0,
        topic_diversity: 0,
        phrase_richness: 0,
        semantic_coherence: 0
      },
      quality: {
        extraction_confidence: 0,
        coverage: 0,
        method: 'aggregation_only',
        processing_time_ms: 0
      }
    };
  }
}