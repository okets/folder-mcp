/**
 * CLI Theme Override Integration Test
 * 
 * Tests the complete flow of CLI theme override through the configuration system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { loadSimpleConfiguration, convertToResolvedConfig } from '../../../src/application/config/SimpleConfigLoader.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

describe('CLI Theme Override Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('cli-theme-override-test-');
    
    // Create system-configuration.json (required for SimpleConfigLoader)
    const systemConfig = {
      model: {
        name: "nomic-embed-text",
        chunkSize: 1000,
        batchSize: 32,
        overlap: 10,
        timeoutMs: 30000,
        maxConcurrentOperations: 14
      },
      fileProcessing: {
        extensions: [".txt", ".md", ".pdf", ".docx"],
        ignorePatterns: ["node_modules/**", ".git/**"],
        maxFileSize: 10485760,
        debounceDelay: 1000
      },
      development: {
        enableDebugOutput: false,
        mockOllamaApi: false,
        skipGpuDetection: false
      }
    };
    writeFileSync(join(tempDir, 'system-configuration.json'), JSON.stringify(systemConfig, null, 2));
    
    // Create config-defaults.yaml with auto theme
    const configDefaults = `
theme: "auto"
development:
  enabled: false
  hotReload: false
performance:
  batchSize: 32
`;
    writeFileSync(join(tempDir, 'config-defaults.yaml'), configDefaults);
    
    // Create config.yaml with dark theme (user preference)
    const configUser = `
theme: "dark"
development:
  enabled: true
`;
    writeFileSync(join(tempDir, 'config.yaml'), configUser);
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  it('should use CLI theme override with highest priority', async () => {
    // Change to temp directory for relative config file loading
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);
      
      // Test CLI override with 'light' theme
      const cliOverrides = { theme: 'light' };
      const simpleConfig = await loadSimpleConfiguration('/test/folder', cliOverrides);
      const resolvedConfig = convertToResolvedConfig(simpleConfig);
      
      // CLI override should win over user config and defaults
      expect(resolvedConfig.theme).toBe('light');
      expect(resolvedConfig.sources.theme).toBe('cli');
      
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should fall back to user config when no CLI override', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);
      
      // No CLI overrides
      const cliOverrides = {};
      const simpleConfig = await loadSimpleConfiguration('/test/folder', cliOverrides);
      const resolvedConfig = convertToResolvedConfig(simpleConfig);
      
      // Should use user config (dark)
      expect(resolvedConfig.theme).toBe('dark');
      expect(resolvedConfig.sources.theme).toBe('user');
      
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should fall back to defaults when no user config', async () => {
    // Create a separate temp directory for this test to avoid state issues
    const testTempDir = await TestUtils.createTempDir('cli-theme-override-no-user-config-');
    const originalCwd = process.cwd();
    
    try {
      // Create only system config and defaults (no user config.yaml)
      const systemConfig = {
        model: {
          name: "nomic-embed-text",
          chunkSize: 1000,
          batchSize: 32,
          overlap: 10,
          timeoutMs: 30000,
          maxConcurrentOperations: 14
        },
        fileProcessing: {
          extensions: [".txt", ".md", ".pdf", ".docx"],
          ignorePatterns: ["node_modules/**", ".git/**"],
          maxFileSize: 10485760,
          debounceDelay: 1000
        },
        development: {
          enableDebugOutput: false,
          mockOllamaApi: false,
          skipGpuDetection: false
        }
      };
      writeFileSync(join(testTempDir, 'system-configuration.json'), JSON.stringify(systemConfig, null, 2));
      
      // Create config-defaults.yaml with auto theme
      const configDefaults = `
theme: "auto"
development:
  enabled: false
  hotReload: false
performance:
  batchSize: 32
`;
      writeFileSync(join(testTempDir, 'config-defaults.yaml'), configDefaults);
      
      // Do NOT create config.yaml - test case where user config doesn't exist
      
      process.chdir(testTempDir);
      
      // No CLI overrides
      const cliOverrides = {};
      const simpleConfig = await loadSimpleConfiguration('/test/folder', cliOverrides);
      const resolvedConfig = convertToResolvedConfig(simpleConfig);
      
      // Should use defaults (auto)
      expect(resolvedConfig.theme).toBe('auto');
      expect(resolvedConfig.sources.theme).toBe('default');
      
    } finally {
      process.chdir(originalCwd);
      await TestUtils.cleanupTempDir(testTempDir);
    }
  });

  it('should test complete priority chain: CLI > User > Default', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);
      
      // Test cases for different priority scenarios
      const testCases = [
        {
          name: 'CLI override wins',
          cliOverrides: { theme: 'light' },
          expected: 'light',
          expectedSource: 'cli'
        },
        {
          name: 'User config when no CLI',
          cliOverrides: {},
          expected: 'dark',
          expectedSource: 'user'
        }
      ];
      
      for (const testCase of testCases) {
        const simpleConfig = await loadSimpleConfiguration('/test/folder', testCase.cliOverrides);
        const resolvedConfig = convertToResolvedConfig(simpleConfig);
        
        expect(resolvedConfig.theme).toBe(testCase.expected);
        expect(resolvedConfig.sources.theme).toBe(testCase.expectedSource);
      }
      
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should preserve CLI overrides in SimpleConfig', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);
      
      const cliOverrides = { theme: 'dark' };
      const simpleConfig = await loadSimpleConfiguration('/test/folder', cliOverrides);
      
      expect(simpleConfig.cliOverrides).toEqual({ theme: 'dark' });
      expect(simpleConfig.user.theme).toBe('dark'); // from user config
      expect(simpleConfig.folders).toEqual(['/test/folder']);
      
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should handle empty CLI overrides gracefully', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);
      
      const cliOverrides = {};
      const simpleConfig = await loadSimpleConfiguration('/test/folder', cliOverrides);
      const resolvedConfig = convertToResolvedConfig(simpleConfig);
      
      expect(simpleConfig.cliOverrides).toEqual({});
      expect(resolvedConfig.theme).toBe('dark'); // from user config
      
    } finally {
      process.chdir(originalCwd);
    }
  });
});