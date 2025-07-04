/**
 * Smart Defaults for Configuration
 * 
 * Generates intelligent defaults based on system capabilities,
 * environment, and performance characteristics.
 */

import { LocalConfig } from '../schema.js';
import { SystemCapabilities, getSystemCapabilities } from '../system.js';
import { createConsoleLogger } from '../../infrastructure/logging/logger.js';
import { cpus, totalmem } from 'os';
import { existsSync } from 'fs';

const logger = createConsoleLogger('warn');

/**
 * Performance tier based on system capabilities
 */
export enum PerformanceTier {
  LOW = 'low',        // Limited resources (e.g., CI, container)
  MEDIUM = 'medium',  // Standard developer machine
  HIGH = 'high'       // High-end workstation/server
}

/**
 * Smart default options
 */
export interface SmartDefaultOptions {
  profile?: string;
  environment?: 'development' | 'staging' | 'production';
  systemCapabilities?: SystemCapabilities;
  forceDefaults?: Partial<LocalConfig>;
}

/**
 * Smart defaults generator
 */
export class SmartDefaultsGenerator {
  private capabilities: SystemCapabilities;
  private performanceTier: PerformanceTier;

  constructor(capabilities?: SystemCapabilities) {
    this.capabilities = capabilities || {
      cpuCores: cpus().length,
      totalMemoryGB: totalmem() / (1024 * 1024 * 1024),
      availableMemoryGB: 0,
      platform: process.platform.toString(),
      hasGPU: false,
      ollamaAvailable: false,
      ollamaModels: [],
      performanceTier: 'medium',
      detectedAt: new Date().toISOString(),
      detectionDuration: 0
    };
    this.performanceTier = this.detectPerformanceTier();
  }

  /**
   * Generate smart defaults based on system and context
   */
  generate(options: SmartDefaultOptions = {}): LocalConfig {
    const tier = this.performanceTier;
    const isProduction = options.environment === 'production';
    const isDevelopment = options.environment === 'development' || (!options.environment && !isProduction);

    logger.debug('Generating smart defaults', {
      tier,
      environment: options.environment,
      profile: options.profile,
      capabilities: this.capabilities
    });

    // Base defaults
    const defaults: LocalConfig = {
      // Processing defaults based on tier
      chunkSize: this.getChunkSize(tier),
      overlap: this.getOverlap(tier),
      batchSize: this.getBatchSize(tier),
      modelName: this.getDefaultModel(),
      maxConcurrentOperations: this.getMaxConcurrent(tier),
      
      // File handling
      fileExtensions: this.getDefaultExtensions(),
      ignorePatterns: this.getDefaultIgnorePatterns(isDevelopment),
      
      // Cache directory will be handled separately
      
      // Development settings
      development: {
        enableDebugOutput: isDevelopment,
        mockOllamaApi: false,
        skipGpuDetection: false
      }
    };

    // Merge with forced defaults
    if (options.forceDefaults) {
      return this.mergeDefaults(defaults, options.forceDefaults);
    }

    return defaults;
  }

  /**
   * Detect performance tier based on system capabilities
   */
  private detectPerformanceTier(): PerformanceTier {
    const cpuCount = this.capabilities.cpuCores;
    const memoryGB = this.capabilities.totalMemoryGB;
    const hasGpu = this.capabilities.hasGPU;

    // High tier: 8+ cores, 16GB+ RAM, GPU available
    if (cpuCount >= 8 && memoryGB >= 16 && hasGpu) {
      return PerformanceTier.HIGH;
    }

    // Medium tier: 4+ cores, 8GB+ RAM
    if (cpuCount >= 4 && memoryGB >= 8) {
      return PerformanceTier.MEDIUM;
    }

    // Low tier: Everything else
    return PerformanceTier.LOW;
  }

  /**
   * Get optimal chunk size based on tier
   */
  private getChunkSize(tier: PerformanceTier): number {
    switch (tier) {
      case PerformanceTier.HIGH:
        return 2000; // Larger chunks for better context
      case PerformanceTier.MEDIUM:
        return 1000; // Balanced
      case PerformanceTier.LOW:
        return 500;  // Smaller chunks to reduce memory
    }
  }

