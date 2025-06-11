/**
 * Search Command Implementation
 * 
 * Handles semantic search by delegating to the KnowledgeOperations application service.
 */

import { CLICommand, CLICommandOptions } from '../index.js';
import { IKnowledgeOperations } from '../../../di/interfaces.js';
import { resolveConfig, parseCliArgs, validateResolvedConfig, displayConfigSummary } from '../../../config/resolver.js';

export class SearchCommand implements CLICommand {
  name = 'search';
  description = 'Search for similar content using vector similarity';
  options = [
    { name: 'results', alias: 'k', type: 'string' as const, description: 'Number of results to return (default: 5)', default: '5' },
    { name: 'rebuild-index', type: 'boolean' as const, description: 'Rebuild the vector index before searching' },
    { name: 'model', type: 'string' as const, description: 'Override embedding model to use' },
    { name: 'show-config', type: 'boolean' as const, description: 'Show resolved configuration before processing' }
  ];

  constructor(
    private readonly knowledgeOperations: IKnowledgeOperations
  ) {}

  async execute(options: CLICommandOptions): Promise<void> {
    const args = options._args as string[];
    const folder = args[0];
    const query = args[1];

    if (!folder || !query) {
      console.error('❌ Error: Both folder and query arguments are required');
      console.log('Usage: folder-mcp search <folder> <query> [options]');
      process.exit(1);
    }

    // Parse CLI arguments and resolve configuration
    const cliArgs = parseCliArgs(options);
    const config = resolveConfig(folder, cliArgs);

    // Validate configuration
    const validationErrors = validateResolvedConfig(config);
    if (validationErrors.length > 0) {
      console.error('❌ Configuration validation errors:');
      validationErrors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Show configuration if requested
    if (options.showConfig) {
      displayConfigSummary(config, false);
    }

    // Validate results parameter
    const k = options.results ? parseInt(options.results, 10) : 5;
    if (isNaN(k) || k < 1) {
      console.error('❌ Number of results must be a positive number');
      process.exit(1);
    }

    try {
      console.log(`🔍 Searching for: "${query}"`);
      console.log(`📁 In folder: ${folder}`);
      console.log(`📊 Results limit: ${k}\n`);
      
      // For now, use the legacy implementation
      // In the future, this should use knowledgeOperations.semanticSearch()
      const { searchVectorIndex } = await import('../../../search/cli.js');
      await searchVectorIndex(folder, query, {
        k,
        rebuildIndex: options.rebuildIndex || false,
        resolvedConfig: config
      });
      
    } catch (error) {
      console.error('❌ Search failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
}
