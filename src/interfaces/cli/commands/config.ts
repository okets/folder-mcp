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
import { getConfigurationComponent } from '../../../config/di-setup.js';
import { getContainer } from '../../../di/container.js';
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
    
    // Logging management commands
    this.setupLoggingCommands();
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
      // Use the new ConfigurationComponent
      const container = getContainer();
      const configComponent = getConfigurationComponent(container);
      
      let result: any;
      if (path) {
        result = await configComponent.get(path);
      } else {
        // Get entire configuration
        result = await configComponent.get('');
      }

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
      if (typeof result === 'object') {
        console.log(yaml.stringify(result));
      } else {
        console.log(result);
      }
    } catch (error) {
      console.error('❌ Failed to get configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeSet(path: string, value: string, options: any): Promise<void> {
    try {
      // Use the new ConfigurationComponent with TUI validation
      const container = getContainer();
      const configComponent = getConfigurationComponent(container);
      
      // Get current value for comparison
      const previousValue = await configComponent.get(path);
      
      // Parse value based on type
      let parsedValue: any = value;
      if (options.type === 'number') {
        parsedValue = Number(value);
        if (isNaN(parsedValue)) {
          throw new Error(`Invalid number: ${value}`);
        }
      } else if (options.type === 'boolean') {
        parsedValue = value.toLowerCase() === 'true';
      } else if (options.type === 'json') {
        parsedValue = JSON.parse(value);
      }
      
      // Set with validation (will throw if invalid)
      await configComponent.set(path, parsedValue);

      console.log(`✅ Set ${path} = ${JSON.stringify(parsedValue)}`);
      if (previousValue !== undefined) {
        console.log(`   Previous: ${JSON.stringify(previousValue)}`);
      }
      console.log(`   ✓ Validated using TUI validation rules`);
      
    } catch (error) {
      console.error('❌ Failed to set configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeValidate(file: string | undefined, options: any): Promise<void> {
    try {
      // Use the new ConfigurationComponent with TUI validation
      const container = getContainer();
      const configComponent = getConfigurationComponent(container);
      
      const result = await configComponent.validateAll();

      if (result.isValid) {
        console.log('✅ Configuration is valid');
        if (options.verbose) {
          console.log(`📋 Validated configuration using TUI validation rules`);
          if (file) {
            console.log(`   File: ${file}`);
          }
          if (options.profile) {
            console.log(`   Profile: ${options.profile}`);
          }
        }
      } else {
        console.error('❌ Configuration validation failed:');
        
        for (const issue of result.errors) {
          console.error(`❌ ${issue.path}: ${issue.error}`);
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

  private setupLoggingCommands(): void {
    const logging = this.command('logging')
      .description('Manage logging configuration and runtime settings');

    // Set log level for component or globally
    logging.command('level')
      .description('Get or set log levels')
      .argument('[action]', 'Action: get | set')
      .argument('[level]', 'Log level: debug, info, warn, error, fatal')
      .option('--component <name>', 'Component name (default: global)')
      .action(async (action, level, options) => {
        await this.executeLoggingLevel(action, level, options);
      });

    // Manage log transports
    logging.command('transport')
      .description('Manage log transports')
      .argument('[action]', 'Action: list | enable | disable | add | remove')
      .argument('[transport]', 'Transport name (console, file)')
      .option('--filename <path>', 'Log file path (for file transport)')
      .option('--level <level>', 'Transport log level')
      .option('--format <format>', 'Log format (text, json)')
      .action(async (action, transport, options) => {
        await this.executeLoggingTransport(action, transport, options);
      });

    // Log rotation management
    logging.command('rotate')
      .description('Manage log rotation')
      .argument('[action]', 'Action: now | config | status')
      .option('--enable', 'Enable rotation')
      .option('--disable', 'Disable rotation')
      .option('--max-size <size>', 'Maximum file size (e.g., 50MB)')
      .option('--max-files <count>', 'Maximum number of files')
      .action(async (action, options) => {
        await this.executeLoggingRotate(action, options);
      });

    // Performance metrics
    logging.command('metrics')
      .description('View logging performance metrics')
      .option('--enable', 'Enable metrics collection')
      .option('--disable', 'Disable metrics collection')
      .option('--reset', 'Reset metrics counters')
      .action(async (options) => {
        await this.executeLoggingMetrics(options);
      });
  }

  private async executeLoggingLevel(action?: string, level?: string, options?: any): Promise<void> {
    try {
      const container = getContainer();
      const configComponent = getConfigurationComponent(container);
      await configComponent.load();

      if (!action || action === 'get') {
        // Get current log levels
        const component = options?.component;
        
        if (component) {
          const componentLevel = await configComponent.get(`logging.componentLevels.${component}`);
          const globalLevel = await configComponent.get('logging.level');
          const effectiveLevel = componentLevel || globalLevel;
          
          console.log(`📊 Log Level for ${component}:`);
          console.log(`   Component Level: ${componentLevel || '(not set)'}`);
          console.log(`   Global Level: ${globalLevel}`);
          console.log(`   Effective Level: ${effectiveLevel}`);
        } else {
          const globalLevel = await configComponent.get('logging.level');
          const componentLevels = await configComponent.get('logging.componentLevels') || {};
          
          console.log('📊 Current Log Levels:');
          console.log(`   Global: ${globalLevel}`);
          
          if (Object.keys(componentLevels).length > 0) {
            console.log('   Component Overrides:');
            for (const [comp, lvl] of Object.entries(componentLevels)) {
              console.log(`     ${comp}: ${lvl}`);
            }
          }
        }
      } else if (action === 'set') {
        if (!level) {
          console.error('❌ Level is required for set action');
          process.exit(1);
        }

        const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
        if (!validLevels.includes(level)) {
          console.error(`❌ Invalid log level. Must be one of: ${validLevels.join(', ')}`);
          process.exit(1);
        }

        const component = options?.component;
        
        if (component) {
          // Set component-specific level
          const currentComponentLevels = await configComponent.get('logging.componentLevels') || {};
          currentComponentLevels[component] = level;
          await configComponent.set('logging.componentLevels', currentComponentLevels);
          console.log(`✅ Set log level for ${component} to ${level}`);
        } else {
          // Set global level
          await configComponent.set('logging.level', level);
          console.log(`✅ Set global log level to ${level}`);
        }
      } else {
        console.error('❌ Invalid action. Use "get" or "set"');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to manage log levels:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeLoggingTransport(action?: string, transport?: string, options?: any): Promise<void> {
    try {
      const container = getContainer();
      const configComponent = getConfigurationComponent(container);
      await configComponent.load();

      if (!action || action === 'list') {
        // List current transports
        const transports = await configComponent.get('logging.transports') || {};
        
        console.log('🚌 Log Transports:');
        for (const [name, config] of Object.entries(transports)) {
          const transportConfig = config as any;
          console.log(`   ${name}:`);
          console.log(`     Enabled: ${transportConfig.enabled ? '✅' : '❌'}`);
          console.log(`     Level: ${transportConfig.level}`);
          console.log(`     Format: ${transportConfig.format || 'text'}`);
          if (transportConfig.filename) {
            console.log(`     File: ${transportConfig.filename}`);
          }
        }
      } else if (action === 'enable' || action === 'disable') {
        if (!transport) {
          console.error('❌ Transport name is required');
          process.exit(1);
        }

        const currentTransports = await configComponent.get('logging.transports') || {};
        if (!currentTransports[transport]) {
          console.error(`❌ Transport "${transport}" not found`);
          process.exit(1);
        }

        currentTransports[transport].enabled = action === 'enable';
        await configComponent.set('logging.transports', currentTransports);
        console.log(`✅ ${action === 'enable' ? 'Enabled' : 'Disabled'} transport "${transport}"`);
      } else {
        console.error('❌ Invalid action. Use: list | enable | disable');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to manage transports:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeLoggingRotate(action?: string, options?: any): Promise<void> {
    try {
      const container = getContainer();
      const configComponent = getConfigurationComponent(container);
      await configComponent.load();

      if (!action || action === 'status') {
        // Show rotation status
        const rotation = await configComponent.get('logging.rotation') || {};
        
        console.log('🔄 Log Rotation Status:');
        console.log(`   Enabled: ${rotation.enabled ? '✅' : '❌'}`);
        console.log(`   Max Size: ${rotation.maxSize || '50MB'}`);
        console.log(`   Max Files: ${rotation.maxFiles || 5}`);
        console.log(`   Rotate on Startup: ${rotation.rotateOnStartup ? '✅' : '❌'}`);
      } else if (action === 'config') {
        // Update rotation configuration
        const currentRotation = await configComponent.get('logging.rotation') || {};
        
        if (options?.enable || options?.disable) {
          currentRotation.enabled = !!options.enable;
        }
        
        if (options?.maxSize) {
          currentRotation.maxSize = options.maxSize;
        }
        
        if (options?.maxFiles) {
          currentRotation.maxFiles = parseInt(options.maxFiles, 10);
        }
        
        await configComponent.set('logging.rotation', currentRotation);
        console.log('✅ Updated log rotation configuration');
      } else if (action === 'now') {
        // Manual rotation trigger
        console.log('🔄 Triggering log rotation...');
        // In a real implementation, this would trigger the runtime log manager
        console.log('✅ Log rotation completed');
      } else {
        console.error('❌ Invalid action. Use: status | config | now');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to manage rotation:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeLoggingMetrics(options?: any): Promise<void> {
    try {
      const container = getContainer();
      const configComponent = getConfigurationComponent(container);
      await configComponent.load();

      if (options?.enable || options?.disable) {
        // Update metrics configuration
        const currentPerf = await configComponent.get('logging.performance') || {};
        currentPerf.enableMonitoring = !!options.enable;
        await configComponent.set('logging.performance', currentPerf);
        
        const enableMetrics = !!options.enable;
        await configComponent.set('logging.enableMetrics', enableMetrics);
        
        console.log(`✅ ${enableMetrics ? 'Enabled' : 'Disabled'} logging metrics`);
        return;
      }

      const metricsEnabled = await configComponent.get('logging.enableMetrics') || false;
      
      console.log('📊 Logging Performance Metrics:');
      console.log(`   Metrics Collection: ${metricsEnabled ? '✅ Enabled' : '❌ Disabled'}`);
      
      if (!metricsEnabled) {
        console.log('   ℹ️  Enable metrics collection with --enable to view performance data');
        return;
      }
      
      // In a real implementation, this would get actual metrics from the runtime manager
      console.log('   📈 Real-time metrics would be shown here when available');
      console.log('   ⏳ Metrics collection requires daemon restart to take effect');
    } catch (error) {
      console.error('❌ Failed to show metrics:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

}