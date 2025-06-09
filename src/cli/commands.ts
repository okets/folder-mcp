import { Command } from 'commander';
import { testEmbeddingSystem } from '../embeddings/index.js';

export function setupCommands(program: Command, packageJson: any): void {
  program
    .name('folder-mcp')
    .description('Universal Folder-to-MCP-Server Tool - Transform any local folder into an intelligent knowledge base')
    .version(packageJson.version);

  program
    .command('index')
    .description('Index a folder to create embeddings and vector database')
    .argument('<folder>', 'Path to the folder to index')
    .action(async (folder: string) => {
      // Lazy load processing modules to avoid pdf-parse issues
      const { indexFolder } = await import('../processing/indexing.js');
      await indexFolder(folder, packageJson);
    });

  program
    .command('summary')
    .description('Show chunking summary for an indexed folder')
    .argument('<folder>', 'Path to the indexed folder')
    .action(async (folder: string) => {
      // Lazy load processing modules to avoid pdf-parse issues
      const { showChunkingSummary } = await import('../processing/indexing.js');
      await showChunkingSummary(folder);
    });

  program
    .command('test-embeddings')
    .description('Test the embedding model system')
    .action(async () => {
      try {
        await testEmbeddingSystem();
        console.log('🎉 Embedding system test completed successfully!');
        process.exit(0);
      } catch (error) {
        console.error('❌ Embedding system test failed:', error);
        process.exit(1);
      }
    });
}
