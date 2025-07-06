/**
 * Base Command Class
 * 
 * Provides lazy dependency injection resolution for CLI commands.
 * Commands extend this class to avoid requiring services at construction time.
 */

import { Command } from 'commander';
import { setupDependencyInjection } from '../../../di/setup.js';
import { DependencyContainer } from '../../../di/container.js';
import { SERVICE_TOKENS } from '../../../di/interfaces.js';
import { IConfigurationOverrideService } from '../../../domain/cli/IConfigurationOverrideService.js';
import { HelpSystemService } from '../../../application/cli/HelpSystemService.js';
import { JsonOutputService } from '../../../application/cli/JsonOutputService.js';

export abstract class BaseCommand extends Command {
  private _container?: DependencyContainer;
  
  constructor(name: string) {
    super(name);
    // Don't add global options here - they'll be added in addGlobalOptionsAfterInit()
  }

  /**
   * Call this after the command has been fully configured to add global options
   * This prevents conflicts with command-specific options
   */
  protected addGlobalOptionsAfterInit(): this {
    this.addGlobalConfigurationOptions();
    return this;
  }
  
  /**
   * Get or create the DI container with the provided folder path
   */
  protected getContainer(folderPath: string, logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'): DependencyContainer {
    if (!this._container) {
      this._container = setupDependencyInjection({
        folderPath,
        logLevel
      });
    }
    return this._container;
  }
  
  /**
   * Helper method to resolve a service from the container
   */
  protected resolveService<T>(folderPath: string, token: symbol, logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'): T {
    const container = this.getContainer(folderPath, logLevel);
    return container.resolve(token) as T;
  }

  /**
   * Helper method to resolve an async service from the container
   */
  protected async resolveServiceAsync<T>(folderPath: string, token: symbol, logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'): Promise<T> {
    const container = this.getContainer(folderPath, logLevel);
    return await container.resolveAsync(token) as T;
  }

  /**
   * Add global configuration override options to the command
   * Only adds options that don't conflict with existing ones
   */
  private addGlobalConfigurationOptions(): void {
    // Add options conditionally to avoid conflicts
    this.addOptionIfNotExists('--config <file>', 'Override configuration file location')
      .addOptionIfNotExists('--profile <name>', 'Use specific configuration profile')
      .addOptionIfNotExists('--backend <backend>', 'Override embedding backend (ollama, direct)')
      .addOptionIfNotExists('--log-level <level>', 'Override log level (debug, info, warn, error)')
      .addOptionIfNotExists('--no-cache', 'Disable caching')
      .addOptionIfNotExists('--batch-size <n>', 'Override processing batch size', parseInt)
      .addOptionIfNotExists('--chunk-size <n>', 'Override text chunk size', parseInt)
      .addOptionIfNotExists('--overlap <n>', 'Override chunk overlap', parseInt)
      .addOptionIfNotExists('--model-name <name>', 'Override embedding model name')
      .addOptionIfNotExists('--max-concurrent <n>', 'Override maximum concurrent operations', parseInt)
      .addOptionIfNotExists('--development', 'Enable development mode')
      .addOptionIfNotExists('--json', 'Output in JSON format for automation')
      .addOptionIfNotExists('--compact', 'Compact JSON output (no pretty printing)')
      .addOptionIfNotExists('--metadata', 'Include metadata in JSON output')
      .addOptionIfNotExists('--timestamp-format <format>', 'Timestamp format for JSON output (iso, unix, human)');
  }

  /**
   * Add an option only if it doesn't already exist
   */
  private addOptionIfNotExists(flags: string, description: string, parseArg?: (value: string, previous: any) => any): this {
    // Extract the long flag name from the flags string
    const longFlag = flags.match(/--([a-z-]+)/)?.[1];
    if (!longFlag) return this;

    // Check if option already exists
    const existingOption = this.options.find(opt => 
      opt.long === `--${longFlag}` || opt.long === longFlag
    );

    if (!existingOption) {
      if (parseArg) {
        this.option(flags, description, parseArg);
      } else {
        this.option(flags, description);
      }
    }

    return this;
  }

