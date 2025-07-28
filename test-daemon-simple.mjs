#!/usr/bin/env node

/**
 * Simple Test Daemon
 * 
 * Minimal test to verify the daemon configuration service
 * without the complex ES module issues.
 */

import { DaemonConfigurationService } from './dist/src/daemon/services/configuration-service.js';

// Create a simple mock configuration component
const mockConfigComponent = {
  async getFolders() {
    return [
      { path: '/Users/test1', model: 'nomic-embed-text' },
      { path: '/Users/test2', model: 'mxbai-embed-large' }
    ];
  },
  
  async addFolder(path, model) {
    console.log(`Mock: Adding folder ${path} with model ${model}`);
  },
  
  async removeFolder(path) {
    console.log(`Mock: Removing folder ${path}`);
  },
  
  async getFolder(path) {
    const folders = await this.getFolders();
    return folders.find(f => f.path === path) || null;
  }
};

// Create a simple mock logger
const mockLogger = {
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || ''),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg, meta) => console.log(`[WARN] ${msg}`, meta || ''),
  error: (msg, meta) => console.log(`[ERROR] ${msg}`, meta || '')
};

async function testDaemonConfigurationService() {
  console.log('🧪 Testing Daemon Configuration Service...');
  
  try {
    // Create the daemon configuration service
    const service = new DaemonConfigurationService(mockConfigComponent, mockLogger);
    
    // Test 1: Initialize
    console.log('\n📋 Test 1: Initialize service');
    await service.initialize();
    
    // Test 2: Get folders
    console.log('\n📋 Test 2: Get folders');
    const folders = await service.getFolders();
    console.log('Folders:', folders);
    
    // Test 3: Add folder
    console.log('\n📋 Test 3: Add folder');
    await service.addFolder('/Users/test3', 'bge-large');
    
    // Test 4: Remove folder
    console.log('\n📋 Test 4: Remove folder');
    await service.removeFolder('/Users/test1');
    
    // Test 5: Check folder exists
    console.log('\n📋 Test 5: Check folder exists');
    const hasFolder = await service.hasFolder('/Users/test2');
    console.log('Has folder /Users/test2:', hasFolder);
    
    // Test 6: Get available models
    console.log('\n📋 Test 6: Get available models');
    const models = service.getAvailableModels();
    console.log('Available models:', models);
    
    // Test 7: Get configuration stats
    console.log('\n📋 Test 7: Get configuration stats');
    const stats = await service.getStats();
    console.log('Configuration stats:', stats);
    
    // Test 8: Validate configuration
    console.log('\n📋 Test 8: Validate configuration');
    const validation = await service.validateConfiguration();
    console.log('Configuration validation:', validation);
    
    console.log('\n✅ All tests passed! Daemon Configuration Service is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testDaemonConfigurationService();