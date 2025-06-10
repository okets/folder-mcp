import { ValidationError, ValidationErrorCode, ValidationResult } from './errors.js';

export interface NumericValidationRule {
  min?: number;
  max?: number;
  default?: number;
  field: string;
  message: string;
  fix?: string;
}

export class NumericValidator {
  private rules: NumericValidationRule[] = [
    {
      field: 'chunkSize',
      min: 200,
      max: 1000,
      default: 400,
      message: 'Chunk size must be between 200 and 1000 tokens',
      fix: 'Set chunkSize to a value between 200 and 1000'
    },
    {
      field: 'overlap',
      min: 0,
      max: 50,
      default: 10,
      message: 'Overlap must be between 0 and 50 percent',
      fix: 'Set overlap to a value between 0 and 50'
    },
    {
      field: 'batchSize',
      min: 1,
      max: 128,
      default: 32,
      message: 'Batch size must be between 1 and 128',
      fix: 'Set batchSize to a value between 1 and 128'
    },
    {
      field: 'workerCount',
      min: 1,
      max: 16,
      default: 4,
      message: 'Worker count must be between 1 and 16',
      fix: 'Set workerCount to a value between 1 and 16'
    },
    {
      field: 'memoryLimit',
      min: 512,
      max: 8192,
      default: 2048,
      message: 'Memory limit must be between 512MB and 8192MB',
      fix: 'Set memoryLimit to a value between 512 and 8192'
    }
  ];

  validate(config: any): ValidationResult {
    const result = new ValidationResult(true);

    for (const rule of this.rules) {
      const value = config[rule.field];
      
      // Skip if value is undefined (will use default)
      if (value === undefined) {
        continue;
      }

      // Check if value is a number
      if (typeof value !== 'number' || isNaN(value)) {
        result.addError(new ValidationError(
          ValidationErrorCode.CHUNK_SIZE_INVALID,
          `${rule.field} must be a valid number`,
          rule.field,
          value,
          `Set ${rule.field} to a valid number`
        ));
        continue;
      }

      // Check min value
      if (rule.min !== undefined && value < rule.min) {
        result.addError(new ValidationError(
          ValidationErrorCode.CHUNK_SIZE_INVALID,
          rule.message,
          rule.field,
          value,
          rule.fix
        ));
      }

      // Check max value
      if (rule.max !== undefined && value > rule.max) {
        result.addError(new ValidationError(
          ValidationErrorCode.CHUNK_SIZE_INVALID,
          rule.message,
          rule.field,
          value,
          rule.fix
        ));
      }
    }

    return result;
  }

  applyDefaults(config: any): any {
    const result = { ...config };

    for (const rule of this.rules) {
      if (result[rule.field] === undefined && rule.default !== undefined) {
        result[rule.field] = rule.default;
      }
    }

    return result;
  }
} 