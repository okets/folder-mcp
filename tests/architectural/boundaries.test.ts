/**
 * Architectural Boundary Tests
 * 
 * These tests enforce the module boundary rules defined in the
 * Module Boundaries Implementation Plan.
 */

import { describe, it, expect } from 'vitest';
import { setupTestEnvironment } from '../helpers/setup.ts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Setup test environment
setupTestEnvironment();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../../src');

/**
 * Helper function to get all TypeScript files in a directory
 */
function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract import statements from a TypeScript file
 */
function extractImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Check if an import path violates layer boundaries
 */
function checkLayerBoundaries(filePath: string, importPath: string): string | null {
  const relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
  
  // Determine which layer the file belongs to
  let fileLayer: string;
  if (relativePath.startsWith('domain/')) {
    fileLayer = 'domain';
  } else if (relativePath.startsWith('application/')) {
    fileLayer = 'application';
  } else if (relativePath.startsWith('infrastructure/')) {
    fileLayer = 'infrastructure';
  } else if (relativePath.startsWith('interfaces/')) {
    fileLayer = 'interfaces';
  } else if (relativePath.startsWith('shared/')) {
    fileLayer = 'shared';
  } else {
    // Legacy files - skip for now
    return null;
  }
  
  // Check if import is a relative path that goes up directories
  if (importPath.startsWith('../')) {
    // Resolve the import path relative to the file
    const resolvedImport = path.posix.resolve(
      path.posix.dirname(relativePath),
      importPath
    );
    
    // Determine target layer
    let targetLayer: string;
    if (resolvedImport.startsWith('domain/')) {
      targetLayer = 'domain';
    } else if (resolvedImport.startsWith('application/')) {
      targetLayer = 'application';
    } else if (resolvedImport.startsWith('infrastructure/')) {
      targetLayer = 'infrastructure';
    } else if (resolvedImport.startsWith('interfaces/')) {
      targetLayer = 'interfaces';
    } else if (resolvedImport.startsWith('shared/')) {
      targetLayer = 'shared';
    } else {
      // Not a modular import
      return null;
    }
    
    // Check boundary violations
    switch (fileLayer) {
      case 'domain':
        if (['application', 'infrastructure', 'interfaces'].includes(targetLayer)) {
          return `Domain layer cannot import from ${targetLayer} layer`;
        }
        break;
        
      case 'application':
        if (['infrastructure', 'interfaces'].includes(targetLayer)) {
          return `Application layer cannot import from ${targetLayer} layer`;
        }
        break;
        
      case 'infrastructure':
        if (['domain', 'application', 'interfaces'].includes(targetLayer)) {
          return `Infrastructure layer cannot import from ${targetLayer} layer`;
        }
        break;
        
      case 'interfaces':
        if (['domain', 'infrastructure'].includes(targetLayer)) {
          return `Interface layer cannot import from ${targetLayer} layer`;
        }
        break;
        
      case 'shared':
        if (['domain', 'application', 'infrastructure', 'interfaces'].includes(targetLayer)) {
          return `Shared layer cannot import from ${targetLayer} layer`;
        }
        break;
    }
  }
  
  return null;
}

