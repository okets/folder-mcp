/**
 * CLI Program Implementation
 * 
 * Main CLI program that coordinates commands and handles command execution.
 * This is a thin interface layer that delegates to application services.
 */

import { Command } from 'commander';

export interface CLIContext {
  workingDirectory: string;
  verbosity: 'verbose' | 'normal' | 'quiet';
  outputFormat: 'text' | 'json';
}

export class CLIProgram extends Command {
  private context: CLIContext = {
    workingDirectory: process.cwd(),
    verbosity: 'normal',
    outputFormat: 'text'
  };

  constructor() {
    super();
  }

  getContext(): CLIContext {
    return { ...this.context };
  }

  updateContext(updates: Partial<CLIContext>): void {
    this.context = { ...this.context, ...updates };
  }

  async execute(args: string[]): Promise<void> {
    await this.parseAsync(args);
  }
}
