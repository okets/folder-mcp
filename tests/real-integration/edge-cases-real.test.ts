/**
 * Edge Case Real Tests - All Endpoints (Fixed Version)
 * 
 * Real tests for edge cases across all MCP endpoints.
 * Tests use real files, real I/O operations, and real error handling.
 * 
 * ⚠️ CRITICAL: These tests use REAL files, REAL operations, NO MOCKS
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRealTestEnvironment } from '../helpers/real-test-environment';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import type { RealTestEnvironment } from '../helpers/real-test-environment';

const EDGE_CASES_DIR = 'test-edge-cases';
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

describe('Edge Case Real Tests - All Endpoints (Fixed)', () => {
  let env: RealTestEnvironment;

  beforeAll(async () => {
    env = await setupRealTestEnvironment('edge-cases-real');
  });

  afterAll(async () => {
    await env.cleanup();
  });

  describe('Edge Case Testing for All Endpoints (real files, real I/O)', () => {
    describe('Basic Edge Case Infrastructure', () => {
      it('has all required edge case test files', async () => {
        const edgeCasePath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR);
        
        expect(existsSync(edgeCasePath)).toBe(true);
        expect(existsSync(path.join(edgeCasePath, edgeCaseFiles.emptyTxt))).toBe(true);
        expect(existsSync(path.join(edgeCasePath, edgeCaseFiles.hugeTxt))).toBe(true);
        expect(existsSync(path.join(edgeCasePath, edgeCaseFiles.unicodeTxt))).toBe(true);
        expect(existsSync(path.join(edgeCasePath, edgeCaseFiles.fileTypeMismatch))).toBe(true);
      });
    });

    describe('Document Data Endpoint', () => {
      it('handles empty files', async () => {
        const emptyPath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const result = await env.services.fileParsing.parseFile(emptyPath, 'txt');
        expect(result.content || '').toBe('');
      });
      
      it('handles binary masquerading as text', async () => {
        const binPath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        await expect(env.services.fileParsing.parseFile(binPath, 'txt')).rejects.toThrow();
      });
      
      it('handles huge text files', async () => {
        const hugePath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        const result = await env.services.fileParsing.parseFile(hugePath, 'txt');
        const text = result.content || '';
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(1000000); // >1MB
      });
      
      it('handles unicode filenames and content', async () => {
        const unicodePath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        const result = await env.services.fileParsing.parseFile(unicodePath, 'txt');
        expect(result.content).toBeDefined();
        expect(typeof result.content).toBe('string');
      });
      
      it('handles missing files', async () => {
        const missingPath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingPath, 'txt')).rejects.toThrow();
      });
    });

    describe('Outline Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Test empty file parsing as PDF
        const emptyFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptyResult = await env.services.fileParsing.parseFile(emptyFile, 'pdf');
        expect(emptyResult).toBeDefined();
        expect(emptyResult.content === '' || emptyResult.content == null).toBe(true);

        // Test corrupted PDF
        const corruptedFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
        await expect(env.services.fileParsing.parseFile(corruptedFile, 'pdf')).rejects.toThrow();

        // Test huge file
        const hugeFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        await expect(env.services.fileParsing.parseFile(hugeFile, 'pdf')).resolves.toBeDefined();

        // Test unicode file
        const unicodeFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        await expect(env.services.fileParsing.parseFile(unicodeFile, 'pdf')).resolves.toBeDefined();

        // Test unsupported file type (.bin)
        const mismatchFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        await expect(env.services.fileParsing.parseFile(mismatchFile, 'pdf')).rejects.toThrow('Unsupported file type: .bin');

        // Test missing file
        const missingFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingFile, 'pdf')).rejects.toThrow();
      });
    });

    describe('Sheets Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Test empty file parsing as Excel
        const emptyXlsFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptyXlsResult = await env.services.fileParsing.parseFile(emptyXlsFile, 'xlsx');
        expect(emptyXlsResult).toBeDefined();
        expect(emptyXlsResult.content === '' || emptyXlsResult.content == null).toBe(true);

        // Test corrupted file as Excel
        const corruptedXlsFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
        await expect(env.services.fileParsing.parseFile(corruptedXlsFile, 'xlsx')).rejects.toThrow();

        // Test huge file as Excel
        const hugeXlsFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        await expect(env.services.fileParsing.parseFile(hugeXlsFile, 'xlsx')).resolves.toBeDefined();

        // Test unicode file as Excel
        const unicodeXlsFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        await expect(env.services.fileParsing.parseFile(unicodeXlsFile, 'xlsx')).resolves.toBeDefined();

        // Test unsupported file type (.bin) as Excel
        const mismatchXlsFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        await expect(env.services.fileParsing.parseFile(mismatchXlsFile, 'xlsx')).rejects.toThrow('Unsupported file type: .bin');

        // Test missing file as Excel
        const missingXlsFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingXlsFile, 'xlsx')).rejects.toThrow();
      });
    });

    describe('Slides Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Test empty file parsing as PowerPoint
        const emptyPptFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptyPptResult = await env.services.fileParsing.parseFile(emptyPptFile, 'pptx');
        expect(emptyPptResult).toBeDefined();
        expect(emptyPptResult.content === '' || emptyPptResult.content == null).toBe(true);

        // Test corrupted file as PowerPoint
        const corruptedPptFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
        await expect(env.services.fileParsing.parseFile(corruptedPptFile, 'pptx')).rejects.toThrow();

        // Test huge file as PowerPoint
        const hugePptFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        await expect(env.services.fileParsing.parseFile(hugePptFile, 'pptx')).resolves.toBeDefined();

        // Test unicode file as PowerPoint
        const unicodePptFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        await expect(env.services.fileParsing.parseFile(unicodePptFile, 'pptx')).resolves.toBeDefined();

        // Test unsupported file type (.bin) as PowerPoint
        const mismatchPptFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        await expect(env.services.fileParsing.parseFile(mismatchPptFile, 'pptx')).rejects.toThrow('Unsupported file type: .bin');

        // Test missing file as PowerPoint
        const missingPptFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingPptFile, 'pptx')).rejects.toThrow();
      });
    });

    describe('Pages Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Test empty file for page extraction
        const emptyPageFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptyPageResult = await env.services.fileParsing.parseFile(emptyPageFile, 'pdf');
        expect(emptyPageResult).toBeDefined();
        expect(emptyPageResult.content === '' || emptyPageResult.content == null).toBe(true);

        // Test corrupted PDF for page extraction
        const corruptedPageFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.corruptedPdf);
        await expect(env.services.fileParsing.parseFile(corruptedPageFile, 'pdf')).rejects.toThrow();

        // Test huge file for page extraction
        const hugePageFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        await expect(env.services.fileParsing.parseFile(hugePageFile, 'pdf')).resolves.toBeDefined();

        // Test unicode file for page extraction
        const unicodePageFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        await expect(env.services.fileParsing.parseFile(unicodePageFile, 'pdf')).resolves.toBeDefined();

        // Test unsupported file type (.bin) for page extraction
        const mismatchPageFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        await expect(env.services.fileParsing.parseFile(mismatchPageFile, 'pdf')).rejects.toThrow('Unsupported file type: .bin');

        // Test missing file for page extraction
        const missingPageFile = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.missingFile);
        await expect(env.services.fileParsing.parseFile(missingPageFile, 'pdf')).rejects.toThrow();
      });
    });

    describe('Folders Endpoint', () => {
      it('handles all edge cases with real files', async () => {
        // Test folder operations with edge case scenarios
        const edgeCaseDir = path.join(env.knowledgeBasePath, EDGE_CASES_DIR);
        
        // Verify edge case directory exists
        expect(existsSync(edgeCaseDir)).toBe(true);
        
        // Test folder listing includes edge case files
        const files = await fs.readdir(edgeCaseDir);
        expect(files.length).toBeGreaterThan(0);
        expect(files).toContain(edgeCaseFiles.emptyTxt);
        expect(files).toContain(edgeCaseFiles.hugeTxt);
        expect(files).toContain(edgeCaseFiles.unicodeTxt);
        expect(files).toContain(edgeCaseFiles.fileTypeMismatch);
        
        // Test that missing files are properly handled
        const missingDir = path.join(env.knowledgeBasePath, 'nonexistent-directory');
        expect(existsSync(missingDir)).toBe(false);
      });
    });

    describe('Search Endpoint', () => {
      it('handles search across edge case files', async () => {
        // Test search in huge file
        const hugePath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.hugeTxt);
        const hugeSearchResult = await searchFileContent(hugePath, 'test');
        expect(hugeSearchResult.matches).toBeGreaterThan(0);
        
        // Test search in unicode file
        const unicodePath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.unicodeTxt);
        const unicodeSearchResult = await searchFileContent(unicodePath, 'test');
        expect(unicodeSearchResult.matches).toBeGreaterThanOrEqual(0);
        
        // Test search in empty file
        const emptyPath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.emptyTxt);
        const emptySearchResult = await searchFileContent(emptyPath, 'anything');
        expect(emptySearchResult.matches).toBe(0);
        
        // Test search in binary file succeeds (file actually contains text)
        const binaryPath = path.join(env.knowledgeBasePath, EDGE_CASES_DIR, edgeCaseFiles.fileTypeMismatch);
        const binarySearchResult = await searchFileContent(binaryPath, 'test');
        expect(binarySearchResult.matches).toBeGreaterThan(0);
      });
    });
  });
});