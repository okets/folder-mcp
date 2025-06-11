#!/usr/bin/env node

/**
 * Main Entry Point for folder-mcp
 * 
 * This entry point uses the unified MCP server implementation with proper
 * dependency injection and modular architecture.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    // Check if folder path is provided as argument
    const folderPath = process.argv[2];
    if (!folderPath) {
      console.error('Usage: folder-mcp <folder-path>');
      console.error('');
      console.error('Example: folder-mcp ./my-folder');
      process.exit(1);
    }

    // Import the unified MCP server and DI system
    const { setupDependencyInjection } = await import('./di/setup.js');
    const { getContainer } = await import('./di/container.js');
    const { SERVICE_TOKENS } = await import('./di/interfaces.js');
    const { resolveConfig } = await import('./config/resolver.js');

    // Resolve configuration
    const config = resolveConfig(folderPath, {});

    // Setup dependency injection
    const container = setupDependencyInjection({
      config,
      folderPath,
      logLevel: 'info'
    });

    // Get the unified MCP server
    const unifiedMCPServer = container.resolve(SERVICE_TOKENS.UNIFIED_MCP_SERVER) as import('./interfaces/mcp/index.js').MCPServerInterface;

    // Setup graceful shutdown
    const shutdown = async () => {
      console.error('\n📡 Received shutdown signal, stopping server...');
      try {
        await unifiedMCPServer.stop();
        console.error('✅ Server stopped successfully');
      } catch (error) {
        console.error('❌ Error stopping server:', error);
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start the server
    await unifiedMCPServer.start();
    console.error('✅ Unified MCP Server running on stdio');

  } catch (error) {
    console.error('❌ Server startup failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute main function if this file is run directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === fileURLToPath(`file://${process.argv[1]}`)) {
  main().catch((error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });
}
