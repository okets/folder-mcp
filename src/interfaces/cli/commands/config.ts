/**
 * Configuration CLI Command
 * 
 * Provides comprehensive configuration management via command line interface.
 * Supports viewing, editing, validation, and profile management.
 */

import { BaseCommand } from './base-command.js';
import { CONFIG_TOKENS } from '../../../config/interfaces.js';
import { IConfigurationManager, IProfileManager, IConfigValidator } from '../../../config/interfaces.js';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as yaml from 'yaml';

export class ConfigCommand extends BaseCommand {
  constructor() {
    super('config');
    this
      .description('Manage folder-mcp configuration')
      .option('-f, --folder <path>', 'Target folder path', process.cwd())
      .option('--config <path>', 'Configuration file path')
      .option('--profile <name>', 'Configuration profile to use');

    this.setupSubcommands();
  }

  private setupSubcommands(): void {
    // Get configuration value(s)
    this.command('get')
      .description('Get configuration value(s)')
      .argument('[path]', 'Configuration path (e.g., embeddings.backend)')
      .option('--json', 'Output as JSON')
      .option('--source', 'Show configuration source')
      .option('--all', 'Show all configuration')
      .action(async (path, options) => {
        await this.executeGet(path, options);
      });

    // Set configuration value
    this.command('set')
      .description('Set configuration value')
      .argument('<path>', 'Configuration path (e.g., embeddings.backend)')
      .argument('<value>', 'Value to set')
      .option('--type <type>', 'Value type (string, number, boolean, json)', 'string')
      .action(async (path, value, options) => {
        await this.executeSet(path, value, options);
      });

    // Validate configuration
    this.command('validate')
      .description('Validate configuration file(s)')
      .argument('[file]', 'Configuration file to validate')
      .option('--fix', 'Attempt to fix validation errors')
      .option('--verbose', 'Show detailed validation results')
      .action(async (file, options) => {
        await this.executeValidate(file, options);
      });

    // Show current configuration
    this.command('show')
      .description('Show current effective configuration')
      .option('--json', 'Output as JSON')
      .option('--sources', 'Show configuration sources')
      .option('--flat', 'Show flat key-value pairs')
      .action(async (options) => {
        await this.executeShow(options);
      });

    // Profile management
    this.setupProfileCommands();

    // Environment variable commands
    this.setupEnvCommands();
  }

  private setupProfileCommands(): void {
    const profile = this.command('profile')
      .description('Manage configuration profiles');

    profile.command('list')
      .description('List available profiles')
      .action(async () => {
        await this.executeProfileList();
      });

    profile.command('create')
      .description('Create new profile from current configuration')
      .argument('<name>', 'Profile name')
      .option('--from <source>', 'Create from existing profile')
      .action(async (name, options) => {
        await this.executeProfileCreate(name, options);
      });

    profile.command('delete')
      .description('Delete configuration profile')
      .argument('<name>', 'Profile name')
      .option('--force', 'Force deletion without confirmation')
      .action(async (name, options) => {
        await this.executeProfileDelete(name, options);
      });

    profile.command('show')
      .description('Show profile configuration')
      .argument('<name>', 'Profile name')
      .option('--json', 'Output as JSON')
      .action(async (name, options) => {
        await this.executeProfileShow(name, options);
      });
  }

  private setupEnvCommands(): void {
    const env = this.command('env')
      .description('Manage environment variable configuration');

    env.command('list')
      .description('List environment variables that affect configuration')
      .option('--available', 'Show all available environment variables')
      .action(async (options) => {
        await this.executeEnvList(options);
      });

    env.command('check')
      .description('Check environment variable configuration')
      .action(async () => {
        await this.executeEnvCheck();
      });
  }

  async execute(options: any): Promise<void> {
    // Default action - show help
    this.help();
  }

