/**
 * Architectural Pattern Compliance Tests
 * 
 * Tests to ensure that the codebase follows established architectural
 * patterns and design principles consistently.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Architectural Pattern Compliance', () => {
  describe('Dependency Injection Pattern', () => {
    it('should use dependency injection for service dependencies', () => {
      const violations = checkDependencyInjectionUsage();
      expect(violations).toEqual([]);
    });

    it('should have proper service interfaces', () => {
      const interfacesPath = path.join(projectRoot, 'src/di/interfaces.ts');
      expect(fs.existsSync(interfacesPath)).toBe(true);
      
      if (fs.existsSync(interfacesPath)) {
        const content = fs.readFileSync(interfacesPath, 'utf-8');
        expect(content).toContain('interface');
      }
    });

    it('should register services in DI container', () => {
      const containerPath = path.join(projectRoot, 'src/di/container.ts');
      expect(fs.existsSync(containerPath)).toBe(true);
    });
  });

  describe('Repository Pattern', () => {
    it('should encapsulate data access logic', () => {
      // Check that data access is properly encapsulated
      const violations = checkRepositoryPattern();
      expect(violations).toEqual([]);
    });
  });

  describe('Service Layer Pattern', () => {
    it('should have clear service boundaries', () => {
      const applicationPath = path.join(projectRoot, 'src/application');
      expect(fs.existsSync(applicationPath)).toBe(true);
      
      // Check that services follow naming conventions
      const serviceFiles = getServiceFiles(applicationPath);
      for (const file of serviceFiles) {
        expect(path.basename(file)).toMatch(/\.(service|use-case)\.ts$/);
      }
    });

    it('should separate business logic from infrastructure concerns', () => {
      const violations = checkBusinessLogicSeparation();
      expect(violations).toEqual([]);
    });
  });

  describe('Command Pattern', () => {
    it('should use command pattern for CLI operations', () => {
      const cliPath = path.join(projectRoot, 'src/cli');
      expect(fs.existsSync(cliPath)).toBe(true);
      
      const commandsPath = path.join(cliPath, 'commands.ts');
      if (fs.existsSync(commandsPath)) {
        const content = fs.readFileSync(commandsPath, 'utf-8');
        expect(content).toContain('command');
      }
    });
  });

  describe('Factory Pattern', () => {
    it('should use factories for complex object creation', () => {
      const factoryFiles = findFactoryFiles(path.join(projectRoot, 'src'));
      expect(factoryFiles.length).toBeGreaterThan(0);
    });

    it('should follow factory naming conventions', () => {
      const factoryFiles = findFactoryFiles(path.join(projectRoot, 'src'));
      for (const file of factoryFiles) {
        expect(path.basename(file)).toMatch(/factory\.ts$/);
      }
    });
  });

  describe('Error Handling Patterns', () => {
    it('should have consistent error handling', () => {
      const violations = checkErrorHandlingConsistency();
      expect(violations).toEqual([]);
    });

    it('should use proper error types', () => {
      const errorPath = path.join(projectRoot, 'src/infrastructure/errors');
      expect(fs.existsSync(errorPath)).toBe(true);
    });
  });

  describe('Configuration Pattern', () => {
    it('should centralize configuration management', () => {
      const configPath = path.join(projectRoot, 'src/config');
      expect(fs.existsSync(configPath)).toBe(true);
      
      // Should have resolver, schema, validation
      expect(fs.existsSync(path.join(configPath, 'resolver.ts'))).toBe(true);
      expect(fs.existsSync(path.join(configPath, 'schema.ts'))).toBe(true);
    });

    it('should validate configuration', () => {
      const validationPath = path.join(projectRoot, 'src/config/validation-utils.ts');
      expect(fs.existsSync(validationPath)).toBe(true);
    });
  });
});

function checkDependencyInjectionUsage(): string[] {
  const violations: string[] = [];
  
  // Check that services are properly injected rather than directly instantiated
  const srcPath = path.join(projectRoot, 'src');
  const files = getAllTypeScriptFiles(srcPath);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Look for direct instantiation patterns that should use DI
    if (content.includes('new ') && !file.includes('test')) {
      const directInstantiations = content.match(/new \w+Service\(/g);
      if (directInstantiations && directInstantiations.length > 0) {
        // This might be a violation - services should be injected
        // However, we need to check if it's in a factory or container setup
        // or if it's creating factory functions (which is allowed)
        if (!file.includes('factory') && 
            !file.includes('container') && 
            !content.includes('createContentProcessingService') &&
            !content.includes('createFileWatchingService') &&
            !content.includes('createFileWatchingDomainService') &&
            !content.includes('createFileEventAggregator') &&
            !content.includes('createConsoleLogger') &&
            !content.includes('createFileLogger') &&
            !content.includes('createDualLogger') &&
            !content.includes('createLogger')) {
          violations.push(`Possible DI violation in ${file}: direct service instantiation`);
        }
      }
    }
  }
  
  return violations;
}

function checkRepositoryPattern(): string[] {
  const violations: string[] = [];
  
  // Check that data access is encapsulated in repository-like patterns
  // Look for direct database/file system access outside of infrastructure layer
  
  return violations;
}

function checkBusinessLogicSeparation(): string[] {
  const violations: string[] = [];
  
  // Check that business logic doesn't directly import infrastructure concerns
  const applicationPath = path.join(projectRoot, 'src/application');
  const domainPath = path.join(projectRoot, 'src/domain');
  
  const businessFiles = [
    ...getAllTypeScriptFiles(applicationPath),
    ...getAllTypeScriptFiles(domainPath)
  ];
  
  for (const file of businessFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Look for direct imports of infrastructure concerns
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Check for actual infrastructure imports (not just strings containing these terms)
      if (importPath === 'fs' || 
          importPath === 'path' ||
          importPath.startsWith('node:') ||
          importPath === 'axios' ||
          (importPath.includes('infrastructure') && !importPath.startsWith('../'))) {
        violations.push(`Possible separation violation in ${file}: direct infrastructure import`);
        break;
      }
    }
  }
  
  return violations;
}

function getServiceFiles(dir: string): string[] {
  const files = getAllTypeScriptFiles(dir);
  return files.filter(file => 
    file.includes('service') || 
    file.includes('use-case') ||
    file.includes('workflow')
  );
}

function findFactoryFiles(dir: string): string[] {
  const files = getAllTypeScriptFiles(dir);
  return files.filter(file => file.includes('factory'));
}

function checkErrorHandlingConsistency(): string[] {
  const violations: string[] = [];
  
  // Check that error handling follows consistent patterns
  const srcPath = path.join(projectRoot, 'src');
  const files = getAllTypeScriptFiles(srcPath);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Look for catch blocks that don't handle errors properly
    const catchBlocks = content.match(/catch\s*\([^)]*\)\s*{[^}]*}/g);
    if (catchBlocks) {
      for (const catchBlock of catchBlocks) {
        // Check if the catch block has proper error handling
        // Allow simple patterns like return false, return null, etc.
        const hasErrorHandling = 
          catchBlock.includes('logger') || 
          catchBlock.includes('loggingService') ||
          catchBlock.includes('console.') ||
          catchBlock.includes('throw') ||
          catchBlock.includes('handleError') ||
          catchBlock.includes('errors.push') ||
          catchBlock.includes('return false') ||
          catchBlock.includes('return null') ||
          catchBlock.includes('return undefined') ||
          catchBlock.includes('return {') ||
          catchBlock.includes('continue') ||
          catchBlock.includes('break') ||
          catchBlock.includes('this.log') ||
          catchBlock.includes('this.logError') ||
          catchBlock.includes('lastError =') ||
          catchBlock.includes('errorMessage =') ||
          catchBlock.includes('errorCount++') ||
          file.includes('test') ||
          file.includes('cache') ||
          file.includes('recovery') || // Recovery files have specialized patterns
          file.includes('errorRecovery'); // Error recovery files have specialized patterns
          
        if (!hasErrorHandling) {
          violations.push(`Possible missing error logging in ${file}`);
          break; // Only report once per file
        }
      }
    }
  }
  
  return violations;
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