  /**
   * Get optimal overlap based on tier (as percentage)
   */
  private getOverlap(tier: PerformanceTier): number {
    switch (tier) {
      case PerformanceTier.HIGH:
        return 10;  // 10% of chunk size
      case PerformanceTier.MEDIUM:
        return 10;  // 10% of chunk size
      case PerformanceTier.LOW:
        return 10;  // 10% of chunk size
    }
  }

  /**
   * Get optimal batch size based on tier and memory
   */
  private getBatchSize(tier: PerformanceTier): number {
    const memoryGB = this.capabilities.totalMemoryGB;
    
    switch (tier) {
      case PerformanceTier.HIGH:
        return Math.min(64, Math.floor(memoryGB * 4)); // Up to 64
      case PerformanceTier.MEDIUM:
        return Math.min(32, Math.floor(memoryGB * 2)); // Up to 32
      case PerformanceTier.LOW:
        return Math.min(16, Math.floor(memoryGB));     // Up to 16
    }
  }

  /**
   * Get optimal concurrent operations based on CPU cores
   */
  private getMaxConcurrent(tier: PerformanceTier): number {
    const cpuCount = this.capabilities.cpuCores;
    
    switch (tier) {
      case PerformanceTier.HIGH:
        return Math.max(10, cpuCount * 2);  // 2x CPU cores, min 10
      case PerformanceTier.MEDIUM:
        return Math.max(5, cpuCount);       // 1x CPU cores, min 5
      case PerformanceTier.LOW:
        return Math.min(4, cpuCount);       // Up to 4
    }
  }

  /**
   * Get default model based on capabilities
   */
  private getDefaultModel(): string {
    // Check if Ollama is available
    if (this.capabilities.ollamaAvailable) {
      // Prefer GPU-accelerated model if GPU is available
      if (this.capabilities.hasGPU) {
        return 'nomic-embed-text-v1.5';
      }
      return 'nomic-embed-text';
    }
    
    // Fallback to direct/CPU model
    return 'all-minilm';
  }

  /**
   * Get default file extensions
   */
  private getDefaultExtensions(): string[] {
    return [
      '.txt', '.md', '.mdx',           // Text/Markdown
      '.pdf', '.doc', '.docx',         // Documents
      '.xls', '.xlsx', '.csv',         // Spreadsheets
      '.ppt', '.pptx',                 // Presentations
      '.json', '.yaml', '.yml',        // Data files
      '.log'                           // Log files
    ];
  }

  /**
   * Get default ignore patterns
   */
  private getDefaultIgnorePatterns(isDevelopment: boolean): string[] {
    const base = [
      'node_modules/**',
      '.git/**',
      '*.tmp',
      '*.swp',
      '*.bak',
      '~*',
      '.DS_Store',
      'Thumbs.db'
    ];

    if (isDevelopment) {
      base.push(
        'dist/**',
        'build/**',
        'coverage/**',
        '.next/**',
        '.nuxt/**',
        '.cache/**'
      );
    }

    return base;
  }

