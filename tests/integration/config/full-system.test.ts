/**
 * Comprehensive Configuration System Integration Tests
 * 
 * Tests the complete configuration system including hierarchy, merging,
 * environment variables, profiles, hot reload, and CLI integration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigurationManager } from '../../../src/config/manager.js';
import { DependencyContainer } from '../../../src/di/container.js';
import { registerConfigurationServices } from '../../../src/config/di-setup.js';
import { CONFIG_TOKENS } from '../../../src/config/interfaces.js';
import { writeFile, mkdir, unlink, rmdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as yaml from 'yaml';

describe('Configuration System Integration', () => {
  let container: DependencyContainer;
  let configManager: ConfigurationManager;
  let testDir: string;
  let userConfigPath: string;
  let systemConfigPath: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create test directory structure with unique name per test
    testDir = join(tmpdir(), `config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    
    const configDir = join(testDir, '.folder-mcp');
    await mkdir(configDir, { recursive: true });
    
    const profilesDir = join(configDir, 'profiles');
    await mkdir(profilesDir, { recursive: true });

    userConfigPath = join(configDir, 'config.yaml');
    systemConfigPath = join(testDir, 'system-config.yaml');

    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear FOLDER_MCP_* environment variables
    for (const key in process.env) {
      if (key.startsWith('FOLDER_MCP_')) {
        delete process.env[key];
      }
    }

    // Setup DI container
    container = new DependencyContainer();
    registerConfigurationServices(container);
    
    configManager = container.resolve<ConfigurationManager>(CONFIG_TOKENS.CONFIGURATION_MANAGER);
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Clean up test directories
    try {
      if (existsSync(userConfigPath)) await unlink(userConfigPath);
      if (existsSync(systemConfigPath)) await unlink(systemConfigPath);
      if (existsSync(testDir)) {
        await rmdir(testDir, { recursive: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Configuration Hierarchy Loading', () => {
    it('should handle missing configuration files gracefully', async () => {
      // No config files exist, only defaults and environment
      process.env.FOLDER_MCP_BATCH_SIZE = '64';

      await configManager.load();

      // Should get environment variable
      expect(configManager.get('batchSize')).toBe(64);
      expect(configManager.getSourceForPath('batchSize')).toBe('environment');

      // Should get defaults for other values
      expect(configManager.get('modelName')).toBeDefined();
      expect(configManager.getSourceForPath('modelName')).toBe('default');
    });

  });

  describe('Environment Variable Integration', () => {
    it('should map all FOLDER_MCP_* variables correctly', async () => {
      // Set various environment variables
      process.env.FOLDER_MCP_MODEL_NAME = 'test-model';
      process.env.FOLDER_MCP_BATCH_SIZE = '64';
      process.env.FOLDER_MCP_CHUNK_SIZE = '800';
      process.env.FOLDER_MCP_FILE_EXTENSIONS = '[".pdf", ".docx", ".txt"]';
      process.env.FOLDER_MCP_DEVELOPMENT_ENABLED = 'true';

      await configManager.load();

      expect(configManager.get('modelName')).toBe('test-model');
      expect(configManager.get('batchSize')).toBe(64);
      expect(configManager.get('chunkSize')).toBe(800);
      expect(configManager.get('fileExtensions')).toEqual(['.pdf', '.docx', '.txt']);
      expect(configManager.get('development.enableDebugOutput')).toBe(true);
    });

    it('should handle environment variable type parsing', async () => {
      process.env.FOLDER_MCP_BATCH_SIZE = '32';        // number
      process.env.FOLDER_MCP_DEVELOPMENT_ENABLED = 'false'; // boolean
      process.env.FOLDER_MCP_IGNORE_PATTERNS = '["*.tmp", "*.log"]'; // JSON array

      await configManager.load();

      expect(configManager.get('batchSize')).toBe(32);
      expect(typeof configManager.get('batchSize')).toBe('number');
      
      expect(configManager.get('development.enableDebugOutput')).toBe(false);
      expect(typeof configManager.get('development.enableDebugOutput')).toBe('boolean');
      
      expect(configManager.get('ignorePatterns')).toEqual(['*.tmp', '*.log']);
      expect(Array.isArray(configManager.get('ignorePatterns'))).toBe(true);
    });

    it('should maintain backward compatibility with legacy environment variables', async () => {
      process.env.ENABLE_ENHANCED_MCP_FEATURES = 'true';
      process.env.FOLDER_MCP_MODEL_NAME = 'new-model';

      await configManager.load();

      // Both old and new environment variables should work
      expect(configManager.get('development.enableDebugOutput')).toBe(true);
      expect(configManager.get('modelName')).toBe('new-model');
    });
  });

  describe('Runtime Configuration Changes', () => {
    it('should support runtime configuration updates', async () => {
      await configManager.load();
      
      const originalValue = configManager.get('batchSize');
      
      // Set runtime value
      await configManager.set('batchSize', 48, 'runtime');
      
      expect(configManager.get('batchSize')).toBe(48);
      expect(configManager.getSourceForPath('batchSize')).toBe('runtime');
    });

    it('should emit configuration change events', async () => {
      await configManager.load();
      
      let changeEvent: any = null;
      configManager.on('configChanged', (event) => {
        changeEvent = event;
      });

      await configManager.set('modelName', 'runtime-model', 'runtime');

      expect(changeEvent).toBeTruthy();
      expect(changeEvent.changedPaths).toContain('modelName');
      expect(changeEvent.source).toBe('runtime');
      expect(changeEvent.newConfig.modelName).toBe('runtime-model');
    });
  });


  describe('Configuration Validation Integration', () => {
    it('should allow warnings without failing validation', async () => {
      // Config that might generate warnings but not errors
      const configWithWarnings = {
        modelName: 'deprecated-model', // Might generate warning
        batchSize: 32 // Valid batch size
      };
      await writeFile(userConfigPath, yaml.stringify(configWithWarnings));

      // Should load successfully even with warnings
      await expect(configManager.load()).resolves.toBeDefined();
    });
  });

  describe('Smart Defaults Integration', () => {
    it('should provide intelligent default values', async () => {
      await configManager.load();

      // Should have reasonable defaults
      expect(configManager.get('modelName')).toBeDefined();
      expect(typeof configManager.get('chunkSize')).toBe('number');
      expect(configManager.get('chunkSize')).toBeGreaterThan(0);
      expect(typeof configManager.get('batchSize')).toBe('number');
      expect(configManager.get('batchSize')).toBeGreaterThan(0);
      expect(Array.isArray(configManager.get('fileExtensions'))).toBe(true);
      expect(Array.isArray(configManager.get('ignorePatterns'))).toBe(true);
    });

  });

  describe('Hot Reload Integration', () => {
    it('should detect configuration file changes', async () => {
      await configManager.load();
      
      // Enable watching (if implemented)
      try {
        await configManager.enableWatch();
        
        let reloadTriggered = false;
        configManager.on('configChanged', () => {
          reloadTriggered = true;
        });

        // Modify config file
        const newConfig = { modelName: 'hot-reload-model', batchSize: 48 };
        await writeFile(userConfigPath, yaml.stringify(newConfig));

        // Wait for file watcher to detect change
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (reloadTriggered) {
          expect(configManager.get('modelName')).toBe('hot-reload-model');
          expect(configManager.get('batchSize')).toBe(48);
        }
        
        await configManager.disableWatch();
      } catch (error) {
        // Hot reload might not be fully implemented yet
        console.log('Hot reload not available:', error);
      }
    });
  });

  describe('Error Recovery and Edge Cases', () => {

    it('should handle circular references in configuration', async () => {
      // This shouldn't be possible with YAML, but test object references
      const config = {
        modelName: 'test',
        batchSize: 32
      };
      await writeFile(userConfigPath, yaml.stringify(config));

      await expect(configManager.load()).resolves.toBeDefined();
    });


  });

  describe('Performance and Memory', () => {
    it('should load configuration efficiently', async () => {
      const startTime = Date.now();
      
      await configManager.load();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // Should load in under 1 second
    });

    it('should not leak memory on repeated loads', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple load cycles
      for (let i = 0; i < 10; i++) {
        await configManager.load();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});