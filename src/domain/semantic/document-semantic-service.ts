/**
 * Document Semantic Service - Sprint 0
 *
 * Orchestrates document-level semantic aggregation by coordinating:
 * - Base aggregation engine (model-agnostic)
 * - Model-specific enhancement handlers (Python/ONNX)
 * - Database persistence of document semantic data
 *
 * This service is the main entry point for document semantic processing
 * and handles the fail-loud error propagation strategy.
 */

import type {
  DocumentSemanticSummary,
  DocumentAggregationOptions,
  DocumentAggregationResult,
  DocumentAggregationError,
  ExtractionMethod
} from '../../types/document-semantic.js';
import { DEFAULT_AGGREGATION_OPTIONS } from '../../types/document-semantic.js';
import type { ChunkSemanticData } from './document-aggregator.js';
import type { PythonEmbeddingService } from '../../infrastructure/embeddings/python-embedding-service.js';
import type { IEmbeddingService, ILoggingService } from '../../di/interfaces.js';

import { DocumentSemanticAggregator } from './document-aggregator.js';
import { PythonDocumentEnhancer } from './python-document-enhancer.js';
import { ONNXDocumentEnhancer } from './onnx-document-enhancer.js';

/**
 * Document identifier and metadata for semantic processing
 */
export interface DocumentContext {
  documentId: number;
  filePath: string;
  modelId: string;
  embeddingService: IEmbeddingService;
}

/**
 * Document Semantic Service
 *
 * Provides the main interface for document-level semantic aggregation
 * with model-specific enhancement capabilities.
 */
export class DocumentSemanticService {
  private readonly aggregator: DocumentSemanticAggregator;
  private readonly options: DocumentAggregationOptions;
  private readonly logger: ILoggingService;

  constructor(
    options: Partial<DocumentAggregationOptions> = {},
    logger: ILoggingService
  ) {
    this.options = { ...DEFAULT_AGGREGATION_OPTIONS, ...options };
    this.aggregator = new DocumentSemanticAggregator(this.options);
    this.logger = logger;
  }

