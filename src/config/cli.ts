// Configuration management CLI command
import { Command } from 'commander';
import { existsSync } from 'fs';
import { 
  loadLocalConfig, 
  saveLocalConfig, 
  initializeLocalConfig, 
  updateLocalConfig,
  getLocalConfigPath,
  validateLocalConfig,
  DEFAULT_LOCAL_CONFIG 
} from './local.js';
import { resolveConfig, displayConfigSummary } from './resolver.js';
import { getConfig } from '../config.js';

/**
 * Set up the config command with all subcommands
 */
export function setupConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage folder-specific configuration');

  // Show current configuration
  configCmd
    .command('show')
    .description('Show current configuration for a folder')
    .argument('<folder>', 'Path to the folder')
    .option('-v, --verbose', 'Show detailed configuration including file extensions and ignore patterns')
    .action(async (folder: string, options: { verbose?: boolean }) => {
      await showConfig(folder, options.verbose || false);
    });

  // Initialize configuration
  configCmd
    .command('init')
    .description('Initialize configuration for a folder with defaults')
    .argument('<folder>', 'Path to the folder')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (folder: string, options: { force?: boolean }) => {
      await initConfig(folder, options.force || false);
    });

  // Set configuration values
  configCmd
    .command('set')
    .description('Set configuration values')
    .argument('<folder>', 'Path to the folder')
    .option('--chunk-size <size>', 'Set chunk size (100-10000)', parseIntOption)
    .option('--overlap <size>', 'Set overlap size (0-chunk_size)', parseIntOption)
    .option('--batch-size <size>', 'Set batch size (1-1000)', parseIntOption)
    .option('--model <name>', 'Set embedding model name')
    .option('--extensions <list>', 'Set file extensions (comma-separated, e.g., .txt,.md,.pdf)')
    .option('--ignore <patterns>', 'Set ignore patterns (comma-separated)')
    .option('--max-operations <num>', 'Set max concurrent operations (1-100)', parseIntOption)
    .option('--debounce <ms>', 'Set debounce delay in milliseconds (100-60000)', parseIntOption)
    .action(async (folder: string, options: any) => {
      await setConfig(folder, options);
    });

  // Reset configuration to defaults
  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .argument('<folder>', 'Path to the folder')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (folder: string, options: { force?: boolean }) => {
      await resetConfig(folder, options.force || false);
    });

  // Validate configuration
  configCmd
    .command('validate')
    .description('Validate configuration for a folder')
    .argument('<folder>', 'Path to the folder')
    .action(async (folder: string) => {
      await validateConfig(folder);
    });

  // List available models
  configCmd
    .command('models')
    .description('List available embedding models')
    .action(async () => {
      await listModels();
    });
}

/**
 * Show current configuration
 */
