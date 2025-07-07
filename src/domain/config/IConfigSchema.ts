/**
 * Configuration Schema Interfaces
 * 
 * Defines the structure for schema-driven configuration validation and UI generation.
 */

export interface ValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  custom?: string;
}

export interface UIHints {
  component?: 'text' | 'password' | 'select' | 'checkbox' | 'radio' | 'file' | 'folder' | 'detailed-select';
  placeholder?: string;
  helpText?: string;
  columns?: string[];
  destructive?: {
    level: 'warning' | 'critical';
    message: string;
    consequences?: string[];
  };
}

export interface Conditions {
  when?: { [configPath: string]: any | any[] };
  requires?: {
    gpu?: boolean;
    platform?: string[];
    feature?: string[];
  };
}

/**
 * Individual configuration item definition
 */
export interface ConfigItem {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'path' | 'array';
  label: string;
  description: string;
  required?: boolean;
  validation?: ValidationRules;
  ui?: UIHints;
  conditions?: Conditions;
  detailsSource?: string;      // Path to JSON file with option details
  detailsColumns?: string[];   // Columns to display from the data
  valueColumn?: string;        // Which column contains the option value (default: 'value')
}

/**
 * Configuration group (section) containing related items
 */
export interface ConfigGroup {
  label: string;
  description: string;
  icon?: string;
  order: number;
  items: { [key: string]: ConfigItem };
}

/**
 * Complete configuration schema
 */
export interface ConfigSchema {
  [groupName: string]: ConfigGroup;
}

/**
 * Schema loader interface for loading configuration schemas
 */
export interface ISchemaLoader {
  /**
   * Load the complete configuration schema
   */
  loadSchema(): Promise<ConfigSchema>;
  
  /**
   * Get schema for a specific configuration item
   * @param path - Configuration path (e.g., 'ui.theme')
   */
  getItemSchema(path: string): Promise<ConfigItem | undefined>;
  
  /**
   * Check if schema has been loaded
   */
  isLoaded(): boolean;
  
  /**
   * Reload schema from file
   */
  reload(): Promise<void>;
}