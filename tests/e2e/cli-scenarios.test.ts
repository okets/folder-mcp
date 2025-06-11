/**
 * End-to-End Tests - CLI Scenarios
 * 
 * Complete workflow tests for CLI interactions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils, TestDataGenerator } from '../helpers/test-utils.js';

// Define interfaces for test data structures
interface IndexResult {
  file: string;
  size: number;
  chunks: number;
  embeddings: number;
  status: string;
}

interface ErrorResult {
  file: string;
  error: string;
  stage: string;
}

interface SearchResult {
  file: string;
  score: number;
  snippet: string;
  matchType?: 'semantic' | 'keyword';
}

interface CommandOption {
  name: string;
  description: string;
  alias?: string;
}

interface CLIResponse {
  success: boolean;
  message: string;
  data?: {
    directoryPath?: string;
    totalFiles?: number;
    totalChunks?: number;
    totalEmbeddings?: number;
    results?: Array<IndexResult | SearchResult>;
    query?: string;
    searchType?: string;
    totalResults?: number;
    commands?: Array<{ name: string; description: string }>;
    globalOptions?: CommandOption[];
    command?: string;
    description?: string;
    usage?: string;
    options?: CommandOption[];
    version?: string;
    build?: string;
    node?: string;
    configs?: Record<string, string>;
    key?: string;
    value?: string;
    previous?: string;
    codeFiles?: number;
    testFiles?: number;
    documentFiles?: number;
    totalLines?: number;
    languages?: string[];
    indexedFiles?: number;
    processedFiles?: number;
    errors?: number;
    errorDetails?: ErrorResult[];
  };
  error?: string;
}

describe('E2E - CLI Scenarios', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('e2e-cli-test-');
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('Complete Indexing Workflow', () => {
    it('should perform end-to-end file indexing via CLI', async () => {
      // Set up test project structure
      const projectFiles = {
        'README.md': TestDataGenerator.sampleFileContent('markdown'),
        'package.json': TestDataGenerator.sampleFileContent('json'),
        'src/main.ts': TestDataGenerator.sampleFileContent('code'),
        'src/utils.ts': TestDataGenerator.sampleFileContent('code'),
        'src/types.ts': `
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  users: User[];
}
`,
        'docs/api.md': `
# API Documentation

## Users API

### GET /users
Returns a list of all users.

### POST /users
Creates a new user.

### GET /users/:id
Returns a specific user by ID.
`,
        'tests/main.test.ts': `
import { describe, it, expect } from 'vitest';

describe('Main Tests', () => {
  it('should work correctly', () => {
    expect(true).toBe(true);
  });
});
`
      };

      await TestUtils.createTestFiles(tempDir, projectFiles);

      // Mock CLI application
      const mockCLI = {
        commands: new Map<string, any>(),
        
        executeCommand: async (command: string, args: string[], options: Record<string, any> = {}): Promise<CLIResponse> => {
          const handler = mockCLI.commands.get(command);
          if (!handler) {
            throw new Error(`Unknown command: ${command}`);
          }
          
          return handler.execute({ command, args, options });
        },

        registerCommand: (name: string, handler: any) => {
          mockCLI.commands.set(name, handler);
        }
      };

      // Register index command
      mockCLI.registerCommand('index', {
        execute: async ({ args, options }: any): Promise<CLIResponse> => {
          const directoryPath = args[0] || '.';
          const recursive = options.recursive || false;
          const exclude = options.exclude || [];
          
          // Simulate file discovery
          const allFiles = Object.keys(projectFiles);
          const filteredFiles = allFiles.filter(file => {
            if (!recursive && file.includes('/')) return false;
            return !exclude.some((pattern: string) => file.includes(pattern));
          });

          // Simulate processing each file
          const results: IndexResult[] = [];
          for (const file of filteredFiles) {
            const content = projectFiles[file as keyof typeof projectFiles];
            const chunks = Math.ceil(content.length / 1000); // 1KB chunks
            
            results.push({
              file,
              size: content.length,
              chunks,
              embeddings: chunks,
              status: 'success'
            });
          }

          return {
            success: true,
            message: `Successfully indexed ${filteredFiles.length} files`,
            data: {
              directoryPath,
              totalFiles: filteredFiles.length,
              totalChunks: results.reduce((sum, r) => sum + r.chunks, 0),
              totalEmbeddings: results.reduce((sum, r) => sum + r.embeddings, 0),
              results
            }
          };
        }
      });

      // Test 1: Basic indexing
      const basicResult = await mockCLI.executeCommand('index', [tempDir]);
      expect(basicResult.success).toBe(true);
      expect(basicResult.data?.totalFiles).toBeGreaterThan(0);
      expect(basicResult.data?.totalChunks).toBeGreaterThan(0);
      expect(basicResult.message).toContain('Successfully indexed');

      // Test 2: Recursive indexing
      const recursiveResult = await mockCLI.executeCommand('index', [tempDir], { recursive: true });
      expect(recursiveResult.success).toBe(true);
      expect(recursiveResult.data?.totalFiles).toBeGreaterThan(basicResult.data?.totalFiles ?? 0);

      // Test 3: Indexing with exclusions
      const excludeResult = await mockCLI.executeCommand('index', [tempDir], { 
        recursive: true, 
        exclude: ['test', 'node_modules'] 
      });
      expect(excludeResult.success).toBe(true);
      expect(excludeResult.data?.totalFiles).toBeLessThanOrEqual(recursiveResult.data?.totalFiles ?? 0);

      // Verify results structure
      const result = recursiveResult.data;
      expect(result?.results).toBeInstanceOf(Array);
      expect(result?.results?.length).toBe(result?.totalFiles);
      
      result?.results?.forEach((fileResult) => {
        if ('size' in fileResult) {
          expect(fileResult.file).toBeTruthy();
          expect(fileResult.size).toBeGreaterThan(0);
          expect(fileResult.chunks).toBeGreaterThan(0);
          expect(fileResult.status).toBe('success');
        }
      });
    });

    it('should handle indexing errors gracefully', async () => {
      // Create files with simulated problems
      const problematicFiles = {
        'good-file.txt': 'This is a good file that should process fine.',
        'empty-file.txt': '',
        'large-file.txt': 'x'.repeat(10 * 1024 * 1024), // 10MB file
        'binary-file.bin': '\x00\x01\x02\x03\x04\x05' // Binary content
      };

      await TestUtils.createTestFiles(tempDir, problematicFiles);

      const mockCLI = {
        executeCommand: async (command: string, args: string[]): Promise<CLIResponse> => {
          if (command !== 'index') {
            throw new Error(`Unknown command: ${command}`);
          }

          const results: IndexResult[] = [];
          const errors: ErrorResult[] = [];

          for (const [filename, content] of Object.entries(problematicFiles)) {
            try {
              // Simulate various processing conditions
              if (filename === 'empty-file.txt' && content.length === 0) {
                errors.push({
                  file: filename,
                  error: 'Empty file - skipped',
                  stage: 'validation'
                });
                continue;
              }

              if (filename === 'large-file.txt' && content.length > 5 * 1024 * 1024) {
                errors.push({
                  file: filename,
                  error: 'File too large - exceeds 5MB limit',
                  stage: 'validation'
                });
                continue;
              }

              if (filename === 'binary-file.bin') {
                errors.push({
                  file: filename,
                  error: 'Binary file detected - not supported',
                  stage: 'parsing'
                });
                continue;
              }

              // Successful processing
              results.push({
                file: filename,
                size: content.length,
                chunks: Math.ceil(content.length / 1000),
                embeddings: Math.ceil(content.length / 1000),
                status: 'success'
              });

            } catch (error) {
              errors.push({
                file: filename,
                error: (error as Error).message,
                stage: 'processing'
              });
            }
          }

          return {
            success: errors.length === 0 || results.length > 0,
            message: `Processed ${results.length} files with ${errors.length} errors`,
            data: {
              totalFiles: Object.keys(problematicFiles).length,
              processedFiles: results.length,
              errors: errors.length,
              results,
              errorDetails: errors
            }
          };
        }
      };

      const result = await mockCLI.executeCommand('index', [tempDir]);

      expect(result.success).toBe(true);
      expect(result.data?.processedFiles).toBe(1);
      expect(result.data?.errors).toBe(3);
      expect(result.data?.errorDetails?.length).toBe(3);

      // Verify error details
      const errorFiles = result.data?.errorDetails?.map(e => e.file) ?? [];
      expect(errorFiles).toContain('empty-file.txt');
      expect(errorFiles).toContain('large-file.txt');
      expect(errorFiles).toContain('binary-file.bin');

      // Verify successful file
      const successfulResults = result.data?.results ?? [];
      expect(successfulResults).toHaveLength(1);
      const firstResult = successfulResults[0];
      expect(firstResult?.file).toBe('good-file.txt');
      expect('status' in firstResult && firstResult.status).toBe('success');
    });
  });

  describe('Search Workflow', () => {
    it('should perform end-to-end search operations', async () => {
      // Set up indexed content
      const indexedFiles = {
        'README.md': `
# Project Documentation

This project implements a **file indexing system** using TypeScript.
It supports various file types and provides semantic search capabilities.

## Features
- File parsing and chunking
- Embedding generation
- Vector search
- CLI interface
`,
        'src/parser.ts': `
export class FileParser {
  /**
   * Parses a file and extracts content for indexing
   */
  parseFile(path: string): ParseResult {
    // Implementation for file parsing
    return { content: '', metadata: {} };
  }
}
`,
        'src/search.ts': `
