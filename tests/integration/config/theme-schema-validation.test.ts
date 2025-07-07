/**
 * Theme Schema Validation Integration Test
 * 
 * Tests schema validation for theme configuration in the complete system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { ConfigManager } from '../../../src/application/config/ConfigManager.js';
import { NodeFileSystem } from '../../../src/infrastructure/filesystem/node-filesystem.js';
import { NodeFileWriter } from '../../../src/infrastructure/filesystem/NodeFileWriter.js';
import { YamlParser } from '../../../src/infrastructure/parsers/YamlParser.js';
import { SimpleSchemaValidator, SimpleThemeSchemaLoader } from '../../../src/application/config/SimpleSchemaValidator.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

describe('Theme Schema Validation Integration', () => {
  let tempDir: string;
  let configManager: ConfigManager;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('theme-schema-validation-test-');
    
    // Create config-defaults.yaml with valid theme
    const configDefaults = `
theme: "auto"  # Valid default theme
development:
  enabled: false
performance:
  batchSize: 32
`;
    writeFileSync(join(tempDir, 'config-defaults.yaml'), configDefaults);
    
    // Setup ConfigManager with schema validation
    const fileSystem = new NodeFileSystem();
    const fileWriter = new NodeFileWriter();
    const yamlParser = new YamlParser();
    const schemaLoader = new SimpleThemeSchemaLoader();
    const validator = new SimpleSchemaValidator(schemaLoader);
    
    // Change to temp directory
    const originalCwd = process.cwd();
    process.chdir(tempDir);
    
    configManager = new ConfigManager(
      fileSystem,
      fileWriter,
      yamlParser,
      validator,
      schemaLoader,
      'config-defaults.yaml',
      'config.yaml'
    );
    
    await configManager.load();
    
    // Change back
    process.chdir(originalCwd);
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('Valid theme values', () => {
    it('should accept valid theme values through set', async () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        
        // Test all valid theme values
        const validThemes = ['light', 'dark', 'auto'];
        
        for (const theme of validThemes) {
          await configManager.set('theme', theme);
          const value = configManager.get('theme');
          expect(value).toBe(theme);
          
          // Verify it was saved
          const fs = await import('fs');
          const savedConfig = fs.readFileSync(join(tempDir, 'config.yaml'), 'utf8');
          expect(savedConfig).toContain(`theme: ${theme}`);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should validate theme before setting', async () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        
        // Validate should return true for valid themes
        const result = await configManager.validate('theme', 'dark');
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Invalid theme values', () => {
    it('should reject invalid theme values', async () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        
        // Try to set invalid theme
        await expect(configManager.set('theme', 'invalid')).rejects.toThrow('Validation failed');
        
        // Theme should remain unchanged
        expect(configManager.get('theme')).toBe('auto');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should provide clear error message for invalid theme', async () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        
        try {
          await configManager.set('theme', 'blue');
          expect.fail('Should have thrown validation error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Theme must be one of: light, dark, auto');
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should validate various invalid types', async () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        
        const invalidValues = [123, true, null, {}, []];
        
        for (const value of invalidValues) {
          const result = await configManager.validate('theme', value);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
          expect(result.errors?.[0]?.message).toBeDefined();
        }
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Schema information', () => {
    it('should provide schema information', async () => {
      const schema = await configManager.getSchema();
      
      expect(schema).toBeDefined();
      expect(schema.groups).toBeDefined();
      expect(schema.groups.appearance).toBeDefined();
      expect(schema.groups.appearance.items.theme).toBeDefined();
      
      const themeItem = schema.groups.appearance.items.theme;
      expect(themeItem.type).toBe('enum');
      expect(themeItem.validation.enum).toEqual(['light', 'dark', 'auto']);
    });

    it('should provide UI hints in schema', async () => {
      const schema = await configManager.getSchema();
      const themeItem = schema.groups.appearance.items.theme;
      
      expect(themeItem.ui).toBeDefined();
      expect(themeItem.ui.component).toBe('select');
      expect(themeItem.ui.options).toHaveLength(3);
      expect(themeItem.ui.options[0]).toEqual({ value: 'light', label: 'Light Mode' });
    });
  });

  describe('File persistence with validation', () => {
    it('should not save invalid values to file', async () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        
        // Create initial valid config
        await configManager.set('theme', 'dark');
        
        // Try to set invalid value
        try {
          await configManager.set('theme', 'invalid');
        } catch {
          // Expected to fail
        }
        
        // Reload and verify theme is still dark
        await configManager.reload();
        expect(configManager.get('theme')).toBe('dark');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});