/**
 * Watch Command Implementation
 * 
 * Handles file watching by delegating to the MonitoringWorkflow application service.
 * Uses lazy dependency injection to avoid requiring services at construction time.
 */

import { BaseCommand } from './base-command.js';
import { MODULE_TOKENS } from '../../../di/interfaces.js';
import type { IMonitoringWorkflow } from '../../../di/interfaces.js';

export class WatchCommand extends BaseCommand {
  constructor() {
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
      // Resolve the monitoring workflow service lazily using async resolution
      const monitoringWorkflow = await this.resolveServiceAsync<IMonitoringWorkflow>(
        folder,
        MODULE_TOKENS.APPLICATION.MONITORING_WORKFLOW
      );
      
      await monitoringWorkflow.startFileWatching(folder, {
        debounceMs: parseInt(options.debounce),
        batchSize: parseInt(options.batchSize)
      });
      
      console.log('✅ File watching started successfully');
      console.log(`📁 Watching folder: ${folder}`);
      console.log(`⏱️ Debounce delay: ${options.debounce}ms`);
      console.log(`📦 Batch size: ${options.batchSize}`);
      console.log('');
      console.log('Press Ctrl+C to stop watching...');
      
      // Keep the process alive
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping file watcher...');
        try {
          await monitoringWorkflow.stopFileWatching(folder);
          console.log('✅ File watcher stopped successfully');
        } catch (error) {
          console.error('❌ Error stopping file watcher:', error);
        }
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Failed to start file watching:', error);
      process.exit(1);
    }
  }
}
