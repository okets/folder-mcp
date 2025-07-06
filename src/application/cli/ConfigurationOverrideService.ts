/**
 * Configuration Override Service Implementation
 * 
 * Application service that handles configuration overrides from CLI flags.
 * Provides configuration override parsing, validation, and application.
 */

import {
  IConfigurationOverrideService,
  ConfigurationOverride,
  OverrideValidationResult,
  ApplyOverridesOptions,
  OverrideFlag
} from '../../domain/cli/IConfigurationOverrideService.js';
import { IConfigurationManager } from '../../config/interfaces.js';

export class ConfigurationOverrideService implements IConfigurationOverrideService {
  constructor(
    private configManager: IConfigurationManager
  ) {}

  parseCliFlags(args: any): ConfigurationOverride[] {
    const overrides: ConfigurationOverride[] = [];

    // Parse common configuration override flags
    const flagMappings: Array<{ flag: string; path: string; type: 'string' | 'number' | 'boolean' | 'array' }> = [
      { flag: 'config', path: 'configFile', type: 'string' },
      { flag: 'profile', path: 'activeProfile', type: 'string' },
      { flag: 'backend', path: 'processing.backend', type: 'string' },
      { flag: 'logLevel', path: 'development.logLevel', type: 'string' },
      { flag: 'noCache', path: 'processing.noCache', type: 'boolean' },
      { flag: 'batchSize', path: 'processing.batchSize', type: 'number' },
      { flag: 'chunkSize', path: 'processing.chunkSize', type: 'number' },
      { flag: 'overlap', path: 'processing.overlap', type: 'number' },
      { flag: 'modelName', path: 'processing.modelName', type: 'string' },
      { flag: 'maxConcurrent', path: 'processing.maxConcurrentOperations', type: 'number' },
      { flag: 'development', path: 'development.enableDebugOutput', type: 'boolean' },
      { flag: 'verbose', path: 'development.enableDebugOutput', type: 'boolean' },
      { flag: 'quiet', path: 'development.enableDebugOutput', type: 'boolean' }
    ];

    for (const mapping of flagMappings) {
      const flagValue = args[mapping.flag];
      if (flagValue !== undefined && flagValue !== null) {
        overrides.push({
          path: mapping.path,
          value: this.parseValue(flagValue, mapping.type),
          source: 'cli-flag'
        });
      }
    }

    // Handle special flags
    if (args.noCache) {
      overrides.push({
        path: 'cache.disabled',
        value: true,
        source: 'cli-flag'
      });
    }

    return overrides;
  }

  validateOverrides(overrides: ConfigurationOverride[]): OverrideValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validOverrides: ConfigurationOverride[] = [];

