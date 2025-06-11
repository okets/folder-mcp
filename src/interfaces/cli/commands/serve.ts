/**
 * Serve Command Implementation
 * 
 * Handles MCP server startup by delegating to the ContentServingWorkflow application service.
 */

import { Command } from 'commander';
import { IContentServingWorkflow } from '../../../di/interfaces.js';

export class ServeCommand extends Command {
  constructor(private readonly servingWorkflow: IContentServingWorkflow) {
    super('serve');
    
    this
      .description('Start the MCP server for a folder')
      .argument('<folder>', 'Folder to serve')
      .option('-p, --port <number>', 'Port to listen on', '3000')
      .option('-h, --host <string>', 'Host to listen on', 'localhost')
      .option('-t, --transport <string>', 'Transport protocol to use', 'http')
      .action(this.execute.bind(this));
  }

  private async execute(folder: string, options: any): Promise<void> {
    try {
      await this.servingWorkflow.startServer(folder, {
        port: parseInt(options.port),
        host: options.host
      });
      
      console.log(`✅ Server started at http://${options.host}:${options.port}`);
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}
