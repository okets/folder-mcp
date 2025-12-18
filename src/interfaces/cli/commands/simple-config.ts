/**
 * Simple Configuration CLI Command
 * 
 * Provides configuration management for the new DEAD SIMPLE configuration system.
 * Focused on managing theme and other user preferences via config.yaml.
 */

import { Command } from 'commander';
import { ConfigurationComponent } from '../../../config/ConfigurationComponent.js';
import { getContainer } from '../../../di/container.js';
import { CONFIG_SERVICE_TOKENS } from '../../../config/di-setup.js';
import chalk from 'chalk';
import * as yaml from 'yaml';

export class SimpleConfigCommand {
  private command: Command;
  private configurationComponent?: ConfigurationComponent;

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
      .description('Get or set theme (default, light, dracula, nord, ocean, etc.)')
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

  private async initConfigurationComponent(): Promise<ConfigurationComponent> {
    if (!this.configurationComponent) {
      const container = getContainer();
      this.configurationComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
      
      try {
        await this.configurationComponent.load();
      } catch (error) {
        console.warn(chalk.yellow('⚠️  No configuration files found, using defaults'));
      }
    }
    
    return this.configurationComponent;
  }

  private async executeGet(key: string): Promise<void> {
    try {
      const configComponent = await this.initConfigurationComponent();
      const value = await configComponent.get(key);
      
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
      const configComponent = await this.initConfigurationComponent();
      
      // Parse value if it looks like JSON
      let parsedValue: any = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value);
      
      await configComponent.set(key, parsedValue);
      console.log(chalk.green('✅'), `Set ${key} = ${parsedValue}`);
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeShow(options?: { json?: boolean }): Promise<void> {
    try {
      const configComponent = await this.initConfigurationComponent();
      const config = await configComponent.getAll();
      
      if (options?.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(chalk.bold('\n📋 Current Configuration:'));
        console.log(chalk.gray('========================\n'));
        console.log(yaml.stringify(config));
        console.log(chalk.gray(`\nConfiguration file: ${configComponent.getConfigFilePath()}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeGetTheme(): Promise<void> {
    try {
      const configComponent = await this.initConfigurationComponent();
      const theme = await configComponent.get('theme') || 'default';

      console.log(chalk.bold('Current theme:'), theme);
      console.log(chalk.gray('\nRun `folder-mcp config themes` to see all available themes'));
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async executeSetTheme(theme: string): Promise<void> {
    try {
      const configComponent = await this.initConfigurationComponent();
      
      // ConfigurationComponent will handle validation via ValidationRegistry
      await configComponent.set('theme', theme);
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

    console.log(chalk.bold('Core:'));
    console.log('  • ' + chalk.cyan('default') + ' - Default dark theme');
    console.log('  • ' + chalk.cyan('light') + ' - Light terminal backgrounds');
    console.log('  • ' + chalk.cyan('minimal') + ' - ASCII-only, maximum compatibility\n');

    console.log(chalk.bold('Accessibility:'));
    console.log('  • ' + chalk.cyan('high-contrast') + ' - Maximum visibility');
    console.log('  • ' + chalk.cyan('colorblind') + ' - Deuteranopia-safe (no red/green)\n');

    console.log(chalk.bold('Nature:'));
    console.log('  • ' + chalk.cyan('ocean') + ' - Blue/cyan oceanic palette');
    console.log('  • ' + chalk.cyan('forest') + ' - Green nature palette');
    console.log('  • ' + chalk.cyan('sunset') + ' - Warm orange/red palette\n');

    console.log(chalk.bold('Classic Editor:'));
    console.log('  • ' + chalk.cyan('dracula') + ' - Purple/pink vampire theme');
    console.log('  • ' + chalk.cyan('nord') + ' - Cool arctic blues');
    console.log('  • ' + chalk.cyan('monokai') + ' - Classic editor theme');
    console.log('  • ' + chalk.cyan('solarized') + ' - Ethan Schoonover\'s classic');
    console.log('  • ' + chalk.cyan('gruvbox') + ' - Retro warm theme\n');

    try {
      const configComponent = await this.initConfigurationComponent();
      const currentTheme = await configComponent.get('theme') || 'default';
      console.log(chalk.gray('Current theme:'), chalk.bold.cyan(currentTheme));
    } catch {
      // Ignore errors when getting current theme
    }
  }

  private async executeValidate(): Promise<void> {
    try {
      const configComponent = await this.initConfigurationComponent();
      
      console.log(chalk.bold('\n🔍 Validating Configuration...'));
      
      // Use ConfigurationComponent's built-in validation
      const validationResult = await configComponent.validateAll();
      
      if (validationResult.isValid) {
        console.log(chalk.green('✅ Configuration is valid!'));
      } else {
        console.log(chalk.red('❌ Configuration has errors:'));
        for (const error of validationResult.errors) {
          console.log(chalk.red(`  • ${error.path}: ${error.error}`));
        }
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
      
      const configComponent = await this.initConfigurationComponent();
      
      // Use ConfigurationComponent's built-in reset method
      await configComponent.reset();
      console.log(chalk.green('✅'), 'Configuration reset to defaults');
      console.log(chalk.gray('A new config.yaml will be created when you change settings'));
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