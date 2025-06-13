/**
 * Show API Key Command
 * 
 * Displays the current API key for a folder in a secure format.
 * Shows metadata and usage information without exposing the full key by default.
 */

import { Command } from 'commander';
import { ApiKeyManager } from '../../../transport/security.js';

export class ShowKeyCommand extends Command {
  constructor() {
    super('show-key');
    
    this
      .description('Show the current API key information for a folder')
      .argument('<folder>', 'Folder path to show API key for')
      .option('--reveal', 'Show the full API key (use with caution)', false)
      .option('--format <format>', 'Output format (text|json)', 'text')
      .action(this.execute.bind(this));
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      const keyManager = ApiKeyManager.getInstance();
      
      // Load the API key
      const apiKey = await keyManager.loadApiKey(folder);
      
      if (!apiKey) {
        if (options.format === 'json') {
          console.log(JSON.stringify({
            success: false,
            error: 'No valid API key found for this folder'
          }, null, 2));
        } else {
          console.error('❌ No valid API key found for this folder.');
          console.error('The key may have expired, been revoked, or never existed.');
          console.error('Use "folder-mcp generate-key <folder>" to create a new one.');
        }
        process.exit(1);
      }
      
      if (options.format === 'json') {
        const result: any = {
          success: true,
          keyId: apiKey.metadata.keyId,
          folderPath: apiKey.metadata.folderPath,
          createdAt: apiKey.metadata.createdAt.toISOString(),
          lastUsed: apiKey.metadata.lastUsed?.toISOString(),
          revoked: apiKey.metadata.revoked,
          displayKey: keyManager.getKeyDisplayString(apiKey.key)
        };
        
        if (apiKey.metadata.expiresAt) {
          result.expiresAt = apiKey.metadata.expiresAt.toISOString();
        }
        
        if (apiKey.metadata.rotatedFrom) {
          result.rotatedFrom = apiKey.metadata.rotatedFrom;
        }
        
        if (options.reveal) {
          result.key = apiKey.key;
        }
        
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('🔑 API Key Information');
        console.log('');
        console.log(`📁 Folder: ${folder}`);
        console.log(`🆔 Key ID: ${apiKey.metadata.keyId}`);
        console.log(`📅 Created: ${apiKey.metadata.createdAt.toLocaleString()}`);
        
        if (apiKey.metadata.lastUsed) {
          console.log(`🕒 Last Used: ${apiKey.metadata.lastUsed.toLocaleString()}`);
        }
        
        if (apiKey.metadata.expiresAt) {
          console.log(`⏰ Expires: ${apiKey.metadata.expiresAt.toLocaleString()}`);
        }
        
        if (apiKey.metadata.rotatedFrom) {
          console.log(`🔄 Rotated From: ${apiKey.metadata.rotatedFrom}`);
        }
        
        console.log(`🔒 Status: ${apiKey.metadata.revoked ? 'Revoked' : 'Active'}`);
        console.log('');
        
        if (options.reveal) {
          console.log('🔐 Full API Key:');
          console.log(`   ${apiKey.key}`);
          console.log('');
          console.log('⚠️  WARNING: This key grants full access to your folder-mcp server!');
        } else {
          console.log('🔐 API Key (masked):');
          console.log(`   ${keyManager.getKeyDisplayString(apiKey.key)}`);
          console.log('');
          console.log('💡 Use --reveal to show the full key (use with caution)');
        }
        
        console.log('');
        console.log('📋 Usage:');
        console.log('   • gRPC metadata: authorization: Bearer <YOUR_KEY>');
        console.log('   • HTTP header: Authorization: Bearer <YOUR_KEY>');
        console.log('   • HTTP header: x-api-key: <YOUR_KEY>');
        
        if (!options.reveal) {
          console.log('');
          console.log('🔄 Management:');
          console.log('   • Rotate key: folder-mcp rotate-key <folder>');
          console.log('   • Revoke key: folder-mcp revoke-key <folder>');
        }
      }
      
    } catch (error) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }, null, 2));
      } else {
        console.error('❌ Failed to show API key:', error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  }
}