  /**
   * Get cache directory with fallbacks
   */
  private getCacheDirectory(): string {
    // Try common cache locations
    const candidates = [
      process.env.FOLDER_MCP_CACHE,
      process.env.XDG_CACHE_HOME && `${process.env.XDG_CACHE_HOME}/folder-mcp`,
      process.env.HOME && `${process.env.HOME}/.cache/folder-mcp`,
      process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\folder-mcp\\cache`,
      process.env.TEMP && `${process.env.TEMP}/folder-mcp-cache`
    ].filter(Boolean) as string[];

    // Return first valid candidate
    for (const dir of candidates) {
      if (dir) return dir;
    }

    // Ultimate fallback
    return './.folder-mcp-cache';
  }

  /**
   * Merge defaults with overrides
   */
  private mergeDefaults(base: LocalConfig, overrides: Partial<LocalConfig>): LocalConfig {
    const merged = { ...base };

    for (const key in overrides) {
      const value = overrides[key as keyof LocalConfig];
      if (value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Deep merge objects
          (merged as any)[key] = {
            ...(base as any)[key],
            ...value
          };
        } else {
          // Direct assignment
          (merged as any)[key] = value;
        }
      }
    }

    return merged;
  }

  /**
   * Get performance tier
   */
  getPerformanceTier(): PerformanceTier {
    return this.performanceTier;
  }

  /**
   * Get system capabilities
   */
  getCapabilities(): SystemCapabilities {
    return this.capabilities;
  }

  /**
   * Generate defaults documentation
   */
  generateDocumentation(): string {
    const tier = this.performanceTier;
    const defaults = this.generate();
    
    const lines = [
      '# Smart Defaults Configuration',
      '',
      `## System Profile: ${tier.toUpperCase()}`,
      `- CPU Cores: ${this.capabilities.cpuCores}`,
      `- Memory: ${Math.round(this.capabilities.totalMemoryGB)}GB`,
      `- GPU Available: ${this.capabilities.hasGPU ? 'Yes' : 'No'}`,
      `- Ollama Available: ${this.capabilities.ollamaAvailable ? 'Yes' : 'No'}`,
      '',
      '## Generated Defaults',
      '```yaml',
      `processing:`,
      `  chunkSize: ${defaults.chunkSize}`,
      `  overlap: ${defaults.overlap}`,
      `  batchSize: ${defaults.batchSize}`,
      `  modelName: ${defaults.modelName}`,
      `  maxConcurrentOperations: ${defaults.maxConcurrentOperations}`,
      '',
      `files:`,
      `  extensions: [${defaults.fileExtensions?.join(', ')}]`,
      `  ignorePatterns:`,
      ...(defaults.ignorePatterns?.map(p => `    - "${p}"`) || []),
      '',
      `development:`,
      `  enableDebugOutput: ${defaults.development?.enableDebugOutput}`,
      `  mockOllamaApi: ${defaults.development?.mockOllamaApi}`,
      `  skipGpuDetection: ${defaults.development?.skipGpuDetection}`,
      '```',
      '',
      '## Rationale',
      `- **Chunk Size (${defaults.chunkSize})**: ${this.getChunkSizeRationale(tier)}`,
      `- **Batch Size (${defaults.batchSize})**: ${this.getBatchSizeRationale(tier)}`,
      `- **Model (${defaults.modelName})**: ${this.getModelRationale()}`,
      `- **Concurrency (${defaults.maxConcurrentOperations})**: ${this.getConcurrencyRationale(tier)}`
    ];

    return lines.join('\n');
  }

  private getChunkSizeRationale(tier: PerformanceTier): string {
    switch (tier) {
      case PerformanceTier.HIGH:
        return 'Larger chunks provide better context for embeddings on high-end systems';
      case PerformanceTier.MEDIUM:
        return 'Balanced chunk size for good performance without excessive memory use';
      case PerformanceTier.LOW:
        return 'Smaller chunks to minimize memory usage on resource-constrained systems';
    }
  }

  private getBatchSizeRationale(tier: PerformanceTier): string {
    switch (tier) {
      case PerformanceTier.HIGH:
        return 'Large batches to maximize throughput on systems with ample memory';
      case PerformanceTier.MEDIUM:
        return 'Moderate batch size balancing throughput and memory usage';
      case PerformanceTier.LOW:
        return 'Conservative batch size to prevent memory exhaustion';
    }
  }

  private getModelRationale(): string {
    if (this.capabilities.ollamaAvailable && this.capabilities.hasGPU) {
      return 'GPU-accelerated model for optimal performance with Ollama';
    }
    if (this.capabilities.ollamaAvailable) {
      return 'Standard Ollama model for good quality embeddings';
    }
    return 'Lightweight CPU model for systems without Ollama';
  }

  private getConcurrencyRationale(tier: PerformanceTier): string {
    switch (tier) {
      case PerformanceTier.HIGH:
        return 'High concurrency to fully utilize multiple CPU cores';
      case PerformanceTier.MEDIUM:
        return 'Moderate concurrency matching CPU core count';
      case PerformanceTier.LOW:
        return 'Limited concurrency to prevent system overload';
    }
  }
}

/**
 * Create singleton instance
 */
export const smartDefaults = new SmartDefaultsGenerator();