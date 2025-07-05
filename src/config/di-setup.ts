/**
 * Configuration DI Setup
 * 
 * Registers all configuration-related services with the DI container.
 */

import { IDependencyContainer } from '../di/interfaces.js';
import { CONFIG_TOKENS } from './interfaces.js';
import { ExtendedConfigFactory } from './factory.js';
import { RuntimeConfigCache } from './cache-wrapper.js';
import { ProfileManager } from './profiles.js';
import { SystemConfigLoader } from './loaders/system.js';
import { ConfigurationWatcher } from './watcher.js';
import { enhancedValidator } from './validation/enhanced.js';
import { ConfigurationRegistry } from './registry.js';
import { HotReloadManager } from './hot-reload.js';
import { ConfigurationManager } from './manager.js';
import { SmartDefaultsGenerator } from './defaults/smart.js';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Register configuration services with the DI container
 */
export function registerConfigurationServices(container: IDependencyContainer): void {
  // Register ConfigFactory as singleton
  container.registerSingleton(CONFIG_TOKENS.CONFIG_FACTORY, () => {
    return new ExtendedConfigFactory();
  });

  // Register ConfigCache as singleton
  container.registerSingleton(CONFIG_TOKENS.CONFIG_CACHE, () => {
    return new RuntimeConfigCache();
  });

  // Register ProfileManager as singleton
  container.registerSingleton(CONFIG_TOKENS.PROFILE_MANAGER, () => {
    return new ProfileManager();
  });

  // Register SystemConfigLoader as factory (new instance each time)
  container.registerFactory(CONFIG_TOKENS.SYSTEM_CONFIG_LOADER, () => {
    return new SystemConfigLoader();
  });

  // Register ConfigWatcher factory
  container.registerFactory(CONFIG_TOKENS.CONFIG_WATCHER, () => {
    // Collect all configuration file paths to watch
    const pathsToWatch: string[] = [];
    
    // System config path
    const systemConfigPath = process.platform === 'win32'
      ? (process.env.PROGRAMDATA 
        ? join(process.env.PROGRAMDATA, 'folder-mcp', 'config.yaml')
        : 'C:\\ProgramData\\folder-mcp\\config.yaml')
      : '/etc/folder-mcp/config.yaml';
    pathsToWatch.push(systemConfigPath);
    
    // User config path
    const userConfigPath = join(homedir(), '.folder-mcp', 'config.yaml');
    pathsToWatch.push(userConfigPath);
    
    // Profile directory
    const profilesDir = join(homedir(), '.folder-mcp', 'profiles');
    pathsToWatch.push(profilesDir);

    return new ConfigurationWatcher({
      paths: pathsToWatch,
      debounceDelay: 500,
      ignored: ['*.tmp', '*.swp', '*~']
    });
  });

  // Register EnhancedValidator as singleton
  container.registerSingleton(CONFIG_TOKENS.CONFIG_VALIDATOR, () => {
    return enhancedValidator;
  });

  // Register SmartDefaultsGenerator as singleton
  container.registerSingleton(CONFIG_TOKENS.SMART_DEFAULTS_GENERATOR, () => {
    return new SmartDefaultsGenerator();
  });

  // Register ConfigRegistry as singleton
  container.registerSingleton(CONFIG_TOKENS.CONFIG_REGISTRY, () => {
    return new ConfigurationRegistry();
  });

  // Register HotReloadManager as singleton
  container.registerSingleton(CONFIG_TOKENS.HOT_RELOAD_MANAGER, () => {
    const registry = container.resolve(CONFIG_TOKENS.CONFIG_REGISTRY) as ConfigurationRegistry;
    return new HotReloadManager(registry);
  });

  // Register ConfigurationManager as singleton
  container.registerSingleton(CONFIG_TOKENS.CONFIGURATION_MANAGER, () => {
    const factory = container.resolve(CONFIG_TOKENS.CONFIG_FACTORY);
    const cache = container.resolve(CONFIG_TOKENS.CONFIG_CACHE);
    const profileManager = container.resolve(CONFIG_TOKENS.PROFILE_MANAGER);
    const systemConfigLoader = container.resolve(CONFIG_TOKENS.SYSTEM_CONFIG_LOADER);
    const validator = container.resolve(CONFIG_TOKENS.CONFIG_VALIDATOR);
    const registry = container.resolve(CONFIG_TOKENS.CONFIG_REGISTRY);
    const hotReloadManager = container.resolve(CONFIG_TOKENS.HOT_RELOAD_MANAGER);
    
    // Factory function for creating config watchers
    const configWatcherFactory = () => container.resolve(CONFIG_TOKENS.CONFIG_WATCHER) as any;
    
    return new ConfigurationManager(
      factory as any,
      cache as any,
      profileManager as any,
      systemConfigLoader as any,
      configWatcherFactory,
      validator as any,
      registry as any,
      hotReloadManager as any
    );
  });
}

/**
 * Update the existing IConfigurationService to use the new ConfigurationManager
 */
export function createConfigurationServiceAdapter(configManager: any): any {
  return {
    async resolveConfig(folderPath: string, cliArgs?: any): Promise<any> {
      // Load configuration using the new manager
      await configManager.load();
      return configManager.getConfig();
    },
    
    async generateRuntimeConfig(resolvedConfig: any, toolVersion?: string): Promise<any> {
      // The new system returns resolved config directly
      return resolvedConfig;
    },
    
    validateConfig(config: any): string[] {
      // Use the new validation system
      const validator = configManager.enhancedValidator;
      const report = validator.validate(config);
      return report.results
        .filter((r: any) => r.severity === 'error')
        .map((r: any) => `${r.field}: ${r.message}`);
    },
    
    async getSystemCapabilities(): Promise<any> {
      const smartDefaults = configManager.smartDefaultsGenerator;
      return smartDefaults.detectSystemCapabilities();
    }
  };
}