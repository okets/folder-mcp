/**
 * Theme Configuration Integration Tests
 * 
 * Tests for theme configuration loading with real YAML files.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from '../../../../src/application/config/ConfigManager.js';
import { NodeFileSystem } from '../../../../src/infrastructure/filesystem/node-filesystem.js';
import { NodeFileWriter } from '../../../../src/infrastructure/filesystem/NodeFileWriter.js';
import { YamlParser } from '../../../../src/infrastructure/parsers/YamlParser.js';
import { ISchemaValidator } from '../../../../src/domain/config/ISchemaValidator.js';
import { ISchemaLoader } from '../../../../src/domain/config/IConfigSchema.js';

// Simple mock validators for theme testing
class MockThemeValidator implements ISchemaValidator {
  async validateValue(): Promise<any> {
    return { valid: true };
  }

  async validateConfig(): Promise<any> {
    return { valid: true };
  }

  async validateByPath(value: any, path: string): Promise<any> {
    if (path === 'theme') {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(value)) {
        return {
          valid: false,
          errors: [{ path, message: `Invalid theme: ${value}. Must be one of: ${validThemes.join(', ')}` }]
        };
      }
    }
    return { valid: true };
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
            description: 'Color theme for the interface',
            validation: { options: ['light', 'dark', 'auto'] }
          }
        }
      }
    };
  }

  async getItemSchema(): Promise<any> {
    return {
      type: 'select',
      label: 'Theme',
      validation: { options: ['light', 'dark', 'auto'] }
    };
  }

  isLoaded(): boolean {
    return true;
  }

  async reload(): Promise<void> {}
}

describe('Theme Configuration', () => {
  let configManager: ConfigManager;
  let fileSystem: NodeFileSystem;
  let fileWriter: NodeFileWriter;
  let yamlParser: YamlParser;
  let validator: MockThemeValidator;
  let schemaLoader: MockSchemaLoader;

  beforeEach(() => {
    fileSystem = new NodeFileSystem();
    fileWriter = new NodeFileWriter();
    yamlParser = new YamlParser();
    validator = new MockThemeValidator();
    schemaLoader = new MockSchemaLoader();

    configManager = new ConfigManager(
      fileSystem,
      fileWriter,
      yamlParser,
      validator,
      schemaLoader,
      'config-defaults.yaml',
      'config.yaml'
    );
  });

  describe('Configuration Loading and Merging', () => {
    it('should load user overrides from config.yaml', async () => {
      await configManager.load();
      
      // Should load the user-overridden theme (dark from config.yaml)
      expect(configManager.get('theme')).toBe('dark');
      
      // Should load user-overridden development settings
      expect(configManager.get('development.enabled')).toBe(true);
      expect(configManager.get('development.hotReload')).toBe(true);
      expect(configManager.get('development.debugOutput')).toBe(false);
      
      // Should load user-overridden performance settings
      expect(configManager.get('performance.batchSize')).toBe(64);
      expect(configManager.get('performance.maxConcurrentOperations')).toBe(8);
    });

    it('should use defaults for settings not overridden', async () => {
      await configManager.load();
      
      // Should use default logging settings (not overridden in config.yaml)
      expect(configManager.get('logging.level')).toBe('info');
      expect(configManager.get('logging.format')).toBe('text');
    });
  });

  describe('Theme Validation', () => {
    beforeEach(async () => {
      await configManager.load();
    });

    it('should validate valid theme values', async () => {
      const result1 = await configManager.validate('theme', 'light');
      expect(result1.valid).toBe(true);

      const result2 = await configManager.validate('theme', 'dark');
      expect(result2.valid).toBe(true);

      const result3 = await configManager.validate('theme', 'auto');
      expect(result3.valid).toBe(true);
    });

    it('should reject invalid theme values', async () => {
      const result = await configManager.validate('theme', 'purple');
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]?.message).toContain('Invalid theme: purple');
    });
  });

  describe('Configuration Schema', () => {
    it('should return theme schema information', async () => {
      const schema = await configManager.getSchema();
      
      expect(schema.ui.items.theme.type).toBe('select');
      expect(schema.ui.items.theme.label).toBe('Theme');
      expect(schema.ui.items.theme.validation.options).toEqual(['light', 'dark', 'auto']);
    });
  });
});