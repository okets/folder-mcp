// Local configuration management for folder-mcp
// Handles .folder-mcp.yaml files in individual folders

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import * as yaml from 'js-yaml';
// No need to import cache functions, we'll use the standard path pattern

// Local configuration interface
export interface LocalConfig {
  // Processing settings
  chunkSize?: number;
  overlap?: number;
  batchSize?: number;
  
  // Model settings
  modelName?: string;
  
  // File filtering
  fileExtensions?: string[];
  ignorePatterns?: string[];
  
  // Advanced settings
  maxConcurrentOperations?: number;
  debounceDelay?: number;
  
  // User preferences (saved from prompts)
  userChoices?: {
    [key: string]: any;
  };
  
  // Metadata
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Default local configuration
export const DEFAULT_LOCAL_CONFIG: LocalConfig = {
  chunkSize: 1000,
  overlap: 200,
  batchSize: 32,
  modelName: "nomic-v1.5",
  fileExtensions: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.folder-mcp/**',
    '**/dist/**',
    '**/build/**',
    '**/.DS_Store',
    '**/Thumbs.db'
  ],
  maxConcurrentOperations: 10,
  debounceDelay: 1000,
  userChoices: {}
};

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
    return { ...DEFAULT_LOCAL_CONFIG };
  }
  
  try {
    const configContent = readFileSync(configPath, 'utf8');
    const loadedConfig = yaml.load(configContent) as LocalConfig;
    
    if (!loadedConfig) {
      console.warn(`⚠️  Empty configuration file at ${configPath}, using defaults`);
      return { ...DEFAULT_LOCAL_CONFIG };
    }
    
    // Merge with defaults to ensure all required fields are present
    const mergedConfig: LocalConfig = {
      ...DEFAULT_LOCAL_CONFIG,
      ...loadedConfig,
      // Merge arrays instead of replacing them
      fileExtensions: loadedConfig.fileExtensions || DEFAULT_LOCAL_CONFIG.fileExtensions,
      ignorePatterns: loadedConfig.ignorePatterns || DEFAULT_LOCAL_CONFIG.ignorePatterns,
      userChoices: {
        ...DEFAULT_LOCAL_CONFIG.userChoices,
        ...(loadedConfig.userChoices || {})
      },
      // Update timestamp
      updatedAt: new Date().toISOString()
    };
    
    return mergedConfig;
  } catch (error) {
    console.warn(`⚠️  Failed to load configuration from ${configPath}:`, error instanceof Error ? error.message : 'Unknown error');
    console.warn('   Using default configuration instead');
    return { ...DEFAULT_LOCAL_CONFIG };
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
  
  const initialConfig = { ...DEFAULT_LOCAL_CONFIG };
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
  const errors: string[] = [];
  
  if (config.chunkSize !== undefined) {
    if (!Number.isInteger(config.chunkSize) || config.chunkSize < 100 || config.chunkSize > 10000) {
      errors.push('chunkSize must be an integer between 100 and 10000');
    }
  }
  
  if (config.overlap !== undefined) {
    if (!Number.isInteger(config.overlap) || config.overlap < 0 || config.overlap >= (config.chunkSize || 1000)) {
      errors.push('overlap must be a non-negative integer less than chunkSize');
    }
  }
  
  if (config.batchSize !== undefined) {
    if (!Number.isInteger(config.batchSize) || config.batchSize < 1 || config.batchSize > 1000) {
      errors.push('batchSize must be an integer between 1 and 1000');
    }
  }
  
  if (config.maxConcurrentOperations !== undefined) {
    if (!Number.isInteger(config.maxConcurrentOperations) || config.maxConcurrentOperations < 1 || config.maxConcurrentOperations > 100) {
      errors.push('maxConcurrentOperations must be an integer between 1 and 100');
    }
  }
  
  if (config.debounceDelay !== undefined) {
    if (!Number.isInteger(config.debounceDelay) || config.debounceDelay < 100 || config.debounceDelay > 60000) {
      errors.push('debounceDelay must be an integer between 100 and 60000 (milliseconds)');
    }
  }
  
  if (config.fileExtensions !== undefined) {
    if (!Array.isArray(config.fileExtensions)) {
      errors.push('fileExtensions must be an array of strings');
    } else {
      const invalidExts = config.fileExtensions.filter(ext => typeof ext !== 'string' || !ext.startsWith('.'));
      if (invalidExts.length > 0) {
        errors.push(`fileExtensions must start with '.': ${invalidExts.join(', ')}`);
      }
    }
  }
  
  if (config.ignorePatterns !== undefined) {
    if (!Array.isArray(config.ignorePatterns)) {
      errors.push('ignorePatterns must be an array of strings');
    } else {
      const invalidPatterns = config.ignorePatterns.filter(pattern => typeof pattern !== 'string');
      if (invalidPatterns.length > 0) {
        errors.push('All ignorePatterns must be strings');
      }
    }
  }
  
  return errors;
}
