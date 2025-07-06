/**
 * Enhanced Help System Service Implementation
 * 
 * Application service that provides context-aware help with configuration information.
 * Shows current configuration state, available overrides, and practical examples.
 */

import { IConfigurationManager, IProfileManager } from '../../config/interfaces.js';
import { IConfigurationOverrideService } from '../../domain/cli/IConfigurationOverrideService.js';

export interface HelpContextOptions {
  showConfig?: boolean;
  showOverrides?: boolean;
  showProfiles?: boolean;
  showExamples?: boolean;
  command?: string | undefined;
}

export interface ConfigurationHelpInfo {
  currentConfig: Record<string, any>;
  activeProfile?: string;
  availableProfiles: string[];
  configSources: Array<{
    source: string;
    priority: number;
    path?: string | undefined;
  }>;
  availableOverrides: Array<{
    flag: string;
    description: string;
    currentValue?: any;
    example: string;
  }>;
}

export class HelpSystemService {
  constructor(
    private configManager: IConfigurationManager,
    private profileManager: IProfileManager,
    private overrideService: IConfigurationOverrideService
  ) {}

  async generateContextualHelp(options: HelpContextOptions = {}): Promise<string> {
    try {
      await this.configManager.load();
      
      let helpText = '';

      // Add command-specific help header
      if (options.command) {
        helpText += this.getCommandSpecificHelp(options.command);
      }

      // Add configuration context
      if (options.showConfig !== false) {
        helpText += await this.getConfigurationContext();
      }

      // Add profile information
      if (options.showProfiles !== false) {
        helpText += await this.getProfileContext();
      }

      // Add override information
      if (options.showOverrides !== false) {
        helpText += this.getOverrideContext();
      }

      // Add practical examples
      if (options.showExamples !== false) {
        helpText += this.getExamplesContext(options.command);
      }

      return helpText;
    } catch (error) {
      return `\nHelp system error: ${error instanceof Error ? error.message : String(error)}\n`;
    }
  }

  async getConfigurationHelpInfo(): Promise<ConfigurationHelpInfo> {
    await this.configManager.load();
    
    const currentConfig = this.configManager.getConfig();
    const activeProfile = this.profileManager.getActiveProfile();
    const availableProfiles = await this.profileManager.list();
    const sources = this.configManager.getSources();
    const overrides = this.overrideService.getAvailableOverrides();

    return {
      currentConfig,
      activeProfile,
      availableProfiles,
      configSources: sources.map(s => ({
        source: s.source,
        priority: s.priority,
        path: s.path || undefined
      })),
      availableOverrides: overrides.map(o => ({
        flag: o.flag,
        description: o.description,
        currentValue: this.getCurrentOverrideValue(o.configPath),
        example: o.examples[0] || o.flag
      }))
    };
  }

  private async getConfigurationContext(): Promise<string> {
    const config = this.configManager.getConfig();
    const sources = this.configManager.getSources();
    
    let context = '\n📊 Current Configuration Context:\n';
    context += '=====================================\n';
    
    // Show key configuration values
    const keyConfigs = [
      { path: 'embeddings.backend', label: 'Embedding Backend' },
      { path: 'embeddings.modelName', label: 'Model Name' },
      { path: 'embeddings.batchSize', label: 'Batch Size' },
      { path: 'content.chunkSize', label: 'Chunk Size' },
      { path: 'logging.level', label: 'Log Level' },
      { path: 'development.enabled', label: 'Development Mode' }
    ];

    for (const { path, label } of keyConfigs) {
      const value = this.getConfigValue(config, path);
      const source = this.configManager.getSourceForPath(path);
      context += `  ${label.padEnd(18)}: ${String(value).padEnd(15)} (from ${source || 'default'})\n`;
    }

    // Show configuration sources
    context += '\n📁 Configuration Sources:\n';
    for (const source of sources) {
      const indicator = source.priority === Math.max(...sources.map(s => s.priority)) ? '🔶' : '  ';
      context += `  ${indicator} ${source.source.padEnd(12)} (priority ${source.priority})`;
      if (source.path) {
        context += ` - ${source.path}`;
      }
      context += '\n';
    }

    return context;
  }

  private async getProfileContext(): Promise<string> {
    const activeProfile = this.profileManager.getActiveProfile();
    const availableProfiles = await this.profileManager.list();
    
    let context = '\n👤 Profile Information:\n';
    context += '=======================\n';
    
    if (activeProfile) {
      context += `  Active Profile: ${activeProfile}\n`;
    } else {
      context += '  Active Profile: (none - using default configuration)\n';
    }
    
    if (availableProfiles.length > 0) {
      context += `  Available Profiles: ${availableProfiles.join(', ')}\n`;
      context += '\n  💡 Switch profiles with: folder-mcp config profile set <name>\n';
    } else {
      context += '  Available Profiles: (none)\n';
      context += '\n  💡 Create a profile with: folder-mcp config profile create <name>\n';
    }

    return context;
  }

