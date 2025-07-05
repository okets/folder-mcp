/**
 * Tests for Environment Variable Loader
 * 
 * Tests the enhanced environment variable loading functionality that maps
 * FOLDER_MCP_* environment variables to configuration paths.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigurationManager } from '../../src/config/manager.js';
import { DependencyContainer } from '../../src/di/container.js';
import { registerConfigurationServices } from '../../src/config/di-setup.js';
import { CONFIG_TOKENS } from '../../src/config/interfaces.js';

describe('Environment Variable Loader', () => {
  let container: DependencyContainer;
  let configManager: ConfigurationManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear FOLDER_MCP_* variables
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

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Basic Environment Variable Mapping', () => {
    it('should map simple environment variables to config paths', async () => {
      // Set environment variables (mapped to existing flat structure)
      process.env.FOLDER_MCP_MODEL_NAME = 'nomic-embed-text';
      process.env.FOLDER_MCP_BATCH_SIZE = '32';
      process.env.FOLDER_MCP_DEVELOPMENT_ENABLED = 'true';
      
      // Load configuration
      await configManager.load();
      
      // Debug: Check what was loaded
      const mergedConfig = configManager.getConfig();
      const sources = configManager.getSources();
      console.log('Environment source data:', sources.find(s => s.source === 'environment')?.data);
      console.log('Merged config model name:', mergedConfig.modelName);
      console.log('Merged config batch size:', mergedConfig.batchSize);
      
      // Check mapped values (using flat structure that exists)
      expect(configManager.get('modelName')).toBe('nomic-embed-text');
      expect(configManager.get('batchSize')).toBe(32);
      expect(configManager.get('development.enableDebugOutput')).toBe(true);
    });

    it('should handle camelCase conversion correctly', async () => {
      process.env.FOLDER_MCP_FOLDERS_WATCH_ENABLED = 'true';
      process.env.FOLDER_MCP_EMBEDDINGS_MAX_TOKENS = '4000';
      process.env.FOLDER_MCP_SERVER_HOST_NAME = 'localhost';
      
      await configManager.load();
      
      expect(configManager.get('folders.watchEnabled')).toBe(true);
      expect(configManager.get('embeddings.maxTokens')).toBe(4000);
      expect(configManager.get('server.hostName')).toBe('localhost');
    });

    it('should handle nested configuration paths', async () => {
      process.env.FOLDER_MCP_TRANSPORT_REMOTE_PORT = '8080';
      process.env.FOLDER_MCP_TRANSPORT_REMOTE_AUTH_TOKEN = 'secret123';
      process.env.FOLDER_MCP_PERFORMANCE_CACHE_MAX_SIZE = '1000';
      
      await configManager.load();
      
      expect(configManager.get('transport.remote.port')).toBe(8080);
      expect(configManager.get('transport.remote.auth.token')).toBe('secret123');
      expect(configManager.get('performance.cache.maxSize')).toBe(1000);
    });
  });

  describe('Value Type Parsing', () => {
    it('should parse boolean values correctly', async () => {
      process.env.FOLDER_MCP_FEATURE_A = 'true';
      process.env.FOLDER_MCP_FEATURE_B = 'false';
      process.env.FOLDER_MCP_FEATURE_C = 'TRUE';
      process.env.FOLDER_MCP_FEATURE_D = 'FALSE';
      
      await configManager.load();
      
      expect(configManager.get('feature.a')).toBe(true);
      expect(configManager.get('feature.b')).toBe(false);
      expect(configManager.get('feature.c')).toBe(true);
      expect(configManager.get('feature.d')).toBe(false);
    });

    it('should parse integer values correctly', async () => {
      process.env.FOLDER_MCP_PORT = '3000';
      process.env.FOLDER_MCP_TIMEOUT = '30000';
      process.env.FOLDER_MCP_BATCH_SIZE = '64';
      
      await configManager.load();
      
      expect(configManager.get('port')).toBe(3000);
      expect(configManager.get('timeout')).toBe(30000);
      expect(configManager.get('batchSize')).toBe(64);
    });

    it('should parse float values correctly', async () => {
      process.env.FOLDER_MCP_THRESHOLD = '0.85';
      process.env.FOLDER_MCP_RATIO = '1.5';
      
      await configManager.load();
      
      expect(configManager.get('threshold')).toBe(0.85);
      expect(configManager.get('ratio')).toBe(1.5);
    });

    it('should parse JSON array values', async () => {
      process.env.FOLDER_MCP_EXTENSIONS = '["pdf", "docx", "txt"]';
      process.env.FOLDER_MCP_IGNORE_PATTERNS = '["node_modules", ".git", "*.tmp"]';
      
      await configManager.load();
      
      expect(configManager.get('extensions')).toEqual(['pdf', 'docx', 'txt']);
      expect(configManager.get('ignorePatterns')).toEqual(['node_modules', '.git', '*.tmp']);
    });

    it('should parse JSON object values', async () => {
      process.env.FOLDER_MCP_AUTH_CONFIG = '{"type": "bearer", "timeout": 5000}';
      
      await configManager.load();
      
      expect(configManager.get('authConfig')).toEqual({
        type: 'bearer',
        timeout: 5000
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      process.env.FOLDER_MCP_INVALID_JSON = '{invalid json}';
      
      await configManager.load();
      
      // Should fall back to string value
      expect(configManager.get('invalidJson')).toBe('{invalid json}');
    });

    it('should preserve string values', async () => {
      process.env.FOLDER_MCP_LOG_LEVEL = 'debug';
      process.env.FOLDER_MCP_API_KEY = 'sk-1234567890abcdef';
      process.env.FOLDER_MCP_MODEL_NAME = 'nomic-embed-text';
      
      await configManager.load();
      
      expect(configManager.get('logLevel')).toBe('debug');
      expect(configManager.get('apiKey')).toBe('sk-1234567890abcdef');
      expect(configManager.get('modelName')).toBe('nomic-embed-text');
    });
  });

  describe('Environment Variable Priority', () => {
    it('should override user config with environment variables', async () => {
      // Set a user config value through config manager first
      await configManager.set('embeddings.backend', 'ollama', 'user');
      
      // Now set environment variable
      process.env.FOLDER_MCP_EMBEDDINGS_BACKEND = 'direct';
      
      // Reload to pick up environment
      await configManager.load();
      
      // Environment should override user config
      expect(configManager.get('embeddings.backend')).toBe('direct');
      expect(configManager.getSourceForPath('embeddings.backend')).toBe('environment');
    });

    it('should be overridden by runtime config', async () => {
      // Set environment variable
      process.env.FOLDER_MCP_PORT = '3000';
      await configManager.load();
      
      // Set runtime value
      await configManager.set('port', 4000, 'runtime');
      
      // Runtime should override environment
      expect(configManager.get('port')).toBe(4000);
      expect(configManager.getSourceForPath('port')).toBe('runtime');
    });
  });

  describe('Legacy Environment Variable Support', () => {
    it('should maintain backward compatibility with ENABLE_ENHANCED_MCP_FEATURES', async () => {
      process.env.ENABLE_ENHANCED_MCP_FEATURES = 'true';
      
      await configManager.load();
      
      expect(configManager.get('development.enableDebugOutput')).toBe(true);
    });

    it('should handle both legacy and new environment variables', async () => {
      process.env.ENABLE_ENHANCED_MCP_FEATURES = 'true';
      process.env.FOLDER_MCP_EMBEDDINGS_BACKEND = 'direct';
      
      await configManager.load();
      
      expect(configManager.get('development.enableDebugOutput')).toBe(true);
      expect(configManager.get('embeddings.backend')).toBe('direct');
    });
  });

  describe('Edge Cases', () => {
    it('should ignore empty environment variables', async () => {
      process.env.FOLDER_MCP_EMPTY_VALUE = '';
      
      await configManager.load();
      
      // Empty string should still be set as empty string
      expect(configManager.get('emptyValue')).toBe('');
    });

    it('should handle environment variables with underscores in values', async () => {
      process.env.FOLDER_MCP_MODEL_NAME = 'nomic_embed_text';
      
      await configManager.load();
      
      expect(configManager.get('modelName')).toBe('nomic_embed_text');
    });

    it('should not process non-FOLDER_MCP environment variables', async () => {
      process.env.OTHER_APP_CONFIG = 'should_be_ignored';
      process.env.NODE_ENV = 'test';
      
      await configManager.load();
      
      expect(configManager.get('other.app.config')).toBeUndefined();
      expect(configManager.get('node.env')).toBeUndefined();
    });
  });

  describe('Configuration Source Tracking', () => {
    it('should correctly identify environment as source', async () => {
      process.env.FOLDER_MCP_EMBEDDINGS_BACKEND = 'direct';
      process.env.FOLDER_MCP_PROCESSING_BATCH_SIZE = '32';
      
      await configManager.load();
      
      expect(configManager.getSourceForPath('embeddings.backend')).toBe('environment');
      expect(configManager.getSourceForPath('processing.batchSize')).toBe('environment');
    });

    it('should include environment source in sources list', async () => {
      process.env.FOLDER_MCP_TEST_VALUE = 'test';
      
      await configManager.load();
      
      const sources = configManager.getSources();
      const envSource = sources.find(s => s.source === 'environment');
      
      expect(envSource).toBeDefined();
      expect(envSource?.data).toHaveProperty('testValue', 'test');
    });
  });
});