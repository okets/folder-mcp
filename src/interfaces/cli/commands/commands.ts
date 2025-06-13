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
import { GenerateKeyCommand } from './generate-key.js';
import { RotateKeyCommand } from './rotate-key.js';
import { ShowKeyCommand } from './show-key.js';
import { RevokeKeyCommand } from './revoke-key.js';
import { TestGrpcCommand } from './test-grpc.js';
import { TestMcpCommand } from './test-mcp.js';
import { StatusCommand } from './status.js';

export function setupCommands(program: CLIProgram): void {
  // Add all commands - they now use lazy DI resolution, so no need to resolve services here
  
  // Core functionality commands
  program.addCommand(new IndexCommand());
  program.addCommand(new ServeCommand());
  program.addCommand(new EmbeddingsCommand());
  program.addCommand(new SearchCommand());
  program.addCommand(new WatchCommand());
  
  // Security management commands
  program.addCommand(new GenerateKeyCommand());
  program.addCommand(new RotateKeyCommand());
  program.addCommand(new ShowKeyCommand());
  program.addCommand(new RevokeKeyCommand());
  
  // Transport testing and status commands
  program.addCommand(new TestGrpcCommand());
  program.addCommand(new TestMcpCommand());
  program.addCommand(new StatusCommand());
}
