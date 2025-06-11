// Enhanced search functionality for Step 22: Context Enhancement
import * as path from 'path';
import * as fs from 'fs/promises';
import { VectorSearchResult, VectorIndex } from './index.js';
import { TextChunk } from '../types/index.js';
import type { ILoggingService } from '../di/interfaces.js';

export interface EnhancedSearchResult {
  id: number;
  score: number;
  sourceDocument: string;
  documentType: string;
  contextualChunk: {
    content: string;
    metadata: {
      filePath: string;
      chunkIndex: number;
      startLine: number;
      endLine: number;
      fingerprint: string;
      totalChunks: number;
      documentStructure?: DocumentStructure;
    };
    context: {
      previousChunk?: string;
      nextChunk?: string;
      expandedContent: string;
      paragraphBoundaries: boolean;
    };
  };
}

export interface DocumentStructure {
  documentType: string;
  sections?: Section[];
  slides?: Slide[];
  sheets?: Sheet[];
  outline?: OutlineItem[];
}

export interface Section {
  title: string;
  level: number;
  startPosition: number;
  endPosition: number;
}

export interface Slide {
  slideNumber: number;
  title: string;
  startPosition: number;
  endPosition: number;
}

export interface Sheet {
  name: string;
  startPosition: number;
  endPosition: number;
}

export interface OutlineItem {
  title: string;
  level: number;
  position: number;
}

export interface GroupedSearchResults {
  query: string;
  totalResults: number;
  documentsSearched: number;
  documentGroups: DocumentGroup[];
}

export interface DocumentGroup {
  sourceDocument: string;
  documentType: string;
  resultCount: number;
  relevanceScore: number; // Highest score among results in this document
  results: EnhancedSearchResult[];
  documentStructure?: DocumentStructure;
}

export class EnhancedVectorSearch {
  private vectorIndex: VectorIndex;
  private cacheDir: string;
  private embeddingsDir: string;
  private loggingService: ILoggingService | undefined;

  constructor(vectorIndex: VectorIndex, cacheDir: string, loggingService?: ILoggingService | undefined) {
    this.vectorIndex = vectorIndex;
    this.cacheDir = cacheDir;
    this.embeddingsDir = path.join(cacheDir, 'embeddings');
    this.loggingService = loggingService;
  }

  /**
   * Perform enhanced search with context, grouping, and deduplication
   */
  async searchWithContext(
    queryVector: number[],
    k: number = 5,
    threshold: number = 0.0,
    includeContext: boolean = true
  ): Promise<GroupedSearchResults> {
    try {
      // Perform basic vector search
      const basicResults = await this.vectorIndex.search(queryVector, k * 2); // Get more results for deduplication
      
      // Filter by threshold
      const filteredResults = basicResults.filter(result => result.score >= threshold);
      
      // Enhance each result with context
      const enhancedResults: EnhancedSearchResult[] = [];
      for (const result of filteredResults) {
        try {
          const enhanced = await this.enhanceResult(result, includeContext);
          if (enhanced) {
            enhancedResults.push(enhanced);
          }
        } catch (error) {
          if (this.loggingService) {
            this.loggingService.warn(`Failed to enhance result: ${(error instanceof Error ? error.message : String(error))}`);
          } else {
            console.warn('Failed to enhance result:', error);
          }
        }
      }

      // Group by document and deduplicate
      const groupedResults = await this.groupAndDeduplicateResults(enhancedResults, k);

      return {
        query: '', // Will be set by caller
        totalResults: enhancedResults.length,
        documentsSearched: groupedResults.length,
        documentGroups: groupedResults
      };
    } catch (error) {
      if (this.loggingService) {
        this.loggingService.error(`Search failed: ${(error instanceof Error ? error.message : String(error))}`);
      } else {
        console.error('Search failed:', error);
      }
      throw error;
    }
  }

