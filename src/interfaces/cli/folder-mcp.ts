#!/usr/bin/env node
/**
 * folder-mcp CLI
 *
 * Unified command-line interface for folder-mcp.
 *
 * Default behavior:
 * - folder-mcp → Launch TUI (detect daemon, connect or start)
 * - folder-mcp --daemon → Start daemon only
 * - folder-mcp --headless → Skip TUI (future)
 * - folder-mcp config → Configuration management
 * - folder-mcp mcp server → Start MCP server in stdio mode (for client connections)
 * - folder-mcp connect claude-desktop → Auto-configure Claude Desktop (cross-platform)
 */

import { Command } from 'commander';
import { createSimpleConfigCommand } from './commands/simple-config.js';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import {
  configureClaudeDesktop,
  checkClaudeDesktopStatus,
  removeFromClaudeDesktop,
  getClaudeDesktopConfigPath,
  getPlatformDisplayName,
  formatConfigForDisplay
} from '../../infrastructure/claude-desktop-config.js';

// Get current file directory for relative path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('folder-mcp')
  .description('folder-mcp unified application')
  .version('1.0.0')
  .option('--daemon', 'Start daemon only (no TUI)')
  .option('--headless', 'Skip TUI, run headless (future)')
  .option('--port <port>', 'Daemon port (default: 9876)', parseInt)
  .option('-d, --dir <path>', 'Folder to index (passed to TUI)')
  .option('-m, --model <model>', 'Embedding model to use (passed to TUI)');

// Add the config command
program.addCommand(createSimpleConfigCommand());

// Add the mcp command with server subcommand
const mcpCommand = new Command('mcp')
  .description('MCP server commands');

mcpCommand
  .command('server')
  .description('Start MCP server in stdio mode (for MCP client connections)')
  .action(async () => {
    // Import and run MCP server
    // Path is relative from dist/src/interfaces/cli/ to dist/src/mcp-server.js
    const mcpServerPath = join(__dirname, '..', '..', 'mcp-server.js');

    if (!existsSync(mcpServerPath)) {
      console.error(chalk.red('MCP server not found. Please run: npm run build'));
      process.exit(1);
    }

    // Dynamic import and explicitly call main() to start the server
    // The module guard doesn't trigger when imported, so we call main() directly
    // Pass empty options to use daemon mode (no folder path = connect to daemon)
    const mcpModule = await import(mcpServerPath);
    await mcpModule.main({});
  });

program.addCommand(mcpCommand);

// Add the connect command for Claude Desktop configuration
const connectCommand = new Command('connect')
  .description('Configure MCP clients to connect to folder-mcp');

connectCommand
  .command('claude-desktop')
  .description('Auto-configure Claude Desktop to use folder-mcp')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('--remove', 'Remove folder-mcp from Claude Desktop')
  .option('--status', 'Check current configuration status')
  .action(async (options) => {
    const platform = getPlatformDisplayName();
    const configPath = getClaudeDesktopConfigPath();

    console.log(chalk.blue(`\nClaude Desktop Configuration (${platform})`));
    console.log(chalk.gray(`Config: ${configPath}\n`));

    // Status check
    if (options.status) {
      const status = checkClaudeDesktopStatus();
      if (status.success) {
        if (status.isConfigured) {
          console.log(chalk.green('✅ folder-mcp is configured'));
          if (status.needsUpdate) {
            console.log(chalk.yellow('⚠️  Configuration differs from current installation'));
            console.log(chalk.gray('\nCurrent config:'));
            console.log(formatConfigForDisplay(status.previousConfig!));
            console.log(chalk.gray('\nExpected config:'));
            console.log(formatConfigForDisplay(status.newConfig!));
            console.log(chalk.gray('\nRun without --status to update.'));
          } else {
            console.log(chalk.gray('\nConfig:'));
            console.log(formatConfigForDisplay(status.previousConfig!));
          }
        } else {
          console.log(chalk.yellow('⚠️  folder-mcp is not configured'));
          console.log(chalk.gray('\nRun without --status to configure.'));
        }
      } else {
        console.log(chalk.red(`❌ ${status.message}`));
      }
      return;
    }

    // Remove configuration
    if (options.remove) {
      const result = removeFromClaudeDesktop();
      if (result.success) {
        console.log(chalk.green(`✅ ${result.message}`));
        if (result.previousConfig) {
          console.log(chalk.gray('\nRemoved config:'));
          console.log(formatConfigForDisplay(result.previousConfig));
        }
        console.log(chalk.yellow('\n⚠️  Restart Claude Desktop to apply changes'));
      } else {
        console.log(chalk.red(`❌ ${result.message}`));
        process.exit(1);
      }
      return;
    }

    // Configure
    const result = configureClaudeDesktop('folder-mcp', options.force);
    if (result.success) {
      console.log(chalk.green(`✅ ${result.message}`));
      console.log(chalk.gray('\nConfig entry:'));
      console.log(formatConfigForDisplay(result.newConfig!));

      if (result.previousConfig) {
        console.log(chalk.gray('\nPrevious config (will be replaced):'));
        console.log(formatConfigForDisplay(result.previousConfig));
      }

      console.log(chalk.yellow('\n⚠️  Restart Claude Desktop to apply changes'));
    } else {
      console.log(chalk.red(`❌ ${result.message}`));
      process.exit(1);
    }
  });

