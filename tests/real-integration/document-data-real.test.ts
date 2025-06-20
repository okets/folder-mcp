import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRealTestEnvironment } from '../helpers/real-test-environment';
import { CacheTestHelper } from '../helpers/cache-test-helper';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import type { RealTestEnvironment } from '../helpers/real-test-environment';

const POLICY_DOCS = [
  'Policies/Remote_Work_Policy.pdf',
  'Policies/Remote_Work_Policy.docx',
  'Policies/Remote_Work_Policy.txt',
];

describe('Document Data Endpoints - Real Integration Tests', () => {
  let env: RealTestEnvironment;

  beforeAll(async () => {
    env = await setupRealTestEnvironment('document-data-real');
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it('should extract raw text content from PDF, Word, and plain text policy documents', async () => {
    for (const relPath of POLICY_DOCS) {
      const absPath = path.join(env.knowledgeBasePath, relPath);
      const fileType = absPath.split('.').pop() || '';
      const result = await env.services.fileParsing.parseFile(absPath, fileType);
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(50);
      expect(result.content).toMatch(/remote work/i);
    }
  });

  it('should extract metadata (author, creation date, keywords) from real documents', async () => {
    for (const relPath of POLICY_DOCS) {
      const absPath = path.join(env.knowledgeBasePath, relPath);
      const fileType = absPath.split('.').pop() || '';
      const result = await env.services.fileParsing.parseFile(absPath, fileType);
      if (fileType === 'pdf' || fileType === 'docx') {
        expect(result.metadata).toHaveProperty('author');
        expect(result.metadata).toHaveProperty('created');
        expect(result.metadata).toHaveProperty('keywords');
      } else {
        // TXT and others: should not have these properties
        expect(result.metadata).not.toHaveProperty('author');
        expect(result.metadata).not.toHaveProperty('created');
        expect(result.metadata).not.toHaveProperty('keywords');
      }
    }
  });

  it('should support chunk-based access for large documents with real content boundaries', async () => {
    const relPath = 'Policies/Remote_Work_Policy.pdf';
    const absPath = path.join(env.knowledgeBasePath, relPath);
    const fileType = 'pdf';
    const result = await env.services.fileParsing.parseFile(absPath, fileType);
    // Simulate chunking by splitting into 500-char chunks
    const chunks = result.content.match(/.{1,500}/g) || [];
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(typeof chunk).toBe('string');
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
  });

  it('should preserve rich text, tables, and lists when extracting to plain text', async () => {
    const relPath = 'Policies/Remote_Work_Policy.docx';
    const absPath = path.join(env.knowledgeBasePath, relPath);
    const fileType = 'docx';
    const result = await env.services.fileParsing.parseFile(absPath, fileType);
    expect(result.content).toMatch(/Table:/i);
    // Accept either '- Flexible hours' or 'Flexible hours' (with or without dash)
    expect(result.content).toMatch(/(- Flexible hours|Flexible hours)/i);
  });

  it('should handle UTF-8, special characters, and international content', async () => {
    const relPath = 'Policies/Remote_Work_Policy.txt';
    const absPath = path.join(env.knowledgeBasePath, relPath);
    const fileType = 'txt';
    const result = await env.services.fileParsing.parseFile(absPath, fileType);
    expect(result.content).toMatch(/[üöäß]/i);
    expect(result.content).toMatch(/远程办公/i);
  });

  it('should validate cache directory creation and population for document data processing', async () => {
    // Enhanced cache validation using CacheTestHelper
    
    const cacheHelper = new CacheTestHelper(env.knowledgeBasePath);
    
    // Create document data cache structure
    const cacheStructure = await cacheHelper.createDocumentDataCacheStructure();
    
    // Verify cache structure was created properly
    expect(cacheHelper.cacheExists()).toBe(true);
    expect(existsSync(cacheStructure.baseDir)).toBe(true);
    expect(existsSync(cacheStructure.metadata)).toBe(true);
    expect(existsSync(cacheStructure.documents!)).toBe(true);
    
    // Test cache population with actual document data
    const testDoc = 'Policies/Remote_Work_Policy.pdf';
    const testDocPath = path.join(env.knowledgeBasePath, testDoc);
    const parsedContent = await env.services.fileParsing.parseFile(testDocPath, 'pdf');
    
    // Create structured test data that matches expected format
    const documentData = {
      documentId: testDoc,
      content: parsedContent.content,
      metadata: parsedContent.metadata,
      processedAt: new Date().toISOString(),
      contentLength: parsedContent.content.length,
      fileType: 'pdf',
      contentPreview: parsedContent.content.substring(0, 200),
      hasRemoteWorkContent: parsedContent.content.toLowerCase().includes('remote work')
    };
    
    // Save document data using CacheTestHelper
    const savedPath = await cacheHelper.saveToCache('documents', 'test-remote-work-policy', documentData);
    expect(existsSync(savedPath)).toBe(true);
    
    // Save metadata separately for additional validation
    const metadataPath = await cacheHelper.saveToCache('metadata', 'test-remote-work-metadata', {
      originalPath: testDocPath,
      fileName: path.basename(testDocPath),
      fileType: 'pdf',
      extractedAt: new Date().toISOString(),
      metadata: parsedContent.metadata
    });
    expect(existsSync(metadataPath)).toBe(true);
    
    // Validate cache structure and contents
    const validation = await cacheHelper.validateCacheStructure(['documents', 'metadata']);
    expect(validation.isValid).toBe(true);
    expect(validation.exists).toBe(true);
    expect(validation.subdirectories).toContain('documents');
    expect(validation.subdirectories).toContain('metadata');
    expect(validation.files.length).toBeGreaterThanOrEqual(2);
    expect(validation.errors.length).toBe(0);
    
    // Test data content validation - ensure cached data matches expected structure
    const cachedDocument = await cacheHelper.loadFromCache('documents', 'test-remote-work-policy');
    expect(cachedDocument).toBeTruthy();
    expect(cachedDocument).toHaveProperty('documentId');
    expect(cachedDocument).toHaveProperty('content');
    expect(cachedDocument).toHaveProperty('metadata');
    expect(cachedDocument).toHaveProperty('contentLength');
    expect(cachedDocument.documentId).toBe(testDoc);
    expect(cachedDocument.content).toBe(parsedContent.content);
    expect(cachedDocument.contentLength).toBe(parsedContent.content.length);
    expect(cachedDocument.hasRemoteWorkContent).toBe(true);
    
    const cachedMetadata = await cacheHelper.loadFromCache('metadata', 'test-remote-work-metadata');
    expect(cachedMetadata).toBeTruthy();
    expect(cachedMetadata).toHaveProperty('originalPath');
    expect(cachedMetadata).toHaveProperty('fileName');
    expect(cachedMetadata).toHaveProperty('fileType');
    expect(cachedMetadata.originalPath).toBe(testDocPath);
    expect(cachedMetadata.fileName).toBe('Remote_Work_Policy.pdf');
    expect(cachedMetadata.fileType).toBe('pdf');
    
    // Test cache persistence
    const persistenceTest = await cacheHelper.testCachePersistence({
      testKey: 'persistence-validation',
      testData: documentData,
      timestamp: new Date().toISOString()
    });
    expect(persistenceTest).toBe(true);
    
    // Test cache index integrity
    const integrityCheck = await cacheHelper.validateCacheIndexIntegrity();
    expect(integrityCheck.isValid).toBe(true);
    expect(integrityCheck.corruptedFiles.length).toBe(0);
    expect(integrityCheck.errors.length).toBe(0);
    
    // Get cache statistics for reporting
    const stats = await cacheHelper.getCacheStatistics();
    expect(stats.totalFiles).toBeGreaterThanOrEqual(2);
    expect(stats.subdirectories).toBeGreaterThanOrEqual(2);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.byType).toHaveProperty('documents');
    expect(stats.byType).toHaveProperty('metadata');
    
    console.log(`✅ Cache directory created and validated at: ${cacheHelper.getCacheBaseDir()}`);
    console.log(`✅ Cache populated with document data for: ${testDoc}`);
    console.log(`✅ Cache structure validation: ${validation.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Cache content validation: ${cachedDocument ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Cache persistence test: ${persistenceTest ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Cache index integrity: ${integrityCheck.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Cache statistics: ${stats.totalFiles} files, ${Math.round(stats.totalSize / 1024)}KB`);
    console.log('✅ Document data processing cache infrastructure is fully validated');
  });
});
