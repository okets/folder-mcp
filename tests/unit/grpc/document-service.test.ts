/**
 * Unit tests for DocumentService gRPC implementation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { DocumentService } from '../../../src/grpc/services/document-service.js';
import { folder_mcp } from '../../../src/generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  IChunkingService,
  ICacheService,
  SERVICE_TOKENS 
} from '../../../src/di/interfaces.js';

// Mock Node.js built-in modules (kept for compatibility but not essential for these tests)
vi.mock('fs', () => ({
  statSync: vi.fn(() => ({
    size: 1024,
    mtime: new Date('2024-01-01T00:00:00.000Z'),
    birthtime: new Date('2024-01-01T00:00:00.000Z')
  }))
}));

vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    extname: vi.fn((filePath: string) => {
      if (filePath.endsWith('.txt')) return '.txt';
      if (filePath.endsWith('.md')) return '.md';
      return '';
    }),
    basename: vi.fn((filePath: string, ext?: string) => {
      const parts = filePath.split('/');
      const filename = parts[parts.length - 1];
      if (ext && filename.endsWith(ext)) {
        return filename.slice(0, -ext.length);
      }
      return filename;
    })
  };
});

describe('DocumentService', () => {
  let service: DocumentService;
  let mockContainer: IDependencyContainer;
  let mockLogger: ILoggingService;
  let mockFileSystemService: IFileSystemService;
  let mockChunkingService: IChunkingService;
  let mockCacheService: ICacheService;

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

    mockChunkingService = {
      chunkText: vi.fn(),
      estimateTokenCount: vi.fn()
    };

    mockCacheService = {
      setupCacheDirectory: vi.fn(),
      saveToCache: vi.fn(),
      loadFromCache: vi.fn(),
      hasCacheEntry: vi.fn(),
      getCacheStatus: vi.fn()
    };

    // Create mock container
    mockContainer = {
      resolve: vi.fn((token: symbol) => {
        switch (token) {
          case SERVICE_TOKENS.LOGGING:
            return mockLogger;
          case SERVICE_TOKENS.FILE_SYSTEM:
            return mockFileSystemService;
          case SERVICE_TOKENS.CHUNKING:
            return mockChunkingService;
          case SERVICE_TOKENS.CACHE:
            return mockCacheService;
          default:
            throw new Error(`Unknown service token: ${String(token)}`);
        }
      })
    } as any;

    // Create service instance
    service = new DocumentService(mockContainer);
  });

  describe('getDocMetadata', () => {
    it('should handle file system errors gracefully', async () => {
      // Arrange
      const request: folder_mcp.IGetDocMetadataRequest = {
        documentId: '/test/document.txt',
        includeStructure: true
      };

      // Mock file system service to say file exists but fs.statSync will fail
      (mockFileSystemService.exists as Mock).mockReturnValue(true);
      (mockFileSystemService.readFile as Mock).mockResolvedValue('Test content');

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IGetDocMetadataResponse | undefined;
      let error: any;
      
      await service.getDocMetadata(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.documentInfo?.documentId).toBe('/test/document.txt');
      
      // Since the file doesn't actually exist, the service will handle it gracefully
      // and return success=false with error details in the status
      expect(response?.status?.success).toBe(false);
      expect(response?.status?.errors).toHaveLength(1);
      expect(response?.status?.errors?.[0]?.message).toContain('no such file or directory');
    });

    it('should return not found error for non-existent file', async () => {
      // Arrange
      const request: folder_mcp.IGetDocMetadataRequest = {
        documentId: '/test/nonexistent.txt',
        includeStructure: true
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IGetDocMetadataResponse | undefined;
      let error: any;
      
      await service.getDocMetadata(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.code).toBe(grpc.status.NOT_FOUND);
    });

    it('should handle missing document ID', async () => {
      // Arrange
      const request: folder_mcp.IGetDocMetadataRequest = {
        documentId: '',
        includeStructure: false
      };

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IGetDocMetadataResponse | undefined;
      let error: any;
      
      await service.getDocMetadata(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.code).toBe(grpc.status.INVALID_ARGUMENT);
    });
  });

  describe('getChunks', () => {
    it('should handle file system errors gracefully for chunks', async () => {
      // Arrange
      const request: folder_mcp.IGetChunksRequest = {
        documentId: '/test/document.txt',
        maxTokensPerChunk: 1000
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(true);
      (mockFileSystemService.readFile as Mock).mockResolvedValue('Test content');

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IGetChunksResponse | undefined;
      let error: any;
      
      await service.getChunks(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.documentId).toBe('/test/document.txt');
      
      // Since fs.statSync will fail for the fake path, service handles gracefully
      expect(response?.status?.success).toBe(false);
      expect(response?.status?.errors).toHaveLength(1);
      expect(response?.status?.errors?.[0]?.message).toContain('no such file or directory');
    });

    it('should return not found error for non-existent file', async () => {
      // Arrange
      const request: folder_mcp.IGetChunksRequest = {
        documentId: '/test/nonexistent.txt',
        maxTokensPerChunk: 1000
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IGetChunksResponse | undefined;
      let error: any;
      
      await service.getChunks(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.status?.success).toBe(false);
      expect(response?.status?.errors?.[0]?.code).toBe(folder_mcp.ErrorCode.ERROR_CODE_NOT_FOUND);
    });
  });
});
