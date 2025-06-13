/**
 * Navigation Service Implementation
 * 
 * Implements ListFolders and ListDocumentsInFolder gRPC service methods
 */

import * as grpc from '@grpc/grpc-js';
import { folder_mcp } from '../../generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  SERVICE_TOKENS 
} from '../../di/interfaces.js';
import { mapDomainErrorToGrpcStatus, createMissingFieldError, createOutOfRangeError } from '../utils/error-mapper.js';
import { AuthInterceptor } from '../auth/index.js';

/**
 * Navigation service implementation
 */
export class NavigationService {
  private logger: ILoggingService;
  private fileSystemService: IFileSystemService;

  constructor(
    container: IDependencyContainer,
    private authInterceptor?: AuthInterceptor
  ) {
    this.logger = container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING);
    this.fileSystemService = container.resolve<IFileSystemService>(SERVICE_TOKENS.FILE_SYSTEM);
  }

  /**
   * Get top-level folder structure
   */
  async listFolders(
    call: grpc.ServerUnaryCall<folder_mcp.IListFoldersRequest, folder_mcp.IListFoldersResponse>,
    callback: grpc.sendUnaryData<folder_mcp.IListFoldersResponse>
  ): Promise<void> {
    try {
      const request = call.request;
      const startTime = Date.now();
      
      this.logger.info('ListFolders request received', {
        basePath: request.basePath,
        includeDocumentCounts: request.includeDocumentCounts,
        maxDepth: request.maxDepth
      });

      const executionTime = Date.now() - startTime;
      
      // Get real folder structure from file system
      try {
        const basePath = request.basePath || process.cwd();
        const maxDepth = request.maxDepth || 3;
        
        // Check if base path exists
        if (!this.fileSystemService.exists(basePath)) {
          const response: folder_mcp.IListFoldersResponse = {
            folders: [],
            totalFolders: 0,
            status: {
              success: false,
              requestId: this.generateRequestId(),
              processingTimeMs: Date.now() - startTime,
              errors: [{
                code: folder_mcp.ErrorCode.ERROR_CODE_NOT_FOUND,
                message: `Base path not found: ${basePath}`,
                field: 'basePath'
              }],
              warnings: []
            },
            pagination: {
              page: 1,
              perPage: 50,
              totalCount: 0,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false
            }
          };
          callback(null, response);
          return;
        }

        // Scan directories recursively
        const folders = await this.scanDirectories(basePath, maxDepth, request.includeDocumentCounts || false);
        
        // Apply simple pagination (since request doesn't have pagination, use defaults)
        const page = 1;
        const perPage = 50;
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedFolders = folders.slice(startIndex, endIndex);
        
        const response: folder_mcp.IListFoldersResponse = {
          folders: paginatedFolders,
          totalFolders: folders.length,
          status: {
            success: true,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [],
            warnings: []
          },
          pagination: {
            page: page,
            perPage: perPage,
            totalCount: folders.length,
            totalPages: Math.ceil(folders.length / perPage),
            hasNext: endIndex < folders.length,
            hasPrevious: page > 1
          }
        };

        this.logger.info('ListFolders completed', {
          basePath: basePath,
          foldersFound: folders.length,
          executionTimeMs: Date.now() - startTime
        });

        callback(null, response);
      } catch (error) {
        this.logger.error('Failed to list folders', error instanceof Error ? error : new Error(String(error)));
        const response: folder_mcp.IListFoldersResponse = {
          folders: [],
          totalFolders: 0,
          status: {
            success: false,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [{
              code: folder_mcp.ErrorCode.ERROR_CODE_INTERNAL_ERROR,
              message: error instanceof Error ? error.message : String(error),
              field: 'basePath'
            }],
            warnings: []
          },
          pagination: {
            page: 1,
            perPage: 50,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        };
        callback(null, response);
      }
    } catch (error) {
      this.logger.error('ListFolders error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = mapDomainErrorToGrpcStatus(error instanceof Error ? error : new Error(String(error)));
      callback(grpcError);
    }
  }

  /**
   * List documents within a specific folder
   */
  async listDocumentsInFolder(
    call: grpc.ServerUnaryCall<folder_mcp.IListDocumentsInFolderRequest, folder_mcp.IListDocumentsInFolderResponse>,
    callback: grpc.sendUnaryData<folder_mcp.IListDocumentsInFolderResponse>
  ): Promise<void> {
    try {
      const request = call.request;
      const startTime = Date.now();
      
      this.logger.info('ListDocumentsInFolder request received', {
        folderPath: request.folderPath,
        typeFilter: request.typeFilter,
        sortBy: request.sortBy,
        sortOrder: request.sortOrder,
        page: request.page,
        perPage: request.perPage
      });

      const executionTime = Date.now() - startTime;
      
      // Get real documents from the folder
      try {
        const folderPath = request.folderPath || process.cwd();
        
        // Check if folder exists
        if (!this.fileSystemService.exists(folderPath)) {
          const response: folder_mcp.IListDocumentsInFolderResponse = {
            documents: [],
            totalDocuments: 0,
            status: {
              success: false,
              requestId: this.generateRequestId(),
              processingTimeMs: Date.now() - startTime,
              errors: [{
                code: folder_mcp.ErrorCode.ERROR_CODE_NOT_FOUND,
                message: `Folder not found: ${folderPath}`,
                field: 'folderPath'
              }],
              warnings: []
            },
            pagination: {
              page: request.page || 1,
              perPage: request.perPage || 200,
              totalCount: 0,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false
            }
          };
          callback(null, response);
          return;
        }

        // Get documents from folder
        const typeFilterStrings = request.typeFilter ? 
          request.typeFilter.map(type => this.documentTypeToString(type)) : 
          undefined;
          
        const documents = await this.getDocumentsInFolder(
          folderPath,
          typeFilterStrings,
          request.sortBy || 'name',
          request.sortOrder || 'asc'
        );

        // Apply pagination
        const page = request.page || 1;
        const perPage = request.perPage || 200;
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedDocuments = documents.slice(startIndex, endIndex);

        const response: folder_mcp.IListDocumentsInFolderResponse = {
          documents: paginatedDocuments,
          totalDocuments: documents.length,
          status: {
            success: true,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [],
            warnings: []
          },
          pagination: {
            page: page,
            perPage: perPage,
            totalCount: documents.length,
            totalPages: Math.ceil(documents.length / perPage),
            hasNext: endIndex < documents.length,
            hasPrevious: page > 1
          }
        };

        this.logger.info('ListDocumentsInFolder completed', {
          folderPath: folderPath,
          documentsFound: documents.length,
          executionTimeMs: Date.now() - startTime
        });

        callback(null, response);
      } catch (error) {
        this.logger.error('Failed to list documents in folder', error instanceof Error ? error : new Error(String(error)));
        const response: folder_mcp.IListDocumentsInFolderResponse = {
          documents: [],
          totalDocuments: 0,
          status: {
            success: false,
            requestId: this.generateRequestId(),
            processingTimeMs: Date.now() - startTime,
            errors: [{
              code: folder_mcp.ErrorCode.ERROR_CODE_INTERNAL_ERROR,
              message: error instanceof Error ? error.message : String(error),
              field: 'folderPath'
            }],
            warnings: []
          },
          pagination: {
            page: request.page || 1,
            perPage: request.perPage || 200,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        };
        callback(null, response);
      }
    } catch (error) {
      this.logger.error('ListDocumentsInFolder error', error instanceof Error ? error : new Error(String(error)));
      const grpcError = mapDomainErrorToGrpcStatus(error instanceof Error ? error : new Error(String(error)));
      callback(grpcError);
    }
  }

  /**
   * Scan directories recursively up to maxDepth
   */
  private async scanDirectories(basePath: string, maxDepth: number, includeDocumentCounts?: boolean): Promise<any[]> {
    const folders: any[] = [];
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      const scanDirectory = async (dirPath: string, currentDepth: number): Promise<void> => {
        if (currentDepth > maxDepth) return;
        
        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const fullPath = path.join(dirPath, entry.name);
              const relativePath = path.relative(basePath, fullPath);
              
              // Count documents if requested
              let documentCount = 0;
              if (includeDocumentCounts) {
                try {
                  const docEntries = fs.readdirSync(fullPath, { withFileTypes: true });
                  documentCount = docEntries.filter((docEntry: any) => 
                    docEntry.isFile() && this.isSupportedDocument(docEntry.name)
                  ).length;
                } catch (error) {
                  // Ignore permission errors for document counting
                }
              }
              
              const stats = fs.statSync(fullPath);
              folders.push({
                folderId: Buffer.from(fullPath).toString('base64'),
                folderName: entry.name,
                folderPath: relativePath,
                fullPath: fullPath,
                documentCount: documentCount,
                modifiedDate: stats.mtime.toISOString(),
                depth: currentDepth + 1
              });
              
              // Recurse into subdirectories
              await scanDirectory(fullPath, currentDepth + 1);
            }
          }
        } catch (error) {
          // Log but continue scanning other directories
          this.logger.warn(`Failed to scan directory: ${dirPath}`, { error: error instanceof Error ? error.message : String(error) });
        }
      };
      
      await scanDirectory(basePath, 0);
    } catch (error) {
      this.logger.error('Error during directory scanning', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
    
    return folders;
  }

  /**
   * Check if a file is a supported document type
   */
  private isSupportedDocument(filename: string): boolean {
    const supportedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.md', '.csv', '.rtf', '.odt', '.ods', '.odp', '.html', '.xml'];
    const extension = require('path').extname(filename).toLowerCase();
    return supportedExtensions.includes(extension);
  }

  /**
   * Get documents in a specific folder with filtering and sorting
   */
  private async getDocumentsInFolder(folderPath: string, typeFilter?: string[], sortBy?: string, sortOrder?: string): Promise<any[]> {
    const documents: any[] = [];
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(folderPath)) {
        return documents;
      }
      
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && this.isSupportedDocument(entry.name)) {
          const fullPath = path.join(folderPath, entry.name);
          const extension = path.extname(entry.name).toLowerCase();
          
          // Apply type filter if specified
          if (typeFilter && typeFilter.length > 0 && !typeFilter.includes(extension.slice(1))) {
            continue;
          }
          
          try {
            const stats = fs.statSync(fullPath);
            
            // Determine document type
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
              case '.xlsx':
                documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_XLSX;
                break;
              case '.xls':
                documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_XLS;
                break;
              case '.pptx':
                documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_PPTX;
                break;
              case '.ppt':
                documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_PPT;
                break;
              case '.txt':
                documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_TXT;
                break;
              case '.md':
                documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_MD;
                break;
              case '.csv':
                documentType = folder_mcp.DocumentType.DOCUMENT_TYPE_CSV;
                break;
            }
            
            documents.push({
              documentId: fullPath,
              filename: entry.name,
              title: path.basename(entry.name, extension),
              documentType: documentType,
              fileSize: stats.size,
              modifiedDate: stats.mtime.toISOString(),
              createdDate: stats.birthtime?.toISOString() || stats.mtime.toISOString(),
              relativePath: path.relative(process.cwd(), fullPath),
              fullPath: fullPath
            });
          } catch (error) {
            this.logger.warn(`Failed to get stats for file: ${fullPath}`, { error: error instanceof Error ? error.message : String(error) });
          }
        }
      }
      
      // Sort documents
      if (sortBy) {
        documents.sort((a, b) => {
          let valueA, valueB;
          
          switch (sortBy) {
            case 'name':
              valueA = a.filename.toLowerCase();
              valueB = b.filename.toLowerCase();
              break;
            case 'size':
              valueA = a.fileSize;
              valueB = b.fileSize;
              break;
            case 'modified':
              valueA = new Date(a.modifiedDate).getTime();
              valueB = new Date(b.modifiedDate).getTime();
              break;
            case 'type':
              valueA = a.documentType;
              valueB = b.documentType;
              break;
            default:
              valueA = a.filename.toLowerCase();
              valueB = b.filename.toLowerCase();
          }
          
          if (valueA < valueB) return sortOrder === 'desc' ? 1 : -1;
          if (valueA > valueB) return sortOrder === 'desc' ? -1 : 1;
          return 0;
        });
      }
      
    } catch (error) {
      this.logger.error('Error getting documents in folder', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
    
    return documents;
  }

  /**
   * Convert DocumentType enum to string extension
   */
  private documentTypeToString(docType: folder_mcp.DocumentType): string {
    switch (docType) {
      case folder_mcp.DocumentType.DOCUMENT_TYPE_PDF:
        return 'pdf';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_DOCX:
        return 'docx';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_DOC:
        return 'doc';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_XLSX:
        return 'xlsx';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_XLS:
        return 'xls';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_PPTX:
        return 'pptx';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_PPT:
        return 'ppt';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_TXT:
        return 'txt';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_MD:
        return 'md';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_CSV:
        return 'csv';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_RTF:
        return 'rtf';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_ODT:
        return 'odt';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_ODS:
        return 'ods';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_ODP:
        return 'odp';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_HTML:
        return 'html';
      case folder_mcp.DocumentType.DOCUMENT_TYPE_XML:
        return 'xml';
      default:
        return 'unknown';
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
