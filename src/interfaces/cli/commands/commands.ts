/**
 * CLI Commands Index
 * 
 * Exports all available CLI commands with lazy dependency injection.
 */

import { CLIProgram } from '../program.js';
import { IndexCommand } from './index.js';
import { ServeCommand } from './serve.js';
import { EmbeddingsCommand } from './embed.js';
import { SearchCommand } from './search.js';
import { WatchCommand } from './watch.js';
import { StatusCommand } from './status.js';
import { ConfigCommand } from './config.js';

export function setupCommands(program: CLIProgram): void {
  // Add all commands - they now use lazy DI resolution, so no need to resolve services here
  
  // Core functionality commands
  program.addCommand(new IndexCommand());
  program.addCommand(new ServeCommand());
  program.addCommand(new EmbeddingsCommand());
  program.addCommand(new SearchCommand());
  program.addCommand(new WatchCommand());
  
  // Status and configuration commands
  program.addCommand(new StatusCommand());
  program.addCommand(new ConfigCommand());
}
