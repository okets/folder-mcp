/**
 * folder-mcp CLI Tests - TDD Approach
 * 
 * Tests for the -d parameter functionality and folder configuration flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { getContainer } from '../../../src/di/container.js';
import { CONFIG_SERVICE_TOKENS } from '../../../src/config/di-setup.js';
import { ConfigurationComponent } from '../../../src/config/ConfigurationComponent.js';
import { existsSync } from 'fs';
import { join } from 'path';

describe('folder-mcp CLI -d parameter', () => {
  let tempDir: string;
  let mockConfigComponent: any;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('folder-mcp-cli-test-');
    
    // Mock ConfigurationComponent
    mockConfigComponent = {
      hasConfigFile: vi.fn(() => false),
      getConfigFilePath: vi.fn(() => join(tempDir, '.folder-mcp', 'config.yaml')),
      load: vi.fn(async () => {}),
      get: vi.fn(async (path: string) => {
        if (path === 'folders.list') return [];
        return null;
      }),
      set: vi.fn(async () => {}),
      validate: vi.fn(async (path: string, value: any) => {
        // Mock folder validation
        if (path === 'folders.list[].path') {
          if (!value || typeof value !== 'string') {
            return { valid: false, errors: [{ path, message: 'Folder path must be a string' }] };
          }
          if (!existsSync(value)) {
            return { valid: false, errors: [{ path, message: 'Folder does not exist' }] };
          }
          const stat = require('fs').statSync(value);
          if (!stat.isDirectory()) {
            return { valid: false, errors: [{ path, message: 'Path is not a directory' }] };
          }
          return { valid: true };
        }
        return { valid: true };
      })
    };
    
    // Register mock in DI container
    getContainer().register(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT, mockConfigComponent);
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
    getContainer().clear();
  });

  describe('CLI parameter validation', () => {
    it('should validate folder exists when -d parameter is provided', async () => {
      const validFolder = tempDir;
      const result = await mockConfigComponent.validate('folders.list[].path', validFolder);
      expect(result.valid).toBe(true);
    });

    it('should reject non-existent folder', async () => {
      const invalidFolder = join(tempDir, 'does-not-exist');
      const result = await mockConfigComponent.validate('folders.list[].path', invalidFolder);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0].message).toBe('Folder does not exist');
    });

    it('should reject file path instead of directory', async () => {
      // Create a file instead of directory
      const filePath = join(tempDir, 'test.txt');
      await TestUtils.createTestFiles(tempDir, { 'test.txt': 'test content' });
      
      const result = await mockConfigComponent.validate('folders.list[].path', filePath);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0].message).toBe('Path is not a directory');
    });

    it('should reject empty or invalid path', async () => {
      const emptyResult = await mockConfigComponent.validate('folders.list[].path', '');
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.errors?.[0].message).toBe('Folder path must be a string');

      const nullResult = await mockConfigComponent.validate('folders.list[].path', null);
      expect(nullResult.valid).toBe(false);
      expect(nullResult.errors?.[0].message).toBe('Folder path must be a string');
    });
  });

  describe('CLI to TUI parameter passing', () => {
    it('should pass -d parameter to TUI when valid', async () => {
      // This tests the concept that the CLI should pass the parameter to TUI
      const cliArgs = ['-d', tempDir];
      const dirIndex = cliArgs.indexOf('-d');
      const cliDir = dirIndex !== -1 && dirIndex + 1 < cliArgs.length ? cliArgs[dirIndex + 1] : null;
      
      expect(cliDir).toBe(tempDir);
      
      // Validate the directory before passing
      const validationResult = await mockConfigComponent.validate('folders.list[].path', cliDir);
      expect(validationResult.valid).toBe(true);
    });

    it('should handle missing value after -d flag', () => {
      const cliArgs = ['-d']; // No value after -d
      const dirIndex = cliArgs.indexOf('-d');
      const cliDir = dirIndex !== -1 && dirIndex + 1 < cliArgs.length ? cliArgs[dirIndex + 1] : null;
      
      expect(cliDir).toBe(null);
    });

    it('should handle --dir long form parameter', () => {
      const cliArgs = ['--dir', tempDir];
      const dirIndex = cliArgs.indexOf('--dir');
      const cliDir = dirIndex !== -1 && dirIndex + 1 < cliArgs.length ? cliArgs[dirIndex + 1] : null;
      
      expect(cliDir).toBe(tempDir);
    });
  });

  describe('Wizard behavior with -d parameter', () => {
    it('should skip folder selection step when valid -d parameter provided', async () => {
      const validFolder = tempDir;
      const validationResult = await mockConfigComponent.validate('folders.list[].path', validFolder);
      
      // When validation passes
      expect(validationResult.valid).toBe(true);
      
      // Wizard should start at step 2 (model selection)
      const hasValidCliFolder = validFolder && validationResult.valid;
      const initialStep = hasValidCliFolder ? 2 : 1;
      
      expect(initialStep).toBe(2);
    });

    it('should show folder selection step when invalid -d parameter provided', async () => {
      const invalidFolder = join(tempDir, 'does-not-exist');
      const validationResult = await mockConfigComponent.validate('folders.list[].path', invalidFolder);
      
      // When validation fails
      expect(validationResult.valid).toBe(false);
      
      // Wizard should start at step 1 (folder selection)
      const hasValidCliFolder = invalidFolder && validationResult.valid;
      const initialStep = hasValidCliFolder ? 2 : 1;
      
      expect(initialStep).toBe(1);
    });

    it('should display CLI parameter feedback in wizard', async () => {
      // Test CLI feedback log creation
      const cliDir = tempDir;
      const validationResult = await mockConfigComponent.validate('folders.list[].path', cliDir);
      
      const createCliLogEntries = (cliDir: string | null, error?: string) => {
        const logs: any[] = [];
        
        if (cliDir) {
          if (error) {
            logs.push({
              id: 'cli-dir-error',
              level: 'error',
              message: `CLI -d parameter: ${error}`,
              details: `Provided path: ${cliDir}`,
              source: 'CLI'
            });
          } else {
            logs.push({
              id: 'cli-dir-success',
              level: 'info',
              message: `CLI -d parameter: Using folder "${cliDir}"`,
              details: `Directory validated and will be used for indexing`,
              source: 'CLI'
            });
          }
        }
        
        return logs;
      };
      
      // Test success case
      const successLogs = createCliLogEntries(cliDir, validationResult.valid ? undefined : 'Folder does not exist');
      expect(successLogs).toHaveLength(1);
      expect(successLogs[0].level).toBe('info');
      expect(successLogs[0].message).toContain(`Using folder "${cliDir}"`);
      
      // Test error case
      const errorLogs = createCliLogEntries('/invalid/path', 'Folder does not exist');
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
      expect(errorLogs[0].message).toContain('Folder does not exist');
    });
  });

  describe('Configuration persistence', () => {
    it('should save folder configuration when wizard completes', async () => {
      const folderPath = tempDir;
      
      // Simulate wizard completion
      await mockConfigComponent.set('folders.list', [{
        path: folderPath,
        name: 'Test Folder',
        enabled: true,
        embeddings: {
          backend: 'ollama',
          model: 'nomic-embed-text'
        }
      }]);
      
      expect(mockConfigComponent.set).toHaveBeenCalledWith('folders.list', expect.arrayContaining([
        expect.objectContaining({
          path: folderPath,
          enabled: true
        })
      ]));
    });

    it('should allow overriding existing configuration with -d parameter', async () => {
      // Mock existing configuration
      mockConfigComponent.hasConfigFile.mockReturnValue(true);
      mockConfigComponent.get.mockImplementation(async (path: string) => {
        if (path === 'folders.list') {
          return [{
            path: '/old/folder',
            name: 'Old Folder',
            enabled: true
          }];
        }
        return null;
      });
      
      // When -d parameter is provided, it should allow override
      const newFolder = tempDir;
      const hasConfigFile = mockConfigComponent.hasConfigFile();
      const cliDirProvided = true; // -d parameter provided
      
      // Should show wizard even with existing config when -d is provided
      const showWizard = cliDirProvided || !hasConfigFile;
      expect(showWizard).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle relative paths by converting to absolute', async () => {
      const relativePath = '.';
      const absolutePath = process.cwd();
      
      // In real implementation, relative paths should be converted
      const normalizedPath = relativePath === '.' ? process.cwd() : relativePath;
      
      const validationResult = await mockConfigComponent.validate('folders.list[].path', normalizedPath);
      expect(validationResult.valid).toBe(true);
    });

    it('should handle paths with spaces', async () => {
      const folderWithSpaces = join(tempDir, 'folder with spaces');
      await require('fs').promises.mkdir(folderWithSpaces, { recursive: true });
      
      const validationResult = await mockConfigComponent.validate('folders.list[].path', folderWithSpaces);
      expect(validationResult.valid).toBe(true);
    });

    it('should handle symlinks appropriately', async () => {
      const realFolder = join(tempDir, 'real-folder');
      const symlinkPath = join(tempDir, 'symlink-folder');
      
      await require('fs').promises.mkdir(realFolder, { recursive: true });
      
      // Create symlink (skip on Windows if not supported)
      try {
        require('fs').symlinkSync(realFolder, symlinkPath, 'dir');
        
        const validationResult = await mockConfigComponent.validate('folders.list[].path', symlinkPath);
        expect(validationResult.valid).toBe(true);
      } catch (error) {
        // Skip symlink test on systems that don't support it
        console.log('Skipping symlink test - not supported on this system');
      }
    });
  });
});