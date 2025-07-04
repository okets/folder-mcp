/**
 * Configuration Registry
 * 
 * Central registry of all configurable options with metadata,
 * descriptions, and relationships. Used for CLI/TUI discovery,
 * documentation generation, and configuration validation.
 */

import { ValidationRule, VALIDATION_RULES } from './schema.js';
import { createConsoleLogger } from '../infrastructure/logging/logger.js';

const logger = createConsoleLogger('warn');

/**
 * Configuration option metadata
 */
export interface ConfigOption {
  /**
   * Unique identifier for the option (dot notation path)
   */
  path: string;

  /**
   * Display name for UI
   */
  name: string;

  /**
   * Detailed description
   */
  description: string;

  /**
   * Data type
   */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  /**
   * Default value
   */
  defaultValue?: any;

  /**
   * Example values
   */
  examples?: any[];

  /**
   * Category for grouping
   */
  category: 'processing' | 'files' | 'server' | 'cache' | 'transport' | 'development' | 'performance';

  /**
   * Tags for search/filtering
   */
  tags: string[];

  /**
   * Related options
   */
  related?: string[];

  /**
   * Validation constraints
   */
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    values?: readonly any[];
    custom?: (value: any) => boolean;
  };

  /**
   * Environment variable name
   */
  envVar?: string;

  /**
   * CLI argument
   */
  cliArg?: string;

  /**
   * Whether this option requires restart
   */
  requiresRestart?: boolean;

  /**
   * Whether this option is advanced/expert
   */
  advanced?: boolean;

  /**
   * Deprecation info
   */
  deprecated?: {
    since: string;
    alternative?: string;
    removal?: string;
  };
}

/**
 * Configuration registry
 */
