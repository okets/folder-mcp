/**
 * Coleman-Liau Readability Calculator
 *
 * Implements Coleman-Liau Index formula for readability scoring.
 * Optimized for technical documentation with no syllable counting required.
 */

/**
 * Interface for readability calculation
 */
export interface IReadabilityCalculator {
  /**
   * Calculate readability score for given text
   * @param text Text content to analyze
   * @returns Readability score (40-60 range for technical documents)
   */
  calculate(text: string): number;
}

/**
 * Detailed readability metrics interface
 */
export interface ReadabilityMetrics {
  sentences: number;
  words: number;
  letters: number;
  avgLettersPerWord: number;
  avgWordsPerSentence: number;
  L?: number; // Letters per 100 words
  S?: number; // Sentences per 100 words
  rawScore: number;
  finalScore: number;
}

/**
 * Coleman-Liau Readability Calculator
 *
 * Uses character counts instead of syllable estimation for more reliable
 * and faster readability calculation. Calibrated for technical documentation.
 */
export class ReadabilityCalculator implements IReadabilityCalculator {
  /**
   * Calculate readability using Coleman-Liau Index
   * No syllable counting required - uses character counts
   * Calibrated for technical documentation (40-60 range)
   */
  calculate(text: string): number {
    return this.getDetailedMetrics(text).finalScore;
  }

  /**
   * Get default/empty readability metrics
   */
  private getDefaultMetrics(sentences = 0, words = 0, letters = 0): ReadabilityMetrics {
    return {
      sentences,
      words,
      letters,
      avgLettersPerWord: 0,
      avgWordsPerSentence: 0,
      rawScore: 0,
      finalScore: 50
    };
  }

  /**
   * Count sentences in text
   * Counts sentence endings (.!?) followed by space, newline, or end of text
   */
  private countSentences(text: string): number {
    // Match sentence endings followed by whitespace or end of string
    const matches = text.match(/[.!?]+(\s|$)/g) || [];
    return Math.max(1, matches.length);
  }

  /**
   * Count words in text
   * Uses word boundary matching to handle punctuation correctly
   */
  private countWords(text: string): number {
    const words = text.match(/\b\w+\b/g) || [];
    return words.length;
  }

  /**
   * Count letters in text
   * Only counts alphabetic characters, ignoring numbers and punctuation
   */
  private countLetters(text: string): number {
    const letters = text.match(/[a-zA-Z]/g) || [];
    return letters.length;
  }

  /**
   * Get detailed metrics for debugging and validation
   * Useful for understanding calculation components
   */
  getDetailedMetrics(text: string): ReadabilityMetrics {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return this.getDefaultMetrics();
    }

    const sentences = this.countSentences(text);
    const words = this.countWords(text);
    const letters = this.countLetters(text);

    if (words === 0 || sentences === 0) {
      return this.getDefaultMetrics(sentences, words, letters);
    }

    const L = (letters / words) * 100;
    const S = (sentences / words) * 100;
    const rawScore = 0.0588 * L - 0.296 * S - 15.8;
    const finalScore = Math.max(40, Math.min(60, Math.round(40 + (rawScore * 0.5))));

    return {
      sentences,
      words,
      letters,
      avgLettersPerWord: letters / words,
      avgWordsPerSentence: words / sentences,
      L, // Letters per 100 words
      S, // Sentences per 100 words
      rawScore,
      finalScore
    };
  }
}

/**
 * Factory function for creating readability calculator
 */
export function createReadabilityCalculator(): IReadabilityCalculator {
  return new ReadabilityCalculator();
}

/**
 * Convenience function for quick readability calculation
 */
export function calculateReadability(text: string): number {
  const calculator = new ReadabilityCalculator();
  return calculator.calculate(text);
}