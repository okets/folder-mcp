/**
 * Configuration Profile Management
 * 
 * Handles profile-based configuration overrides for different environments
 * (development, staging, production, custom profiles)
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { load as loadYaml } from 'js-yaml';
import { homedir } from 'os';
import { LocalConfig } from './schema.js';
import { createConsoleLogger } from '../infrastructure/logging/logger.js';

const logger = createConsoleLogger('warn');

/**
 * Built-in profile definitions
 */
export const BUILT_IN_PROFILES = {
  development: {
    name: 'development',
    description: 'Development environment with debugging enabled',
    defaults: {
      development: {
        enableDebugOutput: true,
        mockOllamaApi: false,
        skipGpuDetection: false
      },
      processing: {
        batchSize: 8,
        maxWorkers: 2
      },
      logging: {
        level: 'debug',
        verbose: true
      }
    }
  },
  staging: {
    name: 'staging',
    description: 'Staging environment with production-like settings',
    defaults: {
      development: {
        enableDebugOutput: false
      },
      processing: {
        batchSize: 16,
        maxWorkers: 4
      },
      logging: {
        level: 'info'
      }
    }
  },
  production: {
    name: 'production',
    description: 'Production environment with optimized settings',
    defaults: {
      development: {
        enableDebugOutput: false
      },
      processing: {
        batchSize: 32,
        maxWorkers: 8
      },
      logging: {
        level: 'warn'
      },
      performance: {
        caching: true,
        optimization: 'aggressive'
      }
    }
  }
};

/**
 * Profile configuration
 */
export interface ProfileConfig extends Partial<LocalConfig> {
  profile: string;
  description?: string;
  extends?: string; // Base profile to extend
}

/**
 * Profile manager for handling configuration profiles
 */
export class ProfileManager {
  private profilesDir: string;
  private cache: Map<string, ProfileConfig> = new Map();

  constructor(profilesDir?: string) {
    this.profilesDir = profilesDir || join(homedir(), '.folder-mcp', 'profiles');
  }

  /**
   * Get the active profile name
   */
  getActiveProfile(): string {
    return process.env.FOLDER_MCP_PROFILE || 'default';
  }

  /**
   * Check if a profile exists
   */
  async exists(profileName: string): Promise<boolean> {
    // Check built-in profiles
    if (profileName in BUILT_IN_PROFILES) {
      return true;
    }

    // Check custom profiles
    try {
      const profilePath = join(this.profilesDir, `${profileName}.yaml`);
      const stats = await stat(profilePath);
      return stats.isFile();
    } catch {
      // Try .yml extension
      try {
        const profilePath = join(this.profilesDir, `${profileName}.yml`);
        const stats = await stat(profilePath);
        return stats.isFile();
      } catch {
        return false;
      }
    }
  }

  /**
   * Load a profile configuration
   */
  async load(profileName: string, visited: Set<string> = new Set()): Promise<ProfileConfig | null> {
    // Return null for default profile
    if (profileName === 'default') {
      return null;
    }

    // Prevent infinite recursion
    if (visited.has(profileName)) {
      logger.warn(`Circular profile extension detected: ${profileName}`);
      return null;
    }

    // Check cache
    if (this.cache.has(profileName)) {
      return this.cache.get(profileName)!;
    }

    // Check built-in profiles
    if (profileName in BUILT_IN_PROFILES) {
      const builtIn = BUILT_IN_PROFILES[profileName as keyof typeof BUILT_IN_PROFILES];
      const profileConfig = this.transformToLocalConfig(builtIn.defaults);
      this.cache.set(profileName, profileConfig);
      return profileConfig;
    }

    // Load custom profile
    try {
      visited.add(profileName);
      const config = await this.loadCustomProfile(profileName, visited);
      if (config) {
        this.cache.set(profileName, config);
        return config;
      }
    } catch (error) {
      logger.error(`Failed to load profile '${profileName}':`, error as Error);
    }

    return null;
  }

