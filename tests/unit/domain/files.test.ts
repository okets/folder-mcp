/**
 * Domain Layer - Files Module Tests
 * 
 * Unit tests for the files domain module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { IFileOperations, DefaultFileOperations } from '../../../src/domain/files/index.js';
import { MockFileSystem } from '../../mocks/fileSystem.js';

describe('Domain Layer - Files Module', () => {
  let fileOps: IFileOperations;
  let mockFs: MockFileSystem;
  let tempDir: string;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    tempDir = path.join(os.tmpdir(), `files-domain-test-${Math.random().toString(36).slice(2)}`);
    mockFs.addDir(tempDir);
    fileOps = new DefaultFileOperations(mockFs);
  });

  afterEach(() => {
    mockFs.cleanup();
  });

  describe('File Operations', () => {
    it('should parse file content correctly', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'test content';
      mockFs.addFile(filePath, content);

      const result = await fileOps.parseFile(filePath);
      expect(result.content).toBe(content);
    });

    it('should handle file not found', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');
      await expect(fileOps.parseFile(filePath))
        .rejects
        .toThrow('ENOENT');
    });

    const isLinux = process.platform === 'linux';
    (isLinux ? it : it.skip)('should handle file permissions', async () => {
      const filePath = path.join(tempDir, 'permission.txt');
      mockFs.addFile(filePath, 'content');
      mockFs.setReadOnly(filePath);
      await expect(fileOps.parseFile(filePath))
        .rejects
        .toThrow('EACCES');
    });

    it('should reject oversized files', async () => {
      const filePath = path.join(tempDir, 'large.txt');
      const largeContent = 'A'.repeat(2 * 1024 * 1024); // 2MB
      mockFs.addFile(filePath, largeContent);

      await expect(fileOps.parseFile(filePath))
        .rejects
        .toThrow('File size exceeds maximum allowed size');
    });

    it('should reject unsupported file extensions', async () => {
      const filePath = path.join(tempDir, 'test.exe');
      mockFs.addFile(filePath, 'content');

      await expect(fileOps.parseFile(filePath))
        .rejects
        .toThrow('Unsupported file extension');
    });

    it('should parse text file with metadata', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'test content';
      mockFs.addFile(filePath, content);

      const result = await fileOps.parseFile(filePath);
      expect(result.content).toBe(content);
      expect(result.metadata.originalPath).toBe(filePath);
      expect(result.metadata.type).toBe('.txt');
      expect(result.metadata.size).toBe(content.length);
    });

    it('should handle empty files', async () => {
      const filePath = path.join(tempDir, 'empty.txt');
      mockFs.addFile(filePath, '');

      const result = await fileOps.parseFile(filePath);
      expect(result.content).toBe('');
      expect(result.metadata.size).toBe(0);
    });
  });

  describe('File Scanning', () => {
    it('should scan directory and list all files', async () => {
      const files = [
        path.join(tempDir, 'file1.txt'),
        path.join(tempDir, 'subdir', 'file2.txt'),
        path.join(tempDir, 'subdir', 'nested', 'file3.txt')
      ];

      // Create test files
      for (const file of files) {
        mockFs.addFile(file, 'content');
      }

      const scannedFiles = await fileOps.scanFolder(tempDir);
      expect(scannedFiles).toHaveLength(files.length);
      expect(scannedFiles.map(f => f.originalPath).sort()).toEqual(files.sort());
    });

    it('should handle empty directory', async () => {
      const scannedFiles = await fileOps.scanFolder(tempDir);
      expect(scannedFiles).toHaveLength(0);
    });

    it('should throw error for non-existent directory', async () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');
      await expect(fileOps.scanFolder(nonExistentDir))
        .rejects
        .toThrow(`Directory not found: ${nonExistentDir}`);
    });
  });

  describe('File Watching', () => {
    it('should watch for file changes', async () => {
      await expect(fileOps.watchFolder(tempDir, () => {}))
        .rejects
        .toThrow('Not implemented');
    });
  });

  describe('Performance', () => {
    it('should handle file operations efficiently', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'test content';
      mockFs.addFile(filePath, content);

      const start = process.hrtime();
      await fileOps.parseFile(filePath);
      const [seconds, nanoseconds] = process.hrtime(start);

      expect(seconds).toBe(0);
      expect(nanoseconds).toBeLessThan(100000000); // Less than 100ms
    });
  });
});
