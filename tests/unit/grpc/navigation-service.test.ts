/**
 * Unit tests for NavigationService gRPC implementation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { NavigationService } from '../../../src/grpc/services/navigation-service.js';
import { folder_mcp } from '../../../src/generated/folder-mcp.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  SERVICE_TOKENS 
} from '../../../src/di/interfaces.js';

describe('NavigationService', () => {
  let service: NavigationService;
  let mockContainer: IDependencyContainer;
  let mockLogger: ILoggingService;
  let mockFileSystemService: IFileSystemService;

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

    // Create mock container
    mockContainer = {
      resolve: vi.fn((token: symbol) => {
        switch (token) {
          case SERVICE_TOKENS.LOGGING:
            return mockLogger;
          case SERVICE_TOKENS.FILE_SYSTEM:
            return mockFileSystemService;
          default:
            throw new Error(`Unknown service token: ${String(token)}`);
        }
      })
    } as any;

    // Create service instance
    service = new NavigationService(mockContainer);
  });

  describe('listFolders', () => {
    it('should list folders in existing directory', async () => {
      // Arrange
      const request: folder_mcp.IListFoldersRequest = {
        basePath: '/test',
        maxDepth: 2,
        includeDocumentCounts: true
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(true);

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IListFoldersResponse | undefined;
      let error: any;
      
      await service.listFolders(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.folders).toBeDefined();
      expect(response?.status?.success).toBe(true);
    });

    it('should handle non-existent base path', async () => {
      // Arrange
      const request: folder_mcp.IListFoldersRequest = {
        basePath: '/nonexistent',
        maxDepth: 1
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(false);

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IListFoldersResponse | undefined;
      let error: any;
      
      await service.listFolders(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.status?.success).toBe(false);
      expect(response?.folders?.length).toBe(0);
    });
  });

  describe('listDocumentsInFolder', () => {
    it('should list documents in existing folder', async () => {
      // Arrange
      const request: folder_mcp.IListDocumentsInFolderRequest = {
        folderPath: '/test',
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        perPage: 50
      };

      (mockFileSystemService.exists as Mock).mockReturnValue(true);

      const mockCall = {
        request
      } as any;

      // Act
      let response: folder_mcp.IListDocumentsInFolderResponse | undefined;
      let error: any;
      
      await service.listDocumentsInFolder(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response?.documents).toBeDefined();
      expect(response?.status?.success).toBe(true);
    });
  });
});
