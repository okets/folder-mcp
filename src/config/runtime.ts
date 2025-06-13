// Runtime configuration system for folder-mcp
// Handles dynamic configuration generation with system detection and smart defaults

import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { ResolvedConfig, RuntimeConfig } from './schema.js';
import { getSystemCapabilities, SystemCapabilities } from './system.js';
import { ConfigFactory } from './factory.js';
import { validateConfig } from './validation-utils.js';
import { 
  readFromCache, 
  writeToCache, 
  CACHE_KEYS, 
  CacheOptions,
  isCacheKeyValid,
  getCacheMetadata,
  clearCache
} from './cache.js';
import { 
  getProcessingDefaults, 
  getServerDefaults, 
  getUIDefaults, 
  getFileDefaults, 
  getCacheDefaults,
  getTransportDefaults
} from './schema.js';

// Re-export interfaces for backward compatibility  
export { RuntimeConfig } from './schema.js';

/**
 * Default runtime configuration for testing and reference
 * This represents a baseline runtime config with sensible defaults
 */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  system: {
    cpuCores: 4,
    totalMemoryGB: 16,
    availableMemoryGB: 8,
    platform: 'win32' as const,
    hasGPU: false,
    ollamaAvailable: false,
    ollamaModels: [],
    performanceTier: 'medium' as const,
    detectedAt: new Date().toISOString(),
    detectionDuration: 1000
  },
  
  processing: {
    ...getProcessingDefaults()
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
    ...getFileDefaults()
  },
  
  cache: {
    ...getCacheDefaults()
  },
  
  metadata: {
    folderPath: '/example/folder',
    configHash: 'default-config-hash',
    runtimeVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    toolVersion: '1.0.0'
  }
};

/**
 * Generate runtime configuration from resolved configuration and system detection
 * This is the main function that creates a complete runtime config
 */
export async function generateRuntimeConfig(
  folderPath: string,
  resolvedConfig: ResolvedConfig,
  toolVersion: string = '1.0.0'
): Promise<RuntimeConfig> {
  // Use the factory to create runtime config
  return ConfigFactory.createRuntimeConfig(resolvedConfig, toolVersion);
}

/**
 * Cache-enabled runtime configuration generation
 * Loads from cache if valid, otherwise generates fresh configuration
 */
export async function generateCachedRuntimeConfig(
  folderPath: string,
  resolvedConfig: ResolvedConfig,
  toolVersion: string = '1.0.0'
): Promise<RuntimeConfig> {
  const { readFromCache, writeToCache } = await import('./cache.js');
  
  // Generate cache key based on folder path and config hash
  const configHash = generateConfigHash(resolvedConfig);
  const cacheKey = `runtime-${configHash}`;
  
  // Try to load from cache first
  const cachedConfig = readFromCache<RuntimeConfig>(cacheKey, { ttlHours: 24 });
  
  if (cachedConfig) {
    // Update last used timestamp
    const updatedConfig = updateLastUsed(cachedConfig);
    
    // Write back with updated timestamp
    writeToCache(cacheKey, updatedConfig, { ttlHours: 24 });
    
    return updatedConfig;
  }
  
  // Generate fresh configuration
  const freshConfig = await generateRuntimeConfig(folderPath, resolvedConfig, toolVersion);
  
  // Cache the fresh configuration
  writeToCache(cacheKey, freshConfig, { ttlHours: 24 });
  
  return freshConfig;
}

/**
 * System profile caching - separate from runtime config
 * Caches system capabilities detection separately for performance
 */
export async function getCachedSystemCapabilities(): Promise<SystemCapabilities> {
  const { readFromCache, writeToCache } = await import('./cache.js');
  
  const cacheKey = 'system-profile';
  
  // Try to load from cache (shorter TTL for system info)
  const cachedCapabilities = readFromCache<SystemCapabilities>(cacheKey, { ttlHours: 6 });
  
  if (cachedCapabilities) {
    return cachedCapabilities;
  }
  
  // Detect fresh system capabilities
  const freshCapabilities = await getSystemCapabilities();
  
  // Cache for 6 hours (system specs don't change often)
  writeToCache(cacheKey, freshCapabilities, { ttlHours: 6 });
  
  return freshCapabilities;
}

/**
 * Save last runtime configuration for quick access
 * Used for subsequent runs to remember the last working configuration
 */
export async function saveLastRuntimeConfig(config: RuntimeConfig): Promise<void> {
  const { writeToCache } = await import('./cache.js');
  
  // Save as "last runtime" with longer TTL
  writeToCache('last-runtime', config, { ttlHours: 168 }); // 1 week
}

/**
 * Load the last used runtime configuration
 * Returns null if no previous configuration exists or if expired
 */
export async function loadLastRuntimeConfig(): Promise<RuntimeConfig | null> {
  const { readFromCache } = await import('./cache.js');
  
  return readFromCache<RuntimeConfig>('last-runtime', { ttlHours: 168 });
}

/**
 * Clear runtime configuration cache
 * Useful when forcing re-detection or troubleshooting
 */
