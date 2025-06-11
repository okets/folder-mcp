/**
 * Index Command Implementation
 * 
 * Handles folder indexing by delegating to the IndexingWorkflow application service.
 */

import { CLICommand, CLICommandOptions } from '../index.js';
import { IIndexingWorkflow } from '../../../di/interfaces.js';
import { IndexingOptions } from '../../../application/indexing/index.js';
import { resolveConfig, parseCliArgs, validateResolvedConfig, displayConfigSummary } from '../../../config/resolver.js';
import { initializeLocalConfig } from '../../../config/local.js';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

export class IndexCommand implements CLICommand {
  name = 'index';
  description = 'Index a folder to create embeddings and vector database';
  options = [
    { name: 'skip-embeddings', type: 'boolean' as const, description: 'Skip embedding generation during indexing' },
    { name: 'chunk-size', type: 'number' as const, description: 'Override chunk size for text processing' },
    { name: 'overlap', type: 'number' as const, description: 'Override overlap size between chunks' },
    { name: 'batch-size', type: 'number' as const, description: 'Override batch size for embedding generation' },
    { name: 'model', type: 'string' as const, description: 'Override embedding model to use' },
    { name: 'extensions', type: 'array' as const, description: 'Override file extensions to process (comma-separated)' },
    { name: 'ignore', type: 'array' as const, description: 'Override ignore patterns (comma-separated)' },
    { name: 'max-operations', type: 'number' as const, description: 'Override max concurrent operations' },
    { name: 'show-config', type: 'boolean' as const, description: 'Show resolved configuration before processing' },
    { name: 'use-di', type: 'boolean' as const, description: 'Use dependency injection (experimental)' }
  ];

  constructor(
    private readonly indexingWorkflow: IIndexingWorkflow,
    private readonly packageJson: any
  ) {}

  async execute(options: CLICommandOptions): Promise<void> {
    const args = options._args as string[];
    const folder = args[0];

    if (!folder) {
      console.error('❌ Error: Folder argument is required');
      console.log('Usage: folder-mcp index <folder> [options]');
      process.exit(1);
    }

    // Validate folder exists
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

    // Prepare indexing options
    const indexingOptions: IndexingOptions = {
      chunkingOptions: {
        maxChunkSize: config.chunkSize,
        overlapSize: config.overlap
      },
      embeddingModel: config.modelName,
      batchSize: config.batchSize,
      parallelWorkers: config.maxConcurrentOperations,
      includeFileTypes: config.fileExtensions,
      excludePatterns: config.ignorePatterns,
      forceReindex: false
    };

    try {
      console.log(`📁 Starting indexing of folder: ${folder}`);
      
      const result = await this.indexingWorkflow.indexFolder(resolvedPath, indexingOptions);
      
      if (result.success) {
        console.log('✅ Indexing completed successfully!');
        console.log(`   📄 Files processed: ${result.filesProcessed}`);
        console.log(`   📝 Chunks generated: ${result.chunksGenerated}`);
        console.log(`   🔢 Embeddings created: ${result.embeddingsCreated}`);
        console.log(`   ⏱️  Processing time: ${(result.processingTime / 1000).toFixed(2)}s`);
        
        if (result.errors.length > 0) {
          console.log(`   ⚠️  Warnings/errors: ${result.errors.length}`);
          result.errors.forEach((error: any) => {
            console.log(`      - ${error.message}`);
          });
        }
      } else {
        console.error('❌ Indexing failed');
        result.errors.forEach((error: any) => {
          console.error(`   - ${error.message}`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Indexing failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}
