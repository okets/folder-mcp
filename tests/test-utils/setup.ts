import { DependencyContainer } from '../../src/di/container.js';
import { IFileSystemService, ILoggingService, IConfigurationService } from '../../src/di/interfaces.js';
import { SQLiteVecStorage } from '../../src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import { FMDMService, IFMDMConfigurationService } from '../../src/daemon/services/fmdm-service.js';
import path from 'path';
import os from 'os';

export async function setupTestDependencies(): Promise<DependencyContainer> {
  const container = new DependencyContainer();
  
  // Register minimal test dependencies
  
  // Mock logger
  const mockLogger: ILoggingService = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    setLevel: () => {}
  };
  container.registerSingleton('ILoggingService', () => mockLogger);
  
  // Mock config service
  const mockConfigService: IConfigurationService = {
    resolveConfig: async () => ({} as any),
    generateRuntimeConfig: async () => ({} as any),
    validateConfig: () => [],
    getSystemCapabilities: async () => ({} as any)
  };
  container.registerSingleton('IConfigurationService', () => mockConfigService);
  
  // Use a test database - fix constructor parameters
  const testDbPath = path.join(os.tmpdir(), `test-embeddings-${Date.now()}.db`);
  container.registerSingleton('SQLiteVecStorage', () => new SQLiteVecStorage({
    folderPath: testDbPath,
    modelName: 'test-model',
    modelDimension: 384,
    logger: mockLogger
  }));
  
  // Create FMDM-specific config service mock
  const mockFMDMConfigService: IFMDMConfigurationService = {
    getFolders: async () => []
  };
  
  // Register FMDMService if not already registered
  if (!container.isRegistered('FMDMService')) {
    container.registerSingleton('FMDMService', () => new FMDMService(
      mockFMDMConfigService,
      mockLogger
    ));
  }
  
  return container;
}