export async function clearRuntimeCache(): Promise<{ cleared: number; errors: string[] }> {
  const { clearCache, getCacheStats } = await import('./cache.js');
  
  const errors: string[] = [];
  let cleared = 0;
  
  const cacheKeys = ['system-profile', 'last-runtime'];
  
  // Also clear any runtime config caches (they start with 'runtime-')
  try {
    const stats = getCacheStats();
    // This is a simplified approach - in a real implementation we'd scan the directory
    // For now, just clear the known keys
  } catch (error) {
    errors.push(`Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  for (const key of cacheKeys) {
    try {
      if (clearCache(key)) {
        cleared++;
      }
    } catch (error) {
      errors.push(`Failed to clear ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { cleared, errors };
}

/**
 * Optimize processing settings based on system capabilities
 * This function applies smart defaults based on detected hardware
 */
function optimizeProcessingSettings(
  resolvedConfig: ResolvedConfig,
  system: SystemCapabilities
): {
  batchSize: number;
  maxWorkers: number;
  timeoutMs: number;
} {
  // Calculate optimal batch size based on available memory
  let batchSize = resolvedConfig.batchSize;
  
  if (system.availableMemoryGB >= 16) {
    batchSize = Math.max(batchSize, 64); // Large batch for high-memory systems
  } else if (system.availableMemoryGB >= 8) {
    batchSize = Math.max(batchSize, 32); // Medium batch for mid-range systems
  } else {
    batchSize = Math.min(batchSize, 16); // Small batch for low-memory systems
  }
  
  // Calculate optimal worker count based on CPU cores
  // Use 75% of CPU cores, minimum 2, maximum 16
  const maxWorkers = Math.max(2, Math.min(16, Math.floor(system.cpuCores * 0.75)));
  
  // Adjust timeout based on system performance tier
  let timeoutMs = 30000; // Default 30 seconds
  if (system.cpuCores >= 8 && system.availableMemoryGB >= 16) {
    timeoutMs = 60000; // 60 seconds for high-performance systems
  } else if (system.cpuCores <= 2 || system.availableMemoryGB <= 4) {
    timeoutMs = 90000; // 90 seconds for low-performance systems
  }
  
  return {
    batchSize,
    maxWorkers,
    timeoutMs,
  };
}

/**
 * Generate a hash of the resolved configuration for change detection
 * This helps determine when re-indexing is needed
 */
function generateConfigHash(resolvedConfig: ResolvedConfig): string {
  // Include only the parameters that affect embedding generation
  const relevantConfig = {
    modelName: resolvedConfig.modelName,
    chunkSize: resolvedConfig.chunkSize,
    overlap: resolvedConfig.overlap,
    fileExtensions: resolvedConfig.fileExtensions.sort(), // Sort for consistency
  };
  
  const configString = JSON.stringify(relevantConfig);
  return createHash('sha256').update(configString).digest('hex').substring(0, 16);
}

/**
 * Get the path where runtime configurations are cached
 */
export function getRuntimeCachePath(): string {
  return join(homedir(), '.folder-mcp');
}

/**
 * Get the path for a specific runtime configuration file
 */
export function getRuntimeConfigPath(filename: string): string {
  return join(getRuntimeCachePath(), filename);
}

/**
 * Validate a runtime configuration object
 * Returns an array of validation errors, empty if valid
 * For backward compatibility with tests
 */
export function validateRuntimeConfig(config: RuntimeConfig): string[] {
  const result = validateConfig(config, 'runtime');
  return result.errors.map(error => error.message);
}

/**
 * Update the lastUsed timestamp in a runtime configuration
 */
export function updateLastUsed(config: RuntimeConfig): RuntimeConfig {
  return {
    ...config,
    metadata: {
      ...config.metadata,
      lastUsed: new Date().toISOString(),
    },
  };
}

/**
 * Check if runtime configuration needs to be regenerated
 * This happens when the resolved config hash changes
 */
export function needsRegeneration(
  runtimeConfig: RuntimeConfig,
  currentResolvedConfig: ResolvedConfig
): boolean {
  const currentHash = generateConfigHash(currentResolvedConfig);
  return runtimeConfig.metadata.configHash !== currentHash;
}

/**
 * Display runtime configuration summary for debugging
 */
export function displayRuntimeConfigSummary(config: RuntimeConfig): void {
  console.log('🚀 Runtime Configuration Summary:');
  console.log(`   📁 Folder: ${config.metadata.folderPath}`);
  console.log(`   🔧 Config Hash: ${config.metadata.configHash}`);
  console.log(`   📅 Created: ${config.metadata.createdAt ? new Date(config.metadata.createdAt).toLocaleString() : 'Unknown'}`);
  console.log();
  
  console.log('💻 System Capabilities:');
  console.log(`   🖥️  CPU Cores: ${config.system.cpuCores}`);
  console.log(`   🧠 Memory: ${config.system.availableMemoryGB.toFixed(1)}GB available`);
  console.log(`   🚀 GPU: ${config.system.hasGPU ? 'Available' : 'Not available'}`);
  console.log(`   🤖 Ollama: ${config.system.ollamaAvailable ? 'Running' : 'Not running'}`);
  if (config.system.ollamaModels.length > 0) {
    console.log(`   📦 Ollama Models: ${config.system.ollamaModels.slice(0, 3).join(', ')}${config.system.ollamaModels.length > 3 ? '...' : ''}`);
  }
  console.log();
  
  console.log('⚙️ Processing Settings:');
  console.log(`   🤖 Model: ${config.processing.modelName}`);
  console.log(`   📐 Chunk Size: ${config.processing.chunkSize}`);
  console.log(`   🔗 Overlap: ${config.processing.overlap}`);
  console.log(`   📦 Batch Size: ${config.processing.batchSize} (optimized)`);
  console.log(`   👥 Workers: ${config.processing.maxWorkers} (optimized)`);
  console.log(`   ⏱️  Timeout: ${config.processing.timeoutMs}ms`);
  console.log();
  
  console.log('🌐 Server Settings:');
  console.log(`   🔌 Port: ${config.server.port}`);
  console.log(`   🚚 Transport: ${config.server.transport}`);
  console.log(`   🏠 Host: ${config.server.host}`);
  console.log(`   🚀 Auto-start: ${config.server.autoStart ? 'Yes' : 'No'}`);
  console.log();
}

/**
 * Save runtime configuration to cache
 */
export async function saveRuntimeConfig(config: RuntimeConfig): Promise<void> {
  try {
    const cacheOptions: CacheOptions = {
      ttlHours: 168, // 7 days - longer TTL for runtime configs
      validateChecksum: true,
      compress: false // Runtime configs are small, no need to compress
    };
    
    // Update the lastUsed timestamp
    const configToSave = {
      ...config,
      metadata: {
        ...config.metadata,
        lastUsed: new Date().toISOString()
      }
    };
    
    writeToCache(CACHE_KEYS.RUNTIME_CONFIG, configToSave, cacheOptions);
    console.log('💾 Runtime configuration saved to cache');
  } catch (error) {
    console.warn('⚠️ Failed to save runtime configuration to cache:', error);
  }
}

/**
 * Load runtime configuration from cache
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig | null> {
  try {
    const cacheOptions: CacheOptions = {
      ttlHours: 168, // 7 days
      validateChecksum: true
    };
    
    const cachedConfig = readFromCache<RuntimeConfig>(CACHE_KEYS.RUNTIME_CONFIG, cacheOptions);
    
    if (cachedConfig) {
      console.log('📂 Loaded runtime configuration from cache');
      
      // Check if the cached config is still valid
      const metadata = getCacheMetadata(CACHE_KEYS.RUNTIME_CONFIG);
      if (metadata) {
        const cacheAge = Date.now() - new Date(metadata.createdAt).getTime();
        const ageHours = Math.floor(cacheAge / (1000 * 60 * 60));
        console.log(`   📅 Cache age: ${ageHours} hours`);
        
        // If cache is older than 24 hours, suggest refresh
        if (ageHours > 24) {
          console.log('   ⚠️ Configuration cache is older than 24 hours, consider refresh');
        }
      }
      
      return cachedConfig;
    }
    
    console.log('📂 No cached runtime configuration found');
    return null;
  } catch (error) {
    console.warn('⚠️ Failed to load runtime configuration from cache:', error);
    return null;
  }
}

/**
 * Check if runtime configuration needs regeneration
 */
export function shouldRegenerateRuntimeConfig(
  folderPath: string, 
  currentResolvedConfig: ResolvedConfig
): boolean {
  if (!isCacheKeyValid(CACHE_KEYS.RUNTIME_CONFIG)) {
    return true; // No valid cache exists
  }
  
  try {
    const cachedConfig = readFromCache<RuntimeConfig>(CACHE_KEYS.RUNTIME_CONFIG);
    if (!cachedConfig) {
      return true;
    }
    
    // Check if the source configuration has changed
    const currentConfigHash = createHash('sha256')
      .update(JSON.stringify(currentResolvedConfig))
      .digest('hex');
    
    if (cachedConfig.metadata.configHash !== currentConfigHash) {
      console.log('🔄 Configuration changed, runtime config needs regeneration');
      return true;
    }
    
    // Check if folder path changed
    if (cachedConfig.metadata.folderPath !== folderPath) {
      console.log('📁 Folder path changed, runtime config needs regeneration');
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('⚠️ Error checking runtime config regeneration:', error);
    return true; // Regenerate on error
  }
}

/**
 * Clear runtime configuration cache
 */
export function clearRuntimeConfigCache(): boolean {
  try {
    const cleared = clearCache(CACHE_KEYS.RUNTIME_CONFIG);
    if (cleared) {
      console.log('🗑️ Runtime configuration cache cleared');
    }
    return cleared;
  } catch (error) {
    console.warn('⚠️ Failed to clear runtime configuration cache:', error);
    return false;
  }
}
