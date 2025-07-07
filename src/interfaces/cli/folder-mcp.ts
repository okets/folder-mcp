#!/usr/bin/env node
/**
 * folder-mcp CLI
 * 
 * Simple command-line interface for folder-mcp configuration management.
 */

import { Command } from 'commander';
import { createSimpleConfigCommand } from './commands/simple-config.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('folder-mcp')
  .description('folder-mcp configuration and management')
  .version('1.0.0');

// Add the config command
program.addCommand(createSimpleConfigCommand());

// Add a simple help enhancement
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s'), program.args.join(' '));
  console.log('See --help for a list of available commands.');
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}