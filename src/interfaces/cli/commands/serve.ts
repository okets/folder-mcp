/**
 * Serve Command Implementation
 * 
 * Handles MCP server startup by delegating to the ContentServingWorkflow application service.
 */

import { CLICommand, CLICommandOptions } from '../index.js';
import { IContentServingWorkflow } from '../../../di/interfaces.js';
import { resolveConfig, parseCliArgs, validateResolvedConfig, displayConfigSummary } from '../../../config/resolver.js';

export class ServeCommand implements CLICommand {
  name = 'serve';
  description = 'Start MCP server to serve folder content to LLM clients';
  options = [
    { name: 'port', alias: 'p', type: 'string' as const, description: 'Port number to listen on (default: 3000)', default: '3000' },
    { name: 'transport', alias: 't', type: 'string' as const, description: 'Transport type: stdio or http (default: stdio)', default: 'stdio' },
    { name: 'model', type: 'string' as const, description: 'Override embedding model to use' },
    { name: 'extensions', type: 'array' as const, description: 'Override file extensions to process (comma-separated)' },
    { name: 'ignore', type: 'array' as const, description: 'Override ignore patterns (comma-separated)' },
    { name: 'show-config', type: 'boolean' as const, description: 'Show resolved configuration before starting' },
    { name: 'use-di', type: 'boolean' as const, description: 'Use dependency injection (experimental)' }
  ];

  constructor(
    private readonly servingWorkflow: IContentServingWorkflow
  ) {}

  async execute(options: CLICommandOptions): Promise<void> {
    const args = options._args as string[];
    const folder = args[0];

    if (!folder) {
      console.error('❌ Error: Folder argument is required');
      console.log('Usage: folder-mcp serve <folder> [options]');
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

    // Show configuration if requested
    if (options.showConfig) {
      displayConfigSummary(config, false);
    }

    // Validate port
    const port = options.port ? parseInt(options.port, 10) : 3000;
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('❌ Port must be a valid number between 1 and 65535');
      process.exit(1);
    }

    // Validate transport
    const transport = options.transport as 'stdio' | 'http';
    if (transport !== 'stdio' && transport !== 'http') {
      console.error('❌ Transport must be either "stdio" or "http"');
      process.exit(1);
    }

    console.error(`🚀 Starting Folder MCP Server...`);
    console.error(`   📁 Folder: ${folder}`);
    console.error(`   🌐 Transport: ${transport}`);
    if (transport === 'http') {
      console.error(`   🔌 Port: ${port}`);
    }
    console.error(`   ⏹️  Press Ctrl+C to stop\n`);

    try {
      // For now, delegate to the existing MCP server implementation
      // In the future, this should be handled by a ContentServingWorkflow
      const { startMCPServer } = await import('../../../mcp/server.js');
      await startMCPServer({
        folderPath: folder,
        port,
        transport,
        resolvedConfig: config,
      });
    } catch (error) {
      console.error('❌ Failed to start MCP server:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}