  /**
   * Enhance a single search result with context and structure
   */
  private async enhanceResult(
    result: VectorSearchResult,
    includeContext: boolean
  ): Promise<EnhancedSearchResult | null> {
    try {
      const filePath = result.chunk.metadata.filePath;
      const chunkIndex = result.chunk.metadata.chunkIndex;
      const fingerprint = result.chunk.metadata.fingerprint;

      // Get document structure
      const documentStructure = await this.extractDocumentStructure(filePath, fingerprint);

      // Get context chunks (previous/next)
      const context = includeContext 
        ? await this.getContextualChunks(fingerprint, chunkIndex)
        : { expandedContent: result.chunk.content, paragraphBoundaries: true };

      // Get document type
      const documentType = this.getDocumentType(filePath);

      return {
        id: result.id,
        score: result.score,
        sourceDocument: filePath,
        documentType: documentType,
        contextualChunk: {
          content: result.chunk.content,
          metadata: {
            ...result.chunk.metadata,
            totalChunks: documentStructure?.outline?.length || 1,
            ...(documentStructure && { documentStructure })
          },
          context: context
        }
      };
    } catch (error) {
      if (this.loggingService) {
        this.loggingService.warn(`Failed to enhance result for ${result.chunk.metadata.filePath}: ${(error instanceof Error ? error.message : String(error))}`);
      } else {
        console.warn(`Failed to enhance result for ${result.chunk.metadata.filePath}:`, error);
      }
      return null;
    }
  }

  /**
   * Get contextual chunks (previous/next) and expand to paragraph boundaries
   */
  private async getContextualChunks(
    fingerprint: string,
    chunkIndex: number
  ): Promise<{ previousChunk?: string; nextChunk?: string; expandedContent: string; paragraphBoundaries: boolean }> {
    try {
      // Load current chunk
      const currentChunkPath = path.join(this.embeddingsDir, `${fingerprint}_chunk_${chunkIndex}.json`);
      const currentData = JSON.parse(await fs.readFile(currentChunkPath, 'utf-8'));
      
      let expandedContent = currentData.chunk.content;
      let previousChunk: string | undefined;
      let nextChunk: string | undefined;

      // Try to load previous chunk
      if (chunkIndex > 0) {
        try {
          const prevChunkPath = path.join(this.embeddingsDir, `${fingerprint}_chunk_${chunkIndex - 1}.json`);
          const prevData = JSON.parse(await fs.readFile(prevChunkPath, 'utf-8'));
          previousChunk = prevData.chunk.content;
        } catch (error) {
          if (this.loggingService) {
            this.loggingService.debug(`Previous chunk not found for ${fingerprint}_${chunkIndex - 1}`);
          }
        }
      }

      // Try to load next chunk
      try {
        const nextChunkPath = path.join(this.embeddingsDir, `${fingerprint}_chunk_${chunkIndex + 1}.json`);
        const nextData = JSON.parse(await fs.readFile(nextChunkPath, 'utf-8'));
        nextChunk = nextData.chunk.content;
      } catch (error) {
        if (this.loggingService) {
          this.loggingService.debug(`Next chunk not found for ${fingerprint}_${chunkIndex + 1}`);
        }
      }

      // Expand content to include context with paragraph boundaries
      const contextParts: string[] = [];
      
      if (previousChunk) {
        // Include last paragraph of previous chunk
        const prevParagraphs = previousChunk.split('\n\n');
        if (prevParagraphs.length > 0) {
          contextParts.push('...' + prevParagraphs[prevParagraphs.length - 1]);
        }
      }

      contextParts.push(currentData.chunk.content);

      if (nextChunk) {
        // Include first paragraph of next chunk
        const nextParagraphs = nextChunk.split('\n\n');
        if (nextParagraphs.length > 0) {
          contextParts.push(nextParagraphs[0] + '...');
        }
      }

      expandedContent = contextParts.join('\n\n');

      return {
        ...(previousChunk && { previousChunk }),
        ...(nextChunk && { nextChunk }),
        expandedContent,
        paragraphBoundaries: true
      };
    } catch (error) {
      if (this.loggingService) {
        this.loggingService.error(`Failed to get contextual chunks for ${fingerprint}_${chunkIndex}: ${(error instanceof Error ? error.message : String(error))}`);
      } else {
        console.error(`Failed to get contextual chunks for ${fingerprint}_${chunkIndex}:`, error);
      }
      return {
        expandedContent: '',
        paragraphBoundaries: false
      };
    }
  }

