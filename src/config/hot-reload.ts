/**
 * Configuration Hot-Reload System
 * 
 * Provides hot-reload capabilities for configuration changes
 * in development mode. Integrates with the configuration watcher
 * to reload specific components without full restart.
 */

import { EventEmitter } from 'events';
import { ConfigChangeEvent } from './manager.js';
import { configRegistry } from './registry.js';
import { createConsoleLogger } from '../infrastructure/logging/logger.js';

const logger = createConsoleLogger('warn');

/**
 * Reload strategy for a configuration path
 */
export interface ReloadStrategy {
  /**
   * Configuration paths this strategy handles
   */
  paths: string[];

  /**
   * Strategy name
   */
  name: string;

  /**
   * Whether this requires component restart
   */
  requiresRestart: boolean;

  /**
   * Handler function for the reload
   */
  handler: (event: ConfigChangeEvent) => Promise<void>;

  /**
   * Optional validation before reload
   */
  validate?: (event: ConfigChangeEvent) => boolean;
}

/**
 * Component reload callback
 */
export type ReloadCallback = (config: any) => Promise<void>;

/**
 * Hot reload manager
 */
export class HotReloadManager extends EventEmitter {
  private strategies: Map<string, ReloadStrategy> = new Map();
  private components: Map<string, ReloadCallback> = new Map();
  private enabled: boolean = false;
  private reloadInProgress: boolean = false;
  private pendingReloads: Set<string> = new Set();

  constructor() {
    super();
    this.registerBuiltInStrategies();
  }

  /**
   * Enable hot reload
   */
  enable(): void {
    this.enabled = true;
    logger.info('Hot reload enabled');
    this.emit('enabled');
  }

  /**
   * Disable hot reload
   */
  disable(): void {
    this.enabled = false;
    logger.info('Hot reload disabled');
    this.emit('disabled');
  }

  /**
   * Check if hot reload is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register a reload strategy
   */
  registerStrategy(strategy: ReloadStrategy): void {
    for (const path of strategy.paths) {
      this.strategies.set(path, strategy);
      logger.debug('Registered reload strategy:', { path, name: strategy.name });
    }
  }

  /**
   * Register a component for reload
   */
  registerComponent(name: string, callback: ReloadCallback): void {
    this.components.set(name, callback);
    logger.debug('Registered component for reload:', { name });
  }

  /**
   * Handle configuration change
   */
  async handleConfigChange(event: ConfigChangeEvent): Promise<void> {
    if (!this.enabled) {
      logger.debug('Hot reload disabled, ignoring config change');
      return;
    }

    if (this.reloadInProgress) {
      // Queue for later
      event.changedPaths.forEach(path => this.pendingReloads.add(path));
      logger.debug('Reload in progress, queuing changes:', { paths: event.changedPaths });
      return;
    }

    try {
      this.reloadInProgress = true;
      await this.processConfigChange(event);
      
      // Process any pending reloads
      if (this.pendingReloads.size > 0) {
        const pendingPaths = Array.from(this.pendingReloads);
        this.pendingReloads.clear();
        
        await this.processConfigChange({
          ...event,
          changedPaths: pendingPaths
        });
      }
    } finally {
      this.reloadInProgress = false;
    }
  }

  /**
   * Process configuration change
   */
  private async processConfigChange(event: ConfigChangeEvent): Promise<void> {
    const affectedStrategies = new Set<ReloadStrategy>();
    const requiresRestartPaths: string[] = [];

    // Find affected strategies
    for (const path of event.changedPaths) {
      const strategy = this.findStrategyForPath(path);
      if (strategy) {
        if (strategy.validate && !strategy.validate(event)) {
          logger.warn('Reload validation failed for path:', { path, strategy: strategy.name });
          continue;
        }

        affectedStrategies.add(strategy);
        
        if (strategy.requiresRestart) {
          requiresRestartPaths.push(path);
        }
      } else {
        // Check if this option requires restart from registry
        const option = configRegistry.get(path);
        if (option?.requiresRestart) {
          requiresRestartPaths.push(path);
        }
      }
    }

    // Notify about restart-required changes
    if (requiresRestartPaths.length > 0) {
      logger.warn('Configuration changes require restart:', { paths: requiresRestartPaths });
      this.emit('restart-required', { paths: requiresRestartPaths, event });
    }

    // Execute reload strategies
    for (const strategy of affectedStrategies) {
      if (!strategy.requiresRestart) {
        try {
          logger.info(`Executing reload strategy: ${strategy.name}`);
          await strategy.handler(event);
          this.emit('strategy-executed', { strategy: strategy.name, event });
        } catch (error) {
          logger.error(`Reload strategy failed: ${strategy.name}`, error as Error);
          this.emit('strategy-failed', { strategy: strategy.name, error, event });
        }
      }
    }

    // Notify components
    const reloadedComponents: string[] = [];
    for (const [name, callback] of this.components) {
      try {
        await callback(event.newConfig);
        reloadedComponents.push(name);
      } catch (error) {
        logger.error(`Component reload failed: ${name}`, error as Error);
        this.emit('component-failed', { component: name, error, event });
      }
    }

    if (reloadedComponents.length > 0) {
      logger.info('Components reloaded:', { components: reloadedComponents });
      this.emit('components-reloaded', { components: reloadedComponents, event });
    }

    // Emit completion event
    this.emit('reload-complete', {
      strategies: Array.from(affectedStrategies).map(s => s.name),
      components: reloadedComponents,
      requiresRestartPaths,
      event
    });
  }

