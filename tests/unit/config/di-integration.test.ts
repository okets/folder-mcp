/**
 * Tests for Configuration System DI Integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { CONFIG_SERVICE_TOKENS, getConfigManager } from '../../../src/config/di-setup.js';
import { IConfigManager } from '../../../src/domain/config/IConfigManager.js';
import { IFileSystem } from '../../../src/domain/files/interfaces.js';
import { IFileWriter } from '../../../src/domain/config/IFileWriter.js';
import { IYamlParser } from '../../../src/domain/config/ISchemaValidator.js';
import { ISchemaValidator, ISchemaLoader } from '../../../src/domain/config/ISchemaValidator.js';

describe('Configuration DI Integration', () => {
  let container: any;

  beforeEach(() => {
    // Setup fresh container for each test
    container = setupDependencyInjection({
      logLevel: 'error' // Quiet for tests
    });
  });

  afterEach(() => {
    // Clear container
    container.clear();
  });

  describe('Service Registration', () => {
    it('should register all configuration services', () => {
      expect(container.isRegistered(CONFIG_SERVICE_TOKENS.CONFIG_MANAGER)).toBe(true);
      expect(container.isRegistered(CONFIG_SERVICE_TOKENS.CONFIG_FILE_SYSTEM)).toBe(true);
      expect(container.isRegistered(CONFIG_SERVICE_TOKENS.CONFIG_FILE_WRITER)).toBe(true);
      expect(container.isRegistered(CONFIG_SERVICE_TOKENS.CONFIG_YAML_PARSER)).toBe(true);
      expect(container.isRegistered(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_LOADER)).toBe(true);
      expect(container.isRegistered(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_VALIDATOR)).toBe(true);
    });

    it('should register CONFIG_INITIALIZER helper', () => {
      expect(container.isRegistered('CONFIG_INITIALIZER')).toBe(true);
    });

    it('should register SIMPLE_CONFIG_MANAGER for compatibility', () => {
      expect(container.isRegistered('SIMPLE_CONFIG_MANAGER')).toBe(true);
    });
  });

  describe('Service Resolution', () => {
    it('should resolve ConfigManager', () => {
      const configManager = getConfigManager(container);
      expect(configManager).toBeDefined();
      expect(configManager.get).toBeDefined();
      expect(configManager.set).toBeDefined();
      expect(configManager.load).toBeDefined();
    });

    it('should resolve FileSystem service', () => {
      const fileSystem = container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_FILE_SYSTEM) as IFileSystem;
      expect(fileSystem).toBeDefined();
      expect(fileSystem.readFile).toBeDefined();
      expect(fileSystem.stat).toBeDefined();
    });

    it('should resolve FileWriter service', () => {
      const fileWriter = container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_FILE_WRITER) as IFileWriter;
      expect(fileWriter).toBeDefined();
      expect(fileWriter.writeFile).toBeDefined();
      expect(fileWriter.ensureDir).toBeDefined();
    });

    it('should resolve YamlParser service', () => {
      const yamlParser = container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_YAML_PARSER) as IYamlParser;
      expect(yamlParser).toBeDefined();
      expect(yamlParser.parse).toBeDefined();
      expect(yamlParser.stringify).toBeDefined();
    });

    it('should resolve SchemaValidator service', () => {
      const validator = container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_VALIDATOR) as ISchemaValidator;
      expect(validator).toBeDefined();
      expect(validator.validateConfig).toBeDefined();
      expect(validator.validateValue).toBeDefined();
    });

    it('should resolve SchemaLoader service', () => {
      const loader = container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_LOADER) as ISchemaLoader;
      expect(loader).toBeDefined();
      expect(loader.loadSchema).toBeDefined();
      expect(loader.getItemSchema).toBeDefined();
    });
  });

  describe('ConfigManager Integration', () => {
    it('should create ConfigManager with all dependencies injected', () => {
      const configManager = container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_MANAGER) as IConfigManager;
      
      // ConfigManager should be created with all dependencies
      expect(configManager).toBeDefined();
      
      // Should have all required methods
      expect(configManager.load).toBeDefined();
      expect(configManager.get).toBeDefined();
      expect(configManager.set).toBeDefined();
      expect(configManager.getAll).toBeDefined();
      expect(configManager.validate).toBeDefined();
    });

    it('should resolve same ConfigManager instance (singleton)', () => {
      const configManager1 = container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_MANAGER);
      const configManager2 = container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_MANAGER);
      
      expect(configManager1).toBe(configManager2);
    });

    it('should be able to use CONFIG_INITIALIZER for async loading', async () => {
      const configManager = await container.resolveAsync('CONFIG_INITIALIZER');
      
      // Should be loaded and ready to use
      expect(configManager).toBeDefined();
      expect(configManager.get).toBeDefined();
      
      // Should be able to get default values
      const allConfig = configManager.getAll();
      expect(allConfig).toBeDefined();
    });
  });
});