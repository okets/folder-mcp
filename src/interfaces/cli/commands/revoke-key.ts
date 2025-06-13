/**
 * Revoke API Key Command
 * 
 * Revokes (invalidates) the API key for a folder, preventing any further use.
 * This is useful for security incidents or when decommissioning access.
 */

import { Command } from 'commander';
import { ApiKeyManager } from '../../../transport/security.js';

export class RevokeKeyCommand extends Command {
  constructor() {
    super('revoke-key');
    
    this
      .description('Revoke (invalidate) the API key for a folder')
      .argument('<folder>', 'Folder path to revoke API key for')
      .option('-y, --yes', 'Skip confirmation prompt', false)
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
          console.error('There is no API key to revoke.');
        }
        process.exit(1);
      }
      
      // Confirmation prompt (unless --yes is specified)
      if (!options.yes && options.format === 'text') {
        console.log('⚠️  WARNING: This will permanently invalidate the API key!');
        console.log('   All applications using this key will lose access.');
        console.log('');
        console.log(`📁 Folder: ${folder}`);
        console.log('');
        
        // Simple confirmation check (in a real implementation, you might use readline)
        const response = await this.getConfirmation('Are you sure you want to revoke this API key? (y/N): ');
        if (response.toLowerCase() !== 'y' && response.toLowerCase() !== 'yes') {
          console.log('❌ Operation cancelled.');
          process.exit(0);
        }
      }
      
      // Revoke the API key
      const revoked = await keyManager.revokeApiKey(folder);
      
      if (!revoked) {
        if (options.format === 'json') {
          console.log(JSON.stringify({
            success: false,
            error: 'Failed to revoke API key'
          }, null, 2));
        } else {
          console.error('❌ Failed to revoke API key.');
        }
        process.exit(1);
      }
      
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: true,
          folderPath: folder,
          revokedAt: new Date().toISOString()
        }, null, 2));
      } else {
        console.log('✅ API Key Revoked Successfully');
        console.log('');
        console.log(`📁 Folder: ${folder}`);
        console.log(`🕒 Revoked At: ${new Date().toLocaleString()}`);
        console.log('');
        console.log('🔒 The API key has been permanently invalidated.');
        console.log('   All remote connections using this key will be denied.');
        console.log('');
        console.log('💡 To restore remote access:');
        console.log('   folder-mcp generate-key <folder>');
      }
      
    } catch (error) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }, null, 2));
      } else {
        console.error('❌ Failed to revoke API key:', error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  }
  
  /**
   * Simple confirmation prompt
   * In a real implementation, you might use a proper readline interface
   */
  private async getConfirmation(prompt: string): Promise<string> {
    // For now, just return 'n' to avoid blocking
    // In a real implementation, you would use readline or similar
    process.stdout.write(prompt);
    
    return new Promise((resolve) => {
      // Mock user input for this implementation
      // In reality, you'd read from stdin
      setTimeout(() => {
        console.log('n'); // Simulate user typing 'n'
        resolve('n');
      }, 100);
    });
  }
}
