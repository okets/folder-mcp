/**
 * Unit tests for SearchService gRPC implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { SearchService } from '../../../src/grpc/services/search-service.js';
import { folder_mcp } from '../../../src/generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService,
  IVectorSearchService,
  IEmbeddingService,
  IFileSystemService,
  SERVICE_TOKENS 
} from '../../../src/di/interfaces.js';

describe('gRPC SearchService', () => {
  let searchService: SearchService;
  let mockContainer: IDependencyContainer;
  let mockLogger: ILoggingService;
  let mockVectorSearch: IVectorSearchService;
  let mockEmbeddingService: IEmbeddingService;
  let mockFileSystemService: IFileSystemService;

  beforeEach(() => {
    // Create mock services
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      setLevel: vi.fn()
    };

    mockVectorSearch = {
      isReady: vi.fn().mockReturnValue(true),
      search: vi.fn().mockResolvedValue([]),
      buildIndex: vi.fn().mockResolvedValue(undefined),
      loadIndex: vi.fn().mockResolvedValue(undefined)
    } as any;

    mockEmbeddingService = {
      generateQueryEmbedding: vi.fn().mockResolvedValue({ vector: [0.1, 0.2, 0.3] }),
      generateEmbeddings: vi.fn().mockResolvedValue([]),
      initialize: vi.fn().mockResolvedValue(undefined),
      getModelConfig: vi.fn().mockReturnValue({}),
      isInitialized: vi.fn().mockReturnValue(true)
    } as any;

    mockFileSystemService = {
      generateFingerprints: vi.fn().mockResolvedValue([]),
      readFile: vi.fn().mockResolvedValue(''),
      exists: vi.fn().mockReturnValue(true),
      watchFolder: vi.fn().mockResolvedValue(undefined)
    } as any;

    // Create mock container with proper interface implementation
    mockContainer = {
      resolve: vi.fn((token) => {
        switch (token) {
          case SERVICE_TOKENS.LOGGING:
            return mockLogger;
          case SERVICE_TOKENS.VECTOR_SEARCH:
            return mockVectorSearch;
          case SERVICE_TOKENS.EMBEDDING:
            return mockEmbeddingService;
          case SERVICE_TOKENS.FILE_SYSTEM:
            return mockFileSystemService;
          default:
            throw new Error(`Unknown service token: ${token.toString()}`);
        }
      }),
      register: vi.fn(),
      registerFactory: vi.fn(),
      registerSingleton: vi.fn(),
      isRegistered: vi.fn(),
      clear: vi.fn()
    } as IDependencyContainer;

    searchService = new SearchService(mockContainer);
  });

  describe('searchDocs', () => {
    it('should perform semantic document search successfully', async () => {
      // Arrange
      const request: folder_mcp.ISearchDocsRequest = {
        query: 'test query',
        topK: 5
      };

      const mockSearchResults = [
        {
          documentId: 'doc1',
          filename: 'test.txt',
          relativePath: 'docs/test.txt',
          title: 'Test Document',
          score: 0.95,
          snippet: 'This is a test document'
        }
      ];

      const mockQueryEmbedding = { vector: [0.1, 0.2, 0.3] };
      (mockEmbeddingService.generateQueryEmbedding as any).mockResolvedValue(mockQueryEmbedding);
      (mockVectorSearch.search as any).mockResolvedValue(mockSearchResults);

      // Create mock call and callback
      const call = {
        request
      } as grpc.ServerUnaryCall<folder_mcp.ISearchDocsRequest, folder_mcp.ISearchDocsResponse>;

      const callback = vi.fn();

      // Act
      await searchService.searchDocs(call, callback);

      // Assert
      expect(mockEmbeddingService.generateQueryEmbedding).toHaveBeenCalledWith('test query');
      expect(mockVectorSearch.search).toHaveBeenCalledWith(mockQueryEmbedding, 5, 0.7);
      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
        documents: expect.arrayContaining([
          expect.objectContaining({
            documentId: 'doc1',
            filename: 'test.txt',
            score: 0.95
          })
        ]),
        totalFound: 1,
        maxScore: expect.objectContaining({
          score: 0.95,
          method: 'cosine_similarity'
        })
      }));
      expect(mockLogger.info).toHaveBeenCalledWith('SearchDocs completed', expect.any(Object));
    });

    it('should handle vector search not ready', async () => {
      // Arrange
      (mockVectorSearch.isReady as any).mockReturnValue(false);

      const request: folder_mcp.ISearchDocsRequest = {
        query: 'test query'
      };

      const call = {
        request
      } as grpc.ServerUnaryCall<folder_mcp.ISearchDocsRequest, folder_mcp.ISearchDocsResponse>;

      const callback = vi.fn();

      // Act
      await searchService.searchDocs(call, callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          code: grpc.status.FAILED_PRECONDITION
        })
      );
    });

    it('should handle missing query', async () => {
      // Arrange
      const request: folder_mcp.ISearchDocsRequest = {
        topK: 5
      };

      const call = {
        request
      } as grpc.ServerUnaryCall<folder_mcp.ISearchDocsRequest, folder_mcp.ISearchDocsResponse>;

      const callback = vi.fn();

      // Act
      await searchService.searchDocs(call, callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          code: grpc.status.INVALID_ARGUMENT
        })
      );
    });
  });

  describe('searchChunks', () => {
    it('should perform semantic chunk search successfully', async () => {
      // Arrange
      const request: folder_mcp.ISearchChunksRequest = {
        query: 'test query',
        topK: 10
      };

      const mockSearchResults = [
        {
          chunkId: 'chunk1',
          documentId: 'doc1',
          text: 'This is a test chunk',
          score: 0.88,
          startOffset: 0,
          endOffset: 20
        }
      ];

      const mockQueryEmbedding = { vector: [0.1, 0.2, 0.3] };
      (mockEmbeddingService.generateQueryEmbedding as any).mockResolvedValue(mockQueryEmbedding);
      (mockVectorSearch.search as any).mockResolvedValue(mockSearchResults);

      // Create mock call and callback
      const call = {
        request
      } as grpc.ServerUnaryCall<folder_mcp.ISearchChunksRequest, folder_mcp.ISearchChunksResponse>;

      const callback = vi.fn();

      // Act
      await searchService.searchChunks(call, callback);

      // Assert
      expect(mockEmbeddingService.generateQueryEmbedding).toHaveBeenCalledWith('test query');
      expect(mockVectorSearch.search).toHaveBeenCalledWith(mockQueryEmbedding, 10, 0.7);
      expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
        chunks: expect.arrayContaining([
          expect.objectContaining({
            chunkId: 'chunk1',
            documentId: 'doc1',
            text: 'This is a test chunk',
            score: 0.88
          })
        ]),
        totalFound: 1
      }));
    });
  });
});
