/**
 * Enhanced Topic Clustering Service
 * Sprint 3: Dynamic topic extraction using clustering techniques
 *
 * Goals:
 * - Increase topic diversity from 3 generic to 5-10 specific topics
 * - Generate section-specific topics rather than uniform categories
 * - Clean key phrases from markdown artifacts
 * - Work universally across Python GPU and ONNX CPU models
 */

import type { ILoggingService } from '../../di/interfaces.js';

export interface TopicCluster {
  label: string;
  confidence: number;
  memberPhrases: string[];
  centroid?: number[];
}

export interface ExtractedTopics {
  primary: string[];      // Main topics (3-5)
  secondary: string[];    // Subtopics (2-5)
  confidence: number;     // Overall confidence score
}

export interface TopicExtractionOptions {
  maxTopics?: number;
  minConfidence?: number;
  diversityThreshold?: number;
  cleanMarkdown?: boolean;
}

export class EnhancedTopicClusteringService {
  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'as'
  ]);

  // Domain-specific topic hierarchy for technical documents
  private readonly topicHierarchy = {
    'software_development': [
      'api development', 'backend systems', 'frontend development',
      'database design', 'microservices', 'cloud architecture',
      'devops', 'testing', 'code quality', 'version control'
    ],
    'machine_learning': [
      'neural networks', 'deep learning', 'transformer models',
      'embedding systems', 'nlp processing', 'computer vision',
      'model training', 'inference optimization', 'ml pipelines'
    ],
    'semantic_search': [
      'vector databases', 'similarity search', 'document retrieval',
      'query processing', 'ranking algorithms', 'relevance scoring',
      'index optimization', 'semantic matching'
    ],
    'data_processing': [
      'data pipelines', 'etl processes', 'stream processing',
      'batch processing', 'data validation', 'data transformation',
      'data quality', 'data governance'
    ],
    'protocols': [
      'mcp protocol', 'rest api', 'graphql', 'websockets',
      'rpc protocols', 'messaging protocols', 'authentication',
      'authorization', 'api security'
    ]
  };

  constructor(
    private readonly logger: ILoggingService
  ) {}

  /**
   * Extract diverse, specific topics from key phrases and content
   */
  extractTopics(
    keyPhrases: string[],
    content: string,
    options: TopicExtractionOptions = {}
  ): ExtractedTopics {
    const {
      maxTopics = 8,
      minConfidence = 0.3,
      diversityThreshold = 0.5,
      cleanMarkdown = true
    } = options;

    // Clean key phrases if needed
    const cleanedPhrases = cleanMarkdown
      ? keyPhrases.map(p => this.cleanMarkdownArtifacts(p))
      : keyPhrases;

    // Build term frequency map
    const termFrequency = this.buildTermFrequencyMap(cleanedPhrases, content);

    // Identify topic clusters using TF-IDF-like scoring
    const clusters = this.clusterBySemanticSimilarity(termFrequency, cleanedPhrases);

    // Generate hierarchical topics
    const hierarchicalTopics = this.generateHierarchicalTopics(clusters, content);

    // Select diverse topics
    const selectedTopics = this.selectDiverseTopics(
      hierarchicalTopics,
      maxTopics,
      diversityThreshold
    );

    // Calculate confidence
    const confidence = this.calculateTopicConfidence(selectedTopics, termFrequency);

    // Filter by minimum confidence
    const filteredTopics = selectedTopics.filter(t => t.confidence >= minConfidence);

    return {
      primary: filteredTopics.slice(0, 5).map(t => t.label),
      secondary: filteredTopics.slice(5, 10).map(t => t.label),
      confidence
    };
  }

  /**
   * Clean markdown artifacts from phrases
   */
  private cleanMarkdownArtifacts(phrase: string): string {
    // Remove markdown formatting
    let cleaned = phrase
      .replace(/\*\*/g, '')           // Bold
      .replace(/\*/g, '')             // Italic
      .replace(/`/g, '')              // Code
      .replace(/#+\s*/g, '')          // Headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links
      .replace(/✅|❌|🚨|⚠️|📄|📊/g, '')        // Emojis
      .trim();

    // Remove special characters at start/end
    cleaned = cleaned.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

    return cleaned.toLowerCase();
  }

  /**
   * Build term frequency map from phrases and content
   */
  private buildTermFrequencyMap(
    phrases: string[],
    content: string
  ): Map<string, number> {
    const termFreq = new Map<string, number>();

    // Process key phrases (higher weight)
    for (const phrase of phrases) {
      const terms = phrase.toLowerCase().split(/\s+/);
      for (const term of terms) {
        if (!this.stopWords.has(term) && term.length > 2) {
          termFreq.set(term, (termFreq.get(term) || 0) + 2);
        }
      }
    }

    // Process content (lower weight)
    const contentTerms = content.toLowerCase().split(/\W+/);
    for (const term of contentTerms) {
      if (!this.stopWords.has(term) && term.length > 2) {
        termFreq.set(term, (termFreq.get(term) || 0) + 0.5);
      }
    }

    return termFreq;
  }

  /**
   * Cluster terms by semantic similarity
   */
  private clusterBySemanticSimilarity(
    termFrequency: Map<string, number>,
    phrases: string[]
  ): TopicCluster[] {
    const clusters: TopicCluster[] = [];
    const processedTerms = new Set<string>();

    // Group related terms
    for (const [term, freq] of termFrequency) {
      if (processedTerms.has(term)) continue;

      const cluster: TopicCluster = {
        label: term,
        confidence: freq / 10, // Normalize frequency to confidence
        memberPhrases: []
      };

      // Find related phrases
      for (const phrase of phrases) {
        if (phrase.toLowerCase().includes(term)) {
          cluster.memberPhrases.push(phrase);
          // Mark all terms in this phrase as processed
          phrase.toLowerCase().split(/\s+/).forEach(t => processedTerms.add(t));
        }
      }

      if (cluster.memberPhrases.length > 0) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Generate hierarchical topics from clusters
   */
  private generateHierarchicalTopics(
    clusters: TopicCluster[],
    content: string
  ): TopicCluster[] {
    const topics: TopicCluster[] = [];
    const contentLower = content.toLowerCase();

    // Check against known topic hierarchy
    for (const [category, subtopics] of Object.entries(this.topicHierarchy)) {
      for (const subtopic of subtopics) {
        const subtopicTerms = subtopic.split(/\s+/);
        let matchScore = 0;

        // Check if subtopic terms appear in clusters or content
        for (const term of subtopicTerms) {
          if (clusters.some(c => c.label.includes(term))) {
            matchScore += 2;
          }
          if (contentLower.includes(term)) {
            matchScore += 1;
          }
        }

        if (matchScore > 0) {
          topics.push({
            label: subtopic,
            confidence: Math.min(1, matchScore / (subtopicTerms.length * 3)),
            memberPhrases: clusters
              .filter(c => subtopicTerms.some(t => c.label.includes(t)))
              .flatMap(c => c.memberPhrases)
          });
        }
      }
    }

    // Add cluster-based topics not in hierarchy
    for (const cluster of clusters) {
      if (!topics.some(t => t.label.includes(cluster.label))) {
        // Create more specific topic labels from clusters
        const specificLabel = this.generateSpecificLabel(cluster);
        topics.push({
          ...cluster,
          label: specificLabel
        });
      }
    }

    return topics;
  }

  /**
   * Generate specific topic label from cluster
   */
  private generateSpecificLabel(cluster: TopicCluster): string {
    // Combine high-value terms from member phrases
    const terms = new Set<string>();

    for (const phrase of cluster.memberPhrases.slice(0, 3)) {
      const cleaned = this.cleanMarkdownArtifacts(phrase);
      const words = cleaned.split(/\s+/)
        .filter(w => !this.stopWords.has(w) && w.length > 2);
      words.forEach(w => terms.add(w));
    }

    // Create compound label from terms
    const termArray = Array.from(terms).slice(0, 3);
    if (termArray.length > 1) {
      return termArray.join(' ');
    }

    return cluster.label;
  }

  /**
   * Select diverse topics avoiding redundancy
   */
  private selectDiverseTopics(
    topics: TopicCluster[],
    maxTopics: number,
    diversityThreshold: number
  ): TopicCluster[] {
    // Sort by confidence
    const sorted = topics.sort((a, b) => b.confidence - a.confidence);
    const selected: TopicCluster[] = [];

    for (const topic of sorted) {
      // Check similarity with already selected topics
      const isDiverse = selected.every(s =>
        this.calculateSimilarity(topic.label, s.label) < diversityThreshold
      );

      if (isDiverse) {
        selected.push(topic);
        if (selected.length >= maxTopics) break;
      }
    }

    return selected;
  }

  /**
   * Calculate similarity between two topic labels
   */
  private calculateSimilarity(label1: string, label2: string): number {
    const terms1 = new Set(label1.toLowerCase().split(/\s+/));
    const terms2 = new Set(label2.toLowerCase().split(/\s+/));

    const intersection = new Set([...terms1].filter(t => terms2.has(t)));
    const union = new Set([...terms1, ...terms2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Calculate overall topic confidence
   */
  private calculateTopicConfidence(
    topics: TopicCluster[],
    termFrequency: Map<string, number>
  ): number {
    if (topics.length === 0) return 0;

    const avgConfidence = topics.reduce((sum, t) => sum + t.confidence, 0) / topics.length;
    const coverage = topics.length / 10; // Normalize by target topic count

    return Math.min(1, avgConfidence * 0.7 + coverage * 0.3);
  }

  /**
   * Extract section-specific topics from content chunks
   */
  extractSectionTopics(
    content: string,
    sectionContext: string,
    keyPhrases: string[]
  ): string[] {
    // Extract topics specific to this section
    const sectionTopics = this.extractTopics(keyPhrases, content, {
      maxTopics: 5,
      minConfidence: 0.4,
      cleanMarkdown: true
    });

    // Add context-aware refinement
    const contextualTopics = this.refineWithContext(
      sectionTopics.primary,
      sectionContext
    );

    return contextualTopics;
  }

  /**
   * Refine topics based on section context
   */
  private refineWithContext(topics: string[], context: string): string[] {
    const refined: string[] = [];

    for (const topic of topics) {
      // Add context prefix if applicable
      if (context.includes('implementation') && !topic.includes('implementation')) {
        refined.push(`${topic} implementation`);
      } else if (context.includes('architecture') && !topic.includes('architecture')) {
        refined.push(`${topic} architecture`);
      } else if (context.includes('testing') && !topic.includes('testing')) {
        refined.push(`${topic} testing`);
      } else {
        refined.push(topic);
      }
    }

    return refined;
  }
}

/**
 * Factory function for creating enhanced topic clustering service
 */
export function createTopicClusteringService(logger: ILoggingService): EnhancedTopicClusteringService {
  return new EnhancedTopicClusteringService(logger);
}