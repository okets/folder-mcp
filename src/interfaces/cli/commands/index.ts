/**
 * Index Command Implementation
 * 
 * Handles folder indexing by delegating to the IndexingWorkflow application service.
 */

import { Command } from 'commander';
import { IIndexingWorkflow } from '../../../di/interfaces.js';

export class IndexCommand extends Command {
  constructor(private readonly indexingWorkflow: IIndexingWorkflow) {
    super('index');
    
    this
      .description('Index a folder for semantic search')
      .argument('<folder>', 'Folder to index')
      .option('-b, --batch-size <size>', 'Batch size for processing', '10')
      .option('-c, --chunk-size <size>', 'Chunk size for text processing', '1000')
      .option('-s, --show-config', 'Show configuration details')
      .action(this.execute.bind(this));
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      await this.indexingWorkflow.indexFolder(folder, {
        batchSize: parseInt(options.batchSize),
        chunkSize: parseInt(options.chunkSize)
      });
      
      console.log('✅ Folder indexed successfully');
    } catch (error) {
      console.error('Failed to index folder:', error);
      process.exit(1);
    }
  }
}
