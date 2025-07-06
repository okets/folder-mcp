/**
 * Domain Layer - Files Module Tests
 * 
 * Unit tests for the files domain module using REAL test data
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { IFileOperations, DefaultFileOperations } from '../../../src/domain/files/index.js';
import { NodeFileSystem } from '../../../src/infrastructure/filesystem/node-filesystem.js';
import { setupTestEnvironment, cleanupTestEnvironment, type TestEnvironment } from '../../helpers/setup.js';

describe('Domain Layer - Files Module', () => {
  let fileOps: IFileOperations;
  let testEnv: TestEnvironment;
  let testKnowledgeBasePath: string;

  beforeEach(async () => {
    testEnv = await setupTestEnvironment();
    testKnowledgeBasePath = testEnv.folderPath;
    // Use real file system for domain operations
    const realFileSystem = new NodeFileSystem();
    fileOps = new DefaultFileOperations(realFileSystem);
  });

  afterEach(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  describe('File Operations', () => {
    it('should parse real text file content correctly', async () => {
      // Use actual text file from test knowledge base
      const filePath = path.join(testKnowledgeBasePath, 'Engineering', 'notes.txt');
      
      const result = await fileOps.parseFile(filePath);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.metadata.type).toBe('.txt');
    });

    it('should parse real markdown file correctly', async () => {
      // Use actual markdown file from test knowledge base
      const filePath = path.join(testKnowledgeBasePath, 'Marketing', 'competitive_analysis.md');
      
      const result = await fileOps.parseFile(filePath);
      expect(result.content).toBeDefined();
      expect(result.content).toContain('# Competitive Intelligence Analysis Report');
      expect(result.metadata.type).toBe('.md');
    });

    it('should handle file not found', async () => {
      const filePath = path.join(testKnowledgeBasePath, 'nonexistent.txt');
      await expect(fileOps.parseFile(filePath))
        .rejects
        .toThrow();
    });

    it('should reject PDF files (unsupported extension)', async () => {
      // Use actual PDF from test knowledge base  
      const filePath = path.join(testKnowledgeBasePath, 'Finance', 'Reports', 'Annual_Report_2024.pdf');
      
      // DefaultFileOperations only supports text files, so PDF should be rejected
      await expect(fileOps.parseFile(filePath))
        .rejects
        .toThrow('Unsupported file extension');
    });

    it('should reject files that exceed size limit', async () => {
      // Use the actual huge test file from test knowledge base (3.3MB > 1MB limit)
      const filePath = path.join(testKnowledgeBasePath, 'test-edge-cases', 'huge_test.txt');
      
      // DefaultFileOperations has a 1MB limit, so this should be rejected
      await expect(fileOps.parseFile(filePath))
        .rejects
        .toThrow('File size exceeds maximum allowed size');
    });

    it('should handle unsupported file extensions', async () => {
      // Use actual binary file from test knowledge base
      const filePath = path.join(testKnowledgeBasePath, 'test-edge-cases', 'binary_cache_test.bin');
      
      // This should either reject or handle gracefully based on implementation
      await expect(fileOps.parseFile(filePath))
        .rejects
        .toThrow();
    });

    it('should parse text file with correct metadata', async () => {
      // Use actual markdown file (since it's text-based and should work)
      const filePath = path.join(testKnowledgeBasePath, 'Policies', 'Remote_Work_Policy.md');
      
      const result = await fileOps.parseFile(filePath);
      expect(result.content).toBeDefined();
      expect(result.metadata.originalPath).toBe(filePath);
      expect(result.metadata.type).toBe('.md');
      expect(result.metadata.size).toBeGreaterThan(0);
      expect(result.metadata.modified).toBeInstanceOf(Date);
    });

    it('should handle empty files correctly', async () => {
      // Use actual empty file from test knowledge base
      const filePath = path.join(testKnowledgeBasePath, 'test-edge-cases', 'empty.txt');
      
      const result = await fileOps.parseFile(filePath);
      expect(result.content).toBe('');
      expect(result.metadata.size).toBe(0);
    });
  });

  describe('File Scanning', () => {
    it('should scan directory and list supported files', async () => {
      // Scan the Engineering directory which has mixed file types
      const engineeringDir = path.join(testKnowledgeBasePath, 'Engineering');
      
      const scannedFiles = await fileOps.scanFolder(engineeringDir);
      expect(scannedFiles).toBeDefined();
      expect(Array.isArray(scannedFiles)).toBe(true);
      
      // Should find text files like notes.txt and README.md
      const textFiles = scannedFiles.filter(f => 
        f.originalPath.endsWith('.txt') || f.originalPath.endsWith('.md')
      );
      expect(textFiles.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent directory', async () => {
      const nonExistentDir = path.join(testKnowledgeBasePath, 'nonexistent-folder');
      await expect(fileOps.scanFolder(nonExistentDir))
        .rejects
        .toThrow();
    });
  });

  describe('Performance with Real Files', () => {
    it('should handle real file operations efficiently', async () => {
      // Test performance with actual file from test knowledge base
      const filePath = path.join(testKnowledgeBasePath, 'Engineering', 'README.md');

      const start = process.hrtime();
      await fileOps.parseFile(filePath);
      const [seconds, nanoseconds] = process.hrtime(start);

      expect(seconds).toBe(0);
      expect(nanoseconds).toBeLessThan(500000000); // Less than 500ms for real file operations
    });
  });
});
