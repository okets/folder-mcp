// Local configuration management for folder-mcp
// Handles .folder-mcp.yaml files in individual folders

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import * as yaml from 'js-yaml';
import { LocalConfig } from './schema.js';
import { validateConfig } from './validation-utils.js';
import { ConfigFactory } from './factory.js';

// Re-export the interface for backward compatibility
export { LocalConfig } from './schema.js';

/**
 * Get the path to the local configuration file for a folder
 */
export function getLocalConfigPath(folderPath: string): string {
  const cacheDir = join(folderPath, '.folder-mcp');
  return join(cacheDir, '.folder-mcp.yaml');
}

/**
 * Load local configuration from a folder
 * Returns merged config with defaults if file doesn't exist
 */
export function loadLocalConfig(folderPath: string): LocalConfig {
  const configPath = getLocalConfigPath(folderPath);
  
  if (!existsSync(configPath)) {
    return ConfigFactory.createLocalConfig();
  }
  
  try {
    const configContent = readFileSync(configPath, 'utf8');
    const loadedConfig = yaml.load(configContent) as LocalConfig;
    
    if (!loadedConfig) {
      console.warn(`⚠️  Empty configuration file at ${configPath}, using defaults`);
      return ConfigFactory.createLocalConfig();
    }
    
    // Use the factory to merge with defaults properly
    const mergedConfig = ConfigFactory.createLocalConfig(loadedConfig);
    
    return mergedConfig;
  } catch (error) {
    console.warn(`⚠️  Failed to load configuration from ${configPath}:`, error instanceof Error ? error.message : 'Unknown error');
    console.warn('   Using default configuration instead');
    return ConfigFactory.createLocalConfig();
  }
}

/**
 * Save local configuration to a folder
 */
export async function saveLocalConfig(folderPath: string, config: LocalConfig): Promise<void> {
  const configPath = getLocalConfigPath(folderPath);
  const cacheDir = dirname(configPath);
  
  // Ensure cache directory exists
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  
  // Add metadata
  const configToSave: LocalConfig = {
    ...config,
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
    createdAt: config.createdAt || new Date().toISOString()
  };
  
  try {
    const yamlContent = yaml.dump(configToSave, {
      indent: 2,
      lineWidth: 100,
      quotingType: '"',
      forceQuotes: false
    });
    
    // Import and use atomic operations for safe config saves
    const { AtomicFileOperations } = await import('../utils/errorRecovery.js');
    await AtomicFileOperations.writeFileAtomic(configPath, yamlContent);
  } catch (error) {
    throw new Error(`Failed to save configuration to ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initialize local configuration for a folder if it doesn't exist
 */
export async function initializeLocalConfig(folderPath: string): Promise<LocalConfig> {
  const configPath = getLocalConfigPath(folderPath);
  
  if (existsSync(configPath)) {
    return loadLocalConfig(folderPath);
  }
  
  const initialConfig = ConfigFactory.createLocalConfig();
  await saveLocalConfig(folderPath, initialConfig);
  
  console.log(`📝 Created local configuration at ${configPath}`);
  return initialConfig;
}

/**
 * Update a specific setting in the local configuration
 */
export async function updateLocalConfig(folderPath: string, updates: Partial<LocalConfig>): Promise<LocalConfig> {
  const currentConfig = loadLocalConfig(folderPath);
  const updatedConfig: LocalConfig = {
    ...currentConfig,
    ...updates,
    // Special handling for nested objects
    userChoices: {
      ...currentConfig.userChoices,
      ...(updates.userChoices || {})
    }
  };
  
  await saveLocalConfig(folderPath, updatedConfig);
  return updatedConfig;
}

/**
 * Save a user choice to the local configuration
 */
export async function saveUserChoice(folderPath: string, key: string, value: any): Promise<void> {
  const currentConfig = loadLocalConfig(folderPath);
  const updatedConfig = {
    ...currentConfig,
    userChoices: {
      ...currentConfig.userChoices,
      [key]: value
    }
  };
  
  await saveLocalConfig(folderPath, updatedConfig);
}

/**
 * Get a user choice from the local configuration
 */
export function getUserChoice(folderPath: string, key: string): any {
  const config = loadLocalConfig(folderPath);
  return config.userChoices?.[key];
}

/**
 * Validate local configuration
 */
export function validateLocalConfig(config: LocalConfig): string[] {
  const result = validateConfig(config, 'local');
  return result.errors.map(error => error.message);
}