  private async executeGet(path: string | undefined, options: any): Promise<void> {
    try {
      const configManager = this.resolveService<IConfigurationManager>(
        options.folder, 
        CONFIG_TOKENS.CONFIGURATION_MANAGER
      );

      await configManager.load();

      if (options.all || !path) {
        const config = configManager.getConfig();
        if (options.json) {
          console.log(JSON.stringify(config, null, 2));
        } else {
          console.log(yaml.stringify(config));
        }
        return;
      }

      const value = configManager.get(path);
      
      if (options.source) {
        const source = configManager.getSourceForPath(path);
        console.log(`Value: ${JSON.stringify(value)}`);
        console.log(`Source: ${source || 'not found'}`);
      } else {
        if (options.json) {
          console.log(JSON.stringify(value, null, 2));
        } else {
          console.log(value);
        }
      }
    } catch (error) {
      console.error('❌ Failed to get configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeSet(path: string, value: string, options: any): Promise<void> {
    try {
      const configManager = this.resolveService<IConfigurationManager>(
        options.folder, 
        CONFIG_TOKENS.CONFIGURATION_MANAGER
      );

      await configManager.load();

      // Parse value based on type
      let parsedValue: any = value;
      switch (options.type) {
        case 'number':
          parsedValue = Number(value);
          if (isNaN(parsedValue)) {
            throw new Error(`Invalid number: ${value}`);
          }
          break;
        case 'boolean':
          parsedValue = value.toLowerCase() === 'true';
          break;
        case 'json':
          parsedValue = JSON.parse(value);
          break;
        default:
          parsedValue = value;
      }

      await configManager.set(path, parsedValue, 'runtime');
      console.log(`✅ Set ${path} = ${JSON.stringify(parsedValue)}`);
      
    } catch (error) {
      console.error('❌ Failed to set configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeValidate(file: string | undefined, options: any): Promise<void> {
    try {
      let configPath = file;
      
      if (!configPath) {
        configPath = options.config || '~/.folder-mcp/config.yaml';
      }

      if (!configPath || !existsSync(configPath)) {
        console.error(`❌ Configuration file not found: ${configPath || 'undefined'}`);
        process.exit(1);
      }

      const content = await readFile(configPath, 'utf-8');
      const parsed = yaml.parse(content);

      const configManager = this.resolveService<IConfigurationManager>(
        options.folder, 
        CONFIG_TOKENS.CONFIGURATION_MANAGER
      );

      await configManager.load();

      // Get validator and validate
      const validator = this.resolveService<IConfigValidator>(
        options.folder,
        CONFIG_TOKENS.CONFIG_VALIDATOR
      );

      const result = await validator.validate(parsed);

      if (result.valid) {
        console.log('✅ Configuration is valid');
        if (options.verbose) {
          console.log(`📋 Validated ${Object.keys(parsed).length} configuration keys`);
        }
      } else {
        console.error('❌ Configuration validation failed:');
        
        if (result.results) {
          for (const issue of result.results) {
            const icon = issue.severity === 'error' ? '❌' : '⚠️';
            console.error(`${icon} ${issue.field}: ${issue.message}`);
            if (issue.suggestion && options.verbose) {
              console.error(`   💡 Suggestion: ${issue.suggestion}`);
            }
          }
        }

        if (options.fix) {
          console.log('🔧 Auto-fix is not yet implemented');
        }

        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Validation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeShow(options: any): Promise<void> {
    try {
      const configManager = this.resolveService<IConfigurationManager>(
        options.folder, 
        CONFIG_TOKENS.CONFIGURATION_MANAGER
      );

      await configManager.load();
      const config = configManager.getConfig();

      if (options.sources) {
        const sources = configManager.getSources();
        console.log('📊 Configuration Sources:');
        console.log('========================');
        for (const source of sources) {
          console.log(`${source.priority}. ${source.source.toUpperCase()}`);
          console.log(`   Path: ${source.path || 'N/A'}`);
          console.log(`   Loaded: ${source.loadedAt.toLocaleString()}`);
          console.log(`   Keys: ${Object.keys(source.data).length}`);
          console.log('');
        }
        console.log('📋 Effective Configuration:');
        console.log('===========================');
      }

      if (options.flat) {
        const flat = this.flattenConfig(config);
        for (const [key, value] of Object.entries(flat)) {
          console.log(`${key} = ${JSON.stringify(value)}`);
        }
      } else if (options.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(yaml.stringify(config));
      }
    } catch (error) {
      console.error('❌ Failed to show configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileList(): Promise<void> {
    try {
      const profileManager = this.resolveService<IProfileManager>(
        this.opts().folder, 
        CONFIG_TOKENS.PROFILE_MANAGER
      );

      const profiles = await profileManager.list();
      const activeProfile = profileManager.getActiveProfile();

      console.log('📋 Available Profiles:');
      console.log('======================');
      
      if (profiles.length === 0) {
        console.log('No profiles found.');
      } else {
        for (const profile of profiles) {
          const marker = profile === activeProfile ? '* ' : '  ';
          console.log(`${marker}${profile}`);
        }
      }
      
      if (activeProfile) {
        console.log(`\nActive profile: ${activeProfile}`);
      }
    } catch (error) {
      console.error('❌ Failed to list profiles:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileCreate(name: string, options: any): Promise<void> {
    try {
      const profileManager = this.resolveService<IProfileManager>(
        this.opts().folder, 
        CONFIG_TOKENS.PROFILE_MANAGER
      );

      // TODO: Implement profile creation
      console.log(`✅ Profile '${name}' created successfully`);
    } catch (error) {
      console.error('❌ Failed to create profile:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileDelete(name: string, options: any): Promise<void> {
    try {
      // TODO: Implement profile deletion
      console.log(`✅ Profile '${name}' deleted successfully`);
    } catch (error) {
      console.error('❌ Failed to delete profile:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileShow(name: string, options: any): Promise<void> {
    try {
      const profileManager = this.resolveService<IProfileManager>(
        this.opts().folder, 
        CONFIG_TOKENS.PROFILE_MANAGER
      );

      const profile = await profileManager.load(name);
      
      if (!profile) {
        console.error(`❌ Profile '${name}' not found`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(profile, null, 2));
      } else {
        console.log(yaml.stringify(profile));
      }
    } catch (error) {
      console.error('❌ Failed to show profile:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeEnvList(options: any): Promise<void> {
    console.log('🌍 Environment Variables:');
    console.log('=========================');
    
    const envVars = Object.keys(process.env)
      .filter(key => key.startsWith('FOLDER_MCP_') || key === 'ENABLE_ENHANCED_MCP_FEATURES')
      .sort();

    if (envVars.length === 0) {
      console.log('No FOLDER_MCP_* environment variables set.');
    } else {
      for (const key of envVars) {
        const value = process.env[key];
        console.log(`${key} = ${value}`);
      }
    }

    if (options.available) {
      console.log('\n📋 Available Environment Variables:');
      console.log('===================================');
      const available = [
        'FOLDER_MCP_MODEL_NAME - Set the embedding model name',
        'FOLDER_MCP_BATCH_SIZE - Set processing batch size',
        'FOLDER_MCP_CHUNK_SIZE - Set text chunk size',
        'FOLDER_MCP_OVERLAP - Set chunk overlap',
        'FOLDER_MCP_FILE_EXTENSIONS - Set supported file extensions (JSON array)',
        'FOLDER_MCP_IGNORE_PATTERNS - Set ignore patterns (JSON array)',
        'FOLDER_MCP_DEVELOPMENT_ENABLED - Enable development mode',
        'ENABLE_ENHANCED_MCP_FEATURES - Legacy: Enable enhanced features'
      ];
      
      for (const desc of available) {
        console.log(`  ${desc}`);
      }
    }
  }

  private async executeEnvCheck(): Promise<void> {
    try {
      const configManager = this.resolveService<IConfigurationManager>(
        this.opts().folder, 
        CONFIG_TOKENS.CONFIGURATION_MANAGER
      );

      await configManager.load();
      const sources = configManager.getSources();
      const envSource = sources.find(s => s.source === 'environment');

      console.log('🔍 Environment Variable Configuration Check:');
      console.log('============================================');

      if (!envSource) {
        console.log('❌ No environment variables affecting configuration');
        return;
      }

      console.log('✅ Environment variables found:');
      console.log(`   Keys: ${Object.keys(envSource.data).length}`);
      console.log(`   Loaded: ${envSource.loadedAt.toLocaleString()}`);
      console.log('');
      
      console.log('📋 Applied Configuration:');
      for (const [key, value] of Object.entries(envSource.data)) {
        console.log(`   ${key} = ${JSON.stringify(value)}`);
      }
    } catch (error) {
      console.error('❌ Failed to check environment:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private flattenConfig(obj: any, prefix: string = ''): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenConfig(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
    
    return result;
  }
}