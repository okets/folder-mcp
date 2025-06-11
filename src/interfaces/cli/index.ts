/**
 * CLI Interface Module
 * 
 * This module provides the command-line interface,
 * acting as a thin layer that delegates to application services.
 */

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
