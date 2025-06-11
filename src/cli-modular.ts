#!/usr/bin/env node

/**
 * CLI Entry Point - Modular Architecture
 * 
 * This is the new CLI entry point that supports both the modular interface
 * with dependency injection and fallback to legacy commands.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CLIEntry } from './interfaces/cli/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    // Read package.json to get version
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    // Determine CLI mode based on command line arguments
    const args = process.argv;
    const useDI = CLIEntry.shouldUseDI(args);
    const useModular = CLIEntry.shouldUseModularInterface(args);

    // Run CLI with appropriate configuration
    await CLIEntry.run(args, {
      useDI,
      useModularInterface: useModular,
      packageJson
    });

  } catch (error) {
    console.error('❌ CLI startup failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute CLI
main();
