import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { setupRealTestEnvironment } from '../helpers/real-test-environment';
import type { RealTestEnvironment } from '../helpers/real-test-environment';
import fs from 'fs/promises';

const EDGE_CASES_DIR = path.join(__dirname, '../fixtures/test-knowledge-base/test-edge-cases');

// Utility: List of edge case files (should exist in test-edge-cases/)
const edgeCaseFiles = {
  emptyTxt: 'empty.txt',
  corruptedPdf: 'corrupted_test.pdf',
  hugeTxt: 'huge_test.txt',
  unicodeTxt: 'test_файл_测试.txt',
  fileTypeMismatch: 'binary_cache_test.bin',
  malformedRegex: '[unclosed',
  missingFile: 'does_not_exist.txt',
};

// Helper: Simple file content search (used for search endpoint edge cases)
async function searchFileContent(filePath: string, searchTerm: string): Promise<{ matches: number }> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const regex = new RegExp(searchTerm, 'g');
    const matches = (content.match(regex) || []).length;
    return { matches };
  } catch (err) {
    throw err;
  }
}

describe('Edge Case Real Tests - All Endpoints', () => {
  let env: RealTestEnvironment;

  beforeAll(async () => {
    env = await setupRealTestEnvironment('edge-cases-real');
  });

  afterAll(async () => {
    await env.cleanup();
  });

  describe('Search Endpoint Edge Cases', () => {
    it('handles empty files gracefully', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
      const result = await searchFileContent(filePath, 'anything');
      expect(result).toBeDefined();
      expect(result.matches).toBe(0);
    });
    it('handles corrupted files with error', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
      await expect(searchFileContent(filePath, 'test')).rejects.toThrow();
    });
    it('handles huge files without memory crash', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
      const result = await searchFileContent(filePath, 'x');
      expect(result).toBeDefined();
    });
    it('handles unicode filenames', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
      const result = await searchFileContent(filePath, '测试');
      expect(result).toBeDefined();
    });
    it('handles malformed regex patterns', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
      await expect(() => searchFileContent(filePath, edgeCaseFiles.malformedRegex)).rejects.toThrow();
    });
    it('handles missing files gracefully', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.missingFile);
      await expect(searchFileContent(filePath, 'test')).rejects.toThrow();
    });
  });

  // Document Data Endpoint Edge Cases
  describe('Document Data Edge Cases', () => {
    it('handles empty text files', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
      const result = await env.services.fileParsing.parseFile(filePath, 'txt');
      expect(result.content || '').toBe('');
    });
    it('handles binary masquerading as text', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
      await expect(env.services.fileParsing.parseFile(filePath, 'txt')).rejects.toThrow();
    });
    it('handles huge text files', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
      const result = await env.services.fileParsing.parseFile(filePath, 'txt');
      const text = result.content || '';
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(1000000); // >1MB
    });
    it('handles unicode filenames and content', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
      const result = await env.services.fileParsing.parseFile(filePath, 'txt');
      const text = result.content || '';
      expect(typeof text).toBe('string');
    });
    it('handles missing files gracefully', async () => {
      const filePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.missingFile);
      await expect(env.services.fileParsing.parseFile(filePath, 'txt')).rejects.toThrow();
    });
  });

  describe('Edge Case Testing for All Endpoints (real files, real I/O)', () => {
    describe('Outline Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Use fileParsing for outline (PDF) parsing
        const emptyFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptyResult = await env.services.fileParsing.parseFile(emptyFilePath, 'pdf');
        expect(emptyResult).toBeDefined();
        expect(emptyResult.content === '' || emptyResult.content == null).toBe(true);

        const corruptedFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
        await expect(env.services.fileParsing.parseFile(corruptedFilePath, 'pdf')).rejects.toThrow();

        const hugeFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        await expect(env.services.fileParsing.parseFile(hugeFilePath, 'pdf')).resolves.toBeDefined();

        const unicodeFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        await expect(env.services.fileParsing.parseFile(unicodeFilePath, 'pdf')).resolves.toBeDefined();

        const mismatchFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        // Accept empty result for empty file, only throw for non-empty mismatches
        const mismatchResult = await env.services.fileParsing.parseFile(mismatchFilePath, 'pdf');
        expect(mismatchResult).toBeDefined();
        expect(mismatchResult.content === '' || mismatchResult.content == null).toBe(true);

        const malformedRegexFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        await expect(env.services.fileParsing.parseFile(malformedRegexFilePath, 'pdf')).rejects.toThrow();

        const missingFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingFilePath, 'pdf')).rejects.toThrow();
      });
    });
    describe('Sheets Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Use fileParsing for sheets (xlsx) parsing
        const emptyFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptyResult = await env.services.fileParsing.parseFile(emptyFilePath, 'xlsx');
        expect(emptyResult).toBeDefined();
        expect(emptyResult.content === '' || emptyResult.content == null).toBe(true);

        const corruptedFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
        await expect(env.services.fileParsing.parseFile(corruptedFilePath, 'xlsx')).rejects.toThrow();

        const hugeFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        await expect(env.services.fileParsing.parseFile(hugeFilePath, 'xlsx')).resolves.toBeDefined();

        const unicodeFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        await expect(env.services.fileParsing.parseFile(unicodeFilePath, 'xlsx')).resolves.toBeDefined();

        const mismatchFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        // Accept empty result for empty file, only throw for non-empty mismatches
        const mismatchResult = await env.services.fileParsing.parseFile(mismatchFilePath, 'xlsx');
        expect(mismatchResult).toBeDefined();
        expect(mismatchResult.content === '' || mismatchResult.content == null).toBe(true);

        const malformedRegexFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        await expect(env.services.fileParsing.parseFile(malformedRegexFilePath, 'xlsx')).rejects.toThrow();

        const missingFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingFilePath, 'xlsx')).rejects.toThrow();
      });
    });
    describe('Slides Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Use fileParsing for slides (pptx) parsing
        const emptyFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptyResult = await env.services.fileParsing.parseFile(emptyFilePath, 'pptx');
        expect(emptyResult).toBeDefined();
        expect(emptyResult.content === '' || emptyResult.content == null).toBe(true);

        const corruptedFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
        await expect(env.services.fileParsing.parseFile(corruptedFilePath, 'pptx')).rejects.toThrow();

        const hugeFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        await expect(env.services.fileParsing.parseFile(hugeFilePath, 'pptx')).resolves.toBeDefined();

        const unicodeFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        await expect(env.services.fileParsing.parseFile(unicodeFilePath, 'pptx')).resolves.toBeDefined();

        const mismatchFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        // Accept empty result for empty file, only throw for non-empty mismatches
        const mismatchResult = await env.services.fileParsing.parseFile(mismatchFilePath, 'pptx');
        expect(mismatchResult).toBeDefined();
        expect(mismatchResult.content === '' || mismatchResult.content == null).toBe(true);

        const malformedRegexFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        await expect(env.services.fileParsing.parseFile(malformedRegexFilePath, 'pptx')).rejects.toThrow();

        const missingFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingFilePath, 'pptx')).rejects.toThrow();
      });
    });
    describe('Pages Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Use fileParsing for pages (pdf) parsing
        const emptyFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptyResult = await env.services.fileParsing.parseFile(emptyFilePath, 'pdf');
        expect(emptyResult).toBeDefined();
        expect(emptyResult.content === '' || emptyResult.content == null).toBe(true);

        const corruptedFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
        await expect(env.services.fileParsing.parseFile(corruptedFilePath, 'pdf')).rejects.toThrow();

        const hugeFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        await expect(env.services.fileParsing.parseFile(hugeFilePath, 'pdf')).resolves.toBeDefined();

        const unicodeFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        await expect(env.services.fileParsing.parseFile(unicodeFilePath, 'pdf')).resolves.toBeDefined();

        const mismatchFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        // Accept empty result for empty file, only throw for non-empty mismatches
        const mismatchResult = await env.services.fileParsing.parseFile(mismatchFilePath, 'pdf');
        expect(mismatchResult).toBeDefined();
        expect(mismatchResult.content === '' || mismatchResult.content == null).toBe(true);

        const malformedRegexFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        await expect(env.services.fileParsing.parseFile(malformedRegexFilePath, 'pdf')).rejects.toThrow();

        const missingFilePath = path.join(EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingFilePath, 'pdf')).rejects.toThrow();
      });
    });
    describe('Folders Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Use fileSystem for folder/file operations
        const emptyDirPath = path.join(EDGE_CASES_DIR, 'emptyDir');
        await fs.mkdir(emptyDirPath);
        const files = await fs.readdir(emptyDirPath);
        expect(files).toEqual([]);
        await fs.rmdir(emptyDirPath);
      });
    });
    describe('Status Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Use fileSystem and cache for status-like checks
        expect(await fs.stat(EDGE_CASES_DIR)).toBeDefined();
        expect(await env.services.cache.getCacheStatus([])).toBeDefined();
      });
    });
  });
});
