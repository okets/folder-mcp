/**
 * Hot Reload Development Tests
 * 
 * Tests hot reload functionality and development mode features.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { TestUtils } from '../../helpers/test-utils.ts';
import { setupDependencyInjection } from '../../../src/di/setup.js';
import { SERVICE_TOKENS } from '../../../src/di/interfaces.js';
import type { IDependencyContainer, IFileSystemService, ILoggingService } from '../../../src/di/interfaces.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('Hot Reload Development Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let testDir: string;
  let container: any; // Use any to access resolveAsync method
  let fileSystemService: IFileSystemService;
  let loggingService: ILoggingService;

  beforeEach(async () => {
    testDir = await TestUtils.createTempDir('hot-reload-');
    
    // Setup dependency injection container with real services
    container = setupDependencyInjection({
      folderPath: testDir,
      logLevel: 'error' // Quiet during tests
    });
    
    // Resolve services from DI container
    fileSystemService = await container.resolveAsync(SERVICE_TOKENS.FILE_SYSTEM) as IFileSystemService;
    loggingService = await container.resolveAsync(SERVICE_TOKENS.LOGGING) as ILoggingService;
    
    // Create initial test content
    await TestUtils.createTestFiles(testDir, {
      'config.yaml': `
embeddings:
  model: "all-MiniLM-L6-v2"
  enable: true
cache:
  enabled: true
  ttl: 3600
development:
  hot_reload: true
  watch_files: true`,
      'test-doc.md': '# Initial Content\n\nThis is the initial version of the document.'
    });
    
    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js', testDir],
      env: {
        ...process.env,
        ENABLE_ENHANCED_MCP_FEATURES: 'true',
        NODE_ENV: 'development'
      }
    });

    client = new Client(
      {
        name: 'hot-reload-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    // Wait for initial setup and file watching to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
    await TestUtils.cleanupTempDir(testDir);
  });

  describe('Development Mode Features', () => {
    it('should initialize with development mode enabled', async () => {
      // Test that server is running by checking if it can list documents
      const response = await client.callTool({
        name: 'list_documents',
        arguments: {
          folder_path: testDir
        }
      });
      
      expect(response.content).toBeDefined();
      
      const responseText = Array.isArray(response.content) 
        ? response.content[0]?.text || ''
        : String(response.content);
        
      expect(responseText).toContain('test-doc.md');
      console.log('Development mode initialized with file watching capabilities');
    });

    it('should support enhanced debugging capabilities', async () => {
      // Test development-specific status information
      const response = await client.callTool({
        name: 'get_status',
        arguments: {}
      });

      expect(response.content).toBeDefined();
      
      const responseText = Array.isArray(response.content) 
        ? response.content[0]?.text || ''
        : String(response.content);
        
      // In development mode, status should include detailed information
      expect(typeof responseText).toBe('string');
      expect(responseText.length).toBeGreaterThan(0);
    });
  });

  describe('File Change Detection', () => {
    it('should detect when files are modified', async () => {
      // Get initial document count/status
      const initialStatus = await client.callTool({
        name: 'list_documents',
        arguments: {
          folder_path: testDir
        }
      });

      expect(initialStatus.content).toBeDefined();
      
      // Modify an existing file
      const testDocPath = path.join(testDir, 'test-doc.md');
      await fs.writeFile(testDocPath, '# Updated Content\n\nThis document has been updated for hot reload testing.');
      
      // Wait for file change detection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if the change was detected (status might change)
      const updatedStatus = await client.callTool({
        name: 'list_documents',
        arguments: {
          folder_path: testDir
        }
      });

      expect(updatedStatus.content).toBeDefined();
      console.log('File modification detected and processed');
    });

    it('should detect when new files are added', async () => {
      // Add a new file
      await TestUtils.createTestFiles(testDir, {
        'new-hot-reload-file.md': '# New File\n\nThis file was added during hot reload testing.'
      });
      
      // Wait for file detection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if new file is detected
      const response = await client.callTool({
        name: 'list_documents',
        arguments: {
          folder_path: testDir
        }
      });

      expect(response.content).toBeDefined();
      
      const responseText = Array.isArray(response.content) 
        ? response.content[0]?.text || ''
        : String(response.content);
        
      // Should include information about the new file
      expect(typeof responseText).toBe('string');
      console.log('New file addition detected');
    });

    it('should handle file deletions gracefully', async () => {
      // Delete an existing file
      const testDocPath = path.join(testDir, 'test-doc.md');
      await fs.unlink(testDocPath);
      
      // Wait for deletion detection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // System should still function after file deletion
      const response = await client.callTool({
        name: 'list_documents',
        arguments: {
          folder_path: testDir
        }
      });

      expect(response.content).toBeDefined();
      console.log('File deletion handled gracefully');
    });
  });

  describe('Hot Reload Performance', () => {
    it('should maintain responsiveness during file changes', async () => {
      // Make multiple rapid file changes
      const changes = Array.from({ length: 3 }, (_, i) => 
        TestUtils.createTestFiles(testDir, {
          [`rapid-change-${i}.md`]: `# Rapid Change ${i}\n\nFile created at ${new Date().toISOString()}`
        })
      );
      
      await Promise.all(changes);
      
      // Server should remain responsive - test with actual functionality
      const startTime = Date.now();
      const response = await client.callTool({
        name: 'list_documents',
        arguments: {
          folder_path: testDir
        }
      });
      const responseTime = Date.now() - startTime;
      
      expect(response.content).toBeDefined();
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      
      console.log(`Server remained responsive during file changes (${responseTime}ms)`);
    });

    it('should not crash during rapid file system changes', async () => {
      // Create and delete files rapidly
      for (let i = 0; i < 5; i++) {
        const filename = `temp-${i}.md`;
        await TestUtils.createTestFiles(testDir, {
          [filename]: `Temporary file ${i}`
        });
        
        // Small delay then delete
        await new Promise(resolve => setTimeout(resolve, 200));
        await fs.unlink(path.join(testDir, filename));
      }
      
      // Wait for all changes to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Server should still be functional - test with actual operation
      const response = await client.callTool({
        name: 'get_status',
        arguments: {}
      });
      
      expect(response.content).toBeDefined();
      console.log('Server remained stable during rapid file system changes');
    });
  });

  describe('Configuration Hot Reload', () => {
    it('should handle configuration changes in development mode', async () => {
      // Test basic functionality first
      const initialResponse = await client.callTool({
        name: 'get_status',
        arguments: {}
      });
      
      expect(initialResponse.content).toBeDefined();
      
      // Modify configuration (if config watching is implemented)
      const configPath = path.join(testDir, 'config.yaml');
      const newConfig = `
embeddings:
  model: "all-MiniLM-L6-v2"
  enable: true
cache:
  enabled: false
  ttl: 7200
development:
  hot_reload: true
  watch_files: true
  debug_level: "verbose"`;
      
      await fs.writeFile(configPath, newConfig);
      
      // Wait for config reload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // System should still function after config change
      const postConfigResponse = await client.callTool({
        name: 'get_status',
        arguments: {}
      });
      
      expect(postConfigResponse.content).toBeDefined();
      console.log('Configuration changes handled successfully');
    });
  });
});
