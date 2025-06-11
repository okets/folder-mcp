/**
 * Embeddings Command Implementation
 * 
 * Handles embedding generation by delegating to the IndexingWorkflow application service.
 */

import { Command } from 'commander';
import { IIndexingWorkflow } from '../../../di/interfaces.js';

export class EmbeddingsCommand extends Command {
  constructor(private readonly indexingWorkflow: IIndexingWorkflow) {
    super('embed');
    
    this
      .description('Generate embeddings for files in a folder')
      .argument('<folder>', 'Folder to process')
      .option('-b, --batch-size <size>', 'Batch size for processing', '10')
      .option('-m, --model <name>', 'Model to use for embeddings', 'default')
      .action(this.execute.bind(this));
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      await this.indexingWorkflow.indexFiles([folder], {
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
