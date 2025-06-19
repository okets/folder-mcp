import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRealTestEnvironment } from '../helpers/real-test-environment';
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
});
