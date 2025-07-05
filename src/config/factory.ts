/**
 * Extended Configuration Factory
 * 
 * Extends the base ConfigFactory with additional functionality needed
 * by the ConfigurationManager for loading from files and enhanced merging
 */

import { readFile } from 'fs/promises';
import { load as loadYaml } from 'js-yaml';
import { ConfigFactory } from './factory.js';
import { LocalConfig, ResolvedConfig as BaseResolvedConfig } from './schema.js';
import { ExtendedResolvedConfig } from './types.js';
import { createConsoleLogger } from '../infrastructure/logging/logger.js';
import { smartDefaults } from './defaults/smart.js';

const logger = createConsoleLogger('warn');

/**
 * Extended configuration factory with file loading and enhanced merging
 */
export class ExtendedConfigFactory extends ConfigFactory {
  
  /**
   * Create default configuration
   */
  createDefault(): Partial<LocalConfig> {
    // Get static defaults first
    const staticDefaults = ConfigFactory.createLocalConfig();
    
    // Generate smart defaults based on system capabilities
    const smart = smartDefaults.generate({
      environment: process.env.NODE_ENV as any
    });
    
    // Merge static and smart defaults (smart takes precedence)
    return this.merge(staticDefaults, smart);
  }

  /**
   * Load configuration from a YAML file
   */
  async loadFromFile(filePath: string): Promise<Partial<LocalConfig> | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const rawConfig = loadYaml(content) as any;
      
      if (!rawConfig || typeof rawConfig !== 'object') {
        logger.warn(`Invalid configuration file: ${filePath}`);
        return null;
      }
      
      // Transform nested structure to flat LocalConfig structure
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
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error(`Error loading configuration from ${filePath}:`, error);
      }
      return null;
    }
  }

  /**
   * Deep merge configurations with proper handling of arrays and objects
   */
  merge<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];
        
        if (sourceValue === undefined) {
          continue;
        }
        
        if (sourceValue === null) {
          result[key] = sourceValue as any;
        } else if (Array.isArray(sourceValue)) {
          // For arrays, replace entirely (don't merge)
          result[key] = [...sourceValue] as any;
        } else if (typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          // For objects, deep merge
          if (typeof targetValue === 'object' && !Array.isArray(targetValue) && targetValue !== null) {
            result[key] = this.merge(targetValue as any, sourceValue as any);
          } else {
            result[key] = { ...sourceValue } as any;
          }
        } else {
          // For primitives, simply replace
          result[key] = sourceValue as any;
        }
      }
    }
    
    return result;
  }

  /**
   * Resolve a configuration to its final form
   */
  async resolve(config: Partial<LocalConfig>): Promise<ExtendedResolvedConfig> {
    // Use the static method from ConfigFactory to get base resolved config
    const baseResolved = ConfigFactory.createResolvedConfig(
      '', // folderPath will be set later
      config,
      {} // CLI args will be set later
    );
    
    // Transform to extended format with nested structure
    const extended: ExtendedResolvedConfig = {
      ...baseResolved,
      processing: {
        chunkSize: baseResolved.chunkSize,
        overlap: baseResolved.overlap,
        batchSize: baseResolved.batchSize,
        modelName: baseResolved.modelName,
        maxConcurrentOperations: baseResolved.maxConcurrentOperations,
      },
      files: {
        extensions: baseResolved.fileExtensions,
        ignorePatterns: baseResolved.ignorePatterns,
      },
      ...(config.development && { development: config.development }),
    };
    
    return extended;
  }

  /**
   * Create a configuration checksum for change detection
   */
  createChecksum(config: any): string {
    const { createHash } = require('crypto');
    const normalized = JSON.stringify(config, Object.keys(config).sort());
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Compare two configurations and return the paths that changed
   */
  getChangedPaths(oldConfig: any, newConfig: any, parentPath = ''): string[] {
    const changes: string[] = [];
    
    // Check all keys in both configs
    const allKeys = new Set([
      ...Object.keys(oldConfig || {}),
      ...Object.keys(newConfig || {})
    ]);
    
    for (const key of allKeys) {
      const fullPath = parentPath ? `${parentPath}.${key}` : key;
      const oldValue = oldConfig?.[key];
      const newValue = newConfig?.[key];
      
      if (oldValue === newValue) {
        continue;
      }
      
      if (typeof oldValue === 'object' && typeof newValue === 'object' && 
          !Array.isArray(oldValue) && !Array.isArray(newValue) &&
          oldValue !== null && newValue !== null) {
        // Recursively check nested objects
        changes.push(...this.getChangedPaths(oldValue, newValue, fullPath));
      } else {
        // Value changed
        changes.push(fullPath);
      }
    }
    
    return changes;
  }
}