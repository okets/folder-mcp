// Runtime configuration system for folder-mcp
// Handles dynamic configuration generation with system detection and smart defaults

import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { ResolvedConfig } from './resolver.js';
import { getSystemCapabilities, SystemCapabilities } from './system.js';

/**
 * Runtime configuration interface - contains all parameters needed for execution
 * This differs from ResolvedConfig by including dynamic system-detected values
 */
export interface RuntimeConfig {
  // System capabilities (detected at runtime)
  system: SystemCapabilities;
  
  // Processing runtime settings (derived from ResolvedConfig + system optimization)
  processing: {
    modelName: string;          // Resolved embedding model name
    chunkSize: number;          // Text chunking size
    overlap: number;            // Chunk overlap size
    batchSize: number;          // Embedding batch size (optimized for system)
    maxWorkers: number;         // Parallel workers (based on CPU cores)
    timeoutMs: number;          // Operation timeout
  };
  
  // Server runtime settings
  server: {
    port: number;               // MCP server port
    transport: 'stdio' | 'http'; // Transport protocol
    autoStart: boolean;         // Auto-start server after indexing
    host: string;               // Server host (for HTTP transport)
  };
  
  // UI/UX preferences
  ui: {
    fullScreen: boolean;        // Use full-screen UI
    verboseLogging: boolean;    // Enable verbose output
    showProgress: boolean;      // Show progress bars
    theme: 'light' | 'dark' | 'auto'; // UI theme
    logLevel: 'quiet' | 'normal' | 'verbose'; // Logging verbosity
  };
  
  // File processing settings
  files: {
    extensions: string[];       // Supported file extensions
    ignorePatterns: string[];   // Ignore patterns
    maxFileSize: number;        // Maximum file size in bytes
    encoding: string;           // Default file encoding
  };
  
  // Cache and performance settings
  cache: {
    enabled: boolean;           // Enable caching
    maxSize: number;            // Maximum cache size in bytes
    cleanupInterval: number;    // Cache cleanup interval in hours
    compressionEnabled: boolean; // Enable cache compression
  };
  
  // Runtime metadata
  metadata: {
    folderPath: string;         // Target folder path (absolute)
    configHash: string;         // Hash of source ResolvedConfig for change detection
    runtimeVersion: string;     // Runtime config schema version
    createdAt: string;          // ISO timestamp when generated
    lastUsed: string;           // ISO timestamp when last used
    toolVersion: string;        // folder-mcp tool version
  };
}

/**
 * Default runtime configuration values
 * These are fallback values used when system detection fails
 */
export const DEFAULT_RUNTIME_CONFIG = {
  processing: {
    modelName: 'nomic-v1.5',       // Default model name
    chunkSize: 800,                // Default chunk size
    overlap: 160,                  // Default overlap
    batchSize: 32,
    maxWorkers: 4,
    timeoutMs: 30000,
  },
  
  server: {
    port: 3000,
    transport: 'stdio' as const,
    autoStart: false,
    host: 'localhost',
  },
  
  ui: {
    fullScreen: true,
    verboseLogging: false,
    showProgress: true,
    theme: 'auto' as const,
    logLevel: 'normal' as const,
  },
  
  cache: {
    enabled: true,
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB
    cleanupInterval: 24,
    compressionEnabled: true,
  },
  
  files: {
    extensions: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'], // Default extensions
    ignorePatterns: ['**/node_modules/**', '**/.git/**'],          // Default ignore patterns
    maxFileSize: 100 * 1024 * 1024, // 100MB
    encoding: 'utf-8',
  },
  
  metadata: {
    folderPath: '',                // Will be set at runtime
    configHash: '',                // Will be generated at runtime
    runtimeVersion: '1.0.0',
    createdAt: '',                 // Will be set at runtime
    lastUsed: '',                  // Will be set at runtime
    toolVersion: '1.0.0',          // Will be set at runtime
  },
} as const;

/**
 * Generate runtime configuration from resolved configuration and system detection
 * This is the main function that creates a complete runtime config
 */
