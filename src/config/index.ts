/**
 * Configuration module exports
 * 
 * Provides access to configuration services through the DI container.
 */

import { getContainer } from '../di/container.js';
import { CONFIG_TOKENS } from './interfaces.js';

// Export types and interfaces
export * from './schema.js';
export * from './types.js';
export * from './interfaces.js';
export { ConfigPriority, ConfigManagerOptions } from './manager-refactored.js';
export { ProfileConfig } from './profiles.js';
export { ConfigOption } from './registry.js';
export { ValidationReport, ValidationResult } from './validation/enhanced.js';
export { ConfigFileChangeEvent } from './watcher.js';
export { ReloadStrategy } from './hot-reload.js';

// Export configuration tokens
export { CONFIG_TOKENS };

/**
 * Get configuration manager from DI container
 */
export function getConfigurationManager() {
  const container = getContainer();
  if (!container.isRegistered(CONFIG_TOKENS.CONFIGURATION_MANAGER)) {
    throw new Error('Configuration services not registered. Call registerConfigurationServices() first.');
  }
  return container.resolve(CONFIG_TOKENS.CONFIGURATION_MANAGER);
}

/**
 * Get configuration registry from DI container
 */
export function getConfigRegistry() {
  const container = getContainer();
  if (!container.isRegistered(CONFIG_TOKENS.CONFIG_REGISTRY)) {
    throw new Error('Configuration services not registered. Call registerConfigurationServices() first.');
  }
  return container.resolve(CONFIG_TOKENS.CONFIG_REGISTRY);
}

/**
 * Get hot reload manager from DI container
 */
export function getHotReloadManager() {
  const container = getContainer();
  if (!container.isRegistered(CONFIG_TOKENS.HOT_RELOAD_MANAGER)) {
    throw new Error('Configuration services not registered. Call registerConfigurationServices() first.');
  }
  return container.resolve(CONFIG_TOKENS.HOT_RELOAD_MANAGER);
}

/**
 * Enable hot reload in development mode
 */
export function enableHotReloadInDevelopment(): void {
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_HOT_RELOAD === 'true') {
    const hotReloadManager = getHotReloadManager() as any;
    hotReloadManager.enable();
  }
}

// Re-export utility functions
export { validateConfig } from './validator.js';
export { resolveConfig } from './resolver.js';