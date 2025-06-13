/**
 * Summary Service Implementation
 * 
 * Implements GetDocSummary and BatchDocSummary gRPC service methods
 */

import * as grpc from '@grpc/grpc-js';
import { folder_mcp } from '../../generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  IChunkingService,
  SERVICE_TOKENS 
} from '../../di/interfaces.js';
import { mapDomainErrorToGrpcStatus, createMissingFieldError, createOutOfRangeError } from '../utils/error-mapper.js';
import { AuthInterceptor } from '../auth/index.js';

/**
 * Summary service implementation
 */
export class SummaryService {
  private logger: ILoggingService;
  private fileSystemService: IFileSystemService;
  private chunkingService: IChunkingService;

  constructor(
    container: IDependencyContainer,
    private authInterceptor?: AuthInterceptor
  ) {
    this.logger = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);
    this.fileSystemService = container.resolve<IFileSystemService>(SERVICE_TOKENS.FILE_SYSTEM);
    this.chunkingService = container.resolve<IChunkingService>(SERVICE_TOKENS.CHUNKING);
  }

  /**
   * Get single document summary
   */
  async getDocSummary(
    call: grpc.ServerUnaryCall<folder_mcp.IGetDocSummaryRequest, folder_mcp.IGetDocSummaryResponse>,
    callback: grpc.sendUnaryData<folder_mcp.IGetDocSummaryResponse>
  ): Promise<void> {
    try {
      // Check authentication if required
      const authError = await this.checkAuthentication(call);
      if (authError) {
        callback(authError);
        return;
      }

      const request = call.request;
      const startTime = Date.now();
      
      this.logger.info('GetDocSummary request received', {
        documentId: request.documentId,
        mode: request.mode,
        maxTokens: request.maxTokens
      });

      // Validate request
      const validationError = this.validateGetDocSummaryRequest(request);
      if (validationError) {
        callback(validationError);
        return;
      }

      const executionTime = Date.now() - startTime;
      
      // Generate real document summary
      try {
        // Check if document exists
        if (!this.fileSystemService.exists(request.documentId || '')) {
          const response: folder_mcp.IGetDocSummaryResponse = {
            summary: '',
            mode: request.mode || folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF,
            tokenCount: 0,
            sourceRanges: [],
            status: {
              success: false,
              requestId: this.generateRequestId(),
              processingTimeMs: Date.now() - startTime,
              errors: [{
                code: folder_mcp.ErrorCode.ERROR_CODE_NOT_FOUND,
                message: `Document not found: ${request.documentId}`,
                field: 'documentId'
              }],
              warnings: []
            }
          };
          callback(null, response);
          return;
        }

        // Read document content
        const content = await this.fileSystemService.readFile(request.documentId || '');
        const extension = require('path').extname(request.documentId || '').toLowerCase();
        const stats = require('fs').statSync(request.documentId);
        
        // Create parsed content for processing
        const textMetadata = {
          originalPath: request.documentId || '',
          type: extension.slice(1) as 'txt' | 'md',
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          lines: content.split('\n').length
        };

        const parsedContent = {
          content: content,
          type: extension.slice(1),
          originalPath: request.documentId || '',
          metadata: textMetadata
        };

        // Generate summary based on mode
        let summary = '';
        let tokenCount = 0;
        const sourceRanges: any[] = [];
        
        switch (request.mode || folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF) {
          case folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF:
            // Brief summary - first paragraph or chunk
            summary = this.generateBriefSummary(content, request.maxTokens || 150);
            break;
            
          case folder_mcp.SummaryMode.SUMMARY_MODE_DETAILED:
            // Detailed summary - key sections
            summary = this.generateDetailedSummary(content, request.maxTokens || 500);
            break;
            
          case folder_mcp.SummaryMode.SUMMARY_MODE_EXECUTIVE:
            // Executive summary - high-level overview
            summary = this.generateExecutiveSummary(content, request.maxTokens || 300);
            break;
            
          case folder_mcp.SummaryMode.SUMMARY_MODE_TECHNICAL:
            // Technical summary - technical details
            summary = this.generateTechnicalSummary(content, request.maxTokens || 400);
            break;
            
          default:
            summary = this.generateBriefSummary(content, request.maxTokens || 150);
        }

        tokenCount = this.chunkingService.estimateTokenCount(summary);

        // Track source ranges (simplified for now)
        if (summary.length > 0) {
          sourceRanges.push({
            startChar: 0,
            endChar: Math.min(content.length, 1000),
            relevanceScore: 1.0
          });
        }

        const response: folder_mcp.IGetDocSummaryResponse = {
          summary: summary,
          mode: request.mode || folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF,
          tokenCount: tokenCount,
          sourceRanges: sourceRanges,
          status: {
            success: true,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [],
            warnings: tokenCount > (request.maxTokens || 500) ? [
              `Summary exceeds requested token limit (${tokenCount} > ${request.maxTokens})`
            ] : []
          }
        };

        this.logger.info('GetDocSummary completed', {
          documentId: request.documentId,
          mode: request.mode,
          tokenCount: tokenCount,
          summaryLength: summary.length,
          executionTimeMs: Date.now() - startTime
        });

        callback(null, response);
      } catch (error) {
        this.logger.error('Failed to generate document summary', error instanceof Error ? error : new Error(String(error)));
        const response: folder_mcp.IGetDocSummaryResponse = {
          summary: '',
          mode: request.mode || folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF,
          tokenCount: 0,
          sourceRanges: [],
          status: {
            success: false,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [{
              code: folder_mcp.ErrorCode.ERROR_CODE_INTERNAL_ERROR,
              message: error instanceof Error ? error.message : String(error),
              field: 'documentId'
            }],
            warnings: []
          }
        };
        callback(null, response);
      }
    } catch (error) {
      this.logger.error('GetDocSummary error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = mapDomainErrorToGrpcStatus(error instanceof Error ? error : new Error(String(error)));
      callback(grpcError);
    }
  }

  /**
   * Get batch document summaries
   */
  async batchDocSummary(
    call: grpc.ServerUnaryCall<folder_mcp.IBatchDocSummaryRequest, folder_mcp.IBatchDocSummaryResponse>,
    callback: grpc.sendUnaryData<folder_mcp.IBatchDocSummaryResponse>
  ): Promise<void> {
    try {
      // Check authentication if required
      const authError = await this.checkAuthentication(call);
      if (authError) {
        callback(authError);
        return;
      }

      const request = call.request;
      const startTime = Date.now();
      
      this.logger.info('BatchDocSummary request received', {
        documentIds: request.documentIds,
        mode: request.mode,
        maxTotalTokens: request.maxTotalTokens
      });

      // Validate request
      const validationError = this.validateBatchDocSummaryRequest(request);
      if (validationError) {
        callback(validationError);
        return;
      }

      const executionTime = Date.now() - startTime;
      
      // Process real batch document summaries
      try {
        const summaries: any[] = [];
        let totalTokenCount = 0;
        const maxTotalTokens = request.maxTotalTokens || 2000;
        const mode = request.mode || folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF;
        
        for (const documentId of request.documentIds || []) {
          try {
            // Check if document exists
            if (!this.fileSystemService.exists(documentId)) {
              summaries.push({
                documentId: documentId,
                summary: '',
                tokenCount: 0,
                sourceRanges: [],
                error: `Document not found: ${documentId}`
              });
              continue;
            }

            // Read document content
            const content = await this.fileSystemService.readFile(documentId);
            
            // Calculate remaining tokens for this document
            const remainingTokens = maxTotalTokens - totalTokenCount;
            if (remainingTokens <= 50) {
              summaries.push({
                documentId: documentId,
                summary: '',
                tokenCount: 0,
                sourceRanges: [],
                error: 'Token limit reached'
              });
              break;
            }

            // Generate summary with available tokens
            const maxTokensPerDoc = Math.min(remainingTokens, 500); // Max 500 tokens per doc
            let summary = '';
            
            switch (mode) {
              case folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF:
                summary = this.generateBriefSummary(content, maxTokensPerDoc);
                break;
              case folder_mcp.SummaryMode.SUMMARY_MODE_DETAILED:
                summary = this.generateDetailedSummary(content, maxTokensPerDoc);
                break;
              case folder_mcp.SummaryMode.SUMMARY_MODE_EXECUTIVE:
                summary = this.generateExecutiveSummary(content, maxTokensPerDoc);
                break;
              case folder_mcp.SummaryMode.SUMMARY_MODE_TECHNICAL:
                summary = this.generateTechnicalSummary(content, maxTokensPerDoc);
                break;
              default:
                summary = this.generateBriefSummary(content, maxTokensPerDoc);
            }

            const tokenCount = this.chunkingService.estimateTokenCount(summary);
            totalTokenCount += tokenCount;

            summaries.push({
              documentId: documentId,
              summary: summary,
              tokenCount: tokenCount,
              sourceRanges: summary.length > 0 ? [{
                startChar: 0,
                endChar: Math.min(content.length, 500),
                relevanceScore: 1.0
              }] : []
            });

          } catch (error) {
            this.logger.warn(`Failed to process document ${documentId}`, { error: error instanceof Error ? error.message : String(error) });
            summaries.push({
              documentId: documentId,
              summary: '',
              tokenCount: 0,
              sourceRanges: [],
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        const response: folder_mcp.IBatchDocSummaryResponse = {
          summaries: summaries,
          totalTokens: totalTokenCount,
          status: {
            success: true,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [],
            warnings: totalTokenCount > maxTotalTokens ? [
              `Total tokens exceeded limit (${totalTokenCount} > ${maxTotalTokens})`
            ] : []
          }
        };

        this.logger.info('BatchDocSummary completed', {
          documentsRequested: request.documentIds?.length || 0,
          documentsProcessed: summaries.filter(s => !s.error).length,
          totalTokens: totalTokenCount,
          executionTimeMs: Date.now() - startTime
        });

        callback(null, response);
      } catch (error) {
        this.logger.error('Failed to process batch document summaries', error instanceof Error ? error : new Error(String(error)));
        const response: folder_mcp.IBatchDocSummaryResponse = {
          summaries: [],
          totalTokens: 0,
          status: {
            success: false,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [{
              code: folder_mcp.ErrorCode.ERROR_CODE_INTERNAL_ERROR,
              message: error instanceof Error ? error.message : String(error),
              field: 'documentIds'
            }],
            warnings: []
          }
        };
        callback(null, response);
      }
    } catch (error) {
      this.logger.error('BatchDocSummary error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = mapDomainErrorToGrpcStatus(error instanceof Error ? error : new Error(String(error)));
      callback(grpcError);
    }
  }

  /**
   * Check authentication if required (local transport doesn't require auth)
   */
  private async checkAuthentication(call: grpc.ServerUnaryCall<any, any>): Promise<grpc.ServiceError | null> {
    // For local transport, no authentication required
    // Authentication is handled by filesystem permissions
    return null;
  }

  /**
   * Validate GetDocSummary request
   */
  private validateGetDocSummaryRequest(request: folder_mcp.IGetDocSummaryRequest): grpc.ServiceError | null {
    // Document ID is required
    if (!request.documentId || request.documentId.trim() === '') {
      return createMissingFieldError('documentId');
    }

    // Max tokens validation
    if (request.maxTokens !== undefined && request.maxTokens !== null) {
      if (request.maxTokens < 50 || request.maxTokens > 2000) {
        return createOutOfRangeError('maxTokens', request.maxTokens, 50, 2000);
      }
    }

    return null;
  }

  /**
   * Validate BatchDocSummary request
   */
  private validateBatchDocSummaryRequest(request: folder_mcp.IBatchDocSummaryRequest): grpc.ServiceError | null {
    // Document IDs are required
    if (!request.documentIds || request.documentIds.length === 0) {
      return createMissingFieldError('documentIds');
    }

    // Max batch size validation
    if (request.documentIds.length > 50) {
      return createOutOfRangeError('documentIds', request.documentIds.length, 1, 50);
    }

    // Max total tokens validation
    if (request.maxTotalTokens !== undefined && request.maxTotalTokens !== null) {
      if (request.maxTotalTokens < 100 || request.maxTotalTokens > 10000) {
        return createOutOfRangeError('maxTotalTokens', request.maxTotalTokens, 100, 10000);
      }
    }

    return null;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `sum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate brief summary (first paragraph or key sentences)
   */
  private generateBriefSummary(content: string, maxTokens: number): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let summary = '';
    let tokenCount = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.chunkingService.estimateTokenCount(sentence);
      if (tokenCount + sentenceTokens <= maxTokens) {
        summary += sentence.trim() + '. ';
        tokenCount += sentenceTokens;
      } else {
        break;
      }
    }
    
    return summary.trim() || content.substring(0, Math.min(content.length, maxTokens * 4)).trim() + '...';
  }

  /**
   * Generate detailed summary (key sections and main points)
   */
  private generateDetailedSummary(content: string, maxTokens: number): string {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    let summary = '';
    let tokenCount = 0;
    
    // Take first few paragraphs that fit within token limit
    for (const paragraph of paragraphs) {
      const paragraphTokens = this.chunkingService.estimateTokenCount(paragraph);
      if (tokenCount + paragraphTokens <= maxTokens) {
        summary += paragraph.trim() + '\n\n';
        tokenCount += paragraphTokens;
      } else {
        // Try to add partial paragraph if possible
        const remainingTokens = maxTokens - tokenCount;
        if (remainingTokens > 20) {
          const partialText = paragraph.substring(0, remainingTokens * 4);
          summary += partialText.trim() + '...';
        }
        break;
      }
    }
    
    return summary.trim() || this.generateBriefSummary(content, maxTokens);
  }

  /**
   * Generate executive summary (high-level overview)
   */
  private generateExecutiveSummary(content: string, maxTokens: number): string {
    // Look for headings, bullet points, or key phrases
    const lines = content.split('\n');
    const keyLines: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Identify potential key sections
      if (trimmedLine.length > 10 && (
        trimmedLine.startsWith('#') || // Markdown headers
        trimmedLine.startsWith('*') || // Bullet points
        trimmedLine.startsWith('-') || // Dash points
        trimmedLine.includes(':') || // Key-value pairs
        /^[A-Z][^.]*[.!?]$/.test(trimmedLine) // Important sentences
      )) {
        keyLines.push(trimmedLine);
      }
    }
    
    let summary = keyLines.join(' ').replace(/[#*-]/g, '').trim();
    
    // If no key lines found, fall back to detailed summary
    if (!summary || summary.length < 50) {
      return this.generateDetailedSummary(content, maxTokens);
    }
    
    // Trim to token limit
    const currentTokens = this.chunkingService.estimateTokenCount(summary);
    if (currentTokens > maxTokens) {
      summary = summary.substring(0, maxTokens * 4) + '...';
    }
    
    return summary;
  }

  /**
   * Generate technical summary (focus on technical details)
   */
  private generateTechnicalSummary(content: string, maxTokens: number): string {
    // Look for technical patterns: code blocks, technical terms, specifications
    const lines = content.split('\n');
    const technicalLines: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 5 && (
        trimmedLine.includes('```') || // Code blocks
        trimmedLine.includes('function') ||
        trimmedLine.includes('class') ||
        trimmedLine.includes('interface') ||
        trimmedLine.includes('import') ||
        trimmedLine.includes('export') ||
        /\b(API|HTTP|JSON|XML|SQL|REST|GraphQL)\b/i.test(trimmedLine) || // Technical terms
        /\b(version|config|parameter|argument|return)\b/i.test(trimmedLine)
      )) {
        technicalLines.push(trimmedLine);
      }
    }
    
    let summary = technicalLines.join(' ').trim();
    
    // If no technical content found, fall back to detailed summary
    if (!summary || summary.length < 50) {
      return this.generateDetailedSummary(content, maxTokens);
    }
    
    // Trim to token limit
    const currentTokens = this.chunkingService.estimateTokenCount(summary);
    if (currentTokens > maxTokens) {
      summary = summary.substring(0, maxTokens * 4) + '...';
    }
    
    return summary;
  }
}
