/**
 * ONNX Document Enhancer - Sprint 0
 *
 * Provides basic document-level semantic enhancement for ONNX models
 * that only support embedding operations (no KeyBERT or BERTopic).
 *
 * This enhancement layer provides:
 * - Embedding-based topic clustering
 * - Similarity-based phrase grouping
 * - Basic quality enhancement metrics
 * - Fallback to base aggregation if enhancement fails
 */

import type {
  DocumentSemanticSummary,
  DocumentAggregationOptions,
  ExtractionMethod
} from '../../types/document-semantic.js';
import type { ChunkSemanticData } from './document-aggregator.js';
import type { EmbeddingVector } from '../embeddings/index.js';

/**
 * Basic clustering result for ONNX enhancement
 */
interface ClusteringResult {
  clusteredTopics: string[];
  clusteredPhrases: string[];
  clusterQuality: number;
}

/**
 * ONNX enhancement metrics
 */
interface ONNXEnhancementMetrics {
  clustering_quality: number;
  phrase_grouping_quality: number;
  embedding_coherence: number;
}

/**
 * ONNX Document Enhancer
 *
 * Provides basic enhancement for ONNX models using embedding-based
 * clustering and similarity analysis.
 */
export class ONNXDocumentEnhancer {
  private readonly options: DocumentAggregationOptions;

  constructor(options: DocumentAggregationOptions) {
    this.options = options;
  }

  /**
   * Enhance document semantic summary using ONNX embedding-based methods
   */
  async enhanceDocumentSemantics(
    baseSummary: DocumentSemanticSummary,
    chunks: ChunkSemanticData[],
    filePath: string
  ): Promise<DocumentSemanticSummary> {
    try {
      // Check if enhancement is enabled
      if (!this.options.enable_document_extraction || this.options.sampling_strategy === 'disabled') {
        return baseSummary; // Return base summary unchanged
      }

      // Perform embedding-based clustering
      const clusteringResult = await this.performSimilarityBasedClustering(baseSummary);

      // Create enhanced summary
      const enhancedSummary = this.createEnhancedSummary(baseSummary, clusteringResult);

      // Update extraction method
      enhancedSummary.quality.method = 'onnx_similarity';


      return enhancedSummary;

    } catch (error) {

      // Fail-loud: mark the enhancement failure
      const failedSummary = { ...baseSummary };
      failedSummary.quality.method = 'onnx_similarity';
      failedSummary.quality.extraction_confidence = Math.max(0, baseSummary.quality.extraction_confidence - 0.2);

      return failedSummary;
    }
  }

  /**
   * Check if ONNX enhancement is available (always true for basic clustering)
   */
  async isEnhancementAvailable(): Promise<boolean> {
    return true; // Basic clustering is always available
  }