    for (const override of overrides) {
      try {
        // Validate configuration path exists
        if (!this.isValidConfigPath(override.path)) {
          errors.push(`Invalid configuration path: ${override.path}`);
          continue;
        }

        // Validate value type
        const validation = this.validateOverrideValue(override);
        if (!validation.valid) {
          errors.push(`Invalid value for ${override.path}: ${validation.error}`);
          continue;
        }

        // Check for warnings
        const warning = this.checkOverrideWarnings(override);
        if (warning) {
          warnings.push(warning);
        }

        validOverrides.push(override);
      } catch (error) {
        errors.push(`Error validating override ${override.path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      appliedOverrides: validOverrides
    };
  }

  async applyOverrides(
    overrides: ConfigurationOverride[], 
    options: ApplyOverridesOptions = {}
  ): Promise<void> {
    // Validate overrides first
    const validation = this.validateOverrides(overrides);
    if (!validation.valid) {
      throw new Error(`Override validation failed: ${validation.errors.join(', ')}`);
    }

    if (options.validateOnly) {
      return; // Don't actually apply if validation-only mode
    }

    // Ensure configuration is loaded
    await this.configManager.load();

    // Apply overrides in order (CLI flags have highest precedence)
    for (const override of validation.appliedOverrides) {
      await this.configManager.set(override.path, override.value, 'runtime');
    }
  }

  getAvailableOverrides(): OverrideFlag[] {
    return [
      {
        flag: '--config',
        configPath: 'configFile',
        description: 'Override configuration file location',
        type: 'string',
        examples: ['--config ~/my-config.yaml', '--config /etc/folder-mcp/config.yaml']
      },
      {
        flag: '--profile',
        configPath: 'activeProfile',
        description: 'Use specific configuration profile',
        type: 'string',
        examples: ['--profile production', '--profile development']
      },
      {
        flag: '--backend',
        configPath: 'processing.backend',
        description: 'Override embedding backend',
        type: 'string',
        defaultValue: 'ollama',
        examples: ['--backend ollama', '--backend direct']
      },
      {
        flag: '--log-level',
        configPath: 'development.logLevel',
        description: 'Override log level',
        type: 'string',
        defaultValue: 'info',
        examples: ['--log-level debug', '--log-level warn', '--log-level error']
      },
      {
        flag: '--no-cache',
        configPath: 'processing.noCache',
        description: 'Disable caching',
        type: 'boolean',
        examples: ['--no-cache']
      },
      {
        flag: '--batch-size',
        configPath: 'processing.batchSize',
        description: 'Override processing batch size',
        type: 'number',
        defaultValue: 32,
        examples: ['--batch-size 64', '--batch-size 16']
      },
      {
        flag: '--chunk-size',
        configPath: 'processing.chunkSize',
        description: 'Override text chunk size',
        type: 'number',
        defaultValue: 500,
        examples: ['--chunk-size 1000', '--chunk-size 250']
      },
      {
        flag: '--overlap',
        configPath: 'processing.overlap',
        description: 'Override chunk overlap',
        type: 'number',
        defaultValue: 50,
        examples: ['--overlap 100', '--overlap 25']
      },
      {
        flag: '--model-name',
        configPath: 'processing.modelName',
        description: 'Override embedding model name',
        type: 'string',
        defaultValue: 'nomic-embed-text',
        examples: ['--model-name text-embedding-ada-002', '--model-name all-MiniLM-L6-v2']
      },
      {
        flag: '--max-concurrent',
        configPath: 'processing.maxConcurrentOperations',
        description: 'Override maximum concurrent operations',
        type: 'number',
        defaultValue: 4,
        examples: ['--max-concurrent 8', '--max-concurrent 2']
      },
      {
        flag: '--development',
        configPath: 'development.enableDebugOutput',
        description: 'Enable development mode',
        type: 'boolean',
        examples: ['--development']
      }
    ];
  }

  supportsOverride(path: string): boolean {
    const supportedPaths = this.getAvailableOverrides().map(o => o.configPath);
    return supportedPaths.includes(path);
  }

  private parseValue(value: any, type: string): any {
    switch (type) {
      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number: ${value}`);
        }
        return numValue;
      
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'true') return true;
          if (lowerValue === 'false') return false;
        }
        // For CLI flags without explicit values, treat as true
        return true;
      
      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value.split(',').map(s => s.trim());
          }
        }
        return [value];
      
      case 'string':
      default:
        return String(value);
    }
  }

  private isValidConfigPath(path: string): boolean {
    // Check against known configuration paths
    const knownPaths = [
      'configFile',
      'activeProfile',
      'processing.backend',
      'processing.batchSize',
      'processing.modelName',
      'processing.chunkSize',
      'processing.overlap',
      'processing.noCache',
      'processing.maxConcurrentOperations',
      'development.enableDebugOutput',
      'development.logLevel',
      'cache.disabled'
    ];

    return knownPaths.includes(path);
  }

  private validateOverrideValue(override: ConfigurationOverride): { valid: boolean; error?: string } {
    try {
      const { path, value } = override;

      // Specific validation rules
      switch (path) {
        case 'processing.batchSize':
        case 'processing.chunkSize':
        case 'processing.overlap':
        case 'processing.maxConcurrentOperations':
          if (typeof value !== 'number' || value <= 0) {
            return { valid: false, error: 'Must be a positive number' };
          }
          break;

        case 'processing.backend':
          if (!['ollama', 'direct'].includes(value)) {
            return { valid: false, error: 'Must be "ollama" or "direct"' };
          }
          break;

        case 'development.enableDebugOutput':
        case 'processing.noCache':
        case 'cache.disabled':
          if (typeof value !== 'boolean') {
            return { valid: false, error: 'Must be a boolean value' };
          }
          break;

        case 'development.logLevel':
          if (!['debug', 'info', 'warn', 'error', 'silent'].includes(value)) {
            return { valid: false, error: 'Must be one of: debug, info, warn, error, silent' };
          }
          break;
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private checkOverrideWarnings(override: ConfigurationOverride): string | null {
    const { path, value } = override;

    switch (path) {
      case 'processing.batchSize':
        if (typeof value === 'number' && value > 64) {
          return `Large batch size (${value}) may consume significant memory`;
        }
        break;

      case 'processing.chunkSize':
        if (typeof value === 'number' && (value < 100 || value > 5000)) {
          return `Chunk size (${value}) is outside recommended range (100-5000)`;
        }
        break;

      case 'processing.maxConcurrentOperations':
        if (typeof value === 'number' && value > 16) {
          return `High concurrency (${value}) may impact system performance`;
        }
        break;

      case 'development.enableDebugOutput':
        if (value === true) {
          return 'Debug output enabled - may impact performance';
        }
        break;
    }

    return null;
  }
}