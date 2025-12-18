/**
 * Tests for Simple Schema Validator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleSchemaValidator, SimpleThemeSchemaLoader } from '../../../../src/application/config/SimpleSchemaValidator.js';

describe('SimpleSchemaValidator', () => {
  let validator: SimpleSchemaValidator;
  let schemaLoader: SimpleThemeSchemaLoader;

  beforeEach(() => {
    schemaLoader = new SimpleThemeSchemaLoader();
    validator = new SimpleSchemaValidator(schemaLoader);
  });

  describe('validateValue', () => {
    describe('theme validation', () => {
      it('should validate valid theme values', async () => {
        // Current valid themes from ThemeContext
        const validThemes = [
          'default', 'light', 'minimal',  // Core
          'high-contrast', 'colorblind',   // Accessibility
          'ocean', 'forest', 'sunset',     // Nature
          'dracula', 'nord', 'monokai', 'solarized', 'gruvbox',  // Classic Editor
          'bbs', 'cga', 'matrix'           // Retro
        ];

        for (const theme of validThemes) {
          const result = await validator.validateValue('theme', theme);
          expect(result.valid).toBe(true);
          expect((result as any).error).toBeUndefined();
        }
      });

      it('should reject invalid theme values', async () => {
        const invalidThemes = ['blue', 'invalid', 'auto', 'dark', 123, true, null, undefined];

        for (const theme of invalidThemes) {
          const result = await validator.validateValue('theme', theme);
          expect(result.valid).toBe(false);
          expect((result as any).error).toBeDefined();
        }
      });

      it('should provide helpful error message for invalid theme', async () => {
        const result = await validator.validateValue('theme', 'invalid');
        expect((result as any).error).toContain('Theme must be one of:');
        expect((result as any).error).toContain('default');
      });

      it('should validate theme with full path', async () => {
        const result = await validator.validateValue('appearance.theme', 'dracula');
        expect(result.valid).toBe(true);
      });
    });

    describe('unknown paths', () => {
      it('should allow any value for unknown paths', async () => {
        const result = await validator.validateValue('unknown.path', 'any value');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate complete configuration', async () => {
      const config = {
        appearance: {
          theme: 'dracula'
        }
      };

      const result = await validator.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid configuration', async () => {
      const config = {
        appearance: {
          theme: 'invalid'
        }
      };

      const result = await validator.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.path).toBe('appearance.theme');
    });

    it('should validate multiple fields', async () => {
      const config = {
        appearance: {
          theme: 'nord'
        },
        other: {
          field: 'value'
        }
      };

      const result = await validator.validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateByPath', () => {
    it('should extract value and validate', async () => {
      const config = {
        appearance: {
          theme: 'ocean'
        }
      };

      const result = await validator.validateByPath(config, 'appearance.theme');
      expect(result.valid).toBe(true);
    });

    it('should handle missing paths', async () => {
      const config = {};
      
      // When validating by path and the field is missing, it extracts undefined
      // which gets passed to validateValue, which considers undefined invalid
      const result = await validator.validateByPath(config, 'appearance.theme');
      expect(result.valid).toBe(false); // validateValue considers undefined invalid
      expect((result as any).error).toContain('Value cannot be undefined');
    });
  });
});

describe('SimpleThemeSchemaLoader', () => {
  let loader: SimpleThemeSchemaLoader;

  beforeEach(() => {
    loader = new SimpleThemeSchemaLoader();
  });

  describe('loadSchema', () => {
    it('should load theme schema', async () => {
      const schema = await loader.loadSchema();
      
      expect(schema).toBeDefined();
      expect(schema.version).toBe('1.0.0');
      expect(schema.groups).toBeDefined();
      expect(schema.groups?.appearance).toBeDefined();
    });

    it('should cache loaded schema', async () => {
      const schema1 = await loader.loadSchema();
      const schema2 = await loader.loadSchema();
      
      expect(schema1).toBe(schema2); // Same object reference
    });
  });

  describe('getItemSchema', () => {
    it('should get theme item schema', async () => {
      const itemSchema = await loader.getItemSchema('appearance.theme');
      
      expect(itemSchema).toBeDefined();
      expect(itemSchema?.type).toBe('enum');
      expect(itemSchema?.type).toBe('enum');
    });

    it('should handle simple theme path', async () => {
      const itemSchema = await loader.getItemSchema('theme');
      
      expect(itemSchema).toBeDefined();
      expect(itemSchema?.type).toBe('enum');
    });

    it('should return undefined for unknown paths', async () => {
      const itemSchema = await loader.getItemSchema('unknown.path');
      
      expect(itemSchema).toBeUndefined();
    });
  });

  describe('isLoaded', () => {
    it('should return false before loading', () => {
      expect(loader.isLoaded()).toBe(false);
    });

    it('should return true after loading', async () => {
      await loader.loadSchema();
      expect(loader.isLoaded()).toBe(true);
    });
  });

  describe('reload', () => {
    it('should clear and reload schema', async () => {
      await loader.loadSchema();
      expect(loader.isLoaded()).toBe(true);
      
      await loader.reload();
      expect(loader.isLoaded()).toBe(true);
    });
  });
});