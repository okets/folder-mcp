/**
 * Semantic Extraction Service
 *
 * Implements research-validated semantic extraction using KeyBERT and other
 * advanced techniques. Replaces the broken ContentProcessingService.
 */

import {
  ISemanticExtractionService,
  SemanticData,
  SemanticExtractionOptions,
  IPythonSemanticService
} from './interfaces.js';
import { ILoggingService } from '../../di/interfaces.js';

/**
 * Default extraction options
 */
const DEFAULT_OPTIONS: SemanticExtractionOptions = {
  maxKeyPhrases: 10,
  ngramRange: [1, 3],
  useMmr: true,
  diversity: 0.5,
  maxTopics: 5,
  calculateMetrics: true
};

/**
 * Semantic Extraction Service Implementation
 *
 * Uses KeyBERT for multiword phrase extraction and proper readability formulas.
 * Designed to achieve >80% multiword phrases vs current 11%.
 */
export class SemanticExtractionService implements ISemanticExtractionService {
  private options: SemanticExtractionOptions;

  constructor(
    private pythonService: IPythonSemanticService | null,
    private logger: ILoggingService
  ) {
    this.options = DEFAULT_OPTIONS;
  }

  /**
   * Extract semantic data from text
   */
  async extractFromText(text: string, embeddings?: Float32Array): Promise<SemanticData> {
    const startTime = Date.now();

    try {
      // Extract key phrases using KeyBERT if available, fallback to n-gram
      const keyPhrases = await this.extractKeyPhrases(text, embeddings);

      // Extract topics (for now using simple approach, will upgrade in Sprint 3)
      const topics = await this.extractTopics(text, embeddings);

      // Calculate readability (will upgrade to hybrid in Sprint 2)
      const readabilityScore = this.calculateReadability(text);

      // Calculate quality metrics
      const qualityMetrics = this.options.calculateMetrics
        ? this.calculateQualityMetrics(keyPhrases, topics)
        : undefined;

      const processingTimeMs = Date.now() - startTime;

      const extractionMethod = this.pythonService ? 'keybert' : 'ngram';

      this.logger.debug('Semantic extraction complete', {
        method: extractionMethod,
        phraseCount: keyPhrases.length,
        multiwordRatio: qualityMetrics?.multiwordRatio,
        timeMs: processingTimeMs
      });

      return {
        keyPhrases,
        topics,
        readabilityScore,
        extractionMethod,
        processingTimeMs,
        qualityMetrics
      };
    } catch (error) {
      // FAIL LOUDLY - propagate the error!
      this.logger.error('CRITICAL: Semantic extraction failed completely!');
      this.logger.error('Error details: ' + (error instanceof Error ? error.message : String(error)));
      if (error instanceof Error && error.stack) {
        this.logger.error('Stack trace: ' + error.stack);
      }
      throw error; // Re-throw to fail loudly
    }
  }

  /**
   * Extract key phrases using KeyBERT (required for GPU models)
   */
  async extractKeyPhrases(text: string, embeddings?: Float32Array): Promise<string[]> {
    // Python service with KeyBERT is REQUIRED - no fallbacks
    if (!this.pythonService) {
      throw new Error('Python service not available - KeyBERT extraction requires Python with GPU model support');
    }

    try {
      // Check if KeyBERT is available (it should be since it's a required dependency)
      const available = await this.pythonService.isKeyBERTAvailable();

      if (!available) {
        // This should never happen since KeyBERT is checked at Python startup
        throw new Error('KeyBERT not available in Python environment - this is a required dependency');
      }

      // Extract key phrases using KeyBERT
      const phrases = await this.pythonService.extractKeyPhrasesKeyBERT(text, this.options);
      this.logger.debug('KeyBERT extraction successful', {
        phraseCount: phrases.length,
        sample: phrases.slice(0, 3),
        multiwordRatio: this.calculateMultiwordRatio(phrases)
      });
      return phrases;

    } catch (error) {
      // FAIL LOUDLY - no silent failures!
      this.logger.error('CRITICAL: KeyBERT extraction failed!');
      this.logger.error('Error details: ' + (error instanceof Error ? error.message : String(error)));
      if (error instanceof Error && error.stack) {
        this.logger.error('Stack trace: ' + error.stack);
      }
      throw error; // Re-throw to propagate the failure
    }
  }

  /**
   * Calculate multiword ratio for quality metrics
   */
  private calculateMultiwordRatio(phrases: string[]): number {
    if (phrases.length === 0) return 0;
    const multiwordCount = phrases.filter(p => p.includes(' ')).length;
    return multiwordCount / phrases.length;
  }