  /**
   * Extract document structure based on document type
   */
  private async extractDocumentStructure(filePath: string, fingerprint: string): Promise<DocumentStructure | undefined> {
    try {
      const documentType = this.getDocumentType(filePath);
      
      // Load the original metadata to extract structure
      const metadataPath = path.join(this.cacheDir, 'metadata', `${fingerprint}.json`);
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      const structure: DocumentStructure = {
        documentType: documentType
      };

      switch (documentType) {
        case 'powerpoint':
          structure.slides = this.extractSlideStructure(metadata);
          break;
        case 'word':
          structure.sections = this.extractSectionStructure(metadata);
          break;
        case 'excel':
          structure.sheets = this.extractSheetStructure(metadata);
          break;
        default:
          structure.outline = this.extractBasicOutline(metadata);
      }

      return structure;
    } catch (error) {
      if (this.loggingService) {
        this.loggingService.warn(`Failed to extract document structure for ${filePath}: ${(error instanceof Error ? error.message : String(error))}`);
      } else {
        console.warn(`Failed to extract document structure for ${filePath}:`, error);
      }
      return undefined;
    }
  }

  /**
   * Extract slide structure from PowerPoint metadata
   */
  private extractSlideStructure(metadata: Record<string, unknown>): Slide[] {
    // This would be enhanced based on the actual PowerPoint parsing metadata
    const slides: Slide[] = [];
    
    if (metadata.content && typeof metadata.content === 'string') {
      const slideMatches = metadata.content.match(/=== Slide (\d+) ===(.*?)(?==== Slide \d+ ===|$)/gs);
      
      if (slideMatches) {
        slideMatches.forEach((match: string, index: number) => {
          const slideNumber = index + 1;
          const titleMatch = match.match(/=== Slide \d+ ===\s*([^\n]+)/);
          const title = titleMatch?.[1]?.trim() || `Slide ${slideNumber}`;
          
          slides.push({
            slideNumber,
            title,
            startPosition: (metadata.content as string).indexOf(match),
            endPosition: (metadata.content as string).indexOf(match) + match.length
          });
        });
      }
    }
    
    return slides;
  }

