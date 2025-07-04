/**
 * Tests for Enhanced Configuration Validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  EnhancedConfigValidator, 
  ValidationSeverity,
  ValidationRule,
  ValidationContext
} from '../../src/config/validation/enhanced.js';

describe('EnhancedConfigValidator', () => {
  let validator: EnhancedConfigValidator;

  beforeEach(() => {
    validator = new EnhancedConfigValidator();
  });

  describe('built-in rules', () => {
    it('should validate chunk size range', async () => {
      const config = {
        processing: {
          chunkSize: 50, // Too small
          overlap: 5 // Small overlap to avoid ratio warning
        }
      };

      const report = await validator.validate(config);
      
      expect(report.valid).toBe(true); // Warnings don't make it invalid
      expect(report.hasWarnings).toBe(true);
      expect(report.summary.warnings).toBe(1);
      
      const warning = report.results.find(r => r.field === 'chunkSize');
      expect(warning?.severity).toBe(ValidationSeverity.WARNING);
      expect(warning?.message).toContain('outside recommended range');
      expect(warning?.suggestion).toBeDefined();
    });

    it('should validate overlap ratio', async () => {
      const config = {
        processing: {
          chunkSize: 1000,
          overlap: 600 // More than 50%
        }
      };

      const report = await validator.validate(config);
      
      expect(report.hasWarnings).toBe(true);
      
      const warning = report.results.find(r => r.field === 'overlap');
      expect(warning?.severity).toBe(ValidationSeverity.WARNING);
      expect(warning?.message).toContain('more than 50%');
    });

    it('should validate file extensions format', async () => {
      const config = {
        fileExtensions: ['txt', '.md', 'pdf'] // Some missing dots
      };

      const report = await validator.validate(config);
      
      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBe(1);
      
      const error = report.results.find(r => r.field === 'fileExtensions');
      expect(error?.severity).toBe(ValidationSeverity.ERROR);
      expect(error?.message).toContain('must start with a dot');
      expect(error?.suggestion).toContain('.txt');
      expect(error?.suggestion).toContain('.pdf');
    });

    it('should validate known models', async () => {
      const config = {
        processing: {
          modelName: 'unknown-model'
        }
      };

      const report = await validator.validate(config);
      
      expect(report.valid).toBe(true); // Info doesn't make it invalid
      
      const info = report.results.find(r => r.field === 'modelName');
      expect(info?.severity).toBe(ValidationSeverity.INFO);
      expect(info?.context?.knownModels).toBeDefined();
    });

    it('should validate workers vs concurrent operations', async () => {
      const config = {
        processing: {
          maxWorkers: 10,
          maxConcurrentOperations: 5 // Less than workers
        }
      };

      const report = await validator.validate(config);
      
      expect(report.hasWarnings).toBe(true);
      
      const warning = report.results.find(r => r.field === 'maxWorkers');
      expect(warning?.message).toContain('exceeds maxConcurrentOperations');
    });

    it('should validate production settings', async () => {
      const config = {
        development: {
          enableDebugOutput: true
        }
      };

      const context: Partial<ValidationContext> = {
        isProduction: true
      };

      const report = await validator.validate(config, context);
      
      expect(report.hasWarnings).toBe(true);
      
      const warning = report.results.find(r => r.field === 'development.enableDebugOutput');
      expect(warning?.message).toContain('enabled in production');
    });
  });

  describe('custom rules', () => {
    it('should add and execute custom rules', async () => {
      const customRule: ValidationRule = {
        name: 'customTest',
        field: 'testField',
        validate: (config) => {
          if (config.testField === 'invalid') {
            return {
              field: 'testField',
              severity: ValidationSeverity.ERROR,
              message: 'Test field is invalid'
            };
          }
          return null;
        }
      };

      validator.addRule(customRule);
      
      const config = { testField: 'invalid' };
      const report = await validator.validate(config);
      
      expect(report.valid).toBe(false);
      expect(report.results.some(r => r.field === 'testField')).toBe(true);
    });

    it('should remove rules by name', async () => {
      validator.removeRule('chunkSizeRange');
      
      const config = {
        processing: {
          chunkSize: 50 // Would normally trigger warning
        }
      };

      const report = await validator.validate(config);
      
      expect(report.results.find(r => r.field === 'chunkSize')).toBeUndefined();
    });
  });

  describe('async validation', () => {
    it('should handle async validation rules', async () => {
      const asyncRule: ValidationRule = {
        name: 'asyncTest',
        validate: async (config) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          
          if (config.asyncTest) {
            return {
              field: 'asyncTest',
              severity: ValidationSeverity.INFO,
              message: 'Async validation completed'
            };
          }
          return null;
        }
      };

      validator.addRule(asyncRule);
      
      const config = { asyncTest: true };
      const report = await validator.validate(config);
      
      expect(report.results.some(r => r.message === 'Async validation completed')).toBe(true);
    });
  });

  describe('report formatting', () => {
    it('should format empty report', () => {
      const report = {
        valid: true,
        hasWarnings: false,
        results: [],
        summary: { errors: 0, warnings: 0, infos: 0 }
      };

      const formatted = validator.formatReport(report);
      expect(formatted).toBe('Configuration is valid');
    });

    it('should format report with mixed severities', async () => {
      const config = {
        fileExtensions: ['txt'], // Error
        processing: {
          chunkSize: 50, // Warning
          modelName: 'unknown' // Info
        }
      };

      const report = await validator.validate(config);
      const formatted = validator.formatReport(report);
      
      expect(formatted).toContain('FAILED');
      expect(formatted).toContain('Errors: 1');
      expect(formatted).toContain('Warnings: 2'); // chunkSize + overlap warnings
      expect(formatted).toContain('Info: 1');
      expect(formatted).toContain('ERRORS:');
      expect(formatted).toContain('WARNINGS:');
      expect(formatted).toContain('INFOS:');
    });
  });

  describe('error handling', () => {
    it('should handle validation rule errors gracefully', async () => {
      const errorRule: ValidationRule = {
        name: 'errorRule',
        validate: () => {
          throw new Error('Rule execution failed');
        }
      };

      validator.addRule(errorRule);
      
      const config = {};
      const report = await validator.validate(config);
      
      // Should continue with other rules
      expect(report.results.some(r => r.message.includes('Rule execution failed'))).toBe(true);
    });
  });
});