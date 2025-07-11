/**
 * ConfigManager Tests
 * 
 * Tests for user configuration management with theme configuration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../../../../src/application/config/ConfigManager.js';
import { IFileSystem, DirEntry } from '../../../../src/domain/files/interfaces.js';
import { IFileWriter } from '../../../../src/domain/config/IFileWriter.js';
import { IYamlParser, ISchemaValidator } from '../../../../src/domain/config/ISchemaValidator.js';
import { ISchemaLoader } from '../../../../src/domain/config/IConfigSchema.js';

// Mock implementations
class MockFileSystem implements IFileSystem {
  private files: Map<string, string> = new Map();

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async stat() { 
    return {
      size: 0,
      mtime: new Date(),
      isDirectory: () => false,
      isFile: () => true,
      isReadOnly: () => false
    };
  }

  async readDir(): Promise<DirEntry[]> { 
    return []; 
  }

  join(...paths: string[]): string {
    return paths.join('/');
  }

  extname(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }
}

class MockFileWriter implements IFileWriter {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async ensureDir(path: string): Promise<void> {
    this.directories.add(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  // Test helper
  getFile(path: string): string | undefined {
    return this.files.get(path);
  }
}

class MockYamlParser implements IYamlParser {
  async parse(content: string): Promise<any> {
    // Simple YAML-like parsing for tests
    const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    const result: any = {};
    
    for (const line of lines) {
      const match = line.match(/^(\s*)([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[2]?.trim();
        const value = match[3]?.trim();
        
        if (key && value !== undefined) {
          // Handle dot notation for nested objects
          if (key.includes('.')) {
            const parts = key.split('.');
            let current = result;
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i];
              if (part && !current[part]) {
                current[part] = {};
              }
              if (part) current = current[part];
            }
            const lastPart = parts[parts.length - 1];
            if (lastPart) {
              // Handle simple values
              if (value === 'true') current[lastPart] = true;
              else if (value === 'false') current[lastPart] = false;
              else if (/^\d+$/.test(value)) current[lastPart] = parseInt(value);
              else current[lastPart] = value;
            }
          } else {
            // Handle simple values
            if (value === 'true') result[key] = true;
            else if (value === 'false') result[key] = false;
            else if (/^\d+$/.test(value)) result[key] = parseInt(value);
            else result[key] = value;
          }
        }
      }
    }
    
    return result;
  }

  async stringify(data: any): Promise<string> {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      lines.push(`${key}: ${value}`);
    }
    return lines.join('\n');
  }
}

class MockSchemaValidator implements ISchemaValidator {
  async validateValue(path: string, value: any): Promise<any> {
    // Simple theme validation for tests
    if (path === 'theme') {
      const validThemes = ['auto', 'light', 'dark', 'light-optimized', 'dark-optimized', 'default', 'minimal'];
      if (!validThemes.includes(value)) {
        return {
          valid: false,
          error: `Invalid theme: ${value}. Must be one of: ${validThemes.join(', ')}`
        };
      }
    }
    return { valid: true };
  }

  async validateConfig(): Promise<any> {
    return { valid: true };
  }

  async validateByPath(config: any, path: string): Promise<any> {
    const value = this.getValueByPath(config, path);
    return this.validateValue(path, value);
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
}

class MockSchemaLoader implements ISchemaLoader {
  async loadSchema(): Promise<any> {
    return {
      ui: {
        label: 'User Interface',
        description: 'Visual appearance settings',
        order: 1,
        items: {
          theme: {
            type: 'select',
            label: 'Theme',
            description: 'Color theme',
            validation: { options: ['auto', 'light', 'dark', 'light-optimized', 'dark-optimized', 'default', 'minimal'] }
          }
        }
      }
    };
  }

  async getItemSchema(): Promise<any> {
    return {
      type: 'select',
      label: 'Theme',
      validation: { options: ['auto', 'light', 'dark', 'light-optimized', 'dark-optimized', 'default', 'minimal'] }
    };
  }

  isLoaded(): boolean {
    return true;
  }

  async reload(): Promise<void> {}
}

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockFileSystem: MockFileSystem;
  let mockFileWriter: MockFileWriter;
  let mockYamlParser: MockYamlParser;
  let mockSchemaValidator: MockSchemaValidator;
  let mockSchemaLoader: MockSchemaLoader;

  beforeEach(() => {
    mockFileSystem = new MockFileSystem();
    mockFileWriter = new MockFileWriter();
    mockYamlParser = new MockYamlParser();
    mockSchemaValidator = new MockSchemaValidator();
    mockSchemaLoader = new MockSchemaLoader();

    configManager = new ConfigManager(
      mockFileSystem,
      mockFileWriter,
      mockYamlParser,
      mockSchemaValidator,
      mockSchemaLoader,
      'config-defaults.yaml',
      'config.yaml'
    );
  });

  describe('load', () => {
    it('should load and merge theme configuration', async () => {
      mockFileSystem.setFile('config-defaults.yaml', 'theme: auto\nlogLevel: info');
      mockFileSystem.setFile('config.yaml', 'theme: dark');

      await configManager.load();

      expect(configManager.get('theme')).toBe('dark'); // User override wins
      expect(configManager.get('logLevel')).toBe('info'); // Default preserved
    });

    it('should work with defaults only', async () => {
      mockFileSystem.setFile('config-defaults.yaml', 'theme: auto\nshowProgress: true');

      await configManager.load();

      expect(configManager.get('theme')).toBe('auto');
      expect(configManager.get('showProgress')).toBe(true);
    });

    it('should work with no config files', async () => {
      await configManager.load();

      expect(configManager.getAll()).toEqual({});
      expect(configManager.isLoaded()).toBe(true);
    });

    it('should handle nested configuration', async () => {
      mockFileSystem.setFile('config-defaults.yaml', 'ui.theme: auto\nui.animations: true');
      mockFileSystem.setFile('config.yaml', 'ui.theme: dark');

      await configManager.load();

      expect(configManager.get('ui.theme')).toBe('dark');
      expect(configManager.get('ui.animations')).toBe(true);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      mockFileSystem.setFile('config-defaults.yaml', 'theme: auto\nlogLevel: info');
      mockFileSystem.setFile('config.yaml', 'theme: dark');
      await configManager.load();
    });

    it('should get configuration values', () => {
      expect(configManager.get('theme')).toBe('dark');
      expect(configManager.get('logLevel')).toBe('info');
    });

    it('should return undefined for non-existent keys', () => {
      expect(configManager.get('nonexistent')).toBeUndefined();
    });

    it('should throw if not loaded', () => {
      const unloadedManager = new ConfigManager(
        mockFileSystem,
        mockFileWriter,
        mockYamlParser,
        mockSchemaValidator,
        mockSchemaLoader,
        'defaults.yaml',
        'config.yaml'
      );

      expect(() => unloadedManager.get('theme')).toThrow('Configuration not loaded');
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      mockFileSystem.setFile('config-defaults.yaml', 'theme: auto');
      await configManager.load();
    });

    it('should set and save configuration values', async () => {
      await configManager.set('theme', 'light');

      expect(configManager.get('theme')).toBe('light');
      
      // Check that it was saved to user config file
      const savedContent = mockFileWriter.getFile('config.yaml');
      expect(savedContent).toContain('theme: light');
    });

    it('should validate before setting', async () => {
      await expect(configManager.set('theme', 'invalid-theme'))
        .rejects.toThrow('Validation failed for theme');
    });

    it('should handle nested paths', async () => {
      await configManager.set('ui.theme', 'dark');

      expect(configManager.get('ui.theme')).toBe('dark');
    });

    it('should throw if not loaded', async () => {
      const unloadedManager = new ConfigManager(
        mockFileSystem,
        mockFileWriter,
        mockYamlParser,
        mockSchemaValidator,
        mockSchemaLoader,
        'defaults.yaml',
        'config.yaml'
      );

      await expect(unloadedManager.set('theme', 'dark'))
        .rejects.toThrow('Configuration not loaded');
    });
  });

  describe('getAll', () => {
    it('should return all merged configuration', async () => {
      mockFileSystem.setFile('config-defaults.yaml', 'theme: auto\nlogLevel: info');
      mockFileSystem.setFile('config.yaml', 'theme: dark\ndevelopmentEnabled: true');

      await configManager.load();
      const allConfig = configManager.getAll();

      expect(allConfig).toEqual({
        theme: 'dark',
        logLevel: 'info',
        developmentEnabled: true
      });
    });

    it('should return a copy to prevent mutation', async () => {
      mockFileSystem.setFile('config-defaults.yaml', 'theme: auto');
      await configManager.load();

      const config1 = configManager.getAll();
      const config2 = configManager.getAll();

      config1.newKey = 'value';
      expect(config2.newKey).toBeUndefined();
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      await configManager.load();
    });

    it('should validate theme values', async () => {
      const validResult = await configManager.validate('theme', 'dark');
      expect(validResult.valid).toBe(true);

      const invalidResult = await configManager.validate('theme', 'invalid');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors?.[0]?.message).toContain('Invalid theme');
    });
  });

  describe('reload', () => {
    it('should reload configuration from files', async () => {
      mockFileSystem.setFile('config-defaults.yaml', 'theme: auto');
      await configManager.load();

      expect(configManager.get('theme')).toBe('auto');

      // Update files
      mockFileSystem.setFile('config.yaml', 'theme: dark');
      await configManager.reload();

      expect(configManager.get('theme')).toBe('dark');
    });
  });

  describe('isLoaded', () => {
    it('should return false before loading', () => {
      expect(configManager.isLoaded()).toBe(false);
    });

    it('should return true after loading', async () => {
      await configManager.load();
      expect(configManager.isLoaded()).toBe(true);
    });
  });

  describe('schema integration', () => {
    it('should return schema from loader', async () => {
      const schema = await configManager.getSchema();
      expect(schema.ui.items.theme.type).toBe('select');
    });
  });
});