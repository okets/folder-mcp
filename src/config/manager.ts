/**
 * Configuration Manager - Central orchestrator for all configuration sources
 * 
 * This manager handles loading, merging, and managing configurations from multiple sources:
 * - Defaults (built-in)
 * - System (/etc/folder-mcp/config.yaml)
 * - User (~/.folder-mcp/config.yaml)
 * - Environment variables (FOLDER_MCP_*)
 * - Runtime (CLI args, API calls)
 */

import { EventEmitter } from 'events';
import { ExtendedConfigFactory } from './factory-extended.js';
import { LocalConfig, ConfigSource } from './schema.js';
import { ExtendedResolvedConfig } from './types.js';
import { validateConfig } from './validator.js';
import { RuntimeConfigCache } from './cache-wrapper.js';
import { createConsoleLogger } from '../infrastructure/logging/logger.js';

const logger = createConsoleLogger('warn');

// Use ExtendedResolvedConfig as our ResolvedConfig
type ResolvedConfig = ExtendedResolvedConfig;

/**
 * Configuration source priority (lower number = lower priority)
 */
export enum ConfigPriority {
  DEFAULT = 0,
  SYSTEM = 1,
  USER = 2,
  PROFILE = 3,
  ENVIRONMENT = 4,
  RUNTIME = 5
}

/**
 * Configuration source metadata
 */
export interface ConfigSourceInfo {
  source: ConfigSource;
  priority: ConfigPriority;
  path?: string;
  data: Partial<LocalConfig>;
  loadedAt: Date;
}

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  previousConfig: ResolvedConfig;
  newConfig: ResolvedConfig;
  changedPaths: string[];
  source: ConfigSource;
}

/**
 * Configuration watcher interface
 */
export interface ConfigWatcher {
  path: string;
  callback: (event: ConfigChangeEvent) => void;
}

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions {
  cacheEnabled?: boolean;
  watchEnabled?: boolean;
  profilesEnabled?: boolean;
  systemConfigPath?: string;
  userConfigPath?: string;
}

/**
 * Central configuration manager
 */
export class ConfigurationManager extends EventEmitter {
  private factory: ExtendedConfigFactory;
  private cache: RuntimeConfigCache;
  private sources: Map<ConfigSource, ConfigSourceInfo>;
  private mergedConfig?: ResolvedConfig;
  private watchers: Set<ConfigWatcher>;
  private options: Required<ConfigManagerOptions>;

  constructor(options: ConfigManagerOptions = {}) {
    super();
    
    this.factory = new ExtendedConfigFactory();
    this.cache = new RuntimeConfigCache();
    this.sources = new Map();
    this.watchers = new Set();
    
    this.options = {
      cacheEnabled: options.cacheEnabled ?? true,
      watchEnabled: options.watchEnabled ?? false,
      profilesEnabled: options.profilesEnabled ?? true,
      systemConfigPath: options.systemConfigPath ?? this.getSystemConfigPath(),
      userConfigPath: options.userConfigPath ?? this.getUserConfigPath()
    };
  }

