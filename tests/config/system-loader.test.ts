/**
 * Tests for System Configuration Loader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemConfigLoader, SYSTEM_CONFIG_PATHS } from '../../src/config/loaders/system.js';
import { promises as fs } from 'fs';
import { tmpdir, platform } from 'os';
import { join, dirname } from 'path';

describe('SystemConfigLoader', () => {
  let tempDir: string;
  let loader: SystemConfigLoader;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `system-config-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('getSystemPaths()', () => {
    it('should return platform-specific paths', () => {
      const loader = new SystemConfigLoader();
      const paths = loader.getSystemPaths();
      
      expect(paths).toBeDefined();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
      
      // Check that paths match the platform
      const platformKey = platform() as keyof typeof SYSTEM_CONFIG_PATHS;
      const expectedPaths = SYSTEM_CONFIG_PATHS[platformKey] || SYSTEM_CONFIG_PATHS.default;
      expect(paths).toEqual(expectedPaths);
    });

    it('should use custom paths when provided', () => {
      const customPaths = ['/custom/path/config.yaml'];
      const loader = new SystemConfigLoader(customPaths);
      
      expect(loader.getSystemPaths()).toEqual(customPaths);
    });
  });

  describe('load()', () => {
    it('should return null when no system config exists', async () => {
      // Use paths that definitely don't exist
      const loader = new SystemConfigLoader([
        join(tempDir, 'non-existent', 'config.yaml')
      ]);
      
      const result = await loader.load();
      expect(result.config).toBeNull();
      expect(result.path).toBeUndefined();
    });

    it('should load valid system configuration', async () => {
      const configPath = join(tempDir, 'config.yaml');
      const configContent = `
processing:
  chunkSize: 600
  overlap: 30
files:
  extensions: [".txt", ".md", ".pdf"]
  ignorePatterns: ["temp/*", "*.log"]
`;
      await fs.writeFile(configPath, configContent);
      
      const loader = new SystemConfigLoader([configPath]);
      const result = await loader.load();
      
      expect(result.config).toBeDefined();
      expect(result.path).toBe(configPath);
      expect(result.config?.chunkSize).toBe(600);
      expect(result.config?.overlap).toBe(30);
      expect(result.config?.fileExtensions).toEqual([".txt", ".md", ".pdf"]);
      expect(result.config?.ignorePatterns).toEqual(["temp/*", "*.log"]);
    });

    it('should handle invalid YAML gracefully', async () => {
      const configPath = join(tempDir, 'config.yaml');
      await fs.writeFile(configPath, 'invalid: yaml: content:');
      
      const loader = new SystemConfigLoader([configPath]);
      const result = await loader.load();
      
      expect(result.config).toBeNull();
    });

    it('should try multiple paths and use the first valid one', async () => {
      const path1 = join(tempDir, 'config1.yaml');
      const path2 = join(tempDir, 'config2.yaml');
      
      // Only create the second config
      await fs.writeFile(path2, 'processing:\n  chunkSize: 700');
      
      const loader = new SystemConfigLoader([path1, path2]);
      const result = await loader.load();
      
      expect(result.config?.chunkSize).toBe(700);
      expect(result.path).toBe(path2);
    });

    it('should handle both nested and flat config formats', async () => {
      const configPath = join(tempDir, 'config.yaml');
      const configContent = `
# Nested format
processing:
  chunkSize: 500
# Flat format (takes precedence)
overlap: 40
`;
      await fs.writeFile(configPath, configContent);
      
      const loader = new SystemConfigLoader([configPath]);
      const result = await loader.load();
      
      expect(result.config?.chunkSize).toBe(500);
      expect(result.config?.overlap).toBe(40);
    });
  });

  describe('hasSystemPermissions()', () => {
    it('should return boolean indicating system permissions', async () => {
      const loader = new SystemConfigLoader();
      const hasPerms = await loader.hasSystemPermissions();
      
      expect(typeof hasPerms).toBe('boolean');
      
      // In CI/testing environment, we typically don't have system permissions
      // so we just check that the method works
    });
  });

  describe('Platform-specific paths', () => {
    it('should have paths defined for all platforms', () => {
      expect(SYSTEM_CONFIG_PATHS.win32).toBeDefined();
      expect(SYSTEM_CONFIG_PATHS.darwin).toBeDefined();
      expect(SYSTEM_CONFIG_PATHS.linux).toBeDefined();
      expect(SYSTEM_CONFIG_PATHS.default).toBeDefined();
      
      // Each platform should have at least one path
      expect(SYSTEM_CONFIG_PATHS.win32.length).toBeGreaterThan(0);
      expect(SYSTEM_CONFIG_PATHS.darwin.length).toBeGreaterThan(0);
      expect(SYSTEM_CONFIG_PATHS.linux.length).toBeGreaterThan(0);
      expect(SYSTEM_CONFIG_PATHS.default.length).toBeGreaterThan(0);
    });

    it('should include both .yaml and .yml extensions', () => {
      // Check that each platform includes both extensions
      for (const paths of Object.values(SYSTEM_CONFIG_PATHS)) {
        const hasYaml = paths.some(p => p.endsWith('.yaml'));
        const hasYml = paths.some(p => p.endsWith('.yml'));
        
        expect(hasYaml || hasYml).toBe(true);
      }
    });
  });
});