// Configuration merging system for folder-mcp
// Handles priority: CLI args > local config > global config

import { resolve } from 'path';
import { CLIArgs, ResolvedConfig, LocalConfig } from './schema.js';
import { loadLocalConfig, validateLocalConfig } from './local.js';
import { ConfigFactory } from './factory.js';
import { validateConfig } from './validation-utils.js';

// Re-export interfaces for backward compatibility
export { CLIArgs, ResolvedConfig } from './schema.js';

/**
 * Resolve configuration with proper priority:
 * CLI args > local config > global config
 */
export function resolveConfig(folderPath: string, cliArgs: CLIArgs = {}): ResolvedConfig {
  // Resolve folder path to absolute
  const absoluteFolderPath = resolve(folderPath);
  
  // Load local configuration
  const localConfig = loadLocalConfig(folderPath);
  
  // Validate local config
  const validationErrors = validateLocalConfig(localConfig);
  if (validationErrors.length > 0) {
    console.warn('⚠️  Local configuration validation errors:');
    validationErrors.forEach(error => console.warn(`   - ${error}`));
    console.warn('   Using global defaults for invalid settings');
  }

  // Use factory to create resolved config
  const resolvedConfig = ConfigFactory.createResolvedConfig(absoluteFolderPath, localConfig, cliArgs);

  return resolvedConfig;
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
  const result = validateConfig(config, 'resolved');
  return result.errors.map(error => error.message);
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
