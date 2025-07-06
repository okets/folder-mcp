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
      .option('--help-config', 'Show configuration help for search command')
      .action(this.execute.bind(this))
      .addHelpText('after', () => {
        // This will be called when --help is used - note: must be synchronous
        return '\n💡 Use --help-config for detailed configuration help and examples';
      })
      .addGlobalOptionsAfterInit();
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

      // Handle help-config option
      if (options?.helpConfig) {
        console.log(await this.getEnhancedHelp(searchFolder, 'search'));
        return;
      }

      // Apply configuration overrides first
      await this.applyConfigurationOverrides(searchFolder, options);
      
      // Resolve the knowledge operations service lazily
      const knowledgeOperations = this.resolveService<IKnowledgeOperations>(
        searchFolder,
        MODULE_TOKENS.APPLICATION.KNOWLEDGE_OPERATIONS
      );
      
      console.log('Resolved service:', typeof knowledgeOperations);
      console.log('Available methods:', Object.getOwnPropertyNames(knowledgeOperations));
      console.log('Has semanticSearch:', typeof knowledgeOperations.semanticSearch);
      
      const searchResult = await knowledgeOperations.semanticSearch(query, {
        maxResults: parseInt(options.limit),
        threshold: parseFloat(options.threshold)
      });

      // Display results
      if (this.handleJsonOutput(searchFolder, searchResult, options, (jsonService, data) => {
        return jsonService.formatSearchResults(
          data.results,
          query,
          data.totalResults,
          data.processingTime
        );
      })) {
        return; // JSON output handled
      } else {
        // Human-readable output
        if (searchResult.success && searchResult.results.length > 0) {
          console.log(`\nSearch Results (${searchResult.totalResults} found in ${searchResult.processingTime}ms):`);
          searchResult.results.forEach((result: any, index: number) => {
            console.log(`\n${index + 1}. ${result.filePath}`);
            console.log(`   Relevance: ${(result.similarity * 100).toFixed(1)}%`);
            console.log(`   Chunk: ${result.chunkIndex}`);
            if (result.content) {
              const excerpt = result.content.substring(0, 200) + (result.content.length > 200 ? '...' : '');
              console.log(`   Content: ${excerpt}`);
            }
          });
        } else {
          console.log(`\nNo results found for "${query}"`);
          if (!searchResult.success) {
            console.log('Search failed - check server logs for details');
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const currentFolder = folder || process.cwd();
      
      // Handle JSON error output
      if (this.handleJsonError(currentFolder, `Search failed: ${errorMessage}`, 'SEARCH_ERROR', { query, folder: currentFolder }, options)) {
        return; // JSON error output handled (will exit)
      }
      
      // Human-readable error output
      console.error('Search failed:', errorMessage);
      process.exit(1);
    }
  }
}
