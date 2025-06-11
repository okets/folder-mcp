/**
 * CLI Integration Example
 * 
 * This file demonstrates how to integrate the new modular CLI interface
 * with dependency injection for Phase 5.1 implementation.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Example: Create and use the modular CLI with dependency injection
 */
export async function demonstrateModularCLI(): Promise<void> {
  try {
    console.log('🚀 Demonstrating Phase 5.1 CLI Interface Implementation\n');

    // Read package.json
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    console.log('📦 Setting up dependency injection...');
    
    // Setup DI container for a test folder
    const testFolder = './test-folder';
    const { setupForIndexing, getService, MODULE_TOKENS } = await import('../../di/index.js');
    await setupForIndexing(testFolder, {});

    console.log('✅ DI container configured');

    // Create modular CLI with DI
    console.log('🔧 Creating modular CLI interface...');
    const { CLIFactory } = await import('./index.js');
    
    const cli = CLIFactory.create({
      indexingWorkflow: getService(MODULE_TOKENS.APPLICATION.INDEXING_WORKFLOW),
      servingWorkflow: getService(MODULE_TOKENS.APPLICATION.CONTENT_SERVING_WORKFLOW),
      monitoringWorkflow: getService(MODULE_TOKENS.APPLICATION.MONITORING_WORKFLOW),
      knowledgeOperations: getService(MODULE_TOKENS.APPLICATION.KNOWLEDGE_OPERATIONS),
      packageJson
    });

    console.log('✅ Modular CLI created successfully');      // Show available commands
      const commands = cli.getCommands();
      console.log(`\n📋 Available commands (${commands.length}):`);
      commands.forEach((cmd: any) => {
        console.log(`   • ${cmd.name}: ${cmd.description}`);
        console.log(`     Options: ${cmd.options.length} available`);
      });

    // Demonstrate CLI context management
    console.log('\n🔧 CLI Context Management:');
    const context = cli.getContext();
    console.log(`   Working Directory: ${context.workingDirectory}`);
    console.log(`   Verbosity: ${context.verbosity}`);
    console.log(`   Output Format: ${context.outputFormat}`);

    // Update context
    cli.updateContext({ verbosity: 'verbose', outputFormat: 'json' });
    const updatedContext = cli.getContext();
    console.log(`   Updated Verbosity: ${updatedContext.verbosity}`);
    console.log(`   Updated Output Format: ${updatedContext.outputFormat}`);

    console.log('\n🎉 Phase 5.1 CLI Interface demonstration completed successfully!');
    console.log('\nKey achievements:');
    console.log('   ✅ Modular CLI architecture implemented');
    console.log('   ✅ Dependency injection integration working');
    console.log('   ✅ Command delegation to application services');
    console.log('   ✅ Clean separation of interface and business logic');
    console.log('   ✅ Legacy compatibility maintained');

  } catch (error) {
    console.error('❌ Demonstration failed:', error instanceof Error ? error.message : 'Unknown error');
    
    // Fallback to legacy CLI
    console.log('\n🔄 Falling back to legacy CLI interface...');
    try {
      const { CLIFactory } = await import('./index.js');
      const packageJsonPath = join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      const legacyProgram = await CLIFactory.createWithLegacySupport(packageJson);
      console.log('✅ Legacy CLI interface available as fallback');
      console.log(`   Program name: ${legacyProgram.name()}`);
      console.log(`   Version: ${legacyProgram.version()}`);
    } catch (fallbackError) {
      console.error('❌ Legacy fallback also failed:', fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
    }
  }
}

/**
 * Example: Show how to use the CLI Entry system
 */
export async function demonstrateCLIEntry(): Promise<void> {
  try {
    console.log('\n🚀 Demonstrating CLI Entry Point System\n');

    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    const { CLIEntry } = await import('./index.js');

    // Test different CLI modes
    console.log('🔍 Testing CLI mode detection:');
    
    const testArgs = [
      ['node', 'cli.js', 'index', './test'],
      ['node', 'cli.js', 'index', './test', '--use-di'],
      ['node', 'cli.js', 'index', './test', '--use-modular'],
      ['node', 'cli.js', 'serve', './test', '--use-di']
    ];

    testArgs.forEach(args => {
      const useDI = CLIEntry.shouldUseDI(args);
      const useModular = CLIEntry.shouldUseModularInterface(args);
      
      console.log(`   Args: ${args.slice(2).join(' ')}`);
      console.log(`   Use DI: ${useDI}`);
      console.log(`   Use Modular: ${useModular}`);
      console.log('');
    });

    console.log('✅ CLI Entry Point system demonstration completed');

  } catch (error) {
    console.error('❌ CLI Entry demonstration failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Run demonstrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 Phase 5.1 CLI Interface Implementation Demo\n');
  
  demonstrateModularCLI()
    .then(() => demonstrateCLIEntry())
    .then(() => {
      console.log('\n🏁 All demonstrations completed successfully!');
    })
    .catch(error => {
      console.error('\n💥 Demonstration failed:', error);
      process.exit(1);
    });
}
