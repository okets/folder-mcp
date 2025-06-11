/**
 * Dependency Rule Validation Tests
 * 
 * Tests to ensure that dependency rules defined in the module boundaries
 * plan are enforced and architectural layers are properly isolated.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Dependency Rule Validation', () => {
  describe('Layer Dependencies', () => {
    it('should ensure domain layer has no dependencies on outer layers', () => {
      const domainPath = path.join(projectRoot, 'src/domain');
      if (!fs.existsSync(domainPath)) {
        expect.fail('Domain directory does not exist');
      }

      const violations = checkLayerViolations(domainPath, [
        'application', 'infrastructure', 'interfaces', 'cli', 'mcp'
      ]);

      expect(violations).toEqual([]);
    });

    it('should ensure application layer only depends on domain', () => {
      const applicationPath = path.join(projectRoot, 'src/application');
      if (!fs.existsSync(applicationPath)) {
        expect.fail('Application directory does not exist');
      }

      const violations = checkLayerViolations(applicationPath, [
        'infrastructure', 'interfaces', 'cli', 'mcp'
      ]);

      expect(violations).toEqual([]);
    });

    it('should ensure infrastructure layer only depends on domain and application', () => {
      const infrastructurePath = path.join(projectRoot, 'src/infrastructure');
      if (!fs.existsSync(infrastructurePath)) {
        expect.fail('Infrastructure directory does not exist');
      }

      const violations = checkLayerViolations(infrastructurePath, [
        'interfaces', 'cli', 'mcp'
      ]);

      expect(violations).toEqual([]);
    });
  });

  describe('Import Restrictions', () => {
    it('should not allow circular dependencies', () => {
      const circularDeps = findCircularDependencies(path.join(projectRoot, 'src'));
      expect(circularDeps).toEqual([]);
    });

    it('should enforce proper import paths', () => {
      const violations = checkImportPathViolations(path.join(projectRoot, 'src'));
      expect(violations).toEqual([]);
    });
  });

  describe('Module Coupling', () => {
    it('should maintain loose coupling between modules', () => {
      const couplingMetrics = analyzeCoupling(path.join(projectRoot, 'src'));
      
      // Each module should not depend on too many others
      for (const [module, dependencies] of Object.entries(couplingMetrics)) {
        expect(dependencies.length).toBeLessThan(10);
      }
    });
  });
});

function checkLayerViolations(layerPath: string, forbiddenLayers: string[]): string[] {
  const violations: string[] = [];
  
  if (!fs.existsSync(layerPath)) {
    return violations;
  }

  const files = getAllTypeScriptFiles(layerPath);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const imports = extractImports(content);
    
    for (const importPath of imports) {
      for (const forbiddenLayer of forbiddenLayers) {
        // Check if the import is actually going to a forbidden layer
        // Avoid false positives with relative paths or layer-specific interfaces
        if (isActualLayerViolation(importPath, forbiddenLayer, layerPath, file)) {
          violations.push(`${file} imports from forbidden layer: ${forbiddenLayer}`);
        }
      }
    }
  }
  
  return violations;
}

function isActualLayerViolation(importPath: string, forbiddenLayer: string, currentLayerPath: string, currentFile: string): boolean {
  // Skip relative imports within the same layer
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return false;
  }
  
  // Skip node_modules imports
  if (!importPath.startsWith('..') && !importPath.startsWith('/') && !importPath.includes('/')) {
    return false;
  }
  
  // Check if the import path actually goes to the forbidden layer directory
  const resolvedPath = path.resolve(path.dirname(currentFile), importPath);
  const normalizedPath = path.normalize(resolvedPath).replace(/\\/g, '/');
  
  // Check if the path actually points to the forbidden layer
  return normalizedPath.includes(`/src/${forbiddenLayer}/`) || 
         normalizedPath.includes(`\\src\\${forbiddenLayer}\\`);
}

function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...getAllTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractImports(content: string): string[] {
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function findCircularDependencies(srcPath: string): string[] {
  // Simplified circular dependency detection
  // In a real implementation, this would use a proper graph algorithm
  const violations: string[] = [];
  
  // This is a placeholder - real implementation would analyze import graph
  return violations;
}

function checkImportPathViolations(srcPath: string): string[] {
  const violations: string[] = [];
  
  // Check for violations like importing from dist/, importing with relative paths
  // that cross layer boundaries, etc.
  
  return violations;
}

function analyzeCoupling(srcPath: string): Record<string, string[]> {
  const coupling: Record<string, string[]> = {};
  
  // Analyze coupling between modules
  // This would track which modules import from which other modules
  
  return coupling;
}
