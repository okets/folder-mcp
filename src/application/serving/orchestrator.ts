/**
 * Content Serving Orchestrator
 * 
 * Orchestrates content serving workflows including file retrieval,
 * search operations, and knowledge base queries.
 */

import { 
  ContentServingWorkflow,
  FileContentResult,
  KnowledgeSearchResult,
  FileListResult,
  ServerStatus,
  FileServingMetadata
} from './index.js';

// Domain service interfaces
import { 
  IFileParsingService,
  ICacheService,
  IVectorSearchService,
  ILoggingService,
  IConfigurationService,
  IEmbeddingService
} from '../../di/interfaces.js';

// Domain types
import { ParsedContent } from '../../types/index.js';

export class ContentServingOrchestrator implements ContentServingWorkflow {
  private serverStartTime: Date;
  private requestCount: number = 0;

  constructor(
    private readonly fileParsingService: IFileParsingService,
    private readonly cacheService: ICacheService,
    private readonly vectorSearchService: IVectorSearchService,
    private readonly loggingService: ILoggingService,
    private readonly configService: IConfigurationService,
    private readonly embeddingService: IEmbeddingService
  ) {
    this.serverStartTime = new Date();
  }

  async getFileContent(filePath: string): Promise<FileContentResult> {
    this.incrementRequestCount();
    this.loggingService.debug('Retrieving file content', { filePath });

    try {
      // Parse the file to get its content
      const fileType = this.getFileType(filePath);
      const parsedContent = await this.fileParsingService.parseFile(filePath, fileType);
      
      // Create metadata object
      const metadata: FileServingMetadata = {
        size: parsedContent.metadata?.size || 0,
        lastModified: parsedContent.metadata?.lastModified ? new Date(parsedContent.metadata.lastModified) : new Date(),
        contentType: parsedContent.metadata?.type || fileType,
        encoding: 'utf-8',
        isIndexed: false
      };

      return {
        success: true,
        content: parsedContent.content,
        metadata
      };

    } catch (error) {
      this.loggingService.error('Failed to retrieve file content', error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async searchKnowledge(query: string, options: any = {}): Promise<KnowledgeSearchResult> {
    this.incrementRequestCount();
    this.loggingService.debug('Performing knowledge search', { query, options });

    const startTime = Date.now();

    try {
      // Generate query embedding first
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);
      
      // Perform vector similarity search
      const searchResults = await this.vectorSearchService.search(
        queryEmbedding,
        options.maxResults || 10,
        options.threshold || 0.0
      );

      const processingTime = Date.now() - startTime;

      // Transform search results to knowledge search format
      const results = searchResults.map((result: any) => ({
        filePath: result.filePath,
        content: result.content,
        similarity: result.similarity,
        metadata: result.metadata || {},
        context: options.includeContext ? result.context : undefined
      }));

      this.loggingService.debug('Knowledge search completed', {
        query,
        resultCount: results.length,
        processingTime
      });

      return {
        success: true,
        results,
        totalResults: results.length,
        processingTime,
        query,
        options
      };

    } catch (error) {
      this.loggingService.error('Knowledge search failed', error instanceof Error ? error : new Error(String(error)));
      
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

  async getFileList(pattern?: string): Promise<FileListResult> {
    this.incrementRequestCount();
    this.loggingService.debug('Getting file list', { pattern });

    try {
      // For now, return a basic file list implementation
      // This would need to be implemented with actual file system scanning
      const files: any[] = [];

      return {
        success: true,
        files,
        totalFiles: files.length
      };

    } catch (error) {
      this.loggingService.error('Failed to get file list', error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        files: [],
        totalFiles: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getServerStatus(): Promise<ServerStatus> {
    try {
      const uptime = Date.now() - this.serverStartTime.getTime();

      return {
        isRunning: true,
        uptime,
        indexedFiles: 0,
        totalChunks: 0,
        lastIndexUpdate: new Date(),
        memoryUsage: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
        },
        performance: {
          averageSearchTime: 0,
          totalSearches: this.requestCount,
          cacheHitRate: 0,
          errorRate: 0
        }
      };

    } catch (error) {
      this.loggingService.error('Failed to get server status', error instanceof Error ? error : new Error(String(error)));
      
      return {
        isRunning: false,
        uptime: Date.now() - this.serverStartTime.getTime(),
        indexedFiles: 0,
        totalChunks: 0,
        lastIndexUpdate: new Date(),
        memoryUsage: {
          used: 0,
          total: 0,
          percentage: 0
        },
        performance: {
          averageSearchTime: 0,
          totalSearches: 0,
          cacheHitRate: 0,
          errorRate: 100
        }
      };
    }
  }

  private incrementRequestCount(): void {
    this.requestCount++;
  }

  private getFileType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }
}
