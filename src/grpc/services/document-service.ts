/**
 * Document Service Implementation
 * 
 * Implements GetDocMetadata, DownloadDoc, and GetChunks gRPC service methods
 */

import * as grpc from '@grpc/grpc-js';
import { folder_mcp } from '../../generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  IChunkingService,
  ICacheService,
  SERVICE_TOKENS 
} from '../../di/interfaces.js';
import { mapDomainErrorToGrpcStatus, createMissingFieldError, createOutOfRangeError } from '../utils/error-mapper.js';
import { AuthInterceptor } from '../auth/index.js';

/**
 * Document service implementation
 */
export class DocumentService {
  private logger: ILoggingService;
  private fileSystemService: IFileSystemService;
  private chunkingService: IChunkingService;
  private cacheService: ICacheService;

  constructor(
    container: IDependencyContainer,
    private authInterceptor?: AuthInterceptor
  ) {
    this.logger = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);
    this.fileSystemService = container.resolve<IFileSystemService>(SERVICE_TOKENS.FILE_SYSTEM);
    this.chunkingService = container.resolve<IChunkingService>(SERVICE_TOKENS.CHUNKING);
    this.cacheService = container.resolve<ICacheService>(SERVICE_TOKENS.CACHE);
  }

  /**
   * Get document metadata
   */
  async getDocMetadata(
    call: grpc.ServerUnaryCall<folder_mcp.IGetDocMetadataRequest, folder_mcp.IGetDocMetadataResponse>,
    callback: grpc.sendUnaryData<folder_mcp.IGetDocMetadataResponse>
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
      
      this.logger.info('GetDocMetadata request received', {
        documentId: request.documentId,
        includeStructure: request.includeStructure
      });

      // Validate request
      const validationError = this.validateGetDocMetadataRequest(request);
      if (validationError) {
        callback(validationError);
        return;
      }

      const executionTime = Date.now() - startTime;
      
      // Get real document metadata from file system
      try {
        // Check if file exists
        if (!this.fileSystemService.exists(request.documentId || '')) {
          const notFoundError = new Error(`Document not found: ${request.documentId}`);
          callback({
            code: grpc.status.NOT_FOUND,
            details: notFoundError.message
          });
          return;
        }

        // Read file content to get metadata
        const content = await this.fileSystemService.readFile(request.documentId || '');
        const stats = require('fs').statSync(request.documentId);
        
        // Determine document type from file extension
        const extension = require('path').extname(request.documentId || '').toLowerCase();
        let documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_UNSPECIFIED;
        
        switch (extension) {
          case '.pdf':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_PDF;
            break;
          case '.docx':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_DOCX;
            break;
          case '.doc':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_DOC;
            break;
          case '.txt':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_TXT;
            break;
          case '.md':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_MD;
            break;
          case '.html':
          case '.htm':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_HTML;
            break;
          case '.csv':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_CSV;
            break;
          case '.xml':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_XML;
            break;
          case '.rtf':
            documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_RTF;
            break;
        }

        const response: folder_mcp.IGetDocMetadataResponse = {
          documentInfo: {
            documentId: request.documentId || '',
            filePath: request.documentId || '',
            filename: require('path').basename(request.documentId || ''),
            title: require('path').basename(request.documentId || '', extension),
            documentType: documentType,
            fileSize: stats.size,
            modifiedDate: stats.mtime.toISOString(),
            createdDate: stats.birthtime?.toISOString() || stats.mtime.toISOString(),
            authors: [],
            pageCount: Math.ceil(content.length / 3000), // Rough estimate
            metadata: {}
          },
          status: {
            success: true,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [],
            warnings: []
          }
        };

        this.logger.info('GetDocMetadata completed', {
          documentId: request.documentId,
          executionTimeMs: Date.now() - startTime,
          fileSize: stats.size,
          documentType: extension
        });

        callback(null, response);
      } catch (fileError) {
        this.logger.error('Failed to retrieve document metadata', fileError instanceof Error ? fileError : new Error(String(fileError)));
        const response: folder_mcp.IGetDocMetadataResponse = {
          documentInfo: {
            documentId: request.documentId || '',
            filePath: request.documentId || '',
            filename: require('path').basename(request.documentId || ''),
            title: `Error: ${request.documentId}`,
            documentType: folder_mcp.DocumentType.DOCUMENT_TYPE_UNSPECIFIED,
            fileSize: 0,
            modifiedDate: new Date().toISOString(),
            createdDate: new Date().toISOString(),
            authors: [],
            pageCount: 0,
            metadata: {}
          },
          status: {
            success: false,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [{
              code: folder_mcp.ErrorCode.ERROR_CODE_INTERNAL_ERROR,
              message: fileError instanceof Error ? fileError.message : String(fileError),
              field: 'documentId'
            }],
            warnings: []
          }
        };
        callback(null, response);
      }
    } catch (error) {
      this.logger.error('GetDocMetadata error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = mapDomainErrorToGrpcStatus(error instanceof Error ? error : new Error(String(error)));
      callback(grpcError);
    }
  }

  /**
   * Download document binary content
   */
  async downloadDoc(
    call: grpc.ServerWritableStream<folder_mcp.IDownloadDocRequest, folder_mcp.IDownloadDocResponse>
  ): Promise<void> {
    try {
      // Check authentication if required
      const authError = await this.checkAuthentication(call as any);
      if (authError) {
        call.emit('error', authError);
        return;
      }

      const request = call.request;
      const startTime = Date.now();
      
      this.logger.info('DownloadDoc request received', {
        documentId: request.documentId,
        format: request.format
      });

      // Validate request
      const validationError = this.validateDownloadDocRequest(request);
      if (validationError) {
        call.emit('error', validationError);
        return;
      }

      // Stream real document content
      try {
        // Check if file exists
        if (!this.fileSystemService.exists(request.documentId || '')) {
          call.emit('error', {
            code: grpc.status.NOT_FOUND,
            details: `Document not found: ${request.documentId}`
          });
          return;
        }

        // Get file stats
        const stats = require('fs').statSync(request.documentId);
        const extension = require('path').extname(request.documentId || '').toLowerCase();
        const filename = require('path').basename(request.documentId || '');
        
        // Determine content type
        let contentType = 'application/octet-stream';
        switch (extension) {
          case '.pdf':
            contentType = 'application/pdf';
            break;
          case '.txt':
            contentType = 'text/plain';
            break;
          case '.html':
          case '.htm':
            contentType = 'text/html';
            break;
          case '.json':
            contentType = 'application/json';
            break;
          case '.csv':
            contentType = 'text/csv';
            break;
          case '.xml':
            contentType = 'application/xml';
            break;
          case '.md':
            contentType = 'text/markdown';
            break;
          case '.docx':
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
          case '.doc':
            contentType = 'application/msword';
            break;
        }

        // Read file in chunks for streaming
        const fs = require('fs');
        const fileStream = fs.createReadStream(request.documentId);
        const chunkSize = 64 * 1024; // 64KB chunks
        let buffer = Buffer.alloc(0);

        fileStream.on('data', (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);
          
          // Send chunks when buffer is large enough
          while (buffer.length >= chunkSize) {
            const chunkToSend = buffer.slice(0, chunkSize);
            buffer = buffer.slice(chunkSize);
            
            const response: folder_mcp.IDownloadDocResponse = {
              chunkData: chunkToSend,
              contentType: contentType,
              totalSize: stats.size,
              filename: filename
            };
            
            call.write(response);
          }
        });

        fileStream.on('end', () => {
          // Send remaining data
          if (buffer.length > 0) {
            const response: folder_mcp.IDownloadDocResponse = {
              chunkData: buffer,
              contentType: contentType,
              totalSize: stats.size,
              filename: filename
            };
            call.write(response);
          }
          
          call.end();
          
          this.logger.info('DownloadDoc completed', {
            documentId: request.documentId,
            executionTimeMs: Date.now() - startTime,
            fileSize: stats.size,
            contentType: contentType
          });
        });

        fileStream.on('error', (error: Error) => {
          this.logger.error('DownloadDoc file stream error', error);
          call.emit('error', {
            code: grpc.status.INTERNAL,
            details: `Failed to read document: ${error.message}`
          });
        });

      } catch (error) {
        this.logger.error('DownloadDoc error', error instanceof Error ? error : new Error(String(error)));
        call.emit('error', {
          code: grpc.status.INTERNAL,
          details: `Failed to download document: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    } catch (error) {
      this.logger.error('DownloadDoc error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = mapDomainErrorToGrpcStatus(error instanceof Error ? error : new Error(String(error)));
      call.emit('error', grpcError);
    }
  }

  /**
   * Get document chunks
   */
  async getChunks(
    call: grpc.ServerUnaryCall<folder_mcp.IGetChunksRequest, folder_mcp.IGetChunksResponse>,
    callback: grpc.sendUnaryData<folder_mcp.IGetChunksResponse>
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
      
      this.logger.info('GetChunks request received', {
        documentId: request.documentId,
        chunkIndices: request.chunkIndices,
        maxTokensPerChunk: request.maxTokensPerChunk
      });

      // Validate request
      const validationError = this.validateGetChunksRequest(request);
      if (validationError) {
        callback(validationError);
        return;
      }

      const executionTime = Date.now() - startTime;
      
      // Get real document chunks
      try {
        // Check if file exists
        if (!this.fileSystemService.exists(request.documentId || '')) {
          const response: folder_mcp.IGetChunksResponse = {
            chunks: [],
            documentId: request.documentId || '',
            totalTokenCount: 0,
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

        // Read and parse document content
        const content = await this.fileSystemService.readFile(request.documentId || '');
        const extension = require('path').extname(request.documentId || '').toLowerCase();
        const stats = require('fs').statSync(request.documentId);
        
        // Create proper parsed content for chunking with compatible metadata
        const textMetadata = {
          originalPath: request.documentId || '',
          type: extension.slice(1) as 'txt' | 'md',
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          lines: content.split('\n').length
        };

        const parsedContent = {
          content: content,
          type: extension.slice(1), // Remove dot from extension
          originalPath: request.documentId || '',
          metadata: textMetadata
        };

        // Chunk the content
        const chunkingResult = await this.chunkingService.chunkText(
          parsedContent,
          request.maxTokensPerChunk || 1000
        );

        // Filter chunks by indices if specified
        let chunksToReturn = chunkingResult.chunks;
        if (request.chunkIndices && request.chunkIndices.length > 0) {
          chunksToReturn = request.chunkIndices.map(index => {
            if (index >= 0 && index < chunkingResult.chunks.length) {
              return chunkingResult.chunks[index];
            }
            return null;
          }).filter(chunk => chunk !== null) as any[];
        }

        // Convert chunks to proto format
        const protoChunks = chunksToReturn.map((chunk, index) => ({
          chunkId: `chunk_${chunk.chunkIndex || index}`,
          chunkIndex: chunk.chunkIndex || index,
          content: chunk.content,
          startOffset: chunk.startPosition || 0,
          endOffset: chunk.endPosition || chunk.content.length,
          tokenCount: chunk.tokenCount,
          metadata: {
            stringValues: {
              sourceFile: chunk.metadata.sourceFile,
              sourceType: chunk.metadata.sourceType
            },
            intValues: {
              chunkIndex: chunk.chunkIndex || index,
              totalChunks: chunk.metadata.totalChunks
            },
            boolValues: {
              hasOverlap: chunk.metadata.hasOverlap
            }
          }
        }));

        const totalTokenCount = protoChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

        const response: folder_mcp.IGetChunksResponse = {
          chunks: protoChunks,
          documentId: request.documentId || '',
          totalTokenCount: totalTokenCount,
          status: {
            success: true,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [],
            warnings: []
          }
        };

        this.logger.info('GetChunks completed', {
          documentId: request.documentId,
          chunksReturned: protoChunks.length,
          totalTokenCount: totalTokenCount,
          executionTimeMs: Date.now() - startTime
        });

        callback(null, response);
      } catch (error) {
        this.logger.error('Failed to get document chunks', error instanceof Error ? error : new Error(String(error)));
        const response: folder_mcp.IGetChunksResponse = {
          chunks: [],
          documentId: request.documentId || '',
          totalTokenCount: 0,
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
      this.logger.error('GetChunks error', error instanceof Error ? error : new Error(String(error)));
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
   * Validate GetDocMetadata request
   */
  private validateGetDocMetadataRequest(request: folder_mcp.IGetDocMetadataRequest): grpc.ServiceError | null {
    // Document ID is required
    if (!request.documentId || request.documentId.trim() === '') {
      return createMissingFieldError('documentId');
    }

    return null;
  }

  /**
   * Validate DownloadDoc request
   */
  private validateDownloadDocRequest(request: folder_mcp.IDownloadDocRequest): grpc.ServiceError | null {
    // Document ID is required
    if (!request.documentId || request.documentId.trim() === '') {
      return createMissingFieldError('documentId');
    }

    return null;
  }

  /**
   * Validate GetChunks request
   */
  private validateGetChunksRequest(request: folder_mcp.IGetChunksRequest): grpc.ServiceError | null {
    // Document ID is required
    if (!request.documentId || request.documentId.trim() === '') {
      return createMissingFieldError('documentId');
    }

    // Chunk indices validation (if provided)
    if (request.chunkIndices && request.chunkIndices.length > 100) {
      return createOutOfRangeError('chunkIndices', request.chunkIndices.length, 0, 100);
    }

    // Max tokens per chunk validation
    if (request.maxTokensPerChunk !== undefined && request.maxTokensPerChunk !== null) {
      if (request.maxTokensPerChunk < 1 || request.maxTokensPerChunk > 10000) {
        return createOutOfRangeError('maxTokensPerChunk', request.maxTokensPerChunk, 1, 10000);
      }
    }

    return null;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
