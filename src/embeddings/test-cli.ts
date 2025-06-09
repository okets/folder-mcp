#!/usr/bin/env node

/**
 * CLI tool for testing embedding model configurations
 */

import { runModelSwitchingTests } from './test-switching.js';
import { testEmbeddingSystem, listEmbeddingModels } from './index.js';

const command = process.argv[2];

async function main() {
  console.log('🔧 Embedding Model Configuration Tool\n');
  
  switch (command) {
    case 'list':
      console.log('📋 Available embedding models:');
      const models = listEmbeddingModels();
      models.forEach(({ key, config }) => {
        console.log(`\n🔸 ${key} ${config.isDefault ? '(default)' : ''}`);
        console.log(`   Name: ${config.name}`);
        console.log(`   Dimensions: ${config.dimensions}`);
        console.log(`   Description: ${config.description}`);
        console.log(`   Transformers: ${config.transformersModel}`);
        console.log(`   Ollama: ${config.ollamaModel}`);
        if (config.maxTokens) {
          console.log(`   Max tokens: ${config.maxTokens}`);
        }
      });
      break;
      
    case 'test-basic':
      console.log('🧪 Running basic embedding system test...\n');
      await testEmbeddingSystem();
      break;
      
    case 'test-switching':
      console.log('🔄 Running model switching tests...\n');
      await runModelSwitchingTests();
      break;
      
    case 'help':
    default:
      console.log('Usage: node test-cli.js <command>');
      console.log('\nCommands:');
      console.log('  list            List all available embedding models');
      console.log('  test-basic      Run basic embedding system test');
      console.log('  test-switching  Run comprehensive model switching tests');
      console.log('  help            Show this help message');
      break;
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