describe('Architectural Boundaries', () => {
  describe('Module Structure', () => {
    it('should have the correct directory structure', () => {
      const expectedDirs = [
        'src/domain/files',
        'src/domain/content',
        'src/domain/embeddings',
        'src/domain/search',
        'src/application/indexing',
        'src/application/serving',
        'src/application/monitoring',
        'src/infrastructure/cache',
        'src/infrastructure/logging',
        'src/infrastructure/errors',
        'src/interfaces/cli',
        'src/interfaces/mcp',
        'src/shared/utils'
      ];
      
      for (const dir of expectedDirs) {
        const fullPath = path.join(path.dirname(srcDir), dir);
        expect(fs.existsSync(fullPath), `Directory ${dir} should exist`).toBe(true);
      }
    });
    
    it('should have index.ts files for each module', () => {
      const expectedIndexFiles = [
        'src/domain/files/index.ts',
        'src/domain/content/index.ts',
        'src/domain/embeddings/index.ts',
        'src/domain/search/index.ts',
        'src/application/indexing/index.ts',
        'src/application/serving/index.ts',
        'src/application/monitoring/index.ts',
        'src/infrastructure/cache/index.ts',
        'src/infrastructure/logging/index.ts',
        'src/infrastructure/errors/index.ts',
        'src/interfaces/cli/index.ts',
        'src/interfaces/mcp/index.ts',
        'src/shared/utils/index.ts'
      ];
      
      for (const indexFile of expectedIndexFiles) {
        const fullPath = path.join(path.dirname(srcDir), indexFile);
        expect(fs.existsSync(fullPath), `Index file ${indexFile} should exist`).toBe(true);
        
        // Check that index file has exports
        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content, `Index file ${indexFile} should have exports`).toMatch(/export/);
      }
    });
  });
  
  describe('Dependency Rules', () => {
    it('should not allow domain layer to import from forbidden layers', () => {
      const domainDir = path.join(srcDir, 'domain');
      if (!fs.existsSync(domainDir)) {
        return; // Skip if domain directory doesn't exist
      }
      
      const domainFiles = getAllTsFiles(domainDir);
      const violations: string[] = [];
      
      for (const file of domainFiles) {
        const imports = extractImports(file);
        const relativePath = path.relative(srcDir, file);
        
        for (const importPath of imports) {
          const violation = checkLayerBoundaries(file, importPath);
          if (violation) {
            violations.push(`${relativePath}: ${violation} (import: ${importPath})`);
          }
        }
      }
      
      if (violations.length > 0) {
        throw new Error(
          `Domain layer boundary violations found:\n${violations.join('\n')}`
        );
      }
    });
    
    it('should not allow application layer to import from forbidden layers', () => {
      const applicationDir = path.join(srcDir, 'application');
      if (!fs.existsSync(applicationDir)) {
        return;
      }
      
      const applicationFiles = getAllTsFiles(applicationDir);
      const violations: string[] = [];
      
      for (const file of applicationFiles) {
        const imports = extractImports(file);
        const relativePath = path.relative(srcDir, file);
        
        for (const importPath of imports) {
          const violation = checkLayerBoundaries(file, importPath);
          if (violation) {
            violations.push(`${relativePath}: ${violation} (import: ${importPath})`);
          }
        }
      }
      
      if (violations.length > 0) {
        throw new Error(
          `Application layer boundary violations found:\n${violations.join('\n')}`
        );
      }
    });
    
    it('should not allow infrastructure layer to import from forbidden layers', () => {
      const infrastructureDir = path.join(srcDir, 'infrastructure');
      if (!fs.existsSync(infrastructureDir)) {
        return;
      }
      
      const infrastructureFiles = getAllTsFiles(infrastructureDir);
      const violations: string[] = [];
      
      for (const file of infrastructureFiles) {
        const imports = extractImports(file);
        const relativePath = path.relative(srcDir, file);
        
        for (const importPath of imports) {
          const violation = checkLayerBoundaries(file, importPath);
          if (violation) {
            violations.push(`${relativePath}: ${violation} (import: ${importPath})`);
          }
        }
      }
      
      if (violations.length > 0) {
        throw new Error(
          `Infrastructure layer boundary violations found:\n${violations.join('\n')}`
        );
      }
    });
    
    it('should not allow interface layer to import from forbidden layers', () => {
      const interfacesDir = path.join(srcDir, 'interfaces');
      if (!fs.existsSync(interfacesDir)) {
        return;
      }
      
      const interfaceFiles = getAllTsFiles(interfacesDir);
      const violations: string[] = [];
      
      for (const file of interfaceFiles) {
        const imports = extractImports(file);
        const relativePath = path.relative(srcDir, file);
        
        for (const importPath of imports) {
          const violation = checkLayerBoundaries(file, importPath);
          if (violation) {
            violations.push(`${relativePath}: ${violation} (import: ${importPath})`);
          }
        }
      }
      
      if (violations.length > 0) {
        throw new Error(
          `Interface layer boundary violations found:\n${violations.join('\n')}`
        );
      }
    });
    
    it('should not allow shared layer to import from any other layer', () => {
      const sharedDir = path.join(srcDir, 'shared');
      if (!fs.existsSync(sharedDir)) {
        return;
      }
      
      const sharedFiles = getAllTsFiles(sharedDir);
      const violations: string[] = [];
      
      for (const file of sharedFiles) {
        const imports = extractImports(file);
        const relativePath = path.relative(srcDir, file);
        
        for (const importPath of imports) {
          const violation = checkLayerBoundaries(file, importPath);
          if (violation) {
            violations.push(`${relativePath}: ${violation} (import: ${importPath})`);
          }
        }
      }
      
      if (violations.length > 0) {
        throw new Error(
          `Shared layer boundary violations found:\n${violations.join('\n')}`
        );
      }
    });
  });
  
  describe('Module Tokens', () => {
    it('should have MODULE_TOKENS defined in DI interfaces', () => {
      const diInterfacesPath = path.join(srcDir, 'di', 'interfaces.ts');
      if (!fs.existsSync(diInterfacesPath)) {
        return;
      }
      
      const content = fs.readFileSync(diInterfacesPath, 'utf8');
      expect(content).toMatch(/MODULE_TOKENS/);
      expect(content).toMatch(/DOMAIN:/);
      expect(content).toMatch(/APPLICATION:/);
      expect(content).toMatch(/INFRASTRUCTURE:/);
    });
  });
  
  describe('Circular Dependencies', () => {
    it('should not have circular dependencies between modules', () => {
      // This is a simplified check - in production you'd use tools like madge
      const allFiles = getAllTsFiles(srcDir);
      const importGraph = new Map<string, string[]>();
      
      // Build import graph
      for (const file of allFiles) {
        const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');
        const imports = extractImports(file);
        
        // Only track relative imports within src
        const relativeImports = imports
          .filter(imp => imp.startsWith('./') || imp.startsWith('../'))
          .map(imp => {
            // Resolve relative import
            try {
              return path.posix.resolve(path.posix.dirname(relativePath), imp);
            } catch {
              return imp;
            }
          });
        
        importGraph.set(relativePath, relativeImports);
      }
      
      // Simple cycle detection
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      function hasCycle(node: string): boolean {
        if (recursionStack.has(node)) {
          return true; // Found a cycle
        }
        
        if (visited.has(node)) {
          return false;
        }
        
        visited.add(node);
        recursionStack.add(node);
        
        const neighbors = importGraph.get(node) || [];
        for (const neighbor of neighbors) {
          if (hasCycle(neighbor)) {
            return true;
          }
        }
        
        recursionStack.delete(node);
        return false;
      }
      
      // Check for cycles starting from each node
      for (const node of importGraph.keys()) {
        if (!visited.has(node) && hasCycle(node)) {
          throw new Error(`Circular dependency detected involving: ${node}`);
        }
      }
    });
  });
});
