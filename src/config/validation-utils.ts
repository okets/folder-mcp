// Comprehensive validation utilities for folder-mcp configuration system
// Handles validation for local, resolved, and nested runtime configurations

import { VALIDATION_RULES, ValidationRule } from './schema.js';

/**
 * Validation error interface
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
  fix?: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  config?: any;
}

/**
 * Field path mapping for nested runtime configuration
 */
const RUNTIME_FIELD_PATHS: Record<string, string> = {
  // Processing fields
  'modelName': 'processing.modelName',
  'chunkSize': 'processing.chunkSize',
  'overlap': 'processing.overlap',
  'batchSize': 'processing.batchSize',
  'maxWorkers': 'processing.maxWorkers',
  'timeoutMs': 'processing.timeoutMs',
  
  // Server fields
  'port': 'server.port',
  'transport': 'server.transport',
  'host': 'server.host',
  
  // File fields
  'fileExtensions': 'files.extensions',
  'maxFileSize': 'files.maxFileSize',
  
  // Cache fields
  'maxSize': 'cache.maxSize',
  'cleanupInterval': 'cache.cleanupInterval'
};

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Validate a single field according to validation rules
 */
function validateField(value: any, rule: ValidationRule, fieldPath?: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const displayPath = fieldPath || rule.field;

  // Type validation
  if (value !== undefined && value !== null) {
    switch (rule.type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            code: 'INVALID_TYPE',
            message: `${displayPath} must be a number`,
            field: displayPath,
            value,
            severity: 'error'
          });
          return errors; // Skip further validation if type is wrong
        }
        
        // Range validation for numbers
        if (rule.min !== undefined && value < rule.min) {
          const error: ValidationError = {
            code: 'VALUE_TOO_LOW',
            message: rule.message || `${displayPath} must be at least ${rule.min}`,
            field: displayPath,
            value,
            severity: 'error'
          };
          if (rule.fix) {
            error.fix = rule.fix;
          }
          errors.push(error);
        }
        
        if (rule.max !== undefined && value > rule.max) {
          const error: ValidationError = {
            code: 'VALUE_TOO_HIGH',
            message: rule.message || `${displayPath} must be at most ${rule.max}`,
            field: displayPath,
            value,
            severity: 'error'
          };
          if (rule.fix) {
            error.fix = rule.fix;
          }
          errors.push(error);
        }
        break;
        
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `${displayPath} must be a string`,
            field: displayPath,
            value,
            severity: 'error'
          });
          return errors;
        }
        
        // Pattern validation
        if (rule.pattern && !rule.pattern.test(value)) {
          const error: ValidationError = {
            code: 'INVALID_PATTERN',
            message: rule.message || `${displayPath} has invalid format`,
            field: displayPath,
            value,
            severity: 'error'
          };
          if (rule.fix) {
            error.fix = rule.fix;
          }
          errors.push(error);
        }
        
        // Enum validation
        if (rule.values && !rule.values.includes(value)) {
          const error: ValidationError = {
            code: 'INVALID_VALUE',
            message: rule.message || `${displayPath} must be one of: ${rule.values.join(', ')}`,
            field: displayPath,
            value,
            severity: 'error'
          };
          if (rule.fix) {
            error.fix = rule.fix;
          }
          errors.push(error);
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            code: 'INVALID_TYPE',
            message: `${displayPath} must be an array`,
            field: displayPath,
            value,
            severity: 'error'
          });
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `${displayPath} must be a boolean`,
            field: displayPath,
            value,
            severity: 'error'
          });
        }
        break;
    }
  }

  // Required field validation
  if (rule.required && (value === undefined || value === null)) {
    const error: ValidationError = {
      code: 'REQUIRED_FIELD',
      message: rule.message || `${displayPath} is required`,
      field: displayPath,
      severity: 'error'
    };
    if (rule.fix) {
      error.fix = rule.fix;
    }
    errors.push(error);
  }

  return errors;
}

/**
 * Validate local configuration
 */
export function validateLocalConfig(config: any): string[] {
  const errors: string[] = [];
  
  // Get applicable rules for local config fields
  const applicableFields = ['chunkSize', 'overlap', 'batchSize', 'modelName', 'maxConcurrentOperations', 'debounceDelay'];
  
  for (const fieldName of applicableFields) {
    const rule = VALIDATION_RULES.find(r => r.field === fieldName);
    if (rule && config[fieldName] !== undefined) {
      const fieldErrors = validateField(config[fieldName], rule);
      errors.push(...fieldErrors.map(e => e.message));
    }
  }
  
  return errors;
}

