/**
 * Serve Command Implementation
 * 
 * Handles MCP server startup with transport layer integration and API key management.
 * Supports multiple transport protocols and automatic API key generation.
 * Uses lazy dependency injection to avoid requiring services at construction time.
 */

import { BaseCommand } from './base-command.js';
import { MODULE_TOKENS } from '../../../di/interfaces.js';
import type { IContentServingWorkflow } from '../../../di/interfaces.js';
import { ApiKeyManager } from '../../../transport/security.js';

export class ServeCommand extends BaseCommand {
  constructor() {
    super('serve');
    
    this
      .description('Start the MCP server for a folder with transport layer support')
      .argument('<folder>', 'Folder to serve')
      .option('-p, --port <number>', 'Port to listen on', '3000')
      .option('-h, --host <string>', 'Host to listen on', 'localhost')
      .option('-t, --transport <string>', 'Transport protocol to use (local|remote|http|auto)', 'auto')
      .option('--grpc-port <number>', 'gRPC port for remote transport', '50051')
      .option('--http-port <number>', 'HTTP port for REST gateway', '8080')
      .option('--generate-key', 'Auto-generate API key if none exists', false)
      .option('--show-key', 'Display API key information on startup', false)
      .option('--no-key', 'Disable API key generation (local-only mode)', false)
      .action(this.execute.bind(this));
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      // Handle API key management
      await this.handleApiKeyManagement(folder, options);
        // Resolve the content serving workflow service lazily
      const servingWorkflow = this.resolveService<IContentServingWorkflow>(
        folder,
        MODULE_TOKENS.APPLICATION.CONTENT_SERVING_WORKFLOW
      );
      
      // Start the server with transport configuration
      await servingWorkflow.startServer(folder, {
        port: parseInt(options.port),
        host: options.host
        // TODO: Pass transport configuration when workflow interface is updated
      });
      
      // Display server information
      this.displayServerInfo(folder, options);
      
    } catch (error) {
      console.error('❌ Failed to start server:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
  
  /**
   * Handle API key management on server startup
   */
  private async handleApiKeyManagement(folder: string, options: any): Promise<void> {
    if (options.noKey) {
      console.log('🔓 Running in local-only mode (no API key)');
      return;
    }
    
    const keyManager = ApiKeyManager.getInstance();
    
    // Check if API key exists
    const hasKey = await keyManager.hasApiKey(folder);
    
    if (!hasKey && (options.generateKey || options.transport !== 'local')) {
      console.log('🔑 No API key found. Generating new API key...');
      
      try {
        const apiKey = await keyManager.generateApiKey(folder);
        console.log('✅ API key generated successfully!');
        console.log('');
        console.log('🔐 Your API Key:');
        console.log(`   ${apiKey.key}`);
        console.log('');
        console.log('⚠️  IMPORTANT: Store this key securely!');
        console.log('   Use "folder-mcp show-key <folder>" to view it again.');
        console.log('');
      } catch (error) {
        console.error('❌ Failed to generate API key:', error instanceof Error ? error.message : String(error));
        if (options.transport === 'remote') {
          console.error('   Remote transport requires an API key. Exiting.');
          process.exit(1);
        }
      }
    } else if (options.showKey && hasKey) {
      // Show existing key information
      const apiKey = await keyManager.loadApiKey(folder);
      if (apiKey) {
        console.log('🔑 API Key Information:');
        console.log(`   Key ID: ${apiKey.metadata.keyId}`);
        console.log(`   Created: ${apiKey.metadata.createdAt.toLocaleString()}`);
        console.log(`   Masked Key: ${keyManager.getKeyDisplayString(apiKey.key)}`);
        console.log('   Use "folder-mcp show-key --reveal <folder>" to see the full key.');
        console.log('');
      }
    }
  }
  
  /**
   * Display server startup information
   */
  private displayServerInfo(folder: string, options: any): void {
    console.log('🚀 folder-mcp server started successfully!');
    console.log('');
    console.log(`📁 Serving folder: ${folder}`);
    console.log(`🌐 Transport: ${options.transport}`);
    
    if (options.transport === 'auto' || options.transport === 'http') {
      console.log(`🔗 HTTP endpoint: http://${options.host}:${options.httpPort || 8080}/v1`);
    }
    
    if (options.transport === 'auto' || options.transport === 'remote') {
      console.log(`🔗 gRPC endpoint: ${options.host}:${options.grpcPort || 50051}`);
    }
    
    if (options.transport === 'auto' || options.transport === 'local') {
      const socketPath = process.platform === 'win32' 
        ? '\\\\.\\pipe\\folder-mcp'
        : '/tmp/folder-mcp.sock';
      console.log(`🔗 Local socket: ${socketPath}`);
    }
    
    console.log('');
    console.log('💡 Management commands:');
    console.log('   • Show API key: folder-mcp show-key <folder>');
    console.log('   • Rotate API key: folder-mcp rotate-key <folder>');
    console.log('   • Revoke API key: folder-mcp revoke-key <folder>');
    console.log('');
    console.log('Press Ctrl+C to stop the server.');
  }
}
