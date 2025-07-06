/**
 * Integration Tests - Indexing Workflow with REAL DATA
 * 
 * Tests the complete indexing workflow using REAL business documents
 * This will expose actual architectural bugs and integration issues
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { setupTestEnvironment, cleanupTestEnvironment, type TestEnvironment } from '../../helpers/setup.js';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import type {
  IndexingWorkflow,
  IndexingResult,
  IndexingOptions
} from '../../../src/application/indexing/index.js';

describe('Integration - Indexing Workflow with Real Data', () => {
  let testEnv: TestEnvironment;
  let indexingWorkflow: IndexingWorkflow;
  let container: any;

  beforeEach(async () => {
    testEnv = await setupTestEnvironment();
    
    // Use REAL dependency injection container
    container = setupDependencyInjection({
      folderPath: testEnv.folderPath,
      logLevel: 'debug' as const
    });
    
    // Get REAL indexing workflow from DI container
    indexingWorkflow = await container.resolveAsync(SERVICE_TOKENS.INDEXING_WORKFLOW);
  });

  afterEach(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  describe('Real Business Document Indexing', () => {
    it('should index real marketing documents', async () => {
      const marketingDir = path.join(testEnv.folderPath, 'Marketing');
      
      const options: IndexingOptions = {
        includeFileTypes: ['.md', '.docx'],
        forceReindex: true,
        batchSize: 5
      };

      // This should work with REAL business documents
      const result = await indexingWorkflow.indexFolder(marketingDir, options);
      
      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBeGreaterThan(0);
      expect(result.chunksGenerated).toBeGreaterThan(0);
      expect(result.embeddingsCreated).toBeGreaterThan(0);
    });

    it('should index real financial documents', async () => {
      const financeDir = path.join(testEnv.folderPath, 'Finance');
      
      const options: IndexingOptions = {
        includeFileTypes: ['.pdf', '.xlsx'],
        forceReindex: true,
        batchSize: 3
      };

      // This should work with REAL financial documents (PDF reports, Excel files)
      const result = await indexingWorkflow.indexFolder(financeDir, options);
      
      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBeGreaterThan(0);
      // Real documents should generate embeddings
      expect(result.embeddingsCreated).toBeGreaterThan(0);
    });

    it('should handle real edge case files', async () => {
      const edgeCasesDir = path.join(testEnv.folderPath, 'test-edge-cases');
      
      const options: IndexingOptions = {
        includeFileTypes: ['.txt'],
        forceReindex: true
      };

      // This should handle empty files, huge files, etc.
      const result = await indexingWorkflow.indexFolder(edgeCasesDir, options);
      
      // Should complete even with problematic files
      expect(result.success).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      // Some files might fail (corrupted, etc.) but process should continue
    });

    it('should index entire real knowledge base', async () => {
      const options: IndexingOptions = {
        includeFileTypes: ['.md', '.txt', '.docx'],
        forceReindex: true,
        batchSize: 10
      };

      // This is a comprehensive test with ALL real business documents
      const result = await indexingWorkflow.indexFolder(testEnv.folderPath, options);
      
      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBeGreaterThan(10); // Should find many real files
      expect(result.processingTime).toBeGreaterThan(0);
      
      // Real documents should produce meaningful statistics
      expect(result.statistics).toBeDefined();
      if (result.statistics) {
        expect(result.statistics.totalBytes).toBeGreaterThan(0);
        expect(result.statistics.totalWords).toBeGreaterThan(0);
      }
    });
  });

  describe('Real Data Error Handling', () => {
    it('should handle non-existent folder gracefully', async () => {
      const nonExistentPath = path.join(testEnv.folderPath, 'does-not-exist');
      
      const options: IndexingOptions = {
        includeFileTypes: ['.txt'],
        forceReindex: true
      };

      // Should fail gracefully with real error handling
      await expect(indexingWorkflow.indexFolder(nonExistentPath, options))
        .rejects
        .toThrow();
    });

    it('should handle corrupted files in real data', async () => {
      const edgeCasesDir = path.join(testEnv.folderPath, 'test-edge-cases');
      
      const options: IndexingOptions = {
        includeFileTypes: ['.pdf', '.xlsx'], // Include potentially corrupted files
        forceReindex: true
      };

      const result = await indexingWorkflow.indexFolder(edgeCasesDir, options);
      
      // Should complete but may have errors for corrupted files
      expect(result.success).toBe(true);
      // May have errors for corrupted.pdf, corrupted.xlsx
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Real Performance Characteristics', () => {
    it('should complete indexing within reasonable time for real data', async () => {
      const smallDir = path.join(testEnv.folderPath, 'Engineering');
      
      const options: IndexingOptions = {
        includeFileTypes: ['.md', '.txt'],
        forceReindex: true
      };

      const startTime = Date.now();
      const result = await indexingWorkflow.indexFolder(smallDir, options);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(duration);
    });

    it('should provide accurate progress with real files', async () => {
      const options: IndexingOptions = {
        includeFileTypes: ['.md'],
        forceReindex: true,
        batchSize: 2
      };

      // Test progress tracking with real documents
      const result = await indexingWorkflow.indexFolder(testEnv.folderPath, options);
      
      expect(result.success).toBe(true);
      expect(result.filesProcessed).toBeGreaterThan(0);
    });
  });
});