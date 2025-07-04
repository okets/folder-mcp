/**
 * Enhanced Configuration Validation
 * 
 * Extends basic validation with cross-field validation, warnings,
 * async validators, and helpful context/suggestions.
 */

import { LocalConfig, ResolvedConfig } from '../schema.js';
import { createConsoleLogger } from '../../infrastructure/logging/logger.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

const logger = createConsoleLogger('warn');

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Validation result for a single rule
 */
export interface ValidationResult {
  field: string;
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
  context?: any;
}

/**
 * Overall validation report
 */
export interface ValidationReport {
  valid: boolean;
  hasWarnings: boolean;
  results: ValidationResult[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  name: string;
  field?: string;
  validate: (config: any, context: ValidationContext) => ValidationResult | null | Promise<ValidationResult | null>;
  dependsOn?: string[]; // Fields this rule depends on
}

/**
 * Validation context for rules
 */
export interface ValidationContext {
  fullConfig: any;
  environment: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  isProduction: boolean;
}

/**
 * Built-in validation rules
 */
export const VALIDATION_RULES: ValidationRule[] = [
  // Processing validation rules
  {
    name: 'chunkSizeRange',
    field: 'chunkSize',
    validate: (config) => {
      const chunkSize = config.chunkSize || config.processing?.chunkSize;
      if (chunkSize && (chunkSize < 100 || chunkSize > 10000)) {
        return {
          field: 'chunkSize',
          severity: ValidationSeverity.WARNING,
          message: `Chunk size ${chunkSize} is outside recommended range (100-10000)`,
          suggestion: 'Consider using a value between 500-2000 for optimal performance'
        };
      }
      return null;
    }
  },

  {
    name: 'overlapRatio',
    field: 'overlap',
    dependsOn: ['chunkSize'],
    validate: (config) => {
      const chunkSize = config.chunkSize || config.processing?.chunkSize || 1000;
      const overlap = config.overlap || config.processing?.overlap || 200;
      
      const ratio = overlap / chunkSize;
      if (ratio > 0.5) {
        return {
          field: 'overlap',
          severity: ValidationSeverity.WARNING,
          message: `Overlap ${overlap} is more than 50% of chunk size ${chunkSize}`,
          suggestion: 'High overlap ratios may impact performance. Consider reducing overlap or increasing chunk size'
        };
      }
      return null;
    }
  },

  {
    name: 'batchSizeMemory',
    field: 'batchSize',
    validate: (config, context) => {
      const batchSize = config.batchSize || config.processing?.batchSize;
      if (!batchSize) return null;

      // Estimate memory usage (rough approximation)
      const estimatedMemoryMB = batchSize * 2; // ~2MB per batch item
      
      if (estimatedMemoryMB > 500 && !context.isProduction) {
        return {
          field: 'batchSize',
          severity: ValidationSeverity.WARNING,
          message: `Batch size ${batchSize} may use ~${estimatedMemoryMB}MB memory`,
          suggestion: 'Consider reducing batch size in development environment'
        };
      }
      return null;
    }
  },

  // File validation rules
  {
    name: 'fileExtensions',
    field: 'fileExtensions',
    validate: (config) => {
      const extensions = config.fileExtensions || config.files?.extensions;
      if (!extensions || !Array.isArray(extensions)) return null;

      const invalidExtensions = extensions.filter(ext => !ext.startsWith('.'));
      if (invalidExtensions.length > 0) {
        return {
          field: 'fileExtensions',
          severity: ValidationSeverity.ERROR,
          message: `File extensions must start with a dot: ${invalidExtensions.join(', ')}`,
          suggestion: `Use ${invalidExtensions.map(ext => '.' + ext).join(', ')} instead`
        };
      }
      return null;
    }
  },

  // Model validation
  {
    name: 'modelExists',
    field: 'modelName',
    validate: async (config) => {
      const modelName = config.modelName || config.processing?.modelName;
      if (!modelName) return null;

      // Check if it's a known model
      const knownModels = [
        'nomic-embed-text',
        'nomic-embed-text-v1.5',
        'mxbai-embed-large',
        'all-minilm'
      ];

      if (!knownModels.includes(modelName)) {
        return {
          field: 'modelName',
          severity: ValidationSeverity.INFO,
          message: `Model '${modelName}' is not in the list of known models`,
          suggestion: `Known models: ${knownModels.join(', ')}`,
          context: { knownModels }
        };
      }
      return null;
    }
  },

  // Cross-field validation
  {
    name: 'workersConcurrency',
    dependsOn: ['maxWorkers', 'maxConcurrentOperations'],
    validate: (config) => {
      const maxWorkers = config.maxWorkers || config.processing?.maxWorkers || 4;
      const maxConcurrent = config.maxConcurrentOperations || config.processing?.maxConcurrentOperations || 10;

      if (maxWorkers > maxConcurrent) {
        return {
          field: 'maxWorkers',
          severity: ValidationSeverity.WARNING,
          message: `maxWorkers (${maxWorkers}) exceeds maxConcurrentOperations (${maxConcurrent})`,
          suggestion: 'Workers will be limited by concurrent operations. Consider increasing maxConcurrentOperations'
        };
      }
      return null;
    }
  },

  // Environment-specific validation
  {
    name: 'productionSettings',
    validate: (config, context) => {
      if (!context.isProduction) return null;

      const debugEnabled = config.development?.enableDebugOutput;
      if (debugEnabled) {
        return {
          field: 'development.enableDebugOutput',
          severity: ValidationSeverity.WARNING,
          message: 'Debug output is enabled in production environment',
          suggestion: 'Consider disabling debug output for better performance'
        };
      }
      return null;
    }
  },

  // Path validation
  {
    name: 'cacheDirectory',
    field: 'cacheDir',
    validate: async (config) => {
      const cacheDir = config.cacheDir;
      if (!cacheDir) return null;

      const resolvedPath = resolve(cacheDir);
      
      // Check if parent directory exists
      const parentDir = resolve(resolvedPath, '..');
      if (!existsSync(parentDir)) {
        return {
          field: 'cacheDir',
          severity: ValidationSeverity.ERROR,
          message: `Parent directory of cache path does not exist: ${parentDir}`,
          suggestion: 'Create the parent directory or use a different cache location'
        };
      }
      return null;
    }
  }
];

/**
 * Enhanced configuration validator
 */
export class EnhancedConfigValidator {
  private rules: ValidationRule[];

