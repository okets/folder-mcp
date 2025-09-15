/**
 * Semantic Extraction Domain Interfaces
 *
 * Defines contracts for semantic data extraction services.
 * This replaces the broken ContentProcessingService with research-validated approaches.
 */

/**
 * Semantic data extracted from text
 */
export interface SemanticData {
  /**
   * Key phrases extracted from the text
   * Should be primarily multiword phrases (2-4 words)
   */
  keyPhrases: string[];

  /**
   * Topics identified in the text
   * Domain-specific categories, not generic labels
   */
  topics: string[];

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
   * Extract key phrases using KeyBERT or fallback methods
   */
  extractKeyPhrases(text: string, embeddings?: Float32Array): Promise<string[]>;

  /**
   * Extract topics from text
   */
  extractTopics(text: string, embeddings?: Float32Array): Promise<string[]>;

  /**
   * Calculate readability score
   */
  calculateReadability(text: string): number;

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
  ): Promise<string[]>;

  /**
   * Check if KeyBERT is available
   */
  isKeyBERTAvailable(): Promise<boolean>;
}