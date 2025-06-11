/**
 * Interface Layer - CLI Interface Tests
 * 
 * Tests for the CLI interface layer and command handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import type {
  CLIProgram,
  CLICommand,
  CLIOption,
  CLICommandOptions,
  CLIContext
} from '../../../src/interfaces/cli/index.js';

describe('Interface Layer - CLI', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('cli-test-');
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('CLICommand Interface', () => {
    it('should define proper command contract', () => {
      const mockCommand: CLICommand = {
        name: 'test-command',
        description: 'A test command',
        options: [
          {
            name: 'recursive',
            alias: 'r',
            description: 'Process recursively',
            type: 'boolean',
            default: false
          }
        ],
        execute: async (options: CLICommandOptions): Promise<void> => {
          // Command implementation
        }
      };

      expect(mockCommand.name).toBe('test-command');
      expect(mockCommand.description).toBe('A test command');
      expect(mockCommand.options).toHaveLength(1);
      expect(mockCommand.execute).toBeDefined();
    });

    it('should handle command execution with options', async () => {
      const mockCommand: CLICommand = {
        name: 'index',
        description: 'Index files in a directory',
        options: [
          {
            name: 'recursive',
            alias: 'r',
            description: 'Index subdirectories recursively',
            type: 'boolean',
            default: false
          },
          {
            name: 'exclude',
            alias: 'e',
            description: 'Exclude patterns',
            type: 'array',
            default: []
          }
        ],
        execute: async (options: CLICommandOptions): Promise<void> => {
          expect(options.recursive).toBe(true);
          expect(options.exclude).toEqual(['*.tmp', 'node_modules']);
        }
      };

      await mockCommand.execute({
        recursive: true,
        exclude: ['*.tmp', 'node_modules']
      });
    });

    it('should validate command options properly', () => {
      const mockCommand: CLICommand = {
        name: 'search',
        description: 'Search for content',
        options: [
          {
            name: 'query',
            description: 'Search query',
            type: 'string',
            required: true
          },
          {
            name: 'limit',
            alias: 'l',
            description: 'Maximum results',
            type: 'number',
            default: 10
          }
        ],
        execute: async (): Promise<void> => {}
      };

      const validateOptions = (options: CLICommandOptions): boolean => {
        if (!options.query || typeof options.query !== 'string') {
          return false;
        }
        
        if (options.limit && (typeof options.limit !== 'number' || options.limit <= 0)) {
          return false;
        }
        
        return true;
      };

      expect(validateOptions({ query: 'test' })).toBe(true);
      expect(validateOptions({ query: 'test', limit: 20 })).toBe(true);
      expect(validateOptions({})).toBe(false);
      expect(validateOptions({ query: 'test', limit: -5 })).toBe(false);
    });
  });

  describe('CLIProgram Interface', () => {
    it('should define proper CLI program contract', () => {
      const mockProgram: CLIProgram = {
        addCommand: (command: CLICommand): void => {},
        execute: async (args: string[]): Promise<void> => {},
        getCommands: (): CLICommand[] => []
      };

      expect(mockProgram.addCommand).toBeDefined();
      expect(mockProgram.execute).toBeDefined();
      expect(mockProgram.getCommands).toBeDefined();
    });

    it('should manage command registry properly', () => {
      const commands: CLICommand[] = [];
      
      const mockProgram: Partial<CLIProgram> = {
        addCommand: (command: CLICommand): void => {
          commands.push(command);
        },
        
        getCommands: (): CLICommand[] => {
          return commands;
        }
      };

      const indexCommand: CLICommand = {
        name: 'index',
        description: 'Index files',
        options: [],
        execute: async (): Promise<void> => {}
      };

      const searchCommand: CLICommand = {
        name: 'search',
        description: 'Search content',
        options: [],
        execute: async (): Promise<void> => {}
      };

      // Add commands
      mockProgram.addCommand?.(indexCommand);
      mockProgram.addCommand?.(searchCommand);

      const registeredCommands = mockProgram.getCommands?.();
      expect(registeredCommands).toHaveLength(2);
      expect(registeredCommands?.[0].name).toBe('index');
      expect(registeredCommands?.[1].name).toBe('search');
    });
  });

  describe('CLI Context', () => {
    it('should handle CLI context properly', () => {
      const context: CLIContext = {
        workingDirectory: '/project/root',
        configPath: '/etc/folder-mcp/config.yaml',
        verbosity: 'normal',
        outputFormat: 'json'
      };

      expect(context.workingDirectory).toBe('/project/root');
      expect(context.verbosity).toBe('normal');
      expect(context.outputFormat).toBe('json');
    });
  });

  describe('Help and Documentation', () => {
    it('should generate comprehensive help text', () => {
      const generateHelp = (command: CLICommand): string => {
        const sections: string[] = [];
        
        sections.push(`Usage: ${command.name} [options]`);
        sections.push(`\nDescription:\n  ${command.description}`);
        
        if (command.options.length > 0) {
          sections.push('\nOptions:');
          command.options.forEach(opt => {
            const alias = opt.alias ? `-${opt.alias}, ` : '';
            const required = opt.required ? ' (required)' : '';
            const defaultValue = opt.default !== undefined ? ` (default: ${opt.default})` : '';
            sections.push(`  ${alias}--${opt.name} - ${opt.description}${required}${defaultValue}`);
          });
        }
        
        return sections.join('\n');
      };

      const command: CLICommand = {
        name: 'search',
        description: 'Search for content in indexed files',
        options: [
          {
            name: 'query',
            description: 'Search query string',
            type: 'string',
            required: true
          },
          {
            name: 'limit',
            alias: 'l',
            description: 'Maximum number of results',
            type: 'number',
            default: 10
          },
          {
            name: 'recursive',
            alias: 'r',
            description: 'Search recursively',
            type: 'boolean',
            default: false
          }
        ],
        execute: async (): Promise<void> => {}
      };

      const help = generateHelp(command);
      
      expect(help).toContain('Usage: search [options]');
      expect(help).toContain('Search for content in indexed files');
      expect(help).toContain('--query - Search query string (required)');
      expect(help).toContain('-l, --limit - Maximum number of results (default: 10)');
      expect(help).toContain('-r, --recursive - Search recursively (default: false)');
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors gracefully', async () => {
      const errorCommand: CLICommand = {
        name: 'error-command',
        description: 'Command that always fails',
        options: [],
        execute: async (): Promise<void> => {
          throw new Error('Simulated command failure');
        }
      };

      try {
        await errorCommand.execute({});
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Simulated command failure');
      }
    });

    it('should validate input and provide helpful error messages', () => {
      const validateOptions = (options: CLICommandOptions): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        
        if (!options.query) {
          errors.push('Missing required option: query');
        }
        
        if (options.limit && (typeof options.limit !== 'number' || options.limit <= 0)) {
          errors.push('Limit must be a positive number');
        }
        
        if (options.exclude && !Array.isArray(options.exclude)) {
          errors.push('Exclude must be an array of strings');
        }
        
        return { valid: errors.length === 0, errors };
      };

      expect(validateOptions({})).toEqual({
        valid: false,
        errors: ['Missing required option: query']
      });

      expect(validateOptions({ query: 'test', limit: -5 })).toEqual({
        valid: false,
        errors: ['Limit must be a positive number']
      });

      expect(validateOptions({ query: 'test', exclude: 123 })).toEqual({
        valid: false,
        errors: ['Exclude must be an array of strings']
      });

      expect(validateOptions({ query: 'test', limit: 10, exclude: ['*.tmp'] })).toEqual({
        valid: true,
        errors: []
      });
    });
  });

  describe('Modular CLI Interface', () => {
    const mockPackageJson = {
      name: 'folder-mcp',
      version: '1.0.0'
    };

    it('should create CLI program with application services', async () => {
      // Mock application services
      const mockIndexingWorkflow = {
        indexFolder: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} }),
        indexFiles: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} }),
        getIndexingStatus: () => Promise.resolve({ isRunning: false, progress: { totalFiles: 0, processedFiles: 0, totalChunks: 0, processedChunks: 0, percentage: 0 } }),
        resumeIndexing: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} })
      };

      const mockServingWorkflow = {
        getFileContent: () => Promise.resolve({ success: true, content: 'test' }),
        searchKnowledge: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {} }),
        getFileList: () => Promise.resolve({ success: true, files: [] }),
        getServerStatus: () => Promise.resolve({ running: true, uptime: 1000 })
      };

      const mockMonitoringWorkflow = {
        startFileWatching: () => Promise.resolve({ success: true, watcherId: 'test' }),
        stopFileWatching: () => Promise.resolve(),
        getWatchingStatus: () => Promise.resolve({ isWatching: false, watchedPaths: [] }),
        getSystemHealth: () => Promise.resolve({ healthy: true, metrics: {} })
      };

      const mockKnowledgeOperations = {
        semanticSearch: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {} }),
        enhancedSearch: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {}, groupedResults: {}, suggestions: [], relatedQueries: [] }),
        getRelatedContent: () => Promise.resolve({ success: true, relatedContent: [] })
      };

      // Create CLI using factory
      const { CLIFactory } = await import('../../../src/interfaces/cli/index.js');
      
      const cli = CLIFactory.create({
        indexingWorkflow: mockIndexingWorkflow,
        servingWorkflow: mockServingWorkflow,
        monitoringWorkflow: mockMonitoringWorkflow,
        knowledgeOperations: mockKnowledgeOperations,
        packageJson: mockPackageJson
      });

      expect(cli).toBeDefined();
      expect(cli.getCommands).toBeDefined();
      
      const commands = cli.getCommands();
      expect(commands).toHaveLength(5); // index, serve, embeddings, search, watch
    });

    it('should register commands with correct structure', async () => {
      const mockServices = {
        indexingWorkflow: {
          indexFolder: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} }),
          indexFiles: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} }),
          getIndexingStatus: () => Promise.resolve({ isRunning: false, progress: { totalFiles: 0, processedFiles: 0, totalChunks: 0, processedChunks: 0, percentage: 0 } }),
          resumeIndexing: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} })
        },
        servingWorkflow: {
          getFileContent: () => Promise.resolve({ success: true, content: 'test' }),
          searchKnowledge: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {} }),
          getFileList: () => Promise.resolve({ success: true, files: [] }),
          getServerStatus: () => Promise.resolve({ running: true, uptime: 1000 })
        },
        monitoringWorkflow: {
          startFileWatching: () => Promise.resolve({ success: true, watcherId: 'test' }),
          stopFileWatching: () => Promise.resolve(),
          getWatchingStatus: () => Promise.resolve({ isWatching: false, watchedPaths: [] }),
          getSystemHealth: () => Promise.resolve({ healthy: true, metrics: {} })
        },
        knowledgeOperations: {
          semanticSearch: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {} }),
          enhancedSearch: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {}, groupedResults: {}, suggestions: [], relatedQueries: [] }),
          getRelatedContent: () => Promise.resolve({ success: true, relatedContent: [] })
        },
        packageJson: mockPackageJson
      };

      const { CLIFactory } = await import('../../../src/interfaces/cli/index.js');
      const cli = CLIFactory.create(mockServices);
      const commands = cli.getCommands();
      const commandNames = commands.map(cmd => cmd.name);

      expect(commandNames).toContain('index');
      expect(commandNames).toContain('serve');
      expect(commandNames).toContain('embeddings');
      expect(commandNames).toContain('search');
      expect(commandNames).toContain('watch');
    });

    it('should validate command options properly', async () => {
      const mockServices = {
        indexingWorkflow: {
          indexFolder: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} }),
          indexFiles: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} }),
          getIndexingStatus: () => Promise.resolve({ isRunning: false, progress: { totalFiles: 0, processedFiles: 0, totalChunks: 0, processedChunks: 0, percentage: 0 } }),
          resumeIndexing: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} })
        },
        servingWorkflow: {
          getFileContent: () => Promise.resolve({ success: true, content: 'test' }),
          searchKnowledge: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {} }),
          getFileList: () => Promise.resolve({ success: true, files: [] }),
          getServerStatus: () => Promise.resolve({ running: true, uptime: 1000 })
        },
        monitoringWorkflow: {
          startFileWatching: () => Promise.resolve({ success: true, watcherId: 'test' }),
          stopFileWatching: () => Promise.resolve(),
          getWatchingStatus: () => Promise.resolve({ isWatching: false, watchedPaths: [] }),
          getSystemHealth: () => Promise.resolve({ healthy: true, metrics: {} })
        },
        knowledgeOperations: {
          semanticSearch: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {} }),
          enhancedSearch: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {}, groupedResults: {}, suggestions: [], relatedQueries: [] }),
          getRelatedContent: () => Promise.resolve({ success: true, relatedContent: [] })
        },
        packageJson: mockPackageJson
      };

      const { CLIFactory } = await import('../../../src/interfaces/cli/index.js');
      const cli = CLIFactory.create(mockServices);
      const commands = cli.getCommands();
      
      const indexCommand = commands.find(cmd => cmd.name === 'index');
      expect(indexCommand).toBeDefined();
      expect(indexCommand?.options.some(opt => opt.name === 'chunk-size' && opt.type === 'number')).toBe(true);
      expect(indexCommand?.options.some(opt => opt.name === 'show-config' && opt.type === 'boolean')).toBe(true);

      const serveCommand = commands.find(cmd => cmd.name === 'serve');
      expect(serveCommand).toBeDefined();
      expect(serveCommand?.options.some(opt => opt.name === 'port' && opt.alias === 'p')).toBe(true);
      expect(serveCommand?.options.some(opt => opt.name === 'transport' && opt.alias === 't')).toBe(true);
    });

    it('should handle CLI context management', async () => {
      const mockServices = {
        indexingWorkflow: {
          indexFolder: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} }),
          indexFiles: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} }),
          getIndexingStatus: () => Promise.resolve({ isRunning: false, progress: { totalFiles: 0, processedFiles: 0, totalChunks: 0, processedChunks: 0, percentage: 0 } }),
          resumeIndexing: () => Promise.resolve({ success: true, filesProcessed: 0, chunksGenerated: 0, embeddingsCreated: 0, processingTime: 0, errors: [], statistics: {} })
        },
        servingWorkflow: {
          getFileContent: () => Promise.resolve({ success: true, content: 'test' }),
          searchKnowledge: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {} }),
          getFileList: () => Promise.resolve({ success: true, files: [] }),
          getServerStatus: () => Promise.resolve({ running: true, uptime: 1000 })
        },
        monitoringWorkflow: {
          startFileWatching: () => Promise.resolve({ success: true, watcherId: 'test' }),
          stopFileWatching: () => Promise.resolve(),
          getWatchingStatus: () => Promise.resolve({ isWatching: false, watchedPaths: [] }),
          getSystemHealth: () => Promise.resolve({ healthy: true, metrics: {} })
        },
        knowledgeOperations: {
          semanticSearch: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {} }),
          enhancedSearch: () => Promise.resolve({ success: true, results: [], totalResults: 0, processingTime: 0, query: '', options: {}, groupedResults: {}, suggestions: [], relatedQueries: [] }),
          getRelatedContent: () => Promise.resolve({ success: true, relatedContent: [] })
        },
        packageJson: mockPackageJson
      };

      const { CLIFactory } = await import('../../../src/interfaces/cli/index.js');
      const cli = CLIFactory.create(mockServices);
      
      const initialContext = cli.getContext();
      expect(initialContext.workingDirectory).toBe(process.cwd());
      expect(initialContext.verbosity).toBe('normal');
      expect(initialContext.outputFormat).toBe('text');

      // Update context
      cli.updateContext({
        verbosity: 'verbose',
        outputFormat: 'json'
      });

      const updatedContext = cli.getContext();
      expect(updatedContext.verbosity).toBe('verbose');
      expect(updatedContext.outputFormat).toBe('json');
      expect(updatedContext.workingDirectory).toBe(initialContext.workingDirectory);
    });

    it('should support legacy compatibility mode', async () => {
      const { CLIFactory } = await import('../../../src/interfaces/cli/index.js');
      const program = await CLIFactory.createWithLegacySupport(mockPackageJson);
      
      expect(program).toBeDefined();
      expect(program.name()).toBe('folder-mcp');
      expect(program.version()).toBe('1.0.0');
    });
  });
});
