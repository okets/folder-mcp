/**
 * N-gram Extraction Utilities
 *
 * Provides functions to extract n-grams from text for semantic analysis.
 * Focuses on extracting meaningful multi-word phrases (2-4 words).
 */

/**
 * Common English stop words to filter out
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from',
  'has', 'had', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'the', 'this', 'these', 'those', 'have',
  'has', 'had', 'do', 'does', 'did', 'can', 'could', 'should', 'would',
  'may', 'might', 'must', 'shall', 'will', 'would', 'am', 'is', 'are',
  'was', 'were', 'being', 'been', 'be', 'very', 'also', 'just', 'only'
]);

/**
 * Token representing a word with its properties
 */
interface Token {
  word: string;  // Lowercase version for matching
  originalWord: string;  // Original casing preserved
  isStopWord: boolean;
  isNumber: boolean;
  isPunctuation: boolean;
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): Token[] {
  // Split on whitespace and punctuation, keeping some punctuation as separate tokens
  const originalWords = text
    .replace(/([.!?,;:])/g, ' $1 ')  // Add spaces around punctuation
    .split(/\s+/)
    .filter(w => w.length > 0);

  return originalWords.map(originalWord => {
    const word = originalWord.toLowerCase();
    return {
      word,
      originalWord,  // Preserve original casing
      isStopWord: STOP_WORDS.has(word),
      isNumber: /^\d+$/.test(word),
      isPunctuation: /^[.!?,;:]+$/.test(word)
    };
  });
}

/**
 * Extract n-grams from text
 *
 * @param text Input text
 * @param minN Minimum n-gram size (default: 2 for bigrams)
 * @param maxN Maximum n-gram size (default: 4)
 * @returns Array of n-gram strings
 */
export function extractNGrams(
  text: string,
  minN: number = 2,
  maxN: number = 4
): string[] {
  const tokens = tokenize(text);
  const ngrams = new Set<string>();
  const ngramsLower = new Set<string>(); // Track lowercase versions for O(1) deduplication

  // For each n from minN to maxN
  for (let n = minN; n <= maxN; n++) {
    // Slide window of size n over tokens
    for (let i = 0; i <= tokens.length - n; i++) {
      const ngramTokens = tokens.slice(i, i + n);

      // Skip if any token is punctuation
      if (ngramTokens.some(t => t.isPunctuation)) {
        continue;
      }

      // Skip if all tokens are stop words or numbers
      if (ngramTokens.every(t => t.isStopWord || t.isNumber)) {
        continue;
      }

      // Skip if starts or ends with stop word (for better phrase quality)
      if (n > 1) {
        if (ngramTokens[0]?.isStopWord || ngramTokens[n - 1]?.isStopWord) {
          continue;
        }
      }

      // Create n-gram using original casing for better technical term detection
      const ngram = ngramTokens.map(t => t.originalWord).join(' ');
      // But also store the lowercase version for deduplication
      const ngramLower = ngramTokens.map(t => t.word).join(' ');

      // O(1) lookup instead of O(n) - massive performance improvement
      if (!ngramsLower.has(ngramLower)) {
        ngrams.add(ngram);
        ngramsLower.add(ngramLower);
      }
    }
  }

  return Array.from(ngrams);
}

/**
 * Filter n-gram candidates based on quality criteria
 *
 * @param ngrams List of n-gram strings
 * @returns Filtered list of high-quality n-grams
 */
export function filterCandidates(ngrams: string[]): string[] {
  return ngrams.filter(ngram => {
    const words = ngram.split(' ');

    // Filter out very short n-grams
    if (ngram.length < 5) return false;

    // Filter out n-grams that are just numbers
    if (/^\d+(\s+\d+)*$/.test(ngram)) return false;

    // Prefer n-grams with 2-3 words for technical content
    if (words.length < 2 || words.length > 4) return false;

    // Filter out n-grams with too many short words
    const shortWords = words.filter(w => w.length <= 2).length;
    if (shortWords > words.length / 2) return false;

    return true;
  });
}

/**
 * Count n-gram frequency in text
 *
 * @param ngrams List of n-grams
 * @returns Map of n-gram to frequency count
 */
export function countNGramFrequency(ngrams: string[]): Map<string, number> {
  const frequency = new Map<string, number>();

  for (const ngram of ngrams) {
    frequency.set(ngram, (frequency.get(ngram) || 0) + 1);
  }

  return frequency;
}

/**
 * Extract candidate key phrases using n-grams
 * This is a simpler alternative when embeddings aren't available
 *
 * @param text Input text
 * @param topK Number of top phrases to return
 * @returns Array of key phrase strings
 */
export function extractKeyPhraseCandidates(
  text: string,
  topK: number = 20
): string[] {
  // Extract n-grams
  const ngrams = extractNGrams(text, 2, 4);

  // Filter for quality
  const candidates = filterCandidates(ngrams);

  // Count frequency
  const frequency = countNGramFrequency(candidates);

  // Sort by frequency and return top K
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([ngram]) => ngram);
}

/**
 * Check if an n-gram is likely a technical term
 *
 * @param ngram The n-gram to check
 * @returns True if likely technical
 */
export function isTechnicalTerm(ngram: string): boolean {
  const technicalPatterns = [
    /\b(api|sdk|cli|gui|cpu|gpu|ram|sql|css|html|xml|json|yaml)\b/i,
    /\b(server|client|database|cache|queue|stream|buffer|thread)\b/i,
    /\b(function|method|class|interface|module|package|library)\b/i,
    /\b(algorithm|model|neural|network|machine|learning|deep)\b/i,
    /\b(embed|vector|transform|encoder|decoder|attention)\b/i,
    /\b(docker|kubernetes|container|orchestrat|deploy|pipeline)\b/i,
    /\b(test|debug|profile|optimize|refactor|implement)\b/i
  ];

  return technicalPatterns.some(pattern => pattern.test(ngram));
}

/**
 * Score n-grams based on technical relevance
 * Higher scores indicate more likely technical key phrases
 *
 * @param ngram The n-gram to score
 * @param documentLength Total document length for normalization
 * @returns Score between 0 and 1
 */
export function scoreTechnicalRelevance(
  ngram: string,
  documentLength: number
): number {
  let score = 0;

  const words = ngram.split(' ');
  const wordCount = words.length;

  // Prefer multi-word phrases (2-3 words ideal)
  if (wordCount === 2) score += 0.3;
  else if (wordCount === 3) score += 0.25;
  else if (wordCount === 4) score += 0.15;

  // Boost technical terms
  if (isTechnicalTerm(ngram)) score += 0.3;

  // Boost phrases with capital letters (likely proper nouns, acronyms)
  // Now this will actually work since we preserve original casing
  const hasCapital = words.some(w => /[A-Z]/.test(w));
  if (hasCapital) score += 0.1;

  // Boost phrases with numbers (versions, metrics)
  const hasNumber = words.some(w => /\d/.test(w));
  if (hasNumber) score += 0.05;

  // Penalize very common patterns
  const commonPatterns = /^(this is|that is|it is|there are|there is)/i;
  if (commonPatterns.test(ngram)) score -= 0.2;

  // Normalize score to 0-1 range
  return Math.max(0, Math.min(1, score));
}