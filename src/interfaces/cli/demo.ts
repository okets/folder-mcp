/**
 * CLI Interface Demonstration
 * 
 * Demonstrates the modular CLI interface with dependency injection.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CLIFactory } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function demonstrateModularCLI(): Promise<void> {
  try {
    console.log('🚀 Demonstrating Modular CLI Interface');
    
    // Read package.json
    const packageJsonPath = join(__dirname, '..', '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    // Create CLI with DI
    const cli = await CLIFactory.createWithDI(packageJson);
    
    console.log('✅ CLI Interface Created');
    console.log(`   Program name: ${cli.name()}`);
    console.log(`   Version: ${cli.version()}`);
    
    // Demonstrate command execution
    console.log('\n📝 Available Commands:');
    cli.commands.forEach((cmd: { name: () => string; description: () => string }) => {
      console.log(`   - ${cmd.name()}: ${cmd.description()}`);
    });
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
