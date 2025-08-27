/**
 * Folder Configuration Schema
 * 
 * Defines the configuration structure for multi-folder support.
 * This schema drives how the MCP server handles multiple folders
 * with per-folder customization and intelligent defaults.
 */

/**
 * Individual folder configuration
 */
export interface FolderConfig {
  /** Folder path (supports ~ expansion) */
  path: string;
  /** Model name for this folder */
  model: string;
  /** Folder-specific exclude patterns */
  exclude?: string[];
  /** Folder-specific performance settings */
  performance?: {
    /** Batch size for this folder */
    batchSize?: number;
    /** Maximum concurrency for this folder */
    maxConcurrency?: number;
  };
}

/**
 * Folder defaults configuration
 */
export interface FolderDefaultsConfig {
  /** Default exclude patterns for all folders */
  exclude?: string[];
  /** Default embeddings configuration */
  embeddings?: {
    /** Default embedding backend */
    backend?: 'ollama' | 'direct' | 'auto';
    /** Default model name */
    model?: string;
  };
  /** Default performance configuration */
  performance?: {
    /** Default batch size */
    batchSize?: number;
    /** Default max concurrency */
    maxConcurrency?: number;
  };
}

/**
 * Main folders configuration interface
 */
export interface FoldersConfig {
  /** Default settings applied to all folders */
  defaults?: FolderDefaultsConfig;
  /** List of configured folders */
  list: FolderConfig[];
}

/**
 * Default folder configuration with sensible defaults
 */
export const DEFAULT_FOLDERS_CONFIG: FoldersConfig = {
  defaults: {
    exclude: [
      'node_modules',
      '.git',
      '.folder-mcp',
      'dist',
      'build',
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.log',
      'venv',
      '.venv',
      'env',
      '.env',
      'site-packages',
      '__pycache__',
      '*.pyc'
    ],
    embeddings: {
      backend: 'auto', // Let system detect best backend
      // model is undefined by default, uses global setting
    },
    performance: {
      batchSize: 32,     // Reasonable default for most systems
      maxConcurrency: 4  // Conservative default
    }
  },
  list: [] // No folders by default - user must configure
};

/**
 * Validation rules for folder configuration
 */
export interface FolderConfigValidation {
  /** Valid embedding backends */
  validBackends: string[];
  /** Maximum number of folders */
  maxFolders: number;
  /** Maximum batch size per folder */
  maxBatchSize: number;
  /** Maximum concurrency per folder */
  maxConcurrency: number;
  /** Forbidden folder paths */
  forbiddenPaths: string[];
}

/**
 * Default validation rules
 */
export const DEFAULT_FOLDER_VALIDATION: FolderConfigValidation = {
  validBackends: ['ollama', 'direct', 'auto'],
  maxFolders: 20,        // Reasonable limit to prevent resource exhaustion
  maxBatchSize: 128,     // Prevent memory issues
  maxConcurrency: 16,    // Prevent too many concurrent operations
  forbiddenPaths: [
    '/',           // Root directory
    '/etc',        // System directories
    '/usr',
    '/var',
    '/sys',
    '/proc',
    '/dev',
    'C:\\',        // Windows system directories
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)'
  ]
};

/**
 * Folder configuration merge strategy
 * Defines how folder-specific settings override defaults
 */
export interface FolderMergeStrategy {
  /** How to merge exclude patterns */
  excludeMode: 'replace' | 'append' | 'merge';
  /** How to merge embeddings settings */
  embeddingsMode: 'replace' | 'merge';
  /** How to merge performance settings */
  performanceMode: 'replace' | 'merge';
}

/**
 * Default merge strategy - prefer merging to preserve functionality
 */
export const DEFAULT_MERGE_STRATEGY: FolderMergeStrategy = {
  excludeMode: 'append',      // Add folder excludes to defaults
  embeddingsMode: 'merge',    // Merge embedding settings
  performanceMode: 'merge'    // Merge performance settings
};

/**
 * Resolved folder configuration after applying defaults and validation
 */
export interface ResolvedFolderConfig extends Required<FolderConfig> {
  /** Resolved absolute path */
  resolvedPath: string;
  /** Source of each setting for debugging */
  sources: {
    path: 'config' | 'default';
    model: 'config' | 'default';
    exclude: 'config' | 'default' | 'merged';
    performance: 'config' | 'default' | 'merged';
  };
}

/**
 * Folder operation status
 */
export interface FolderStatus {
  /** Folder configuration */
  config: ResolvedFolderConfig;
  /** Whether folder exists and is accessible */
  accessible: boolean;
  /** Whether folder is currently being indexed */
  indexing: boolean;
  /** Whether folder is being monitored for changes */
  monitoring: boolean;
  /** Last index time */
  lastIndexed?: Date;
  /** Number of documents in folder */
  documentCount?: number;
  /** Any errors with this folder */
  errors?: string[];
}

/**
 * Multi-folder system status
 */
export interface MultiFolderStatus {
  /** Status of each configured folder */
  folders: FolderStatus[];
  /** Total number of documents across all folders */
  totalDocuments: number;
  /** Whether any folders are currently indexing */
  anyIndexing: boolean;
  /** Whether monitoring is active */
  monitoring: boolean;
  /** System-wide errors */
  systemErrors?: string[];
}