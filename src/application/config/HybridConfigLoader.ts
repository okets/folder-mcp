/**
 * Hybrid Configuration Loader for DEAD SIMPLE Architecture
 * 
 * Routes configuration loading from multiple sources:
 * 1. system-configuration.json (constants)
 * 2. config-defaults.yaml + config.yaml (user preferences)
 * 3. Command line arguments (folder path)
 * 
 * Acts as a bridge between system constants and user preferences.
 */

import { SystemJsonConfigLoader } from './SystemJsonConfigLoader.js';
import { ConfigManager } from './ConfigManager.js';
import { NodeFileSystem } from '../../infrastructure/filesystem/node-filesystem.js';
import { NodeFileWriter } from '../../infrastructure/filesystem/NodeFileWriter.js';
import { YamlParser } from '../../infrastructure/parsers/YamlParser.js';
import { createConsoleLogger } from '../../infrastructure/logging/logger.js';
import { getDefaultModelId } from '../../config/model-registry.js';

const logger = createConsoleLogger('info');

import { SimpleSchemaValidator, SimpleThemeSchemaLoader } from './SimpleSchemaValidator.js';

export interface HybridConfig {
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
 * Convert HybridConfig to ResolvedConfig format for DI compatibility
 */
export function convertToResolvedConfig(hybridConfig: HybridConfig): any {
  const folderPath = hybridConfig.folders[0] || process.cwd();
  
  // Create a ResolvedConfig-compatible object using system constants + user preferences + CLI overrides
  const resolvedConfig = {
    folderPath,
    
    // Processing settings from system config with user overrides
    chunkSize: hybridConfig.user.performance?.chunkSize || hybridConfig.system.model?.chunkSize || 1000,
    overlap: hybridConfig.user.performance?.overlap || hybridConfig.system.model?.overlap || 10,
    batchSize: hybridConfig.user.performance?.batchSize || hybridConfig.system.model?.batchSize || 32,
    modelName: hybridConfig.user.model?.name || hybridConfig.system.model?.name || getDefaultModelId(),
    maxConcurrentOperations: hybridConfig.user.performance?.maxConcurrentOperations || hybridConfig.system.model?.maxConcurrentOperations || 14,
    timeoutMs: hybridConfig.system.model?.timeoutMs || 30000,
    
    // File processing from system config
    fileExtensions: hybridConfig.system.fileProcessing?.extensions || ['.txt', '.md', '.pdf', '.docx'],
    ignorePatterns: hybridConfig.system.fileProcessing?.ignorePatterns || ['node_modules/**', '.git/**'],
    maxFileSize: hybridConfig.system.fileProcessing?.maxFileSize || 10485760,
    debounceDelay: hybridConfig.system.fileProcessing?.debounceDelay || 1000,
    
    // Folders configuration
    folders: {
      list: hybridConfig.folders.map(folder => ({
        path: folder,
        name: folder.split('/').pop() || 'folder',
        enabled: true
      }))
    },
    
    // Development settings with user overrides
    development: {
      enableDebugOutput: hybridConfig.user.development?.debugOutput || hybridConfig.system.development?.enableDebugOutput || false,
      mockOllamaApi: hybridConfig.system.development?.mockOllamaApi || false,
      skipGpuDetection: hybridConfig.system.development?.skipGpuDetection || false
    },
    
    // Theme configuration with CLI override support (highest priority)
    theme: hybridConfig.cliOverrides.theme || hybridConfig.user.theme || 'auto',
    
    // Source tracking (dummy values for compatibility)
    sources: {
      chunkSize: 'system',
      overlap: 'system', 
      batchSize: hybridConfig.user.performance?.batchSize ? 'user' : 'system',
      modelName: 'system',
      maxConcurrentOperations: hybridConfig.user.performance?.maxConcurrentOperations ? 'user' : 'system',
      fileExtensions: 'system',
      ignorePatterns: 'system',
      debounceDelay: 'system',
      theme: hybridConfig.cliOverrides.theme ? 'cli' : (hybridConfig.rawUserConfig.theme ? 'user' : 'default')
    }
  };
  
  return resolvedConfig;
}

/**
 * Load configuration using DEAD SIMPLE approach
 */
export async function loadHybridConfiguration(folderPath?: string, cliOverrides: any = {}): Promise<HybridConfig> {
  logger.debug('Loading DEAD SIMPLE configuration');
  
  // 1. Load system constants from JSON
  const fileSystem = new NodeFileSystem();
  const systemLoader = new SystemJsonConfigLoader(fileSystem, 'system-configuration.json');
  const systemConfig = await systemLoader.load();
  
  // 2. Load user preferences from YAML
  const fileWriter = new NodeFileWriter();
  const yamlParser = new YamlParser();
  const schemaLoader = new SimpleThemeSchemaLoader();
  const validator = new SimpleSchemaValidator(schemaLoader);
  
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
  
  const config: HybridConfig = {
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