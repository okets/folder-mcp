/**
 * Configuration Manager - Central orchestrator for all configuration sources
 * 
 * This manager handles loading, merging, and managing configurations from multiple sources.
 * Refactored to use dependency injection instead of direct instantiation.
 */

import { EventEmitter } from 'events';
import { LocalConfig, ConfigSource } from './schema.js';
import { ExtendedResolvedConfig } from './types.js';
import { validateConfig } from './validator.js';
import { createConsoleLogger } from '../infrastructure/logging/logger.js';
import { homedir } from 'os';
import { join } from 'path';
import {
  IConfigFactory,
  IConfigCache,
  IProfileManager,
  ISystemConfigLoader,
  IConfigWatcher,
  IConfigValidator,
  IConfigRegistry,
  IHotReloadManager,
  IConfigurationManager,
  ConfigSourceInfo,
  ConfigChangeEvent,
  ConfigOption
} from './interfaces.js';

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
  hotReloadEnabled?: boolean;
}

/**
 * Central configuration manager with dependency injection
 */
export class ConfigurationManager extends EventEmitter implements IConfigurationManager {
  private sources: Map<ConfigSource, ConfigSourceInfo>;
  private mergedConfig?: ResolvedConfig;
  private watchers: Set<ConfigWatcher>;
  private options: Required<ConfigManagerOptions>;
  private configWatcher?: IConfigWatcher;

