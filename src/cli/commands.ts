import { Command } from 'commander';
import { testEmbeddingSystem } from '../embeddings/index.js';
import { setupConfigCommand } from '../config/cli.js';
import { resolveConfig, parseCliArgs, displayConfigSummary, validateResolvedConfig } from '../config/resolver.js';
import { initializeLocalConfig } from '../config/local.js';

export function setupCommands(program: Command, packageJson: any): void {  program
    .name('folder-mcp')
    .description('Universal Folder-to-MCP-Server Tool - Transform any local folder into an intelligent knowledge base')
    .version(packageJson.version);

  // Set up configuration management command
  setupConfigCommand(program);

  program
    .command('index')
    .description('Index a folder to create embeddings and vector database')
    .argument('<folder>', 'Path to the folder to index')
    .option('--skip-embeddings', 'Skip embedding generation during indexing')
    .option('--chunk-size <size>', 'Override chunk size for text processing', parseInt)
    .option('--overlap <size>', 'Override overlap size between chunks', parseInt)
    .option('--batch-size <size>', 'Override batch size for embedding generation', parseInt)
    .option('--model <name>', 'Override embedding model to use')
    .option('--extensions <list>', 'Override file extensions to process (comma-separated)')
    .option('--ignore <patterns>', 'Override ignore patterns (comma-separated)')
    .option('--max-operations <num>', 'Override max concurrent operations', parseInt)
    .option('--show-config', 'Show resolved configuration before processing')    .action(async (folder: string, options: any) => {
      // Very first thing: check if folder exists before doing ANYTHING else
      const { existsSync, statSync } = await import('fs');
      const { resolve } = await import('path');
      
      const resolvedPath = resolve(folder);
      if (!existsSync(resolvedPath)) {
        console.error(`❌ Error: Folder "${folder}" does not exist.`);
        process.exit(1);
      }

      if (!statSync(resolvedPath).isDirectory()) {
        console.error(`❌ Error: "${folder}" is not a directory.`);
        process.exit(1);
      }
      
      // Parse CLI arguments and resolve configuration
      const cliArgs = parseCliArgs(options);
      const config = resolveConfig(folder, cliArgs);
      
      // Validate configuration
      const validationErrors = validateResolvedConfig(config);
      if (validationErrors.length > 0) {
        console.error('❌ Configuration validation errors:');
        validationErrors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
      
      // Initialize local config if it doesn't exist (after we know folder exists)
      initializeLocalConfig(folder);
      
      // Show configuration if requested
      if (options.showConfig) {
        displayConfigSummary(config, true);
      }
        // Lazy load processing modules to avoid pdf-parse issues
      const { indexFolder } = await import('../processing/indexing.js');
      await indexFolder(folder, packageJson, { 
        ...options,
        resolvedConfig: config
      });
    });
  program
    .command('embeddings')
    .description('Generate embeddings for chunks in an indexed folder')
    .argument('<folder>', 'Path to the indexed folder')
    .option('-b, --batch-size <size>', 'Override batch size for embedding generation', parseInt)
    .option('-f, --force', 'Force regeneration of existing embeddings')
    .option('--model <name>', 'Override embedding model to use')
    .option('--show-config', 'Show resolved configuration before processing')
    .action(async (folder: string, options: any) => {
      // Parse CLI arguments and resolve configuration
      const cliArgs = parseCliArgs(options);
      const config = resolveConfig(folder, cliArgs);
      
      // Validate configuration
      const validationErrors = validateResolvedConfig(config);
      if (validationErrors.length > 0) {
        console.error('❌ Configuration validation errors:');
        validationErrors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
      
      // Show configuration if requested
      if (options.showConfig) {
        displayConfigSummary(config, false);
      }
        // Lazy load processing modules to avoid pdf-parse issues
      const { generateEmbeddings } = await import('../processing/indexing.js');
      await generateEmbeddings(folder, { 
        batchSize: config.batchSize, 
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
    .option('--model <n>', 'Override embedding model to use')
    .option('--show-config', 'Show resolved configuration before processing')
    .action(async (folder: string, query: string, options: any) => {
      // Parse CLI arguments and resolve configuration
      const cliArgs = parseCliArgs(options);
      const config = resolveConfig(folder, cliArgs);
      
      // Validate configuration
      const validationErrors = validateResolvedConfig(config);
      if (validationErrors.length > 0) {
        console.error('❌ Configuration validation errors:');
        validationErrors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
      
      // Show configuration if requested
      if (options.showConfig) {
        displayConfigSummary(config, false);
      }
      
      // Lazy load search modules
      const { searchVectorIndex } = await import('../search/cli.js');
      const k = options.results ? parseInt(options.results, 10) : 5;
      
      if (isNaN(k) || k < 1) {
        console.error('❌ Number of results must be a positive number');
        process.exit(1);
      }
      
      await searchVectorIndex(folder, query, {
        k,
        rebuildIndex: options.rebuildIndex,
        resolvedConfig: config
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
    .option('--model <n>', 'Override embedding model to use')
    .option('--extensions <list>', 'Override file extensions to process (comma-separated)')
    .option('--ignore <patterns>', 'Override ignore patterns (comma-separated)')
    .option('--show-config', 'Show resolved configuration before starting')
    .action(async (folder: string, options: any) => {
      // Parse CLI arguments and resolve configuration
      const cliArgs = parseCliArgs(options);
      const config = resolveConfig(folder, cliArgs);
      
      // Validate configuration
      const validationErrors = validateResolvedConfig(config);
      if (validationErrors.length > 0) {
        console.error('❌ Configuration validation errors:');
        validationErrors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
      
      // Show configuration if requested
      if (options.showConfig) {
        displayConfigSummary(config, false);
      }
      
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
      }      console.error(`🚀 Starting Folder MCP Server...`);
      console.error(`   📁 Folder: ${folder}`);
      console.error(`   🌐 Transport: ${transport}`);
      if (transport === 'http') {
        console.error(`   🔌 Port: ${port}`);
      }
      console.error(`   ⏹️  Press Ctrl+C to stop\n`);

      try {
        await startMCPServer({
          folderPath: folder,
          port,
          transport,
          resolvedConfig: config,
        });
      } catch (error) {
        console.error('❌ Failed to start MCP server:', error);
        process.exit(1);
      }
    });
  program
    .command('watch')
    .description('Watch folder for changes and update index automatically')
    .argument('<folder>', 'Path to the folder to watch')
    .option('-d, --debounce <ms>', 'Override debounce delay in milliseconds', parseInt)
    .option('-b, --batch-size <size>', 'Override embedding batch size', parseInt)
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-q, --quiet', 'Minimize log output')
    .option('--chunk-size <size>', 'Override chunk size for text processing', parseInt)
    .option('--overlap <size>', 'Override overlap size between chunks', parseInt)
    .option('--model <n>', 'Override embedding model to use')
    .option('--extensions <list>', 'Override file extensions to process (comma-separated)')
    .option('--ignore <patterns>', 'Override ignore patterns (comma-separated)')
    .option('--max-operations <num>', 'Override max concurrent operations', parseInt)
    .option('--show-config', 'Show resolved configuration before starting')
    .action(async (folder: string, options: any) => {
      // Parse CLI arguments and resolve configuration
      const cliArgs = parseCliArgs(options);
      const config = resolveConfig(folder, cliArgs);
      
      // Validate configuration
      const validationErrors = validateResolvedConfig(config);
      if (validationErrors.length > 0) {
        console.error('❌ Configuration validation errors:');
        validationErrors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
        // Initialize local config if it doesn't exist
      await initializeLocalConfig(folder);
      
      // Show configuration if requested
      if (options.showConfig) {
        displayConfigSummary(config, false);
      }
      
      // Lazy load watcher modules
      const { startWatching, setupGracefulShutdown } = await import('../watch/index.js');
      
      // Determine log level
      let logLevel: 'verbose' | 'normal' | 'quiet' = 'normal';
      if (options.verbose) logLevel = 'verbose';
      if (options.quiet) logLevel = 'quiet';

      try {
        const watcher = await startWatching(folder, packageJson, {
          debounceDelay: config.debounceDelay,
          batchSize: config.batchSize,
          logLevel,
          resolvedConfig: config
        });

        // Set up graceful shutdown
        setupGracefulShutdown(watcher);

        // Keep the process running
        await new Promise(() => {}); // Run indefinitely until interrupted
      } catch (error) {
        console.error('❌ Failed to start file watcher:', error);
        process.exit(1);
      }
    });
}
