/**
 * Configuration Command Service Implementation
 * 
 * Application service that orchestrates configuration management operations
 * for CLI commands. Uses dependency injection for configuration management.
 */

import {
  IConfigurationCommandService,
  GetConfigOptions,
  SetConfigOptions,
  ListConfigOptions,
  ValidateConfigOptions,
  ConfigGetResult,
  ConfigSetResult,
  ConfigListResult,
  ConfigValidationResult,
  ConfigSourceInfo
} from '../../domain/cli/IConfigurationCommandService.js';
import { IConfigurationManager, IProfileManager, IConfigValidator } from '../../config/interfaces.js';

export class ConfigurationCommandService implements IConfigurationCommandService {
  constructor(
    private configManager: IConfigurationManager,
    private profileManager: IProfileManager,
    private configValidator: IConfigValidator
  ) {}

  async getConfig(path?: string, options: GetConfigOptions = {}): Promise<ConfigGetResult> {
    // Ensure configuration is loaded
    await this.configManager.load();

    // Handle profile switching if specified
    if (options.profile) {
      this.profileManager.setActiveProfile(options.profile);
      await this.configManager.load(); // Reload with new profile
    }

    // Handle getting all configuration
    if (options.all || !path) {
      const config = this.configManager.getConfig();
      return {
        value: config,
        path: path || '*',
        exists: true,
        source: options.source ? 'merged' : undefined
      };
    }

    // Get specific configuration value
    const value = this.configManager.get(path);
    const exists = value !== undefined;
    
    let source: string | undefined;
    if (options.source) {
      source = this.configManager.getSourceForPath(path);
    }

    return {
      value,
      path,
      exists,
      source
    };
  }

  async setConfig(path: string, value: any, options: SetConfigOptions = {}): Promise<ConfigSetResult> {
    // Ensure configuration is loaded
    await this.configManager.load();

    // Handle profile switching if specified
    if (options.profile) {
      this.profileManager.setActiveProfile(options.profile);
      await this.configManager.load(); // Reload with new profile
    }

    // Parse value based on type option
    let parsedValue: any = value;
    if (options.type) {
      parsedValue = this.parseValueByType(value, options.type);
    }

    // Get previous value for result
    const previousValue = this.configManager.get(path);

    // Validate before setting if requested
    if (options.validateOnly) {
      // Create a test configuration to validate
      const testConfig = { ...this.configManager.getConfig() };
      this.setNestedValue(testConfig, path, parsedValue);
      
      const validationResult = await this.configValidator.validate(testConfig);
      if (!validationResult.valid) {
        throw new Error(`Validation failed: ${validationResult.results?.map(r => r.message).join(', ')}`);
      }
      
      return {
        success: true,
        path,
        value: parsedValue,
        previousValue,
        source: 'validation-only'
      };
    }

    // Set the configuration value
    await this.configManager.set(path, parsedValue, 'runtime');

    return {
      success: true,
      path,
      value: parsedValue,
      previousValue,
      source: 'runtime'
    };
  }

  async listConfig(options: ListConfigOptions = {}): Promise<ConfigListResult> {
    // Ensure configuration is loaded
    await this.configManager.load();

    // Handle profile switching if specified
    if (options.profile) {
      this.profileManager.setActiveProfile(options.profile);
      await this.configManager.load(); // Reload with new profile
    }

    const config = this.configManager.getConfig();
    let sources: ConfigSourceInfo[] | undefined;

    if (options.sources) {
      const configSources = this.configManager.getSources();
      sources = configSources.map(source => ({
        source: source.source,
        priority: source.priority,
        path: source.path,
        loadedAt: source.loadedAt,
        data: source.data
      }));
    }

    // Flatten configuration if requested
    let resultConfig: Record<string, any> = config;
    if (options.flat) {
      resultConfig = this.flattenConfig(config);
    }

    return {
      config: resultConfig,
      sources,
      profile: options.profile || this.profileManager.getActiveProfile()
    };
  }

  async validateConfig(options: ValidateConfigOptions = {}): Promise<ConfigValidationResult> {
    let configToValidate: any;
    let targetFile: string | undefined = options.file;

    if (options.file) {
      // Validate specific file
      const fs = await import('fs/promises');
      const yaml = await import('yaml');
      
      try {
        const content = await fs.readFile(options.file, 'utf-8');
        configToValidate = yaml.parse(content);
      } catch (error) {
        return {
          valid: false,
          results: [{
            field: 'file',
            message: `Failed to read or parse file: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error'
          }],
          file: options.file
        };
      }
    } else {
      // Validate current configuration
      await this.configManager.load();
      
      if (options.profile) {
        this.profileManager.setActiveProfile(options.profile);
        await this.configManager.load();
      }
      
      configToValidate = this.configManager.getConfig();
    }

    const result = await this.configValidator.validate(configToValidate);

    return {
      valid: result.valid,
      results: result.results?.map(r => ({
        field: r.field,
        message: r.message,
        severity: r.severity === 'error' ? 'error' as const : 'warning' as const,
        suggestion: r.suggestion
      })),
      file: targetFile,
      profile: options.profile || this.profileManager.getActiveProfile()
    };
  }

  private parseValueByType(value: string, type: string): any {
    switch (type) {
      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number: ${value}`);
        }
        return numValue;
      
      case 'boolean':
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true') return true;
        if (lowerValue === 'false') return false;
        throw new Error(`Invalid boolean: ${value}. Use 'true' or 'false'`);
      
      case 'json':
        try {
          return JSON.parse(value);
        } catch (error) {
          throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
      
      case 'string':
      default:
        return value;
    }
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!key) continue; // Skip empty keys
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
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