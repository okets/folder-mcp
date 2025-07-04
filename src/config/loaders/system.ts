/**
 * System Configuration Loader
 * 
 * Handles loading configuration from system-wide locations
 * based on the operating system platform
 */

import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { load as loadYaml } from 'js-yaml';
import { platform } from 'os';
import { join } from 'path';
import { LocalConfig } from '../schema.js';
import { createConsoleLogger } from '../../infrastructure/logging/logger.js';

const logger = createConsoleLogger('warn');

/**
 * System configuration paths by platform
 */
export const SYSTEM_CONFIG_PATHS = {
  win32: [
    process.env.PROGRAMDATA ? join(process.env.PROGRAMDATA, 'folder-mcp', 'config.yaml') : 'C:\\ProgramData\\folder-mcp\\config.yaml',
    process.env.PROGRAMDATA ? join(process.env.PROGRAMDATA, 'folder-mcp', 'config.yml') : 'C:\\ProgramData\\folder-mcp\\config.yml'
  ],
  darwin: [
    '/etc/folder-mcp/config.yaml',
    '/etc/folder-mcp/config.yml',
    '/Library/Application Support/folder-mcp/config.yaml',
    '/Library/Application Support/folder-mcp/config.yml'
  ],
  linux: [
    '/etc/folder-mcp/config.yaml',
    '/etc/folder-mcp/config.yml',
    '/etc/folder-mcp.yaml',
    '/etc/folder-mcp.yml'
  ],
  default: [
    '/etc/folder-mcp/config.yaml',
    '/etc/folder-mcp/config.yml'
  ]
};

/**
 * System configuration loader
 */
export class SystemConfigLoader {
  private platformPaths: string[];

  constructor(customPaths?: string[]) {
    const platformKey = platform() as keyof typeof SYSTEM_CONFIG_PATHS;
    this.platformPaths = customPaths || SYSTEM_CONFIG_PATHS[platformKey] || SYSTEM_CONFIG_PATHS.default;
  }

  /**
   * Get the system configuration paths for the current platform
   */
  getSystemPaths(): string[] {
    return this.platformPaths;
  }

  /**
   * Check if a file exists and is readable
   */
  private async isReadable(path: string): Promise<boolean> {
    try {
      await access(path, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load system configuration from the first available path
   */
  async load(): Promise<{ config: Partial<LocalConfig> | null; path?: string }> {
    for (const configPath of this.platformPaths) {
      try {
        if (await this.isReadable(configPath)) {
          const content = await readFile(configPath, 'utf-8');
          const rawConfig = loadYaml(content) as any;
          
          if (!rawConfig || typeof rawConfig !== 'object') {
            logger.warn(`Invalid system configuration file: ${configPath}`);
            continue;
          }
          
          // Transform nested structure to flat LocalConfig structure
          const config = this.transformConfig(rawConfig);
          
          logger.info(`Loaded system configuration from: ${configPath}`);
          return { config, path: configPath };
        }
      } catch (error) {
        logger.debug(`Failed to load system config from ${configPath}:`, { error: String(error) });
      }
    }
    
    return { config: null };
  }

  /**
   * Transform raw configuration to LocalConfig format
   */
  private transformConfig(rawConfig: any): Partial<LocalConfig> {
    const config: Partial<LocalConfig> = {};
    
    // Handle processing section
    if (rawConfig.processing) {
      if (rawConfig.processing.chunkSize !== undefined) config.chunkSize = rawConfig.processing.chunkSize;
      if (rawConfig.processing.overlap !== undefined) config.overlap = rawConfig.processing.overlap;
      if (rawConfig.processing.batchSize !== undefined) config.batchSize = rawConfig.processing.batchSize;
      if (rawConfig.processing.modelName !== undefined) config.modelName = rawConfig.processing.modelName;
      if (rawConfig.processing.maxConcurrentOperations !== undefined) config.maxConcurrentOperations = rawConfig.processing.maxConcurrentOperations;
    }
    
    // Handle files section
    if (rawConfig.files) {
      if (rawConfig.files.extensions) config.fileExtensions = rawConfig.files.extensions;
      if (rawConfig.files.ignorePatterns) config.ignorePatterns = rawConfig.files.ignorePatterns;
    }
    
    // Handle flat properties
    if (rawConfig.chunkSize !== undefined) config.chunkSize = rawConfig.chunkSize;
    if (rawConfig.overlap !== undefined) config.overlap = rawConfig.overlap;
    if (rawConfig.batchSize !== undefined) config.batchSize = rawConfig.batchSize;
    if (rawConfig.modelName !== undefined) config.modelName = rawConfig.modelName;
    if (rawConfig.fileExtensions !== undefined) config.fileExtensions = rawConfig.fileExtensions;
    if (rawConfig.ignorePatterns !== undefined) config.ignorePatterns = rawConfig.ignorePatterns;
    if (rawConfig.development !== undefined) config.development = rawConfig.development;
    
    return config;
  }

  /**
   * Check if running with sufficient permissions for system config
   */
  async hasSystemPermissions(): Promise<boolean> {
    // On Windows, check if running as Administrator
    if (platform() === 'win32') {
      try {
        // Try to access a system path
        const testPath = process.env.PROGRAMDATA || 'C:\\ProgramData';
        await access(testPath, constants.W_OK);
        return true;
      } catch {
        return false;
      }
    }
    
    // On Unix-like systems, check if running as root
    return process.getuid?.() === 0 || false;
  }
}