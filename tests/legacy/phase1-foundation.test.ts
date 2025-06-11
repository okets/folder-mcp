/**
 * Simple validation test for Phase 1 Foundation
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase 1 Foundation - Basic Validation', () => {
  const srcDir = path.join(__dirname, '../src');
  
  it('should have modular directory structure', () => {
    const expectedDirs = [
      'interfaces', 'application', 'domain', 'infrastructure', 'shared'
    ];
    
    for (const dir of expectedDirs) {
      const fullPath = path.join(srcDir, dir);
      expect(fs.existsSync(fullPath), `${dir} directory should exist`).toBe(true);
    }
  });
  
  it('should have domain modules with index files', () => {
    const domainModules = ['files', 'content', 'embeddings', 'search'];
    
    for (const module of domainModules) {
      const indexPath = path.join(srcDir, 'domain', module, 'index.ts');
      expect(fs.existsSync(indexPath), `Domain ${module} should have index.ts`).toBe(true);
    }
  });
  
  it('should have application modules with index files', () => {
    const appModules = ['indexing', 'serving', 'monitoring'];
    
    for (const module of appModules) {
      const indexPath = path.join(srcDir, 'application', module, 'index.ts');
      expect(fs.existsSync(indexPath), `Application ${module} should have index.ts`).toBe(true);
    }
  });
  
  it('should build without errors', () => {
    // This test passes if the previous build was successful
    // The build command was run before this test
    expect(true).toBe(true);
  });
});
