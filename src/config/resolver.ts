// Configuration merging system for folder-mcp
// Handles priority: CLI args > local config > global config

import { resolve } from 'path';
import { getConfig, getProcessingConfig, getEmbeddingConfig } from '../config.js';
import { loadLocalConfig, LocalConfig, validateLocalConfig } from './local.js';

// CLI arguments interface
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

// Resolved configuration interface (all settings resolved)
export interface ResolvedConfig {
  // Folder context
  folderPath: string;
  
  // Processing settings
  chunkSize: number;
  overlap: number;
  batchSize: number;
  
  // Model settings
  modelName: string;
  
  // File filtering
  fileExtensions: string[];
  ignorePatterns: string[];
  
  // Advanced settings
  maxConcurrentOperations: number;
  debounceDelay: number;
  
  // Source information for debugging
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

/**
 * Resolve configuration with proper priority:
 * CLI args > local config > global config
 */
export function resolveConfig(folderPath: string, cliArgs: CLIArgs = {}): ResolvedConfig {
  // Resolve folder path to absolute
  const absoluteFolderPath = resolve(folderPath);
  
  // Load configurations
  const globalConfig = getConfig();
  const localConfig = loadLocalConfig(folderPath);
  
  // Validate local config
  const validationErrors = validateLocalConfig(localConfig);
  if (validationErrors.length > 0) {
    console.warn('⚠️  Local configuration validation errors:');
    validationErrors.forEach(error => console.warn(`   - ${error}`));
    console.warn('   Using global defaults for invalid settings');
  }
  
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
  
  // Resolve each setting
  const chunkSize = resolveWithSource(
    cliArgs.chunkSize,
    localConfig.chunkSize,
    globalConfig.processing.defaultChunkSize
  );
  
  const overlap = resolveWithSource(
    cliArgs.overlap,
    localConfig.overlap,
    globalConfig.processing.defaultOverlap
  );
  
  const batchSize = resolveWithSource(
    cliArgs.batchSize,
    localConfig.batchSize,
    globalConfig.embeddings.batchSize
  );
  
  const modelName = resolveWithSource(
    cliArgs.modelName,
    localConfig.modelName,
    globalConfig.embeddings.defaultModel
  );
  
  const fileExtensions = resolveWithSource(
    cliArgs.fileExtensions,
    localConfig.fileExtensions,
    ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'] // Default from global config
  );
  
  const ignorePatterns = resolveWithSource(
    cliArgs.ignorePatterns,
    localConfig.ignorePatterns,
    [ // Default ignore patterns
      '**/node_modules/**',
      '**/.git/**',
      '**/.folder-mcp/**',
      '**/dist/**',
      '**/build/**',
      '**/.DS_Store',
      '**/Thumbs.db'
    ]
  );
  
  const maxConcurrentOperations = resolveWithSource(
    cliArgs.maxConcurrentOperations,
    localConfig.maxConcurrentOperations,
    globalConfig.processing.maxConcurrentOperations
  );
  
  const debounceDelay = resolveWithSource(
    cliArgs.debounceDelay,
    localConfig.debounceDelay,
    1000 // Default debounce delay
  );
  
  return {
    folderPath: absoluteFolderPath,
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
}

/**
 * Display configuration summary showing sources
 */
export function displayConfigSummary(config: ResolvedConfig, verbose: boolean = false): void {
  console.log('📋 Configuration Summary:');
  console.log(`   📐 Chunk Size: ${config.chunkSize} (${config.sources.chunkSize})`);
  console.log(`   🔗 Overlap: ${config.overlap} (${config.sources.overlap})`);
  console.log(`   📦 Batch Size: ${config.batchSize} (${config.sources.batchSize})`);
  console.log(`   🤖 Model: ${config.modelName} (${config.sources.modelName})`);
  console.log(`   ⚙️  Max Operations: ${config.maxConcurrentOperations} (${config.sources.maxConcurrentOperations})`);
  console.log(`   ⏱️  Debounce: ${config.debounceDelay}ms (${config.sources.debounceDelay})`);
  
  if (verbose) {
    console.log(`   📁 File Extensions: ${config.fileExtensions.join(', ')} (${config.sources.fileExtensions})`);
    console.log(`   🚫 Ignore Patterns: (${config.sources.ignorePatterns})`);
    config.ignorePatterns.forEach(pattern => {
      console.log(`      - ${pattern}`);
    });
  }
  
  console.log();
}

/**
 * Validate resolved configuration
 */
export function validateResolvedConfig(config: ResolvedConfig): string[] {
  const errors: string[] = [];
  
  if (config.chunkSize < 100 || config.chunkSize > 10000) {
    errors.push('Chunk size must be between 100 and 10000');
  }
  
  if (config.overlap < 0 || config.overlap >= config.chunkSize) {
    errors.push('Overlap must be non-negative and less than chunk size');
  }
  
  if (config.batchSize < 1 || config.batchSize > 1000) {
    errors.push('Batch size must be between 1 and 1000');
  }
  
  if (config.maxConcurrentOperations < 1 || config.maxConcurrentOperations > 100) {
    errors.push('Max concurrent operations must be between 1 and 100');
  }
  
  if (config.debounceDelay < 100 || config.debounceDelay > 60000) {
    errors.push('Debounce delay must be between 100 and 60000 milliseconds');
  }
  
  if (config.fileExtensions.length === 0) {
    errors.push('At least one file extension must be specified');
  }
  
  const invalidExts = config.fileExtensions.filter(ext => !ext.startsWith('.'));
  if (invalidExts.length > 0) {
    errors.push(`File extensions must start with '.': ${invalidExts.join(', ')}`);
  }
  
  return errors;
}

/**
 * Parse CLI arguments to configuration options
 */
export function parseCliArgs(args: any): CLIArgs {
  const cliArgs: CLIArgs = {};
  
  // Parse numeric options
  if (args.chunkSize !== undefined) {
    const parsed = parseInt(args.chunkSize, 10);
    if (!isNaN(parsed)) cliArgs.chunkSize = parsed;
  }
  
  if (args.overlap !== undefined) {
    const parsed = parseInt(args.overlap, 10);
    if (!isNaN(parsed)) cliArgs.overlap = parsed;
  }
  
  if (args.batchSize !== undefined) {
    const parsed = parseInt(args.batchSize, 10);
    if (!isNaN(parsed)) cliArgs.batchSize = parsed;
  }
  
  if (args.maxConcurrentOperations !== undefined) {
    const parsed = parseInt(args.maxConcurrentOperations, 10);
    if (!isNaN(parsed)) cliArgs.maxConcurrentOperations = parsed;
  }
  
  if (args.debounce !== undefined) {
    const parsed = parseInt(args.debounce, 10);
    if (!isNaN(parsed)) cliArgs.debounceDelay = parsed;
  }
  
  if (args.results !== undefined) {
    const parsed = parseInt(args.results, 10);
    if (!isNaN(parsed)) cliArgs.results = parsed;
  }
  
  if (args.port !== undefined) {
    const parsed = parseInt(args.port, 10);
    if (!isNaN(parsed)) cliArgs.port = parsed;
  }
  
  // Parse string options
  if (args.model !== undefined) {
    cliArgs.modelName = args.model;
  }
  
  if (args.transport !== undefined) {
    cliArgs.transport = args.transport;
  }
  
  // Parse array options
  if (args.extensions !== undefined) {
    if (typeof args.extensions === 'string') {
      cliArgs.fileExtensions = args.extensions.split(',').map((ext: string) => ext.trim());
    } else if (Array.isArray(args.extensions)) {
      cliArgs.fileExtensions = args.extensions;
    }
  }
  
  if (args.ignore !== undefined) {
    if (typeof args.ignore === 'string') {
      cliArgs.ignorePatterns = args.ignore.split(',').map((pattern: string) => pattern.trim());
    } else if (Array.isArray(args.ignore)) {
      cliArgs.ignorePatterns = args.ignore;
    }
  }
  
  // Parse boolean options
  if (args.force !== undefined) cliArgs.force = Boolean(args.force);
  if (args.verbose !== undefined) cliArgs.verbose = Boolean(args.verbose);
  if (args.quiet !== undefined) cliArgs.quiet = Boolean(args.quiet);
  if (args.rebuildIndex !== undefined) cliArgs.rebuildIndex = Boolean(args.rebuildIndex);
  if (args.skipEmbeddings !== undefined) cliArgs.skipEmbeddings = Boolean(args.skipEmbeddings);
  
  return cliArgs;
}
