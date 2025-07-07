/**
 * Simple Schema Validator Implementation
 * 
 * Provides basic schema validation for configuration values
 */

import { ISchemaValidator, ISchemaLoader, ValidationResult } from '../../domain/config/ISchemaValidator.js';
import { ConfigSchema, ConfigItem, ConfigGroup } from '../../domain/config/IConfigSchema.js';

// Simple validation result for internal use
interface SimpleValidationResult {
  valid: boolean;
  error?: string;
}

export class SimpleSchemaValidator implements ISchemaValidator {
  constructor(
    private readonly schemaLoader: ISchemaLoader
  ) {}

  async validateValue(path: string, value: any, schema?: ConfigSchema): Promise<SimpleValidationResult> {
    try {
      // Get schema if not provided
      const configSchema = schema || await this.schemaLoader.loadSchema();
      
      // Get the config item schema for this path
      const itemSchema = await this.schemaLoader.getItemSchema(path);
      if (!itemSchema) {
        // No schema found - allow any value
        return { valid: true };
      }

      // When explicitly validating a value, undefined/null should be invalid
      // (different from validateByPath where undefined means field is missing)
      if (value === undefined || value === null) {
        return {
          valid: false,
          error: `Value cannot be ${value}`
        };
      }

      // Validate based on type
      const validationResult = this.validateItem(value, itemSchema);
      
      return validationResult;
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async validateConfig(config: any, schema?: ConfigSchema): Promise<ValidationResult> {
    try {
      const configSchema = schema || await this.schemaLoader.loadSchema();
      const errors: string[] = [];

      // Validate each group
      for (const [groupName, group] of Object.entries(configSchema.groups || {})) {
        const configGroup = group as ConfigGroup;
        // Validate each item in the group
        for (const [itemName, itemSchema] of Object.entries(configGroup.items || {})) {
          const path = `${groupName}.${itemName}`;
          const value = this.getValueByPath(config, path);
          
          if (value !== undefined) {
            const result = this.validateItem(value, itemSchema);
            if (!result.valid && result.error) {
              errors.push(`${path}: ${result.error}`);
            }
          } else if (itemSchema.required) {
            errors.push(`${path}: Required field is missing`);
          }
        }
      }

      if (errors.length === 0) {
        return { valid: true };
      } else {
        return {
          valid: false,
          errors: errors.map(e => {
            const [path, ...messageParts] = e.split(': ');
            return { path: path || '', message: messageParts.join(': ') || 'Validation failed' };
          })
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  async validateByPath(config: any, path: string): Promise<SimpleValidationResult> {
    const value = this.getValueByPath(config, path);
    return this.validateValue(path, value);
  }

  private validateItem(value: any, itemSchema: ConfigItem): SimpleValidationResult {
    // Handle undefined values for optional fields
    if (value === undefined) {
      if (itemSchema.required) {
        return {
          valid: false,
          error: 'Required field is missing'
        };
      }
      // Optional field with undefined value is valid
      return { valid: true };
    }

    // Type validation
    if (!this.validateType(value, itemSchema.type)) {
      return {
        valid: false,
        error: `Expected type ${itemSchema.type}, got ${typeof value}`
      };
    }

    // Enum validation
    if (itemSchema.validation?.enum) {
      if (!itemSchema.validation.enum.includes(value)) {
        return {
          valid: false,
          error: itemSchema.validation.errorMessage || 
                 `Value must be one of: ${itemSchema.validation.enum.join(', ')}`
        };
      }
    }

    // Min/Max validation for numbers
    if (itemSchema.type === 'number' && typeof value === 'number') {
      if (itemSchema.validation?.min !== undefined && value < itemSchema.validation.min) {
        return {
          valid: false,
          error: `Value must be at least ${itemSchema.validation.min}`
        };
      }
      if (itemSchema.validation?.max !== undefined && value > itemSchema.validation.max) {
        return {
          valid: false,
          error: `Value must be at most ${itemSchema.validation.max}`
        };
      }
    }

    // Pattern validation for strings
    if (itemSchema.type === 'string' && itemSchema.validation?.pattern) {
      const regex = new RegExp(itemSchema.validation.pattern);
      if (!regex.test(value)) {
        return {
          valid: false,
          error: itemSchema.validation.errorMessage || 'Value does not match required pattern'
        };
      }
    }

    return { valid: true };
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'enum':
        return typeof value === 'string'; // Enums are strings
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown types pass validation
    }
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
}

/**
 * Simple schema loader for theme schema
 */
export class SimpleThemeSchemaLoader implements ISchemaLoader {
  private schema: ConfigSchema | null = null;

  async loadSchema(): Promise<ConfigSchema> {
    if (!this.schema) {
      // Dynamically import theme schema to avoid circular dependencies
      const { themeSchema } = await import('../../domain/config/schemas/theme.schema.js');
      this.schema = themeSchema;
    }
    return this.schema;
  }

  async getItemSchema(path: string): Promise<ConfigItem | undefined> {
    const schema = await this.loadSchema();
    const [groupName, itemName] = path.split('.');
    
    if (!groupName || !itemName) {
      // Try direct lookup for simple paths
      if (path === 'theme' && schema.groups?.appearance) {
        return schema.groups.appearance.items.theme;
      }
      return undefined;
    }
    
    if (!schema.groups) {
      return undefined;
    }
    
    const group = schema.groups[groupName];
    if (!group) {
      return undefined;
    }
    
    return group.items[itemName];
  }

  isLoaded(): boolean {
    return this.schema !== null;
  }

  async reload(): Promise<void> {
    this.schema = null;
    await this.loadSchema();
  }
}