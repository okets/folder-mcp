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
    .option('--skip-embeddings', 'Skip embedding generation during indexing')
    .action(async (folder: string, options: { skipEmbeddings?: boolean }) => {
      // Lazy load processing modules to avoid pdf-parse issues
      const { indexFolder } = await import('../processing/indexing.js');
      await indexFolder(folder, packageJson, options);
    });

  program
    .command('embeddings')
    .description('Generate embeddings for chunks in an indexed folder')
    .argument('<folder>', 'Path to the indexed folder')
    .option('-b, --batch-size <size>', 'Number of chunks to process in each batch (default: 32)', '32')
    .option('-f, --force', 'Force regeneration of existing embeddings')
    .action(async (folder: string, options: { batchSize?: string; force?: boolean }) => {
      // Lazy load processing modules to avoid pdf-parse issues
      const { generateEmbeddings } = await import('../processing/indexing.js');
      const batchSize = options.batchSize ? parseInt(options.batchSize, 10) : 32;
      
      if (isNaN(batchSize) || batchSize < 1) {
        console.error('❌ Batch size must be a positive number');
        process.exit(1);
      }
      
      await generateEmbeddings(folder, { 
        batchSize, 
        force: options.force 
      });
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
    .command('build-index')
    .description('Build vector search index from existing embeddings')
    .argument('<folder>', 'Path to the indexed folder')    
    .action(async (folder: string) => {
      // Lazy load search modules
      const { buildVectorIndexCLI } = await import('../search/cli.js');
      await buildVectorIndexCLI(folder);
    });

  program
    .command('search')
    .description('Search for similar content using vector similarity')
    .argument('<folder>', 'Path to the indexed folder')
    .argument('<query>', 'Search query text')
    .option('-k, --results <number>', 'Number of results to return (default: 5)', '5')
    .option('--rebuild-index', 'Rebuild the vector index before searching')    
    .action(async (folder: string, query: string, options: { results?: string; rebuildIndex?: boolean }) => {
      // Lazy load search modules
      const { searchVectorIndex } = await import('../search/cli.js');
      const k = options.results ? parseInt(options.results, 10) : 5;
      
      if (isNaN(k) || k < 1) {
        console.error('❌ Number of results must be a positive number');
        process.exit(1);
      }
      
      await searchVectorIndex(folder, query, {
        k,
        rebuildIndex: options.rebuildIndex
      });
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

  program
    .command('serve')
    .description('Start MCP server to serve folder content to LLM clients')
    .argument('<folder>', 'Path to the folder to serve')
    .option('-p, --port <port>', 'Port number to listen on (default: 3000)', '3000')
    .option('-t, --transport <type>', 'Transport type: stdio or http (default: stdio)', 'stdio')
    .action(async (folder: string, options: { port?: string; transport?: string }) => {
      // Lazy load MCP server
      const { startMCPServer } = await import('../mcp/server.js');
      
      const port = options.port ? parseInt(options.port, 10) : 3000;
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error('❌ Port must be a valid number between 1 and 65535');
        process.exit(1);
      }

      const transport = options.transport as 'stdio' | 'http';
      if (transport !== 'stdio' && transport !== 'http') {
        console.error('❌ Transport must be either "stdio" or "http"');
        process.exit(1);
      }

      console.log(`🚀 Starting Folder MCP Server...`);
      console.log(`   📁 Folder: ${folder}`);
      console.log(`   🌐 Transport: ${transport}`);
      if (transport === 'http') {
        console.log(`   🔌 Port: ${port}`);
      }
      console.log(`   ⏹️  Press Ctrl+C to stop\n`);

      try {
        await startMCPServer({
          folderPath: folder,
          port,
          transport,
        });
      } catch (error) {
        console.error('❌ Failed to start MCP server:', error);
        process.exit(1);
      }
    });
}
