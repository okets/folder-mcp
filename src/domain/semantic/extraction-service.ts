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
import { SemanticScore } from '../../types/index.js';
import { ILoggingService } from '../../di/interfaces.js';
import {
  NGramCosineExtractor,
  createNGramCosineExtractor,
  IEmbeddingModel,
  NGramExtractionOptions
} from './algorithms/ngram-cosine-extractor.js';
import {
  IReadabilityCalculator,
  createReadabilityCalculator
} from './algorithms/readability-calculator.js';
import {
  EnhancedTopicClusteringService,
  createTopicClusteringService
} from '../content/topic-clustering.js';

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
  private ngramExtractor: NGramCosineExtractor | null = null;
  private readabilityCalculator: IReadabilityCalculator;
  private topicClusteringService: EnhancedTopicClusteringService;

  constructor(
    private pythonService: IPythonSemanticService | null,
    private logger: ILoggingService,
    private embeddingModel?: IEmbeddingModel | null
  ) {
    this.options = DEFAULT_OPTIONS;

    // Initialize Coleman-Liau readability calculator (always available)
    this.readabilityCalculator = createReadabilityCalculator();

    // Initialize topic clustering service (Sprint 3)
    this.topicClusteringService = createTopicClusteringService(logger);

    // Initialize N-gram extractor for ONNX models (which don't use Python service)
    // ONNX models run entirely in Node.js and use N-gram extraction
    if (!pythonService && embeddingModel) {
      this.ngramExtractor = createNGramCosineExtractor(embeddingModel, logger);
      this.logger.info('Initialized N-gram extractor for ONNX model semantic extraction');
    }
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

      // Calculate readability using Coleman-Liau (Sprint 2 implementation)
      const readabilityScore = this.readabilityCalculator.calculate(text);

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
   * Extract semantic data from multiple texts (batch processing)
   * Optimized for performance when processing multiple chunks
   */
  async extractFromTextBatch(texts: string[], embeddings?: Float32Array[]): Promise<SemanticData[]> {
    const startTime = Date.now();
    this.logger.info(`[SEMANTIC-BATCH] Starting batch semantic extraction for ${texts.length} texts`);

    try {
      // For GPU models with Python service, use batch KeyBERT processing
      if (this.pythonService) {
        return await this.extractBatchWithKeyBERT(texts);
      }

      // For ONNX models with N-gram extraction, process each text individually
      // because N-gram requires individual embeddings and is already optimized
      if (this.ngramExtractor) {
        return await this.extractBatchWithNGram(texts, embeddings);
      }

      // No extraction method available - FAIL LOUDLY
      throw new Error(
        'CRITICAL: No semantic extraction method available for batch processing! ' +
        'GPU models require Python with KeyBERT, ONNX models require N-gram extractor.'
      );

    } catch (error) {
      this.logger.error('CRITICAL: Batch semantic extraction failed completely!');
      this.logger.error('Error details: ' + (error instanceof Error ? error.message : String(error)));
      if (error instanceof Error && error.stack) {
        this.logger.error('Stack trace: ' + error.stack);
      }
      throw error; // Re-throw to fail loudly
    }
  }

  /**
   * Batch extraction using KeyBERT (for GPU models)
   */
  private async extractBatchWithKeyBERT(texts: string[]): Promise<SemanticData[]> {
    this.logger.info(`[KEYBERT-BATCH] Processing ${texts.length} texts with KeyBERT batch processing`);

    if (!this.pythonService) {
      throw new Error('Python service not available for KeyBERT batch processing');
    }

    // Check if KeyBERT is available
    const available = await this.pythonService.isKeyBERTAvailable();
    if (!available) {
      throw new Error('KeyBERT not available in Python environment');
    }

    // Extract key phrases using batch KeyBERT
    const batchStartTime = Date.now();
    const keyPhrasesArray = await this.pythonService.extractKeyPhrasesKeyBERTBatch(texts, this.options);
    const batchTime = Date.now() - batchStartTime;

    this.logger.info(`[KEYBERT-BATCH] Batch KeyBERT extraction completed in ${batchTime}ms`);

    // Process each text result
    const results: SemanticData[] = [];
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]!;
      const keyPhrases = keyPhrasesArray[i] || [];

      // Extract topics (using existing single-text method)
      const topics = await this.extractTopics(text);

      // Calculate readability
      const readabilityScore = this.readabilityCalculator.calculate(text);

      // Calculate quality metrics
      const qualityMetrics = this.options.calculateMetrics
        ? this.calculateQualityMetrics(keyPhrases, topics)
        : undefined;

      results.push({
        keyPhrases,
        topics,
        readabilityScore,
        extractionMethod: 'keybert',
        processingTimeMs: batchTime / texts.length, // Approximate per-text time
        qualityMetrics
      });
    }

    const totalTime = Date.now() - batchStartTime;
    this.logger.info(`[KEYBERT-BATCH] Complete batch processing finished in ${totalTime}ms`, {
      textsProcessed: texts.length,
      avgTimePerText: totalTime / texts.length,
      multiwordRatios: results.map(r => r.qualityMetrics?.multiwordRatio)
    });

    return results;
  }

  /**
   * Batch extraction using N-gram (for ONNX models)
   */
  private async extractBatchWithNGram(texts: string[], embeddings?: Float32Array[]): Promise<SemanticData[]> {
    this.logger.info(`[NGRAM-BATCH] Processing ${texts.length} texts with N-gram extraction`);

    if (!this.ngramExtractor) {
      throw new Error('N-gram extractor not available for batch processing');
    }

    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error('N-gram batch processing requires embeddings for each text');
    }

    const results: SemanticData[] = [];
    const batchStartTime = Date.now();

    // Process each text individually (N-gram is already optimized with batching internally)
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]!;
      const embedding = embeddings[i]!;

      const textStartTime = Date.now();

      // Extract key phrases using N-gram
      const extractOptions: Partial<NGramExtractionOptions> = {};
      if (this.options.ngramRange) extractOptions.ngramRange = this.options.ngramRange;
      if (this.options.maxKeyPhrases !== undefined) extractOptions.topK = this.options.maxKeyPhrases;
      if (this.options.diversity !== undefined) extractOptions.diversityFactor = this.options.diversity;

      const scoredPhrases = await this.ngramExtractor.extractKeyPhrasesWithScores(text, embedding, extractOptions);
      const keyPhrases: SemanticScore[] = scoredPhrases.map(item => ({
        text: item.phrase,
        score: item.score
      }));

      // Extract topics
      const topics = await this.extractTopics(text, embedding);

      // Calculate readability
      const readabilityScore = this.readabilityCalculator.calculate(text);

      // Calculate quality metrics
      const qualityMetrics = this.options.calculateMetrics
        ? this.calculateQualityMetrics(keyPhrases, topics)
        : undefined;

      const processingTimeMs = Date.now() - textStartTime;

      results.push({
        keyPhrases,
        topics,
        readabilityScore,
        extractionMethod: 'ngram',
        processingTimeMs,
        qualityMetrics
      });
    }

    const totalTime = Date.now() - batchStartTime;
    this.logger.info(`[NGRAM-BATCH] Complete batch processing finished in ${totalTime}ms`, {
      textsProcessed: texts.length,
      avgTimePerText: totalTime / texts.length,
      multiwordRatios: results.map(r => r.qualityMetrics?.multiwordRatio)
    });

    return results;
  }

  /**
   * Extract key phrases using KeyBERT for GPU models or N-gram for ONNX models
   */
  async extractKeyPhrases(text: string, embeddings?: Float32Array): Promise<SemanticScore[]> {
    // Try KeyBERT first (for GPU models)
    if (this.pythonService) {
      try {
        // Check if KeyBERT is available
        const available = await this.pythonService.isKeyBERTAvailable();

        if (!available) {
          throw new Error('KeyBERT not available in Python environment');
        }

        // Extract key phrases using KeyBERT
        const phrases = await this.pythonService.extractKeyPhrasesKeyBERT(text, this.options);
        this.logger.debug('KeyBERT extraction successful', {
          phraseCount: phrases.length,
          sample: phrases.slice(0, 3).map(p => p.text),
          multiwordRatio: this.calculateMultiwordRatio(phrases.map(p => p.text))
        });
        return phrases;

      } catch (error) {
        this.logger.error('KeyBERT extraction failed for GPU model', error instanceof Error ? error : new Error(String(error)));
        // FAIL LOUDLY - GPU models require KeyBERT
        throw new Error(
          `CRITICAL: KeyBERT extraction failed for GPU model! ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Use N-gram extractor for ONNX models
    if (this.ngramExtractor && embeddings) {
      this.logger.info('Using N-gram + Cosine similarity for ONNX model');

      try {
        const extractOptions: Partial<NGramExtractionOptions> = {};
        if (this.options.ngramRange) extractOptions.ngramRange = this.options.ngramRange;
        if (this.options.maxKeyPhrases !== undefined) extractOptions.topK = this.options.maxKeyPhrases;
        if (this.options.diversity !== undefined) extractOptions.diversityFactor = this.options.diversity;

        const scoredPhrases = await this.ngramExtractor.extractKeyPhrasesWithScores(
          text,
          embeddings,
          extractOptions
        );

        this.logger.debug('N-gram extraction successful', {
          phraseCount: scoredPhrases.length,
          multiwordRatio: this.calculateMultiwordRatio(scoredPhrases.map(p => p.phrase))
        });

        // Convert to SemanticScore format
        const semanticScores: SemanticScore[] = scoredPhrases.map(item => ({
          text: item.phrase,
          score: item.score
        }));

        return semanticScores;
      } catch (error) {
        this.logger.error('N-gram extraction failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error(`Semantic extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // No extraction method available - FAIL LOUDLY
    throw new Error(
      'CRITICAL: No semantic extraction method available! ' +
      'GPU models require Python with KeyBERT, ONNX models require embeddings for N-gram extraction.'
    );
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
   * Extract topics from text using enhanced clustering approach
   */
  async extractTopics(text: string, embeddings?: Float32Array): Promise<SemanticScore[]> {
    // SPRINT 3: Use enhanced topic clustering service
    try {
      // Extract topics using the enhanced clustering service
      const extractedTopics = this.topicClusteringService.extractTopics(
        [], // Will extract key phrases internally if needed
        text,
        {
          maxTopics: this.options.maxTopics || 5,
          minConfidence: 0.3,
          cleanMarkdown: true,
          diversityThreshold: 0.5
        }
      );

      // Convert to scored format with higher scores for primary topics
      const scoredTopics: SemanticScore[] = [
        ...extractedTopics.primary.map(topic => ({ text: topic, score: 0.8 })),
        ...extractedTopics.secondary.slice(0, (this.options.maxTopics || 5) - extractedTopics.primary.length)
          .map(topic => ({ text: topic, score: 0.6 }))
      ];

      this.logger.debug('Enhanced topic extraction (Sprint 3)', {
        topicCount: scoredTopics.length,
        topics: scoredTopics.map(t => t.text),
        primary: extractedTopics.primary,
        secondary: extractedTopics.secondary
      });

      return scoredTopics.length > 0 ? scoredTopics : [{ text: 'technical documentation', score: 0.5 }];
    } catch (error) {
      this.logger.error('Enhanced topic extraction failed, using fallback', error as Error);

      // Fallback to simple pattern matching if enhanced clustering fails
      const scoredTopics: SemanticScore[] = [];
      const lowerText = text.toLowerCase();

      const topicPatterns = [
        { pattern: /machine learning|neural|ai|artificial intelligence/i, topic: 'machine learning', score: 0.8 },
        { pattern: /semantic search|embedding|vector|similarity/i, topic: 'semantic search', score: 0.8 },
        { pattern: /document|text|content|file/i, topic: 'document processing', score: 0.7 },
        { pattern: /database|storage|index|query/i, topic: 'data storage', score: 0.7 },
        { pattern: /transform|model|bert|gpt/i, topic: 'transformer models', score: 0.8 },
        { pattern: /python|javascript|typescript|code/i, topic: 'programming', score: 0.6 },
        { pattern: /api|endpoint|service|server/i, topic: 'web services', score: 0.6 }
      ];

      for (const { pattern, topic, score } of topicPatterns) {
        if (pattern.test(lowerText) && scoredTopics.length < (this.options.maxTopics || 5)) {
          scoredTopics.push({ text: topic, score });
        }
      }

      return scoredTopics.length > 0 ? scoredTopics : [{ text: 'technical documentation', score: 0.5 }];
    }
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
  private calculateQualityMetrics(keyPhrases: SemanticScore[], topics: SemanticScore[]): SemanticData['qualityMetrics'] {
    const phraseTexts = keyPhrases.map(p => p.text);
    const multiwordPhrases = phraseTexts.filter(p => p.includes(' '));
    const multiwordRatio = phraseTexts.length > 0
      ? multiwordPhrases.length / phraseTexts.length
      : 0;

    const wordCounts = phraseTexts.map(p => p.split(' ').length);
    const averageWordsPerPhrase = wordCounts.length > 0
      ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
      : 1;

    // Topic specificity (0-1, higher is more specific)
    const genericTopics = ['general', 'education', 'technology', 'business', 'science'];
    const topicTexts = topics.map(t => t.text);
    const specificTopics = topicTexts.filter(t => !genericTopics.includes(t.toLowerCase()));
    const topicSpecificity = topicTexts.length > 0
      ? specificTopics.length / topicTexts.length
      : 0;

    return {
      multiwordRatio,
      averageWordsPerPhrase,
      topicSpecificity
    };
  }

}

/**
 * Factory function for creating semantic extraction service
 */
export function createSemanticExtractionService(
  pythonService: IPythonSemanticService | null,
  logger: ILoggingService,
  embeddingModel?: IEmbeddingModel | null
): ISemanticExtractionService {
  return new SemanticExtractionService(pythonService, logger, embeddingModel);
}

// Export the interface for import elsewhere
export type { ISemanticExtractionService } from './interfaces.js';