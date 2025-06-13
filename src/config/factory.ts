// Configuration factory system for folder-mcp
// Consolidates configuration creation and eliminates duplication

import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { 
  LocalConfig, 
  CLIArgs, 
  ResolvedConfig, 
  RuntimeConfig,
  DEFAULT_VALUES,
  getProcessingDefaults,
  getServerDefaults,
  getUIDefaults,
  getFileDefaults,
  getCacheDefaults,
  getTransportDefaults
} from './schema.js';
import { validateConfig } from './validation-utils.js';
import { getSystemCapabilities, SystemCapabilities } from './system.js';

/**
 * Configuration factory for creating different types of configurations
 */
export class ConfigFactory {
  
  /**
   * Create a local configuration with defaults
   */
  static createLocalConfig(overrides: Partial<LocalConfig> = {}): LocalConfig {
    const defaults = {
      ...getProcessingDefaults(),
      fileExtensions: [...getFileDefaults().extensions],
      ignorePatterns: [...getFileDefaults().ignorePatterns],
      debounceDelay: DEFAULT_VALUES.misc.debounceDelay,
      userChoices: {},
      version: '1.0.0',
      createdAt: new Date().toISOString()
    };

    const config: LocalConfig = {
      ...defaults,
      ...overrides,
      updatedAt: new Date().toISOString()
    };

    // Validate the created config
    const validation = validateConfig(config, 'local');
    if (!validation.isValid) {
      console.warn('⚠️ Created local config has validation issues:', 
        validation.errors.map(e => e.message).join(', ')
      );
    }

    return validation.config || config;
  }

