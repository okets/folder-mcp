/**
 * SimpleConfigLoader Integration Tests
 * 
 * Tests the bridge between system constants (JSON) and user preferences (YAML)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadHybridConfiguration, convertToResolvedConfig } from '../../../src/application/config/HybridConfigLoader.js';
import { TestUtils } from '../../helpers/test-utils.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

describe('HybridConfigLoader Integration', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('hybrid-config-test-');
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create system-configuration.json (system constants)
    const systemConfig = {
      model: {
        name: 'nomic-embed-text',
        batchSize: 32,
        timeoutMs: 30000,
        maxConcurrentOperations: 14
      },
      fileProcessing: {
        extensions: ['.txt', '.md', '.pdf', '.docx'],
        ignorePatterns: ['node_modules/**', '.git/**'],
        maxFileSize: 10485760,
        debounceDelay: 1000
      },
      server: {
        port: 3000,
        host: 'localhost'
      }
    };
    writeFileSync('system-configuration.json', JSON.stringify(systemConfig, null, 2));

    // Create config-defaults.yaml (user preference defaults)
    const defaultsConfig = `theme: auto
development:
  enabled: false
  hotReload: false
  debugOutput: false
performance:
  batchSize: 32
  maxConcurrentOperations: 10
logging:
  level: info
  format: text`;
    writeFileSync('config-defaults.yaml', defaultsConfig);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('loadHybridConfiguration', () => {
    it('should load system constants from JSON', async () => {
      const config = await loadHybridConfiguration('/test/folder');
      
      // Should load system constants
      expect(config.system).toBeDefined();
      expect(config.system.model.name).toBe('nomic-embed-text');
      expect(config.system.model.batchSize).toBe(1);
      expect(config.system.fileProcessing.extensions).toContain('.txt');
    });

    it('should load user defaults from YAML', async () => {
      const config = await loadHybridConfiguration('/test/folder');
      
      // Should load user defaults
      expect(config.user).toBeDefined();
      expect(config.user.theme).toBe('auto');
      expect(config.user.development.enabled).toBe(false);
      expect(config.user.performance.batchSize).toBe(1);
    });

    it('should load user overrides when config.yaml exists', async () => {
      // Create user config.yaml with overrides
      const userConfig = `theme: dark
performance:
  batchSize: 64
  maxConcurrentOperations: 8
development:
  enabled: true`;
      writeFileSync('config.yaml', userConfig);

      const config = await loadHybridConfiguration('/test/folder');
      
      // Should load user overrides
      expect(config.user.theme).toBe('dark');
      expect(config.user.performance.batchSize).toBe(64);
      expect(config.user.performance.maxConcurrentOperations).toBe(8);
      expect(config.user.development.enabled).toBe(true);
    });

    it('should include folder path from command line', async () => {
      const testPath = '/test/my-folder';
      const config = await loadHybridConfiguration(testPath);
      
      expect(config.folders).toContain(testPath);
    });
  });

  describe('convertToResolvedConfig', () => {
    it('should combine system constants and user preferences', async () => {
      // Create user config with overrides
      const userConfig = `performance:
  batchSize: 64`;
      writeFileSync('config.yaml', userConfig);

      const hybridConfig = await loadHybridConfiguration('/test/folder');
      const resolved = convertToResolvedConfig(hybridConfig);

      // Should use user override for batchSize
      expect(resolved.batchSize).toBe(64);
      
      // Should use system constant for modelName
      expect(resolved.modelName).toBe('nomic-embed-text');
      
      // Should use system constants for file processing
      expect(resolved.fileExtensions).toContain('.txt');
      expect(resolved.ignorePatterns).toContain('node_modules/**');
    });

    it('should create proper folder structure', async () => {
      const testPath = '/test/my-folder';
      const hybridConfig = await loadHybridConfiguration(testPath);
      const resolved = convertToResolvedConfig(hybridConfig);

      expect(resolved.folderPath).toBe(testPath);
      expect(resolved.folders?.list).toHaveLength(1);
      expect(resolved.folders.list[0].path).toBe(testPath);
      expect(resolved.folders.list[0].enabled).toBe(true);
    });

    it('should handle missing user config gracefully', async () => {
      // No config.yaml file
      const hybridConfig = await loadHybridConfiguration('/test/folder');
      const resolved = convertToResolvedConfig(hybridConfig);

      // Should use defaults
      expect(resolved.batchSize).toBe(1); // Optimal system default from CPM testing
      expect(resolved.modelName).toBe('nomic-embed-text'); // System constant
      expect(resolved.fileExtensions).toBeDefined(); // System constants
    });
  });

  describe('Configuration Precedence', () => {
    it('should follow correct precedence: user config > defaults > system', async () => {
      // User config overrides
      const userConfig = `performance:
  batchSize: 128  # User override
theme: light      # User preference`;
      writeFileSync('config.yaml', userConfig);

      const hybridConfig = await loadHybridConfiguration('/test/folder');
      const resolved = convertToResolvedConfig(hybridConfig);

      // User override wins
      expect(resolved.batchSize).toBe(128);
      
      // System constants are unchanged
      expect(resolved.modelName).toBe('nomic-embed-text');
      
      // User preference for theme
      expect(hybridConfig.user.theme).toBe('light');
    });
  });
});