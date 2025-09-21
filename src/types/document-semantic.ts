/**
 * Sprint 0: Document-Level Semantic Types
 *
 * TypeScript interfaces for document-level semantic aggregation.
 * These types define the structure for semantic data stored in documents table.
 */

/**
 * Document-level semantic summary stored as JSON in semantic_summary field
 */
export interface DocumentSemanticSummary {
  // Aggregated data from all chunks
  aggregated_phrases: string[];       // Top 20-30 key phrases from all chunks

  // Document-level extracted data (for enhanced models)
  document_phrases?: string[];        // Document-wide key phrases

  // Final merged and ranked results
  top_phrases: string[];              // Final top 15-20 phrases

  // Statistical metrics
  metrics: {
    total_chunks: number;
    avg_readability: number;          // 0-100 scale (Flesch Reading Ease)
    phrase_richness: number;          // 0-1, ratio of multiword phrases
    semantic_coherence: number;       // 0-1, semantic similarity score
  };

  // Quality and confidence indicators
  quality: {
    extraction_confidence: number;    // 0-1, overall confidence
    coverage: number;                 // % of chunks with semantic data
    method: 'python_rich' | 'onnx_similarity' | 'aggregation_only';
    processing_time_ms: number;
  };
}

/**
 * Document metadata with semantic fields (matches database schema)
 */
export interface DocumentWithSemantics {
  // Existing document fields
  id: number;
  file_path: string;
  fingerprint: string;
  file_size: number;
  mime_type: string | null;
  last_modified: string;
  last_indexed: string;
  needs_reindex: number;

  // New semantic fields
  semantic_summary: string | null;           // JSON-encoded DocumentSemanticSummary
  primary_theme: string | null;              // Main document theme
  avg_readability_score: number | null;     // Average readability (0-100)
  phrase_richness_score: number | null;     // Multiword phrase ratio (0-1)

  // Extraction metadata
  extraction_method: ExtractionMethod | null;
  semantic_extracted_at: number | null;     // Unix timestamp

  // Error tracking (fail-loud approach)
  extraction_failed: boolean;
  extraction_error: string | null;
  extraction_attempts: number;
}

/**
 * Extraction method types
 */
export type ExtractionMethod =
  | 'python_rich'       // Full KeyBERT for Python models
  | 'onnx_similarity'   // Similarity-based clustering for ONNX models
  | 'aggregation_only'; // Simple aggregation fallback

/**
 * Document semantic aggregation options
 */
export interface DocumentAggregationOptions {
  // Aggregation parameters
  max_phrases: number;                // Maximum phrases to retain (default: 20)

  // Enhanced extraction for supporting models
  enable_document_extraction: boolean; // Use strategic sampling (default: true)
  sampling_strategy: 'smart' | 'full' | 'disabled';

  // Quality thresholds
  min_chunk_coverage: number;         // Minimum % chunks with semantics (default: 0.8)
  min_phrase_richness: number;        // Minimum multiword ratio (default: 0.6)

  // Performance limits
  max_processing_time_ms: number;     // Fail if extraction takes too long
}

/**
 * Document semantic aggregation result
 */
export interface DocumentAggregationResult {
  success: boolean;
  document_id: number;
  file_path: string;

  // Extracted semantic data
  semantic_summary: DocumentSemanticSummary;
  primary_theme: string;
  extraction_method: ExtractionMethod;

  // Performance metrics
  processing_time_ms: number;
  chunks_processed: number;
  extraction_quality: number;        // 0-1 overall quality score

  // Any warnings or issues
  warnings?: string[];
}

/**
 * Document semantic aggregation error
 */
export interface DocumentAggregationError {
  document_id: number;
  file_path: string;
  error_message: string;
  error_stage: 'aggregation' | 'enhancement' | 'storage';
  extraction_method: ExtractionMethod;
  attempts: number;
  timestamp: Date;
}

/**
 * Default aggregation options
 */
export const DEFAULT_AGGREGATION_OPTIONS: DocumentAggregationOptions = {
  max_phrases: 20,
  enable_document_extraction: true,
  sampling_strategy: 'smart',
  min_chunk_coverage: 0.8,
  min_phrase_richness: 0.6,
  max_processing_time_ms: 1000  // 1 second max for document-level processing
};