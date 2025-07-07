/**
 * System Configuration Loader Interface
 * 
 * Domain interface for loading configuration from system-configuration.json.
 * This is a transitional interface that will be replaced in Phase 7 Task 3.
 */

/**
 * System configuration loader that reads from system-configuration.json
 */
export interface ISystemConfigLoader {
  /**
   * Load configuration from the JSON file
   * @returns The loaded configuration object
   * @throws Error if file cannot be read or parsed
   */
  load(): Promise<any>;

  /**
   * Get a configuration value by dot-notation path
   * @param path Dot-notation path (e.g., 'model.batchSize')
   * @returns The configuration value or undefined
   * @throws Error if configuration not loaded
   */
  get(path: string): any;

  /**
   * Get all configuration values
   * @returns A copy of the entire configuration object
   * @throws Error if configuration not loaded
   */
  getAll(): any;

  /**
   * Check if configuration has been loaded
   * @returns true if configuration is loaded
   */
  isLoaded(): boolean;

  /**
   * Reload configuration from file
   * @returns The reloaded configuration object
   * @throws Error if file cannot be read or parsed
   */
  reload(): Promise<any>;
}