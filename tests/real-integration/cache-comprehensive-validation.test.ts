/**
 * Comprehensive Cache Validation Tests
 * 
 * Advanced tests for cache persistence, index integrity, and cross-endpoint validation.
 * Validates that cache infrastructure works consistently across all endpoint types.
 * 
 * ⚠️ CRITICAL: These tests ensure cache reliability and data integrity
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { CacheTestHelper } from '../helpers/cache-test-helper';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Comprehensive Cache Validation Tests', () => {
  let tempDirs: string[] = [];
  let knowledgeBasePath: string;
  let cacheHelper: CacheTestHelper;
  
  beforeEach(async () => {
    // Create temp directory for this test
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-validation-test-'));
    tempDirs.push(tempDir);
    
    // Copy test knowledge base
    const sourceKnowledgeBase = path.join(process.cwd(), 'tests', 'fixtures', 'test-knowledge-base');
    knowledgeBasePath = path.join(tempDir, 'test-knowledge-base');
    
    await copyDirectory(sourceKnowledgeBase, knowledgeBasePath);
    
    // Initialize cache helper
    cacheHelper = new CacheTestHelper(knowledgeBasePath);
    
    console.log(`🔄 Cache validation test setup complete: ${knowledgeBasePath}`);
  });
  
  afterEach(async () => {
    // Clean up temp directories
    for (const tempDir of tempDirs) {
      try {
        if (existsSync(tempDir)) {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${tempDir}:`, error);
      }
    }
    tempDirs = [];
  });

  test('should validate cache persistence across multiple data types and operations', async () => {
    // Task 15.11: Comprehensive cache persistence testing
    
    console.log('🔄 Testing cache persistence across multiple endpoint types...');
    
    const persistenceResults = {
      searchCache: false,
      outlineCache: false,
      documentCache: false,
      sheetCache: false,
      slideCache: false,
      pageCache: false,
      embeddingCache: false,
      workflowCache: false
    };
    
    // Test search cache persistence
    const searchStructure = await cacheHelper.createSearchCacheStructure();
    const searchData = {
      query: 'remote work policy',
      results: [
        { path: 'Policies/Remote_Work_Policy.pdf', score: 0.95 },
        { path: 'Policies/Remote_Work_Policy.docx', score: 0.90 }
      ],
      timestamp: new Date().toISOString(),
      embeddings: [0.1, 0.2, 0.3, 0.4, 0.5]
    };
    persistenceResults.searchCache = await cacheHelper.testCachePersistence(searchData);
    
    // Test outline cache persistence
    const outlineStructure = await cacheHelper.createOutlineCacheStructure();
    const outlineData = {
      documentId: 'Finance/2024/Q1/Q1_Report.pdf',
      type: 'pdf',
      totalPages: 25,
      bookmarks: [
        { title: 'Executive Summary', page: 1 },
        { title: 'Financial Overview', page: 5 },
        { title: 'Conclusions', page: 20 }
      ],
      extractedAt: new Date().toISOString()
    };
    persistenceResults.outlineCache = await cacheHelper.testCachePersistence(outlineData);
    
    // Test document cache persistence
    const documentStructure = await cacheHelper.createDocumentDataCacheStructure();
    const documentData = {
      documentId: 'Policies/Remote_Work_Policy.pdf',
      content: 'Company remote work policy content...',
      metadata: { author: 'HR Department', created: '2024-01-01' },
      contentLength: 1500,
      processedAt: new Date().toISOString()
    };
    persistenceResults.documentCache = await cacheHelper.testCachePersistence(documentData);
    
    // Test sheet cache persistence
    const sheetStructure = await cacheHelper.createSheetDataCacheStructure();
    const sheetData = {
      sheetName: 'Customer_List',
      headers: ['customer_id', 'company_name', 'revenue', 'renewal_date'],
      rowCount: 150,
      columnCount: 8,
      extractedAt: new Date().toISOString()
    };
    persistenceResults.sheetCache = await cacheHelper.testCachePersistence(sheetData);
    
    // Test slides cache persistence
    const slidesStructure = await cacheHelper.createSlidesCacheStructure();
    const slidesData = {
      presentationId: 'Sales/Presentations/Q4_Board_Deck.pptx',
      totalSlides: 12,
      slides: [
        { slideNumber: 1, title: 'Executive Summary', content: 'Q4 results overview' },
        { slideNumber: 2, title: 'Financial Performance', content: 'Revenue growth metrics' }
      ],
      extractedAt: new Date().toISOString()
    };
    persistenceResults.slideCache = await cacheHelper.testCachePersistence(slidesData);
    
    // Test pages cache persistence
    const pagesStructure = await cacheHelper.createPagesCacheStructure();
    const pagesData = {
      documentId: 'Legal/Contracts/Acme_Vendor_Agreement.pdf',
      totalPages: 15,
      pages: [
        { pageNumber: 1, content: 'Agreement overview and terms...' },
        { pageNumber: 2, content: 'Payment terms and conditions...' }
      ],
      extractedAt: new Date().toISOString()
    };
    persistenceResults.pageCache = await cacheHelper.testCachePersistence(pagesData);
    
    // Test embedding cache persistence
    const embeddingStructure = await cacheHelper.createEmbeddingCacheStructure();
    const embeddingData = {
      textId: 'remote-work-policy-chunk-1',
      vector: Array.from({ length: 384 }, () => Math.random()),
      dimensions: 384,
      model: 'mxbai-embed-large',
      generatedAt: new Date().toISOString()
    };
    persistenceResults.embeddingCache = await cacheHelper.testCachePersistence(embeddingData);
    
    // Test workflow cache persistence
    const workflowStructure = await cacheHelper.createWorkflowCacheStructure();
    const workflowData = {
      workflowId: 'financial-analysis-complete',
      steps: [
        { step: 1, action: 'Search sales data', status: 'completed' },
        { step: 2, action: 'Extract Q1 report outline', status: 'completed' },
        { step: 3, action: 'Analyze customer data', status: 'completed' }
      ],
      totalSteps: 3,
      completedSteps: 3,
      executedAt: new Date().toISOString()
    };
    persistenceResults.workflowCache = await cacheHelper.testCachePersistence(workflowData);
    
    // Validate all persistence tests passed
    const persistenceTestResults = Object.entries(persistenceResults);
    const passedTests = persistenceTestResults.filter(([_, passed]) => passed).length;
    const totalTests = persistenceTestResults.length;
    
    console.log('✅ Cache Persistence Test Results:');
    persistenceTestResults.forEach(([cacheType, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${cacheType}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    console.log(`   📊 Overall: ${passedTests}/${totalTests} persistence tests passed`);
    
    // All persistence tests must pass
    expect(passedTests).toBe(totalTests);
    expect(persistenceResults.searchCache).toBe(true);
    expect(persistenceResults.outlineCache).toBe(true);
    expect(persistenceResults.documentCache).toBe(true);
    expect(persistenceResults.sheetCache).toBe(true);
    expect(persistenceResults.slideCache).toBe(true);
    expect(persistenceResults.pageCache).toBe(true);
    expect(persistenceResults.embeddingCache).toBe(true);
    expect(persistenceResults.workflowCache).toBe(true);
    
    console.log('🎉 All cache persistence tests completed successfully!');
  });

  test('should validate cache index integrity and prevent data corruption', async () => {
    // Task 15.12: Comprehensive cache index integrity validation
    
    console.log('🔄 Testing cache index integrity and corruption detection...');
    
    // Create multiple cache structures with sample data
    await cacheHelper.createSearchCacheStructure();
    await cacheHelper.createOutlineCacheStructure();
    await cacheHelper.createDocumentDataCacheStructure();
    await cacheHelper.createSheetDataCacheStructure();
    await cacheHelper.createSlidesCacheStructure();
    await cacheHelper.createPagesCacheStructure();
    await cacheHelper.createEmbeddingCacheStructure();
    await cacheHelper.createWorkflowCacheStructure();
    
    // Populate cache with valid JSON data
    const validDataSets = [
      { subdir: 'search', key: 'valid-search-1', data: { query: 'test', results: [] } },
      { subdir: 'outlines', key: 'valid-outline-1', data: { type: 'pdf', pages: 10 } },
      { subdir: 'documents', key: 'valid-doc-1', data: { content: 'test content' } },
      { subdir: 'sheets', key: 'valid-sheet-1', data: { headers: ['col1', 'col2'] } },
      { subdir: 'slides', key: 'valid-slides-1', data: { totalSlides: 5 } },
      { subdir: 'pages', key: 'valid-pages-1', data: { pages: [] } },
      { subdir: 'embeddings', key: 'valid-embed-1', data: { vector: [0.1, 0.2] } },
      { subdir: 'workflows', key: 'valid-workflow-1', data: { steps: [] } }
    ];
    
    // Save valid data
    for (const dataset of validDataSets) {
      await cacheHelper.saveToCache(dataset.subdir, dataset.key, dataset.data);
    }
    
    // Test 1: Validate all valid data passes integrity check
    let integrityCheck = await cacheHelper.validateCacheIndexIntegrity();
    expect(integrityCheck.isValid).toBe(true);
    expect(integrityCheck.corruptedFiles.length).toBe(0);
    expect(integrityCheck.errors.length).toBe(0);
    
    console.log('✅ Initial integrity check passed - all valid data');
    
    // Test 2: Simulate corrupted JSON files and detect them
    const corruptedFiles = [
      { subdir: 'search', key: 'corrupted-search', content: '{ invalid json' },
      { subdir: 'documents', key: 'corrupted-doc', content: '{ "incomplete": json' },
      { subdir: 'embeddings', key: 'corrupted-embed', content: 'not json at all' }
    ];
    
    // Create corrupted files directly (bypassing CacheTestHelper's JSON validation)
    for (const corrupt of corruptedFiles) {
      const corruptPath = path.join(cacheHelper.getCacheBaseDir(), corrupt.subdir, `${corrupt.key}.json`);
      await fs.writeFile(corruptPath, corrupt.content);
    }
    
    // Test 3: Validate corruption detection
    integrityCheck = await cacheHelper.validateCacheIndexIntegrity();
    expect(integrityCheck.isValid).toBe(false);
    expect(integrityCheck.corruptedFiles.length).toBe(3);
    expect(integrityCheck.errors.length).toBe(0);
    
    // Verify specific corrupted files are detected
    const detectedCorrupted = integrityCheck.corruptedFiles.map(f => path.basename(f, '.json'));
    expect(detectedCorrupted).toContain('corrupted-search');
    expect(detectedCorrupted).toContain('corrupted-doc');
    expect(detectedCorrupted).toContain('corrupted-embed');
    
    console.log('✅ Corruption detection working - found all 3 corrupted files');
    
    // Test 4: Clean up corrupted files and verify recovery
    for (const corrupt of corruptedFiles) {
      const corruptPath = path.join(cacheHelper.getCacheBaseDir(), corrupt.subdir, `${corrupt.key}.json`);
      await fs.unlink(corruptPath);
    }
    
    // Test 5: Validate recovery after cleanup
    integrityCheck = await cacheHelper.validateCacheIndexIntegrity();
    expect(integrityCheck.isValid).toBe(true);
    expect(integrityCheck.corruptedFiles.length).toBe(0);
    expect(integrityCheck.errors.length).toBe(0);
    
    console.log('✅ Recovery verification passed - integrity restored after cleanup');
    
    // Test 6: Validate cache statistics remain accurate
    const stats = await cacheHelper.getCacheStatistics();
    expect(stats.totalFiles).toBeGreaterThanOrEqual(validDataSets.length);
    expect(stats.subdirectories).toBeGreaterThanOrEqual(8);
    expect(stats.totalSize).toBeGreaterThan(0);
    
    // Verify each subdirectory has expected files
    for (const dataset of validDataSets) {
      expect(stats.byType).toHaveProperty(dataset.subdir);
      expect(stats.byType[dataset.subdir]).toBeGreaterThan(0);
    }
    
    console.log('✅ Cache Index Integrity Test Results:');
    console.log(`   📊 Initial state: ${integrityCheck.isValid ? 'VALID' : 'INVALID'}`);
    console.log(`   🔍 Corruption detection: 3/3 corrupted files found`);
    console.log(`   🔧 Recovery validation: ${integrityCheck.isValid ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   📈 Final statistics: ${stats.totalFiles} files, ${stats.subdirectories} subdirs`);
    
    console.log('🎉 Cache index integrity validation completed successfully!');
  });

  test('should validate cross-endpoint cache consistency and data relationships', async () => {
    // Advanced test: Validate that cache data across different endpoints maintains consistency
    
    console.log('🔄 Testing cross-endpoint cache consistency...');
    
    // Create all cache structures
    const structures = {
      search: await cacheHelper.createSearchCacheStructure(),
      outline: await cacheHelper.createOutlineCacheStructure(),
      document: await cacheHelper.createDocumentDataCacheStructure(),
      sheet: await cacheHelper.createSheetDataCacheStructure(),
      slides: await cacheHelper.createSlidesCacheStructure(),
      pages: await cacheHelper.createPagesCacheStructure(),
      embedding: await cacheHelper.createEmbeddingCacheStructure(),
      workflow: await cacheHelper.createWorkflowCacheStructure()
    };
    
    // Verify all structures were created
    for (const [structureName, structure] of Object.entries(structures)) {
      expect(existsSync(structure.baseDir)).toBe(true);
      expect(existsSync(structure.metadata)).toBe(true);
      console.log(`✅ ${structureName} cache structure created`);
    }
    
    // Test document consistency across endpoints
    const testDocumentId = 'Finance/2024/Q1/Q1_Report.pdf';
    
    // Save related data across multiple cache types that should reference the same document
    await cacheHelper.saveToCache('search', 'q1-report-search', {
      query: 'Q1 financial report',
      results: [{ path: testDocumentId, score: 0.95 }],
      documentId: testDocumentId
    });
    
    await cacheHelper.saveToCache('outlines', 'q1-report-outline', {
      documentId: testDocumentId,
      type: 'pdf',
      totalPages: 25,
      bookmarks: [{ title: 'Financial Summary', page: 1 }]
    });
    
    await cacheHelper.saveToCache('documents', 'q1-report-content', {
      documentId: testDocumentId,
      content: 'Q1 financial report content...',
      contentLength: 15000
    });
    
    await cacheHelper.saveToCache('pages', 'q1-report-pages', {
      documentId: testDocumentId,
      totalPages: 25,
      pages: [{ pageNumber: 1, content: 'Executive summary...' }]
    });
    
    // Validate data consistency across cache types
    const searchData = await cacheHelper.loadFromCache('search', 'q1-report-search');
    const outlineData = await cacheHelper.loadFromCache('outlines', 'q1-report-outline');
    const documentData = await cacheHelper.loadFromCache('documents', 'q1-report-content');
    const pagesData = await cacheHelper.loadFromCache('pages', 'q1-report-pages');
    
    // All data should reference the same document
    expect(searchData.documentId).toBe(testDocumentId);
    expect(outlineData.documentId).toBe(testDocumentId);
    expect(documentData.documentId).toBe(testDocumentId);
    expect(pagesData.documentId).toBe(testDocumentId);
    
    // Page counts should be consistent
    expect(outlineData.totalPages).toBe(pagesData.totalPages);
    
    // Search results should reference actual document
    expect(searchData.results[0].path).toBe(testDocumentId);
    
    console.log('✅ Cross-endpoint data consistency validated');
    
    // Validate cache structure integrity across all types
    const validationResults = await Promise.all([
      cacheHelper.validateCacheStructure(['search', 'embeddings', 'vectors']),
      cacheHelper.validateCacheStructure(['outlines', 'structure']),
      cacheHelper.validateCacheStructure(['documents']),
      cacheHelper.validateCacheStructure(['sheets', 'csv']),
      cacheHelper.validateCacheStructure(['slides', 'presentations']),
      cacheHelper.validateCacheStructure(['pages', 'documents']),
      cacheHelper.validateCacheStructure(['embeddings', 'vectors']),
      cacheHelper.validateCacheStructure(['workflows', 'search', 'integrations'])
    ]);
    
    // All validations should pass
    validationResults.forEach((result, index) => {
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    console.log(`✅ All ${validationResults.length} cache structure validations passed`);
    
    // Final comprehensive statistics
    const finalStats = await cacheHelper.getCacheStatistics();
    
    console.log('✅ Cross-Endpoint Cache Consistency Results:');
    console.log(`   📊 Total cache files: ${finalStats.totalFiles}`);
    console.log(`   📁 Subdirectories: ${finalStats.subdirectories}`);
    console.log(`   💾 Total cache size: ${Math.round(finalStats.totalSize / 1024)}KB`);
    console.log(`   🔗 Data consistency: VALIDATED`);
    console.log(`   🏗️ Structure integrity: VALIDATED`);
    
    expect(finalStats.totalFiles).toBeGreaterThan(0);
    expect(finalStats.subdirectories).toBeGreaterThanOrEqual(8);
    expect(finalStats.totalSize).toBeGreaterThan(0);
    
    console.log('🎉 Cross-endpoint cache consistency validation completed successfully!');
  });
});

/**
 * Copy directory recursively
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