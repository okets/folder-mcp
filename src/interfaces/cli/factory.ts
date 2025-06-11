/**
 * CLI Factory
 * 
 * Creates and configures the complete CLI application with all commands.
 */

import { FolderMCPCLI, IndexCommand, ServeCommand, EmbeddingsCommand, SearchCommand, WatchCommand } from './index.js';
import { IIndexingWorkflow, IContentServingWorkflow, IMonitoringWorkflow, IKnowledgeOperations } from '../../di/interfaces.js';
import { setupConfigCommand } from '../../config/cli.js';
import { Command } from 'commander';

export interface CLIFactoryOptions {
  indexingWorkflow: IIndexingWorkflow;
  servingWorkflow: IContentServingWorkflow;
  monitoringWorkflow: IMonitoringWorkflow;
  knowledgeOperations: IKnowledgeOperations;
  packageJson: any;
}

export class CLIFactory {
  
  /**
   * Create a fully configured CLI application
   */
  static create(options: CLIFactoryOptions): FolderMCPCLI {
    const cli = new FolderMCPCLI(
      options.indexingWorkflow,
      options.servingWorkflow,
      options.monitoringWorkflow,
      options.packageJson
    );

    // Add core commands
    cli.addCommand(new IndexCommand(options.indexingWorkflow, options.packageJson));
    cli.addCommand(new ServeCommand(options.servingWorkflow));
    cli.addCommand(new EmbeddingsCommand(options.indexingWorkflow));
    cli.addCommand(new SearchCommand(options.knowledgeOperations));
    cli.addCommand(new WatchCommand(options.monitoringWorkflow, options.packageJson));

    return cli;
  }

  /**
   * Create CLI with legacy compatibility (for migration period)
   */
  static async createWithLegacySupport(packageJson: any): Promise<Command> {
    const program = new Command();
    
    program
      .name('folder-mcp')
      .description('Universal Folder-to-MCP-Server Tool - Transform any local folder into an intelligent knowledge base')
      .version(packageJson.version);

    // Add config command (infrastructure layer, keep as is)
    setupConfigCommand(program);

    // Add other legacy commands using the existing implementation
    await this.addLegacyCommands(program, packageJson);

    return program;
  }

  /**
   * Add legacy command implementations for backward compatibility
   */
  private static async addLegacyCommands(program: Command, packageJson: any): Promise<void> {
    try {
      const { setupCommands } = await import('../../cli/commands.js');
      setupCommands(program, packageJson);
    } catch (error) {
      console.warn('Warning: Could not load legacy commands:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Create CLI using dependency injection
   */
  static async createWithDI(packageJson: any): Promise<FolderMCPCLI> {
    try {
      // Dynamic import to avoid loading DI if not needed
      const { getService, MODULE_TOKENS } = await import('../../di/index.js');
      
      const options: CLIFactoryOptions = {
        indexingWorkflow: getService(MODULE_TOKENS.APPLICATION.INDEXING_WORKFLOW),
        servingWorkflow: getService(MODULE_TOKENS.APPLICATION.CONTENT_SERVING_WORKFLOW),
        monitoringWorkflow: getService(MODULE_TOKENS.APPLICATION.MONITORING_WORKFLOW),
        knowledgeOperations: getService(MODULE_TOKENS.APPLICATION.KNOWLEDGE_OPERATIONS),
        packageJson
      };

      return this.create(options);
    } catch (error) {
      throw new Error(`Failed to create CLI with DI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
