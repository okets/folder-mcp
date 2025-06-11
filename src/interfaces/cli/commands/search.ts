/**
 * Search Command Implementation
 * 
 * Handles semantic search by delegating to the KnowledgeOperations application service.
 */

import { Command } from 'commander';
import { IKnowledgeOperations } from '../../../di/interfaces.js';

export class SearchCommand extends Command {
  constructor(private readonly knowledgeOperations: IKnowledgeOperations) {
    super('search');
    
    this
      .description('Search the indexed content using semantic search')
      .argument('<query>', 'Search query')
      .option('-l, --limit <number>', 'Maximum number of results', '10')
      .option('-t, --threshold <number>', 'Similarity threshold (0-1)', '0.7')
      .action(this.execute.bind(this));
  }

  private async execute(query: string, options: any): Promise<void> {
    try {
      const results = await this.knowledgeOperations.semanticSearch(query, {
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
