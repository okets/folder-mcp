/**
 * Configuration Interface Tests
 * 
 * Type checking and contract tests for configuration interfaces
 */

import { describe, it, expect } from 'vitest';
import type { IConfigManager, ValidationResult } from '../../../../src/domain/config/IConfigManager.js';
import type { ConfigSchema, ConfigItem, ISchemaLoader } from '../../../../src/domain/config/IConfigSchema.js';
import type { ISchemaValidator, IYamlParser, IJsonParser } from '../../../../src/domain/config/ISchemaValidator.js';

describe('Configuration Interfaces', () => {
  describe('IConfigManager interface', () => {
    it('should define proper method signatures', () => {
      // Type-only test - ensures interface is properly structured
      const mockConfigManager: IConfigManager = {
        load: async () => {},
        get: (path: string) => undefined,
        set: async (path: string, value: any) => {},
        getAll: () => ({}),
        validate: async (path: string, value: any): Promise<ValidationResult> => ({ valid: true }),
        getSchema: async () => ({}),
        isLoaded: () => false,
        reload: async () => {}
      };

      // Verify method signatures exist
      expect(typeof mockConfigManager.load).toBe('function');
      expect(typeof mockConfigManager.get).toBe('function');
      expect(typeof mockConfigManager.set).toBe('function');
      expect(typeof mockConfigManager.getAll).toBe('function');
      expect(typeof mockConfigManager.validate).toBe('function');
      expect(typeof mockConfigManager.getSchema).toBe('function');
      expect(typeof mockConfigManager.isLoaded).toBe('function');
      expect(typeof mockConfigManager.reload).toBe('function');
    });
  });

  describe('ConfigSchema types', () => {
    it('should define proper ConfigItem structure', () => {
      const themeConfigItem: ConfigItem = {
        type: 'select',
        label: 'Theme',
        description: 'Color theme for the interface',
        required: false,
        validation: {
          options: ['light', 'dark', 'auto']
        },
        ui: {
          component: 'radio',
          helpText: 'Choose your preferred theme'
        }
      };

      expect(themeConfigItem.type).toBe('select');
      expect(themeConfigItem.label).toBe('Theme');
      expect(themeConfigItem.validation?.options).toEqual(['light', 'dark', 'auto']);
    });

    it('should define proper ConfigSchema structure', () => {
      const testSchema: ConfigSchema = {
        ui: {
          label: 'User Interface',
          description: 'Visual appearance settings',
          icon: '🎨',
          order: 1,
          items: {
            theme: {
              type: 'select',
              label: 'Theme',
              description: 'Color theme',
              validation: { options: ['light', 'dark', 'auto'] }
            }
          }
        }
      };

      expect(testSchema.ui?.label).toBe('User Interface');
      expect(testSchema.ui?.items?.theme?.type).toBe('select');
      expect(testSchema.ui?.items?.theme?.validation?.options).toContain('dark');
    });
  });

  describe('ISchemaValidator interface', () => {
    it('should define proper validation methods', () => {
      const mockValidator: ISchemaValidator = {
        validateValue: async (value: any, schema: ConfigItem) => ({ valid: true }),
        validateConfig: async (config: any, schema: ConfigSchema) => ({ valid: true }),
        validateByPath: async (value: any, path: string) => ({ valid: true })
      };

      expect(typeof mockValidator.validateValue).toBe('function');
      expect(typeof mockValidator.validateConfig).toBe('function');
      expect(typeof mockValidator.validateByPath).toBe('function');
    });
  });

  describe('Parser interfaces', () => {
    it('should define YAML parser interface', () => {
      const mockYamlParser: IYamlParser = {
        parse: async (content: string) => ({}),
        stringify: async (data: any) => ''
      };

      expect(typeof mockYamlParser.parse).toBe('function');
      expect(typeof mockYamlParser.stringify).toBe('function');
    });

    it('should define JSON parser interface', () => {
      const mockJsonParser: IJsonParser = {
        parse: (content: string) => ({}),
        stringify: (data: any, pretty?: boolean) => ''
      };

      expect(typeof mockJsonParser.parse).toBe('function');
      expect(typeof mockJsonParser.stringify).toBe('function');
    });
  });

  describe('ValidationResult type', () => {
    it('should define proper validation result structure', () => {
      const validResult: ValidationResult = {
        valid: true
      };

      const invalidResult: ValidationResult = {
        valid: false,
        errors: [
          {
            path: 'theme',
            message: 'Invalid theme value'
          }
        ]
      };

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toBeUndefined();
      
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.errors?.[0]?.path).toBe('theme');
    });
  });
});