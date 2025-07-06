/**
 * Embeddings Command Implementation
 * 
 * Handles embedding generation by delegating to the IndexingWorkflow application service.
 * Uses lazy dependency injection to avoid requiring services at construction time.
 */

import { BaseCommand } from './base-command.js';
import { MODULE_TOKENS } from '../../../di/interfaces.js';
import type { IIndexingWorkflow } from '../../../di/interfaces.js';

export class EmbeddingsCommand extends BaseCommand {
  constructor() {
    super('embed');
    
    this
      .description('Generate embeddings for files in a folder')
      .argument('<folder>', 'Folder to process')
      .option('-b, --batch-size <size>', 'Batch size for processing', '10')
      .option('-m, --model <name>', 'Model to use for embeddings', 'default')
      .action(this.execute.bind(this))
      .addGlobalOptionsAfterInit();
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      // Resolve the indexing workflow service lazily
      const indexingWorkflow = this.resolveService<IIndexingWorkflow>(
        folder,
        MODULE_TOKENS.APPLICATION.INDEXING_WORKFLOW
      );
      
      await indexingWorkflow.indexFiles([folder], {
        batchSize: parseInt(options.batchSize),
        model: options.model
      });
      
      console.log('✅ Embeddings generated successfully');
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      process.exit(1);
    }
  }
}
