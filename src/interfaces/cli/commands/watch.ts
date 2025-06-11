/**
 * Watch Command Implementation
 * 
 * Handles file watching by delegating to the MonitoringWorkflow application service.
 */

import { Command } from 'commander';
import { IMonitoringWorkflow } from '../../../di/interfaces.js';

export class WatchCommand extends Command {
  constructor(private readonly monitoringWorkflow: IMonitoringWorkflow) {
    super('watch');
    
    this
      .description('Watch a folder for changes and automatically update the index')
      .argument('<folder>', 'Folder to watch')
      .option('-d, --debounce <ms>', 'Debounce delay in milliseconds', '1000')
      .option('-b, --batch-size <size>', 'Batch size for processing changes', '10')
      .action(this.execute.bind(this));
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      await this.monitoringWorkflow.startFileWatching(folder, {
        debounceDelay: parseInt(options.debounce),
        batchSize: parseInt(options.batchSize)
      });
    } catch (error) {
      console.error('Failed to start file watching:', error);
      process.exit(1);
    }
  }
}
