/**
 * Embeddings Command Implementation
 * 
 * Handles embedding generation by delegating to the IndexingWorkflow application service.
 */

import { CLICommand, CLICommandOptions } from '../index.js';
import { IIndexingWorkflow } from '../../../di/interfaces.js';
import { resolveConfig, parseCliArgs, validateResolvedConfig, displayConfigSummary } from '../../../config/resolver.js';

export class EmbeddingsCommand implements CLICommand {
  name = 'embeddings';
  description = 'Generate embeddings for chunks in an indexed folder';
  options = [
    { name: 'batch-size', alias: 'b', type: 'number' as const, description: 'Override batch size for embedding generation' },
    { name: 'force', alias: 'f', type: 'boolean' as const, description: 'Force regeneration of existing embeddings' },
    { name: 'model', type: 'string' as const, description: 'Override embedding model to use' },
    { name: 'show-config', type: 'boolean' as const, description: 'Show resolved configuration before processing' }
  ];

  constructor(
    private readonly indexingWorkflow: IIndexingWorkflow
  ) {}

  async execute(options: CLICommandOptions): Promise<void> {
    const args = options._args as string[];
    const folder = args[0];

    if (!folder) {
      console.error('❌ Error: Folder argument is required');
      console.log('Usage: folder-mcp embeddings <folder> [options]');
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

    // Show configuration if requested
    if (options.showConfig) {
      displayConfigSummary(config, false);
    }

    try {
      console.log(`🔢 Generating embeddings for folder: ${folder}`);
      
      // For now, use the legacy implementation
      // In the future, this should use indexingWorkflow.generateEmbeddings()
      const { generateEmbeddings } = await import('../../../processing/indexing.js');
      await generateEmbeddings(folder, { 
        batchSize: config.batchSize, 
        force: options.force || false
      });
      
      console.log('✅ Embedding generation completed successfully!');
    } catch (error) {
      console.error('❌ Embedding generation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}