  /**
   * Create a resolved configuration by merging CLI args, local config, and global defaults
   */
  static createResolvedConfig(
    folderPath: string, 
    localConfig: LocalConfig = {}, 
    cliArgs: CLIArgs = {}
  ): ResolvedConfig {
    // Helper function to resolve a setting with source tracking
    function resolveWithSource<T>(
      cliValue: T | undefined, 
      localValue: T | undefined, 
      globalValue: T
    ): { value: T; source: 'cli' | 'local' | 'global' } {
      if (cliValue !== undefined) {
        return { value: cliValue, source: 'cli' };
      }
      if (localValue !== undefined) {
        return { value: localValue, source: 'local' };
      }
      return { value: globalValue, source: 'global' };
    }

    // Get global defaults
    const globalDefaults = {
      ...getProcessingDefaults(),
      fileExtensions: getFileDefaults().extensions,
      ignorePatterns: getFileDefaults().ignorePatterns,
      debounceDelay: DEFAULT_VALUES.misc.debounceDelay
    };

    // Resolve each setting with source tracking
    const chunkSize = resolveWithSource(
      cliArgs.chunkSize,
      localConfig.chunkSize,
      globalDefaults.chunkSize
    );

    const overlap = resolveWithSource(
      cliArgs.overlap,
      localConfig.overlap,
      globalDefaults.overlap
    );

    const batchSize = resolveWithSource(
      cliArgs.batchSize,
      localConfig.batchSize,
      globalDefaults.batchSize
    );

    const modelName = resolveWithSource(
      cliArgs.modelName,
      localConfig.modelName,
      globalDefaults.modelName
    );

    const fileExtensions = resolveWithSource(
      cliArgs.fileExtensions,
      localConfig.fileExtensions,
      globalDefaults.fileExtensions
    );

    const ignorePatterns = resolveWithSource(
      cliArgs.ignorePatterns,
      localConfig.ignorePatterns,
      globalDefaults.ignorePatterns
    );

    const maxConcurrentOperations = resolveWithSource(
      cliArgs.maxConcurrentOperations,
      localConfig.maxConcurrentOperations,
      globalDefaults.maxConcurrentOperations
    );

    const debounceDelay = resolveWithSource(
      cliArgs.debounceDelay,
      localConfig.debounceDelay,
      globalDefaults.debounceDelay
    );

    const config: ResolvedConfig = {
      folderPath,
      chunkSize: chunkSize.value,
      overlap: overlap.value,
      batchSize: batchSize.value,
      modelName: modelName.value,
      fileExtensions: fileExtensions.value,
      ignorePatterns: ignorePatterns.value,
      maxConcurrentOperations: maxConcurrentOperations.value,
      debounceDelay: debounceDelay.value,
      sources: {
        chunkSize: chunkSize.source,
        overlap: overlap.source,
        batchSize: batchSize.source,
        modelName: modelName.source,
        fileExtensions: fileExtensions.source,
        ignorePatterns: ignorePatterns.source,
        maxConcurrentOperations: maxConcurrentOperations.source,
        debounceDelay: debounceDelay.source
      }
    };

    // Validate the resolved config
    const validation = validateConfig(config, 'resolved');
    if (!validation.isValid) {
      throw new Error(`Invalid resolved configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return validation.config || config;
  }

  /**
   * Create a runtime configuration from resolved config with system optimization
   */
  static async createRuntimeConfig(
    resolvedConfig: ResolvedConfig,
    toolVersion: string = '1.0.0'
  ): Promise<RuntimeConfig> {
    // Detect system capabilities
    const systemCapabilities = await getSystemCapabilities();
    
    // Generate configuration hash for change detection
    const configHash = this.generateConfigHash(resolvedConfig);
    
    // Optimize settings based on system capabilities
    const optimizedProcessing = this.optimizeProcessingSettings(resolvedConfig, systemCapabilities);
    
    // Generate timestamp
    const now = new Date().toISOString();
    
    // Build complete runtime configuration
    const config: RuntimeConfig = {
      system: systemCapabilities,
      
      processing: {
        modelName: resolvedConfig.modelName,
        chunkSize: resolvedConfig.chunkSize,
        overlap: resolvedConfig.overlap,
        batchSize: optimizedProcessing.batchSize,
        maxWorkers: optimizedProcessing.maxWorkers,
        timeoutMs: optimizedProcessing.timeoutMs,
      },
      
      server: {
        ...getServerDefaults()
      },
      
      ui: {
        ...getUIDefaults()
      },
      
      transport: {
        ...getTransportDefaults()
      },
      
      files: {
        extensions: resolvedConfig.fileExtensions,
        ignorePatterns: resolvedConfig.ignorePatterns,
        maxFileSize: getFileDefaults().maxFileSize,
        encoding: getFileDefaults().encoding,
      },
      
      cache: {
        ...getCacheDefaults()
      },
      
      metadata: {
        folderPath: resolvedConfig.folderPath,
        configHash,
        runtimeVersion: '1.0.0',
        createdAt: now,
        lastUsed: now,
        toolVersion,
      },
    };

    // Validate the runtime config
    const validation = validateConfig(config, 'runtime');
    if (!validation.isValid) {
      throw new Error(`Invalid runtime configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return validation.config || config;
  }

  /**
   * Update an existing configuration with new values
   */
  static updateConfig<T extends LocalConfig | ResolvedConfig | RuntimeConfig>(
    config: T,
    updates: Partial<T>
  ): T {
    const updated = {
      ...config,
      ...updates
    };

    // Update timestamps if the config has them
    if ('updatedAt' in updated) {
      (updated as any).updatedAt = new Date().toISOString();
    }
    if ('lastUsed' in updated && 'metadata' in updated) {
      (updated as any).metadata.lastUsed = new Date().toISOString();
    }

    return updated;
  }

  /**
   * Create a configuration template for initialization
   */
  static createConfigTemplate(type: 'local' | 'global' = 'local'): LocalConfig {
    const template = this.createLocalConfig();
    
    // Add helpful comments as userChoices
    template.userChoices = {
      _comments: {
        chunkSize: 'Size of text chunks for processing (200-1000 tokens)',
        overlap: 'Percentage of overlap between chunks (0-50%)',
        batchSize: 'Number of chunks to process in parallel (1-128)',
        modelName: 'Embedding model to use (e.g., nomic-embed-text)',
        fileExtensions: 'File types to process',
        ignorePatterns: 'Glob patterns for files/folders to ignore'
      }
    };

    return template;
  }

  /**
   * Merge multiple configurations with proper precedence
   */
  static mergeConfigs<T extends object>(...configs: Partial<T>[]): T {
    const result = {} as T;
    
    for (const config of configs) {
      if (config) {
        Object.assign(result, config);
      }
    }
    
    return result;
  }

  /**
   * Private helper methods
   */

  /**
   * Generate a hash of the resolved configuration for change detection
   */
  private static generateConfigHash(resolvedConfig: ResolvedConfig): string {
    const hashSource = {
      chunkSize: resolvedConfig.chunkSize,
      overlap: resolvedConfig.overlap,
      modelName: resolvedConfig.modelName,
      fileExtensions: resolvedConfig.fileExtensions.sort(),
      ignorePatterns: resolvedConfig.ignorePatterns.sort()
    };
    
    return createHash('sha256')
      .update(JSON.stringify(hashSource))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Optimize processing settings based on system capabilities
   */
  private static optimizeProcessingSettings(
    resolvedConfig: ResolvedConfig,
    system: SystemCapabilities
  ): {
    batchSize: number;
    maxWorkers: number;
    timeoutMs: number;
  } {
    // Base values from resolved config
    let batchSize = resolvedConfig.batchSize;
    let maxWorkers = DEFAULT_VALUES.processing.maxWorkers;
    let timeoutMs = DEFAULT_VALUES.processing.timeoutMs;

    // Optimize based on available memory
    const memoryGB = system.availableMemoryGB;
    if (memoryGB >= 16) {
      // High-memory system
      batchSize = Math.min(batchSize * 2, 128);
      maxWorkers = Math.min(system.cpuCores, 8);
    } else if (memoryGB >= 8) {
      // Medium-memory system  
      batchSize = Math.min(batchSize * 1.5, 64);
      maxWorkers = Math.min(system.cpuCores, 6);
    } else {
      // Low-memory system - be conservative
      batchSize = Math.min(batchSize, 16);
      maxWorkers = Math.min(system.cpuCores, 4);
    }

    // Optimize based on CPU cores
    maxWorkers = Math.max(1, Math.min(maxWorkers, system.cpuCores));

    // Adjust timeout based on system performance tier
    switch (system.performanceTier) {
      case 'high':
        timeoutMs = 15000;
        break;
      case 'medium':
        timeoutMs = 30000;
        break;
      case 'low':
        timeoutMs = 60000;
        break;
    }

    return { batchSize, maxWorkers, timeoutMs };
  }
}

/**
 * Convenience functions for common operations
 */

/**
 * Create a default local configuration
 */
export function createDefaultLocalConfig(): LocalConfig {
  return ConfigFactory.createLocalConfig();
}

/**
 * Create a resolved configuration from inputs
 */
export function createResolvedConfig(
  folderPath: string, 
  localConfig?: LocalConfig, 
  cliArgs?: CLIArgs
): ResolvedConfig {
  return ConfigFactory.createResolvedConfig(folderPath, localConfig, cliArgs);
}

/**
 * Create a runtime configuration
 */
export async function createRuntimeConfig(
  resolvedConfig: ResolvedConfig,
  toolVersion?: string
): Promise<RuntimeConfig> {
  return ConfigFactory.createRuntimeConfig(resolvedConfig, toolVersion);
}

/**
 * Create configuration from scratch with sensible defaults
 */
export async function createFullConfigurationChain(
  folderPath: string,
  cliArgs: CLIArgs = {},
  localConfigOverrides: Partial<LocalConfig> = {},
  toolVersion: string = '1.0.0'
): Promise<{
  local: LocalConfig;
  resolved: ResolvedConfig;
  runtime: RuntimeConfig;
}> {
  // Create local config with overrides
  const local = ConfigFactory.createLocalConfig(localConfigOverrides);
  
  // Create resolved config from inputs
  const resolved = ConfigFactory.createResolvedConfig(folderPath, local, cliArgs);
  
  // Create runtime config from resolved
  const runtime = await ConfigFactory.createRuntimeConfig(resolved, toolVersion);
  
  return { local, resolved, runtime };
}
