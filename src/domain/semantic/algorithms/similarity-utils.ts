/**
 * Similarity Utilities for Semantic Extraction
 *
 * Provides cosine similarity and other distance metrics for comparing embeddings.
 * Used by N-gram extractor to rank phrase relevance.
 */

/**
 * Calculate cosine similarity between two vectors
 *
 * @param a First vector
 * @param b Second vector
 * @returns Similarity score between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  // Avoid division by zero
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate Euclidean distance between two vectors
 *
 * @param a First vector
 * @param b Second vector
 * @returns Distance (0 = identical, larger = more different)
 */
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i]! - b[i]!;
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Apply Maximal Marginal Relevance (MMR) to select diverse items
 *
 * MMR balances relevance with diversity to avoid redundant selections.
 * Used to ensure key phrases cover different aspects of the document.
 *
 * @param scores Relevance scores for each candidate
 * @param embeddings Embeddings of candidates for diversity calculation
 * @param lambda Diversity factor (0 = max diversity, 1 = max relevance)
 * @param topK Number of items to select
 * @returns Indices of selected items
 */
export function maximalMarginalRelevance(
  scores: number[],
  embeddings: Float32Array[],
  lambda: number = 0.5,
  topK: number = 10
): number[] {
  if (scores.length === 0) return [];
  if (scores.length <= topK) return scores.map((_, i) => i);

  const selected: number[] = [];
  const remaining = new Set(scores.map((_, i) => i));

  // Select the highest scoring item first
  let maxIdx = 0;
  let maxScore = scores[0];
  for (let i = 1; i < scores.length; i++) {
    const score = scores[i];
    if (score !== undefined && (maxScore === undefined || score > maxScore)) {
      maxScore = score;
      maxIdx = i;
    }
  }
  selected.push(maxIdx);
  remaining.delete(maxIdx);

  // Iteratively select items that balance relevance and diversity
  while (selected.length < topK && remaining.size > 0) {
    let bestIdx = -1;
    let bestMmrScore = -Infinity;

    for (const candidateIdx of remaining) {
      const candidateRelevance = scores[candidateIdx];
      if (candidateRelevance === undefined) continue;

      // Calculate maximum similarity to already selected items
      let maxSimilarity = 0;
      for (const selectedIdx of selected) {
        const candEmb = embeddings[candidateIdx];
        const selEmb = embeddings[selectedIdx];
        if (!candEmb || !selEmb) continue;
        const similarity = cosineSimilarity(candEmb, selEmb);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      // MMR score balances relevance and diversity
      const mmrScore = lambda * candidateRelevance - (1 - lambda) * maxSimilarity;

      if (mmrScore > bestMmrScore) {
        bestMmrScore = mmrScore;
        bestIdx = candidateIdx;
      }
    }

    if (bestIdx !== -1) {
      selected.push(bestIdx);
      remaining.delete(bestIdx);
    } else {
      break;
    }
  }

  return selected;
}

/**
 * Normalize a vector to unit length
 *
 * @param vector Vector to normalize
 * @returns Normalized vector
 */
export function normalize(vector: Float32Array): Float32Array {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector;

  const normalized = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i]! / norm;
  }
  return normalized;
}