  /**
   * Load configuration from all sources
   */
  async load(): Promise<ResolvedConfig> {
    try {
      // Preserve runtime source if it exists
      const runtimeSource = this.sources.get('runtime');
      
      // Clear previous sources
      this.sources.clear();
      
      // Restore runtime source if it existed
      if (runtimeSource) {
        this.sources.set('runtime', runtimeSource);
      }

      // Load from all sources in priority order
      await this.loadDefaults();
      await this.loadSystemConfig();
      await this.loadUserConfig();
      await this.loadProfileConfig();
      await this.loadEnvironmentConfig();
      await this.loadRuntimeConfig();

      // Merge all configurations
      const merged = await this.mergeConfigurations();
      
      // Validate the merged configuration
      const validation = await validateConfig(merged);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Cache the result if enabled
      if (this.options.cacheEnabled) {
        await this.cache.set('merged-config', merged);
      }

      this.mergedConfig = merged;
      return merged;

    } catch (error) {
      logger.error('Failed to load configuration:', error as Error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ResolvedConfig {
    if (!this.mergedConfig) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.mergedConfig;
  }

  /**
   * Get configuration value by path (dot notation)
   */
  get<T = any>(path: string): T | undefined {
    const config = this.getConfig();
    return path.split('.').reduce((obj: any, key) => obj?.[key], config) as T;
  }

  /**
   * Set configuration value at runtime
   */
  async set(path: string, value: any, source: ConfigSource = 'runtime'): Promise<void> {
    // Map nested paths to flat config structure
    let flatPath = path;
    let flatValue = value;
    
    // Transform processing.* paths to flat structure
    if (path.startsWith('processing.')) {
      const subPath = path.substring('processing.'.length);
      flatPath = subPath;
    } else if (path.startsWith('files.')) {
      const subPath = path.substring('files.'.length);
      if (subPath === 'extensions') flatPath = 'fileExtensions';
      else if (subPath === 'ignorePatterns') flatPath = 'ignorePatterns';
    }
    
    // Get or create runtime source
    let runtimeSource = this.sources.get(source);
    if (!runtimeSource) {
      runtimeSource = {
        source,
        priority: ConfigPriority.RUNTIME,
        data: {},
        loadedAt: new Date()
      };
      this.sources.set(source, runtimeSource);
    }

    // Set the value in the runtime config (flat structure)
    const keys = flatPath.split('.');
    const lastKey = keys.pop()!;
    
    let current: any = runtimeSource.data;
    for (const key of keys) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    current[lastKey] = flatValue;

    // Reload configuration
    const previousConfig = this.mergedConfig!;
    await this.load();

    // Emit change event
    this.emit('configChanged', {
      previousConfig,
      newConfig: this.mergedConfig!,
      changedPaths: [path],
      source
    } as ConfigChangeEvent);
  }

  /**
   * Get configuration sources info
   */
  getSources(): ConfigSourceInfo[] {
    return Array.from(this.sources.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get source for a specific configuration path
   */
  getSourceForPath(path: string): ConfigSource | undefined {
    const sources = this.getSources().reverse(); // Check highest priority first
    
    // Transform nested path to flat path
    let flatPath = path;
    if (path.startsWith('processing.')) {
      flatPath = path.substring('processing.'.length);
    } else if (path.startsWith('files.')) {
      const subPath = path.substring('files.'.length);
      if (subPath === 'extensions') flatPath = 'fileExtensions';
      else if (subPath === 'ignorePatterns') flatPath = 'ignorePatterns';
      else flatPath = subPath;
    }
    
    for (const source of sources) {
      const value = flatPath.split('.').reduce((obj: any, key) => obj?.[key], source.data);
      if (value !== undefined) {
        return source.source;
      }
    }
    
    return undefined;
  }

  /**
   * Load default configuration
   */
  private async loadDefaults(): Promise<void> {
    const defaults = this.factory.createDefault();
    
    this.sources.set('default', {
      source: 'default',
      priority: ConfigPriority.DEFAULT,
      data: defaults,
      loadedAt: new Date()
    });
  }

  /**
   * Load system configuration
   */
  private async loadSystemConfig(): Promise<void> {
    try {
      const systemConfig = await this.factory.loadFromFile(this.options.systemConfigPath);
      if (systemConfig) {
        this.sources.set('system', {
          source: 'system',
          priority: ConfigPriority.SYSTEM,
          path: this.options.systemConfigPath,
          data: systemConfig,
          loadedAt: new Date()
        });
      }
    } catch (error) {
      // System config is optional, so we just log and continue
      logger.debug('System configuration not found or not accessible:', { error: String(error) });
    }
  }

  /**
   * Load user configuration
   */
  private async loadUserConfig(): Promise<void> {
    try {
      const userConfig = await this.factory.loadFromFile(this.options.userConfigPath);
      if (userConfig) {
        this.sources.set('user', {
          source: 'user',
          priority: ConfigPriority.USER,
          path: this.options.userConfigPath,
          data: userConfig,
          loadedAt: new Date()
        });
      }
    } catch (error) {
      logger.debug('User configuration not found:', { error: String(error) });
    }
  }

  /**
   * Load profile configuration
   */
  private async loadProfileConfig(): Promise<void> {
    if (!this.options.profilesEnabled) {
      return;
    }

    const profile = process.env.FOLDER_MCP_PROFILE || 'default';
    if (profile === 'default') {
      return;
    }

    try {
      const profilePath = `${this.options.userConfigPath.replace('.yaml', '')}/profiles/${profile}.yaml`;
      const profileConfig = await this.factory.loadFromFile(profilePath);
      
      if (profileConfig) {
        this.sources.set('profile', {
          source: 'profile',
          priority: ConfigPriority.PROFILE,
          path: profilePath,
          data: profileConfig,
          loadedAt: new Date()
        });
      }
    } catch (error) {
      logger.warn(`Profile '${profile}' not found:`, { error: String(error) });
    }
  }

  /**
   * Load environment configuration
   */
  private async loadEnvironmentConfig(): Promise<void> {
    // This will be implemented in Task 4
    // For now, just check for the existing environment variables
    const envConfig: Partial<LocalConfig> = {};

    if (process.env.ENABLE_ENHANCED_MCP_FEATURES) {
      envConfig.development = {
        enableDebugOutput: process.env.ENABLE_ENHANCED_MCP_FEATURES === 'true'
      };
    }

    if (Object.keys(envConfig).length > 0) {
      this.sources.set('environment', {
        source: 'environment',
        priority: ConfigPriority.ENVIRONMENT,
        data: envConfig,
        loadedAt: new Date()
      });
    }
  }

  /**
   * Load runtime configuration
   */
  private async loadRuntimeConfig(): Promise<void> {
    // Runtime config is set via the set() method
    // This is a placeholder for any initialization needed
  }

  /**
   * Merge all configurations based on priority
   */
  private async mergeConfigurations(): Promise<ResolvedConfig> {
    const sortedSources = Array.from(this.sources.values())
      .sort((a, b) => a.priority - b.priority);

    let merged = {} as any;

    for (const source of sortedSources) {
      merged = this.factory.merge(merged, source.data);
    }

    // Convert to ResolvedConfig
    const resolved = await this.factory.resolve(merged);
    return resolved;
  }

  /**
   * Get system configuration path based on platform
   */
  private getSystemConfigPath(): string {
    if (process.platform === 'win32') {
      return process.env.PROGRAMDATA 
        ? `${process.env.PROGRAMDATA}\\folder-mcp\\config.yaml`
        : 'C:\\ProgramData\\folder-mcp\\config.yaml';
    }
    return '/etc/folder-mcp/config.yaml';
  }

  /**
   * Get user configuration path
   */
  private getUserConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    return `${homeDir}/.folder-mcp/config.yaml`;
  }

  /**
   * Enable configuration watching
   */
  async enableWatch(): Promise<void> {
    this.options.watchEnabled = true;
    // Watcher implementation will be added in Task 1.4
  }

  /**
   * Disable configuration watching
   */
  async disableWatch(): Promise<void> {
    this.options.watchEnabled = false;
    // Watcher cleanup will be added in Task 1.4
  }
}

// Export singleton instance
export const configManager = new ConfigurationManager();