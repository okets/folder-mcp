/**
 * Configuration Interfaces
 * 
 * Defines interfaces for configuration services to enable proper
 * dependency injection and module boundaries.
 */

import { EventEmitter } from 'events';
import { LocalConfig, ResolvedConfig } from './schema.js';
import { ConfigSource } from './schema.js';
import { ValidationReport } from './validation/enhanced.js';
import { ProfileConfig } from './profiles.js';
import { ConfigOption } from './registry.js';
import { SystemCapabilities } from './system.js';

/**
 * Configuration source metadata
 */
export interface ConfigSourceInfo {
  source: ConfigSource;
  priority: number;
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
 * Configuration factory interface
 */
export interface IConfigFactory {
  createDefault(): LocalConfig;
  merge(...configs: Partial<LocalConfig>[]): LocalConfig;
  resolve(config: LocalConfig): Promise<ResolvedConfig>;
  loadFromFile(path: string): Promise<LocalConfig | null>;
  loadFromYaml(content: string, path?: string): LocalConfig;
}

/**
 * Configuration cache interface
 */
export interface IConfigCache {
  get(key: string): any;
  set(key: string, value: any): Promise<void>;
  has(key: string): boolean;
  clear(): Promise<void>;
}

/**
 * Profile manager interface
 */
export interface IProfileManager {
  load(profileName: string): Promise<ProfileConfig | null>;
  save(profileName: string, config: ProfileConfig): Promise<void>;
  list(): Promise<string[]>;
  getActiveProfile(): string;
  setActiveProfile(profileName: string): void;
  clearCache(): void;
}

/**
 * System config loader interface
 */
export interface ISystemConfigLoader {
  load(): Promise<{ config: LocalConfig | null; path?: string }>;
}

/**
 * Configuration watcher interface
 */
export interface IConfigWatcher {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  on(event: string, listener: Function): void;
  removeAllListeners(): void;
}

/**
 * Configuration validator interface
 */
export interface IConfigValidator {
  validate(config: any, context?: any): Promise<ValidationReport>;
  addRule(rule: any): void;
  removeRule(name: string): void;
}

/**
 * Smart defaults generator interface
 */
export interface ISmartDefaultsGenerator {
  generate(options?: any): LocalConfig;
  detectSystemCapabilities(): SystemCapabilities;
}

/**
 * Configuration registry interface
 */
export interface IConfigRegistry {
  register(option: ConfigOption): void;
  get(path: string): ConfigOption | undefined;
  getAll(): ConfigOption[];
  search(query: string): ConfigOption[];
  getByCategory(category: string): ConfigOption[];
  getByTag(tag: string): ConfigOption[];
  generateDocumentation(format?: 'markdown' | 'json'): string;
}

/**
 * Hot reload strategy
 */
export interface IReloadStrategy {
  paths: string[];
  name: string;
  requiresRestart: boolean;
  handler: (event: ConfigChangeEvent) => Promise<void>;
  validate?: (event: ConfigChangeEvent) => boolean;
}

/**
 * Hot reload manager interface
 */
export interface IHotReloadManager {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  registerStrategy(strategy: IReloadStrategy): void;
  registerComponent(name: string, callback: (config: any) => Promise<void>): void;
  handleConfigChange(event: ConfigChangeEvent): Promise<void>;
  getStats(): any;
  clear(): void;
}

/**
 * Configuration manager interface
 */
export interface IConfigurationManager extends EventEmitter {
  load(): Promise<ResolvedConfig>;
  getConfig(): ResolvedConfig;
  get<T = any>(path: string): T | undefined;
  set(path: string, value: any, source?: ConfigSource): Promise<void>;
  getSources(): ConfigSourceInfo[];
  getSourceForPath(path: string): ConfigSource | undefined;
  getOptionMetadata(path: string): ConfigOption | undefined;
  searchOptions(query: string): ConfigOption[];
  getAllOptions(): ConfigOption[];
  enableWatch(): Promise<void>;
  disableWatch(): Promise<void>;
  enableHotReload(): void;
  disableHotReload(): void;
  isHotReloadEnabled(): boolean;
  registerHotReloadComponent(name: string, callback: (config: any) => Promise<void>): void;
  getHotReloadStats(): any;
}

/**
 * Configuration service tokens for DI
 */
export const CONFIG_TOKENS = {
  CONFIGURATION_MANAGER: Symbol('ConfigurationManager'),
  CONFIG_FACTORY: Symbol('ConfigFactory'),
  CONFIG_CACHE: Symbol('ConfigCache'),
  PROFILE_MANAGER: Symbol('ProfileManager'),
  SYSTEM_CONFIG_LOADER: Symbol('SystemConfigLoader'),
  CONFIG_WATCHER: Symbol('ConfigWatcher'),
  CONFIG_VALIDATOR: Symbol('ConfigValidator'),
  SMART_DEFAULTS_GENERATOR: Symbol('SmartDefaultsGenerator'),
  CONFIG_REGISTRY: Symbol('ConfigRegistry'),
  HOT_RELOAD_MANAGER: Symbol('HotReloadManager'),
} as const;