/**
 * Unit tests for SpecializedService gRPC implementation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { SpecializedService } from '../../../src/grpc/services/specialized-service.js';
import { folder_mcp } from '../../../src/generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  ICacheService,
  IEmbeddingService,
  SERVICE_TOKENS 
} from '../../../src/di/interfaces.js';

describe('SpecializedService', () => {
  let service: SpecializedService;
  let mockContainer: IDependencyContainer;
  let mockLogger: ILoggingService;
  let mockFileSystemService: IFileSystemService;
  let mockCacheService: ICacheService;
  let mockEmbeddingService: IEmbeddingService;

  beforeEach(() => {
    // Create mock services
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      setLevel: vi.fn()
    };

    mockFileSystemService = {
      exists: vi.fn(),
      readFile: vi.fn(),
      generateFingerprints: vi.fn(),
      watchFolder: vi.fn()
    };

    mockCacheService = {
      setupCacheDirectory: vi.fn(),
      saveToCache: vi.fn(),
      loadFromCache: vi.fn(),
      hasCacheEntry: vi.fn(),
      getCacheStatus: vi.fn()
    };

    mockEmbeddingService = {
      initialize: vi.fn(),
      generateEmbeddings: vi.fn(),
      generateQueryEmbedding: vi.fn(),
      getModelConfig: vi.fn(),
      isInitialized: vi.fn()
    };

    // Create mock container
    mockContainer = {
      resolve: vi.fn((token: symbol) => {
        switch (token) {
          case SERVICE_TOKENS.LOGGING:
            return mockLogger;
          case SERVICE_TOKENS.FILE_SYSTEM:
            return mockFileSystemService;
          case SERVICE_TOKENS.CACHE:
            return mockCacheService;
          case SERVICE_TOKENS.EMBEDDING:
            return mockEmbeddingService;
          default:
            throw new Error(`Unknown service token: ${String(token)}`);
        }
      })
    } as any;

    // Create service instance
    service = new SpecializedService(mockContainer);
  });

  describe('tableQuery', () => {
    it('should handle CSV file table query successfully', async () => {
      // Arrange
      const request: folder_mcp.ITableQueryRequest = {
        query: 'sales data',
        documentIds: ['/test/data.csv'],
        maxResults: 10
      };

      const csvContent = 'Name,Age,Sales\nJohn,25,1000\nJane,30,1500\nBob,35,2000';
      
      (mockFileSystemService.exists as Mock).mockReturnValue(true);
      (mockFileSystemService.readFile as Mock).mockResolvedValue(csvContent);

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.ITableQueryResponse | undefined;
      let error: any;
      
      await service.tableQuery(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.matches).toBeDefined();
      expect(response?.tables).toBeDefined();
      expect(response?.tables?.length).toBe(1);
      expect(response?.tables?.[0]?.documentId).toBe('/test/data.csv');
      expect(mockLogger.info).toHaveBeenCalledWith('TableQuery request received', expect.any(Object));
    });

    it('should handle empty document list', async () => {
      // Arrange
      const request: folder_mcp.ITableQueryRequest = {
        query: 'test query',
        documentIds: [],
        maxResults: 10
      };

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.ITableQueryResponse | undefined;
      let error: any;
      
      await service.tableQuery(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.matches).toEqual([]);
      expect(response?.tables).toEqual([]);
      expect(response?.status?.success).toBe(false);
    });

    it('should validate missing query', async () => {
      // Arrange
      const request: folder_mcp.ITableQueryRequest = {
        query: '',
        documentIds: ['/test/data.csv'],
        maxResults: 10
      };

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.ITableQueryResponse | undefined;
      let error: any;
      
      await service.tableQuery(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.code).toBe(grpc.status.INVALID_ARGUMENT);
    });
  });

  describe('ingestStatus', () => {
    it('should return status for existing documents', async () => {
      // Arrange
      const request: folder_mcp.IIngestStatusRequest = {
        documentIds: ['/test/doc1.txt', '/test/doc2.txt'],
        includeErrorDetails: true
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(true);
      (mockCacheService.loadFromCache as Mock).mockResolvedValue({
        status: folder_mcp.IngestStatus.INGEST_STATUS_COMPLETED,
        progress: 1.0,
        lastUpdated: new Date().toISOString(),
        processingTimeMs: 1000,
        chunks: 5,
        embeddings: 5
      });

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.IIngestStatusResponse | undefined;
      let error: any;
      
      await service.ingestStatus(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.documents).toBeDefined();
      expect(response?.documents?.length).toBe(2);
      expect(response?.overall?.totalDocuments).toBe(2);
      expect(response?.overall?.completedDocuments).toBe(2);
      expect(response?.status?.success).toBe(true);
    });

    it('should handle non-existent documents', async () => {
      // Arrange
      const request: folder_mcp.IIngestStatusRequest = {
        documentIds: ['/test/nonexistent.txt'],
        includeErrorDetails: true
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.IIngestStatusResponse | undefined;
      let error: any;
      
      await service.ingestStatus(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.documents?.[0]?.status).toBe(folder_mcp.IngestStatus.INGEST_STATUS_FAILED);
      expect(response?.overall?.errorDocuments).toBe(1);
    });
  });

  describe('refreshDoc', () => {
    it('should queue documents for refresh successfully', async () => {
      // Arrange
      const request: folder_mcp.IRefreshDocRequest = {
        documentIds: ['/test/doc1.txt', '/test/doc2.txt'],
        forceReprocess: true,
        priority: folder_mcp.Priority.PRIORITY_HIGH
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(true);
      (mockCacheService.saveToCache as Mock).mockResolvedValue(undefined);

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.IRefreshDocResponse | undefined;
      let error: any;
      
      await service.refreshDoc(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.jobId).toBeDefined();
      expect(response?.queuedDocumentIds).toEqual(['/test/doc1.txt', '/test/doc2.txt']);
      expect(response?.estimatedCompletion).toBeDefined();
      expect(mockCacheService.saveToCache).toHaveBeenCalledTimes(2);
    });

    it('should validate missing document IDs', async () => {
      // Arrange
      const request: folder_mcp.IRefreshDocRequest = {
        documentIds: [],
        forceReprocess: false
      };

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.IRefreshDocResponse | undefined;
      let error: any;
      
      await service.refreshDoc(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.code).toBe(grpc.status.INVALID_ARGUMENT);
    });
  });

  describe('getEmbedding', () => {
    it('should retrieve embeddings for documents', async () => {
      // Arrange
      const request: folder_mcp.IGetEmbeddingRequest = {
        documentIds: ['/test/doc1.txt'],
        format: 'raw'
      };

      const mockContent = 'This is test document content';
      (mockFileSystemService.exists as Mock).mockReturnValue(true);
      (mockFileSystemService.readFile as Mock).mockResolvedValue(mockContent);
      (mockCacheService.loadFromCache as Mock).mockResolvedValue(null);

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.IGetEmbeddingResponse | undefined;
      let error: any;
      
      await service.getEmbedding(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.vectors).toBeDefined();
      expect(response?.vectors?.length).toBe(1);
      expect(response?.status?.success).toBe(true);
    });

    it('should validate missing document and chunk IDs', async () => {
      // Arrange
      const request: folder_mcp.IGetEmbeddingRequest = {
        documentIds: [],
        chunkIds: []
      };

      const mockCall = {
        request,
        getPeer: vi.fn().mockReturnValue('local')
      } as any;

      // Act
      let response: folder_mcp.IGetEmbeddingResponse | undefined;
      let error: any;
      
      await service.getEmbedding(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.code).toBe(grpc.status.INVALID_ARGUMENT);
    });
  });
});