  constructor(customRules: ValidationRule[] = []) {
    this.rules = [...VALIDATION_RULES, ...customRules];
  }

  /**
   * Validate configuration with enhanced rules
   */
  async validate(
    config: any,
    context?: Partial<ValidationContext>
  ): Promise<ValidationReport> {
    const fullContext: ValidationContext = {
      fullConfig: config,
      environment: process.env,
      platform: process.platform,
      isProduction: process.env.NODE_ENV === 'production',
      ...context
    };

    const results: ValidationResult[] = [];

    // Run all validation rules
    for (const rule of this.rules) {
      try {
        const result = await rule.validate(config, fullContext);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        logger.error(`Validation rule '${rule.name}' failed:`, error as Error);
        results.push({
          field: rule.field || 'unknown',
          severity: ValidationSeverity.ERROR,
          message: `Validation rule '${rule.name}' failed: ${error}`,
          context: { error: String(error) }
        });
      }
    }

    // Calculate summary
    const summary = {
      errors: results.filter(r => r.severity === ValidationSeverity.ERROR).length,
      warnings: results.filter(r => r.severity === ValidationSeverity.WARNING).length,
      infos: results.filter(r => r.severity === ValidationSeverity.INFO).length
    };

    return {
      valid: summary.errors === 0,
      hasWarnings: summary.warnings > 0,
      results,
      summary
    };
  }

  /**
   * Add custom validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove validation rule by name
   */
  removeRule(name: string): void {
    this.rules = this.rules.filter(r => r.name !== name);
  }

  /**
   * Get all validation rules
   */
  getRules(): ValidationRule[] {
    return [...this.rules];
  }

  /**
   * Format validation report for display
   */
  formatReport(report: ValidationReport): string {
    if (report.results.length === 0) {
      return 'Configuration is valid';
    }

    const lines: string[] = [];
    
    // Summary
    lines.push(`Configuration validation: ${report.valid ? 'PASSED' : 'FAILED'}`);
    lines.push(`  Errors: ${report.summary.errors}`);
    lines.push(`  Warnings: ${report.summary.warnings}`);
    lines.push(`  Info: ${report.summary.infos}`);
    lines.push('');

    // Group by severity
    const grouped = {
      [ValidationSeverity.ERROR]: report.results.filter(r => r.severity === ValidationSeverity.ERROR),
      [ValidationSeverity.WARNING]: report.results.filter(r => r.severity === ValidationSeverity.WARNING),
      [ValidationSeverity.INFO]: report.results.filter(r => r.severity === ValidationSeverity.INFO)
    };

    for (const [severity, results] of Object.entries(grouped)) {
      if (results.length === 0) continue;

      lines.push(`${severity.toUpperCase()}S:`);
      for (const result of results) {
        lines.push(`  - ${result.field}: ${result.message}`);
        if (result.suggestion) {
          lines.push(`    → ${result.suggestion}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Create default validator instance
 */
export const enhancedValidator = new EnhancedConfigValidator();