  /**
   * Process document-level semantic aggregation
   *
   * This is the main entry point that:
   * 1. Performs base aggregation (works for all models)
   * 2. Applies model-specific enhancement if available
   * 3. Returns aggregation result for database storage
   */
  async processDocumentSemantics(
    context: DocumentContext,
    chunks: ChunkSemanticData[]
  ): Promise<DocumentAggregationResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`[DOCUMENT-SEMANTICS] Processing document: ${context.filePath}`, {
        documentId: context.documentId,
        modelId: context.modelId,
        chunkCount: chunks.length
      });

      // Step 1: Base aggregation (works for all models)
      const baseResult = await this.aggregator.aggregateDocument({
        documentId: context.documentId,
        filePath: context.filePath,
        chunks
      });

      if (!baseResult.success) {
        this.logger.error(`[DOCUMENT-SEMANTICS] Base aggregation failed for ${context.filePath}:`, new Error(baseResult.warnings?.join('; ') || 'Unknown aggregation error'));
        return baseResult;
      }

      // Step 2: Model-specific enhancement
      const enhancedSummary = await this.applyModelSpecificEnhancement(
        baseResult.semantic_summary,
        chunks,
        context
      );

      // Step 3: Build final result
      const finalResult: DocumentAggregationResult = {
        ...baseResult,
        semantic_summary: enhancedSummary,
        extraction_method: enhancedSummary.quality.method,
        processing_time_ms: Date.now() - startTime
      };

      // Update processing time in summary
      finalResult.semantic_summary.quality.processing_time_ms = finalResult.processing_time_ms;

      this.logger.info(`[DOCUMENT-SEMANTICS] Completed processing for ${context.filePath}:`, {
        success: finalResult.success,
        method: finalResult.extraction_method,
        processingTime: finalResult.processing_time_ms,
        topicsCount: enhancedSummary.top_topics.length,
        phrasesCount: enhancedSummary.top_phrases.length,
        quality: finalResult.extraction_quality
      });

      return finalResult;

    } catch (error) {
      this.logger.error(`[DOCUMENT-SEMANTICS] Processing failed for ${context.filePath}:`, error instanceof Error ? error : new Error(String(error)));

      // Fail-loud: return detailed error result
      const errorResult: DocumentAggregationResult = {
        success: false,
        document_id: context.documentId,
        file_path: context.filePath,
        semantic_summary: this.createEmptySemanticSummary(),
        primary_theme: 'ERROR',
        extraction_method: 'aggregation_only',
        processing_time_ms: Date.now() - startTime,
        chunks_processed: chunks.length,
        extraction_quality: 0,
        warnings: [`Document semantic processing failed: ${error instanceof Error ? error.message : String(error)}`]
      };

      return errorResult;
    }
  }

  /**
   * Apply model-specific enhancement to base semantic summary
   */
  private async applyModelSpecificEnhancement(
    baseSummary: DocumentSemanticSummary,
    chunks: ChunkSemanticData[],
    context: DocumentContext
  ): Promise<DocumentSemanticSummary> {
    try {
      // Determine model type from service type using type guard
      const serviceType = this.getServiceType(context.embeddingService);

      if (serviceType === 'gpu' && this.isPythonService(context.embeddingService)) {
        // Python model - use advanced enhancement
        return this.applyPythonEnhancement(baseSummary, chunks, context.embeddingService, context.filePath);
      } else if (serviceType === 'onnx' || serviceType === 'cpu') {
        // ONNX model - use basic enhancement
        return this.applyONNXEnhancement(baseSummary, chunks, context.filePath);
      } else {
        this.logger.debug(`[DOCUMENT-SEMANTICS] Unknown service type ${serviceType}, using base aggregation only`);
        return baseSummary;
      }

    } catch (error) {
      this.logger.error(`[DOCUMENT-SEMANTICS] Enhancement failed for ${context.filePath}, using base aggregation:`, error instanceof Error ? error : new Error(String(error)));
      return baseSummary; // Fallback to base aggregation
    }
  }

  /**
   * Apply Python model enhancement using KeyBERT and BERTopic
   */
  private async applyPythonEnhancement(
    baseSummary: DocumentSemanticSummary,
    chunks: ChunkSemanticData[],
    pythonService: PythonEmbeddingService,
    filePath: string
  ): Promise<DocumentSemanticSummary> {
    try {
      const enhancer = new PythonDocumentEnhancer(pythonService, this.options);

      // Check if enhancement is available
      if (!await enhancer.isEnhancementAvailable()) {
        this.logger.debug(`[DOCUMENT-SEMANTICS] Python enhancement not available for ${filePath}, using base aggregation`);
        return baseSummary;
      }

      // Apply enhancement
      const enhancedSummary = await enhancer.enhanceDocumentSemantics(baseSummary, chunks, filePath);

      this.logger.debug(`[DOCUMENT-SEMANTICS] Applied Python enhancement for ${filePath}:`, {
        method: enhancedSummary.quality.method,
        documentTopics: enhancedSummary.document_topics?.length || 0,
        documentPhrases: enhancedSummary.document_phrases?.length || 0,
        confidence: enhancedSummary.quality.extraction_confidence
      });

      return enhancedSummary;

    } catch (error) {
      this.logger.error(`[DOCUMENT-SEMANTICS] Python enhancement failed for ${filePath}:`, error instanceof Error ? error : new Error(String(error)));
      // Return base summary with failed enhancement indication
      const failedSummary = { ...baseSummary };
      failedSummary.quality.method = 'python_rich';
      failedSummary.quality.extraction_confidence = Math.max(0, baseSummary.quality.extraction_confidence - 0.2);
      return failedSummary;
    }
  }

  /**
   * Apply ONNX model enhancement using embedding-based clustering
   */
  private async applyONNXEnhancement(
    baseSummary: DocumentSemanticSummary,
    chunks: ChunkSemanticData[],
    filePath: string
  ): Promise<DocumentSemanticSummary> {
    try {
      const enhancer = new ONNXDocumentEnhancer(this.options);

      // Apply enhancement
      const enhancedSummary = await enhancer.enhanceDocumentSemantics(baseSummary, chunks, filePath);

      this.logger.debug(`[DOCUMENT-SEMANTICS] Applied ONNX enhancement for ${filePath}:`, {
        method: enhancedSummary.quality.method,
        clusteredTopics: enhancedSummary.top_topics.length,
        clusteredPhrases: enhancedSummary.top_phrases.length,
        confidence: enhancedSummary.quality.extraction_confidence
      });

      return enhancedSummary;

    } catch (error) {
      this.logger.error(`[DOCUMENT-SEMANTICS] ONNX enhancement failed for ${filePath}:`, error instanceof Error ? error : new Error(String(error)));
      // Return base summary with failed enhancement indication
      const failedSummary = { ...baseSummary };
      failedSummary.quality.method = 'onnx_similarity';
      failedSummary.quality.extraction_confidence = Math.max(0, baseSummary.quality.extraction_confidence - 0.1);
      return failedSummary;
    }
  }

  /**
   * Check if the embedding service is a Python service
   */
  private isPythonService(service: any): service is PythonEmbeddingService {
    return (
      service &&
      typeof service.isKeyBERTAvailable === 'function' &&
      typeof service.extractKeyPhrasesKeyBERT === 'function'
    );
  }

  /**
   * Create empty semantic summary for error cases
   */
  private createEmptySemanticSummary(): DocumentSemanticSummary {
    return {
      aggregated_topics: [],
      aggregated_phrases: [],
      top_topics: [],
      top_phrases: [],
      metrics: {
        total_chunks: 0,
        avg_readability: 0,
        topic_diversity: 0,
        phrase_richness: 0,
        semantic_coherence: 0
      },
      quality: {
        extraction_confidence: 0,
        coverage: 0,
        method: 'aggregation_only',
        processing_time_ms: 0
      }
    };
  }

  /**
   * Get aggregation options (for external configuration)
   */
  getOptions(): DocumentAggregationOptions {
    return { ...this.options };
  }

  /**
   * Update aggregation options
   */
  updateOptions(newOptions: Partial<DocumentAggregationOptions>): void {
    Object.assign(this.options, newOptions);
  }

  /**
   * Type guard to safely get service type from embedding service
   */
  private getServiceType(embeddingService: IEmbeddingService): string {
    // Type guard for services with getServiceType method
    if (embeddingService && typeof (embeddingService as any).getServiceType === 'function') {
      try {
        return (embeddingService as any).getServiceType();
      } catch (error) {
        this.logger.debug('[DOCUMENT-SEMANTICS] Failed to get service type:', error);
      }
    }
    return 'unknown';
  }
}