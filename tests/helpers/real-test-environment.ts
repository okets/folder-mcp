/**
 * Real Test Environment Infrastructure
 * 
 * This module provides utilities for setting up real test environments that:
 * - Use actual files from test-knowledge-base
 * - Create real .folder-mcp cache directories
 * - Initialize real services without mocks
 * - Manage temporary directories for each test
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { existsSync } from 'fs';

// Core infrastructure imports
import { DependencyContainer } from '../../src/di/container.js';
import { setupDependencyInjection } from '../../src/di/setup.js';
import { resolveConfig } from '../../src/config/resolver.js';
import type { 
  IVectorSearchService, 
  IFileParsingService, 
  IEmbeddingService,
  IFileSystemService,
  ILoggingService,
  ICacheService
} from '../../src/di/interfaces.js';
import { SERVICE_TOKENS } from '../../src/di/interfaces.js';

/**
 * Real test environment setup
 */
export interface RealTestEnvironment {
  /** Temporary directory for this test */
  tempDir: string;
  /** Path to the copied test knowledge base */
  knowledgeBasePath: string;
  /** Path to the .folder-mcp cache directory */
  cacheDir: string;
  /** DI container with real services */
  container: DependencyContainer;
  /** Real services (no mocks) */
  services: {
    vectorSearch: IVectorSearchService;
    fileParsing: IFileParsingService;
    embedding: IEmbeddingService;
    fileSystem: IFileSystemService;
    logging: ILoggingService;
    cache: ICacheService;
  };
  /** Cleanup function to call after test */
  cleanup: () => Promise<void>;
}

/**
 * Sets up a real test environment with actual files and services
 */
export async function setupRealTestEnvironment(testName: string): Promise<RealTestEnvironment> {
  console.log(`🔧 Setting up real test environment for: ${testName}`);
  
  // Create temporary directory for this test
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `real-test-${testName}-`));
  console.log(`📁 Created temp directory: ${tempDir}`);
  
  // Copy test knowledge base to temp directory
  const sourceKnowledgeBase = path.join(process.cwd(), 'tests', 'fixtures', 'test-knowledge-base');
  const knowledgeBasePath = path.join(tempDir, 'test-knowledge-base');
  
  await copyDirectory(sourceKnowledgeBase, knowledgeBasePath);
  console.log(`📋 Copied test knowledge base to: ${knowledgeBasePath}`);
  
  // Set up cache directory path (will be created by services)
  const cacheDir = path.join(knowledgeBasePath, '.folder-mcp');
  
  // Create real configuration for this test environment
  const config = await resolveConfig(knowledgeBasePath);
  
  // Set up DI container with real services
  const container = setupDependencyInjection({
    config,
    folderPath: knowledgeBasePath,
    logLevel: 'info'
  });
  
  // Get real services from container
  const services = {
    vectorSearch: container.resolve<IVectorSearchService>(SERVICE_TOKENS.VECTOR_SEARCH),
    fileParsing: container.resolve<IFileParsingService>(SERVICE_TOKENS.FILE_PARSING),
    embedding: container.resolve<IEmbeddingService>(SERVICE_TOKENS.EMBEDDING),
    fileSystem: container.resolve<IFileSystemService>(SERVICE_TOKENS.FILE_SYSTEM),
    logging: container.resolve<ILoggingService>(SERVICE_TOKENS.LOGGING),
    cache: container.resolve<ICacheService>(SERVICE_TOKENS.CACHE)
  };
  
  console.log(`✅ Real services initialized for test: ${testName}`);
  
  // Return test environment
  return {
    tempDir,
    knowledgeBasePath,
    cacheDir,
    container,
    services,
    cleanup: async () => {
      console.log(`🧹 Cleaning up test environment: ${testName}`);
      try {
        // Clean up container if it has a cleanup method
        if (container && typeof (container as any).clear === 'function') {
          (container as any).clear();
        }
        await cleanupTempDir(tempDir);
        console.log(`✅ Cleanup completed for: ${testName}`);
      } catch (error) {
        console.warn(`⚠️ Cleanup warning for ${testName}:`, error);
      }
    }
  };
}

/**
 * Recursively copy directory contents
 */
async function copyDirectory(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath);
    } else {
      await fs.copyFile(sourcePath, destPath);
    }
  }
}

/**
 * Clean up temporary directory with retry logic for Windows
 */
async function cleanupTempDir(dir: string): Promise<void> {
  if (!existsSync(dir)) return;
  
  try {
    let retries = 5;
    while (retries > 0) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
        break;
      } catch (error: any) {
        if ((error.code === 'ENOTEMPTY' || error.code === 'EPERM' || error.code === 'EBUSY') && retries > 1) {
          // Wait before retrying on Windows file system issues
          await new Promise(resolve => setTimeout(resolve, 200));
          retries--;
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to clean up temp directory ${dir}:`, error);
  }
}

/**
 * Validates that a real test environment is properly set up
 */
export async function validateRealTestEnvironment(env: RealTestEnvironment): Promise<void> {
  // Check that temp directory exists
  if (!existsSync(env.tempDir)) {
    throw new Error(`Temp directory does not exist: ${env.tempDir}`);
  }
  
  // Check that knowledge base was copied
  if (!existsSync(env.knowledgeBasePath)) {
    throw new Error(`Knowledge base was not copied: ${env.knowledgeBasePath}`);
  }
  
  // Check that test files exist
  const testFiles = [
    'Finance/2024/Q1/Q1_Report.pdf',
    'Sales/Data/Sales_Pipeline.xlsx',
    'Legal/Contracts/Acme_Vendor_Agreement.pdf'
  ];
  
  for (const testFile of testFiles) {
    const filePath = path.join(env.knowledgeBasePath, testFile);
    if (!existsSync(filePath)) {
      throw new Error(`Test file not found: ${filePath}`);
    }
  }
  
  // Check that services are real (not mocks)
  if (!env.services.vectorSearch || !env.services.fileParsing || !env.services.embedding) {
    throw new Error('Real services were not properly initialized');
  }
  
  console.log('✅ Real test environment validation passed');
}

/**
 * Helper to wait for cache directory creation
 */
export async function waitForCacheCreation(cacheDir: string, timeoutMs: number = 10000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (existsSync(cacheDir)) {
      console.log(`✅ Cache directory created: ${cacheDir}`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Cache directory was not created within ${timeoutMs}ms: ${cacheDir}`);
}

/**
 * Helper to validate cache directory contents
 */
export async function validateCacheContents(cacheDir: string): Promise<void> {
  if (!existsSync(cacheDir)) {
    throw new Error(`Cache directory does not exist: ${cacheDir}`);
  }
  
  const cacheContents = await fs.readdir(cacheDir);
  console.log(`📂 Cache directory contents:`, cacheContents);
  
  // Basic validation - cache should contain some files
  if (cacheContents.length === 0) {
    throw new Error('Cache directory is empty - no indexing occurred');
  }
  
  console.log('✅ Cache contents validation passed');
}
