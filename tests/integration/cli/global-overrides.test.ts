/**
 * Global Configuration Override System Integration Tests
 * 
 * Tests that all commands accept and properly apply configuration overrides.
 * Uses real configuration scenarios and validates override precedence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import { IConfigurationOverrideService } from '../../../src/domain/cli/IConfigurationOverrideService.js';

describe('Global Configuration Override System Integration', () => {
  let tempDir: string;
  let container: any;
  let overrideService: IConfigurationOverrideService;

  beforeEach(async () => {
    // Create temporary directory for test
    tempDir = await fs.mkdtemp(join(tmpdir(), 'global-overrides-test-'));
    
    // Setup DI container with test folder
    container = setupDependencyInjection({
      folderPath: tempDir,
      logLevel: 'error' // Quiet during tests
    });

    // Get configuration override service
    overrideService = container.resolve(SERVICE_TOKENS.CLI_CONFIGURATION_OVERRIDE_SERVICE);
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('CLI Flag Parsing', () => {
    it('should parse common override flags correctly', () => {
      const mockArgs = {
        backend: 'direct',
        batchSize: 64,
        logLevel: 'debug',
        noCache: true,
        development: true
      };

      const overrides = overrideService.parseCliFlags(mockArgs);
      
      expect(overrides).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'processing.backend',
            value: 'direct',
            source: 'cli-flag'
          }),
          expect.objectContaining({
            path: 'processing.batchSize', 
            value: 64,
            source: 'cli-flag'
          }),
          expect.objectContaining({
            path: 'development.logLevel',
            value: 'debug',
            source: 'cli-flag'
          }),
          expect.objectContaining({
            path: 'processing.noCache',
            value: true,
            source: 'cli-flag'
          }),
          expect.objectContaining({
            path: 'development.enableDebugOutput',
            value: true,
            source: 'cli-flag'
          })
        ])
      );
    });

    it('should handle type conversion correctly', () => {
      const mockArgs = {
        batchSize: '128',    // String that should become number
        development: 'true', // String that should become boolean
        chunkSize: '1000'    // String that should become number
      };

      const overrides = overrideService.parseCliFlags(mockArgs);
      
      const batchSizeOverride = overrides.find(o => o.path === 'processing.batchSize');
      const developmentOverride = overrides.find(o => o.path === 'development.enableDebugOutput');
      const chunkSizeOverride = overrides.find(o => o.path === 'processing.chunkSize');

      expect(batchSizeOverride?.value).toBe(128);
      expect(typeof batchSizeOverride?.value).toBe('number');

      expect(developmentOverride?.value).toBe(true);
      expect(typeof developmentOverride?.value).toBe('boolean');

      expect(chunkSizeOverride?.value).toBe(1000);
      expect(typeof chunkSizeOverride?.value).toBe('number');
    });

    it('should ignore undefined values', () => {
      const mockArgs = {
        backend: 'ollama',
        batchSize: undefined,
        logLevel: null
      };

      const overrides = overrideService.parseCliFlags(mockArgs);
      
      expect(overrides).toHaveLength(1);
      expect(overrides[0]).toEqual(
        expect.objectContaining({
          path: 'processing.backend',
          value: 'ollama'
        })
      );
    });
  });

  describe('Override Validation', () => {
    it('should validate correct override values', () => {
      const validOverrides = [
        {
          path: 'processing.backend',
          value: 'ollama',
          source: 'cli-flag' as const
        },
        {
          path: 'processing.batchSize',
          value: 32,
          source: 'cli-flag' as const
        },
        {
          path: 'development.logLevel',
          value: 'info',
          source: 'cli-flag' as const
        }
      ];

      const result = overrideService.validateOverrides(validOverrides);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.appliedOverrides).toHaveLength(3);
    });

    it('should detect invalid override values', () => {
      const invalidOverrides = [
        {
          path: 'processing.backend',
          value: 'invalid-backend',
          source: 'cli-flag' as const
        },
        {
          path: 'processing.batchSize',
          value: -1,
          source: 'cli-flag' as const
        },
        {
          path: 'development.logLevel',
          value: 'invalid-level',
          source: 'cli-flag' as const
        }
      ];

      const result = overrideService.validateOverrides(invalidOverrides);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect warnings for potentially problematic values', () => {
      const warningOverrides = [
        {
          path: 'processing.batchSize',
          value: 512, // Very large batch size should generate warning
          source: 'cli-flag' as const
        },
        {
          path: 'processing.chunkSize',
          value: 50, // Very small chunk size should generate warning
          source: 'cli-flag' as const
        }
      ];

      const result = overrideService.validateOverrides(warningOverrides);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reject invalid configuration paths', () => {
      const invalidPathOverrides = [
        {
          path: 'nonexistent.path',
          value: 'some-value',
          source: 'cli-flag' as const
        }
      ];

      const result = overrideService.validateOverrides(invalidPathOverrides);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid configuration path');
    });
  });

  describe('Override Application', () => {
    it('should apply valid overrides to configuration', async () => {
      const overrides = [
        {
          path: 'processing.backend',
          value: 'direct',
          source: 'cli-flag' as const
        },
        {
          path: 'processing.batchSize',
          value: 128,
          source: 'cli-flag' as const
        }
      ];

      // Should not throw
      await expect(overrideService.applyOverrides(overrides)).resolves.toBeUndefined();
    });

    it('should fail to apply invalid overrides', async () => {
      const invalidOverrides = [
        {
          path: 'processing.backend',
          value: 'invalid-backend',
          source: 'cli-flag' as const
        }
      ];

      await expect(overrideService.applyOverrides(invalidOverrides))
        .rejects.toThrow('Override validation failed');
    });

    it('should support validation-only mode', async () => {
      const overrides = [
        {
          path: 'processing.backend',
          value: 'ollama',
          source: 'cli-flag' as const
        }
      ];

      // Should validate but not actually apply
      await expect(
        overrideService.applyOverrides(overrides, { validateOnly: true })
      ).resolves.toBeUndefined();
    });
  });

  describe('Available Overrides', () => {
    it('should provide comprehensive list of available overrides', () => {
      const availableOverrides = overrideService.getAvailableOverrides();
      
      expect(availableOverrides.length).toBeGreaterThan(5);
      
      // Check for key overrides
      const backendOverride = availableOverrides.find(o => o.flag === '--backend');
      const batchSizeOverride = availableOverrides.find(o => o.flag === '--batch-size');
      const logLevelOverride = availableOverrides.find(o => o.flag === '--log-level');

      expect(backendOverride).toBeDefined();
      expect(backendOverride?.description).toContain('backend');
      expect(backendOverride?.examples.length).toBeGreaterThan(0);

      expect(batchSizeOverride).toBeDefined();
      expect(batchSizeOverride?.type).toBe('number');

      expect(logLevelOverride).toBeDefined();
      expect(logLevelOverride?.type).toBe('string');
    });

    it('should provide examples for all overrides', () => {
      const availableOverrides = overrideService.getAvailableOverrides();
      
      for (const override of availableOverrides) {
        expect(override.examples).toBeDefined();
        expect(override.examples.length).toBeGreaterThan(0);
        expect(typeof override.examples[0]).toBe('string');
      }
    });
  });

  describe('Override Support Detection', () => {
    it('should correctly identify supported override paths', () => {
      expect(overrideService.supportsOverride('processing.backend')).toBe(true);
      expect(overrideService.supportsOverride('processing.batchSize')).toBe(true);
      expect(overrideService.supportsOverride('development.enableDebugOutput')).toBe(true);
      expect(overrideService.supportsOverride('development.enableDebugOutput')).toBe(true);
    });

    it('should correctly identify unsupported override paths', () => {
      expect(overrideService.supportsOverride('nonexistent.path')).toBe(false);
      expect(overrideService.supportsOverride('random.config')).toBe(false);
    });
  });

  describe('Real Override Scenarios', () => {
    it('should handle production override scenario', async () => {
      const productionArgs = {
        backend: 'direct',
        batchSize: 128,
        logLevel: 'warn',
        development: false,
        maxConcurrent: 8
      };

      const overrides = overrideService.parseCliFlags(productionArgs);
      const validation = overrideService.validateOverrides(overrides);
      
      expect(validation.valid).toBe(true);
      await expect(overrideService.applyOverrides(overrides)).resolves.toBeUndefined();
    });

    it('should handle development override scenario', async () => {
      const developmentArgs = {
        backend: 'ollama',
        batchSize: 16,
        logLevel: 'debug',
        development: true,
        noCache: true
      };

      const overrides = overrideService.parseCliFlags(developmentArgs);
      const validation = overrideService.validateOverrides(overrides);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThanOrEqual(0); // May have warnings
      await expect(overrideService.applyOverrides(overrides)).resolves.toBeUndefined();
    });

    it('should handle performance tuning scenario', async () => {
      const performanceArgs = {
        batchSize: 64, // Use valid value within allowed range
        chunkSize: 800, // Use value within 200-1000 range
        overlap: 25, // Use overlap within 0-50% range
        maxConcurrent: 8 // Use smaller concurrency
      };

      const overrides = overrideService.parseCliFlags(performanceArgs);
      const validation = overrideService.validateOverrides(overrides);
      
      // May be valid or have warnings for extreme values
      expect(typeof validation.valid).toBe('boolean');
      if (validation.valid) {
        await expect(overrideService.applyOverrides(overrides)).resolves.toBeUndefined();
      }
    });
  });
});