  /**
   * Load a custom profile from file
   */
  private async loadCustomProfile(profileName: string, visited: Set<string>): Promise<ProfileConfig | null> {
    // Try .yaml extension first
    let profilePath = join(this.profilesDir, `${profileName}.yaml`);
    let content: string;

    try {
      content = await readFile(profilePath, 'utf-8');
    } catch {
      // Try .yml extension
      profilePath = join(this.profilesDir, `${profileName}.yml`);
      try {
        content = await readFile(profilePath, 'utf-8');
      } catch {
        return null;
      }
    }

    let rawConfig = loadYaml(content) as any;
    if (!rawConfig || typeof rawConfig !== 'object') {
      logger.warn(`Invalid profile configuration: ${profilePath}`);
      return null;
    }

    // Handle profile extension
    if (rawConfig.extends) {
      const baseProfile = await this.load(rawConfig.extends, visited);
      if (baseProfile) {
        // First transform the current raw config to get proper structure
        const currentTransformed = this.transformToLocalConfig(rawConfig);
        // Then merge base with current (current overrides base)
        return this.mergeProfileConfigs(baseProfile, currentTransformed);
      }
    }

    return this.transformToLocalConfig(rawConfig);
  }

  /**
   * List all available profiles
   */
  async listProfiles(): Promise<Array<{ name: string; type: 'built-in' | 'custom'; description?: string }>> {
    const profiles: Array<{ name: string; type: 'built-in' | 'custom'; description?: string }> = [];

    // Add built-in profiles
    for (const [name, profile] of Object.entries(BUILT_IN_PROFILES)) {
      profiles.push({
        name,
        type: 'built-in',
        description: profile.description
      });
    }

    // Add custom profiles
    try {
      const files = await readdir(this.profilesDir);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const name = basename(file, file.endsWith('.yaml') ? '.yaml' : '.yml');
          
          // Skip if it's a built-in profile name
          if (name in BUILT_IN_PROFILES) {
            continue;
          }

          const config = await this.load(name);
          profiles.push({
            name,
            type: 'custom',
            ...(config?.description && { description: config.description })
          });
        }
      }
    } catch (error) {
      // Directory might not exist yet
      logger.debug('Profiles directory not found:', { error: String(error) });
    }

    return profiles;
  }

  /**
   * Validate a profile configuration
   */
  async validate(profileName: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const config = await this.load(profileName);
    if (!config) {
      errors.push(`Profile '${profileName}' not found`);
      return { valid: false, errors };
    }

    // Basic validation - skip name check for built-in profiles
    if (!(profileName in BUILT_IN_PROFILES)) {
      if (config.profile && config.profile !== profileName) {
        errors.push(`Profile name mismatch: expected '${profileName}', got '${config.profile}'`);
      }
    }

    // Validate extends chain
    if (config.extends) {
      if (config.extends === profileName) {
        errors.push('Profile cannot extend itself');
      } else if (!(await this.exists(config.extends))) {
        errors.push(`Extended profile '${config.extends}' does not exist`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Transform nested profile config to flat LocalConfig format
   */
  private transformToLocalConfig(rawConfig: any): ProfileConfig {
    const config: ProfileConfig = {
      profile: rawConfig.profile || 'custom'
    };

    // Copy description if present
    if (rawConfig.description) {
      config.description = rawConfig.description;
    }

    // Copy extends if present
    if (rawConfig.extends) {
      config.extends = rawConfig.extends;
    }

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

    // Handle development section
    if (rawConfig.development) {
      config.development = rawConfig.development;
    }

    // Handle flat properties
    if (rawConfig.chunkSize !== undefined) config.chunkSize = rawConfig.chunkSize;
    if (rawConfig.overlap !== undefined) config.overlap = rawConfig.overlap;
    if (rawConfig.batchSize !== undefined) config.batchSize = rawConfig.batchSize;
    if (rawConfig.modelName !== undefined) config.modelName = rawConfig.modelName;
    if (rawConfig.fileExtensions !== undefined) config.fileExtensions = rawConfig.fileExtensions;
    if (rawConfig.ignorePatterns !== undefined) config.ignorePatterns = rawConfig.ignorePatterns;

    return config;
  }

  /**
   * Merge two profile configurations (ProfileConfig objects)
   */
  private mergeProfileConfigs(base: ProfileConfig, override: ProfileConfig): ProfileConfig {
    const merged: ProfileConfig = { ...base };

    // Merge each property from override into base
    for (const key in override) {
      if (key === 'extends') continue; // Don't copy extends
      
      const overrideValue = override[key as keyof ProfileConfig];
      if (overrideValue !== undefined) {
        if (key === 'development' && typeof overrideValue === 'object' && typeof merged.development === 'object') {
          // Deep merge development object
          merged.development = {
            ...merged.development,
            ...overrideValue as any
          };
        } else {
          // Direct assignment for other properties
          (merged as any)[key] = overrideValue;
        }
      }
    }

    return merged;
  }

  /**
   * Clear the profile cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}