/**
 * Enhanced Help Command Implementation
 * 
 * Provides comprehensive help with configuration context, examples, and guidance.
 * Shows current configuration state and available options.
 */

import { BaseCommand } from './base-command.js';
import { SERVICE_TOKENS } from '../../../di/interfaces.js';
import { HelpSystemService } from '../../../application/cli/HelpSystemService.js';

export class HelpCommand extends BaseCommand {
  constructor() {
    super('help');
    
    this
      .description('Show comprehensive help with configuration context')
      .argument('[command]', 'Show help for specific command')
      .option('-c, --config-only', 'Show only configuration information')
      .option('-p, --profiles-only', 'Show only profile information')  
      .option('-o, --overrides-only', 'Show only override options')
      .option('-e, --examples-only', 'Show only examples')
      .option('--json', 'Output help information as JSON')
      .action(this.execute.bind(this))
      .addGlobalOptionsAfterInit();
  }

  private async execute(command?: string, options?: any): Promise<void> {
    try {
      const folderPath = options?.folder || process.cwd();
      
      // Apply configuration overrides first
      await this.applyConfigurationOverrides(folderPath, options || {});

      const helpService = this.resolveService<HelpSystemService>(
        folderPath,
        SERVICE_TOKENS.CLI_HELP_SYSTEM_SERVICE
      );

      if (options?.json) {
        // JSON output for automation
        const helpInfo = await helpService.getConfigurationHelpInfo();
        console.log(JSON.stringify(helpInfo, null, 2));
        return;
      }

      // Determine what to show based on options
      const showConfig = options?.configOnly || (!options?.profilesOnly && !options?.overridesOnly && !options?.examplesOnly);
      const showProfiles = options?.profilesOnly || (!options?.configOnly && !options?.overridesOnly && !options?.examplesOnly);
      const showOverrides = options?.overridesOnly || (!options?.configOnly && !options?.profilesOnly && !options?.examplesOnly);
      const showExamples = options?.examplesOnly || (!options?.configOnly && !options?.profilesOnly && !options?.overridesOnly);

      // Generate comprehensive help
      const help = await helpService.generateContextualHelp({
        command,
        showConfig,
        showProfiles,
        showOverrides,
        showExamples
      });

      // Show the help header
      if (!command) {
        console.log('📚 Folder-MCP Configuration Help');
        console.log('================================');
        console.log('');
        console.log('Folder-MCP is a Model Context Protocol server that provides semantic');
        console.log('file system access to LLMs. This help system shows your current');
        console.log('configuration and available options.');
      }

      console.log(help);

      // Show additional guidance
      if (!options?.configOnly && !options?.profilesOnly && !options?.overridesOnly && !options?.examplesOnly) {
        console.log('\n📖 Additional Help:');
        console.log('===================');
        console.log('  folder-mcp help config          # Configuration management help');
        console.log('  folder-mcp help search          # Search command help');
        console.log('  folder-mcp help embed           # Embedding command help');
        console.log('  folder-mcp help --config-only   # Show only configuration info');
        console.log('  folder-mcp help --json          # Machine-readable help data');
        console.log('');
        console.log('📝 For more information, see: https://docs.anthropic.com/folder-mcp');
      }

    } catch (error) {
      console.error('❌ Failed to show help:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}