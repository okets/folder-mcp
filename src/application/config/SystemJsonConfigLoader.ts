/**
 * System JSON Configuration Loader
 * 
 * Transitional implementation that loads configuration from system-configuration.json.
 * This replaces the complex 6-source configuration system temporarily.
 */

import { ISystemConfigLoader } from '../../domain/config/ISystemConfigLoader.js';
import { IFileSystem } from '../../domain/files/interfaces.js';
import { createConsoleLogger } from '../../infrastructure/logging/logger.js';

const logger = createConsoleLogger('warn');

/**
 * System JSON configuration loader implementation
 */
export class SystemJsonConfigLoader implements ISystemConfigLoader {
  private config: any = null;
  private loaded: boolean = false;

  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly configPath: string
  ) {
    logger.debug('SystemJsonConfigLoader initialized', { configPath });
  }

  /**
   * Load configuration from JSON file
   */
  async load(): Promise<any> {
    try {
      logger.debug(`Loading configuration from ${this.configPath}`);
      
      const content = await this.fileSystem.readFile(this.configPath);
      this.config = JSON.parse(content);
      this.loaded = true;
      
      logger.info(`Configuration loaded successfully from ${this.configPath}`);
      
      return this.config;
    } catch (error) {
      logger.error(`Failed to load configuration from ${this.configPath}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to load configuration from ${this.configPath}: ${error}`);
    }
  }

  /**
   * Get configuration value by dot-notation path
   */
  get(path: string): any {
    if (!this.loaded || !this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    try {
      return this.getByPath(this.config, path);
    } catch (error) {
      logger.debug('Failed to get configuration value', { path, error });
      return undefined;
    }
  }

  /**
   * Get all configuration values
   */
  getAll(): any {
    if (!this.loaded || !this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    // Return a deep copy to prevent external modifications
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Check if configuration is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Reload configuration from file
   */
  async reload(): Promise<any> {
    logger.debug('Reloading configuration');
    this.loaded = false;
    this.config = null;
    return this.load();
  }

  /**
   * Navigate object by dot-notation path
   */
  private getByPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array notation like 'items[0]'
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, prop, index] = arrayMatch;
        if (!prop || !index) return undefined;
        current = current?.[prop];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = current?.[key];
      }
    }

    return current;
  }
}