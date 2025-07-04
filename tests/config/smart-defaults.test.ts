/**
 * Tests for Smart Defaults
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SmartDefaultsGenerator, 
  PerformanceTier,
  SmartDefaultOptions 
} from '../../src/config/defaults/smart.js';
import { SystemCapabilities } from '../../src/config/system.js';

describe('SmartDefaultsGenerator', () => {
  let generator: SmartDefaultsGenerator;

  // Mock system capabilities for testing
  const mockHighEndSystem: SystemCapabilities = {
    cpuCores: 16,
    totalMemoryGB: 32,
    availableMemoryGB: 24,
    hasGPU: true,
    gpuMemoryGB: 8,
    ollamaAvailable: true,
    ollamaModels: ['nomic-embed-text', 'nomic-embed-text-v1.5'],
    platform: 'darwin',
    performanceTier: 'high',
    detectedAt: new Date().toISOString(),
    detectionDuration: 100
  };

  const mockMediumSystem: SystemCapabilities = {
    cpuCores: 8,
    totalMemoryGB: 16,
    availableMemoryGB: 12,
    hasGPU: false,
    ollamaAvailable: true,
    ollamaModels: ['nomic-embed-text'],
    platform: 'linux',
    performanceTier: 'medium',
    detectedAt: new Date().toISOString(),
    detectionDuration: 100
  };

  const mockLowEndSystem: SystemCapabilities = {
    cpuCores: 2,
    totalMemoryGB: 4,
    availableMemoryGB: 2,
    hasGPU: false,
    ollamaAvailable: false,
    ollamaModels: [],
    platform: 'win32',
    performanceTier: 'low',
    detectedAt: new Date().toISOString(),
    detectionDuration: 100
  };

  describe('performance tier detection', () => {
    it('should detect high performance tier', () => {
      generator = new SmartDefaultsGenerator(mockHighEndSystem);
      expect(generator.getPerformanceTier()).toBe(PerformanceTier.HIGH);
    });

    it('should detect medium performance tier', () => {
      generator = new SmartDefaultsGenerator(mockMediumSystem);
      expect(generator.getPerformanceTier()).toBe(PerformanceTier.MEDIUM);
    });

    it('should detect low performance tier', () => {
      generator = new SmartDefaultsGenerator(mockLowEndSystem);
      expect(generator.getPerformanceTier()).toBe(PerformanceTier.LOW);
    });
  });

  describe('default generation', () => {
    it('should generate appropriate defaults for high-end system', () => {
      generator = new SmartDefaultsGenerator(mockHighEndSystem);
      const defaults = generator.generate();

      expect(defaults.chunkSize).toBe(2000);
      expect(defaults.overlap).toBe(10); // 10% of chunk size
      expect(defaults.batchSize).toBeGreaterThanOrEqual(64);
      expect(defaults.modelName).toBe('nomic-embed-text-v1.5'); // GPU available
      expect(defaults.maxConcurrentOperations).toBeGreaterThanOrEqual(20);
    });

    it('should generate appropriate defaults for medium system', () => {
      generator = new SmartDefaultsGenerator(mockMediumSystem);
      const defaults = generator.generate();

      expect(defaults.chunkSize).toBe(1000);
      expect(defaults.overlap).toBe(10); // 10% of chunk size
      expect(defaults.batchSize).toBeLessThanOrEqual(32);
      expect(defaults.modelName).toBe('nomic-embed-text'); // No GPU
      expect(defaults.maxConcurrentOperations).toBeGreaterThanOrEqual(5);
    });

    it('should generate appropriate defaults for low-end system', () => {
      generator = new SmartDefaultsGenerator(mockLowEndSystem);
      const defaults = generator.generate();

      expect(defaults.chunkSize).toBe(500);
      expect(defaults.overlap).toBe(10); // 10% of chunk size
      expect(defaults.batchSize).toBeLessThanOrEqual(16);
      expect(defaults.modelName).toBe('all-minilm'); // No Ollama
      expect(defaults.maxConcurrentOperations).toBeLessThanOrEqual(4);
    });
  });

  describe('environment-specific defaults', () => {
    beforeEach(() => {
      generator = new SmartDefaultsGenerator(mockMediumSystem);
    });

    it('should enable debug output for development', () => {
      const defaults = generator.generate({ environment: 'development' });
      expect(defaults.development?.enableDebugOutput).toBe(true);
    });

    it('should disable debug output for production', () => {
      const defaults = generator.generate({ environment: 'production' });
      expect(defaults.development?.enableDebugOutput).toBe(false);
    });

    it('should include development-specific ignore patterns', () => {
      const devDefaults = generator.generate({ environment: 'development' });
      const prodDefaults = generator.generate({ environment: 'production' });

      expect(devDefaults.ignorePatterns).toContain('dist/**');
      expect(devDefaults.ignorePatterns).toContain('node_modules/**');
      expect(prodDefaults.ignorePatterns).toContain('node_modules/**');
      expect(prodDefaults.ignorePatterns).not.toContain('dist/**');
    });
  });

  describe('forced defaults', () => {
    beforeEach(() => {
      generator = new SmartDefaultsGenerator(mockMediumSystem);
    });

    it('should merge forced defaults', () => {
      const forced = {
        chunkSize: 3000,
        modelName: 'custom-model',
        development: {
          enableDebugOutput: false
        }
      };

      const defaults = generator.generate({ forceDefaults: forced });

      expect(defaults.chunkSize).toBe(3000); // Forced
      expect(defaults.modelName).toBe('custom-model'); // Forced
      expect(defaults.overlap).toBe(10); // Smart default (percentage)
      expect(defaults.development?.enableDebugOutput).toBe(false); // Forced
    });
  });

  describe('documentation generation', () => {
    beforeEach(() => {
      generator = new SmartDefaultsGenerator(mockMediumSystem);
    });

    it('should generate comprehensive documentation', () => {
      const docs = generator.generateDocumentation();

      expect(docs).toContain('Smart Defaults Configuration');
      expect(docs).toContain('System Profile: MEDIUM');
      expect(docs).toContain('CPU Cores: 8');
      expect(docs).toContain('Memory: 16GB');
      expect(docs).toContain('Generated Defaults');
      expect(docs).toContain('Rationale');
      expect(docs).toContain('chunkSize: 1000');
    });
  });

  describe('model selection logic', () => {
    it('should prefer GPU model when GPU is available', () => {
      generator = new SmartDefaultsGenerator(mockHighEndSystem);
      const defaults = generator.generate();
      expect(defaults.modelName).toBe('nomic-embed-text-v1.5');
    });

    it('should use standard Ollama model without GPU', () => {
      generator = new SmartDefaultsGenerator(mockMediumSystem);
      const defaults = generator.generate();
      expect(defaults.modelName).toBe('nomic-embed-text');
    });

    it('should fall back to CPU model without Ollama', () => {
      generator = new SmartDefaultsGenerator(mockLowEndSystem);
      const defaults = generator.generate();
      expect(defaults.modelName).toBe('all-minilm');
    });
  });
});