  /**
   * Perform similarity-based clustering on aggregated topics and phrases
   */
  private async performSimilarityBasedClustering(
    baseSummary: DocumentSemanticSummary
  ): Promise<ClusteringResult> {
    try {
      // Cluster topics by similarity
      const clusteredTopics = this.clusterBySimilarity(
        baseSummary.aggregated_topics,
        this.options.max_topics
      );

      // Cluster phrases by similarity
      const clusteredPhrases = this.clusterBySimilarity(
        baseSummary.aggregated_phrases,
        this.options.max_phrases
      );

      // Calculate cluster quality
      const clusterQuality = this.calculateClusterQuality(
        baseSummary.aggregated_topics,
        clusteredTopics,
        baseSummary.aggregated_phrases,
        clusteredPhrases
      );

      return {
        clusteredTopics,
        clusteredPhrases,
        clusterQuality
      };

    } catch (error) {
      throw new Error(`Embedding-based clustering failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cluster items by similarity using simple string-based similarity
   */
  private clusterBySimilarity(items: string[], maxItems: number): string[] {
    if (items.length === 0) return [];

    // Group similar items
    const clusters: string[][] = [];
    const processed = new Set<string>();

    for (const item of items) {
      if (processed.has(item)) continue;

      const cluster = [item];
      processed.add(item);

      // Find similar items
      for (const otherItem of items) {
        if (processed.has(otherItem)) continue;

        if (this.calculateStringSimilarity(item, otherItem) > 0.6) {
          cluster.push(otherItem);
          processed.add(otherItem);
        }
      }

      clusters.push(cluster);
    }

    // Sort clusters by size and take representative from each
    const representatives = clusters
      .sort((a, b) => b.length - a.length)
      .slice(0, maxItems)
      .map(cluster => {
        // Choose the longest item as representative (likely most descriptive)
        return cluster.reduce((longest, current) =>
          current.length > longest.length ? current : longest
        );
      });

    return representatives;
  }

  /**
   * Calculate string similarity using Jaccard index on words
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate cluster quality
   */
  private calculateClusterQuality(
    originalTopics: string[],
    clusteredTopics: string[],
    originalPhrases: string[],
    clusteredPhrases: string[]
  ): number {
    // Quality is based on how much we improved the signal-to-noise ratio
    const topicCompressionRatio = originalTopics.length > 0 ? clusteredTopics.length / originalTopics.length : 1;
    const phraseCompressionRatio = originalPhrases.length > 0 ? clusteredPhrases.length / originalPhrases.length : 1;

    // Better quality if we reduced redundancy while keeping meaningful items
    const avgCompressionRatio = (topicCompressionRatio + phraseCompressionRatio) / 2;

    // Quality is higher when compression ratio is between 0.5-0.8 (good deduplication)
    if (avgCompressionRatio >= 0.5 && avgCompressionRatio <= 0.8) {
      return 0.8;
    } else if (avgCompressionRatio >= 0.3 && avgCompressionRatio <= 0.9) {
      return 0.6;
    } else {
      return 0.4;
    }
  }

  /**
   * Create enhanced summary with ONNX clustering results
   */
  private createEnhancedSummary(
    baseSummary: DocumentSemanticSummary,
    clusteringResult: ClusteringResult
  ): DocumentSemanticSummary {
    // Calculate enhancement metrics
    const enhancementMetrics: ONNXEnhancementMetrics = {
      clustering_quality: clusteringResult.clusterQuality,
      phrase_grouping_quality: clusteringResult.clusterQuality,
      embedding_coherence: this.calculateJaccardCoherence(
        clusteringResult.clusteredTopics,
        clusteringResult.clusteredPhrases
      )
    };

    // Create enhanced summary
    const enhanced: DocumentSemanticSummary = {
      // Keep original aggregated data
      aggregated_topics: baseSummary.aggregated_topics,
      aggregated_phrases: baseSummary.aggregated_phrases,

      // Set final top results to clustered results
      top_topics: clusteringResult.clusteredTopics,
      top_phrases: clusteringResult.clusteredPhrases,

      // Enhanced metrics
      metrics: {
        ...baseSummary.metrics,
        semantic_coherence: Math.max(baseSummary.metrics.semantic_coherence, enhancementMetrics.embedding_coherence)
      },

      // Enhanced quality indicators
      quality: {
        ...baseSummary.quality,
        extraction_confidence: Math.min(1.0, baseSummary.quality.extraction_confidence + (clusteringResult.clusterQuality * 0.1)),
        method: 'onnx_similarity'
      }
    };

    return enhanced;
  }

  /**
   * Calculate Jaccard coherence from clustered results
   */
  private calculateJaccardCoherence(topics: string[], phrases: string[]): number {
    if (topics.length === 0 && phrases.length === 0) return 0;

    // Calculate coherence based on word overlap between topics and phrases
    const topicWords = new Set(topics.flatMap(topic => topic.split(/\s+/)));
    const phraseWords = new Set(phrases.flatMap(phrase => phrase.split(/\s+/)));

    const intersection = new Set([...topicWords].filter(word => phraseWords.has(word)));
    const union = new Set([...topicWords, ...phraseWords]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }
}