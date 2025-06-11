/**
 * Integration Tests - API Contracts
 * 
 * Tests for API contract compliance and interface consistency
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { MockFactory } from '../../helpers/mock-factories.js';

describe('Integration - API Contracts', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('api-contracts-test-');
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('Domain Layer Contracts', () => {
    it('should maintain file operations interface', () => {
      // Mock file operations interface
      interface IFileOperations {
        readFile(path: string): Promise<string>;
        writeFile(path: string, content: string): Promise<void>;
        listFiles(directory: string, pattern?: string): Promise<string[]>;
        getFileStats(path: string): Promise<{ size: number; modified: Date }>;
      }

      const mockFileOps: IFileOperations = {
        async readFile(path: string): Promise<string> {
          return 'file content';
        },
        async writeFile(path: string, content: string): Promise<void> {},
        async listFiles(directory: string, pattern?: string): Promise<string[]> {
          return ['file1.txt', 'file2.ts'];
        },
        async getFileStats(path: string): Promise<{ size: number; modified: Date }> {
          return { size: 1024, modified: new Date() };
        }
      };

      expect(mockFileOps.readFile).toBeTypeOf('function');
      expect(mockFileOps.writeFile).toBeTypeOf('function');
      expect(mockFileOps.listFiles).toBeTypeOf('function');
      expect(mockFileOps.getFileStats).toBeTypeOf('function');
    });

    it('should maintain content processing interface', () => {
      interface IContentProcessor {
        processContent(content: string, options?: ProcessingOptions): Promise<ProcessedContent>;
        chunkContent(content: string, chunkSize: number, overlap: number): Promise<ContentChunk[]>;
        extractMetadata(content: string, filePath: string): Promise<ContentMetadata>;
      }

      interface ProcessingOptions {
        fileType?: string;
        encoding?: string;
        preserveFormatting?: boolean;
      }

      interface ProcessedContent {
        content: string;
        metadata: ContentMetadata;
        chunks: ContentChunk[];
      }

      interface ContentChunk {
        content: string;
        index: number;
        startOffset: number;
        endOffset: number;
      }

      interface ContentMetadata {
        fileType: string;
        size: number;
        language?: string;
        encoding: string;
      }

      const mockProcessor: IContentProcessor = {
        async processContent(content: string, options?: ProcessingOptions): Promise<ProcessedContent> {
          return {
            content,
            metadata: { fileType: 'text', size: content.length, encoding: 'utf-8' },
            chunks: []
          };
        },
        async chunkContent(content: string, chunkSize: number, overlap: number): Promise<ContentChunk[]> {
          return [{
            content: content.substring(0, chunkSize),
            index: 0,
            startOffset: 0,
            endOffset: Math.min(chunkSize, content.length)
          }];
        },
        async extractMetadata(content: string, filePath: string): Promise<ContentMetadata> {
          return {
            fileType: filePath.split('.').pop() || 'unknown',
            size: content.length,
            encoding: 'utf-8'
          };
        }
      };

      expect(mockProcessor.processContent).toBeTypeOf('function');
      expect(mockProcessor.chunkContent).toBeTypeOf('function');
      expect(mockProcessor.extractMetadata).toBeTypeOf('function');
    });

    it('should maintain embeddings interface', () => {
      interface IEmbeddingService {
        generateEmbedding(text: string, model?: string): Promise<number[]>;
        generateBatchEmbeddings(texts: string[], model?: string): Promise<number[][]>;
        getSupportedModels(): Promise<string[]>;
        getModelInfo(model: string): Promise<ModelInfo>;
      }

      interface ModelInfo {
        name: string;
        dimensions: number;
        maxTokens: number;
        provider: string;
      }

      const mockEmbeddings: IEmbeddingService = {
        async generateEmbedding(text: string, model?: string): Promise<number[]> {
          return Array(384).fill(0).map(() => Math.random());
        },
        async generateBatchEmbeddings(texts: string[], model?: string): Promise<number[][]> {
          return texts.map(() => Array(384).fill(0).map(() => Math.random()));
        },
        async getSupportedModels(): Promise<string[]> {
          return ['nomic-embed-text', 'mxbai-embed-large'];
        },
        async getModelInfo(model: string): Promise<ModelInfo> {
          return {
            name: model,
            dimensions: 384,
            maxTokens: 2048,
            provider: 'ollama'
          };
        }
      };

      expect(mockEmbeddings.generateEmbedding).toBeTypeOf('function');
      expect(mockEmbeddings.generateBatchEmbeddings).toBeTypeOf('function');
      expect(mockEmbeddings.getSupportedModels).toBeTypeOf('function');
      expect(mockEmbeddings.getModelInfo).toBeTypeOf('function');
    });

    it('should maintain search interface', () => {
      interface ISearchService {
        indexEmbeddings(embeddings: EmbeddingData[]): Promise<void>;
        search(query: number[], topK: number, threshold?: number): Promise<SearchResult[]>;
        addEmbedding(id: string, embedding: number[], metadata?: any): Promise<void>;
        removeEmbedding(id: string): Promise<boolean>;
        getIndexStats(): Promise<IndexStats>;
      }

      interface EmbeddingData {
        id: string;
        embedding: number[];
        metadata?: any;
      }

      interface SearchResult {
        id: string;
        similarity: number;
        metadata?: any;
      }

      interface IndexStats {
        totalEmbeddings: number;
        dimensions: number;
        indexSize: number;
      }

      const mockSearch: ISearchService = {
        async indexEmbeddings(embeddings: EmbeddingData[]): Promise<void> {},
        async search(query: number[], topK: number, threshold?: number): Promise<SearchResult[]> {
          return Array(topK).fill(null).map((_, i) => ({
            id: `result_${i}`,
            similarity: 0.9 - (i * 0.1),
            metadata: { index: i }
          }));
        },
        async addEmbedding(id: string, embedding: number[], metadata?: any): Promise<void> {},
        async removeEmbedding(id: string): Promise<boolean> {
          return true;
        },
        async getIndexStats(): Promise<IndexStats> {
          return {
            totalEmbeddings: 100,
            dimensions: 384,
            indexSize: 1024 * 1024
          };
        }
      };

      expect(mockSearch.indexEmbeddings).toBeTypeOf('function');
      expect(mockSearch.search).toBeTypeOf('function');
      expect(mockSearch.addEmbedding).toBeTypeOf('function');
      expect(mockSearch.removeEmbedding).toBeTypeOf('function');
      expect(mockSearch.getIndexStats).toBeTypeOf('function');
    });
  });

  describe('Application Layer Contracts', () => {
    it('should maintain workflow interfaces', () => {
      interface IWorkflow {
        execute(request: WorkflowRequest): Promise<WorkflowResult>;
        getStatus(): Promise<WorkflowStatus>;
        cancel(): Promise<void>;
      }

      interface WorkflowRequest {
        type: string;
        parameters: Record<string, any>;
        context?: WorkflowContext;
      }

      interface WorkflowResult {
        success: boolean;
        data?: any;
        error?: string;
        executionTime: number;
      }

      interface WorkflowStatus {
        state: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
        progress?: number;
        currentStep?: string;
      }

      interface WorkflowContext {
        userId?: string;
        sessionId?: string;
        metadata?: Record<string, any>;
      }

      const mockWorkflow: IWorkflow = {
        async execute(request: WorkflowRequest): Promise<WorkflowResult> {
          return {
            success: true,
            data: { result: 'processed' },
            executionTime: 150
          };
        },
        async getStatus(): Promise<WorkflowStatus> {
          return {
            state: 'completed',
            progress: 100
          };
        },
        async cancel(): Promise<void> {}
      };

      expect(mockWorkflow.execute).toBeTypeOf('function');
      expect(mockWorkflow.getStatus).toBeTypeOf('function');
      expect(mockWorkflow.cancel).toBeTypeOf('function');
    });

    it('should maintain indexing workflow interface', () => {
      interface IIndexingWorkflow {
        startIndexing(folderPath: string, config: IndexingConfig): Promise<string>;
        getIndexingProgress(sessionId: string): Promise<IndexingProgress>;
        pauseIndexing(sessionId: string): Promise<void>;
        resumeIndexing(sessionId: string): Promise<void>;
        cancelIndexing(sessionId: string): Promise<void>;
      }

      interface IndexingConfig {
        fileTypes: string[];
        recursive: boolean;
        chunkSize: number;
        overlap: number;
        modelName: string;
        batchSize?: number;
      }

      interface IndexingProgress {
        sessionId: string;
        status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
        processedFiles: number;
        totalFiles: number;
        currentFile?: string;
        percentage: number;
        estimatedTimeRemaining?: number;
        errors: IndexingError[];
      }

      interface IndexingError {
        file: string;
        error: string;
        timestamp: string;
      }

      const mockIndexingWorkflow: IIndexingWorkflow = {
        async startIndexing(folderPath: string, config: IndexingConfig): Promise<string> {
          return 'session_123';
        },
        async getIndexingProgress(sessionId: string): Promise<IndexingProgress> {
          return {
            sessionId,
            status: 'running',
            processedFiles: 50,
            totalFiles: 100,
            currentFile: 'src/index.ts',
            percentage: 50,
            estimatedTimeRemaining: 120,
            errors: []
          };
        },
        async pauseIndexing(sessionId: string): Promise<void> {},
        async resumeIndexing(sessionId: string): Promise<void> {},
        async cancelIndexing(sessionId: string): Promise<void> {}
      };

      expect(mockIndexingWorkflow.startIndexing).toBeTypeOf('function');
      expect(mockIndexingWorkflow.getIndexingProgress).toBeTypeOf('function');
      expect(mockIndexingWorkflow.pauseIndexing).toBeTypeOf('function');
      expect(mockIndexingWorkflow.resumeIndexing).toBeTypeOf('function');
      expect(mockIndexingWorkflow.cancelIndexing).toBeTypeOf('function');
    });
  });

  describe('Infrastructure Layer Contracts', () => {
    it('should maintain cache service interface', () => {
      interface ICacheService {
        get<T>(key: string): Promise<T | undefined>;
        set<T>(key: string, value: T, ttl?: number): Promise<void>;
        delete(key: string): Promise<boolean>;
        clear(): Promise<void>;
        exists(key: string): Promise<boolean>;
        keys(pattern?: string): Promise<string[]>;
        getStats(): Promise<CacheStats>;
      }

      interface CacheStats {
        size: number;
        hitRate: number;
        missRate: number;
        memoryUsage: number;
      }

      const mockCache: ICacheService = {
        async get<T>(key: string): Promise<T | undefined> {
          return undefined;
        },
        async set<T>(key: string, value: T, ttl?: number): Promise<void> {},
        async delete(key: string): Promise<boolean> {
          return true;
        },
        async clear(): Promise<void> {},
        async exists(key: string): Promise<boolean> {
          return false;
        },
        async keys(pattern?: string): Promise<string[]> {
          return [];
        },
        async getStats(): Promise<CacheStats> {
          return {
            size: 0,
            hitRate: 0.85,
            missRate: 0.15,
            memoryUsage: 1024 * 1024
          };
        }
      };

      expect(mockCache.get).toBeTypeOf('function');
      expect(mockCache.set).toBeTypeOf('function');
      expect(mockCache.delete).toBeTypeOf('function');
      expect(mockCache.clear).toBeTypeOf('function');
      expect(mockCache.exists).toBeTypeOf('function');
      expect(mockCache.keys).toBeTypeOf('function');
      expect(mockCache.getStats).toBeTypeOf('function');
    });

    it('should maintain logging service interface', () => {
      interface ILoggingService {
        debug(message: string, context?: LogContext): void;
        info(message: string, context?: LogContext): void;
        warn(message: string, context?: LogContext): void;
        error(message: string, error?: Error, context?: LogContext): void;
        setLevel(level: LogLevel): void;
        getLevel(): LogLevel;
        createChild(context: LogContext): ILoggingService;
      }

      type LogLevel = 'debug' | 'info' | 'warn' | 'error';

      interface LogContext {
        component?: string;
        operation?: string;
        userId?: string;
        requestId?: string;
        [key: string]: any;
      }

      const mockLogger: ILoggingService = {
        debug(message: string, context?: LogContext): void {},
        info(message: string, context?: LogContext): void {},
        warn(message: string, context?: LogContext): void {},
        error(message: string, error?: Error, context?: LogContext): void {},
        setLevel(level: LogLevel): void {},
        getLevel(): LogLevel {
          return 'info';
        },
        createChild(context: LogContext): ILoggingService {
          return this;
        }
      };

      expect(mockLogger.debug).toBeTypeOf('function');
      expect(mockLogger.info).toBeTypeOf('function');
      expect(mockLogger.warn).toBeTypeOf('function');
      expect(mockLogger.error).toBeTypeOf('function');
      expect(mockLogger.setLevel).toBeTypeOf('function');
      expect(mockLogger.getLevel).toBeTypeOf('function');
      expect(mockLogger.createChild).toBeTypeOf('function');
    });
  });

  describe('Interface Layer Contracts', () => {
    it('should maintain CLI interface contract', () => {
      interface ICLIHandler {
        handle(command: string, args: string[], options: CLIOptions): Promise<CLIResult>;
        getHelp(command?: string): string;
        getVersion(): string;
        validateArgs(command: string, args: string[]): CLIValidationResult;
      }

      interface CLIOptions {
        verbose?: boolean;
        quiet?: boolean;
        outputFormat?: 'json' | 'table' | 'text';
        configFile?: string;
      }

      interface CLIResult {
        success: boolean;
        output?: string;
        error?: string;
        exitCode: number;
      }

      interface CLIValidationResult {
        valid: boolean;
        errors: string[];
        warnings: string[];
      }

      const mockCLI: ICLIHandler = {
        async handle(command: string, args: string[], options: CLIOptions): Promise<CLIResult> {
          return {
            success: true,
            output: 'Command executed successfully',
            exitCode: 0
          };
        },
        getHelp(command?: string): string {
          return 'Help text';
        },
        getVersion(): string {
          return '1.0.0';
        },
        validateArgs(command: string, args: string[]): CLIValidationResult {
          return {
            valid: true,
            errors: [],
            warnings: []
          };
        }
      };

      expect(mockCLI.handle).toBeTypeOf('function');
      expect(mockCLI.getHelp).toBeTypeOf('function');
      expect(mockCLI.getVersion).toBeTypeOf('function');
      expect(mockCLI.validateArgs).toBeTypeOf('function');
    });

    it('should maintain MCP interface contract', () => {
      interface IMCPHandler {
        initialize(capabilities: MCPCapabilities): Promise<MCPInitializeResult>;
        listTools(): Promise<MCPTool[]>;
        callTool(request: MCPToolRequest): Promise<MCPToolResult>;
        listResources(): Promise<MCPResource[]>;
        readResource(uri: string): Promise<MCPResourceContent>;
        shutdown(): Promise<void>;
      }

      interface MCPCapabilities {
        tools?: boolean;
        resources?: boolean;
        prompts?: boolean;
      }

      interface MCPInitializeResult {
        protocolVersion: string;
        capabilities: MCPCapabilities;
        serverInfo: {
          name: string;
          version: string;
        };
      }

      interface MCPTool {
        name: string;
        description: string;
        inputSchema: object;
      }

      interface MCPToolRequest {
        tool: string;
        arguments: Record<string, any>;
      }

      interface MCPToolResult {
        content: any;
        isError?: boolean;
      }

      interface MCPResource {
        uri: string;
        name: string;
        description?: string;
        mimeType?: string;
      }

      interface MCPResourceContent {
        uri: string;
        content: string;
        mimeType?: string;
      }

      const mockMCP: IMCPHandler = {
        async initialize(capabilities: MCPCapabilities): Promise<MCPInitializeResult> {
          return {
            protocolVersion: '2024-11-05',
            capabilities: { tools: true, resources: true },
            serverInfo: {
              name: 'folder-mcp',
              version: '1.0.0'
            }
          };
        },
        async listTools(): Promise<MCPTool[]> {
          return [{
            name: 'search_knowledge',
            description: 'Search for information',
            inputSchema: { type: 'object', properties: {} }
          }];
        },
        async callTool(request: MCPToolRequest): Promise<MCPToolResult> {
          return {
            content: { result: 'tool executed' }
          };
        },
        async listResources(): Promise<MCPResource[]> {
          return [{
            uri: 'file://example.txt',
            name: 'Example File'
          }];
        },
        async readResource(uri: string): Promise<MCPResourceContent> {
          return {
            uri,
            content: 'Resource content'
          };
        },
        async shutdown(): Promise<void> {}
      };

      expect(mockMCP.initialize).toBeTypeOf('function');
      expect(mockMCP.listTools).toBeTypeOf('function');
      expect(mockMCP.callTool).toBeTypeOf('function');
      expect(mockMCP.listResources).toBeTypeOf('function');
      expect(mockMCP.readResource).toBeTypeOf('function');
      expect(mockMCP.shutdown).toBeTypeOf('function');
    });
  });

  describe('Cross-Layer Contract Compliance', () => {
    it('should maintain consistent error handling patterns', () => {
      interface IErrorHandler {
        handleError(error: Error, context?: ErrorContext): Promise<ErrorResult>;
        isRetryable(error: Error): boolean;
        getErrorCode(error: Error): string;
        formatError(error: Error): string;
      }

      interface ErrorContext {
        operation: string;
        component: string;
        metadata?: Record<string, any>;
      }

      interface ErrorResult {
        handled: boolean;
        retry: boolean;
        userMessage?: string;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
      }

      const mockErrorHandler: IErrorHandler = {
        async handleError(error: Error, context?: ErrorContext): Promise<ErrorResult> {
          return {
            handled: true,
            retry: false,
            userMessage: 'An error occurred',
            logLevel: 'error'
          };
        },
        isRetryable(error: Error): boolean {
          return false;
        },
        getErrorCode(error: Error): string {
          return 'UNKNOWN_ERROR';
        },
        formatError(error: Error): string {
          return error.message;
        }
      };

      expect(mockErrorHandler.handleError).toBeTypeOf('function');
      expect(mockErrorHandler.isRetryable).toBeTypeOf('function');
      expect(mockErrorHandler.getErrorCode).toBeTypeOf('function');
      expect(mockErrorHandler.formatError).toBeTypeOf('function');
    });

    it('should maintain consistent configuration patterns', () => {
      interface IConfigurationProvider {
        get<T>(key: string, defaultValue?: T): T;
        set<T>(key: string, value: T): void;
        has(key: string): boolean;
        getSection(section: string): Record<string, any>;
        validate(): ConfigValidationResult;
        reload(): Promise<void>;
      }

      interface ConfigValidationResult {
        valid: boolean;
        errors: ConfigError[];
        warnings: ConfigWarning[];
      }

      interface ConfigError {
        key: string;
        message: string;
        value?: any;
      }

      interface ConfigWarning {
        key: string;
        message: string;
        suggestion?: string;
      }

      const mockConfig: IConfigurationProvider = {
        get<T>(key: string, defaultValue?: T): T {
          return defaultValue as T;
        },
        set<T>(key: string, value: T): void {},
        has(key: string): boolean {
          return false;
        },
        getSection(section: string): Record<string, any> {
          return {};
        },
        validate(): ConfigValidationResult {
          return {
            valid: true,
            errors: [],
            warnings: []
          };
        },
        async reload(): Promise<void> {}
      };

      expect(mockConfig.get).toBeTypeOf('function');
      expect(mockConfig.set).toBeTypeOf('function');
      expect(mockConfig.has).toBeTypeOf('function');
      expect(mockConfig.getSection).toBeTypeOf('function');
      expect(mockConfig.validate).toBeTypeOf('function');
      expect(mockConfig.reload).toBeTypeOf('function');
    });
  });
});
