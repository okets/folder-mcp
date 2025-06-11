/**
 * CLI commands with dependency injection support
 * 
 * Refactored version that properly integrates with the DI system
 * while maintaining backward compatibility with existing functionality.
 */

import { Command } from 'commander';
import { testEmbeddingSystem } from '../embeddings/index.js';
import { setupConfigCommand } from '../config/cli.js';
import { resolveConfig, parseCliArgs, displayConfigSummary, validateResolvedConfig } from '../config/resolver.js';
import { initializeLocalConfig } from '../config/local.js';

export function setupCommands(program: Command, packageJson: any): void {
  program
    .name('folder-mcp')
    .description('Universal Folder-to-MCP-Server Tool - Transform any local folder into an intelligent knowledge base')
    .version(packageJson.version);

  // Set up configuration management command
  setupConfigCommand(program);

  // Index command with DI integration
  program
    .command('index')
    .description('Index a folder to create embeddings and vector database')
    .argument('<folder>', 'Path to the folder to index')
    .option('--skip-embeddings', 'Skip embedding generation during indexing')
    .option('--chunk-size <size>', 'Override chunk size for text processing', parseInt)
    .option('--overlap <size>', 'Override overlap size between chunks', parseInt)
    .option('--batch-size <size>', 'Override batch size for embedding generation', parseInt)
    .option('--model <n>', 'Override embedding model to use')
    .option('--extensions <list>', 'Override file extensions to process (comma-separated)')
    .option('--ignore <patterns>', 'Override ignore patterns (comma-separated)')
    .option('--max-operations <num>', 'Override max concurrent operations', parseInt)
    .option('--show-config', 'Show resolved configuration before processing')
    .option('--use-di', 'Use dependency injection (experimental)')
    .action(async (folder: string, options: any) => {
      // Validate folder exists
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
      
      // Initialize local config if it doesn't exist
      initializeLocalConfig(folder);
      
      // Show configuration if requested
      if (options.showConfig) {
        displayConfigSummary(config, true);
      }

      // Use DI if requested and available
      if (options.useDi) {
        try {
          console.log('📦 Setting up dependency injection for indexing...');
          
          // Dynamic import to avoid loading DI if not needed
          const { setupForIndexing, getService, SERVICE_TOKENS } = await import('../di/index.js');
          
          // Setup DI container
          await setupForIndexing(folder, cliArgs);
          
          // Get the IndexingService from the DI container
          const indexingService = getService(SERVICE_TOKENS.INDEXING_SERVICE) as any;
          
          console.log('✅ Using dependency injection for indexing');
          await indexingService.indexFolder(folder, packageJson, { 
            ...options,
            resolvedConfig: config
          });
          
        } catch (error) {
          console.error('❌ Indexing failed:', error instanceof Error ? error.message : 'Unknown error');
          process.exit(1);
        }
      } else {
        // Use legacy implementation by default
        const { indexFolder } = await import('../processing/indexing.js');
        await indexFolder(folder, packageJson, { 
          ...options,
          resolvedConfig: config
        });
      }
    });

  // Embeddings command
  program
    .command('embeddings')
    .description('Generate embeddings for chunks in an indexed folder')
    .argument('<folder>', 'Path to the indexed folder')
    .option('-b, --batch-size <size>', 'Override batch size for embedding generation', parseInt)
    .option('-f, --force', 'Force regeneration of existing embeddings')
    .option('--model <n>', 'Override embedding model to use')
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

      // Use legacy implementation for now
      const { generateEmbeddings } = await import('../processing/indexing.js');
      await generateEmbeddings(folder, { 
        batchSize: config.batchSize, 
        force: options.force
      });
    });

  // MCP Server command with DI integration
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
    .option('--use-di', 'Use dependency injection (experimental)')
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

      console.error(`🚀 Starting Folder MCP Server...`);
      console.error(`   📁 Folder: ${folder}`);
      console.error(`   🌐 Transport: ${transport}`);
      if (transport === 'http') {
        console.error(`   🔌 Port: ${port}`);
      }
      console.error(`   ⏹️  Press Ctrl+C to stop\n`);

      // Use DI if requested and available
      if (options.useDi) {
        try {
          console.log('📦 Setting up dependency injection for MCP server...');
          
          // Dynamic import to avoid loading DI if not needed
          const { setupForMCPServer, getService, SERVICE_TOKENS } = await import('../di/index.js');
          
          // Setup DI container
          setupForMCPServer(folder, config);
          
          // Get MCP server from DI container
          const mcpServer = getService(SERVICE_TOKENS.MCP_SERVER);
          
          console.log('✅ Using dependency injection for MCP server');
          await (mcpServer as any).start();
          
        } catch (error) {
          console.warn('⚠️ Dependency injection failed, falling back to legacy mode:', 
            error instanceof Error ? error.message : 'Unknown error');
          
          // Fallback to legacy implementation
          const { startMCPServer } = await import('../mcp/server.js');
          await startMCPServer({
            folderPath: folder,
            port,
            transport,
            resolvedConfig: config,
          });
        }
      } else {
        // Use legacy implementation by default
        const { startMCPServer } = await import('../mcp/server.js');
        await startMCPServer({
          folderPath: folder,
          port,
          transport,
          resolvedConfig: config,
        });
      }
    });

  // Other commands remain unchanged for now
  program
    .command('summary')
    .description('Show chunking summary for an indexed folder')
    .argument('<folder>', 'Path to the indexed folder')
    .action(async (folder: string) => {
      const { showChunkingSummary } = await import('../processing/indexing.js');
      await showChunkingSummary(folder);
    });

  program
    .command('build-index')
    .description('Build vector search index from existing embeddings')
    .argument('<folder>', 'Path to the indexed folder')
    .action(async (folder: string) => {
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
      const cliArgs = parseCliArgs(options);
      const config = resolveConfig(folder, cliArgs);
      
      const validationErrors = validateResolvedConfig(config);
      if (validationErrors.length > 0) {
        console.error('❌ Configuration validation errors:');
        validationErrors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
      
      if (options.showConfig) {
        displayConfigSummary(config, false);
      }
      
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
    .option('--use-di', 'Use dependency injection (experimental)')
    .action(async (folder: string, options: any) => {
      const cliArgs = parseCliArgs(options);
      const config = resolveConfig(folder, cliArgs);
      
      const validationErrors = validateResolvedConfig(config);
      if (validationErrors.length > 0) {
        console.error('❌ Configuration validation errors:');
        validationErrors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }

      await initializeLocalConfig(folder);
      
      if (options.showConfig) {
        displayConfigSummary(config, false);
      }
      
      let logLevel: 'verbose' | 'normal' | 'quiet' = 'normal';
      if (options.verbose) logLevel = 'verbose';
      if (options.quiet) logLevel = 'quiet';

      // Use DI if requested and available
      if (options.useDi) {
        try {
          console.log('📦 Setting up dependency injection for file watching...');
          
          // Dynamic import to avoid loading DI if not needed
          const { setupForIndexing, getService, SERVICE_TOKENS } = await import('../di/index.js');
          
          // Setup DI container
          await setupForIndexing(folder, cliArgs);
          
          const { startDIWatching, setupDIGracefulShutdown } = await import('../watch/diEnabledWatcher.js');
          
          console.log('✅ Using dependency injection for file watching');
          
          const watcher = await startDIWatching(folder, packageJson, {
            debounceDelay: config.debounceDelay,
            batchSize: config.batchSize,
            logLevel,
            resolvedConfig: config
          },
          // DI Services
          getService(SERVICE_TOKENS.FILE_PARSING),
          getService(SERVICE_TOKENS.CHUNKING),
          getService(SERVICE_TOKENS.EMBEDDING),
          getService(SERVICE_TOKENS.CACHE),
          getService(SERVICE_TOKENS.LOGGING),
          getService(SERVICE_TOKENS.FILE_SYSTEM)
          );

          setupDIGracefulShutdown(watcher);
          await new Promise(() => {}); // Run indefinitely until interrupted
          
        } catch (error) {
          console.warn('⚠️ Dependency injection failed, falling back to legacy mode:', 
            error instanceof Error ? error.message : 'Unknown error');
          
          // Fallback to legacy implementation
          const { startWatching, setupGracefulShutdown } = await import('../watch/index.js');
          
          const watcher = await startWatching(folder, packageJson, {
            debounceDelay: config.debounceDelay,
            batchSize: config.batchSize,
            logLevel,
            resolvedConfig: config
          });

          setupGracefulShutdown(watcher);
          await new Promise(() => {}); // Run indefinitely until interrupted
        }
      } else {
        // Use legacy implementation by default
        const { startWatching, setupGracefulShutdown } = await import('../watch/index.js');
        
        try {
          const watcher = await startWatching(folder, packageJson, {
            debounceDelay: config.debounceDelay,
            batchSize: config.batchSize,
            logLevel,
            resolvedConfig: config
          });

          setupGracefulShutdown(watcher);
          await new Promise(() => {}); // Run indefinitely until interrupted
        } catch (error) {
          console.error('❌ Failed to start file watcher:', error);
          process.exit(1);
        }
      }
    });
}
