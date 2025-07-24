/**
 * User Configuration Manager Interface
 * 
 * Manages user-facing configuration that is schema-driven and stored in YAML files.
 * This is separate from ISystemConfigLoader which handles internal system configuration.
 */

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationError[];
}

/**
 * Configuration manager for user-facing settings
 * Loads and merges config-defaults.yaml and config.yaml files
 */
export interface IConfigManager {
  /**
   * Load configuration from files
   */
  load(): Promise<void>;
  
  /**
   * Get a configuration value by path (supports dot notation)
   * @param path - Configuration path (e.g., 'theme' or 'ui.theme')
   * @returns Configuration value or undefined if not found
   */
  get(path: string): any;
  
  /**
   * Set a configuration value and save to user config file
   * @param path - Configuration path
   * @param value - Value to set
   */
  set(path: string, value: any): Promise<void>;
  
  /**
   * Get all configuration values (merged defaults + user)
   */
  getAll(): any;
  
  /**
   * Validate a configuration value against the schema
   * @param path - Configuration path
   * @param value - Value to validate
   */
  validate(path: string, value: any): Promise<ValidationResult>;
  
  /**
   * Get the configuration schema
   */
  getSchema(): Promise<any>;
  
  /**
   * Check if configuration has been loaded
   */
  isLoaded(): boolean;
  
  /**
   * Reload configuration from files
   */
  reload(): Promise<void>;
}