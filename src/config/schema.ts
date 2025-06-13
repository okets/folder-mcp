// Central configuration schema for folder-mcp
// This file defines all configuration interfaces, validation rules, and defaults
// to eliminate duplication across the configuration system

import { SystemCapabilities } from './system.js';

/**
 * Core configuration sections that are shared across different config types
 */

// Processing configuration (shared across local, resolved, and runtime configs)
export interface ProcessingConfig {
  modelName: string;
  chunkSize: number;
  overlap: number;
  batchSize: number;
  maxWorkers?: number;  // Only in runtime config (system-optimized)
  timeoutMs?: number;   // Only in runtime config
  maxConcurrentOperations?: number; // Only in local/resolved configs
}

// Server configuration (shared across configs)
export interface ServerConfig {
  port: number;
  transport: 'stdio' | 'http';
  autoStart?: boolean;  // Only in runtime config
  host: string;
}

// File processing configuration (shared across configs)
export interface FileConfig {
  extensions: string[];
  ignorePatterns: string[];
  maxFileSize?: number;  // Only in runtime config
  encoding?: string;     // Only in runtime config
}

// UI/UX configuration (only in runtime config)
export interface UIConfig {
  fullScreen: boolean;
  verboseLogging: boolean;
  showProgress: boolean;
  theme: 'light' | 'dark' | 'auto';
  logLevel: 'quiet' | 'normal' | 'verbose';
}

// Transport configuration (only in runtime config)
export interface TransportConfig {
  enabled: boolean;
  activeTransports: ('local' | 'remote' | 'http')[];
  selection: {
    strategy: 'prefer-local' | 'prefer-remote' | 'round-robin' | 'manual';
    fallback: boolean;
    healthCheckInterval: number; // ms
  };
  local: {
    enabled: boolean;
    socketPath: string;
    permissions?: number;
    timeout: number;
    retryAttempts: number;
  };
  remote: {
    enabled: boolean;
    host: string;
    port: number;
    enableTLS: boolean;
    timeout: number;
    retryAttempts: number;
  };
  http: {
    enabled: boolean;
    host: string;
    port: number;
    basePath: string;
    enableHTTPS: boolean;
    corsEnabled: boolean;
    timeout: number;
    retryAttempts: number;
  };
  security: {
    apiKeyEnabled: boolean;
    keyRotationDays?: number;
    requireAuthForRemote: boolean;
    requireAuthForHttp: boolean;
  };
}

// Cache configuration (only in runtime config)
export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  cleanupInterval: number;
  compressionEnabled: boolean;
}

// Configuration metadata (varies by config type)
export interface BaseMetadata {
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RuntimeMetadata extends BaseMetadata {
  folderPath: string;
  configHash: string;
  runtimeVersion: string;
  lastUsed: string;
  toolVersion: string;
}

/**
 * Full configuration type definitions
 */

// Local configuration (.folder-mcp.yaml files)
export interface LocalConfig {
  // Core processing settings
  chunkSize?: number;
  overlap?: number;
  batchSize?: number;
  modelName?: string;
  maxConcurrentOperations?: number;
  debounceDelay?: number;
  
  // File filtering
  fileExtensions?: string[];
  ignorePatterns?: string[];
  
  // User preferences
  userChoices?: Record<string, unknown>;
  
  // Metadata
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

// CLI arguments
export interface CLIArgs {
  chunkSize?: number;
  overlap?: number;
  batchSize?: number;
  modelName?: string;
  fileExtensions?: string[];
  ignorePatterns?: string[];
  maxConcurrentOperations?: number;
  debounceDelay?: number;
  force?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  rebuildIndex?: boolean;
  skipEmbeddings?: boolean;
  results?: number;
  port?: number;
  transport?: string;
}

// Resolved configuration (merged from all sources)
export interface ResolvedConfig {
  folderPath: string;
  chunkSize: number;
  overlap: number;
  batchSize: number;
  modelName: string;
  fileExtensions: string[];
  ignorePatterns: string[];
  maxConcurrentOperations: number;
  debounceDelay: number;
  