  private getOverrideContext(): string {
    const overrides = this.overrideService.getAvailableOverrides();
    
    let context = '\n⚙️  Configuration Override Options:\n';
    context += '==================================\n';
    
    // Group overrides by category
    const categories = {
      'Core Settings': ['--backend', '--log-level', '--profile'],
      'Performance': ['--batch-size', '--chunk-size', '--max-concurrent'],
      'Development': ['--development', '--no-cache'],
      'Content Processing': ['--model-name', '--overlap']
    };

    for (const [category, flags] of Object.entries(categories)) {
      context += `\n  ${category}:\n`;
      for (const flag of flags) {
        const override = overrides.find(o => o.flag === flag);
        if (override) {
          const currentValue = this.getCurrentOverrideValue(override.configPath);
          context += `    ${override.flag.padEnd(18)} ${override.description}\n`;
          if (currentValue !== undefined) {
            context += `    ${' '.repeat(18)} Current: ${String(currentValue)}\n`;
          }
          if (override.examples.length > 0) {
            context += `    ${' '.repeat(18)} Example: ${override.examples[0]}\n`;
          }
        }
      }
    }

    context += '\n  💡 All commands accept these override flags for temporary configuration changes.\n';
    
    return context;
  }

  private getExamplesContext(command?: string): string {
    let context = '\n🚀 Practical Examples:\n';
    context += '======================\n';

    if (command) {
      context += this.getCommandSpecificExamples(command);
    } else {
      context += this.getGeneralExamples();
    }

    return context;
  }

  private getCommandSpecificHelp(command: string): string {
    const commandHelp = {
      search: '\n🔍 Search Command Configuration Help:\n' +
              '====================================\n' +
              'The search command respects configuration for embedding backend, model selection, and performance tuning.\n',
      
      config: '\n⚙️  Configuration Command Help:\n' +
              '==============================\n' +
              'Manage your folder-mcp configuration with these commands.\n',
      
      embed: '\n📊 Embed Command Configuration Help:\n' +
             '===================================\n' +
             'The embed command uses configuration for chunk size, batch processing, and model selection.\n'
    };

    return commandHelp[command as keyof typeof commandHelp] || '';
  }

  private getCommandSpecificExamples(command: string): string {
    const examples = {
      search: '  # Search with different backends:\n' +
              '  folder-mcp search "machine learning" --backend ollama\n' +
              '  folder-mcp search "deployment" --backend direct --model-name text-embedding-ada-002\n' +
              '\n' +
              '  # Search with performance tuning:\n' +
              '  folder-mcp search "optimization" --batch-size 64 --max-concurrent 8\n' +
              '\n' +
              '  # Search with specific profile:\n' +
              '  folder-mcp search "testing" --profile production\n',

      config: '  # View and modify configuration:\n' +
              '  folder-mcp config get embeddings.backend\n' +
              '  folder-mcp config set embeddings.batchSize 64\n' +
              '  folder-mcp config show --sources\n' +
              '\n' +
              '  # Profile management:\n' +
              '  folder-mcp config profile create development --template development\n' +
              '  folder-mcp config profile set production\n' +
              '  folder-mcp config profile copy development testing\n',

      embed: '  # Embed with different configurations:\n' +
             '  folder-mcp embed ~/Documents --chunk-size 1000 --overlap 100\n' +
             '  folder-mcp embed ~/Code --backend direct --batch-size 32\n' +
             '\n' +
             '  # Embed with development settings:\n' +
             '  folder-mcp embed ~/Project --development --log-level debug\n'
    };

    return examples[command as keyof typeof examples] || this.getGeneralExamples();
  }

  private getGeneralExamples(): string {
    return '  # Common configuration override patterns:\n' +
           '  folder-mcp <command> --backend ollama           # Use local Ollama\n' +
           '  folder-mcp <command> --backend direct           # Use API directly\n' +
           '  folder-mcp <command> --profile production       # Use production profile\n' +
           '  folder-mcp <command> --development              # Enable development mode\n' +
           '  folder-mcp <command> --no-cache                 # Disable caching\n' +
           '  folder-mcp <command> --json                     # JSON output for automation\n' +
           '\n' +
           '  # Performance tuning:\n' +
           '  folder-mcp <command> --batch-size 64 --max-concurrent 8  # High performance\n' +
           '  folder-mcp <command> --batch-size 16 --max-concurrent 2  # Conservative\n' +
           '\n' +
           '  # Configuration management:\n' +
           '  folder-mcp config show --sources               # View all config sources\n' +
           '  folder-mcp config profile list                 # List available profiles\n' +
           '  folder-mcp config get embeddings               # View embedding config\n';
  }

  private getConfigValue(config: any, path: string): any {
    const keys = path.split('.');
    let current = config;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private getCurrentOverrideValue(configPath: string): any {
    try {
      const config = this.configManager.getConfig();
      return this.getConfigValue(config, configPath);
    } catch {
      return undefined;
    }
  }
}