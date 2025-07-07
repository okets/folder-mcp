/**
 * Simple Configuration CLI Command
 * 
 * Provides configuration management for the new DEAD SIMPLE configuration system.
 * Focused on managing theme and other user preferences via config.yaml.
 */

import { Command } from 'commander';
import { ConfigManager } from '../../../application/config/ConfigManager.js';
import { NodeFileSystem } from '../../../infrastructure/filesystem/node-filesystem.js';
import { NodeFileWriter } from '../../../infrastructure/filesystem/NodeFileWriter.js';
import { YamlParser } from '../../../infrastructure/parsers/YamlParser.js';
import { SimpleSchemaValidator, SimpleThemeSchemaLoader } from '../../../application/config/SimpleSchemaValidator.js';
import chalk from 'chalk';
import * as yaml from 'yaml';

export class SimpleConfigCommand {
  private command: Command;
  private configManager?: ConfigManager;

  constructor() {
    this.command = new Command('config');
    this.setupCommand();
  }

  private setupCommand(): void {
    this.command
      .description('Manage user configuration (theme and preferences)')
      .action(() => {
        // Default action - show current config
        this.executeShow();
      });

    // Get configuration value
    this.command
      .command('get <key>')
      .description('Get a configuration value')
      .action((key) => {
        this.executeGet(key);
      });

    // Set configuration value
    this.command
      .command('set <key> <value>')
      .description('Set a configuration value')
      .action((key, value) => {
        this.executeSet(key, value);
      });

    // Show all configuration
    this.command
      .command('show')
      .description('Show current configuration')
      .option('--json', 'Output as JSON')
      .action((options) => {
        this.executeShow(options);
      });

    // Theme-specific commands
    this.command
      .command('theme [value]')
      .description('Get or set theme (light, dark, auto)')
      .action((value) => {
        if (value) {
          this.executeSetTheme(value);
        } else {
          this.executeGetTheme();
        }
      });

    // List available themes
    this.command
      .command('theme-list')
      .alias('themes')
      .description('List available themes')
      .action(() => {
        this.executeListThemes();
      });

    // Validate configuration
    this.command
      .command('validate')
      .description('Validate configuration file')
      .action(() => {
        this.executeValidate();
      });

    // Reset to defaults
    this.command
      .command('reset')
      .description('Reset configuration to defaults')
      .option('--confirm', 'Skip confirmation prompt')
      .action((options) => {
        this.executeReset(options);
      });
  }

  private async initConfigManager(): Promise<ConfigManager> {
    if (!this.configManager) {
      const fileSystem = new NodeFileSystem();
      const fileWriter = new NodeFileWriter();
      const yamlParser = new YamlParser();
      const schemaLoader = new SimpleThemeSchemaLoader();
      const validator = new SimpleSchemaValidator(schemaLoader);
      
      this.configManager = new ConfigManager(
        fileSystem,
        fileWriter,
        yamlParser,
        validator,
        schemaLoader,
        'config-defaults.yaml',
        'config.yaml'
      );
      
      try {
        await this.configManager.load();
      } catch (error) {
        console.warn(chalk.yellow('⚠️  No configuration files found, using defaults'));
      }
    }
    
    return this.configManager;
  }

  private async executeGet(key: string): Promise<void> {
    try {
      const configManager = await this.initConfigManager();
      const value = configManager.get(key);
      
      if (value === undefined) {
        console.log(chalk.yellow(`Configuration key '${key}' not found`));
      } else {
        console.log(value);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeSet(key: string, value: string): Promise<void> {
    try {
      const configManager = await this.initConfigManager();
      
      // Parse value if it looks like JSON
      let parsedValue: any = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value);
      
      await configManager.set(key, parsedValue);
      console.log(chalk.green('✅'), `Set ${key} = ${parsedValue}`);
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeShow(options?: { json?: boolean }): Promise<void> {
    try {
      const configManager = await this.initConfigManager();
      const config = configManager.getAll();
      
      if (options?.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(chalk.bold('\n📋 Current Configuration:'));
        console.log(chalk.gray('========================\n'));
        console.log(yaml.stringify(config));
        console.log(chalk.gray('\nConfiguration file: config.yaml'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeGetTheme(): Promise<void> {
    try {
      const configManager = await this.initConfigManager();
      const theme = configManager.get('theme') || 'auto';
      
      console.log(chalk.bold('Current theme:'), theme);
      console.log(chalk.gray('\nAvailable themes: light, dark, auto'));
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeSetTheme(theme: string): Promise<void> {
    try {
      const configManager = await this.initConfigManager();
      
      // Validate theme
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(theme)) {
        console.error(chalk.red('❌ Invalid theme:'), theme);
        console.log(chalk.gray('Available themes: light, dark, auto'));
        process.exit(1);
      }
      
      await configManager.set('theme', theme);
      console.log(chalk.green('✅'), `Theme set to: ${theme}`);
      console.log(chalk.gray('\nRestart the TUI to see the new theme'));
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeListThemes(): Promise<void> {
    console.log(chalk.bold('\n🎨 Available Themes:'));
    console.log(chalk.gray('===================\n'));
    
    console.log('• ' + chalk.bold('light') + ' - Light theme with dark text');
    console.log('• ' + chalk.bold('dark') + ' - Dark theme with bright colors');
    console.log('• ' + chalk.bold('auto') + ' - Use system default theme\n');
    
    try {
      const configManager = await this.initConfigManager();
      const currentTheme = configManager.get('theme') || 'auto';
      console.log(chalk.gray('Current theme:'), chalk.cyan(currentTheme));
    } catch {
      // Ignore errors when getting current theme
    }
  }

  private async executeValidate(): Promise<void> {
    try {
      const configManager = await this.initConfigManager();
      const config = configManager.getAll();
      
      console.log(chalk.bold('\n🔍 Validating Configuration...'));
      
      let hasErrors = false;
      
      // Validate each config value
      for (const [key, value] of Object.entries(config)) {
        const result = await configManager.validate(key, value);
        
        if (result.valid) {
          console.log(chalk.green('✓'), `${key}: ${value}`);
        } else {
          hasErrors = true;
          console.log(chalk.red('✗'), `${key}: ${value}`);
          if (result.errors) {
            for (const error of result.errors) {
              console.log(chalk.red('  →'), error.message);
            }
          }
        }
      }
      
      if (!hasErrors) {
        console.log(chalk.green('\n✅ Configuration is valid!'));
      } else {
        console.log(chalk.red('\n❌ Configuration has errors'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeReset(options: { confirm?: boolean }): Promise<void> {
    try {
      if (!options.confirm) {
        console.log(chalk.yellow('⚠️  This will reset your configuration to defaults'));
        console.log(chalk.gray('Use --confirm to skip this prompt'));
        return;
      }
      
      // Simply remove the config.yaml file to reset to defaults
      const fs = await import('fs/promises');
      try {
        await fs.unlink('config.yaml');
        console.log(chalk.green('✅'), 'Configuration reset to defaults');
        console.log(chalk.gray('A new config.yaml will be created when you change settings'));
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(chalk.yellow('Configuration is already at defaults'));
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  getCommand(): Command {
    return this.command;
  }
}

// Export a function to create the command
export function createSimpleConfigCommand(): Command {
  const configCommand = new SimpleConfigCommand();
  return configCommand.getCommand();
}