  // Source tracking for debugging
  sources: {
    chunkSize: 'cli' | 'local' | 'global';
    overlap: 'cli' | 'local' | 'global';
    batchSize: 'cli' | 'local' | 'global';
    modelName: 'cli' | 'local' | 'global';
    fileExtensions: 'cli' | 'local' | 'global';
    ignorePatterns: 'cli' | 'local' | 'global';
    maxConcurrentOperations: 'cli' | 'local' | 'global';
    debounceDelay: 'cli' | 'local' | 'global';
  };
}

// Runtime configuration (optimized for current system)
export interface RuntimeConfig {
  system: SystemCapabilities;
  processing: {
    modelName: string;
    chunkSize: number;
    overlap: number;
    batchSize: number;
    maxWorkers: number;
    timeoutMs: number;
  };
  server: {
    port: number;
    transport: 'stdio' | 'http';
    autoStart: boolean;
    host: string;
  };
  transport: TransportConfig;
  ui: UIConfig;
  files: {
    extensions: string[];
    ignorePatterns: string[];
    maxFileSize: number;
    encoding: string;
  };
  cache: CacheConfig;
  metadata: RuntimeMetadata;
}

/**
 * Validation rules for configuration fields
 */
export interface ValidationRule {
  field: string;
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  default?: unknown;
  pattern?: RegExp;
  values?: readonly string[];
  message?: string;
  fix?: string;
}

/**
 * Centralized validation rules for all configuration fields
 */
export const VALIDATION_RULES: ValidationRule[] = [
  // Processing rules
  {
    field: 'chunkSize',
    type: 'number',
    min: 200,
    max: 1000,
    default: 400,
    message: 'Chunk size must be between 200 and 1000 tokens',
    fix: 'Set chunkSize to a value between 200 and 1000'
  },
  {
    field: 'overlap',
    type: 'number',
    min: 0,
    max: 50,
    default: 10,
    message: 'Overlap must be between 0 and 50 percent',
    fix: 'Set overlap to a value between 0 and 50'
  },
  {
    field: 'batchSize',
    type: 'number',
    min: 1,
    max: 128,
    default: 32,
    message: 'Batch size must be between 1 and 128',
    fix: 'Set batchSize to a value between 1 and 128'
  },
  {
    field: 'maxWorkers',
    type: 'number',
    min: 1,
    max: 32,
    default: 4,
    message: 'Max workers must be between 1 and 32',
    fix: 'Set maxWorkers to a value between 1 and 32'
  },
  {
    field: 'maxConcurrentOperations',
    type: 'number',
    min: 1,
    max: 100,
    default: 10,
    message: 'Max concurrent operations must be between 1 and 100',
    fix: 'Set maxConcurrentOperations to a value between 1 and 100'
  },
  {
    field: 'timeoutMs',
    type: 'number',
    min: 1000,
    max: 300000,
    default: 30000,
    message: 'Timeout must be between 1 and 300 seconds',
    fix: 'Set timeoutMs to a value between 1000 and 300000'
  },
  {
    field: 'debounceDelay',
    type: 'number',
    min: 100,
    max: 60000,
    default: 1000,
    message: 'Debounce delay must be between 100ms and 60 seconds',
    fix: 'Set debounceDelay to a value between 100 and 60000'
  },
  
  // Server rules
  {
    field: 'port',
    type: 'number',
    min: 1024,
    max: 65535,
    default: 3000,
    message: 'Port must be between 1024 and 65535',
    fix: 'Choose a port between 1024 and 65535'
  },
  {
    field: 'transport',
    type: 'string',
    values: ['stdio', 'http'],
    default: 'stdio',
    message: 'Transport must be either "stdio" or "http"',
    fix: 'Set transport to either "stdio" or "http"'
  },
  {
    field: 'host',
    type: 'string',
    pattern: /^[a-zA-Z0-9.-]+$/,
    default: 'localhost',
    message: 'Host must be a valid hostname or IP address',
    fix: 'Use a valid hostname or IP address'
  },
  
  // File rules
  {
    field: 'fileExtensions',
    type: 'array',
    default: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
    message: 'File extensions must be an array of strings starting with "."',
    fix: 'Specify file extensions as an array, e.g., [".txt", ".pdf"]'
  },
  {
    field: 'maxFileSize',
    type: 'number',
    min: 1024,
    max: 1024 * 1024 * 1024, // 1GB
    default: 100 * 1024 * 1024, // 100MB
    message: 'Max file size must be between 1KB and 1GB',
    fix: 'Set maxFileSize to a value between 1024 and 1073741824 bytes'
  },
  
  // Model rules
  {
    field: 'modelName',
    type: 'string',
    required: true,
    default: 'nomic-v1.5',
    message: 'Model name is required',
    fix: 'Specify a valid embedding model name'
  },
  
  // Cache rules
  {
    field: 'maxSize',
    type: 'number',
    min: 1024 * 1024, // 1MB
    max: 100 * 1024 * 1024 * 1024, // 100GB
    default: 10 * 1024 * 1024 * 1024, // 10GB
    message: 'Cache max size must be between 1MB and 100GB',
    fix: 'Set cache maxSize to a value between 1048576 and 107374182400 bytes'
  },
  {
    field: 'cleanupInterval',
    type: 'number',
    min: 1,
    max: 168, // 1 week
    default: 24,
    message: 'Cache cleanup interval must be between 1 and 168 hours',
    fix: 'Set cleanupInterval to a value between 1 and 168 hours'
  }
];

/**
 * Default configuration values grouped by section
 */
export const DEFAULT_VALUES = {
  processing: {
    modelName: 'nomic-v1.5',
    chunkSize: 400 as number,
    overlap: 10 as number,
    batchSize: 32 as number,
    maxWorkers: 4 as number,
    timeoutMs: 30000 as number,
    maxConcurrentOperations: 10 as number
  },
  
  server: {
    port: 3000 as number,
    transport: 'stdio' as const,
    autoStart: false,
    host: 'localhost'
  },
  
  ui: {
    fullScreen: false,
    verboseLogging: false,
    showProgress: true,
    theme: 'auto' as const,
    logLevel: 'normal' as const
  },
  
  files: {
    extensions: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'] as string[],
    ignorePatterns: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.folder-mcp/**',
      '**/dist/**',
      '**/build/**',
      '**/.DS_Store',
      '**/Thumbs.db'
    ] as string[],
    maxFileSize: 100 * 1024 * 1024 as number, // 100MB
    encoding: 'utf-8'
  },
  
