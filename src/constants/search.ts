/**
 * Search Constants
 * 
 * Single source of truth for all search-related design-time constants.
 * These values define the behavior of the semantic search system and should
 * be consistent across all interfaces (MCP, CLI, REST API).
 */

/**
 * Default semantic similarity threshold for vector search results.
 * 
 * This value represents the minimum cosine similarity score (0.0-1.0) required
 * for a document chunk to be considered relevant to a search query.
 * 
 * - 0.0: Include all results (no filtering)
 * - 0.3: Moderate relevance threshold (recommended for semantic search)
 * - 0.7: High relevance threshold (very strict matching)
 * - 1.0: Exact match only (rarely used)
 * 
 * @constant {number} SEMANTIC_THRESHOLD - Default: 0.3 for balanced relevance
 */
export const SEMANTIC_THRESHOLD = 0.3;

/**
 * Default maximum number of search results to return.
 * Balances comprehensiveness with response time and readability.
 * 
 * @constant {number} DEFAULT_MAX_RESULTS - Default: 10 results
 */
export const DEFAULT_MAX_RESULTS = 10;

/**
 * Maximum allowed number of search results that can be requested.
 * Prevents excessive resource usage and overly large responses.
 * 
 * @constant {number} MAX_RESULTS_LIMIT - Maximum: 100 results
 */
export const MAX_RESULTS_LIMIT = 100;

/**
 * Maximum allowed length for search query strings.
 * Prevents processing of excessively long queries that could impact performance.
 * 
 * @constant {number} QUERY_MAX_LENGTH - Maximum: 1000 characters
 */
export const QUERY_MAX_LENGTH = 1000;

/**
 * Minimum allowed semantic similarity threshold.
 * Lower bound for cosine similarity filtering (inclusive).
 * 
 * @constant {number} MIN_SEMANTIC_THRESHOLD - Minimum: 0.0 (no filtering)
 */
export const MIN_SEMANTIC_THRESHOLD = 0.0;

/**
 * Maximum allowed semantic similarity threshold.
 * Upper bound for cosine similarity filtering (inclusive).
 * 
 * @constant {number} MAX_SEMANTIC_THRESHOLD - Maximum: 1.0 (exact match)
 */
export const MAX_SEMANTIC_THRESHOLD = 1.0;

/**
 * All search-related constants grouped together for easy access.
 * Use this when you need multiple constants in the same module.
 */
export const SEARCH_DEFAULTS = {
  SEMANTIC_THRESHOLD,
  DEFAULT_MAX_RESULTS,
  MAX_RESULTS_LIMIT,
  QUERY_MAX_LENGTH,
  MIN_SEMANTIC_THRESHOLD,
  MAX_SEMANTIC_THRESHOLD
} as const;

/**
 * Search limits object for easy bounds validation.
 * Use this for validating search parameters against defined limits.
 */
export const LIMITS = {
  MIN_SEMANTIC_THRESHOLD,
  MAX_SEMANTIC_THRESHOLD,
  MAX_RESULTS_LIMIT,
  QUERY_MAX_LENGTH
} as const;

/**
 * Shared validation helpers to ensure consistent bounds enforcement across all layers.
 * Use these instead of inline Math.min/Math.max to maintain consistency.
 */

/**
 * Clamp threshold to valid semantic similarity range [0.0, 1.0]
 * Falls back to default threshold for invalid inputs
 * 
 * @param t - Threshold value to clamp
 * @returns Clamped threshold within valid range
 */
export const clampThreshold = (t: number): number =>
  Math.min(MAX_SEMANTIC_THRESHOLD, Math.max(MIN_SEMANTIC_THRESHOLD, Number.isFinite(t) ? t : SEMANTIC_THRESHOLD));

/**
 * Clamp limit to valid results range [1, MAX_RESULTS_LIMIT]
 * Floors the input and falls back to default for invalid inputs
 * 
 * @param n - Limit value to clamp
 * @returns Clamped limit within valid range
 */
export const clampLimit = (n: number): number => {
  const v = Math.floor(Number.isFinite(n) ? n : DEFAULT_MAX_RESULTS);
  return Math.min(MAX_RESULTS_LIMIT, Math.max(1, v));
};