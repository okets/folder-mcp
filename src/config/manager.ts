/**
 * Configuration Manager
 * 
 * This file re-exports the refactored configuration manager for backward compatibility.
 * The actual implementation is in manager-refactored.ts with proper DI support.
 */

export { 
  ConfigurationManager,
  ConfigPriority,
  ConfigManagerOptions,
  ConfigWatcher
} from './manager-refactored.js';

export type {
  ConfigSourceInfo,
  ConfigChangeEvent
} from './interfaces.js';

// For backward compatibility, provide a factory function
import { getConfigurationManager } from './index.js';

/**
 * @deprecated Use getConfigurationManager() from index.ts instead
 */
export const configManager = {
  load: async () => {
    const manager = getConfigurationManager() as any;
    return await manager.load();
  },
  getConfig: () => {
    const manager = getConfigurationManager() as any;
    return manager.getConfig();
  },
  get: (path: string) => {
    const manager = getConfigurationManager() as any;
    return manager.get(path);
  },
  set: async (path: string, value: any, source?: any) => {
    const manager = getConfigurationManager() as any;
    return await manager.set(path, value, source);
  }
};