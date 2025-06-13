/**
 * Unit tests for HealthService gRPC implementation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { HealthService, ServingStatus } from '../../../src/grpc/services/health-service.js';
import { 
  IDependencyContainer, 
  ILoggingService, 
  IFileSystemService,
  ICacheService,
  IEmbeddingService,
  SERVICE_TOKENS 
} from '../../../src/di/interfaces.js';

describe('HealthService', () => {
  let service: HealthService;
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
      exists: vi.fn().mockReturnValue(true),
      readFile: vi.fn(),
      generateFingerprints: vi.fn(),
      watchFolder: vi.fn()
    };

    mockCacheService = {
      setupCacheDirectory: vi.fn().mockResolvedValue(undefined),
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
      isInitialized: vi.fn().mockReturnValue(true)
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
    service = new HealthService(mockContainer);
  });

  describe('check', () => {
    it('should return SERVING status for overall system health', async () => {
      // Arrange
      const request = { service: '' };

      const mockCall = {
        request
      } as any;

      // Act
      let response: any;
      let error: any;
      
      await service.check(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response.status).toBe(ServingStatus.SERVING);
    });

    it('should return status for specific service', async () => {
      // Arrange
      const request = { service: 'folder_mcp.SearchService' };

      const mockCall = {
        request
      } as any;

      // Act
      let response: any;
      let error: any;
      
      await service.check(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response.status).toBe(ServingStatus.SERVING);
    });

    it('should return SERVICE_UNKNOWN for unknown service', async () => {
      // Arrange
      const request = { service: 'unknown.service' };

      const mockCall = {
        request
      } as any;

      // Act
      let response: any;
      let error: any;
      
      await service.check(mockCall, (err: any, res: any) => {
        error = err;
        response = res;
      });

      // Assert
      expect(error).toBeNull();
      expect(response).toBeDefined();
      expect(response.status).toBe(ServingStatus.SERVICE_UNKNOWN);
    });
  });

  describe('setServiceStatus', () => {
    it('should update service status', () => {
      // Act
      service.setServiceStatus('test.service', ServingStatus.NOT_SERVING);
      const status = service.getServiceStatus('test.service');

      // Assert
      expect(status).toBe(ServingStatus.NOT_SERVING);
    });
  });
});
