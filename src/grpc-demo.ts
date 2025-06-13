/**
 * gRPC Server Demo
 * 
 * Simple demo to test the gRPC server implementation
 */

import { TransportManager } from './grpc/transport-manager.js';
import { createDefaultGrpcConfig } from './config/grpc-config.js';
import { setupDependencyInjection } from './di/setup.js';

async function main() {
  try {
    console.log('🚀 Starting gRPC Server Demo...');
    
    // Create DI container with proper setup
    const container = setupDependencyInjection({
      folderPath: process.cwd(),
      logLevel: 'info'
    });
    
    // Create gRPC configuration
    const grpcConfig = createDefaultGrpcConfig(process.cwd());
    
    // Enable TCP for testing authentication
    grpcConfig.tcp.enabled = true;
    
    // Use a different pipe name for testing
    grpcConfig.unix.path = process.platform === 'win32' 
      ? '\\\\.\\pipe\\folder-mcp-auth-test'
      : '/tmp/folder-mcp-auth-test.sock';
    
    console.log('📋 gRPC Configuration:', {
      unix: grpcConfig.unix,
      tcp: grpcConfig.tcp
    });
    
    // Create and start transport manager
    const transportManager = new TransportManager(grpcConfig, container);
    
    console.log('🏗️  Initializing transport manager...');
    await transportManager.start();
    
    console.log('✅ gRPC Server started successfully!');
    
    // Generate and display API key if needed for remote access
    if (grpcConfig.requireAuthForRemote) {
      const server = transportManager.getServer();
      const apiKey = await server.getOrGenerateApiKey('Demo API Key');
      console.log('🔑 API Key for remote access:', apiKey);
      console.log('💡 Use this key in the Authorization header: Bearer ' + apiKey);
      console.log('   Or use the x-api-key header: ' + apiKey);
    }
    
    // Log status
    const status = transportManager.getStatus();
    console.log('📊 Transport Status:', JSON.stringify(status, null, 2));
    
    console.log('🔍 Server is running. Try testing with a gRPC client!');
    console.log('💡 To stop the server, press Ctrl+C');
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start gRPC server:', error);
    process.exit(1);
  }
}

// Run the demo
if (process.argv.length > 1 && (process.argv[1]?.endsWith('grpc-demo.js') || process.argv[1]?.endsWith('grpc-demo.ts'))) {
  main().catch(console.error);
}
