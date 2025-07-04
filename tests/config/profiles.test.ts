/**
 * Tests for Configuration Profile Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfileManager, BUILT_IN_PROFILES } from '../../src/config/profiles.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('ProfileManager', () => {
  let tempDir: string;
  let manager: ProfileManager;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `profiles-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    manager = new ProfileManager(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.FOLDER_MCP_PROFILE;
  });

  describe('getActiveProfile()', () => {
    it('should return default when no profile is set', () => {
      expect(manager.getActiveProfile()).toBe('default');
    });

    it('should return profile from environment variable', () => {
      process.env.FOLDER_MCP_PROFILE = 'development';
      expect(manager.getActiveProfile()).toBe('development');
    });
  });

  describe('exists()', () => {
    it('should return true for built-in profiles', async () => {
      expect(await manager.exists('development')).toBe(true);
      expect(await manager.exists('staging')).toBe(true);
      expect(await manager.exists('production')).toBe(true);
    });

    it('should return false for non-existent profiles', async () => {
      expect(await manager.exists('non-existent')).toBe(false);
    });

    it('should return true for custom profiles', async () => {
      await fs.writeFile(join(tempDir, 'custom.yaml'), 'profile: custom');
      expect(await manager.exists('custom')).toBe(true);
    });

    it('should check both .yaml and .yml extensions', async () => {
      await fs.writeFile(join(tempDir, 'test.yml'), 'profile: test');
      expect(await manager.exists('test')).toBe(true);
    });
  });

  describe('load()', () => {
    it('should return null for default profile', async () => {
      const config = await manager.load('default');
      expect(config).toBeNull();
    });

    it('should load built-in development profile', async () => {
      const config = await manager.load('development');
      
      expect(config).toBeDefined();
      expect(config?.development?.enableDebugOutput).toBe(true);
      expect(config?.batchSize).toBe(8);
    });

    it('should load built-in production profile', async () => {
      const config = await manager.load('production');
      
      expect(config).toBeDefined();
      expect(config?.development?.enableDebugOutput).toBe(false);
      expect(config?.batchSize).toBe(32);
    });

    it('should load custom profile from file', async () => {
      const customConfig = `
profile: custom
description: Custom test profile
processing:
  chunkSize: 600
  overlap: 25
`;
      await fs.writeFile(join(tempDir, 'custom.yaml'), customConfig);
      
      const config = await manager.load('custom');
      
      expect(config).toBeDefined();
      expect(config?.profile).toBe('custom');
      expect(config?.description).toBe('Custom test profile');
      expect(config?.chunkSize).toBe(600);
      expect(config?.overlap).toBe(25);
    });

    it('should handle profile extension', async () => {
      const baseConfig = `
profile: base
processing:
  chunkSize: 500
  overlap: 20
`;
      const extendedConfig = `
profile: extended
extends: base
processing:
  chunkSize: 700  # Override base
files:
  extensions: [".ts", ".js"]
`;
      await fs.writeFile(join(tempDir, 'base.yaml'), baseConfig);
      await fs.writeFile(join(tempDir, 'extended.yaml'), extendedConfig);
      
      const config = await manager.load('extended');
      
      expect(config?.chunkSize).toBe(700); // Overridden
      expect(config?.overlap).toBe(20); // Inherited from base
      expect(config?.fileExtensions).toEqual([".ts", ".js"]); // New in extended
    });

    it('should cache loaded profiles', async () => {
      await fs.writeFile(join(tempDir, 'cached.yaml'), 'profile: cached\nchunkSize: 123');
      
      // First load
      const config1 = await manager.load('cached');
      expect(config1?.chunkSize).toBe(123);
      
      // Modify file
      await fs.writeFile(join(tempDir, 'cached.yaml'), 'profile: cached\nchunkSize: 456');
      
      // Second load should return cached value
      const config2 = await manager.load('cached');
      expect(config2?.chunkSize).toBe(123);
      
      // Clear cache and reload
      manager.clearCache();
      const config3 = await manager.load('cached');
      expect(config3?.chunkSize).toBe(456);
    });
  });

  describe('listProfiles()', () => {
    it('should list all built-in profiles', async () => {
      const profiles = await manager.listProfiles();
      
      const builtInProfiles = profiles.filter(p => p.type === 'built-in');
      expect(builtInProfiles).toHaveLength(3);
      expect(builtInProfiles.map(p => p.name)).toContain('development');
      expect(builtInProfiles.map(p => p.name)).toContain('staging');
      expect(builtInProfiles.map(p => p.name)).toContain('production');
    });

    it('should list custom profiles', async () => {
      await fs.writeFile(join(tempDir, 'custom1.yaml'), 'profile: custom1\ndescription: First custom');
      await fs.writeFile(join(tempDir, 'custom2.yml'), 'profile: custom2\ndescription: Second custom');
      
      const profiles = await manager.listProfiles();
      
      const customProfiles = profiles.filter(p => p.type === 'custom');
      expect(customProfiles).toHaveLength(2);
      expect(customProfiles.map(p => p.name)).toContain('custom1');
      expect(customProfiles.map(p => p.name)).toContain('custom2');
      
      const custom1 = profiles.find(p => p.name === 'custom1');
      expect(custom1?.description).toBe('First custom');
    });
  });

  describe('validate()', () => {
    it('should validate existing profiles', async () => {
      const result = await manager.validate('development');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for non-existent profile', async () => {
      const result = await manager.validate('non-existent');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Profile 'non-existent' not found");
    });

    it('should validate profile name mismatch', async () => {
      await fs.writeFile(join(tempDir, 'test.yaml'), 'profile: wrong-name');
      
      const result = await manager.validate('test');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Profile name mismatch: expected 'test', got 'wrong-name'");
    });

    it('should validate extends chain', async () => {
      await fs.writeFile(join(tempDir, 'test.yaml'), 'profile: test\nextends: non-existent');
      
      const result = await manager.validate('test');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Extended profile 'non-existent' does not exist");
    });

    it('should prevent self-extension', async () => {
      await fs.writeFile(join(tempDir, 'test.yaml'), 'profile: test\nextends: test');
      
      const result = await manager.validate('test');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Profile cannot extend itself');
    });
  });

  describe('Built-in profile definitions', () => {
    it('should have proper structure for all built-in profiles', () => {
      for (const [name, profile] of Object.entries(BUILT_IN_PROFILES)) {
        expect(profile.name).toBe(name);
        expect(profile.description).toBeDefined();
        expect(profile.defaults).toBeDefined();
      }
    });

    it('should have different settings for each environment', () => {
      const dev = BUILT_IN_PROFILES.development.defaults;
      const prod = BUILT_IN_PROFILES.production.defaults;
      
      expect(dev.development?.enableDebugOutput).toBe(true);
      expect(prod.development?.enableDebugOutput).toBe(false);
      
      expect(dev.processing?.batchSize).toBeLessThan(prod.processing?.batchSize!);
    });
  });
});