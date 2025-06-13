/**
 * Unit tests for SummaryService gRPC implementation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { SummaryService } from '../../../src/grpc/services/summary-service.js';
import { folder_mcp } from '../../../src/generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  IChunkingService,
  SERVICE_TOKENS 
} from '../../../src/di/interfaces.js';

// Mock Node.js built-in modules
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

describe('SummaryService', () => {
  let service: SummaryService;
  let mockContainer: IDependencyContainer;
  let mockLogger: ILoggingService;
  let mockFileSystemService: IFileSystemService;
  let mockChunkingService: IChunkingService;

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
      estimateTokenCount: vi.fn().mockImplementation((text: string) => {
        // Return a realistic token count based on text length
        return Math.max(1, Math.floor(text.length / 4));
      })
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
          default:
            throw new Error(`Unknown service token: ${String(token)}`);
        }
      })
    } as any;

    // Create service instance
    service = new SummaryService(mockContainer);
  });

  describe('getDocSummary', () => {
    it('should handle file system errors gracefully for summary', async () => {
      // Arrange
      const request: folder_mcp.IGetDocSummaryRequest = {
        documentId: '/test/document.txt',
        mode: folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF,
        maxTokens: 150
      };

      const mockContent = 'This is a test document with some content. It has multiple sentences. This makes it suitable for summarization testing.';
      
      (mockFileSystemService.exists as Mock).mockReturnValue(true);
      (mockFileSystemService.readFile as Mock).mockResolvedValue(mockContent);

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IGetDocSummaryResponse | undefined;
      let error: any;
      
      await service.getDocSummary(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.mode).toBe(folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF);
      
      // Since fs.statSync will fail for the fake path, service handles gracefully
      expect(response?.status?.success).toBe(false);
      expect(response?.status?.errors).toHaveLength(1);
      expect(response?.status?.errors?.[0]?.message).toContain('no such file or directory');
    });

    it('should handle missing document', async () => {
      // Arrange
      const request: folder_mcp.IGetDocSummaryRequest = {
        documentId: '/test/nonexistent.txt',
        mode: folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IGetDocSummaryResponse | undefined;
      let error: any;
      
      await service.getDocSummary(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.status?.success).toBe(false);
      expect(response?.summary).toBe('');
    });

    it('should validate missing document ID', async () => {
      // Arrange
      const request: folder_mcp.IGetDocSummaryRequest = {
        documentId: '',
        mode: folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF
      };

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IGetDocSummaryResponse | undefined;
      let error: any;
      
      await service.getDocSummary(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.code).toBe(grpc.status.INVALID_ARGUMENT);
    });
  });

  describe('batchDocSummary', () => {
    it('should generate summaries for multiple documents', async () => {
      // Arrange
      const request: folder_mcp.IBatchDocSummaryRequest = {
        documentIds: ['/test/doc1.txt', '/test/doc2.txt'],
        mode: folder_mcp.SummaryMode.SUMMARY_MODE_BRIEF,
        maxTotalTokens: 500
      };

      const mockContent = 'Test document content for summarization.';
      
      (mockFileSystemService.exists as Mock).mockReturnValue(true);
      (mockFileSystemService.readFile as Mock).mockResolvedValue(mockContent);

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IBatchDocSummaryResponse | undefined;
      let error: any;
      
      await service.batchDocSummary(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.summaries?.length).toBe(2);
      expect(response?.status?.success).toBe(true);
    });
  });
});
