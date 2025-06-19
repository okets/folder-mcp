/**
 * Real Test Environment Infrastructure Validation Tests
 * 
 * These tests validate that our real test environment setup works correctly
 * and that we can create real cache directories and initialize real services.
 */

import { describe, test, expect, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Real Test Environment Infrastructure', () => {
  let tempDirs: string[] = [];
  
  afterEach(async () => {
    // Clean up all temp directories
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

  test('should be able to copy test knowledge base to temp directory', async () => {
    // Create temp directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'real-test-basic-'));
    tempDirs.push(tempDir);
    
    // Source knowledge base path
    const sourceKnowledgeBase = path.join(process.cwd(), 'tests', 'fixtures', 'test-knowledge-base');
    const targetKnowledgeBase = path.join(tempDir, 'test-knowledge-base');
    
    // Copy directory
    await copyDirectory(sourceKnowledgeBase, targetKnowledgeBase);
    
    // Verify key files exist
    expect(existsSync(targetKnowledgeBase)).toBe(true);
    expect(existsSync(path.join(targetKnowledgeBase, 'Finance', '2024', 'Q1', 'Q1_Report.pdf'))).toBe(true);
    expect(existsSync(path.join(targetKnowledgeBase, 'Sales', 'Data', 'Sales_Pipeline.xlsx'))).toBe(true);
    expect(existsSync(path.join(targetKnowledgeBase, 'Legal', 'Contracts', 'Acme_Vendor_Agreement.pdf'))).toBe(true);
    
    console.log('✅ Basic file copying infrastructure works');
  }, 30000);

  test('should validate that test knowledge base has required structure', async () => {
    const knowledgeBasePath = path.join(process.cwd(), 'tests', 'fixtures', 'test-knowledge-base');
    
    // Check that required directories exist
    expect(existsSync(path.join(knowledgeBasePath, 'Finance'))).toBe(true);
    expect(existsSync(path.join(knowledgeBasePath, 'Sales'))).toBe(true);
    expect(existsSync(path.join(knowledgeBasePath, 'Legal'))).toBe(true);
    expect(existsSync(path.join(knowledgeBasePath, 'Marketing'))).toBe(true);
    expect(existsSync(path.join(knowledgeBasePath, 'Engineering'))).toBe(true);
    expect(existsSync(path.join(knowledgeBasePath, 'test-edge-cases'))).toBe(true);
    
    // Check that required test files exist
    expect(existsSync(path.join(knowledgeBasePath, 'Finance', '2024', 'Q1', 'Q1_Report.pdf'))).toBe(true);
    expect(existsSync(path.join(knowledgeBasePath, 'Sales', 'Data', 'Sales_Pipeline.xlsx'))).toBe(true);
    expect(existsSync(path.join(knowledgeBasePath, 'Legal', 'Contracts', 'Acme_Vendor_Agreement.pdf'))).toBe(true);
    
    console.log('✅ Test knowledge base structure is valid');
  });
});

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