  /**
   * Apply configuration overrides before command execution
   */
  protected async applyConfigurationOverrides(folderPath: string, options: any): Promise<void> {
    try {
      const overrideService = this.resolveService<IConfigurationOverrideService>(
        folderPath,
        SERVICE_TOKENS.CLI_CONFIGURATION_OVERRIDE_SERVICE
      );

      // Parse CLI flags into overrides
      const overrides = overrideService.parseCliFlags(options);
      
      if (overrides.length > 0) {
        // Validate and apply overrides
        const validation = overrideService.validateOverrides(overrides);
        
        if (!validation.valid) {
          console.error('❌ Configuration override validation failed:');
          for (const error of validation.errors) {
            console.error(`  ${error}`);
          }
          process.exit(1);
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          for (const warning of validation.warnings) {
            console.warn(`⚠️  ${warning}`);
          }
        }

        // Apply the overrides
        await overrideService.applyOverrides(overrides);
        
        // Log applied overrides in debug mode
        if (options.logLevel === 'debug' || options.verbose) {
          console.debug(`✅ Applied ${overrides.length} configuration override(s)`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to apply configuration overrides:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Get help text for configuration overrides
   */
  protected getConfigurationOverrideHelp(folderPath: string): string {
    try {
      const overrideService = this.resolveService<IConfigurationOverrideService>(
        folderPath,
        SERVICE_TOKENS.CLI_CONFIGURATION_OVERRIDE_SERVICE
      );

      const availableOverrides = overrideService.getAvailableOverrides();
      
      let helpText = '\nConfiguration Override Options:\n';
      for (const override of availableOverrides) {
        helpText += `  ${override.flag.padEnd(20)} ${override.description}\n`;
        if (override.examples.length > 0) {
          helpText += `                      Example: ${override.examples[0]}\n`;
        }
      }
      
      return helpText;
    } catch (error) {
      return '\nConfiguration overrides not available.\n';
    }
  }

  /**
   * Get enhanced contextual help for the command
   */
  protected async getEnhancedHelp(folderPath: string, commandName?: string): Promise<string> {
    try {
      const helpService = this.resolveService<HelpSystemService>(
        folderPath,
        SERVICE_TOKENS.CLI_HELP_SYSTEM_SERVICE
      );

      return await helpService.generateContextualHelp({
        command: commandName || this.name(),
        showConfig: true,
        showProfiles: true,
        showOverrides: true,
        showExamples: true
      });
    } catch (error) {
      return `\nEnhanced help not available: ${error instanceof Error ? error.message : String(error)}\n`;
    }
  }

  /**
   * Override the help method to provide enhanced help
   */
  protected displayEnhancedHelp(folderPath: string = process.cwd()): void {
    // Show standard help first
    this.outputHelp();
    
    // Add enhanced contextual help
    this.getEnhancedHelp(folderPath, this.name())
      .then(enhancedHelp => {
        console.log(enhancedHelp);
      })
      .catch(error => {
        console.error(`Failed to generate enhanced help: ${error instanceof Error ? error.message : String(error)}`);
      });
  }

  /**
   * Get JSON output service for consistent JSON formatting
   */
  protected getJsonOutputService(folderPath: string): JsonOutputService {
    return this.resolveService<JsonOutputService>(
      folderPath,
      SERVICE_TOKENS.CLI_JSON_OUTPUT_SERVICE
    );
  }

  /**
   * Handle JSON output for commands
   */
  protected handleJsonOutput<T>(
    folderPath: string, 
    data: T, 
    options: any,
    formatter?: (service: JsonOutputService, data: T) => string
  ): boolean {
    if (JsonOutputService.isJsonRequested(options)) {
      const jsonService = this.getJsonOutputService(folderPath);
      const jsonOptions = JsonOutputService.createOptionsFromCli(options);
      
      if (formatter) {
        jsonService.output(formatter(jsonService, data));
      } else {
        jsonService.output(jsonService.success(data, jsonOptions));
      }
      return true;
    }
    return false;
  }

  /**
   * Handle JSON error output for commands
   */
  protected handleJsonError(
    folderPath: string,
    message: string,
    code: string = 'COMMAND_ERROR',
    details?: any,
    options: any = {}
  ): boolean {
    if (JsonOutputService.isJsonRequested(options)) {
      const jsonService = this.getJsonOutputService(folderPath);
      const jsonOptions = JsonOutputService.createOptionsFromCli(options);
      jsonService.outputError(message, code, details, jsonOptions);
      return true; // Will never reach here due to process.exit in outputError
    }
    return false;
  }
}
