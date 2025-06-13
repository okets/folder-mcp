/**
 * Rotate API Key Command
 * 
 * Rotates an existing API key by generating a new one and invalidating the old one.
 * Useful for regular security maintenance or when a key may be compromised.
 */

import { Command } from 'commander';
import { ApiKeyManager } from '../../../transport/security.js';

export class RotateKeyCommand extends Command {
  constructor() {
    super('rotate-key');
    
    this
      .description('Rotate (replace) the API key for a folder')
      .argument('<folder>', 'Folder path to rotate API key for')
      .option('--format <format>', 'Output format (text|json)', 'text')
      .action(this.execute.bind(this));
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      const keyManager = ApiKeyManager.getInstance();
      
      // Check if key exists
      const hasKey = await keyManager.hasApiKey(folder);
      if (!hasKey) {
        if (options.format === 'json') {
          console.log(JSON.stringify({
            success: false,
            error: 'No API key found for this folder'
          }, null, 2));
        } else {
          console.error('❌ No API key found for this folder.');
          console.error('Use "folder-mcp generate-key <folder>" to create one.');
        }
        process.exit(1);
      }
      
      // Rotate the API key
      const newApiKey = await keyManager.rotateApiKey(folder);
      
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: true,
          keyId: newApiKey.metadata.keyId,
          key: newApiKey.key,
          folderPath: newApiKey.metadata.folderPath,
          createdAt: newApiKey.metadata.createdAt.toISOString(),
          rotatedFrom: newApiKey.metadata.rotatedFrom,
          displayKey: keyManager.getKeyDisplayString(newApiKey.key)
        }, null, 2));
      } else {
        console.log('🔄 API Key Rotated Successfully');
        console.log('');
        console.log(`📁 Folder: ${folder}`);
        console.log(`🆔 New Key ID: ${newApiKey.metadata.keyId}`);
        if (newApiKey.metadata.rotatedFrom) {
          console.log(`🔄 Previous Key ID: ${newApiKey.metadata.rotatedFrom} (now invalid)`);
        }
        console.log(`📅 Created: ${newApiKey.metadata.createdAt.toLocaleString()}`);
        console.log('');
        console.log('🔐 Your New API Key:');
        console.log(`   ${newApiKey.key}`);
        console.log('');
        console.log('⚠️  IMPORTANT: The old key has been invalidated!');
        console.log('   Update all applications using the old key with this new key.');
        console.log('');
        console.log('💡 Usage Examples:');
        console.log('   • gRPC: authorization: Bearer <NEW_KEY>');
        console.log('   • HTTP: Authorization: Bearer <NEW_KEY>');
        console.log('   • HTTP: x-api-key: <NEW_KEY>');
      }
      
    } catch (error) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }, null, 2));
      } else {
        console.error('❌ Failed to rotate API key:', error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  }
}
