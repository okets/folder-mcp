/**
 * Key Phrase Selection Utilities
 * Phase 10 Sprint 1: Diverse key phrase selection for folder semantic previews
 */

import type { KeyPhrase } from '../rest/types.js';

/**
 * Aggregated phrase statistics
 */
interface PhraseStats {
  totalScore: number;
  count: number;
  maxScore: number;
}

/**
 * Scored phrase for selection
 */
interface ScoredPhrase {
  text: string;
  combinedScore: number;
  frequency: number;
  avgScore: number;
}

/**
 * Select diverse and representative key phrases from all documents in a folder
 *
 * Algorithm: "Diverse Top-K Selection"
 * 1. Aggregate all key phrases from all documents
 * 2. Score by combining: max relevance score × (1 + log(frequency) × 0.2)
 * 3. Diversify by skipping phrases with overlapping significant words
 * 4. Select 10-15 phrases that best represent the folder's content variety
 *
 * @param allDocumentKeyPhrases Array of key phrase arrays from each document
 * @param targetCount Target number of phrases to select (default: 15)
 * @returns Array of diverse, representative key phrases
 */
export function selectRepresentativeKeyPhrases(
  allDocumentKeyPhrases: KeyPhrase[][],
  targetCount: number = 15
): KeyPhrase[] {
  // Step 1: Aggregate all key phrases from all documents
  const phraseMap = new Map<string, PhraseStats>();

  for (const docPhrases of allDocumentKeyPhrases) {
    if (!docPhrases || !Array.isArray(docPhrases)) continue;

    for (const phrase of docPhrases) {
      if (!phrase || !phrase.text || typeof phrase.score !== 'number') continue;

      const normalizedText = phrase.text.toLowerCase().trim();
      if (!normalizedText) continue;

      const existing = phraseMap.get(normalizedText) || {
        totalScore: 0,
        count: 0,
        maxScore: 0
      };

      phraseMap.set(normalizedText, {
        totalScore: existing.totalScore + phrase.score,
        count: existing.count + 1,
        maxScore: Math.max(existing.maxScore, phrase.score)
      });
    }
  }

  // If no phrases found, return empty array
  if (phraseMap.size === 0) {
    return [];
  }

  // Step 2: Calculate combined score (frequency * relevance)
  const scoredPhrases: ScoredPhrase[] = Array.from(phraseMap.entries()).map(([text, stats]) => ({
    text,
    // Combine: max score (quality) + log(count) (frequency boost for common phrases)
    combinedScore: stats.maxScore * (1 + Math.log(stats.count) * 0.2),
    frequency: stats.count,
    avgScore: stats.totalScore / stats.count
  }));

  // Step 3: Select diverse phrases
  const selected: KeyPhrase[] = [];
  const usedTerms = new Set<string>();

  // Sort by combined score (highest first)
  scoredPhrases.sort((a, b) => b.combinedScore - a.combinedScore);

  for (const phrase of scoredPhrases) {
    // Skip very short phrases unless they're highly scored
    if (phrase.text.length < 3 && phrase.avgScore < 0.8) continue;

    // Split into significant words (ignore short words)
    const words = phrase.text
      .split(/\s+/)
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase());

    // Check for overlap with already selected phrases
    const hasSignificantOverlap = words.length > 0 &&
      words.filter(word => usedTerms.has(word)).length > words.length / 2;

    // Take high-scoring phrases, or lower ones if they're diverse enough
    if (selected.length < 5 || !hasSignificantOverlap) {
      selected.push({
        text: phrase.text,
        score: Math.round(phrase.avgScore * 1000) / 1000 // Round to 3 decimal places
      });

      // Mark significant words as used
      words.forEach(word => {
        if (word.length > 4) { // Only track longer words to avoid over-filtering
          usedTerms.add(word);
        }
      });
    }

    if (selected.length >= targetCount) break;
  }

  return selected;
}

/**
 * Calculate complexity indicator based on average readability score
 *
 * Flesch Reading Ease Score interpretation:
 * - 90-100: Very Easy
 * - 80-89: Easy
 * - 70-79: Fairly Easy
 * - 60-69: Standard
 * - 50-59: Fairly Difficult
 * - 30-49: Difficult (Technical)
 * - 0-29: Very Difficult (Highly Technical)
 *
 * @param avgReadability Average readability score
 * @returns Complexity indicator: 'simple', 'moderate', or 'technical'
 */
export function calculateComplexityIndicator(avgReadability: number | null | undefined): 'simple' | 'moderate' | 'technical' {
  if (avgReadability === null || avgReadability === undefined) {
    return 'moderate'; // Default when no data available
  }

  if (avgReadability >= 60) {
    return 'simple';
  } else if (avgReadability >= 40) {
    return 'moderate';
  } else {
    return 'technical';
  }
}


/**
 * Get relative path from folder root
 * @param filePath Full file path
 * @param folderPath Folder root path
 * @returns Relative path from folder root
 */
export function getRelativePath(filePath: string, folderPath: string): string {
  // Normalize paths to use forward slashes
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedFolderPath = folderPath.replace(/\\/g, '/');

  // Remove trailing slash from folder path
  const folderBase = normalizedFolderPath.endsWith('/')
    ? normalizedFolderPath.slice(0, -1)
    : normalizedFolderPath;

  // If file path starts with folder path, remove it
  if (normalizedFilePath.startsWith(folderBase)) {
    const relative = normalizedFilePath.slice(folderBase.length);
    // Remove leading slash if present
    return relative.startsWith('/') ? relative.slice(1) : relative;
  }

  // If not a child of folder, return the full path
  return filePath;
}