/**
 * Serve Command Implementation
 * 
 * Handles MCP server startup with basic functionality.
 */

import { BaseCommand } from './base-command.js';
import { MODULE_TOKENS } from '../../../di/interfaces.js';
import type { IContentServingWorkflow } from '../../../di/interfaces.js';

export class ServeCommand extends BaseCommand {
  constructor() {
    super('serve');
    
    this
      .description('Start the MCP server for a folder')
      .argument('<folder>', 'Folder to serve')
      .option('-p, --port <port>', 'Port to listen on', '8080')
      .option('-h, --host <host>', 'Host to bind to', 'localhost')
      .option('-t, --transport <transport>', 'Transport protocol', 'stdio')
      .action(this.execute.bind(this));
  }

  /**
   * Execute the serve command
   */
  private async execute(folder: string, options: any): Promise<void> {
    try {
      console.log(`🚀 Starting MCP server for folder: ${folder}`);
      console.log(`🌐 Transport: ${options.transport}`);
      
      // Resolve the content serving workflow service lazily
      const servingWorkflow = this.resolveService<IContentServingWorkflow>(
        folder,
        MODULE_TOKENS.APPLICATION.CONTENT_SERVING_WORKFLOW
      );
      
      // Start the server
      await servingWorkflow.startServer(folder, {
        port: parseInt(options.port),
        host: options.host
      });
      
      // Display server information
      this.displayServerInfo(folder, options);
      
    } catch (error) {
      console.error('❌ Failed to start server:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
  
  /**
   * Display server startup information
   */
  private displayServerInfo(folder: string, options: any): void {
    console.log('🚀 folder-mcp server started successfully!');
    console.log('');
    console.log(`📁 Serving folder: ${folder}`);
    console.log(`🌐 Transport: ${options.transport}`);
    
    if (options.transport === 'http') {
      console.log(`🔗 HTTP endpoint: http://${options.host}:${options.port}`);
    }
    
    console.log('');
    console.log('Press Ctrl+C to stop the server.');
  }
}
