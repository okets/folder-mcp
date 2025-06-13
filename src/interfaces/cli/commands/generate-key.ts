/**
 * Generate API Key Command
 * 
 * Generates a new API key for a folder, or shows existing key if one exists.
 * Used for enabling remote access to folder-mcp services.
 */

import { Command } from 'commander';
import { ApiKeyManager } from '../../../transport/security.js';

export class GenerateKeyCommand extends Command {
  constructor() {
    super('generate-key');
    
    this
      .description('Generate a new API key for remote access to a folder')
      .argument('<folder>', 'Folder path to generate API key for')
      .option('-f, --force', 'Force generation of new key even if one exists', false)
      .option('--format <format>', 'Output format (text|json)', 'text')
      .action(this.execute.bind(this));
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      const keyManager = ApiKeyManager.getInstance();
      
      // Check if key already exists
      const existingKey = await keyManager.hasApiKey(folder);
      
      if (existingKey && !options.force) {
        console.error('❌ API key already exists for this folder.');
        console.error('Use --force to generate a new key (this will invalidate the existing key).');
        console.error('Or use "folder-mcp show-key" to see the existing key.');
        process.exit(1);
      }
      
      // Generate new API key
      const apiKey = await keyManager.generateApiKey(folder);
      
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: true,
          keyId: apiKey.metadata.keyId,
          key: apiKey.key,
          folderPath: apiKey.metadata.folderPath,
          createdAt: apiKey.metadata.createdAt.toISOString(),
          displayKey: keyManager.getKeyDisplayString(apiKey.key)
        }, null, 2));
      } else {
        console.log('🔑 API Key Generated Successfully');
        console.log('');
        console.log(`📁 Folder: ${folder}`);
        console.log(`🆔 Key ID: ${apiKey.metadata.keyId}`);
        console.log(`📅 Created: ${apiKey.metadata.createdAt.toLocaleString()}`);
        console.log('');
        console.log('🔐 Your API Key:');
        console.log(`   ${apiKey.key}`);
        console.log('');
        console.log('⚠️  IMPORTANT: Store this key securely! It will not be displayed again.');
        console.log('   Use this key for remote connections to your folder-mcp server.');
        console.log('');
        console.log('💡 Usage Examples:');
        console.log('   • gRPC: authorization: Bearer <YOUR_KEY>');
        console.log('   • HTTP: Authorization: Bearer <YOUR_KEY>');
        console.log('   • HTTP: x-api-key: <YOUR_KEY>');
      }
      
    } catch (error) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }, null, 2));
      } else {
        console.error('❌ Failed to generate API key:', error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  }
}
