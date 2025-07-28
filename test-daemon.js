#!/usr/bin/env node

/**
 * Test Daemon Runner
 * 
 * Starts the FMDM WebSocket server for testing purposes.
 * This creates a minimal daemon with just the WebSocket functionality.
 */

import { setupDependencyInjection } from './dist/src/di/setup.js';
import { SERVICE_TOKENS } from './dist/src/di/interfaces.js';

async function startTestDaemon() {
  console.log('🚀 Starting test daemon...');
  
  try {
    // Setup dependency injection
    const container = setupDependencyInjection({
      folderPath: process.cwd(),
      logLevel: 'debug'
    });
    
    console.log('✅ DI container initialized');
    
    // Get the daemon configuration service and initialize it
    const daemonConfigService = container.resolve(SERVICE_TOKENS.DAEMON_CONFIGURATION_SERVICE);
    await daemonConfigService.initialize();
    console.log('✅ Daemon configuration service initialized');
    
    // Get the FMDM service and load initial configuration
    const fmdmService = container.resolve(SERVICE_TOKENS.FMDM_SERVICE);
    await fmdmService.loadFoldersFromConfig();
    console.log('✅ FMDM service initialized');
    
    // Get the WebSocket server
    const wsServer = container.resolve(SERVICE_TOKENS.WEBSOCKET_SERVER);
    console.log('✅ WebSocket server created');
    
    // Start the WebSocket server
    await wsServer.start(31849);
    console.log('✅ WebSocket server started on ws://127.0.0.1:31849');
    
    console.log('\n🎯 Test daemon is ready!');
    console.log('📝 You can now run: node test-websocket.js');
    console.log('🔌 Or connect with wscat: wscat -c ws://127.0.0.1:31849');
    console.log('🛑 Press Ctrl+C to stop\n');
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down test daemon...');
      try {
        await wsServer.stop();
        console.log('✅ WebSocket server stopped');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('❌ Failed to start test daemon:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Test Daemon for FMDM WebSocket Server

Usage: node test-daemon.js [options]

Options:
  --help, -h     Show this help

This starts a minimal daemon with just the WebSocket server for testing.
Use this to test the FMDM WebSocket protocol without starting the full daemon.
`);
  process.exit(0);
}

startTestDaemon();