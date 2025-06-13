#!/usr/bin/env node

/**
 * CLI Interface Module
 * 
 * This module provides the command-line interface,
 * acting as a thin layer that delegates to application services.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Only run CLI if this is the main module
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  // CLI Runner
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  async function main() {
    try {
      // Dynamic import to avoid circular dependencies
      const { CLIEntry } = await import('./entry.js');
      
      // Read package.json to get version
      const packageJsonPath = join(__dirname, '..', '..', '..', 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      // Run CLI with appropriate configuration
      await CLIEntry.run(process.argv, {
        packageJson
      });

    } catch (error) {
      console.error('❌ CLI startup failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  // Execute CLI
  main();
}

// Core interfaces
export { CLIEntry } from './entry.js';
export { CLIFactory } from './factory.js';
export { CLIProgram } from './program.js';
export type { CLIContext } from './program.js';

// Command implementations
export { IndexCommand } from './commands/index.js';
export { ServeCommand } from './commands/serve.js';
export { EmbeddingsCommand } from './commands/embed.js';
export { SearchCommand } from './commands/search.js';
export { WatchCommand } from './commands/watch.js';

// Security command implementations (new)
export { GenerateKeyCommand } from './commands/generate-key.js';
export { RotateKeyCommand } from './commands/rotate-key.js';
export { ShowKeyCommand } from './commands/show-key.js';
export { RevokeKeyCommand } from './commands/revoke-key.js';
