/**
 * Tests for Configuration Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigurationManager, ConfigPriority } from '../../src/config/manager.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('ConfigurationManager', () => {
  let manager: ConfigurationManager;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test configs
    tempDir = join(tmpdir(), `config-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create manager with test paths
    manager = new ConfigurationManager({
      systemConfigPath: join(tempDir, 'system.yaml'),
      userConfigPath: join(tempDir, 'user.yaml'),
      cacheEnabled: false // Disable cache for tests
    });
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('load()', () => {
    it('should load default configuration when no files exist', async () => {
      const config = await manager.load();
      
      expect(config).toBeDefined();
      expect(config.processing.chunkSize).toBeGreaterThanOrEqual(400); // smart default based on system
      expect(config.processing.overlap).toBe(10); // default value
    });

    it('should merge user configuration over defaults', async () => {
      // Create user config
      const userConfig = `
processing:
  chunkSize: 500
  overlap: 25
`;
      await fs.writeFile(join(tempDir, 'user.yaml'), userConfig);

      const config = await manager.load();
      
      expect(config.processing.chunkSize).toBe(500);
      expect(config.processing.overlap).toBe(25);
    });

    it('should respect configuration priority order', async () => {
      // Create system config
      const systemConfig = `
processing:
  chunkSize: 750
`;
      await fs.writeFile(join(tempDir, 'system.yaml'), systemConfig);

      // Create user config
      const userConfig = `
processing:
  chunkSize: 500
`;
      await fs.writeFile(join(tempDir, 'user.yaml'), userConfig);

      const config = await manager.load();
      
      // User config should override system config
      expect(config.processing.chunkSize).toBe(500);
    });

    it('should handle environment variables', async () => {
      process.env.ENABLE_ENHANCED_MCP_FEATURES = 'true';

      const config = await manager.load();
      
      expect(config.development?.enableDebugOutput).toBe(true);

      delete process.env.ENABLE_ENHANCED_MCP_FEATURES;
    });
  });

  describe('get()', () => {
    it('should retrieve values by dot notation path', async () => {
      await manager.load();
      
      const chunkSize = manager.get('processing.chunkSize');
      expect(chunkSize).toBeGreaterThanOrEqual(400); // smart default

      const modelName = manager.get('processing.modelName');
      expect(modelName).toBeDefined();
    });

    it('should return undefined for non-existent paths', async () => {
      await manager.load();
      
      const value = manager.get('non.existent.path');
      expect(value).toBeUndefined();
    });
  });

  describe('set()', () => {
    it('should set runtime configuration values', async () => {
      await manager.load();
      
      await manager.set('processing.chunkSize', 800);
      
      const chunkSize = manager.get('processing.chunkSize');
      expect(chunkSize).toBe(800);
    });

    it('should emit configChanged event on set', async () => {
      await manager.load();
      
      const changeHandler = vi.fn();
      manager.on('configChanged', changeHandler);

      await manager.set('processing.chunkSize', 800);
      
      expect(changeHandler).toHaveBeenCalled();
      const event = changeHandler.mock.calls[0][0];
      expect(event.changedPaths).toContain('processing.chunkSize');
      expect(event.source).toBe('runtime');
    });
  });

  describe('getSources()', () => {
    it('should return all loaded sources in priority order', async () => {
      // Create system and user configs
      await fs.writeFile(join(tempDir, 'system.yaml'), 'processing:\n  chunkSize: 750');
      await fs.writeFile(join(tempDir, 'user.yaml'), 'processing:\n  overlap: 15');

      await manager.load();
      
      const sources = manager.getSources();
      
      expect(sources).toHaveLength(3); // default, system, user
      expect(sources[0]?.source).toBe('default');
      expect(sources[0]?.priority).toBe(ConfigPriority.DEFAULT);
      expect(sources[1]?.source).toBe('system');
      expect(sources[1]?.priority).toBe(ConfigPriority.SYSTEM);
      expect(sources[2]?.source).toBe('user');
      expect(sources[2]?.priority).toBe(ConfigPriority.USER);
    });
  });

  describe('getSourceForPath()', () => {
    it('should return the source that provides a specific value', async () => {
      // Create configs with different values
      await fs.writeFile(join(tempDir, 'system.yaml'), 'processing:\n  chunkSize: 750');
      await fs.writeFile(join(tempDir, 'user.yaml'), 'processing:\n  overlap: 15');

      await manager.load();
      
      const chunkSource = manager.getSourceForPath('processing.chunkSize');
      expect(chunkSource).toBe('system');

      const overlapSource = manager.getSourceForPath('processing.overlap');
      expect(overlapSource).toBe('user');

      const batchSource = manager.getSourceForPath('processing.batchSize');
      expect(batchSource).toBe('default');
    });
  });

  describe('system configuration', () => {
    it('should load system configuration with proper priority', async () => {
      // Create system and user configs
      const systemConfig = `
processing:
  chunkSize: 350
  batchSize: 16
`;
      const userConfig = `
processing:
  chunkSize: 450
`;
      
      await fs.writeFile(join(tempDir, 'system.yaml'), systemConfig);
      await fs.writeFile(join(tempDir, 'user.yaml'), userConfig);
      
      const config = await manager.load();
      
      // User config (450) should override system config (350)
      expect(config.processing.chunkSize).toBe(450);
      // But system config batchSize should be used
      expect(config.processing.batchSize).toBe(16);
    });
  });

  describe('profile support', () => {
    it('should load profile configuration when FOLDER_MCP_PROFILE is set', async () => {
      process.env.FOLDER_MCP_PROFILE = 'development';

      // The development profile is built-in, no need to create it
      // Just test that it loads correctly

      const config = await manager.load();
      
      // Development profile overrides batchSize but not chunkSize
      expect(config.processing.chunkSize).toBeGreaterThanOrEqual(400); // Smart default
      expect(config.processing.batchSize).toBe(8); // Development profile value

      delete process.env.FOLDER_MCP_PROFILE;
    });
  });
});