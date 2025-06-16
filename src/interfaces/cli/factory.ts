/**
 * CLI Factory
 * 
 * Creates and configures the complete CLI application with all commands.
 */

import { Command } from 'commander';
import { CLIProgram } from './program.js';
import { setupConfigCommand } from '../../config/cli.js';
import { configureLogCommands } from './commands/log.js';

export class CLIFactory {
  /**
   * Create a new CLI instance with dependency injection
   */
  static async createWithDI(packageJson: any): Promise<CLIProgram> {
    const program = new CLIProgram();
    
    program
      .name('folder-mcp')
      .description('Universal Folder-to-MCP-Server Tool - Transform any local folder into an intelligent knowledge base')
      .version(packageJson.version);    // Add config command (infrastructure layer)
    setupConfigCommand(program);
    
    // Add log management commands
    configureLogCommands(program);

    // Add modular commands
    await this.addModularCommands(program);

    return program;
  }

  /**
   * Add modular command implementations
   */
  private static async addModularCommands(program: CLIProgram): Promise<void> {
    const { setupCommands } = await import('./commands/commands.js');
    setupCommands(program);
  }
}