/**
 * Validate resolved configuration
 */
export function validateResolvedConfig(config: any): string[] {
  const errors: string[] = [];
  
  // Resolved configs have similar structure to local configs
  const applicableFields = ['chunkSize', 'overlap', 'batchSize', 'modelName', 'maxConcurrentOperations', 'debounceDelay'];
  
  for (const fieldName of applicableFields) {
    const rule = VALIDATION_RULES.find(r => r.field === fieldName);
    if (rule && config[fieldName] !== undefined) {
      const fieldErrors = validateField(config[fieldName], rule);
      errors.push(...fieldErrors.map(e => e.message));
    }
  }
  
  return errors;
}

/**
 * Validate runtime configuration - handles nested structure
 */
export function validateRuntimeConfig(config: any): string[] {
  const errors: string[] = [];
  
  if (!config) {
    errors.push('Runtime configuration is required');
    return errors;
  }

  // Validate required top-level sections
  const requiredSections = ['system', 'processing', 'server', 'ui', 'files', 'cache', 'metadata'];
  for (const section of requiredSections) {
    if (!config[section]) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Validate fields that have rules defined, mapping to nested paths
  for (const rule of VALIDATION_RULES) {
    const runtimePath = RUNTIME_FIELD_PATHS[rule.field];
    if (runtimePath) {
      const value = getNestedValue(config, runtimePath);
      const fieldErrors = validateField(value, rule, runtimePath);
      errors.push(...fieldErrors.map(e => e.message));
    }
  }

  // Additional runtime-specific validations
  if (config.processing) {
    // Ensure processing fields that don't have rules are present
    const requiredProcessingFields = ['modelName', 'chunkSize', 'overlap', 'batchSize', 'maxWorkers', 'timeoutMs'];
    for (const field of requiredProcessingFields) {
      if (config.processing[field] === undefined) {
        errors.push(`Missing required processing field: ${field}`);
      }
    }
  }

  if (config.metadata) {
    // Validate metadata structure
    const requiredMetadataFields = ['folderPath', 'configHash', 'runtimeVersion', 'toolVersion'];
    for (const field of requiredMetadataFields) {
      if (!config.metadata[field]) {
        errors.push(`Missing required metadata field: ${field}`);
      }
    }
  }

  return errors;
}

/**
 * Generic validation function
 */
export function validateConfig(config: any, type: 'local' | 'resolved' | 'runtime' = 'local'): ValidationResult {
  let errors: string[];
  
  switch (type) {
    case 'local':
      errors = validateLocalConfig(config);
      break;
    case 'resolved':
      errors = validateResolvedConfig(config);
      break;
    case 'runtime':
      errors = validateRuntimeConfig(config);
      break;
    default:
      errors = validateLocalConfig(config);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.map((message: string) => ({
      code: 'VALIDATION_ERROR',
      message,
      severity: 'error' as const
    })),
    warnings: [],
    config
  };
}

/**
 * Comprehensive validation with detailed results
 */
export function validateConfigDetailed(config: any, type: 'local' | 'resolved' | 'runtime' = 'local'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!config) {
    errors.push({
      code: 'MISSING_CONFIG',
      message: 'Configuration object is required',
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }

  try {
    switch (type) {
      case 'local':
      case 'resolved':
        // Use existing simple validation for flat configs
        const simpleErrors = type === 'local' ? validateLocalConfig(config) : validateResolvedConfig(config);
        errors.push(...simpleErrors.map(message => ({
          code: 'VALIDATION_ERROR',
          message,
          severity: 'error' as const
        })));
        break;
        
      case 'runtime':
        // Use comprehensive nested validation for runtime configs
        const nestedErrors = validateRuntimeConfig(config);
        errors.push(...nestedErrors.map(message => ({
          code: 'VALIDATION_ERROR',
          message,
          severity: 'error' as const
        })));
        break;
    }
  } catch (error) {
    errors.push({
      code: 'VALIDATION_EXCEPTION',
      message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

// Export for backward compatibility
export { ValidationResult as ValidationResultType };
