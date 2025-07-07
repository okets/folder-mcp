/**
 * Dependency Injection Setup for Configuration System
 * 
 * Registers the new configuration services in the DI container.
 */

import { DependencyContainer } from '../di/container.js';
import { ConfigManager } from '../application/config/ConfigManager.js';
import { NodeFileSystem } from '../infrastructure/filesystem/node-filesystem.js';
import { NodeFileWriter } from '../infrastructure/filesystem/NodeFileWriter.js';
import { YamlParser } from '../infrastructure/parsers/YamlParser.js';
import { SimpleSchemaValidator, SimpleThemeSchemaLoader } from '../application/config/SimpleSchemaValidator.js';
import { IConfigManager } from '../domain/config/IConfigManager.js';
import { IFileSystem } from '../domain/files/interfaces.js';
import { IFileWriter } from '../domain/config/IFileWriter.js';
import { IYamlParser } from '../domain/config/ISchemaValidator.js';
import { ISchemaLoader, ISchemaValidator } from '../domain/config/ISchemaValidator.js';

/**
 * Service tokens for the new configuration system
 */
export const CONFIG_SERVICE_TOKENS = {
  CONFIG_MANAGER: Symbol('ConfigManager'),
  CONFIG_FILE_SYSTEM: Symbol('ConfigFileSystem'),
  CONFIG_FILE_WRITER: Symbol('ConfigFileWriter'),
  CONFIG_YAML_PARSER: Symbol('ConfigYamlParser'),
  CONFIG_SCHEMA_LOADER: Symbol('ConfigSchemaLoader'),
  CONFIG_SCHEMA_VALIDATOR: Symbol('ConfigSchemaValidator'),
} as const;

/**
 * Register configuration services in the DI container
 */
export function registerConfigurationServices(
  container: DependencyContainer,
  options: {
    defaultsPath?: string;
    userConfigPath?: string;
  } = {}
): void {
  const defaultsPath = options.defaultsPath || 'config-defaults.yaml';
  const userConfigPath = options.userConfigPath || 'config.yaml';

  // Register file system services for configuration
  container.registerSingleton(CONFIG_SERVICE_TOKENS.CONFIG_FILE_SYSTEM, () => {
    return new NodeFileSystem();
  });

  container.registerSingleton(CONFIG_SERVICE_TOKENS.CONFIG_FILE_WRITER, () => {
    return new NodeFileWriter();
  });

  // Register YAML parser
  container.registerSingleton(CONFIG_SERVICE_TOKENS.CONFIG_YAML_PARSER, () => {
    return new YamlParser();
  });

  // Register schema loader
  container.registerSingleton(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_LOADER, () => {
    return new SimpleThemeSchemaLoader();
  });

  // Register schema validator
  container.registerSingleton(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_VALIDATOR, () => {
    const schemaLoader = container.resolve<ISchemaLoader>(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_LOADER);
    return new SimpleSchemaValidator(schemaLoader);
  });

  // Register the main ConfigManager
  container.registerSingleton(CONFIG_SERVICE_TOKENS.CONFIG_MANAGER, () => {
    const fileSystem = container.resolve<IFileSystem>(CONFIG_SERVICE_TOKENS.CONFIG_FILE_SYSTEM);
    const fileWriter = container.resolve<IFileWriter>(CONFIG_SERVICE_TOKENS.CONFIG_FILE_WRITER);
    const yamlParser = container.resolve<IYamlParser>(CONFIG_SERVICE_TOKENS.CONFIG_YAML_PARSER);
    const validator = container.resolve<ISchemaValidator>(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_VALIDATOR);
    const schemaLoader = container.resolve<ISchemaLoader>(CONFIG_SERVICE_TOKENS.CONFIG_SCHEMA_LOADER);

    const configManager = new ConfigManager(
      fileSystem,
      fileWriter,
      yamlParser,
      validator,
      schemaLoader,
      defaultsPath,
      userConfigPath
    );

    // Note: Configuration will be loaded on first use
    // The ConfigManager has a load() method that should be called
    // before using it, but we can't do async in the factory
    return configManager;
  });
}

/**
 * Helper function to get ConfigManager from the container
 */
export function getConfigManager(container: DependencyContainer): IConfigManager {
  return container.resolve<IConfigManager>(CONFIG_SERVICE_TOKENS.CONFIG_MANAGER);
}

/**
 * Register configuration services in the global DI setup
 * This should be called from src/di/setup.ts
 */
export function integrateConfigurationServices(container: DependencyContainer): void {
  registerConfigurationServices(container);
  
  // Also register under the old CONFIGURATION token for compatibility
  container.registerSingleton('SIMPLE_CONFIG_MANAGER' as any, () => {
    return container.resolve(CONFIG_SERVICE_TOKENS.CONFIG_MANAGER);
  });

  // Register a helper to ensure config is loaded
  container.registerSingleton('CONFIG_INITIALIZER' as any, async () => {
    const configManager = container.resolve<IConfigManager>(CONFIG_SERVICE_TOKENS.CONFIG_MANAGER);
    await configManager.load();
    return configManager;
  });
}