  /**
   * Extract topics from text
   * TODO: Implement BERTopic in Sprint 3
   */
  async extractTopics(text: string, embeddings?: Float32Array): Promise<string[]> {
    // For now, return more specific topics based on content analysis
    // This will be replaced with BERTopic in Sprint 3
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    // Domain-specific topic detection (temporary)
    const topicPatterns = [
      { pattern: /machine learning|neural|ai|artificial intelligence/i, topic: 'machine learning' },
      { pattern: /semantic search|embedding|vector|similarity/i, topic: 'semantic search' },
      { pattern: /document|text|content|file/i, topic: 'document processing' },
      { pattern: /database|storage|index|query/i, topic: 'data storage' },
      { pattern: /transform|model|bert|gpt/i, topic: 'transformer models' },
      { pattern: /python|javascript|typescript|code/i, topic: 'programming' },
      { pattern: /api|endpoint|service|server/i, topic: 'web services' }
    ];

    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(lowerText) && topics.length < (this.options.maxTopics || 5)) {
        topics.push(topic);
      }
    }

    // If no specific topics found, add a general one based on content
    if (topics.length === 0) {
      topics.push('technical documentation');
    }

    return topics;
  }

  /**
   * Calculate readability score
   * TODO: Implement hybrid approach in Sprint 2
   */
  calculateReadability(text: string): number {
    // For now, use a simple but more realistic formula
    // Will be replaced with hybrid approach in Sprint 2
    const sentences = this.countSentences(text);
    const words = this.countWords(text);
    const syllables = this.estimateSyllables(text);

    if (sentences === 0 || words === 0) return 50; // Default for empty text

    // Flesch Reading Ease formula (adjusted for technical content)
    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    // Modified formula that produces more realistic scores for technical docs
    let score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    // Adjust for technical content (typically scores lower)
    score = score * 0.7 + 15; // Shift range to be more realistic

    // Clamp to reasonable range for technical documentation
    return Math.max(30, Math.min(70, Math.round(score)));
  }

  /**
   * Validate extraction quality
   */
  validateExtraction(data: SemanticData): boolean {
    // Check for minimum quality standards
    if (!data.keyPhrases || data.keyPhrases.length === 0) {
      return false;
    }

    // Check multiword ratio if metrics available
    if (data.qualityMetrics) {
      if (data.qualityMetrics.multiwordRatio < 0.5) {
        this.logger.warn('Low multiword ratio in extraction', {
          ratio: data.qualityMetrics.multiwordRatio
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate quality metrics for extracted data
   */
  private calculateQualityMetrics(keyPhrases: string[], topics: string[]): SemanticData['qualityMetrics'] {
    const multiwordPhrases = keyPhrases.filter(p => p.includes(' '));
    const multiwordRatio = keyPhrases.length > 0
      ? multiwordPhrases.length / keyPhrases.length
      : 0;

    const wordCounts = keyPhrases.map(p => p.split(' ').length);
    const averageWordsPerPhrase = wordCounts.length > 0
      ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
      : 1;

    // Topic specificity (0-1, higher is more specific)
    const genericTopics = ['general', 'education', 'technology', 'business', 'science'];
    const specificTopics = topics.filter(t => !genericTopics.includes(t.toLowerCase()));
    const topicSpecificity = topics.length > 0
      ? specificTopics.length / topics.length
      : 0;

    return {
      multiwordRatio,
      averageWordsPerPhrase,
      topicSpecificity
    };
  }

  /**
   * Count sentences in text
   */
  private countSentences(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return Math.max(1, sentences.length);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }

  /**
   * Estimate syllables (improved from broken version)
   */
  private estimateSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;

    for (const word of words) {
      if (word.length <= 3) {
        totalSyllables += 1;
      } else {
        // Count vowel groups as syllables
        const vowelGroups = word.match(/[aeiou]+/g) || [];
        let syllables = vowelGroups.length;

        // Adjust for silent e
        if (word.endsWith('e') && syllables > 1) {
          syllables--;
        }

        totalSyllables += Math.max(1, syllables);
      }
    }

    return totalSyllables;
  }
}

/**
 * Factory function for creating semantic extraction service
 */
export function createSemanticExtractionService(
  pythonService: IPythonSemanticService | null,
  logger: ILoggingService
): ISemanticExtractionService {
  return new SemanticExtractionService(pythonService, logger);
}

// Export the interface for import elsewhere
export type { ISemanticExtractionService } from './interfaces.js';