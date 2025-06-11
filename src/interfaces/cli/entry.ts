/**
 * Modern CLI Entry Point
 * 
 * Main entry point for the CLI using the new modular interface architecture.
 * Supports both new modular commands and legacy fallback.
 */

import { FolderMCPCLI, CLIFactory } from './index.js';
import { setupConfigCommand } from '../../config/cli.js';

export interface CLIEntryOptions {
  useDI?: boolean;
  useModularInterface?: boolean;
  packageJson: any;
}

export class CLIEntry {
  
  /**
   * Create and execute the CLI
   */
  static async run(args: string[], options: CLIEntryOptions): Promise<void> {
    try {
      if (options.useModularInterface && options.useDI) {
        // Use the new modular interface with DI
        await this.runModularCLI(args, options.packageJson);
      } else if (options.useModularInterface) {
        // Use the new modular interface without DI (not fully implemented yet)
        console.warn('⚠️ Modular interface without DI not yet implemented, falling back to legacy');
        await this.runLegacyCLI(args, options.packageJson);
      } else {
        // Use legacy CLI
        await this.runLegacyCLI(args, options.packageJson);
      }
    } catch (error) {
      console.error('❌ CLI execution failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  /**
   * Run the new modular CLI with dependency injection
   */
  private static async runModularCLI(args: string[], packageJson: any): Promise<void> {
    try {
      console.log('🚀 Using modular CLI interface with dependency injection');
      
      // Create CLI with DI
      const cli = await CLIFactory.createWithDI(packageJson);
      
      // Execute the command
      await cli.execute(args);
      
    } catch (error) {
      console.warn('⚠️ Modular CLI failed, falling back to legacy:', error instanceof Error ? error.message : 'Unknown error');
      await this.runLegacyCLI(args, packageJson);
    }
  }

  /**
   * Run the legacy CLI implementation
   */
  private static async runLegacyCLI(args: string[], packageJson: any): Promise<void> {
    const program = await CLIFactory.createWithLegacySupport(packageJson);
    await program.parseAsync(args);
  }

  /**
   * Detect if DI should be used based on command line flags
   */
  static shouldUseDI(args: string[]): boolean {
    return args.includes('--use-di');
  }

  /**
   * Detect if modular interface should be used
   */
  static shouldUseModularInterface(args: string[]): boolean {
    return args.includes('--use-modular') || this.shouldUseDI(args);
  }
}

/**
 * Main CLI execution function
 */
export async function executeCliProgram(packageJson: any): Promise<void> {
  const args = process.argv;
  
  const options: CLIEntryOptions = {
    useDI: CLIEntry.shouldUseDI(args),
    useModularInterface: CLIEntry.shouldUseModularInterface(args),
    packageJson
  };

  await CLIEntry.run(args, options);
}