  /**
   * Find strategy for a configuration path
   */
  private findStrategyForPath(path: string): ReloadStrategy | undefined {
    // Direct match
    let strategy = this.strategies.get(path);
    if (strategy) {
      return strategy;
    }

    // Check if any registered strategy matches this path
    // This handles wildcards registered as "development.*" matching "development.enableDebugOutput"
    for (const [registeredPath, registeredStrategy] of this.strategies) {
      if (registeredPath.endsWith('.*')) {
        const prefix = registeredPath.slice(0, -2); // Remove ".*"
        const matches = path.startsWith(prefix + '.');
        if (matches) {
          return registeredStrategy;
        }
      }
    }

    return undefined;
  }

  /**
   * Register built-in strategies
   */
  private registerBuiltInStrategies(): void {
    // Logging level hot reload
    this.registerStrategy({
      paths: ['logging.level', 'development.enableDebugOutput'],
      name: 'logging',
      requiresRestart: false,
      handler: async (event) => {
        const debugEnabled = event.newConfig.development?.enableDebugOutput;
        logger.info('Reloading logging configuration', { debugEnabled });
        // In a real implementation, this would update the logger
      }
    });

    // Cache settings hot reload
    this.registerStrategy({
      paths: ['cache.enabled', 'cache.cleanupInterval'],
      name: 'cache',
      requiresRestart: false,
      handler: async (event) => {
        logger.info('Reloading cache configuration');
        // In a real implementation, this would update cache settings
      }
    });

    // Processing settings that can be reloaded
    this.registerStrategy({
      paths: ['processing.batchSize', 'processing.maxConcurrentOperations'],
      name: 'processing-runtime',
      requiresRestart: false,
      handler: async (event) => {
        logger.info('Reloading processing runtime configuration');
        // These can be updated without restart
      }
    });

    // File patterns hot reload
    this.registerStrategy({
      paths: ['files.extensions', 'files.ignorePatterns'],
      name: 'file-patterns',
      requiresRestart: false,
      handler: async (event) => {
        logger.info('Reloading file pattern configuration');
        // Update file watchers with new patterns
      },
      validate: (event) => {
        // Validate file extensions format
        const extensions = event.newConfig.files?.extensions;
        if (extensions && Array.isArray(extensions)) {
          return extensions.every(ext => typeof ext === 'string' && ext.startsWith('.'));
        }
        return true;
      }
    });

    // Development mode toggles
    this.registerStrategy({
      paths: ['development.*'],
      name: 'development',
      requiresRestart: false,
      handler: async (event) => {
        logger.info('Reloading development configuration');
        // Toggle development features
      }
    });
  }

  /**
   * Get reload statistics
   */
  getStats(): {
    enabled: boolean;
    strategiesCount: number;
    componentsCount: number;
    pendingReloads: number;
    strategies: string[];
    components: string[];
  } {
    return {
      enabled: this.enabled,
      strategiesCount: this.strategies.size,
      componentsCount: this.components.size,
      pendingReloads: this.pendingReloads.size,
      strategies: Array.from(new Set(Array.from(this.strategies.values()).map(s => s.name))),
      components: Array.from(this.components.keys())
    };
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.strategies.clear();
    this.components.clear();
    this.pendingReloads.clear();
    this.registerBuiltInStrategies();
  }
}

/**
 * Singleton instance
 */
export const hotReloadManager = new HotReloadManager();

/**
 * Development mode helper
 */
export function enableHotReloadInDevelopment(): void {
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_HOT_RELOAD === 'true') {
    hotReloadManager.enable();
    logger.info('Hot reload enabled for development mode');
  }
}