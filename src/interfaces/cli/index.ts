/**
 * CLI Interface Module
 * 
 * This module provides the command-line interface,
 * acting as a thin layer that delegates to application services.
 */

// Interface types
export interface CLIProgram {
  addCommand(command: CLICommand): void;
  execute(args: string[]): Promise<void>;
  getCommands(): CLICommand[];
}

export interface CLICommand {
  name: string;
  description: string;
  options: CLIOption[];
  execute(options: CLICommandOptions): Promise<void>;
}

export interface CLIOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: any;
}

export interface CLICommandOptions {
  [key: string]: any;
}

export interface CLIContext {
  workingDirectory: string;
  configPath?: string;
  verbosity: 'quiet' | 'normal' | 'verbose' | 'debug';
  outputFormat: 'text' | 'json' | 'table';
}

// Interface implementations
export { FolderMCPCLI } from './program.js';
export { CLIOptionsParser } from './options.js';
export { CLIFactory } from './factory.js';
export { CLIEntry, executeCliProgram } from './entry.js';

// Commands
export { 
  IndexCommand, 
  ServeCommand, 
  EmbeddingsCommand, 
  SearchCommand, 
  WatchCommand 
} from './commands/commands.js';
