/**
 * Simple Configuration Loader for DEAD SIMPLE Architecture
 * 
 * Loads configuration from:
 * 1. system-configuration.json (constants)
 * 2. config-defaults.yaml + config.yaml (user preferences)
 * 3. Command line arguments (folder path)
 */

import { SystemJsonConfigLoader } from './SystemJsonConfigLoader.js';
import { ConfigManager } from './ConfigManager.js';
import { NodeFileSystem } from '../../infrastructure/filesystem/node-filesystem.js';
import { NodeFileWriter } from '../../infrastructure/filesystem/NodeFileWriter.js';
import { YamlParser } from '../../infrastructure/parsers/YamlParser.js';
import { createConsoleLogger } from '../../infrastructure/logging/logger.js';

const logger = createConsoleLogger('info');

// Simple mock implementations for immediate use
class MockSchemaValidator {
  async validateValue() { return { valid: true }; }
  async validateConfig() { return { valid: true }; }
  async validateByPath() { return { valid: true }; }
}

class MockSchemaLoader {
  async loadSchema() { return {}; }
  async getItemSchema(): Promise<any> { return undefined; }
  isLoaded() { return true; }
  async reload() {}
}

export interface SimpleConfig {
  // System constants from JSON
  system: any;
  // User preferences from YAML  
  user: any;
  // Runtime parameters
  folders: string[];
  // CLI overrides
  cliOverrides: any;
  // Flag to track if user config file exists
  userConfigExists: boolean;
  // Raw user config data (not merged with defaults)
  rawUserConfig: any;
}

/**
 * Convert SimpleConfig to ResolvedConfig format for DI compatibility
 */
export function convertToResolvedConfig(simpleConfig: SimpleConfig): any {
  const folderPath = simpleConfig.folders[0] || process.cwd();
  
  // Create a ResolvedConfig-compatible object using system constants + user preferences + CLI overrides
  const resolvedConfig = {
    folderPath,
    
    // Processing settings from system config with user overrides
    chunkSize: simpleConfig.user.performance?.chunkSize || simpleConfig.system.model?.chunkSize || 1000,
    overlap: simpleConfig.user.performance?.overlap || simpleConfig.system.model?.overlap || 10,
    batchSize: simpleConfig.user.performance?.batchSize || simpleConfig.system.model?.batchSize || 32,
    modelName: simpleConfig.user.model?.name || simpleConfig.system.model?.name || 'all-minilm',
    maxConcurrentOperations: simpleConfig.user.performance?.maxConcurrentOperations || simpleConfig.system.model?.maxConcurrentOperations || 14,
    timeoutMs: simpleConfig.system.model?.timeoutMs || 30000,
    
    // File processing from system config
    fileExtensions: simpleConfig.system.fileProcessing?.extensions || ['.txt', '.md', '.pdf', '.docx'],
    ignorePatterns: simpleConfig.system.fileProcessing?.ignorePatterns || ['node_modules/**', '.git/**'],
    maxFileSize: simpleConfig.system.fileProcessing?.maxFileSize || 10485760,
    debounceDelay: simpleConfig.system.fileProcessing?.debounceDelay || 1000,
    
    // Folders configuration - single folder from command line
    folders: {
      list: simpleConfig.folders.map(folder => ({
        path: folder,
        name: folder.split('/').pop() || 'folder',
        enabled: true
      }))
    },
    
    // Development settings with user overrides
    development: {
      enableDebugOutput: simpleConfig.user.development?.debugOutput || simpleConfig.system.development?.enableDebugOutput || false,
      mockOllamaApi: simpleConfig.system.development?.mockOllamaApi || false,
      skipGpuDetection: simpleConfig.system.development?.skipGpuDetection || false
    },
    
    // Theme configuration with CLI override support (highest priority)
    theme: simpleConfig.cliOverrides.theme || simpleConfig.user.theme || 'auto',
    
    // Source tracking (dummy values for compatibility)
    sources: {
      chunkSize: 'system',
      overlap: 'system', 
      batchSize: simpleConfig.user.performance?.batchSize ? 'user' : 'system',
      modelName: 'system',
      maxConcurrentOperations: simpleConfig.user.performance?.maxConcurrentOperations ? 'user' : 'system',
      fileExtensions: 'system',
      ignorePatterns: 'system',
      debounceDelay: 'system',
      theme: simpleConfig.cliOverrides.theme ? 'cli' : (simpleConfig.rawUserConfig.theme ? 'user' : 'default')
    }
  };
  
  return resolvedConfig;
}

/**
 * Load configuration using DEAD SIMPLE approach
 */
export async function loadSimpleConfiguration(folderPath?: string, cliOverrides: any = {}): Promise<SimpleConfig> {
  logger.debug('Loading DEAD SIMPLE configuration');
  
  // 1. Load system constants from JSON
  const fileSystem = new NodeFileSystem();
  const systemLoader = new SystemJsonConfigLoader(fileSystem, 'system-configuration.json');
  const systemConfig = await systemLoader.load();
  
  // 2. Load user preferences from YAML
  const fileWriter = new NodeFileWriter();
  const yamlParser = new YamlParser();
  const validator = new MockSchemaValidator();
  const schemaLoader = new MockSchemaLoader();
  
  const userConfigManager = new ConfigManager(
    fileSystem,
    fileWriter, 
    yamlParser,
    validator,
    schemaLoader,
    'config-defaults.yaml',
    'config.yaml'
  );
  
  let userConfigExists = false;
  let userConfigData = {};
  try {
    await userConfigManager.load();
    userConfigExists = true;
    
    // Get the raw user config data (not merged)
    const userConfigContent = await fileSystem.readFile('config.yaml');
    userConfigData = await yamlParser.parse(userConfigContent);
    
    logger.debug('User configuration loaded successfully');
  } catch (error) {
    userConfigExists = false;
    userConfigData = {};
    logger.warn('User configuration not found, using defaults only');
  }
  
  // 3. Handle folder path from command line
  const folders: string[] = [];
  if (folderPath) {
    folders.push(folderPath);
    logger.info(`Folder configured from command line: ${folderPath}`);
  } else {
    logger.warn('No folder path provided');
  }
  
  const config: SimpleConfig = {
    system: systemConfig,
    user: userConfigManager.getAll(),
    folders,
    cliOverrides,
    userConfigExists,
    rawUserConfig: userConfigData
  };
  
  logger.debug('Configuration loaded successfully', {
    systemKeys: Object.keys(systemConfig || {}),
    userKeys: Object.keys(config.user || {}),
    folderCount: folders.length
  });
  
  return config;
}