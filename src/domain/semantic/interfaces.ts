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
  } | undefined;
}

/**
 * Main interface for semantic extraction services
 */
export interface ISemanticExtractionService {
  /**
   * Extract semantic data from text with optional embeddings and enhanced options (Sprint 13)
   */
  extractFromText(text: string, embeddings?: Float32Array, options?: SemanticExtractionOptions): Promise<SemanticData>;

  /**
   * Extract semantic data from multiple texts (batch processing)
   * Optimized for performance when processing multiple chunks
   */
  extractFromTextBatch(texts: string[], embeddings?: Float32Array[], options?: SemanticExtractionOptions): Promise<SemanticData[]>;

  /**
   * Extract key phrases using KeyBERT or fallback methods with enhanced options (Sprint 13)
   */
  extractKeyPhrases(text: string, embeddings?: Float32Array, options?: SemanticExtractionOptions): Promise<SemanticScore[]>;



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
   * Enable quality metrics calculation
   */
  calculateMetrics?: boolean;

  /**
   * Format-specific keyword candidates extracted during parsing (Sprint 13)
   */
  structuredCandidates?: {
    /** Keywords from file metadata (PDF keywords, Word document properties) */
    metadata?: string[];
    /** Document headers (H1-H6, #, ##, ###) */
    headers?: string[];
    /** Named entities (sheet names, slide titles, table names) */
    entities?: string[];
    /** Emphasized text (bold, italic, highlighted) */
    emphasized?: string[];
    /** Figure captions, table captions, footnotes */
    captions?: string[];
  };

  /**
   * Content zones with importance weights for keyword scoring (Sprint 13)
   */
  contentZones?: Array<{
    /** Text content of the zone */
    text: string;
    /** Type of content zone */
    type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
    /** Importance weight for keyword extraction (0-1, higher = more important) */
    weight: number;
  }>;

  /**
   * File type for format-specific text preprocessing (Sprint 13)
   */
  fileType?: string;
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