// Shortcut: `folder-mcp connect` defaults to claude-desktop
connectCommand.action(() => {
  console.log(chalk.blue('Available connection targets:'));
  console.log('  claude-desktop  Configure Claude Desktop app');
  console.log(chalk.gray('\nUsage: folder-mcp connect claude-desktop [options]'));
  console.log(chalk.gray('       folder-mcp connect claude-desktop --status'));
  console.log(chalk.gray('       folder-mcp connect claude-desktop --remove'));
});

program.addCommand(connectCommand);

// Add a simple help enhancement
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s'), program.args.join(' '));
  console.log('See --help for a list of available commands.');
  process.exit(1);
});

// Custom action for default behavior (no subcommand)
program.action(async (options) => {
  if (options.daemon) {
    await startDaemon(options);
  } else if (options.headless) {
    console.log(chalk.yellow('--headless mode not yet implemented'));
    process.exit(1);
  } else {
    await startTUI(options);
  }
});

// Parse arguments
program.parse(process.argv);

// If no arguments provided, show default behavior (start TUI)
if (!process.argv.slice(2).length) {
  startTUI({}).catch((error) => {
    console.error('Error starting TUI:', error);
    process.exit(1);
  });
}

/**
 * Start the daemon
 */
async function startDaemon(options: any): Promise<void> {
  console.log(chalk.blue('Starting folder-mcp daemon...'));
  
  // Build path to our daemon
  const daemonPath = join(process.cwd(), 'dist', 'src', 'daemon', 'index.js');
  
  // Check if daemon is compiled
  if (!existsSync(daemonPath)) {
    console.error(chalk.red('Daemon not found. Please run: npm run build'));
    process.exit(1);
  }
  
  // Check if daemon is already running
  const daemonStatus = isDaemonRunning();
  if (daemonStatus.running) {
    console.log(chalk.yellow(`Daemon already running with PID ${daemonStatus.pid}`));
    process.exit(0);
  }
  
  // Start daemon
  const args = [];
  if (options.port) {
    args.push('--port', options.port.toString());
  }
  
  const daemonProcess = spawn('node', [daemonPath, ...args], {
    detached: true,
    stdio: 'ignore'
  });
  
  // Detach so parent can exit
  daemonProcess.unref();
  
  // Wait a moment and check if it started
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newStatus = isDaemonRunning();
  if (newStatus.running) {
    console.log(chalk.green(`✅ Daemon started with PID ${newStatus.pid}`));
    console.log(chalk.gray(`Health check: http://localhost:${options.port || 9876}/health`));
  } else {
    console.error(chalk.red('❌ Failed to start daemon'));
    process.exit(1);
  }
}

/**
 * Start the TUI
 */
async function startTUI(options: any): Promise<void> {
  console.log(chalk.blue('Starting folder-mcp TUI...'));
  
  // Build path to TUI
  const tuiPath = join(process.cwd(), 'dist', 'src', 'interfaces', 'tui-ink', 'index.js');
  
  // Check if TUI is compiled
  if (!existsSync(tuiPath)) {
    console.error(chalk.red('TUI not found. Please run: npm run build'));
    process.exit(1);
  }
  
  // Check daemon status
  const daemonStatus = isDaemonRunning();
  
  if (!daemonStatus.running) {
    console.log(chalk.yellow('Daemon not running, starting...'));
    await startDaemon(options);
    
    // Wait for daemon to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Start TUI
  const args = [tuiPath];
  if (options.dir) {
    args.push('-d', options.dir);
  }
  if (options.model) {
    args.push('-m', options.model);
  }
  
  const tuiProcess = spawn('node', args, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  // Forward exit codes
  tuiProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
  
  tuiProcess.on('error', (error) => {
    console.error(chalk.red('TUI error:'), error);
    process.exit(1);
  });
}

/**
 * Check if daemon is running
 */
function isDaemonRunning(): { running: boolean; pid?: number } {
  const configDir = join(homedir(), '.folder-mcp');
  const pidFile = join(configDir, 'daemon.pid');
  
  if (!existsSync(pidFile)) {
    return { running: false };
  }
  
  try {
    const pidStr = readFileSync(pidFile, 'utf8').trim();
    const pid = parseInt(pidStr, 10);
    
    if (isNaN(pid)) {
      return { running: false };
    }
    
    // Check if process is actually running
    try {
      process.kill(pid, 0); // Doesn't actually kill, just checks if process exists
      return { running: true, pid };
    } catch {
      return { running: false };
    }
  } catch (error) {
    return { running: false };
  }
}