  /**
   * Extract section structure from Word documents
   */
  private extractSectionStructure(metadata: Record<string, unknown>): Section[] {
    // This would be enhanced based on the actual Word parsing metadata
    const sections: Section[] = [];
    
    if (metadata.content && typeof metadata.content === 'string') {
      // Look for header patterns (this could be improved with actual heading metadata)
      const headerMatches = metadata.content.match(/^(#{1,6}|\*\*[^*]+\*\*|[A-Z][^a-z\n]{10,})/gm);
      
      if (headerMatches) {
        headerMatches.forEach((header: string, index: number) => {
          const level = header.startsWith('#') ? header.match(/^#+/)?.[0].length || 1 : 1;
          const title = header.replace(/^#+\s*|\*\*/g, '').trim();
          const position = (metadata.content as string).indexOf(header);
          
          sections.push({
            title,
            level,
            startPosition: position,
            endPosition: position + header.length
          });
        });
      }
    }
    
    return sections;
  }

  /**
   * Extract sheet structure from Excel files
   */
  private extractSheetStructure(metadata: Record<string, unknown>): Sheet[] {
    // This would be enhanced based on the actual Excel parsing metadata
    const sheets: Sheet[] = [];
    
    if (metadata.sheets && Array.isArray(metadata.sheets)) {
      metadata.sheets.forEach((sheet: Record<string, unknown>, index: number) => {
        sheets.push({
          name: (typeof sheet.name === 'string' && sheet.name) || `Sheet ${index + 1}`,
          startPosition: 0, // Would be calculated based on actual sheet data
          endPosition: 0    // Would be calculated based on actual sheet data
        });
      });
    }
    
    return sheets;
  }

  /**
   * Extract basic outline for text files
   */
  private extractBasicOutline(metadata: Record<string, unknown>): OutlineItem[] {
    const outline: OutlineItem[] = [];
    
    if (metadata.content && typeof metadata.content === 'string') {
      // Simple outline extraction based on line structure
      const lines = metadata.content.split('\n');
      let position = 0;
      
      lines.forEach((line: string, index: number) => {
        if (line.trim().length > 0 && (line.match(/^[A-Z]/) || line.includes(':'))) {
          outline.push({
            title: line.trim().substring(0, 50) + (line.length > 50 ? '...' : ''),
            level: 1,
            position: position
          });
        }
        position += line.length + 1; // +1 for newline
      });
    }
    
    return outline;
  }

  /**
   * Group results by document and deduplicate overlapping chunks
   */
  private async groupAndDeduplicateResults(
    enhancedResults: EnhancedSearchResult[],
    maxResults: number
  ): Promise<DocumentGroup[]> {
    try {
      // Group by source document
      const documentGroups = new Map<string, EnhancedSearchResult[]>();
      
      enhancedResults.forEach(result => {
        const key = result.sourceDocument;
        if (!documentGroups.has(key)) {
          documentGroups.set(key, []);
        }
        documentGroups.get(key)!.push(result);
      });

      // Process each document group
      const processedGroups: DocumentGroup[] = [];
      
      for (const [sourceDocument, results] of documentGroups) {
        try {
          // Sort by score descending
          results.sort((a, b) => b.score - a.score);
          
          // Deduplicate overlapping chunks
          const deduplicatedResults = this.deduplicateResults(results);
          
          // Take only the top results per document
          const topResults = deduplicatedResults.slice(0, Math.min(3, maxResults)); // Max 3 results per document
          
          if (topResults.length > 0 && topResults[0]) {
            processedGroups.push({
              sourceDocument: sourceDocument,
              documentType: topResults[0].documentType,
              resultCount: topResults.length,
              relevanceScore: topResults[0].score,
              results: topResults,
              ...(topResults[0].contextualChunk.metadata.documentStructure && {
                documentStructure: topResults[0].contextualChunk.metadata.documentStructure
              })
            });
          }
        } catch (error) {
          if (this.loggingService) {
            this.loggingService.warn(`Failed to process document group for ${sourceDocument}: ${(error instanceof Error ? error.message : String(error))}`);
          } else {
            console.warn(`Failed to process document group for ${sourceDocument}:`, error);
          }
        }
      }

      // Sort document groups by highest relevance score
      processedGroups.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Return top document groups up to maxResults total results
      const finalGroups: DocumentGroup[] = [];
      let totalResults = 0;
      
      for (const group of processedGroups) {
        if (totalResults >= maxResults) break;
        
        const remainingSlots = maxResults - totalResults;
        if (group.results.length <= remainingSlots) {
          finalGroups.push(group);
          totalResults += group.results.length;
        } else {
          // Truncate results to fit remaining slots
          finalGroups.push({
            ...group,
            results: group.results.slice(0, remainingSlots),
            resultCount: remainingSlots
          });
          totalResults = maxResults;
        }
      }

      return finalGroups;
    } catch (error) {
      if (this.loggingService) {
        this.loggingService.error(`Failed to group and deduplicate results: ${(error instanceof Error ? error.message : String(error))}`);
      } else {
        console.error('Failed to group and deduplicate results:', error);
      }
      throw error;
    }
  }

  /**
   * Deduplicate overlapping results within the same document
   */
  private deduplicateResults(results: EnhancedSearchResult[]): EnhancedSearchResult[] {
    if (results.length <= 1) return results;

    const deduplicated: EnhancedSearchResult[] = [];
    
    for (const result of results) {
      let isOverlapping = false;
      
      for (const existing of deduplicated) {
        if (this.areChunksOverlapping(result, existing)) {
          isOverlapping = true;
          // Keep the one with higher score
          if (result.score > existing.score) {
            // Replace existing with current result
            const index = deduplicated.indexOf(existing);
            deduplicated[index] = result;
          }
          break;
        }
      }
      
      if (!isOverlapping) {
        deduplicated.push(result);
      }
    }

    return deduplicated;
  }

  /**
   * Check if two chunks are overlapping
   */
  private areChunksOverlapping(result1: EnhancedSearchResult, result2: EnhancedSearchResult): boolean {
    const chunk1 = result1.contextualChunk;
    const chunk2 = result2.contextualChunk;
    
    // Same file and adjacent or overlapping chunk indices
    if (chunk1.metadata.filePath === chunk2.metadata.filePath) {
      const indexDiff = Math.abs(chunk1.metadata.chunkIndex - chunk2.metadata.chunkIndex);
      return indexDiff <= 1; // Adjacent or same chunks are considered overlapping
    }
    
    return false;
  }

  /**
   * Get document type from file extension
   */
  private getDocumentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.pdf': return 'pdf';
      case '.docx': case '.doc': return 'word';
      case '.xlsx': case '.xls': return 'excel';
      case '.pptx': case '.ppt': return 'powerpoint';
      case '.txt': return 'text';
      case '.md': return 'markdown';
      default: return 'unknown';
    }
  }
}

/**
 * Create enhanced search instance
 */
export async function createEnhancedSearch(vectorIndex: VectorIndex, cacheDir: string): Promise<EnhancedVectorSearch> {
  return new EnhancedVectorSearch(vectorIndex, cacheDir);
}
