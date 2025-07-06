/**
 * JSON Output System Integration Tests
 * 
 * Tests consistent JSON output formatting across all CLI commands.
 * Validates JSON schema structure and automation-friendly output.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JsonOutputService } from '../../../src/application/cli/JsonOutputService.js';

describe('JSON Output System Integration', () => {
  let jsonService: JsonOutputService;

  beforeEach(() => {
    jsonService = new JsonOutputService();
  });

  describe('Success Response Formatting', () => {
    it('should format basic success response correctly', () => {
      const data = { message: 'Operation completed' };
      const result = jsonService.success(data);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        success: true,
        data: { message: 'Operation completed' }
      });
    });

    it('should include metadata when requested', () => {
      const data = { value: 'test' };
      const result = jsonService.success(data, { includeMetadata: true });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual({ value: 'test' });
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.timestamp).toBeDefined();
      expect(parsed.metadata.command).toBeDefined();
      expect(parsed.metadata.version).toBeDefined();
    });

    it('should format compact JSON when requested', () => {
      const data = { key: 'value' };
      const result = jsonService.success(data, { pretty: false });

      // Compact JSON should not have newlines or extra spaces
      expect(result).not.toContain('\n');
      expect(result).not.toContain('  ');
      expect(JSON.parse(result)).toEqual({
        success: true,
        data: { key: 'value' }
      });
    });

    it('should handle execution timing', () => {
      jsonService.startTiming();
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait 10ms
      }

      const result = jsonService.success({}, { includeMetadata: true });
      const parsed = JSON.parse(result);

      expect(parsed.metadata.executionTime).toBeDefined();
      expect(parsed.metadata.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Error Response Formatting', () => {
    it('should format basic error response correctly', () => {
      const result = jsonService.error('Something went wrong', 'TEST_ERROR');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Something went wrong',
          details: undefined
        }
      });
    });

    it('should include error details when provided', () => {
      const details = { field: 'embeddings.backend', value: 'invalid' };
      const result = jsonService.error('Validation failed', 'VALIDATION_ERROR', details);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe('VALIDATION_ERROR');
      expect(parsed.error.message).toBe('Validation failed');
      expect(parsed.error.details).toEqual(details);
    });

    it('should include metadata in error responses when requested', () => {
      const result = jsonService.error('Error occurred', 'ERROR', undefined, { includeMetadata: true });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBeDefined();
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.timestamp).toBeDefined();
    });
  });

  describe('Specialized Data Formatting', () => {
    it('should format configuration data correctly', () => {
      const config = {
        embeddings: { backend: 'ollama', batchSize: 32 },
        logging: { level: 'info' }
      };
      const sources = [
        { source: 'default', priority: 0, data: {} },
        { source: 'user', priority: 2, data: config }
      ];
      const activeProfile = 'development';

      const result = jsonService.formatConfigurationData(config, sources, activeProfile);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.configuration).toEqual(config);
      expect(parsed.data.sources).toEqual(sources);
      expect(parsed.data.activeProfile).toBe(activeProfile);
    });

    it('should format profile data correctly', () => {
      const profiles = [
        { name: 'development', isActive: true, path: '/dev/profile.yaml' },
        { name: 'production', isActive: false, path: '/prod/profile.yaml' }
      ];
      const activeProfile = 'development';

      const result = jsonService.formatProfileData(profiles, activeProfile);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.profiles).toEqual(profiles);
      expect(parsed.data.activeProfile).toBe(activeProfile);
      expect(parsed.data.totalProfiles).toBe(2);
    });

    it('should format search results correctly', () => {
      const results = [
        { filePath: '/test1.txt', similarity: 0.95, content: 'Test content 1' },
        { filePath: '/test2.txt', similarity: 0.87, content: 'Test content 2' }
      ];
      const query = 'test query';
      const totalResults = 5;
      const processingTime = 150;

      const result = jsonService.formatSearchResults(results, query, totalResults, processingTime);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.query).toBe(query);
      expect(parsed.data.results).toEqual(results);
      expect(parsed.data.totalResults).toBe(totalResults);
      expect(parsed.data.processingTime).toBe(processingTime);
      expect(parsed.data.pagination.count).toBe(2);
      expect(parsed.data.pagination.hasMore).toBe(true);
    });

    it('should format validation results correctly', () => {
      const errors = ['Field is required', 'Invalid value'];
      const warnings = ['Performance may be impacted'];

      const result = jsonService.formatValidationResult(false, errors, warnings);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.valid).toBe(false);
      expect(parsed.data.summary.errors).toBe(2);
      expect(parsed.data.summary.warnings).toBe(1);
      expect(parsed.data.issues.errors).toEqual(errors);
      expect(parsed.data.issues.warnings).toEqual(warnings);
    });

    it('should format operation results correctly', () => {
      const operation = 'profile-create';
      const operationResult = { profileName: 'test-profile', created: true };

      const result = jsonService.formatOperationResult(operation, operationResult);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.operation).toBe(operation);
      expect(parsed.data.result).toEqual(operationResult);
      expect(parsed.data.timestamp).toBeDefined();
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format ISO timestamps by default', () => {
      const result = jsonService.success({}, { includeMetadata: true, timestampFormat: 'iso' });
      const parsed = JSON.parse(result);

      expect(parsed.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should format unix timestamps when requested', () => {
      const result = jsonService.success({}, { includeMetadata: true, timestampFormat: 'unix' });
      const parsed = JSON.parse(result);

      expect(typeof parsed.metadata.timestamp).toBe('string');
      expect(Number(parsed.metadata.timestamp)).toBeGreaterThan(1600000000); // After 2020
    });

    it('should format human-readable timestamps when requested', () => {
      const result = jsonService.success({}, { includeMetadata: true, timestampFormat: 'human' });
      const parsed = JSON.parse(result);

      expect(typeof parsed.metadata.timestamp).toBe('string');
      expect(parsed.metadata.timestamp.length).toBeGreaterThan(10);
    });
  });

  describe('Utility Methods', () => {
    it('should detect JSON request from CLI options correctly', () => {
      expect(JsonOutputService.isJsonRequested({ json: true })).toBe(true);
      expect(JsonOutputService.isJsonRequested({ json: false })).toBe(false);
      expect(JsonOutputService.isJsonRequested({})).toBe(false);
      expect(JsonOutputService.isJsonRequested({ other: true })).toBe(false);
    });

    it('should create JSON options from CLI options correctly', () => {
      const cliOptions = {
        compact: true,
        metadata: true,
        verbose: true,
        timestampFormat: 'unix'
      };

      const jsonOptions = JsonOutputService.createOptionsFromCli(cliOptions);

      expect(jsonOptions.pretty).toBe(false); // compact: true means pretty: false
      expect(jsonOptions.includeMetadata).toBe(true);
      expect(jsonOptions.timestampFormat).toBe('unix');
    });

    it('should handle default options correctly', () => {
      const jsonOptions = JsonOutputService.createOptionsFromCli({});

      expect(jsonOptions.pretty).toBeUndefined(); // Should use default
      expect(jsonOptions.includeMetadata).toBe(false);
      expect(jsonOptions.timestampFormat).toBe('iso');
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw, but may modify the object to handle circularity
      expect(() => {
        jsonService.success(circular);
      }).not.toThrow();
    });

    it('should handle undefined and null values correctly', () => {
      expect(() => {
        jsonService.success(undefined);
      }).not.toThrow();

      expect(() => {
        jsonService.success(null);
      }).not.toThrow();

      const result = jsonService.success(null);
      const parsed = JSON.parse(result);
      expect(parsed.data).toBe(null);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle complex configuration data', () => {
      const complexConfig = {
        embeddings: {
          backend: 'ollama',
          batchSize: 32,
          modelName: 'nomic-embed-text',
          timeout: 30000
        },
        content: {
          chunkSize: 1000,
          overlap: 100,
          fileExtensions: ['.txt', '.md', '.pdf'],
          ignorePatterns: ['node_modules', '.git']
        },
        performance: {
          maxConcurrentOperations: 4,
          memoryLimit: '2GB',
          cacheEnabled: true
        }
      };

      const result = jsonService.formatConfigurationData(complexConfig);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.configuration).toEqual(complexConfig);
      
      // Verify all nested properties are preserved
      expect(parsed.data.configuration.embeddings.backend).toBe('ollama');
      expect(Array.isArray(parsed.data.configuration.content.fileExtensions)).toBe(true);
      expect(parsed.data.configuration.content.fileExtensions).toHaveLength(3);
    });

    it('should handle large search result sets', () => {
      const largeResults = Array.from({ length: 100 }, (_, i) => ({
        filePath: `/file${i}.txt`,
        similarity: 0.9 - (i * 0.001),
        chunkIndex: i % 10,
        content: `Content for file ${i}`.repeat(50) // Simulate longer content
      }));

      const result = jsonService.formatSearchResults(
        largeResults,
        'complex query with multiple terms',
        250,
        2500
      );

      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.results).toHaveLength(100);
      expect(parsed.data.totalResults).toBe(250);
      expect(parsed.data.pagination.hasMore).toBe(true);
    });
  });
});