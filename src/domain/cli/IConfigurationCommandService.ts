/**
 * Configuration Command Service Interface
 * 
 * Domain interface for configuration management command operations.
 * Provides the contract for configuration get/set/list/validate operations.
 */

export interface GetConfigOptions {
  json?: boolean;
  source?: boolean;
  all?: boolean;
  profile?: string;
}

export interface SetConfigOptions {
  type?: 'string' | 'number' | 'boolean' | 'json';
  profile?: string;
  validateOnly?: boolean;
}

export interface ListConfigOptions {
  sources?: boolean;
  profiles?: boolean;
  flat?: boolean;
  json?: boolean;
  profile?: string;
}

export interface ValidateConfigOptions {
  profile?: string | undefined;
  verbose?: boolean;
  fix?: boolean;
  file?: string | undefined;
}

export interface ConfigGetResult {
  value: any;
  source?: string | undefined;
  path: string;
  exists: boolean;
}

export interface ConfigSetResult {
  success: boolean;
  path: string;
  value: any;
  previousValue?: any;
  source: string;
}

export interface ConfigListResult {
  config: Record<string, any>;
  sources?: ConfigSourceInfo[] | undefined;
  profile?: string | undefined;
}

export interface ConfigSourceInfo {
  source: string;
  priority: number;
  path?: string | undefined;
  loadedAt: Date;
  data: Record<string, any>;
}

export interface ConfigValidationResult {
  valid: boolean;
  results?: ValidationIssue[] | undefined;
  file?: string | undefined;
  profile?: string | undefined;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string | undefined;
}

/**
 * Domain interface for configuration command operations
 */
export interface IConfigurationCommandService {
  /**
   * Get configuration value(s) by path
   */
  getConfig(path?: string, options?: GetConfigOptions): Promise<ConfigGetResult>;

  /**
   * Set configuration value at path
   */
  setConfig(path: string, value: any, options?: SetConfigOptions): Promise<ConfigSetResult>;

  /**
   * List configuration values with optional filtering
   */
  listConfig(options?: ListConfigOptions): Promise<ConfigListResult>;

  /**
   * Validate configuration
   */
  validateConfig(options?: ValidateConfigOptions): Promise<ConfigValidationResult>;
}