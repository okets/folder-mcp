/**
 * Knowledge Operations Service
 * 
 * Provides advanced knowledge base operations including semantic search,
 * enhanced search with context, and related content discovery.
 */

import { 
  KnowledgeOperations,
  KnowledgeSearchResult,
  EnhancedKnowledgeResult,
  RelatedContentResult,
  KnowledgeSearchOptions,
  EnhancedKnowledgeOptions,
  GroupedKnowledgeResults,
  SearchSuggestion
} from './index.js';

// Domain service interfaces
import { 
  IVectorSearchService,
  ICacheService,
  ILoggingService,
  IFileParsingService,
  IEmbeddingService
} from '../../di/interfaces.js';

export class KnowledgeOperationsService implements KnowledgeOperations {
  constructor(
    private readonly vectorSearchService: IVectorSearchService,
    private readonly cacheService: ICacheService,
    private readonly loggingService: ILoggingService,
    private readonly fileParsingService: IFileParsingService,
    private readonly embeddingService: IEmbeddingService
  ) {}

  async semanticSearch(query: string, options: KnowledgeSearchOptions): Promise<KnowledgeSearchResult> {
    this.loggingService.debug('Performing semantic search', { query, options });
    const startTime = Date.now();

    try {
      // Generate query embedding first
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);
      
      const searchResults = await this.vectorSearchService.search(
        queryEmbedding, 
        options.maxResults || 10,
        options.threshold || 0.0
      );

      const results = searchResults.map((result: any) => ({
        filePath: result.filePath,
        content: result.content,
        similarity: result.similarity,
        metadata: result.metadata || {},
        context: options.includeContext ? result.context : undefined,
        chunkIndex: result.chunkIndex,
        relevanceScore: this.calculateRelevanceScore(result.similarity, result.metadata)
      }));

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        results,
        totalResults: results.length,
        processingTime,
        query,
        options
      };

    } catch (error) {
      this.loggingService.error('Semantic search failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        results: [],
        totalResults: 0,
        processingTime: Date.now() - startTime,
        query,
        options
      };
    }
  }

  async enhancedSearch(query: string, options: EnhancedKnowledgeOptions): Promise<EnhancedKnowledgeResult> {
    this.loggingService.debug('Performing enhanced search', { query, options });
    const startTime = Date.now();

    try {
      // Perform basic semantic search first
      const basicResult = await this.semanticSearch(query, options);
      
      if (!basicResult.success) {
        return {
          ...basicResult,
          groupedResults: { byDocument: [], byType: [], byRelevance: [] },
          suggestions: [],
          relatedQueries: []
        };
      }

      // Group results by different criteria
      const groupedResults = await this.groupSearchResults(basicResult.results, options);

      // Generate search suggestions
      const suggestions = await this.generateSearchSuggestions(query, basicResult.results);

      // Find related queries
      const relatedQueries = await this.findRelatedQueries(query, basicResult.results);

      const processingTime = Date.now() - startTime;

      return {
        ...basicResult,
        groupedResults,
        suggestions,
        relatedQueries,
        processingTime
      };

    } catch (error) {
      this.loggingService.error('Enhanced search failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        results: [],
        totalResults: 0,
        processingTime: Date.now() - startTime,
        query,
        options,
        groupedResults: { byDocument: [], byType: [], byRelevance: [] },
        suggestions: [],
        relatedQueries: []
      };
    }
  }

  async getRelatedContent(filePath: string, similarity: number = 0.3): Promise<RelatedContentResult> {
    this.loggingService.debug('Finding related content', { filePath, similarity });

    try {
      // Get the content of the target file
      const fileType = this.getFileType(filePath);
      const targetContent = await this.fileParsingService.parseFile(filePath, fileType);
      
      // Generate embedding for the file content
      const contentEmbedding = await this.embeddingService.generateQueryEmbedding(targetContent.content);
      
      // Use the file content embedding to find similar content
      const searchResults = await this.vectorSearchService.search(
        contentEmbedding,
        20, // Get more results to filter out the target file
        similarity
      );

      // Filter out the original file and limit results
      const relatedItems = searchResults
        .filter((result: any) => result.filePath !== filePath)
        .slice(0, 10)
        .map((result: any) => ({
          filePath: result.filePath,
          similarity: result.similarity,
          relationship: this.determineRelationshipType(result.similarity),
          summary: result.content?.substring(0, 200) + '...'
        }));

      return {
        success: true,
        relatedFiles: relatedItems,
        totalFound: relatedItems.length
      };

    } catch (error) {
      this.loggingService.error('Failed to find related content', error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        relatedFiles: [],
        totalFound: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private calculateRelevanceScore(similarity: number, metadata: any): number {
    let score = similarity;

    // Boost score based on metadata factors
    if (metadata.fileType === 'markdown' || metadata.fileType === 'text') {
      score *= 1.1; // Slight boost for text-based content
    }

    if (metadata.lastModified) {
      const daysSinceModified = (Date.now() - new Date(metadata.lastModified).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified < 30) {
        score *= 1.05; // Boost for recently modified content
      }
    }

    if (metadata.size && metadata.size > 1000) {
      score *= 1.02; // Slight boost for substantial content
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private async groupSearchResults(results: any[], options: EnhancedKnowledgeOptions): Promise<GroupedKnowledgeResults> {
    const byDocument: any[] = [];
    const byType: any[] = [];
    const byRelevance: any[] = [];

    // Group by document
    const documentGroups = new Map<string, any[]>();
    for (const result of results) {
      const filePath = result.filePath;
      if (!documentGroups.has(filePath)) {
        documentGroups.set(filePath, []);
      }
      documentGroups.get(filePath)!.push(result);
    }

    for (const [filePath, groupResults] of documentGroups) {
      byDocument.push({
        filePath,
        items: groupResults,
        documentScore: groupResults.reduce((sum, r) => sum + r.similarity, 0) / groupResults.length,
        documentInfo: {
          title: this.getFileName(filePath),
          size: 0, // Would need to get from metadata
          lastModified: new Date(),
          type: this.getFileType(filePath),
          chunkCount: groupResults.length
        }
      });
    }

    // Group by file type
    const fileTypeGroups = new Map<string, any[]>();
    for (const result of results) {
      const fileType = this.getFileType(result.filePath);
      if (!fileTypeGroups.has(fileType)) {
        fileTypeGroups.set(fileType, []);
      }
      fileTypeGroups.get(fileType)!.push(result);
    }

    for (const [fileType, groupResults] of fileTypeGroups) {
      byType.push({
        fileType,
        items: groupResults,
        typeScore: groupResults.reduce((sum, r) => sum + r.similarity, 0) / groupResults.length
      });
    }

    // Group by relevance ranges
    const highRelevance = results.filter(r => r.similarity >= 0.8);
    const mediumRelevance = results.filter(r => r.similarity >= 0.5 && r.similarity < 0.8);
    const lowRelevance = results.filter(r => r.similarity < 0.5);

    if (highRelevance.length > 0) {
      byRelevance.push({
        relevanceRange: '0.8-1.0',
        items: highRelevance,
        averageScore: highRelevance.reduce((sum, r) => sum + r.similarity, 0) / highRelevance.length
      });
    }

    if (mediumRelevance.length > 0) {
      byRelevance.push({
        relevanceRange: '0.5-0.8',
        items: mediumRelevance,
        averageScore: mediumRelevance.reduce((sum, r) => sum + r.similarity, 0) / mediumRelevance.length
      });
    }

    if (lowRelevance.length > 0) {
      byRelevance.push({
        relevanceRange: '0.0-0.5',
        items: lowRelevance,
        averageScore: lowRelevance.reduce((sum, r) => sum + r.similarity, 0) / lowRelevance.length
      });
    }

    return { byDocument, byType, byRelevance };
  }

  private async generateSearchSuggestions(query: string, results: any[]): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // Extract keywords from top results for suggestions
    const topResults = results.slice(0, 5);
    const keywords = new Set<string>();

    for (const result of topResults) {
      const words = result.content.toLowerCase()
        .split(/\W+/)
        .filter((word: string) => word.length > 3 && !this.isStopWord(word));
      
      words.forEach((word: string) => keywords.add(word));
    }

    // Create suggestions based on extracted keywords
    Array.from(keywords).slice(0, 5).forEach(keyword => {
      suggestions.push({
        suggestion: keyword,
        confidence: 0.7,
        type: 'related'
      });
    });

    // Add query refinement suggestions
    if (results.length > 10) {
      suggestions.push({
        suggestion: `${query} specific`,
        confidence: 0.6,
        type: 'refinement'
      });
    }

    if (results.length < 3) {
      suggestions.push({
        suggestion: query.split(' ').slice(0, -1).join(' '), // Remove last word
        confidence: 0.8,
        type: 'expansion'
      });
    }

    return suggestions;
  }

  private async findRelatedQueries(query: string, results: any[]): Promise<string[]> {
    // Simple related query generation based on results
    const relatedQueries: string[] = [];

    // Extract common terms from results
    const commonTerms = new Set<string>();
    results.slice(0, 3).forEach(result => {
      const words = result.content.toLowerCase()
        .split(/\W+/)
        .filter((word: string) => word.length > 4 && !this.isStopWord(word));
      
      words.forEach((word: string) => commonTerms.add(word));
    });

    // Generate related queries
    Array.from(commonTerms).slice(0, 3).forEach(term => {
      relatedQueries.push(`${term} in context`);
    });

    return relatedQueries;
  }

  private determineRelationshipType(similarity: number): 'content' | 'topic' | 'reference' | 'structure' {
    if (similarity >= 0.8) return 'content';
    if (similarity >= 0.6) return 'topic';
    if (similarity >= 0.4) return 'reference';
    return 'structure';
  }

  private groupByRelationshipStrength(items: any[]) {
    return {
      strong: items.filter(item => item.similarity >= 0.7),
      moderate: items.filter(item => item.similarity >= 0.4 && item.similarity < 0.7),
      weak: items.filter(item => item.similarity < 0.4)
    };
  }

  private getFileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || filePath;
  }

  private getFileType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);
    return stopWords.has(word.toLowerCase());
  }
}