async function showConfig(folder: string, verbose: boolean): Promise<void> {
  try {
    if (!existsSync(folder)) {
      console.error(`❌ Folder does not exist: ${folder}`);
      process.exit(1);
    }

    const configPath = getLocalConfigPath(folder);
    const hasLocalConfig = existsSync(configPath);
    
    console.log(`📁 Folder: ${folder}`);
    console.log(`📄 Local config: ${hasLocalConfig ? 'Yes' : 'No'} (${configPath})`);
    
    if (!hasLocalConfig) {
      console.log('   Using global defaults only');
    }
    
    console.log();

    // Show resolved configuration
    const resolvedConfig = resolveConfig(folder);
    displayConfigSummary(resolvedConfig, verbose);

    // Show local config if it exists
    if (hasLocalConfig) {
      const localConfig = loadLocalConfig(folder);
      console.log('📝 Local Configuration File Contents:');
      
      if (localConfig.chunkSize !== undefined) {
        console.log(`   chunkSize: ${localConfig.chunkSize}`);
      }
      if (localConfig.overlap !== undefined) {
        console.log(`   overlap: ${localConfig.overlap}`);
      }
      if (localConfig.batchSize !== undefined) {
        console.log(`   batchSize: ${localConfig.batchSize}`);
      }
      if (localConfig.modelName !== undefined) {
        console.log(`   modelName: ${localConfig.modelName}`);
      }
      if (localConfig.maxConcurrentOperations !== undefined) {
        console.log(`   maxConcurrentOperations: ${localConfig.maxConcurrentOperations}`);
      }
      if (localConfig.debounceDelay !== undefined) {
        console.log(`   debounceDelay: ${localConfig.debounceDelay}`);
      }
      
      if (verbose) {
        if (localConfig.fileExtensions) {
          console.log(`   fileExtensions: [${localConfig.fileExtensions.join(', ')}]`);
        }
        if (localConfig.ignorePatterns) {
          console.log(`   ignorePatterns:`);
          localConfig.ignorePatterns.forEach(pattern => {
            console.log(`     - ${pattern}`);
          });
        }
      }
      
      if (localConfig.userChoices && Object.keys(localConfig.userChoices).length > 0) {
        console.log(`   userChoices:`);
        Object.entries(localConfig.userChoices).forEach(([key, value]) => {
          console.log(`     ${key}: ${JSON.stringify(value)}`);
        });
      }
      
      console.log();
    }
    
  } catch (error) {
    console.error('❌ Failed to show configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Initialize configuration
 */
async function initConfig(folder: string, force: boolean): Promise<void> {
  try {
    if (!existsSync(folder)) {
      console.error(`❌ Folder does not exist: ${folder}`);
      process.exit(1);
    }

    const configPath = getLocalConfigPath(folder);
    const hasExisting = existsSync(configPath);
    
    if (hasExisting && !force) {
      console.error(`❌ Configuration already exists at ${configPath}`);
      console.error('   Use --force to overwrite');
      process.exit(1);
    }
    
    if (hasExisting && force) {
      console.log(`⚠️  Overwriting existing configuration at ${configPath}`);
    }
    
    const config = initializeLocalConfig(folder);
    console.log('✅ Configuration initialized with defaults');
    
    // Show the initialized configuration
    console.log();
    const resolvedConfig = resolveConfig(folder);
    displayConfigSummary(resolvedConfig, false);
    
  } catch (error) {
    console.error('❌ Failed to initialize configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Set configuration values
 */
async function setConfig(folder: string, options: any): Promise<void> {
  try {
    if (!existsSync(folder)) {
      console.error(`❌ Folder does not exist: ${folder}`);
      process.exit(1);
    }

    const updates: any = {};
    
    if (options.chunkSize !== undefined) updates.chunkSize = options.chunkSize;
    if (options.overlap !== undefined) updates.overlap = options.overlap;
    if (options.batchSize !== undefined) updates.batchSize = options.batchSize;
    if (options.model !== undefined) updates.modelName = options.model;
    if (options.maxOperations !== undefined) updates.maxConcurrentOperations = options.maxOperations;
    if (options.debounce !== undefined) updates.debounceDelay = options.debounce;
    
    if (options.extensions !== undefined) {
      updates.fileExtensions = options.extensions.split(',').map((ext: string) => ext.trim());
    }
    
    if (options.ignore !== undefined) {
      updates.ignorePatterns = options.ignore.split(',').map((pattern: string) => pattern.trim());
    }
    
    if (Object.keys(updates).length === 0) {
      console.error('❌ No configuration values specified');
      console.error('   Use --help to see available options');
      process.exit(1);
    }
    
    // Validate the updates
    const tempConfig = { ...DEFAULT_LOCAL_CONFIG, ...updates };
    const validationErrors = validateLocalConfig(tempConfig);
    
    if (validationErrors.length > 0) {
      console.error('❌ Validation errors:');
      validationErrors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }
    
    // Apply the updates
    const updatedConfig = updateLocalConfig(folder, updates);
    
    console.log('✅ Configuration updated successfully');
    console.log();
    
    // Show what was changed
    console.log('🔄 Changes made:');
    Object.entries(updates).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`   ${key}: [${value.join(', ')}]`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
    
    console.log();
    
    // Show the new resolved configuration
    const resolvedConfig = resolveConfig(folder);
    displayConfigSummary(resolvedConfig, false);
    
  } catch (error) {
    console.error('❌ Failed to update configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Reset configuration to defaults
 */
async function resetConfig(folder: string, force: boolean): Promise<void> {
  try {
    if (!existsSync(folder)) {
      console.error(`❌ Folder does not exist: ${folder}`);
      process.exit(1);
    }

    const configPath = getLocalConfigPath(folder);
    const hasConfig = existsSync(configPath);
    
    if (!hasConfig) {
      console.log('ℹ️  No local configuration found - nothing to reset');
      return;
    }
    
    if (!force) {
      // TODO: Add interactive confirmation when we implement prompts
      console.error('❌ Use --force to confirm reset to defaults');
      console.error('   This will overwrite your current configuration');
      process.exit(1);
    }
    
    const defaultConfig = { ...DEFAULT_LOCAL_CONFIG };
    saveLocalConfig(folder, defaultConfig);
    
    console.log('✅ Configuration reset to defaults');
    console.log();
    
    const resolvedConfig = resolveConfig(folder);
    displayConfigSummary(resolvedConfig, false);
    
  } catch (error) {
    console.error('❌ Failed to reset configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Validate configuration
 */
async function validateConfig(folder: string): Promise<void> {
  try {
    if (!existsSync(folder)) {
      console.error(`❌ Folder does not exist: ${folder}`);
      process.exit(1);
    }

    const configPath = getLocalConfigPath(folder);
    const hasConfig = existsSync(configPath);
    
    console.log(`📁 Folder: ${folder}`);
    console.log(`📄 Local config: ${hasConfig ? 'Yes' : 'No'}`);
    console.log();
    
    if (hasConfig) {
      const localConfig = loadLocalConfig(folder);
      const validationErrors = validateLocalConfig(localConfig);
      
      if (validationErrors.length === 0) {
        console.log('✅ Local configuration is valid');
      } else {
        console.log('❌ Local configuration has errors:');
        validationErrors.forEach(error => console.log(`   - ${error}`));
      }
      console.log();
    }
    
    // Validate resolved configuration
    const resolvedConfig = resolveConfig(folder);
    const resolvedErrors = validateLocalConfig(resolvedConfig);
    
    if (resolvedErrors.length === 0) {
      console.log('✅ Resolved configuration is valid');
    } else {
      console.log('❌ Resolved configuration has errors:');
      resolvedErrors.forEach(error => console.log(`   - ${error}`));
      process.exit(1);
    }
    
    displayConfigSummary(resolvedConfig, true);
    
  } catch (error) {
    console.error('❌ Failed to validate configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * List available models
 */
async function listModels(): Promise<void> {
  try {
    const globalConfig = getConfig();
    const models = globalConfig.embeddings.models;
    
    console.log('🤖 Available Embedding Models:');
    console.log();
    
    Object.entries(models).forEach(([key, model]) => {
      const isDefault = key === globalConfig.embeddings.defaultModel || model.isDefault;
      const marker = isDefault ? '(default)' : '';
      
      console.log(`   ${key} ${marker}`);
      console.log(`     Name: ${model.name}`);
      console.log(`     Description: ${model.description}`);
      console.log(`     Dimensions: ${model.dimensions}`);
      console.log(`     Max Tokens: ${model.maxTokens || 'N/A'}`);
      console.log(`     Transformers: ${model.transformersModel}`);
      console.log(`     Ollama: ${model.ollamaModel}`);
      console.log();
    });
    
  } catch (error) {
    console.error('❌ Failed to list models:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Helper to parse integer options
 */
function parseIntOption(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }
  return parsed;
}
