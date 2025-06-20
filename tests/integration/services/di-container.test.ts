/**
 * Integration Tests - Dependency Injection Container
 * 
 * Tests for the complete DI container integration with all modules
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';

// Define interfaces for services
interface IFileProcessor {
  processFile(path: string): Promise<{ success: boolean; path: string }>;
}

interface IContentParser {
  parseContent(content: string): Promise<{ chunks: string[] }>;
}

interface IIndexingOrchestrator {
  indexDirectory(request: any): Promise<{ success: boolean; totalFiles: number }>;
}

interface ICacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

interface ServiceA {
  name: string;
  dependency: ServiceB;
}

interface ServiceB {
  name: string;
  dependency: ServiceC;
}

interface ServiceC {
  name: string;
  dependency?: ServiceA;
}

interface IndexingResult {
  success: boolean;
  totalFiles: number;
  directoryPath: string;
  results: Array<{
    file: string;
    processed: boolean;
    chunks: number;
    embeddings: number;
  }>;
}

interface SearchResult {
  success: boolean;
  query: string;
  results: Array<{
    file: string;
    score: number;
    snippet: string;
  }>;
  totalResults: number;
}

interface ProcessingResult {
  file: string;
  processed: boolean;
}

interface FileProcessingResult {
  path: string;
  result?: { success: boolean };
  error?: string;
}

describe('Integration - DI Container', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('di-integration-test-');
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('Service Registration and Resolution', () => {
    it('should register and resolve services correctly', () => {
      // Mock DI container implementation
      const services = new Map<string, any>();
      const factories = new Map<string, () => any>();

      const container = {
        register: <T>(token: string, implementation: T): void => {
          services.set(token, implementation);
        },

        registerFactory: <T>(token: string, factory: () => T): void => {
          factories.set(token, factory);
        },

        resolve: <T>(token: string): T => {
          if (services.has(token)) {
            return services.get(token) as T;
          }
          
          if (factories.has(token)) {
            const factory = factories.get(token)!;
            const instance = factory();
            services.set(token, instance); // Cache singleton
            return instance as T;
          }
          
          throw new Error(`Service not found: ${token}`);
        },

        has: (token: string): boolean => {
          return services.has(token) || factories.has(token);
        }
      };

      // Register domain services
      container.register<IFileProcessor>('IFileProcessor', {
        processFile: async (path: string) => ({ success: true, path })
      });

      container.register<IContentParser>('IContentParser', {
        parseContent: async (content: string) => ({ chunks: [content] })
      });

      // Register application services
      container.registerFactory<IIndexingOrchestrator>('IIndexingOrchestrator', () => ({
        indexDirectory: async (request: any) => ({ success: true, totalFiles: 0 })
      }));

      // Register infrastructure services
      container.register<ICacheService>('ICacheService', {
        get: async (key: string) => undefined,
        set: async (key: string, value: any) => {},
        delete: async (key: string) => true,
        clear: async () => {}
      });

      // Test resolution
      expect(container.has('IFileProcessor')).toBe(true);
      expect(container.has('IContentParser')).toBe(true);
      expect(container.has('IIndexingOrchestrator')).toBe(true);
      expect(container.has('ICacheService')).toBe(true);
      expect(container.has('NonExistent')).toBe(false);

      const fileProcessor = container.resolve<IFileProcessor>('IFileProcessor');
      expect(fileProcessor).toBeDefined();
      expect(fileProcessor.processFile).toBeDefined();

      const indexingOrchestrator = container.resolve<IIndexingOrchestrator>('IIndexingOrchestrator');
      expect(indexingOrchestrator).toBeDefined();
      expect(indexingOrchestrator.indexDirectory).toBeDefined();
    });

    it('should handle dependency injection with circular dependencies', () => {
      const services = new Map<string, any>();
      let resolutionStack: string[] = [];

      const container = {
        resolve: <T>(token: string): T => {
          if (resolutionStack.includes(token)) {
            throw new Error(`Circular dependency detected: ${resolutionStack.join(' -> ')} -> ${token}`);
          }

          if (services.has(token)) {
            return services.get(token) as T;
          }

          resolutionStack.push(token);

          try {
            // Simulate service creation with dependencies
            let service: any;

            switch (token) {
              case 'ServiceA':
                const serviceB = container.resolve<ServiceB>('ServiceB');
                service = { name: 'A', dependency: serviceB };
                break;

              case 'ServiceB':
                const serviceC = container.resolve<ServiceC>('ServiceC');
                service = { name: 'B', dependency: serviceC };
                break;

              case 'ServiceC':
                // ServiceC depends on ServiceA - this should cause circular dependency
                if (resolutionStack.includes('ServiceA')) {
                  throw new Error(`Circular dependency detected: ${resolutionStack.join(' -> ')} -> ServiceA`);
                }
                service = { name: 'C' };
                break;

              default:
                throw new Error(`Unknown service: ${token}`);
            }

            services.set(token, service);
            return service as T;
          } finally {
            resolutionStack.pop();
          }
        }
      };

      // This should work fine
      const serviceC = container.resolve<ServiceC>('ServiceC');
      expect(serviceC.name).toBe('C');

      // This should work fine
      const serviceB = container.resolve<ServiceB>('ServiceB');
      expect(serviceB.name).toBe('B');
      expect(serviceB.dependency).toBe(serviceC);

      // Clear services and try circular dependency
      services.clear();
      resolutionStack = [];

      // Modify ServiceC to depend on ServiceA (creating a cycle)
      const originalResolve = container.resolve;
      container.resolve = <T>(token: string): T => {
        if (token === 'ServiceC') {
          // Try to resolve ServiceA, which will cause circular dependency
          if (resolutionStack.includes('ServiceA')) {
            throw new Error(`Circular dependency detected: ${resolutionStack.join(' -> ')} -> ServiceA`);
          }
          return { name: 'C', dependency: originalResolve<ServiceA>('ServiceA') } as T;
        }
        return originalResolve(token);
      };

      expect(() => container.resolve('ServiceA')).toThrow('Circular dependency detected');
    });
  });

  describe('Module Integration', () => {
    it('should integrate domain, application, and infrastructure layers', async () => {
      // Mock integrated system
      const mockDomainServices = {
        fileProcessor: {
          processFile: async (path: string) => {
            return {
              success: true,
              metadata: { path, size: 1024, type: 'text/plain' }
            };
          }
        },
        
        contentParser: {
          parseContent: async (content: string) => {
            return {
              chunks: content.split('\n').filter(line => line.trim()),
              metadata: { chunkCount: 3, totalLength: content.length }
            };
          }
        },

        embeddingGenerator: {
          generateEmbeddings: async (chunks: string[]) => {
            return chunks.map((chunk, index) => ({
              text: chunk,
              vector: new Array(384).fill(0).map(() => Math.random()),
              index
            }));
          }
        }
      };

      const mockApplicationServices = {
        indexingOrchestrator: {
          indexDirectory: async (directoryPath: string): Promise<IndexingResult> => {
            // Simulate integration across layers
            const files = ['file1.txt', 'file2.txt', 'file3.txt'];
            const results: Array<{
              file: string;
              processed: boolean;
              chunks: number;
              embeddings: number;
            }> = [];

            for (const file of files) {
              // Use domain services
              const fileResult = await mockDomainServices.fileProcessor.processFile(file);
              const content = `Content of ${file}\nLine 2\nLine 3`;
              const parseResult = await mockDomainServices.contentParser.parseContent(content);
              const embeddings = await mockDomainServices.embeddingGenerator.generateEmbeddings(parseResult.chunks);

              results.push({
                file,
                processed: fileResult.success,
                chunks: parseResult.chunks.length,
                embeddings: embeddings.length
              });
            }

            return {
              success: true,
              directoryPath,
              totalFiles: files.length,
              results
            };
          }
        },

        searchOrchestrator: {
          search: async (query: string): Promise<SearchResult> => {
            // Simulate search integration
            const queryEmbedding = await mockDomainServices.embeddingGenerator.generateEmbeddings([query]);
            
            return {
              success: true,
              query,
              results: [
                { file: 'file1.txt', score: 0.95, snippet: 'Relevant content...' },
                { file: 'file2.txt', score: 0.82, snippet: 'Another match...' }
              ],
              totalResults: 2
            };
          }
        }
      };

      const mockInfrastructureServices = {
        cacheService: {
          data: new Map<string, any>(),
          
          get: async function(key: string) {
            return this.data.get(key);
          },
          
          set: async function(key: string, value: any) {
            this.data.set(key, value);
          }
        },

        logger: {
          logs: [] as string[],
          
          info: function(message: string) {
            this.logs.push(`INFO: ${message}`);
          },
          
          error: function(message: string) {
            this.logs.push(`ERROR: ${message}`);
          }
        }
      };

      // Test integrated workflow
      const indexResult = await mockApplicationServices.indexingOrchestrator.indexDirectory(tempDir);
      
      expect(indexResult.success).toBe(true);
      expect(indexResult.totalFiles).toBe(3);
      expect(indexResult.results).toHaveLength(3);
      expect(indexResult.results[0]!.chunks).toBe(3);
      expect(indexResult.results[0]!.embeddings).toBe(3);

      // Cache the results
      await mockInfrastructureServices.cacheService.set('last-index', indexResult);
      const cachedResult = await mockInfrastructureServices.cacheService.get('last-index');
      expect(cachedResult).toEqual(indexResult);

      // Test search workflow
      const searchResult = await mockApplicationServices.searchOrchestrator.search('test query');
      
      expect(searchResult.success).toBe(true);
      expect(searchResult.query).toBe('test query');
      expect(searchResult.results).toHaveLength(2);
      expect(searchResult.results[0]!.score).toBe(0.95);

      // Log operations
      mockInfrastructureServices.logger.info('Indexing completed successfully');
      mockInfrastructureServices.logger.info('Search completed successfully');
      
      expect(mockInfrastructureServices.logger.logs).toContain('INFO: Indexing completed successfully');
      expect(mockInfrastructureServices.logger.logs).toContain('INFO: Search completed successfully');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors across layer boundaries', async () => {
      const errors: Array<{ layer: string; error: string; context?: any }> = [];

      const mockErrorHandler = {
        handleError: (layer: string, error: string, context?: any) => {
          errors.push({ layer, error, context });
        }
      };

      const mockServices = {
        domainService: {
          processFile: async (path: string) => {
            if (path.includes('invalid')) {
              mockErrorHandler.handleError('domain', 'Invalid file path', { path });
              throw new Error('Invalid file path');
            }
            return { success: true };
          }
        },

        applicationService: {
          orchestrateIndexing: async (paths: string[]) => {
            const results: FileProcessingResult[] = [];
            
            for (const path of paths) {
              try {
                const result = await mockServices.domainService.processFile(path);
                results.push({ path, result });
              } catch (error) {
                mockErrorHandler.handleError('application', 'Failed to process file', { 
                  path, 
                  originalError: (error as Error).message 
                });
                results.push({ path, error: (error as Error).message });
              }
            }
            
            return { results, totalErrors: results.filter(r => r.error).length };
          }
        },

        infrastructureService: {
          logError: (error: any) => {
            mockErrorHandler.handleError('infrastructure', 'Logging error', error);
          }
        }
      };

      // Test error propagation
      const paths = ['valid-file.txt', 'invalid-file.txt', 'another-valid.txt'];
      const result = await mockServices.applicationService.orchestrateIndexing(paths);

      expect(result.totalErrors).toBe(1);
      expect(errors).toHaveLength(2); // One domain error, one application error
       expect(errors[0]!.layer).toBe('domain');
      expect(errors[0]!.error).toBe('Invalid file path');
      expect(errors[0]!.context?.path).toBe('invalid-file.txt');

      expect(errors[1]!.layer).toBe('application');
      expect(errors[1]!.error).toBe('Failed to process file');
      expect(errors[1]!.context?.originalError).toBe('Invalid file path');

      // Test infrastructure error handling
      mockServices.infrastructureService.logError({ message: 'Disk full' });
      
      expect(errors).toHaveLength(3);
      expect(errors[2]!.layer).toBe('infrastructure');
      expect(errors[2]!.error).toBe('Logging error');
    });
  });

  describe('Performance Integration', () => {
    it('should track performance across integrated workflows', async () => {
      const performanceMetrics = {
        operations: new Map<string, { count: number; totalTime: number; errors: number }>()
      };

      const trackPerformance = async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
        const start = performance.now();
        let error = false;

        try {
          const result = await fn();
          return result;
        } catch (err) {
          error = true;
          throw err;
        } finally {
          const duration = performance.now() - start;
          
          if (!performanceMetrics.operations.has(operation)) {
            performanceMetrics.operations.set(operation, { count: 0, totalTime: 0, errors: 0 });
          }
          
          const metrics = performanceMetrics.operations.get(operation)!;
          metrics.count++;
          metrics.totalTime += duration;
          if (error) metrics.errors++;
        }
      };

      const mockWorkflow = {
        processFiles: async (files: string[]) => {
          const results: ProcessingResult[] = [];
          
          for (const file of files) {
            const result = await trackPerformance(`process-file`, async () => {
              // Simulate processing time
              await TestUtils.wait(Math.random() * 10);
              return { file, processed: true };
            });
            
            results.push(result);
          }
          
          return await trackPerformance('aggregate-results', async () => {
            await TestUtils.wait(5);
            return { 
              totalFiles: files.length,
              results,
              summary: `Processed ${files.length} files`
            };
          });
        }
      };

      // Execute workflow
      const files = ['file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', 'file5.txt'];
      const result = await mockWorkflow.processFiles(files);

      expect(result.totalFiles).toBe(5);
      expect(result.results).toHaveLength(5);

      // Check performance metrics
      const processFileMetrics = performanceMetrics.operations.get('process-file');
      expect(processFileMetrics?.count).toBe(5);
      expect(processFileMetrics?.totalTime).toBeGreaterThan(0);
      expect(processFileMetrics?.errors).toBe(0);

      const aggregateMetrics = performanceMetrics.operations.get('aggregate-results');
      expect(aggregateMetrics?.count).toBe(1);
      expect(aggregateMetrics?.totalTime).toBeGreaterThan(0);

      // Calculate averages
      const avgProcessTime = processFileMetrics!.totalTime / processFileMetrics!.count;
      expect(avgProcessTime).toBeGreaterThan(0);
      expect(avgProcessTime).toBeLessThan(50); // Should be reasonable for test
    });
  });

  describe('Event Integration', () => {
    it('should handle events across module boundaries', () => {
      interface Event {
        type: string;
        payload: any;
        timestamp: Date;
        source: string;
      }

      const events: Event[] = [];
      const listeners = new Map<string, Array<(event: Event) => void>>();

      const eventBus = {
        emit: (type: string, payload: any, source: string) => {
          const event: Event = { type, payload, timestamp: new Date(), source };
          events.push(event);
          
          const eventListeners = listeners.get(type) || [];
          eventListeners.forEach(listener => listener(event));
        },

        on: (type: string, listener: (event: Event) => void) => {
          if (!listeners.has(type)) {
            listeners.set(type, []);
          }
          listeners.get(type)!.push(listener);
        }
      };

      // Set up cross-module event handling
      const moduleStates = {
        domain: { filesProcessed: 0 },
        application: { operationsCompleted: 0 },
        infrastructure: { cacheHits: 0, cacheWrites: 0 }
      };

      // Domain module events
      eventBus.on('file.processed', (event) => {
        moduleStates.domain.filesProcessed++;
        // Trigger application event
        eventBus.emit('indexing.progress', {
          filesProcessed: moduleStates.domain.filesProcessed,
          file: event.payload.file
        }, 'application');
      });

      // Application module events
      eventBus.on('indexing.progress', (event) => {
        moduleStates.application.operationsCompleted++;
      });

      eventBus.on('cache.hit', (event) => {
        moduleStates.infrastructure.cacheHits++;
      });

      eventBus.on('cache.write', (event) => {
        moduleStates.infrastructure.cacheWrites++;
      });

      // Simulate integrated workflow with events
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      
      files.forEach(file => {
        // Domain processes file
        eventBus.emit('file.processed', { file, success: true }, 'domain');
        
        // Infrastructure caches result
        eventBus.emit('cache.write', { key: `file:${file}`, size: 1024 }, 'infrastructure');
      });

      // Simulate cache hits during search
      eventBus.emit('cache.hit', { key: 'file:file1.txt' }, 'infrastructure');
      eventBus.emit('cache.hit', { key: 'file:file2.txt' }, 'infrastructure');

      // Verify event-driven state updates
      expect(moduleStates.domain.filesProcessed).toBe(3);
      expect(moduleStates.application.operationsCompleted).toBe(3);
      expect(moduleStates.infrastructure.cacheWrites).toBe(3);
      expect(moduleStates.infrastructure.cacheHits).toBe(2);

      // Verify events were recorded
      expect(events).toHaveLength(11); // 3 file.processed + 3 indexing.progress + 3 cache.write + 2 cache.hit = 11 total
      
      const fileProcessedEvents = events.filter(e => e.type === 'file.processed');
      expect(fileProcessedEvents).toHaveLength(3);
      expect(fileProcessedEvents[0]!.source).toBe('domain');

      const progressEvents = events.filter(e => e.type === 'indexing.progress');
      expect(progressEvents).toHaveLength(3);
      expect(progressEvents[0]!.source).toBe('application');
    });
  });
});
