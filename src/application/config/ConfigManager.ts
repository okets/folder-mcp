/**
 * User Configuration Manager Implementation
 * 
 * Loads and merges YAML configuration files with dependency injection pattern.
 */

import { IConfigManager, ValidationResult } from '../../domain/config/IConfigManager.js';
import { IFileSystem } from '../../domain/files/interfaces.js';
import { IFileWriter } from '../../domain/config/IFileWriter.js';
import { IYamlParser, ISchemaValidator } from '../../domain/config/ISchemaValidator.js';
import { ISchemaLoader } from '../../domain/config/IConfigSchema.js';

export class ConfigManager implements IConfigManager {
  private defaultConfig: any = {};
  private userConfig: any = {};
  private mergedConfig: any = {};
  private loaded: boolean = false;

  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly fileWriter: IFileWriter,
    private readonly yamlParser: IYamlParser,
    private readonly schemaValidator: ISchemaValidator,
    private readonly schemaLoader: ISchemaLoader,
    private readonly defaultsPath: string,
    private readonly userConfigPath: string
  ) {}

  async load(): Promise<void> {
    try {
      // Load defaults first
      const defaultsContent = await this.fileSystem.readFile(this.defaultsPath);
      this.defaultConfig = await this.yamlParser.parse(defaultsContent);
    } catch (error) {
      // If defaults file doesn't exist, start with empty defaults
      this.defaultConfig = {};
    }

    try {
      // Load user config if it exists
      const userContent = await this.fileSystem.readFile(this.userConfigPath);
      this.userConfig = await this.yamlParser.parse(userContent);
    } catch (error) {
      // If user config doesn't exist, start with empty user config
      this.userConfig = {};
    }

    // Merge configurations (user overrides defaults)
    this.mergedConfig = this.deepMerge(this.defaultConfig, this.userConfig);
    this.loaded = true;
  }

  get(path: string): any {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    
    return this.getValueByPath(this.mergedConfig, path);
  }

  async set(path: string, value: any): Promise<void> {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    // Validate the value first
    const validationResult = await this.validate(path, value);
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors?.map(e => e.message).join(', ') || 'Invalid value';
      throw new Error(`Validation failed for ${path}: ${errorMessages}`);
    }

    // Set the value in user config
    this.setValueByPath(this.userConfig, path, value);
    
    // Save user config
    await this.saveUserConfig();
    
    // Re-merge configs
    this.mergedConfig = this.deepMerge(this.defaultConfig, this.userConfig);
  }

  getAll(): any {
    if (!this.loaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    
    return { ...this.mergedConfig };
  }

  async validate(path: string, value: any): Promise<ValidationResult> {
    try {
      // Call validateValue with path and value
      const result = await this.schemaValidator.validateValue(path, value);
      
      // Convert simple result to ValidationResult with errors array
      if (result.valid) {
        return { valid: true };
      } else {
        // Cast to access error property from SimpleValidationResult
        const simpleResult = result as any;
        return {
          valid: false,
          errors: [{
            path,
            message: simpleResult.error || 'Validation failed'
          }]
        };
      }
    } catch (error) {
      // If no schema validation available, just return valid
      return { valid: true };
    }
  }

  async getSchema(): Promise<any> {
    try {
      return await this.schemaLoader.loadSchema();
    } catch (error) {
      return {};
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  async reload(): Promise<void> {
    this.loaded = false;
    await this.load();
  }

  /**
   * Save user configuration to file
   */
  private async saveUserConfig(): Promise<void> {
    const yamlContent = await this.yamlParser.stringify(this.userConfig);
    
    // Ensure directory exists
    const lastSlashIndex = this.userConfigPath.lastIndexOf('/');
    if (lastSlashIndex > 0) {
      const configDir = this.userConfigPath.substring(0, lastSlashIndex);
      await this.fileWriter.ensureDir(configDir);
    }
    
    await this.fileWriter.writeFile(this.userConfigPath, yamlContent);
  }

  /**
   * Deep merge two objects (user config overrides defaults)
   */
  private deepMerge(defaults: any, overrides: any): any {
    if (overrides === null || overrides === undefined) {
      return defaults;
    }
    
    if (defaults === null || defaults === undefined) {
      return overrides;
    }

    if (typeof defaults !== 'object' || typeof overrides !== 'object') {
      return overrides;
    }

    if (Array.isArray(overrides)) {
      return [...overrides];
    }

    const result = { ...defaults };
    
    for (const key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        if (typeof overrides[key] === 'object' && !Array.isArray(overrides[key]) && 
            typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
          result[key] = this.deepMerge(defaults[key], overrides[key]);
        } else {
          result[key] = overrides[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Get value by dot notation path
   */
  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Set value by dot notation path
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue; // Skip empty parts
      
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      current[lastPart] = value;
    }
  }
}