export async function generateRuntimeConfig(
  folderPath: string,
  resolvedConfig: ResolvedConfig,
  toolVersion: string = '1.0.0'
): Promise<RuntimeConfig> {
  // Detect system capabilities
  const systemCapabilities = await getSystemCapabilities();
  
  // Generate configuration hash for change detection
  const configHash = generateConfigHash(resolvedConfig);
  
  // Optimize settings based on system capabilities
  const optimizedProcessing = optimizeProcessingSettings(resolvedConfig, systemCapabilities);
  
  // Generate timestamp
  const now = new Date().toISOString();
  
  // Build complete runtime configuration
  const runtimeConfig: RuntimeConfig = {
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
      port: DEFAULT_RUNTIME_CONFIG.server!.port!,
      transport: DEFAULT_RUNTIME_CONFIG.server!.transport!,
      autoStart: DEFAULT_RUNTIME_CONFIG.server!.autoStart!,
      host: DEFAULT_RUNTIME_CONFIG.server!.host!,
    },
    
    ui: {
      fullScreen: DEFAULT_RUNTIME_CONFIG.ui!.fullScreen!,
      verboseLogging: DEFAULT_RUNTIME_CONFIG.ui!.verboseLogging!,
      showProgress: DEFAULT_RUNTIME_CONFIG.ui!.showProgress!,
      theme: DEFAULT_RUNTIME_CONFIG.ui!.theme!,
      logLevel: DEFAULT_RUNTIME_CONFIG.ui!.logLevel!,
    },
    
    files: {
      extensions: resolvedConfig.fileExtensions,
      ignorePatterns: resolvedConfig.ignorePatterns,
      maxFileSize: DEFAULT_RUNTIME_CONFIG.files!.maxFileSize!,
      encoding: DEFAULT_RUNTIME_CONFIG.files!.encoding!,
    },
    
    cache: {
      enabled: DEFAULT_RUNTIME_CONFIG.cache!.enabled!,
      maxSize: DEFAULT_RUNTIME_CONFIG.cache!.maxSize!,
      cleanupInterval: DEFAULT_RUNTIME_CONFIG.cache!.cleanupInterval!,
      compressionEnabled: DEFAULT_RUNTIME_CONFIG.cache!.compressionEnabled!,
    },
    
    metadata: {
      folderPath: resolvedConfig.folderPath || folderPath,
      configHash,
      runtimeVersion: DEFAULT_RUNTIME_CONFIG.metadata!.runtimeVersion!,
      createdAt: now,
      lastUsed: now,
      toolVersion,
    },
  };
  
  return runtimeConfig;
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
 */
export function validateRuntimeConfig(config: RuntimeConfig): string[] {
  const errors: string[] = [];
  
  // Validate processing settings
  if (config.processing.chunkSize < 100 || config.processing.chunkSize > 10000) {
    errors.push('Processing chunk size must be between 100 and 10000');
  }
  
  if (config.processing.overlap < 0 || config.processing.overlap >= config.processing.chunkSize) {
    errors.push('Processing overlap must be non-negative and less than chunk size');
  }
  
  if (config.processing.batchSize < 1 || config.processing.batchSize > 1000) {
    errors.push('Processing batch size must be between 1 and 1000');
  }
  
  if (config.processing.maxWorkers < 1 || config.processing.maxWorkers > 32) {
    errors.push('Processing max workers must be between 1 and 32');
  }
  
  // Validate server settings
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('Server port must be between 1 and 65535');
  }
  
  if (!['stdio', 'http'].includes(config.server.transport)) {
    errors.push('Server transport must be either "stdio" or "http"');
  }
  
  // Validate file settings
  if (config.files.extensions.length === 0) {
    errors.push('At least one file extension must be specified');
  }
  
  const invalidExts = config.files.extensions.filter(ext => !ext.startsWith('.'));
  if (invalidExts.length > 0) {
    errors.push(`File extensions must start with '.': ${invalidExts.join(', ')}`);
  }
  
  if (config.files.maxFileSize < 1024) { // Minimum 1KB
    errors.push('Maximum file size must be at least 1024 bytes');
  }
  
  // Validate cache settings
  if (config.cache.maxSize < 1024 * 1024) { // Minimum 1MB
    errors.push('Cache max size must be at least 1MB');
  }
  
  if (config.cache.cleanupInterval < 1 || config.cache.cleanupInterval > 168) { // 1 hour to 1 week
    errors.push('Cache cleanup interval must be between 1 and 168 hours');
  }
  
  // Validate metadata
  if (!config.metadata.folderPath) {
    errors.push('Folder path must be specified in metadata');
  }
  
  if (!config.metadata.configHash || config.metadata.configHash.length !== 16) {
    errors.push('Config hash must be a 16-character string');
  }
  
  return errors;
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
  console.log(`   📅 Created: ${new Date(config.metadata.createdAt).toLocaleString()}`);
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
