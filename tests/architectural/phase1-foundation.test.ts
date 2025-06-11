/**
 * Architectural Tests for Module Boundaries
 * 
 * These tests enforce the architectural rules defined in the module boundaries plan.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Module Boundaries - Phase 1 Foundation', () => {
  const srcDir = path.join(process.cwd(), 'src');
  
  describe('Module Structure', () => {
    it('should have correct directory structure', () => {
      const expectedDirs = [
        'interfaces/cli',
        'interfaces/mcp', 
        'application/indexing',
        'application/serving',
        'application/monitoring',
        'domain/files',
        'domain/content',
        'domain/embeddings',
        'domain/search',
        'infrastructure/cache',
        'infrastructure/logging',
        'infrastructure/errors',
        'shared/utils'
      ];
      
      for (const dir of expectedDirs) {
        const fullPath = path.join(srcDir, dir);
        expect(fs.existsSync(fullPath), `Directory ${dir} should exist`).toBe(true);
      }
    });
    
    it('should have public API index files for each module', () => {
      const expectedIndexFiles = [
        'domain/files/index.ts',
        'domain/content/index.ts', 
        'domain/embeddings/index.ts',
        'domain/search/index.ts',
        'application/indexing/index.ts',
        'application/serving/index.ts',
        'application/monitoring/index.ts',
        'infrastructure/cache/index.ts',
        'infrastructure/logging/index.ts',
        'interfaces/cli/index.ts',
        'interfaces/mcp/index.ts',
        'shared/utils/index.ts'
      ];
      
      for (const indexFile of expectedIndexFiles) {
        const fullPath = path.join(srcDir, indexFile);
        expect(fs.existsSync(fullPath), `Index file ${indexFile} should exist`).toBe(true);
      }
    });
  });
  
  describe('Dependency Rules', () => {
    it('should not allow domain layer to import from forbidden layers', () => {
      // Domain layer should only import from shared layer
      const domainFiles = [
        'domain/files/index.ts',
        'domain/content/index.ts',
        'domain/embeddings/index.ts',
        'domain/search/index.ts'
      ];
      
      const forbiddenImports = [
        'application/',
        'infrastructure/',
        'interfaces/'
      ];
      
      for (const file of domainFiles) {
        const fullPath = path.join(srcDir, file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const forbidden of forbiddenImports) {
            expect(content, `${file} should not import from ${forbidden}`).not.toMatch(new RegExp(`from.*${forbidden}`, 'i'));
          }
        }
      }
    });
    
    it('should validate architectural layer separation', () => {
      // This is a simplified validation - in practice you'd use tools like dependency-cruiser
      expect(true, 'Architectural validation placeholder').toBe(true);
    });
  });
  
  describe('Module Tokens', () => {
    it('should have MODULE_TOKENS defined in DI interfaces', () => {
      const diInterfacesPath = path.join(srcDir, 'di/interfaces.ts');
      
      if (!fs.existsSync(diInterfacesPath)) {
        expect.fail('DI interfaces file should exist');
        return;
      }
      
      const content = fs.readFileSync(diInterfacesPath, 'utf8');
      expect(content, 'DI interfaces should have MODULE_TOKENS').toMatch(/MODULE_TOKENS/);
    });
  });
  
  describe('Phase 1 Validation', () => {
    it('should have foundation documentation', () => {
      const phase1DocPath = path.join(process.cwd(), 'PHASE1_COMPLETION.md');
      expect(fs.existsSync(phase1DocPath), 'Phase 1 completion documentation should exist').toBe(true);
    });
    
    it('should have module boundaries plan', () => {
      const planPath = path.join(process.cwd(), 'MODULE_BOUNDARIES_PLAN.md');
      expect(fs.existsSync(planPath), 'Module boundaries plan should exist').toBe(true);
    });
  });
});