  cache: {
    enabled: true,
    maxSize: 10 * 1024 * 1024 * 1024 as number, // 10GB
    cleanupInterval: 24 as number,
    compressionEnabled: true
  },
  
  transport: {
    enabled: true,
    activeTransports: ['local', 'http'] as ('local' | 'remote' | 'http')[],
    selection: {
      strategy: 'prefer-local' as const,
      fallback: true,
      healthCheckInterval: 30000, // 30 seconds
    },
    local: {
      enabled: true,
      socketPath: process.platform === 'win32' ? '\\\\.\\pipe\\folder-mcp' : '/tmp/folder-mcp.sock',
      ...(process.platform !== 'win32' && { permissions: 0o600 }),
      timeout: 30000,
      retryAttempts: 3,
    },
    remote: {
      enabled: false,
      host: 'localhost',
      port: 50051,
      enableTLS: false,
      timeout: 30000,
      retryAttempts: 3,
    },
    http: {
      enabled: true,
      host: 'localhost',
      port: 8080,
      basePath: '/v1',
      enableHTTPS: false,
      corsEnabled: true,
      timeout: 30000,
      retryAttempts: 3,
    },
    security: {
      apiKeyEnabled: true,
      requireAuthForRemote: true,
      requireAuthForHttp: false, // Not required for localhost
    },
  },
  
  misc: {
    debounceDelay: 1000 as number
  }
};

/**
 * Helper function to get validation rule by field name
 */
export function getValidationRule(field: string): ValidationRule | undefined {
  return VALIDATION_RULES.find(rule => rule.field === field);
}

/**
 * Helper function to get default value for a field
 */
export function getDefaultValue(field: string): unknown {
  const rule = getValidationRule(field);
  return rule?.default;
}

/**
 * Type-safe helper functions to get defaults by section
 */
export function getProcessingDefaults(): typeof DEFAULT_VALUES.processing {
  return { ...DEFAULT_VALUES.processing };
}

export function getServerDefaults(): typeof DEFAULT_VALUES.server {
  return { ...DEFAULT_VALUES.server };
}

export function getUIDefaults(): typeof DEFAULT_VALUES.ui {
  return { ...DEFAULT_VALUES.ui };
}

export function getFileDefaults(): typeof DEFAULT_VALUES.files {
  return { ...DEFAULT_VALUES.files };
}

export function getCacheDefaults(): typeof DEFAULT_VALUES.cache {
  return { ...DEFAULT_VALUES.cache };
}

export function getTransportDefaults(): typeof DEFAULT_VALUES.transport {
  return { ...DEFAULT_VALUES.transport };
}

// Re-export types for backward compatibility
export type { SystemCapabilities } from './system.js';