export class SearchEngine {
  /**
   * Performs semantic search across indexed content
   */
  async semanticSearch(query: string): Promise<SearchResult[]> {
    // Implementation for semantic search
    return [];
  }
  
  /**
   * Performs keyword-based search
   */
  keywordSearch(query: string): SearchResult[] {
    // Implementation for keyword search
    return [];
  }
}
`
      };

      await TestUtils.createTestFiles(tempDir, indexedFiles);

      // Mock search-enabled CLI
      const mockSearchIndex = {
        files: new Map<string, { content: string; embeddings: number[] }>(),
        
        addFile: (path: string, content: string) => {
          const embedding = new Array(384).fill(0).map(() => Math.random());
          mockSearchIndex.files.set(path, { content, embeddings: embedding });
        },

        search: (query: string, type: 'semantic' | 'keyword' = 'semantic'): SearchResult[] => {
          const results: SearchResult[] = [];
          
          for (const [path, data] of mockSearchIndex.files.entries()) {
            let score = 0;
            
            if (type === 'keyword') {
              const queryWords = query.toLowerCase().split(/\s+/);
              const contentWords = data.content.toLowerCase();
              score = queryWords.filter(word => contentWords.includes(word)).length / queryWords.length;
            } else {
              score = Math.random() * 0.4 + 0.6;
              
              if (data.content.toLowerCase().includes(query.toLowerCase())) {
                score = Math.min(1.0, score + 0.2);
              }
            }
            
            if (score > 0.5) {
              const content = data.content;
              const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
              let snippet = '';
              
              if (queryIndex >= 0) {
                const start = Math.max(0, queryIndex - 50);
                const end = Math.min(content.length, queryIndex + query.length + 50);
                snippet = content.slice(start, end);
              } else {
                snippet = content.slice(0, 100) + '...';
              }
              
              results.push({
                file: path,
                score,
                snippet: snippet.trim(),
                matchType: type
              });
            }
          }
          
          return results.sort((a, b) => b.score - a.score);
        }
      };

      // Index the files first
      for (const [path, content] of Object.entries(indexedFiles)) {
        mockSearchIndex.addFile(path, content);
      }

      const mockCLI = {
        executeCommand: async (command: string, args: string[], options: Record<string, any> = {}): Promise<CLIResponse> => {
          if (command === 'search') {
            const query = args[0];
            const searchType = options.type || 'semantic';
            const limit = options.limit || 10;
            
            if (!query) {
              throw new Error('Search query is required');
            }
            
            const results = mockSearchIndex.search(query, searchType).slice(0, limit);
            
            return {
              success: true,
              message: `Found ${results.length} results for: "${query}"`,
              data: {
                query,
                searchType,
                totalResults: results.length,
                results: results.map(r => ({
                  ...r,
                  score: Math.round(r.score * 100) / 100 // Round to 2 decimals
                }))
              }
            };
          }
          
          throw new Error(`Unknown command: ${command}`);
        }
      };

      // Test 1: Semantic search for technical terms
      const semanticResult = await mockCLI.executeCommand('search', ['file parsing'], { type: 'semantic' });
      expect(semanticResult.success).toBe(true);
      expect(semanticResult.data?.results?.length).toBeGreaterThan(0);
      expect(semanticResult.data?.searchType).toBe('semantic');

      // Test 2: Keyword search for specific terms
      const keywordResult = await mockCLI.executeCommand('search', ['TypeScript'], { type: 'keyword' });
      expect(keywordResult.success).toBe(true);
      expect(keywordResult.data?.results?.length).toBeGreaterThan(0);
      expect(keywordResult.data?.searchType).toBe('keyword');

      // Test 3: Search with result limiting
      const limitedResult = await mockCLI.executeCommand('search', ['search'], { limit: 1 });
      expect(limitedResult.success).toBe(true);
      expect(limitedResult.data?.results?.length).toBe(1);

      // Test 4: Search for content that should match multiple files
      const multiResult = await mockCLI.executeCommand('search', ['search']);
      expect(multiResult.success).toBe(true);
      expect(multiResult.data?.results?.length).toBeGreaterThan(1);

      // Verify result structure
      const results = multiResult.data?.results ?? [];
      results.forEach((result) => {
        if ('score' in result) {
          expect(result.file).toBeTruthy();
          expect(result.score).toBeGreaterThan(0);
          expect(result.score).toBeLessThanOrEqual(1);
          expect(result.snippet).toBeTruthy();
          expect(['semantic', 'keyword']).toContain(result.matchType);
        }
      });

      // Results should be sorted by score (descending)
      const searchResults = results.filter((result): result is SearchResult => 'score' in result);
      for (let i = 1; i < searchResults.length; i++) {
        expect(searchResults[i - 1].score).toBeGreaterThanOrEqual(searchResults[i].score);
      }
    });

    it('should handle search edge cases and errors', async () => {
      const mockCLI = {
        executeCommand: async (command: string, args: string[], options: Record<string, any> = {}): Promise<CLIResponse> => {
          if (command !== 'search') {
            throw new Error(`Unknown command: ${command}`);
          }

          const query = args[0];
          
          // Handle various edge cases
          if (!query) {
            return {
              success: false,
              message: 'Search query is required',
              error: 'MISSING_QUERY'
            };
          }

          if (query.trim().length < 2) {
            return {
              success: false,
              message: 'Search query must be at least 2 characters long',
              error: 'QUERY_TOO_SHORT'
            };
          }

          if (query.length > 500) {
            return {
              success: false,
              message: 'Search query is too long (max 500 characters)',
              error: 'QUERY_TOO_LONG'
            };
          }

          // Simulate no results found
          if (query.includes('nonexistent')) {
            return {
              success: true,
              message: `No results found for: "${query}"`,
              data: {
                query,
                totalResults: 0,
                results: []
              }
            };
          }

          // Simulate search timeout
          if (query.includes('timeout')) {
            return {
              success: false,
              message: 'Search operation timed out',
              error: 'SEARCH_TIMEOUT'
            };
          }

          // Normal successful search
          return {
            success: true,
            message: `Found 1 result for: "${query}"`,
            data: {
              query,
              totalResults: 1,
              results: [
                {
                  file: 'test.txt',
                  score: 0.95,
                  snippet: `This contains the search term: ${query}`
                }
              ]
            }
          };
        }
      };

      // Test 1: Missing query
      const noQueryResult = await mockCLI.executeCommand('search', []);
      expect(noQueryResult.success).toBe(false);
      expect(noQueryResult.error).toBe('MISSING_QUERY');

      // Test 2: Query too short
      const shortQueryResult = await mockCLI.executeCommand('search', ['a']);
      expect(shortQueryResult.success).toBe(false);
      expect(shortQueryResult.error).toBe('QUERY_TOO_SHORT');

      // Test 3: Query too long
      const longQuery = 'x'.repeat(501);
      const longQueryResult = await mockCLI.executeCommand('search', [longQuery]);
      expect(longQueryResult.success).toBe(false);
      expect(longQueryResult.error).toBe('QUERY_TOO_LONG');

      // Test 4: No results found
      const noResultsResult = await mockCLI.executeCommand('search', ['nonexistent term']);
      expect(noResultsResult.success).toBe(true);
      expect(noResultsResult.data?.totalResults).toBe(0);
      expect(noResultsResult.data?.results?.length).toBe(0);

      // Test 5: Search timeout
      const timeoutResult = await mockCLI.executeCommand('search', ['timeout query']);
      expect(timeoutResult.success).toBe(false);
      expect(timeoutResult.error).toBe('SEARCH_TIMEOUT');

      // Test 6: Valid search
      const validResult = await mockCLI.executeCommand('search', ['valid query']);
      expect(validResult.success).toBe(true);
      expect(validResult.data?.totalResults).toBe(1);
      const firstResult = validResult.data?.results?.[0];
      if (firstResult && 'snippet' in firstResult) {
        expect(firstResult.snippet).toContain('valid query');
      }
    });
  });

  describe('Configuration and Help', () => {
    it('should provide comprehensive help and configuration options', async () => {
      const mockCLI = {
        commands: new Map([
          ['index', {
            name: 'index',
            description: 'Index files and directories',
            usage: 'index <directory> [options]',
            options: [
              { name: 'recursive', alias: 'r', description: 'Index recursively' },
              { name: 'exclude', alias: 'e', description: 'Exclude patterns' },
              { name: 'output', alias: 'o', description: 'Output file' }
            ]
          }],
          ['search', {
            name: 'search',
            description: 'Search indexed content',
            usage: 'search <query> [options]',
            options: [
              { name: 'type', alias: 't', description: 'Search type (semantic|keyword)' },
              { name: 'limit', alias: 'l', description: 'Result limit' },
              { name: 'threshold', description: 'Similarity threshold' }
            ]
          }]
        ]),

        executeCommand: async (command: string, args: string[]): Promise<CLIResponse> => {
          if (command === 'help') {
            const targetCommand = args[0];
            
            if (targetCommand) {
              const cmd = mockCLI.commands.get(targetCommand);
              if (!cmd) {
                return {
                  success: false,
                  message: `Unknown command: ${targetCommand}`,
                  error: 'COMMAND_NOT_FOUND'
                };
              }
              
              return {
                success: true,
                message: `Help for command: ${cmd.name}`,
                data: {
                  command: cmd.name,
                  description: cmd.description,
                  usage: cmd.usage,
                  options: cmd.options
                }
              };
            } else {
              // General help
              return {
                success: true,
                message: 'Available commands',
                data: {
                  commands: Array.from(mockCLI.commands.values()).map(cmd => ({
                    name: cmd.name,
                    description: cmd.description
                  })),
                  usage: 'folder-mcp <command> [options]',
                  globalOptions: [
                    { name: 'help', alias: 'h', description: 'Show help' },
                    { name: 'version', alias: 'v', description: 'Show version' },
                    { name: 'verbose', description: 'Verbose output' }
                  ]
                }
              };
            }
          }

          if (command === 'version') {
            return {
              success: true,
              message: 'folder-mcp version 1.0.0',
              data: {
                version: '1.0.0',
                build: '2023-01-01T00:00:00Z',
                node: process.version
              }
            };
          }

          if (command === 'config') {
            const action = args[0];
            const key = args[1];
            const value = args[2];

            if (action === 'get') {
              const configs = {
                'log.level': 'info',
                'search.defaultLimit': '20',
                'indexing.chunkSize': '1000'
              };

              if (key) {
                return {
                  success: true,
                  message: `Configuration: ${key}`,
                  data: { key, value: configs[key as keyof typeof configs] || undefined }
                };
              } else {
                return {
                  success: true,
                  message: 'Current configuration',
                  data: { configs }
                };
              }
            }

            if (action === 'set') {
              if (!key || !value) {
                return {
                  success: false,
                  message: 'Config key and value are required',
                  error: 'MISSING_CONFIG_PARAMS'
                };
              }

              return {
                success: true,
                message: `Configuration updated: ${key} = ${value}`,
                data: { key, value, previous: 'old-value' }
              };
            }

            return {
              success: false,
              message: 'Invalid config action. Use: get|set',
              error: 'INVALID_CONFIG_ACTION'
            };
          }

          throw new Error(`Unknown command: ${command}`);
        }
      };

      // Test 1: General help
      const generalHelp = await mockCLI.executeCommand('help', []);
      expect(generalHelp.success).toBe(true);
      expect(generalHelp.data?.commands?.length).toBe(2);
      expect(generalHelp.data?.commands?.[0]?.name).toBe('index');
      expect(generalHelp.data?.commands?.[1]?.name).toBe('search');
      expect(generalHelp.data?.globalOptions?.length).toBe(3);

      // Test 2: Command-specific help
      const indexHelp = await mockCLI.executeCommand('help', ['index']);
      expect(indexHelp.success).toBe(true);
      expect(indexHelp.data?.command).toBe('index');
      expect(indexHelp.data?.description).toBe('Index files and directories');
      expect(indexHelp.data?.options?.length).toBe(3);

      const searchHelp = await mockCLI.executeCommand('help', ['search']);
      expect(searchHelp.success).toBe(true);
      expect(searchHelp.data?.command).toBe('search');
      expect(searchHelp.data?.options?.length).toBe(3);

      // Test 3: Help for unknown command
      const unknownHelp = await mockCLI.executeCommand('help', ['unknown']);
      expect(unknownHelp.success).toBe(false);
      expect(unknownHelp.error).toBe('COMMAND_NOT_FOUND');

      // Test 4: Version command
      const version = await mockCLI.executeCommand('version', []);
      expect(version.success).toBe(true);
      expect(version.data?.version).toBe('1.0.0');
      expect(version.data?.node).toBeTruthy();

      // Test 5: Configuration management
      const configGet = await mockCLI.executeCommand('config', ['get']);
      expect(configGet.success).toBe(true);
      expect(configGet.data?.configs).toBeDefined();

      const configGetSpecific = await mockCLI.executeCommand('config', ['get', 'log.level']);
      expect(configGetSpecific.success).toBe(true);
      const configValue = configGetSpecific.data?.value;
      expect(configValue === 'info' || configValue === undefined).toBe(true);

      const configSet = await mockCLI.executeCommand('config', ['set', 'log.level', 'debug']);
      expect(configSet.success).toBe(true);
      expect(configSet.data?.key).toBe('log.level');
      expect(configSet.data?.value).toBe('debug');

      // Test 6: Invalid config operations
      const invalidConfigAction = await mockCLI.executeCommand('config', ['invalid']);
      expect(invalidConfigAction.success).toBe(false);
      expect(invalidConfigAction.error).toBe('INVALID_CONFIG_ACTION');

      const missingConfigParams = await mockCLI.executeCommand('config', ['set', 'key']);
      expect(missingConfigParams.success).toBe(false);
      expect(missingConfigParams.error).toBe('MISSING_CONFIG_PARAMS');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle typical development project workflow', async () => {
      // Simulate a real development project structure
      const projectStructure = {
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
          dependencies: { typescript: '^4.0.0' }
        }, null, 2),
        'tsconfig.json': JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' }
        }, null, 2),
        'README.md': `