  constructor(
    private factory: IConfigFactory,
    private cache: IConfigCache,
    private profileManager: IProfileManager,
    private systemConfigLoader: ISystemConfigLoader,
    private configWatcherFactory: () => IConfigWatcher,
    private enhancedValidator: IConfigValidator,
    private configRegistry: IConfigRegistry,
    private hotReloadManager: IHotReloadManager,
    options: ConfigManagerOptions = {}
  ) {
    super();
    
    this.sources = new Map();
    this.watchers = new Set();
    
    this.options = {
      cacheEnabled: options.cacheEnabled ?? true,
      watchEnabled: options.watchEnabled ?? false,
      profilesEnabled: options.profilesEnabled ?? true,
      systemConfigPath: options.systemConfigPath ?? this.getSystemConfigPath(),
      userConfigPath: options.userConfigPath ?? this.getUserConfigPath(),
      hotReloadEnabled: options.hotReloadEnabled ?? false
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
      
      // Basic validation first
      const basicValidation = await validateConfig(merged);
      if (!basicValidation.valid) {
        throw new Error(`Configuration validation failed: ${basicValidation.errors.join(', ')}`);
      }

      // Enhanced validation with warnings
      const enhancedValidation = await this.enhancedValidator.validate(merged);
      if (!enhancedValidation.valid) {
        const errorMessages = enhancedValidation.results
          .filter(r => r.severity === 'error')
          .map(r => `${r.field}: ${r.message}`);
        throw new Error(`Enhanced validation failed: ${errorMessages.join(', ')}`);
      }

      // Log warnings
      if (enhancedValidation.hasWarnings) {
        const warnings = enhancedValidation.results
          .filter(r => r.severity === 'warning')
          .map(r => `${r.field}: ${r.message}`);
        warnings.forEach(warning => logger.warn(warning));
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
   * Get configuration option metadata
   */
  getOptionMetadata(path: string): ConfigOption | undefined {
    return this.configRegistry.get(path);
  }

  /**
   * Search configuration options
   */
  searchOptions(query: string): ConfigOption[] {
    return this.configRegistry.search(query);
  }

  /**
   * Get all configuration options
   */
  getAllOptions(): ConfigOption[] {
    return this.configRegistry.getAll();
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
    const changeEvent: ConfigChangeEvent = {
      previousConfig,
      newConfig: this.mergedConfig!,
      changedPaths: [path],
      source
    };
    
    this.emit('configChanged', changeEvent);
    
    // Trigger hot reload if enabled
    if (this.options.hotReloadEnabled) {
      await this.hotReloadManager.handleConfigChange(changeEvent);
    }
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
      const { config: systemConfig, path } = await this.systemConfigLoader.load();
      
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
    const envConfig: Partial<LocalConfig> = {};
    const prefix = 'FOLDER_MCP_';

    // Process all FOLDER_MCP_* environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix) && value !== undefined) {
        const flatKey = this.envKeyToFlatKey(key.substring(prefix.length));
        const parsedValue = this.parseEnvValue(value);
        
        // Map to flat structure that matches current schema
        if (flatKey) {
          if (flatKey.startsWith('development.')) {
            // Handle nested development settings
            if (!envConfig.development) {
              envConfig.development = {};
            }
            const devKey = flatKey.substring('development.'.length);
            (envConfig.development as any)[devKey] = parsedValue;
          } else {
            (envConfig as any)[flatKey] = parsedValue;
          }
        }
      }
    }

    // Legacy environment variables for backward compatibility
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
   * Convert environment variable key to flat configuration key
   * Maps FOLDER_MCP_* variables to the existing flat configuration structure
   */
  private envKeyToFlatKey(envKey: string): string | null {
    const key = envKey.toLowerCase();
    
    // Map common environment variables to flat config keys
    const mapping: Record<string, string> = {
      // Processing/embedding settings
      'model_name': 'modelName',
      'embeddings_backend': 'modelName',  // backend type maps to model name
      'embeddings_model': 'modelName',
      'chunk_size': 'chunkSize',
      'overlap': 'overlap',
      'batch_size': 'batchSize',
      'processing_batch_size': 'batchSize',
      'max_workers': 'maxWorkers',
      'timeout_ms': 'timeoutMs',
      'max_concurrent_operations': 'maxConcurrentOperations',
      'processing_max_concurrent': 'maxConcurrentOperations',
      
      // File settings
      'file_extensions': 'fileExtensions',
      'ignore_patterns': 'ignorePatterns',
      
      // General settings
      'debounce_delay': 'debounceDelay',
      'version': 'version',
      
      // Development settings (these will be handled specially)
      'development_enabled': 'development.enableDebugOutput',
      'development_debug': 'development.enableDebugOutput',
      'development_mock_ollama': 'development.mockOllamaApi',
      'development_skip_gpu': 'development.skipGpuDetection',
    };
    
    // Check for direct mapping
    if (mapping[key]) {
      return mapping[key];
    }
    
    // Try without prefixes for common patterns
    if (key.startsWith('embeddings_')) {
      const subKey = key.substring('embeddings_'.length);
      if (mapping[subKey]) {
        return mapping[subKey];
      }
    }
    
    if (key.startsWith('processing_')) {
      const subKey = key.substring('processing_'.length);
      if (mapping[subKey]) {
        return mapping[subKey];
      }
    }
    
    if (key.startsWith('files_')) {
      const subKey = key.substring('files_'.length);
      const result = mapping[subKey] || mapping[`file_${subKey}`];
      if (result) {
        return result;
      }
    }
    
    // Return null if no mapping found
    return null;
  }

  /**
   * Convert environment variable key to configuration path (for future nested structure)
   * Examples:
   * - EMBEDDINGS_BACKEND -> embeddings.backend
   * - PROCESSING_BATCH_SIZE -> processing.batchSize
   * - FOLDERS_WATCH_ENABLED -> folders.watchEnabled
   */
  private envKeyToConfigPath(envKey: string): string {
    const parts = envKey.toLowerCase().split('_');
    
    // First part stays as-is for the main section
    const mainSection = parts[0];
    
    // Remaining parts get converted to camelCase as a single property name
    if (parts.length === 1) {
      return mainSection;
    }
    
    const propertyParts = parts.slice(1);
    const camelCaseProperty = propertyParts
      .map((part, index) => {
        return index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('');
    
    return `${mainSection}.${camelCaseProperty}`;
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private parseEnvValue(value: string): any {
    // Handle JSON values (for arrays and objects)
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value; // Fall back to string if invalid JSON
      }
    }

    // Handle boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Handle numeric values
    if (/^\d+$/.test(value)) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) return num;
    }

    if (/^\d*\.\d+$/.test(value)) {
      const num = parseFloat(value);
      if (!isNaN(num)) return num;
    }

    // Return as string for everything else
    return value;
  }

  /**
   * Set nested value in configuration object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    let current = obj;
    for (const key of keys) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
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

    // Create watcher from factory
    this.configWatcher = this.configWatcherFactory();

    // Handle configuration changes
    this.configWatcher.on('change', async (event: any) => {
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
        const changeEvent: ConfigChangeEvent = {
          previousConfig,
          newConfig: this.mergedConfig!,
          changedPaths: ['*'], // We don't know exactly what changed
          source: 'file-watch'
        };
        
        this.emit('configChanged', changeEvent);
        
        // Trigger hot reload if enabled
        if (this.options.hotReloadEnabled) {
          await this.hotReloadManager.handleConfigChange(changeEvent);
        }
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
      this.configWatcher = undefined;
    }
    
    logger.info('Configuration watching disabled');
  }

  /**
   * Enable hot reload
   */
  enableHotReload(): void {
    this.options.hotReloadEnabled = true;
    this.hotReloadManager.enable();
    logger.info('Hot reload enabled');
  }

  /**
   * Disable hot reload
   */
  disableHotReload(): void {
    this.options.hotReloadEnabled = false;
    this.hotReloadManager.disable();
    logger.info('Hot reload disabled');
  }

  /**
   * Check if hot reload is enabled
   */
  isHotReloadEnabled(): boolean {
    return this.options.hotReloadEnabled && this.hotReloadManager.isEnabled();
  }

  /**
   * Register a component for hot reload
   */
  registerHotReloadComponent(name: string, callback: (config: any) => Promise<void>): void {
    this.hotReloadManager.registerComponent(name, callback);
  }

  /**
   * Get hot reload statistics
   */
  getHotReloadStats() {
    return this.hotReloadManager.getStats();
  }
}