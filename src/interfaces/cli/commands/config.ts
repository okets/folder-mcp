/**
 * Configuration CLI Command
 * 
 * Provides comprehensive configuration management via command line interface.
 * Supports viewing, editing, validation, and profile management.
 */

import { BaseCommand } from './base-command.js';
import { SERVICE_TOKENS } from '../../../di/interfaces.js';
import { IConfigurationCommandService } from '../../../domain/cli/IConfigurationCommandService.js';
import { IProfileCommandService } from '../../../domain/cli/IProfileCommandService.js';
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
    // Note: Skipping global options to avoid conflicts with subcommand options
    // this.addGlobalOptionsAfterInit();
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
      .option('--template <type>', 'Create from template (development, production, testing, minimal)')
      .option('--description <text>', 'Profile description')
      .option('--copy-current-config', 'Copy current effective configuration')
      .action(async (name, options) => {
        await this.executeProfileCreate(name, options);
      });

    profile.command('delete')
      .description('Delete configuration profile')
      .argument('<name>', 'Profile name')
      .option('--force', 'Force deletion without confirmation')
      .option('--backup', 'Create backup before deletion')
      .action(async (name, options) => {
        await this.executeProfileDelete(name, options);
      });

    profile.command('show')
      .description('Show profile configuration')
      .argument('<name>', 'Profile name')
      .option('--metadata', 'Show profile metadata')
      .action(async (name, options) => {
        await this.executeProfileShow(name, options);
      });

    profile.command('set')
      .description('Switch to a different profile')
      .argument('<name>', 'Profile name')
      .option('--validate', 'Validate profile before switching')
      .option('--create-if-not-exists', 'Create profile if it does not exist')
      .action(async (name, options) => {
        await this.executeProfileSet(name, options);
      });

    profile.command('copy')
      .description('Copy a profile to a new name')
      .argument('<from>', 'Source profile name')
      .argument('<to>', 'Destination profile name')
      .option('--overwrite', 'Overwrite destination if it exists')
      .option('--merge-mode <mode>', 'Merge mode: replace, merge, overlay')
      .action(async (from, to, options) => {
        await this.executeProfileCopy(from, to, options);
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
    // Default action - show enhanced help
    this.displayEnhancedHelp(options.folder || process.cwd());
  }

  private async executeGet(path: string | undefined, options: any): Promise<void> {
    try {
      const configService = this.resolveService<IConfigurationCommandService>(
        options.folder, 
        SERVICE_TOKENS.CLI_CONFIGURATION_COMMAND_SERVICE
      );

      const result = await configService.getConfig(path, {
        json: options.json,
        source: options.source,
        all: options.all,
        profile: options.profile
      });

      // Handle JSON output directly if requested
      if (options.json) {
        const jsonResponse = {
          success: true,
          data: result
        };
        console.log(JSON.stringify(jsonResponse, null, 2));
        return;
      }

      // Handle human-readable output
      if (options.source) {
        console.log(`Value: ${JSON.stringify(result.value)}`);
        console.log(`Source: ${result.source || 'not found'}`);
      } else {
        if (typeof result.value === 'object') {
          console.log(yaml.stringify(result.value));
        } else {
          console.log(result.value);
        }
      }
    } catch (error) {
      console.error('❌ Failed to get configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeSet(path: string, value: string, options: any): Promise<void> {
    try {
      const configService = this.resolveService<IConfigurationCommandService>(
        options.folder, 
        SERVICE_TOKENS.CLI_CONFIGURATION_COMMAND_SERVICE
      );

      const result = await configService.setConfig(path, value, {
        type: options.type,
        profile: options.profile
      });

      console.log(`✅ Set ${result.path} = ${JSON.stringify(result.value)}`);
      if (result.previousValue !== undefined) {
        console.log(`   Previous: ${JSON.stringify(result.previousValue)}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to set configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeValidate(file: string | undefined, options: any): Promise<void> {
    try {
      const configService = this.resolveService<IConfigurationCommandService>(
        options.folder, 
        SERVICE_TOKENS.CLI_CONFIGURATION_COMMAND_SERVICE
      );

      const result = await configService.validateConfig({
        file,
        profile: options.profile,
        verbose: options.verbose,
        fix: options.fix
      });

      if (result.valid) {
        console.log('✅ Configuration is valid');
        if (options.verbose) {
          console.log(`📋 Validated configuration`);
          if (result.file) {
            console.log(`   File: ${result.file}`);
          }
          if (result.profile) {
            console.log(`   Profile: ${result.profile}`);
          }
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
      const configService = this.resolveService<IConfigurationCommandService>(
        options.folder, 
        SERVICE_TOKENS.CLI_CONFIGURATION_COMMAND_SERVICE
      );

      const result = await configService.listConfig({
        sources: options.sources,
        flat: options.flat,
        json: options.json,
        profile: options.profile
      });

      // Handle JSON output directly if requested
      if (options.json) {
        const jsonResponse = {
          success: true,
          data: result
        };
        console.log(JSON.stringify(jsonResponse, null, 2));
        return;
      }

      // Handle human-readable output
      if (options.sources && result.sources) {
        console.log('📊 Configuration Sources:');
        console.log('========================');
        for (const source of result.sources) {
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
        for (const [key, value] of Object.entries(result.config)) {
          console.log(`${key} = ${JSON.stringify(value)}`);
        }
      } else {
        console.log(yaml.stringify(result.config));
      }
    } catch (error) {
      console.error('❌ Failed to show configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileList(): Promise<void> {
    try {
      const profileService = this.resolveService<IProfileCommandService>(
        this.opts().folder, 
        SERVICE_TOKENS.CLI_PROFILE_COMMAND_SERVICE
      );

      const result = await profileService.listProfiles({ showDetails: true });

      console.log('📋 Available Profiles:');
      console.log('======================');
      
      if (result.profiles.length === 0) {
        console.log('No profiles found.');
      } else {
        for (const profile of result.profiles) {
          const marker = profile.isActive ? '* ' : '  ';
          console.log(`${marker}${profile.name}`);
          if (profile.description) {
            console.log(`     Description: ${profile.description}`);
          }
          console.log(`     Path: ${profile.path}`);
          console.log(`     Size: ${profile.size} bytes`);
          console.log(`     Modified: ${profile.lastModified.toLocaleDateString()}`);
        }
      }
      
      if (result.activeProfile) {
        console.log(`\nActive profile: ${result.activeProfile}`);
      }
      console.log(`\nTotal profiles: ${result.totalProfiles}`);
    } catch (error) {
      console.error('❌ Failed to list profiles:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileCreate(name: string, options: any): Promise<void> {
    try {
      const profileService = this.resolveService<IProfileCommandService>(
        this.opts().folder, 
        SERVICE_TOKENS.CLI_PROFILE_COMMAND_SERVICE
      );

      const result = await profileService.createProfile(name, {
        fromProfile: options.from,
        description: options.description,
        template: options.template,
        copyCurrentConfig: options.copyCurrentConfig
      });

      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.warnings && result.warnings.length > 0) {
          for (const warning of result.warnings) {
            console.warn(`⚠️  ${warning}`);
          }
        }
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to create profile:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileDelete(name: string, options: any): Promise<void> {
    try {
      const profileService = this.resolveService<IProfileCommandService>(
        this.opts().folder, 
        SERVICE_TOKENS.CLI_PROFILE_COMMAND_SERVICE
      );

      const result = await profileService.deleteProfile(name, {
        force: options.force,
        backup: options.backup
      });

      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to delete profile:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileShow(name: string, options: any): Promise<void> {
    try {
      const profileService = this.resolveService<IProfileCommandService>(
        this.opts().folder, 
        SERVICE_TOKENS.CLI_PROFILE_COMMAND_SERVICE
      );

      const profileInfo = await profileService.showProfile(name, {
        format: options.json ? 'json' : 'yaml',
        showMetadata: options.metadata
      });

      if (options.json) {
        console.log(JSON.stringify(profileInfo, null, 2));
      } else {
        console.log(`📄 Profile: ${profileInfo.name}`);
        console.log(`   Path: ${profileInfo.path}`);
        console.log(`   Active: ${profileInfo.isActive ? 'Yes' : 'No'}`);
        console.log(`   Created: ${profileInfo.createdAt.toLocaleDateString()}`);
        console.log(`   Modified: ${profileInfo.lastModified.toLocaleDateString()}`);
        console.log(`   Size: ${profileInfo.size} bytes`);
        if (profileInfo.description) {
          console.log(`   Description: ${profileInfo.description}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to show profile:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileSet(name: string, options: any): Promise<void> {
    try {
      const profileService = this.resolveService<IProfileCommandService>(
        this.opts().folder, 
        SERVICE_TOKENS.CLI_PROFILE_COMMAND_SERVICE
      );

      const result = await profileService.setActiveProfile(name, {
        validateBeforeSwitch: options.validate,
        createIfNotExists: options.createIfNotExists
      });

      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.warnings && result.warnings.length > 0) {
          for (const warning of result.warnings) {
            console.warn(`⚠️  ${warning}`);
          }
        }
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to set profile:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeProfileCopy(from: string, to: string, options: any): Promise<void> {
    try {
      const profileService = this.resolveService<IProfileCommandService>(
        this.opts().folder, 
        SERVICE_TOKENS.CLI_PROFILE_COMMAND_SERVICE
      );

      const result = await profileService.copyProfile(from, to, {
        overwrite: options.overwrite,
        mergeMode: options.mergeMode
      });

      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to copy profile:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeEnvList(options: any): Promise<void> {
    console.log('🌍 Environment Variables:');
    console.log('=========================');
    
    const envVars = Object.keys(process.env)
      .filter(key => key.startsWith('FOLDER_MCP_'))
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
        'FOLDER_MCP_DEVELOPMENT_ENABLED - Enable development mode (replaces legacy ENABLE_ENHANCED_MCP_FEATURES)'
      ];
      
      for (const desc of available) {
        console.log(`  ${desc}`);
      }
    }
  }

  private async executeEnvCheck(): Promise<void> {
    try {
      const configService = this.resolveService<IConfigurationCommandService>(
        this.opts().folder, 
        SERVICE_TOKENS.CLI_CONFIGURATION_COMMAND_SERVICE
      );

      const result = await configService.listConfig({ sources: true });
      const envSource = result.sources?.find(s => s.source === 'environment');

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

}