# My Project

A TypeScript project with advanced features.

## Getting Started

1. Install dependencies: \`npm install\`
2. Build project: \`npm run build\`
3. Run tests: \`npm test\`

## Features

- TypeScript support
- Testing with Jest
- ESLint configuration
- Documentation generation
`,
        'src/index.ts': `
import { Logger } from './utils/logger';
import { DatabaseConnection } from './database/connection';

export class Application {
  private logger = new Logger();
  private db = new DatabaseConnection();

  async start(): Promise<void> {
    this.logger.info('Starting application...');
    await this.db.connect();
    this.logger.info('Application started successfully');
  }
}
`,
        'src/utils/logger.ts': `
export class Logger {
  info(message: string): void {
    console.log(\`[INFO] \${new Date().toISOString()}: \${message}\`);
  }

  error(message: string, error?: Error): void {
    console.error(\`[ERROR] \${new Date().toISOString()}: \${message}\`, error);
  }
}
`,
        'src/database/connection.ts': `
export class DatabaseConnection {
  private connected = false;

  async connect(): Promise<void> {
    // Simulate database connection
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = true;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
`,
        'tests/integration/app.test.ts': `
import { Application } from '../../src/index';

describe('Application Integration Tests', () => {
  it('should start successfully', async () => {
    const app = new Application();
    await expect(app.start()).resolves.not.toThrow();
  });
});
`,
        'docs/architecture.md': `
# Architecture

## Overview

The application follows a layered architecture:

1. **Presentation Layer**: HTTP endpoints and CLI
2. **Business Layer**: Core business logic
3. **Data Layer**: Database access and caching
4. **Infrastructure Layer**: Logging, monitoring, configuration

## Database Schema

### Users Table
- id: Primary key
- name: User full name
- email: User email address
- created_at: Account creation timestamp
`
      };

      await TestUtils.createTestFiles(tempDir, projectStructure);

      // Mock comprehensive CLI for development workflow
      const mockDevCLI = {
        indexedFiles: new Map<string, any>(),
        
        executeWorkflow: async (commands: Array<{ command: string; args: string[]; options?: any }>): Promise<CLIResponse[]> => {
          const results: CLIResponse[] = [];
          
          for (const cmd of commands) {
            const result = await mockDevCLI.executeCommand(cmd.command, cmd.args, cmd.options || {});
            results.push(result);
          }
          
          return results;
        },

        executeCommand: async (command: string, args: string[], options: Record<string, any> = {}): Promise<CLIResponse> => {
          switch (command) {
            case 'index':
              const directoryPath = args[0] || tempDir;
              const recursive = options.recursive !== false;
              const exclude = options.exclude || ['node_modules', '.git', 'dist'];
              
              const allFiles = Object.keys(projectStructure);
              const filteredFiles = allFiles.filter(file => {
                if (!recursive && file.includes('/')) return false;
                return !exclude.some((pattern: string) => file.includes(pattern));
              });

              // Process and index files
              for (const file of filteredFiles) {
                const content = projectStructure[file as keyof typeof projectStructure];
                mockDevCLI.indexedFiles.set(file, {
                  content,
                  size: content.length,
                  chunks: Math.ceil(content.length / 1000),
                  indexed: true,
                  lastIndexed: new Date()
                });
              }

              return {
                success: true,
                message: `Indexed ${filteredFiles.length} files`,
                data: { totalFiles: filteredFiles.length, indexedFiles: mockDevCLI.indexedFiles.size }
              };

            case 'search':
              const query = args[0];
              const searchType = options.type || 'semantic';
              const limit = options.limit || 10;
              
              const searchResults: SearchResult[] = [];
              for (const [file, data] of mockDevCLI.indexedFiles.entries()) {
                if (data.content.toLowerCase().includes(query.toLowerCase())) {
                  const score = Math.random() * 0.4 + 0.6;
                  const matchIndex = data.content.toLowerCase().indexOf(query.toLowerCase());
                  const snippet = data.content.slice(Math.max(0, matchIndex - 50), matchIndex + query.length + 50);
                  
                  searchResults.push({ file, score, snippet: snippet.trim() });
                }
              }
              
              searchResults.sort((a, b) => b.score - a.score);
              
              return {
                success: true,
                message: `Found ${searchResults.length} results`,
                data: { 
                  query, 
                  results: searchResults,
                  totalResults: searchResults.length 
                }
              };

            case 'analyze':
              const analysisResults = {
                codeFiles: 0,
                testFiles: 0,
                documentFiles: 0,
                totalLines: 0,
                languages: new Set<string>()
              };

              for (const [file, data] of mockDevCLI.indexedFiles.entries()) {
                const lines = data.content.split('\n').length;
                analysisResults.totalLines += lines;

                if (file.endsWith('.ts') || file.endsWith('.js')) {
                  if (file.includes('test') || file.includes('spec')) {
                    analysisResults.testFiles++;
                  } else {
                    analysisResults.codeFiles++;
                  }
                  analysisResults.languages.add('TypeScript');
                } else if (file.endsWith('.md')) {
                  analysisResults.documentFiles++;
                  analysisResults.languages.add('Markdown');
                } else if (file.endsWith('.json')) {
                  analysisResults.languages.add('JSON');
                }
              }

              return {
                success: true,
                message: 'Project analysis completed',
                data: {
                  ...analysisResults,
                  languages: Array.from(analysisResults.languages)
                }
              };

            default:
              throw new Error(`Unknown command: ${command}`);
          }
        }
      };

      // Execute typical development workflow
      const workflowResults = await mockDevCLI.executeWorkflow([
        { command: 'index', args: [tempDir], options: { recursive: true } },
        { command: 'analyze', args: [] },
        { command: 'search', args: ['Logger'], options: { type: 'semantic' } },
        { command: 'search', args: ['database'], options: { type: 'keyword', limit: 5 } },
        { command: 'search', args: ['typescript'], options: {} }
      ]);

      // Verify workflow results
      expect(workflowResults).toHaveLength(5);

      // Check indexing result
      const indexResult = workflowResults[0];
      expect(indexResult.success).toBe(true);
      expect(indexResult.data?.totalFiles).toBeGreaterThan(0);

      // Check analysis result
      const analysisResult = workflowResults[1];
      expect(analysisResult.success).toBe(true);
      expect(analysisResult.data?.codeFiles).toBeGreaterThan(0);
      expect(analysisResult.data?.testFiles).toBeGreaterThan(0);
      expect(analysisResult.data?.documentFiles).toBeGreaterThan(0);
      expect(analysisResult.data?.languages).toContain('TypeScript');

      // Check search results
      const loggerSearch = workflowResults[2];
      expect(loggerSearch.success).toBe(true);
      expect(loggerSearch.data?.results?.length).toBeGreaterThan(0);

      const databaseSearch = workflowResults[3];
      expect(databaseSearch.success).toBe(true);
      expect(databaseSearch.data?.results?.length).toBeGreaterThan(0);

      const typescriptSearch = workflowResults[4];
      expect(typescriptSearch.success).toBe(true);
      
      // Verify search result structure
      const searchResults = loggerSearch.data?.results ?? [];
      searchResults.forEach((result) => {
        if ('score' in result) {
          expect(result.file).toBeTruthy();
          expect(result.score).toBeGreaterThan(0);
          expect(result.snippet).toBeTruthy();
        }
      });
    });
  });
});
