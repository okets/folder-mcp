/**
 * Enhanced Content Processing Service
 * Sprint 3: Integrates the new topic clustering service
 *
 * This service wraps the existing ContentProcessingService and enhances
 * topic extraction using the new clustering approach while maintaining
 * backward compatibility.
 */

import { ContentProcessingService } from './processing.js';
import { EnhancedTopicClusteringService, type ExtractedTopics } from './topic-clustering.js';
import type { ILoggingService } from '../../di/interfaces.js';

export interface SemanticMetadata {
  keyPhrases: string[];
  topics: string[];
  readabilityScore: number;
  summary?: string;
}

export class EnhancedContentProcessingService {
  private topicClusteringService: EnhancedTopicClusteringService;

  constructor(private readonly logger: ILoggingService) {
    this.topicClusteringService = new EnhancedTopicClusteringService(logger);
  }

  /**
   * Process content and extract enhanced semantic metadata
   */
  async processContent(
    content: string,
    options: {
      useEnhancedTopics?: boolean;
      maxKeyPhrases?: number;
      maxTopics?: number;
    } = {}
  ): Promise<SemanticMetadata> {
    const {
      useEnhancedTopics = true,
      maxKeyPhrases = 10,
      maxTopics = 8
    } = options;

    try {
      // Extract key phrases using existing service
      const keyPhrases = ContentProcessingService.extractKeyPhrases(content, maxKeyPhrases);

      // Extract topics
      let topics: string[];
      if (useEnhancedTopics) {
        // Use new clustering approach
        const extractedTopics = this.topicClusteringService.extractTopics(
          keyPhrases,
          content,
          {
            maxTopics,
            minConfidence: 0.3,
            cleanMarkdown: true,
            diversityThreshold: 0.5
          }
        );

        // Combine primary and secondary topics
        topics = [
          ...extractedTopics.primary,
          ...extractedTopics.secondary.slice(0, maxTopics - extractedTopics.primary.length)
        ];

        // Log improvement metrics
        const oldTopics = ContentProcessingService.detectTopics(content);
        this.logger.debug('Topic extraction improvement', {
          old: oldTopics,
          new: topics,
          diversityGain: topics.length - oldTopics.length,
          specificityImproved: !topics.includes('general')
        });
      } else {
        // Fallback to existing implementation
        topics = ContentProcessingService.detectTopics(content);
      }

      // Calculate readability using existing service
      const readabilityScore = ContentProcessingService.calculateReadabilityScore(content);

      // Generate summary using existing service
      const summary = ContentProcessingService.generateSummary(content);

      return {
        keyPhrases,
        topics,
        readabilityScore,
        summary
      };
    } catch (error) {
      this.logger.error('Enhanced content processing failed', error as Error);

      // Fallback to basic processing
      return {
        keyPhrases: ContentProcessingService.extractKeyPhrases(content, maxKeyPhrases),
        topics: ContentProcessingService.detectTopics(content),
        readabilityScore: ContentProcessingService.calculateReadabilityScore(content),
        summary: ContentProcessingService.generateSummary(content)
      };
    }
  }

  /**
   * Process content for a specific section with contextual topics
   */
  async processSectionContent(
    content: string,
    sectionContext: string,
    options: {
      maxKeyPhrases?: number;
      maxTopics?: number;
    } = {}
  ): Promise<SemanticMetadata> {
    const {
      maxKeyPhrases = 10,
      maxTopics = 5
    } = options;

    try {
      // Extract key phrases
      const keyPhrases = ContentProcessingService.extractKeyPhrases(content, maxKeyPhrases);

      // Extract section-specific topics
      const sectionTopics = this.topicClusteringService.extractSectionTopics(
        content,
        sectionContext,
        keyPhrases
      );

      // Calculate readability
      const readabilityScore = ContentProcessingService.calculateReadabilityScore(content);

      return {
        keyPhrases,
        topics: sectionTopics.slice(0, maxTopics),
        readabilityScore
      };
    } catch (error) {
      this.logger.error('Section content processing failed', error as Error);

      // Fallback to basic processing
      return this.processContent(content, { useEnhancedTopics: false, maxKeyPhrases, maxTopics });
    }
  }

  /**
   * Compare old vs new topic extraction for testing
   */
  async compareTopicExtraction(content: string): Promise<{
    old: string[];
    new: string[];
    improvement: {
      diversityGain: number;
      specificityGain: boolean;
      cleanlinessGain: boolean;
    };
  }> {
    // Get old topics
    const oldTopics = ContentProcessingService.detectTopics(content);

    // Get new topics
    const keyPhrases = ContentProcessingService.extractKeyPhrases(content, 20);
    const newTopicData = this.topicClusteringService.extractTopics(
      keyPhrases,
      content,
      {
        maxTopics: 10,
        cleanMarkdown: true
      }
    );
    const newTopics = [...newTopicData.primary, ...newTopicData.secondary];

    // Calculate improvements
    const improvement = {
      diversityGain: newTopics.length - oldTopics.length,
      specificityGain: !newTopics.includes('general') && oldTopics.includes('general'),
      cleanlinessGain: !newTopics.some(t => t.includes('*') || t.includes('✅'))
    };

    return {
      old: oldTopics,
      new: newTopics,
      improvement
    };
  }
}