/**
 * Configuration Override Service Interface
 * 
 * Domain interface for handling configuration overrides via CLI flags.
 * Provides the contract for applying configuration overrides with proper precedence.
 */

export interface ConfigurationOverride {
  path: string;
  value: any;
  source: 'cli-flag' | 'environment' | 'runtime';
}

export interface OverrideValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  appliedOverrides: ConfigurationOverride[];
}

export interface ApplyOverridesOptions {
  validateOnly?: boolean;
  includeEnvironment?: boolean;
  precedence?: 'cli-first' | 'config-first';
}

/**
 * Domain interface for configuration override operations
 */
export interface IConfigurationOverrideService {
  /**
   * Parse CLI flags into configuration overrides
   */
  parseCliFlags(args: any): ConfigurationOverride[];

  /**
   * Validate configuration overrides
   */
  validateOverrides(overrides: ConfigurationOverride[]): OverrideValidationResult;

  /**
   * Apply configuration overrides to current configuration
   */
  applyOverrides(
    overrides: ConfigurationOverride[], 
    options?: ApplyOverridesOptions
  ): Promise<void>;

  /**
   * Get list of available override flags
   */
  getAvailableOverrides(): OverrideFlag[];

  /**
   * Check if a configuration path supports overrides
   */
  supportsOverride(path: string): boolean;
}

export interface OverrideFlag {
  flag: string;
  configPath: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  defaultValue?: any;
  examples: string[];
}