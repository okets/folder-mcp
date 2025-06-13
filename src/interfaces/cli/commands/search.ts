/**
 * Search Command Implementation
 * 
 * Handles semantic search by delegating to the KnowledgeOperations application service.
 * Uses lazy dependency injection to avoid requiring services at construction time.
 */

import { BaseCommand } from './base-command.js';
import { MODULE_TOKENS } from '../../../di/interfaces.js';
import type { IKnowledgeOperations } from '../../../di/interfaces.js';

export class SearchCommand extends BaseCommand {
  constructor() {
    super('search');
    
    this
      .description('Search the indexed content using semantic search')
      .argument('<query>', 'Search query')
      .argument('[folder]', 'Folder to search in (optional, defaults to current directory)')
      .option('-l, --limit <number>', 'Maximum number of results', '10')
      .option('-t, --threshold <number>', 'Similarity threshold (0-1)', '0.7')
      .action(this.execute.bind(this));
  }

  private async execute(query: string, folder?: string, options?: any): Promise<void> {
    try {
      // If folder is actually options (when folder argument is not provided)
      if (typeof folder === 'object' && !options) {
        options = folder;
        folder = process.cwd();
      }
      
      // Use current directory if no folder specified
      const searchFolder = folder || process.cwd();
      
      // Resolve the knowledge operations service lazily
      const knowledgeOperations = this.resolveService<IKnowledgeOperations>(
        searchFolder,
        MODULE_TOKENS.APPLICATION.KNOWLEDGE_OPERATIONS
      );
      
      const results = await knowledgeOperations.semanticSearch(query, {
        limit: parseInt(options.limit),
        threshold: parseFloat(options.threshold)
      });

      // Display results
      console.log('\nSearch Results:');
      results.forEach((result: { title: string; score: number; path: string; excerpt?: string }, index: number) => {
        console.log(`\n${index + 1}. ${result.title}`);
        console.log(`   Relevance: ${(result.score * 100).toFixed(1)}%`);
        console.log(`   Path: ${result.path}`);
        if (result.excerpt) {
          console.log(`   Excerpt: ${result.excerpt}`);
        }
      });
    } catch (error) {
      console.error('Search failed:', error);
      process.exit(1);
    }
  }
}