export class ConfigurationRegistry {
  private options: Map<string, ConfigOption> = new Map();
  private categories: Map<string, ConfigOption[]> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.registerBuiltInOptions();
    this.buildSearchIndex();
  }

  /**
   * Register a configuration option
   */
  register(option: ConfigOption): void {
    this.options.set(option.path, option);
    
    // Add to category index
    const categoryOptions = this.categories.get(option.category) || [];
    categoryOptions.push(option);
    this.categories.set(option.category, categoryOptions);
    
    // Update search index
    this.addToSearchIndex(option);
    
    logger.debug('Registered configuration option:', { path: option.path });
  }

  /**
   * Get option by path
   */
  get(path: string): ConfigOption | undefined {
    return this.options.get(path);
  }

  /**
   * Get all options
   */
  getAll(): ConfigOption[] {
    return Array.from(this.options.values());
  }

  /**
   * Get options by category
   */
  getByCategory(category: string): ConfigOption[] {
    return this.categories.get(category) || [];
  }

  /**
   * Search options
   */
  search(query: string): ConfigOption[] {
    const normalizedQuery = query.toLowerCase();
    const matchingPaths = new Set<string>();

    // Search in index
    for (const [term, paths] of this.searchIndex) {
      if (term.includes(normalizedQuery)) {
        paths.forEach(path => matchingPaths.add(path));
      }
    }

    // Return matching options
    return Array.from(matchingPaths)
      .map(path => this.options.get(path))
      .filter((opt): opt is ConfigOption => opt !== undefined);
  }

  /**
   * Get options by tag
   */
  getByTag(tag: string): ConfigOption[] {
    return this.getAll().filter(opt => opt.tags.includes(tag));
  }

  /**
   * Get related options
   */
  getRelated(path: string): ConfigOption[] {
    const option = this.get(path);
    if (!option?.related) return [];

    return option.related
      .map(relatedPath => this.get(relatedPath))
      .filter((opt): opt is ConfigOption => opt !== undefined);
  }

  /**
   * Get options that require restart
   */
  getRestartRequired(): ConfigOption[] {
    return this.getAll().filter(opt => opt.requiresRestart);
  }

  /**
   * Get deprecated options
   */
  getDeprecated(): ConfigOption[] {
    return this.getAll().filter(opt => opt.deprecated);
  }

  /**
   * Generate documentation
   */
  generateDocumentation(format: 'markdown' | 'json' = 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify(this.getAll(), null, 2);
    }

    const lines: string[] = [
      '# Configuration Options',
      '',
      'This document lists all available configuration options for folder-mcp.',
      ''
    ];

    // Group by category
    const categories = Array.from(this.categories.keys()).sort();
    
    for (const category of categories) {
      const options = this.categories.get(category) || [];
      if (options.length === 0) continue;

      lines.push(`## ${this.formatCategoryName(category)}`, '');

      for (const option of options.sort((a, b) => a.path.localeCompare(b.path))) {
        lines.push(`### \`${option.path}\``, '');
        lines.push(`**${option.name}**`, '');
        lines.push(option.description, '');

        // Type and default
        lines.push(`- **Type**: \`${option.type}\``);
        if (option.defaultValue !== undefined) {
          lines.push(`- **Default**: \`${JSON.stringify(option.defaultValue)}\``);
        }

        // Validation
        if (option.validation) {
          if (option.validation.min !== undefined || option.validation.max !== undefined) {
            lines.push(`- **Range**: ${option.validation.min ?? 'unlimited'} - ${option.validation.max ?? 'unlimited'}`);
          }
          if (option.validation.values) {
            lines.push(`- **Allowed values**: ${option.validation.values.map(v => `\`${v}\``).join(', ')}`);
          }
        }

        // Environment variable
        if (option.envVar) {
          lines.push(`- **Environment variable**: \`${option.envVar}\``);
        }

        // CLI argument
        if (option.cliArg) {
          lines.push(`- **CLI argument**: \`${option.cliArg}\``);
        }

        // Examples
        if (option.examples && option.examples.length > 0) {
          lines.push('- **Examples**:');
          for (const example of option.examples) {
            lines.push(`  - \`${JSON.stringify(example)}\``);
          }
        }

        // Advanced/restart required
        if (option.advanced) {
          lines.push('- **Note**: This is an advanced option');
        }
        if (option.requiresRestart) {
          lines.push('- **Note**: Changing this option requires restart');
        }

        // Deprecation
        if (option.deprecated) {
          lines.push(`- **DEPRECATED**: Since ${option.deprecated.since}`);
          if (option.deprecated.alternative) {
            lines.push(`  - Use \`${option.deprecated.alternative}\` instead`);
          }
        }

        // Related options
        if (option.related && option.related.length > 0) {
          lines.push(`- **Related**: ${option.related.map(r => `\`${r}\``).join(', ')}`);
        }

        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Register built-in options
   */
  private registerBuiltInOptions(): void {
    // Processing options
    this.register({
      path: 'processing.chunkSize',
      name: 'Chunk Size',
      description: 'Size of text chunks for embedding generation. Larger chunks provide more context but may be less precise.',
      type: 'number',
      defaultValue: 400,
      examples: [400, 600, 1000],
      category: 'processing',
      tags: ['embedding', 'performance', 'quality'],
      related: ['processing.overlap'],
      validation: {
        min: 200,
        max: 10000
      },
      envVar: 'FOLDER_MCP_PROCESSING_CHUNK_SIZE',
      cliArg: '--chunk-size'
    });

    this.register({
      path: 'processing.overlap',
      name: 'Chunk Overlap',
      description: 'Percentage of overlap between consecutive chunks. Higher overlap improves context continuity.',
      type: 'number',
      defaultValue: 10,
      examples: [10, 20, 30],
      category: 'processing',
      tags: ['embedding', 'quality'],
      related: ['processing.chunkSize'],
      validation: {
        min: 0,
        max: 50
      },
      envVar: 'FOLDER_MCP_PROCESSING_OVERLAP',
      cliArg: '--overlap'
    });

    this.register({
      path: 'processing.batchSize',
      name: 'Batch Size',
      description: 'Number of items to process in parallel. Higher values improve throughput but use more memory.',
      type: 'number',
      defaultValue: 32,
      examples: [16, 32, 64],
      category: 'processing',
      tags: ['performance', 'memory'],
      related: ['processing.maxConcurrentOperations'],
      validation: {
        min: 1,
        max: 128
      },
      envVar: 'FOLDER_MCP_PROCESSING_BATCH_SIZE',
      cliArg: '--batch-size'
    });

    this.register({
      path: 'processing.modelName',
      name: 'Embedding Model',
      description: 'Name of the embedding model to use. Must be available in your embedding backend.',
      type: 'string',
      defaultValue: 'nomic-embed-text',
      examples: ['nomic-embed-text', 'nomic-embed-text-v1.5', 'mxbai-embed-large'],
      category: 'processing',
      tags: ['embedding', 'model', 'quality'],
      envVar: 'FOLDER_MCP_PROCESSING_MODEL_NAME',
      cliArg: '--model-name'
    });

    // File options
    this.register({
      path: 'files.extensions',
      name: 'File Extensions',
      description: 'List of file extensions to process. Extensions must start with a dot.',
      type: 'array',
      defaultValue: ['.txt', '.md', '.pdf', '.docx'],
      examples: [['.txt', '.md'], ['.pdf', '.doc', '.docx']],
      category: 'files',
      tags: ['filtering', 'input'],
      envVar: 'FOLDER_MCP_FILES_EXTENSIONS',
      cliArg: '--file-extensions'
    });

    this.register({
      path: 'files.ignorePatterns',
      name: 'Ignore Patterns',
      description: 'Glob patterns for files and directories to ignore.',
      type: 'array',
      defaultValue: ['node_modules/**', '.git/**', '*.tmp'],
      examples: [['*.log', '*.tmp'], ['dist/**', 'build/**']],
      category: 'files',
      tags: ['filtering', 'exclusion'],
      envVar: 'FOLDER_MCP_FILES_IGNORE_PATTERNS'
    });

    // Development options
    this.register({
      path: 'development.enableDebugOutput',
      name: 'Enable Debug Output',
      description: 'Enable detailed debug logging for troubleshooting.',
      type: 'boolean',
      defaultValue: false,
      category: 'development',
      tags: ['debugging', 'logging'],
      envVar: 'FOLDER_MCP_DEVELOPMENT_ENABLE_DEBUG_OUTPUT'
    });

    this.register({
      path: 'development.mockOllamaApi',
      name: 'Mock Ollama API',
      description: 'Use mock Ollama API for testing without a real Ollama instance.',
      type: 'boolean',
      defaultValue: false,
      category: 'development',
      tags: ['testing', 'development'],
      envVar: 'FOLDER_MCP_DEVELOPMENT_MOCK_OLLAMA_API',
      advanced: true
    });

    // Cache options
    this.register({
      path: 'cache.enabled',
      name: 'Enable Cache',
      description: 'Enable caching of embeddings and processed documents.',
      type: 'boolean',
      defaultValue: true,
      category: 'cache',
      tags: ['performance', 'storage'],
      related: ['cache.maxSize', 'cache.cleanupInterval'],
      envVar: 'FOLDER_MCP_CACHE_ENABLED'
    });

    this.register({
      path: 'cache.maxSize',
      name: 'Maximum Cache Size',
      description: 'Maximum size of the cache in bytes.',
      type: 'number',
      defaultValue: 10 * 1024 * 1024 * 1024, // 10GB
      examples: [1073741824, 5368709120, 10737418240], // 1GB, 5GB, 10GB
      category: 'cache',
      tags: ['storage', 'limits'],
      related: ['cache.enabled'],
      validation: {
        min: 1048576, // 1MB
        max: 107374182400 // 100GB
      },
      envVar: 'FOLDER_MCP_CACHE_MAX_SIZE',
      advanced: true
    });

    // Add validation rules as options
    for (const rule of VALIDATION_RULES) {
      const existing = this.options.get(`validation.${rule.field}`);
      if (!existing && rule.field) {
        // Map validation rules to registry format
        const path = rule.field.includes('.') ? rule.field : `processing.${rule.field}`;
        const option = this.options.get(path);
        
        if (option && rule.min !== undefined) {
          option.validation = option.validation || {};
          option.validation.min = rule.min;
        }
        if (option && rule.max !== undefined) {
          option.validation = option.validation || {};
          option.validation.max = rule.max;
        }
      }
    }
  }

  /**
   * Build search index
   */
  private buildSearchIndex(): void {
    this.searchIndex.clear();

    for (const option of this.options.values()) {
      this.addToSearchIndex(option);
    }
  }

  /**
   * Add option to search index
   */
  private addToSearchIndex(option: ConfigOption): void {
    // Index by path components
    const pathParts = option.path.toLowerCase().split('.');
    for (const part of pathParts) {
      this.addTermToIndex(part, option.path);
    }

    // Index by name
    const nameParts = option.name.toLowerCase().split(/\s+/);
    for (const part of nameParts) {
      this.addTermToIndex(part, option.path);
    }

    // Index by tags
    for (const tag of option.tags) {
      this.addTermToIndex(tag.toLowerCase(), option.path);
    }

    // Index by description words (first 10 words)
    const descWords = option.description.toLowerCase().split(/\s+/).slice(0, 10);
    for (const word of descWords) {
      if (word.length > 3) { // Skip short words
        this.addTermToIndex(word, option.path);
      }
    }
  }

  /**
   * Add term to search index
   */
  private addTermToIndex(term: string, path: string): void {
    const paths = this.searchIndex.get(term) || new Set();
    paths.add(path);
    this.searchIndex.set(term, paths);
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1) + ' Options';
  }
}

/**
 * Singleton instance
 */
export const configRegistry = new ConfigurationRegistry();