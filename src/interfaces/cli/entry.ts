/**
 * Modern CLI Entry Point
 * 
 * Main entry point for the CLI using the modular interface architecture.
 */

import { CLIFactory } from './index.js';

export interface CLIEntryOptions {
  packageJson: any;
}

export class CLIEntry {
  /**
   * Create and execute the CLI
   */
  static async run(args: string[], options: CLIEntryOptions): Promise<void> {
    try {
      // Create and run the modular CLI with DI
      const cli = await CLIFactory.createWithDI(options.packageJson);
      await cli.execute(args);
    } catch (error) {
      console.error('❌ CLI execution failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}
