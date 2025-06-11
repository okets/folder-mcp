/**
 * CLI Program Implementation
 * 
 * Main CLI program that coordinates commands and handles command execution.
 * This is a thin interface layer that delegates to application services.
 */

import { Command } from 'commander';
import { CLIProgram, CLICommand, CLIContext } from './index.js';
import { IIndexingWorkflow, IContentServingWorkflow, IMonitoringWorkflow } from '../../di/interfaces.js';

export class FolderMCPCLI implements CLIProgram {
  private program: Command;
  private commands: Map<string, CLICommand> = new Map();
  private context: CLIContext;

  constructor(
    private readonly indexingWorkflow: IIndexingWorkflow,
    private readonly servingWorkflow: IContentServingWorkflow,
    private readonly monitoringWorkflow: IMonitoringWorkflow,
    private readonly packageJson: any
  ) {
    this.program = new Command();
    this.context = {
      workingDirectory: process.cwd(),
      verbosity: 'normal',
      outputFormat: 'text'
    };
    
    this.setupProgram();
  }

  private setupProgram(): void {
    this.program
      .name('folder-mcp')
      .description('Universal Folder-to-MCP-Server Tool - Transform any local folder into an intelligent knowledge base')
      .version(this.packageJson.version);
  }

  addCommand(command: CLICommand): void {
    this.commands.set(command.name, command);
    
    // Create Commander.js command
    const cmd = this.program
      .command(command.name)
      .description(command.description);

    // Add options
    command.options.forEach(option => {
      const flags = option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`;
      
      if (option.type === 'boolean') {
        cmd.option(flags, option.description);
      } else {
        const valueDesc = option.type === 'number' ? '<number>' : 
                         option.type === 'array' ? '<items>' : '<value>';
        cmd.option(`${flags} ${valueDesc}`, option.description, option.default);
      }
    });

    // Set command action
    cmd.action(async (...args) => {
      const options = args.pop(); // Last argument is options
      const commandArgs = args.slice(0, -1); // Remove the command object at the end
      
      try {
        await command.execute({
          ...options,
          _args: commandArgs,
          _context: this.context
        });
      } catch (error) {
        console.error(`❌ Command '${command.name}' failed:`, error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });
  }

  getCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  async execute(args: string[]): Promise<void> {
    await this.program.parseAsync(args);
  }

  updateContext(updates: Partial<CLIContext>): void {
    this.context = { ...this.context, ...updates };
  }

  getContext(): CLIContext {
    return { ...this.context };
  }
}
