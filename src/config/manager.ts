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
import { SystemConfigLoader } from './loaders/system.js';
import { ProfileManager } from './profiles.js';
import { ConfigurationWatcher, ConfigFileChangeEvent } from './watcher.js';
import { createConsoleLogger } from '../infrastructure/logging/logger.js';
import { homedir } from 'os';
import { join } from 'path';

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
  private profileManager: ProfileManager;
  private sources: Map<ConfigSource, ConfigSourceInfo>;
  private mergedConfig?: ResolvedConfig;
  private watchers: Set<ConfigWatcher>;
  private configWatcher?: ConfigurationWatcher;
  private options: Required<ConfigManagerOptions>;

  constructor(options: ConfigManagerOptions = {}) {
    super();
    
    this.factory = new ExtendedConfigFactory();
    this.cache = new RuntimeConfigCache();
    this.profileManager = new ProfileManager();
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
      // Use SystemConfigLoader for platform-specific paths
      const loader = new SystemConfigLoader(
        this.options.systemConfigPath ? [this.options.systemConfigPath] : undefined
      );
      
      const { config: systemConfig, path } = await loader.load();
      
      if (systemConfig) {
        this.sources.set('system', {
          source: 'system',
          priority: ConfigPriority.SYSTEM,
          ...(path && { path }),
          data: systemConfig,
          loadedAt: new Date()
        });
        logger.info(`Loaded system configuration from: ${path}`);
      } else {
        logger.debug('No system configuration found in platform-specific paths');
      }
    } catch (error) {
      // System config is optional, so we just log and continue
      logger.debug('System configuration loading error:', { error: String(error) });
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

    const profileName = this.profileManager.getActiveProfile();
    if (profileName === 'default') {
      return;
    }

    try {
      const profileConfig = await this.profileManager.load(profileName);
      
      if (profileConfig) {
        // Remove profile metadata before using as config
        const { profile, description, extends: _, ...configData } = profileConfig;
        
        this.sources.set('profile', {
          source: 'profile',
          priority: ConfigPriority.PROFILE,
          data: configData,
          loadedAt: new Date()
        });
        
        logger.info(`Loaded profile configuration: ${profileName}`);
      } else {
        logger.warn(`Profile '${profileName}' not found`);
      }
    } catch (error) {
      logger.warn(`Failed to load profile '${profileName}':`, { error: String(error) });
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
    if (this.options.watchEnabled && this.configWatcher?.isRunning()) {
      return;
    }

    this.options.watchEnabled = true;

    // Collect all configuration file paths to watch
    const pathsToWatch: string[] = [];
    
    // System config path
    if (this.options.systemConfigPath) {
      pathsToWatch.push(this.options.systemConfigPath);
    }
    
    // User config path
    if (this.options.userConfigPath) {
      pathsToWatch.push(this.options.userConfigPath);
    }
    
    // Profile directory
    const profilesDir = join(homedir(), '.folder-mcp', 'profiles');
    pathsToWatch.push(profilesDir);

    // Create and start watcher
    this.configWatcher = new ConfigurationWatcher({
      paths: pathsToWatch,
      debounceDelay: 500,
      ignored: ['*.tmp', '*.swp', '*~']
    });

    // Handle configuration changes
    this.configWatcher.on('change', async (event: ConfigFileChangeEvent) => {
      logger.info('Configuration file changed:', { path: event.path, type: event.type });
      
      try {
        const previousConfig = this.mergedConfig!;
        
        // Clear caches to force reload
        this.profileManager.clearCache();
        if (this.options.cacheEnabled) {
          await this.cache.clear();
        }
        
        // Reload configuration
        await this.load();
        
        // Emit change event
        this.emit('configChanged', {
          previousConfig,
          newConfig: this.mergedConfig!,
          changedPaths: ['*'], // We don't know exactly what changed
          source: 'file-watch'
        } as ConfigChangeEvent);
      } catch (error) {
        logger.error('Failed to reload configuration after file change:', error as Error);
        this.emit('error', error);
      }
    });

    await this.configWatcher.start();
    logger.info('Configuration watching enabled');
  }

  /**
   * Disable configuration watching
   */
  async disableWatch(): Promise<void> {
    this.options.watchEnabled = false;
    
    if (this.configWatcher) {
      await this.configWatcher.stop();
      this.configWatcher = undefined as any;
    }
    
    logger.info('Configuration watching disabled');
  }
}

// Export singleton instance
export const configManager = new ConfigurationManager();