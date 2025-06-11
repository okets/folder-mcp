/**
 * Watch Command Implementation
 * 
 * Handles file watching by delegating to the MonitoringWorkflow application service.
 */

import { CLICommand, CLICommandOptions } from '../index.js';
import { IMonitoringWorkflow } from '../../../di/interfaces.js';
import { resolveConfig, parseCliArgs, validateResolvedConfig, displayConfigSummary } from '../../../config/resolver.js';
import { initializeLocalConfig } from '../../../config/local.js';

export class WatchCommand implements CLICommand {
  name = 'watch';
  description = 'Watch folder for changes and update index automatically';
  options = [
    { name: 'debounce', alias: 'd', type: 'number' as const, description: 'Override debounce delay in milliseconds' },
    { name: 'batch-size', alias: 'b', type: 'number' as const, description: 'Override embedding batch size' },
    { name: 'verbose', alias: 'v', type: 'boolean' as const, description: 'Enable verbose logging' },
    { name: 'quiet', alias: 'q', type: 'boolean' as const, description: 'Minimize log output' },
    { name: 'chunk-size', type: 'number' as const, description: 'Override chunk size for text processing' },
    { name: 'overlap', type: 'number' as const, description: 'Override overlap size between chunks' },
    { name: 'model', type: 'string' as const, description: 'Override embedding model to use' },
    { name: 'extensions', type: 'array' as const, description: 'Override file extensions to process (comma-separated)' },
    { name: 'ignore', type: 'array' as const, description: 'Override ignore patterns (comma-separated)' },
    { name: 'max-operations', type: 'number' as const, description: 'Override max concurrent operations' },
    { name: 'show-config', type: 'boolean' as const, description: 'Show resolved configuration before starting' },
    { name: 'use-di', type: 'boolean' as const, description: 'Use dependency injection (experimental)' }
  ];

  constructor(
    private readonly monitoringWorkflow: IMonitoringWorkflow,
    private readonly packageJson: any
  ) {}

  async execute(options: CLICommandOptions): Promise<void> {
    const args = options._args as string[];
    const folder = args[0];

    if (!folder) {
      console.error('❌ Error: Folder argument is required');
      console.log('Usage: folder-mcp watch <folder> [options]');
      process.exit(1);
    }

    // Parse CLI arguments and resolve configuration
    const cliArgs = parseCliArgs(options);
    const config = resolveConfig(folder, cliArgs);

    // Validate configuration
    const validationErrors = validateResolvedConfig(config);
    if (validationErrors.length > 0) {
      console.error('❌ Configuration validation errors:');
      validationErrors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Initialize local config
    await initializeLocalConfig(folder);

    // Show configuration if requested
    if (options.showConfig) {
      displayConfigSummary(config, false);
    }

    // Determine log level
    let logLevel: 'verbose' | 'normal' | 'quiet' = 'normal';
    if (options.verbose) logLevel = 'verbose';
    if (options.quiet) logLevel = 'quiet';

    try {
      console.log(`👁️  Starting file watcher for: ${folder}`);
      console.log(`   ⏱️  Debounce delay: ${config.debounceDelay}ms`);
      console.log(`   📊 Batch size: ${config.batchSize}`);
      console.log(`   🔧 Log level: ${logLevel}`);
      console.log(`   ⏹️  Press Ctrl+C to stop\n`);
      
      // For now, use the legacy implementation
      // In the future, this should use monitoringWorkflow.startWatching()
      const { startWatching, setupGracefulShutdown } = await import('../../../watch/index.js');
      
      const watcher = await startWatching(folder, this.packageJson, {
        debounceDelay: config.debounceDelay,
        batchSize: config.batchSize,
        logLevel,
        resolvedConfig: config
      });

      setupGracefulShutdown(watcher);
      await new Promise(() => {}); // Run indefinitely until interrupted
      
    } catch (error) {
      console.error('❌ Failed to start file watcher:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}
