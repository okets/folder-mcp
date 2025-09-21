/**
 * Semantic Extraction Domain Interfaces
 *
 * Defines contracts for semantic data extraction services.
 * This replaces the broken ContentProcessingService with research-validated approaches.
 */

import { SemanticScore } from '../../types/index.js';

/**
 * Semantic data extracted from text
 */
export interface SemanticData {
  /**
   * Key phrases extracted from the text with semantic scores
   * Should be primarily multiword phrases (2-4 words)
   */
  keyPhrases: SemanticScore[];

  /**
   * Topics identified in the text with semantic scores
   * Domain-specific categories, not generic labels
   */
  topics: SemanticScore[];

  /**
   * Readability score (0-100)
   * Using proper formulas, not broken syllable counting
   */
  readabilityScore: number;

  /**
   * Method used for extraction
   */
  extractionMethod: 'keybert' | 'ngram' | 'legacy';

  /**
   * Processing time in milliseconds
   */
  processingTimeMs: number;

  /**
   * Extraction quality metrics
   */
  qualityMetrics?: {
    multiwordRatio: number;  // Percentage of multiword phrases
    averageWordsPerPhrase: number;
    topicSpecificity: number; // 0-1, higher is more specific
  } | undefined;
}

/**
 * Main interface for semantic extraction services
 */
export interface ISemanticExtractionService {
  /**
   * Extract semantic data from text with optional embeddings
   */
  extractFromText(text: string, embeddings?: Float32Array): Promise<SemanticData>;

  /**
   * Extract semantic data from multiple texts (batch processing)
   * Optimized for performance when processing multiple chunks
   */
  extractFromTextBatch(texts: string[], embeddings?: Float32Array[]): Promise<SemanticData[]>;

  /**
   * Extract key phrases using KeyBERT or fallback methods
   */
  extractKeyPhrases(text: string, embeddings?: Float32Array): Promise<SemanticScore[]>;

  /**
   * Extract topics from text
   */
  extractTopics(text: string, embeddings?: Float32Array): Promise<SemanticScore[]>;


  /**
   * Validate extraction quality
   */
  validateExtraction(data: SemanticData): boolean;
}

/**
 * Options for semantic extraction
 */
export interface SemanticExtractionOptions {
  /**
   * Maximum number of key phrases to extract
   */
  maxKeyPhrases?: number;

  /**
   * N-gram range for phrase extraction [min, max]
   */
  ngramRange?: [number, number];

  /**
   * Use MMR (Maximal Marginal Relevance) for diversity
   */
  useMmr?: boolean;

  /**
   * Diversity factor (0-1) for MMR
   */
  diversity?: number;

  /**
   * Maximum number of topics
   */
  maxTopics?: number;

  /**
   * Enable quality metrics calculation
   */
  calculateMetrics?: boolean;
}

/**
 * Interface for Python semantic extraction bridge
 */
export interface IPythonSemanticService {
  /**
   * Extract key phrases using KeyBERT
   */
  extractKeyPhrasesKeyBERT(
    text: string,
    options?: SemanticExtractionOptions
  ): Promise<SemanticScore[]>;

  /**
   * Extract key phrases using KeyBERT for multiple texts (batch processing)
   * Optimized for performance when processing multiple chunks
   */
  extractKeyPhrasesKeyBERTBatch(
    texts: string[],
    options?: SemanticExtractionOptions
  ): Promise<SemanticScore[][]>;

  /**
   * Check if KeyBERT is available
   */
  isKeyBERTAvailable(): Promise<boolean>;
}