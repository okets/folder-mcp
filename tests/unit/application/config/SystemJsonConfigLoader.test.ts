/**
 * Tests for SystemJsonConfigLoader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemJsonConfigLoader } from '../../../../src/application/config/SystemJsonConfigLoader.js';
import { IFileSystem } from '../../../../src/domain/files/interfaces.js';

describe('SystemJsonConfigLoader', () => {
  let mockFileSystem: IFileSystem;
  let loader: SystemJsonConfigLoader;
  const configPath = '/test/config.json';

  const testConfig = {
    model: {
      name: 'test-model',
      batchSize: 32,
      settings: {
        temperature: 0.7,
        maxTokens: 100
      }
    },
    server: {
      port: 3000,
      host: 'localhost'
    },
    features: ['feature1', 'feature2'],
    development: {
      debug: true
    }
  };

  beforeEach(() => {
    mockFileSystem = {
      readFile: vi.fn().mockResolvedValue(JSON.stringify(testConfig)),
      stat: vi.fn(),
      readDir: vi.fn(),
      join: vi.fn((...paths) => paths.join('/')),
      extname: vi.fn((path) => path.slice(path.lastIndexOf('.')))
    };

    loader = new SystemJsonConfigLoader(mockFileSystem, configPath);
  });

  describe('load', () => {
    it('should load JSON configuration from file', async () => {
      const config = await loader.load();
      
      expect(mockFileSystem.readFile).toHaveBeenCalledWith(configPath);
      expect(config).toEqual(testConfig);
      expect(loader.isLoaded()).toBe(true);
    });

    it('should throw error if file cannot be read', async () => {
      mockFileSystem.readFile = vi.fn().mockRejectedValue(new Error('File not found'));

      await expect(loader.load()).rejects.toThrow('Failed to load configuration from /test/config.json');
      expect(loader.isLoaded()).toBe(false);
    });

    it('should throw error if JSON is invalid', async () => {
      mockFileSystem.readFile = vi.fn().mockResolvedValue('{ invalid json }');

      await expect(loader.load()).rejects.toThrow('Failed to load configuration');
      expect(loader.isLoaded()).toBe(false);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await loader.load();
    });

    it('should get value by simple path', () => {
      expect(loader.get('model.name')).toBe('test-model');
      expect(loader.get('server.port')).toBe(3000);
      expect(loader.get('development.debug')).toBe(true);
    });

    it('should get value by nested path', () => {
      expect(loader.get('model.settings.temperature')).toBe(0.7);
      expect(loader.get('model.settings.maxTokens')).toBe(100);
    });

    it('should handle array access', () => {
      expect(loader.get('features[0]')).toBe('feature1');
      expect(loader.get('features[1]')).toBe('feature2');
    });

    it('should return undefined for non-existent paths', () => {
      expect(loader.get('nonexistent')).toBeUndefined();
      expect(loader.get('model.nonexistent')).toBeUndefined();
      expect(loader.get('features[99]')).toBeUndefined();
    });

    it('should return undefined for invalid array notation', () => {
      expect(loader.get('model[0]')).toBeUndefined(); // model is not an array
    });

    it('should throw error if configuration not loaded', () => {
      const newLoader = new SystemJsonConfigLoader(mockFileSystem, configPath);
      
      expect(() => newLoader.get('model.name')).toThrow('Configuration not loaded');
    });
  });

  describe('getAll', () => {
    it('should return all configuration values', async () => {
      await loader.load();
      const allConfig = loader.getAll();
      
      expect(allConfig).toEqual(testConfig);
    });

    it('should return a deep copy of configuration', async () => {
      await loader.load();
      const allConfig = loader.getAll();
      
      // Modify the returned object
      allConfig.model.name = 'modified';
      allConfig.newProp = 'added';
      
      // Original should be unchanged
      expect(loader.get('model.name')).toBe('test-model');
      expect(loader.get('newProp')).toBeUndefined();
    });

    it('should throw error if configuration not loaded', () => {
      const newLoader = new SystemJsonConfigLoader(mockFileSystem, configPath);
      
      expect(() => newLoader.getAll()).toThrow('Configuration not loaded');
    });
  });

  describe('isLoaded', () => {
    it('should return false initially', () => {
      expect(loader.isLoaded()).toBe(false);
    });

    it('should return true after successful load', async () => {
      await loader.load();
      expect(loader.isLoaded()).toBe(true);
    });

    it('should return false after failed load', async () => {
      mockFileSystem.readFile = vi.fn().mockRejectedValue(new Error('Failed'));
      
      try {
        await loader.load();
      } catch {
        // Expected to throw
      }
      
      expect(loader.isLoaded()).toBe(false);
    });
  });

  describe('reload', () => {
    it('should reload configuration from file', async () => {
      // Initial load
      await loader.load();
      expect(loader.get('model.name')).toBe('test-model');

      // Change the mock to return different config
      const newConfig = {
        ...testConfig,
        model: { ...testConfig.model, name: 'new-model' }
      };
      mockFileSystem.readFile = vi.fn().mockResolvedValue(JSON.stringify(newConfig));

      // Reload
      const reloaded = await loader.reload();
      
      expect(mockFileSystem.readFile).toHaveBeenCalledWith(configPath);
      expect(loader.get('model.name')).toBe('new-model');
      expect(reloaded.model.name).toBe('new-model');
    });

    it('should reset loaded state during reload', async () => {
      await loader.load();
      
      // Mock slow read to check intermediate state
      let resolveRead: (value: string) => void;
      mockFileSystem.readFile = vi.fn().mockReturnValue(
        new Promise(resolve => { resolveRead = resolve; })
      );

      const reloadPromise = loader.reload();
      
      // Should not be loaded during reload
      expect(loader.isLoaded()).toBe(false);
      
      // Complete the read
      resolveRead!(JSON.stringify(testConfig));
      await reloadPromise;
      
      expect(loader.isLoaded()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty configuration', async () => {
      mockFileSystem.readFile = vi.fn().mockResolvedValue('{}');
      
      await loader.load();
      
      expect(loader.getAll()).toEqual({});
      expect(loader.get('anything')).toBeUndefined();
    });

    it('should handle null values in paths', async () => {
      const configWithNull = {
        model: null,
        server: {
          host: null
        }
      };
      mockFileSystem.readFile = vi.fn().mockResolvedValue(JSON.stringify(configWithNull));
      
      await loader.load();
      
      expect(loader.get('model')).toBeNull();
      expect(loader.get('model.name')).toBeUndefined();
      expect(loader.get('server.host')).toBeNull();
      expect(loader.get('server.host.subdomain')).toBeUndefined();
    });

    it('should handle special characters in keys', async () => {
      const specialConfig = {
        'special-key': 'value1',
        'special.key': 'value2',
        'special[key]': 'value3'
      };
      mockFileSystem.readFile = vi.fn().mockResolvedValue(JSON.stringify(specialConfig));
      
      await loader.load();
      
      expect(loader.get('special-key')).toBe('value1');
      // Note: 'special.key' is interpreted as navigation, not a literal key name
      expect(loader.getAll()['special.key']).toBe('value2');
      // 'special[key]' is treated as a literal key name, not array access
      expect(loader.getAll()['special[key]']).toBe('value3');
    });
  });
});