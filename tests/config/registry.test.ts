/**
 * Tests for Configuration Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ConfigurationRegistry, 
  ConfigOption,
  configRegistry 
} from '../../src/config/registry.js';

describe('ConfigurationRegistry', () => {
  let registry: ConfigurationRegistry;

  beforeEach(() => {
    registry = new ConfigurationRegistry();
  });

  describe('option registration', () => {
    it('should register and retrieve options', () => {
      const option: ConfigOption = {
        path: 'test.option',
        name: 'Test Option',
        description: 'A test configuration option',
        type: 'string',
        defaultValue: 'test',
        category: 'processing',
        tags: ['test', 'example']
      };

      registry.register(option);
      
      const retrieved = registry.get('test.option');
      expect(retrieved).toEqual(option);
    });

    it('should have built-in options registered', () => {
      const chunkSize = registry.get('processing.chunkSize');
      expect(chunkSize).toBeDefined();
      expect(chunkSize?.name).toBe('Chunk Size');
      expect(chunkSize?.type).toBe('number');
      expect(chunkSize?.category).toBe('processing');
    });
  });

  describe('search functionality', () => {
    it('should search by path components', () => {
      const results = registry.search('chunk');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(opt => opt.path === 'processing.chunkSize')).toBe(true);
    });

    it('should search by name', () => {
      const results = registry.search('overlap');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(opt => opt.path === 'processing.overlap')).toBe(true);
    });

    it('should search by tags', () => {
      const results = registry.search('embedding');
      
      expect(results.length).toBeGreaterThan(0);
      // Search finds options containing 'embedding' in various fields, not just tags
      const embeddingOptions = results.filter(opt => opt.tags.includes('embedding'));
      expect(embeddingOptions.length).toBeGreaterThan(0);
    });

    it('should search case-insensitively', () => {
      const results1 = registry.search('CHUNK');
      const results2 = registry.search('chunk');
      
      expect(results1).toEqual(results2);
    });
  });

  describe('category grouping', () => {
    it('should group options by category', () => {
      const processingOptions = registry.getByCategory('processing');
      
      expect(processingOptions.length).toBeGreaterThan(0);
      expect(processingOptions.every(opt => opt.category === 'processing')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const unknownOptions = registry.getByCategory('unknown');
      expect(unknownOptions).toEqual([]);
    });
  });

  describe('tag filtering', () => {
    it('should filter options by tag', () => {
      const performanceOptions = registry.getByTag('performance');
      
      expect(performanceOptions.length).toBeGreaterThan(0);
      expect(performanceOptions.every(opt => opt.tags.includes('performance'))).toBe(true);
    });
  });

  describe('related options', () => {
    it('should get related options', () => {
      const chunkSize = registry.get('processing.chunkSize');
      expect(chunkSize?.related).toContain('processing.overlap');
      
      const related = registry.getRelated('processing.chunkSize');
      expect(related.some(opt => opt.path === 'processing.overlap')).toBe(true);
    });

    it('should return empty array for options without relations', () => {
      const option: ConfigOption = {
        path: 'test.isolated',
        name: 'Isolated Option',
        description: 'No relations',
        type: 'string',
        category: 'processing',
        tags: []
      };
      
      registry.register(option);
      const related = registry.getRelated('test.isolated');
      expect(related).toEqual([]);
    });
  });

  describe('special filters', () => {
    it('should get options requiring restart', () => {
      const option: ConfigOption = {
        path: 'test.restart',
        name: 'Restart Required',
        description: 'Requires restart',
        type: 'number',
        category: 'server',
        tags: [],
        requiresRestart: true
      };
      
      registry.register(option);
      const restartOptions = registry.getRestartRequired();
      
      expect(restartOptions.some(opt => opt.path === 'test.restart')).toBe(true);
    });

    it('should get deprecated options', () => {
      const option: ConfigOption = {
        path: 'test.deprecated',
        name: 'Deprecated Option',
        description: 'This is deprecated',
        type: 'string',
        category: 'processing',
        tags: [],
        deprecated: {
          since: '2.0.0',
          alternative: 'test.new'
        }
      };
      
      registry.register(option);
      const deprecatedOptions = registry.getDeprecated();
      
      expect(deprecatedOptions.some(opt => opt.path === 'test.deprecated')).toBe(true);
    });
  });

  describe('documentation generation', () => {
    it('should generate markdown documentation', () => {
      const docs = registry.generateDocumentation('markdown');
      
      expect(docs).toContain('# Configuration Options');
      expect(docs).toContain('## Processing Options');
      expect(docs).toContain('### `processing.chunkSize`');
      expect(docs).toContain('**Chunk Size**');
      expect(docs).toContain('- **Type**: `number`');
      expect(docs).toContain('- **Default**: `400`');
    });

    it('should generate JSON documentation', () => {
      const docs = registry.generateDocumentation('json');
      const parsed = JSON.parse(docs);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed.some((opt: any) => opt.path === 'processing.chunkSize')).toBe(true);
    });

    it('should include all metadata in documentation', () => {
      const option: ConfigOption = {
        path: 'test.full',
        name: 'Full Option',
        description: 'Option with all metadata',
        type: 'number',
        defaultValue: 42,
        examples: [10, 20, 42],
        category: 'processing',
        tags: ['test'],
        related: ['test.other'],
        validation: {
          min: 1,
          max: 100
        },
        envVar: 'TEST_FULL',
        cliArg: '--test-full',
        requiresRestart: true,
        advanced: true,
        deprecated: {
          since: '1.0.0',
          alternative: 'test.new'
        }
      };
      
      registry.register(option);
      const docs = registry.generateDocumentation('markdown');
      
      expect(docs).toContain('### `test.full`');
      expect(docs).toContain('- **Range**: 1 - 100');
      expect(docs).toContain('- **Environment variable**: `TEST_FULL`');
      expect(docs).toContain('- **CLI argument**: `--test-full`');
      expect(docs).toContain('- **Examples**:');
      expect(docs).toContain('- **Note**: This is an advanced option');
      expect(docs).toContain('- **Note**: Changing this option requires restart');
      expect(docs).toContain('- **DEPRECATED**: Since 1.0.0');
      expect(docs).toContain('- **Related**: `test.other`');
    });
  });

  describe('singleton instance', () => {
    it('should provide a singleton instance', () => {
      expect(configRegistry).toBeDefined();
      expect(configRegistry).toBeInstanceOf(ConfigurationRegistry);
      
      // Should have built-in options
      const chunkSize = configRegistry.get('processing.chunkSize');
      expect(chunkSize).toBeDefined();
    });
  });
});