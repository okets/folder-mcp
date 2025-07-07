/**
 * Simple Configuration Loader Integration Tests
 * 
 * Tests the DEAD SIMPLE configuration architecture.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadSimpleConfiguration, convertToResolvedConfig } from '../../../src/application/config/SimpleConfigLoader.js';

describe('Simple Configuration Loader', () => {
  const testFolderPath = '/Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base';

  describe('loadSimpleConfiguration', () => {
    it('should load system configuration from JSON', async () => {
      const config = await loadSimpleConfiguration(testFolderPath);
      
      // Should load system constants
      expect(config.system).toBeDefined();
      expect(config.system.model).toBeDefined();
      expect(config.system.fileProcessing).toBeDefined();
      expect(config.system.server).toBeDefined();
    });

    it('should load user configuration from YAML', async () => {
      const config = await loadSimpleConfiguration(testFolderPath);
      
      // Should load user preferences
      expect(config.user).toBeDefined();
      expect(config.user.theme).toBe('dark'); // From our config.yaml
      expect(config.user.development?.enabled).toBe(true);
    });

    it('should configure folder from command line', async () => {
      const config = await loadSimpleConfiguration(testFolderPath);
      
      // Should have folder from command line
      expect(config.folders).toHaveLength(1);
      expect(config.folders[0]).toBe(testFolderPath);
    });
  });

  describe('convertToResolvedConfig', () => {
    it('should convert SimpleConfig to ResolvedConfig format', async () => {
      const simpleConfig = await loadSimpleConfiguration(testFolderPath);
      const resolvedConfig = convertToResolvedConfig(simpleConfig);
      
      // Should have expected ResolvedConfig structure
      expect(resolvedConfig.folderPath).toBe(testFolderPath);
      expect(resolvedConfig.folders?.list).toHaveLength(1);
      expect(resolvedConfig.folders.list[0].path).toBe(testFolderPath);
      
      // Should merge system constants with user preferences
      expect(resolvedConfig.batchSize).toBe(64); // User override from config.yaml
      expect(resolvedConfig.modelName).toBe('all-minilm'); // System default
      expect(resolvedConfig.fileExtensions).toBeDefined(); // System constants
      
      // Should have source tracking
      expect(resolvedConfig.sources).toBeDefined();
      expect(resolvedConfig.sources.batchSize).toBe('user'); // User override
      expect(resolvedConfig.sources.modelName).toBe('system'); // System default
    });

    it('should handle missing folder path gracefully', async () => {
      const config = await loadSimpleConfiguration(); // No folder path
      const resolvedConfig = convertToResolvedConfig(config);
      
      // Should still load user config globally (this is correct!)
      expect(resolvedConfig.batchSize).toBe(64); // User override from config.yaml
      expect(resolvedConfig.development?.enableDebugOutput).toBe(false); // User override (false)
      expect(resolvedConfig.folderPath).toBe(process.cwd()); // Falls back to current directory
    });
  });

  describe('DEAD SIMPLE architecture validation', () => {
    it('should demonstrate the three-part configuration system', async () => {
      const config = await loadSimpleConfiguration(testFolderPath);
      
      // 1. System constants (JSON) - Never user-configurable
      expect(config.system.fileProcessing.extensions).toEqual([
        '.txt', '.md', '.mdx',
        '.pdf', '.doc', '.docx',
        '.xls', '.xlsx', '.csv',
        '.ppt', '.pptx',
        '.json', '.yaml', '.yml',
        '.log'
      ]);
      
      // 2. User preferences (YAML) - User-configurable via TUI/CLI
      expect(config.user.theme).toBe('dark'); // User choice
      expect(config.user.development.enabled).toBe(true); // User choice
      
      // 3. Runtime parameters (CLI) - Command line arguments
      expect(config.folders[0]).toBe(testFolderPath); // CLI argument
    });

    it('should show configuration precedence: user overrides system', async () => {
      const config = await loadSimpleConfiguration(testFolderPath);
      const resolved = convertToResolvedConfig(config);
      
      // User performance settings override system defaults
      expect(resolved.batchSize).toBe(64); // User: 64, System: 32
      expect(resolved.maxConcurrentOperations).toBe(8); // User: 8, System: 14
      
      // System constants remain unchanged
      expect(resolved.modelName).toBe('all-minilm'); // System constant
      expect(resolved.fileExtensions.length).toBeGreaterThan(0); // System constants
    });
  });
});