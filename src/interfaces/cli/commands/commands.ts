/**
 * CLI Commands Index
 * 
 * Exports all available CLI commands.
 */

import { CLIProgram } from '../program.js';
import { IndexCommand } from './index.js';
import { ServeCommand } from './serve.js';
import { EmbeddingsCommand } from './embed.js';
import { SearchCommand } from './search.js';
import { WatchCommand } from './watch.js';
import { getService, MODULE_TOKENS } from '../../../di/index.js';
import { IIndexingWorkflow, IContentServingWorkflow, IMonitoringWorkflow, IKnowledgeOperations } from '../../../di/interfaces.js';

export function setupCommands(program: CLIProgram): void {
  // Get services from DI container
  const indexingWorkflow = getService<IIndexingWorkflow>(MODULE_TOKENS.APPLICATION.INDEXING_WORKFLOW);
  const servingWorkflow = getService<IContentServingWorkflow>(MODULE_TOKENS.APPLICATION.CONTENT_SERVING_WORKFLOW);
  const monitoringWorkflow = getService<IMonitoringWorkflow>(MODULE_TOKENS.APPLICATION.MONITORING_WORKFLOW);
  const knowledgeOperations = getService<IKnowledgeOperations>(MODULE_TOKENS.APPLICATION.KNOWLEDGE_OPERATIONS);

  // Add commands
  program.addCommand(new IndexCommand(indexingWorkflow));
  program.addCommand(new ServeCommand(servingWorkflow));
  program.addCommand(new EmbeddingsCommand(indexingWorkflow));
  program.addCommand(new SearchCommand(knowledgeOperations));
  program.addCommand(new WatchCommand(monitoringWorkflow));
}
