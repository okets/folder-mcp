/**
 * Schema Validator Interface
 * 
 * Validates configuration values against schema definitions.
 */

import { ConfigItem, ConfigSchema } from './IConfigSchema.js';
import { ValidationResult } from './IConfigManager.js';

/**
 * Validates configuration values against schema rules
 */
export interface ISchemaValidator {
  /**
   * Validate a single value against its schema item
   * @param value - Value to validate
   * @param schema - Schema item to validate against
   */
  validateValue(value: any, schema: ConfigItem): Promise<ValidationResult>;
  
  /**
   * Validate an entire configuration object against the schema
   * @param config - Configuration object to validate
   * @param schema - Schema to validate against
   */
  validateConfig(config: any, schema: ConfigSchema): Promise<ValidationResult>;
  
  /**
   * Validate a configuration value by path
   * @param value - Value to validate
   * @param path - Configuration path (e.g., 'ui.theme')
   */
  validateByPath(value: any, path: string): Promise<ValidationResult>;
}

/**
 * YAML parser interface for parsing YAML content
 */
export interface IYamlParser {
  /**
   * Parse YAML content to object
   * @param content - YAML string content
   */
  parse(content: string): Promise<any>;
  
  /**
   * Stringify object to YAML
   * @param data - Object to convert to YAML
   */
  stringify(data: any): Promise<string>;
}

/**
 * JSON parser interface for parsing JSON content
 */
export interface IJsonParser {
  /**
   * Parse JSON content to object
   * @param content - JSON string content
   */
  parse(content: string): any;
  
  /**
   * Stringify object to JSON
   * @param data - Object to convert to JSON
   */
  stringify(data: any, pretty?: boolean): string;
}