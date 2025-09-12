/**
 * Mock Factories for Testing
 * 
 * Factory functions to create mock objects for testing
 */

import type { 
  FileFingerprint, 
  TextChunk, 
  ParsedContent, 
  EmbeddingVector,
  SearchResult,
  DocumentMetadata,
  TextMetadata
} from '../../src/types/index.js';
import { createDefaultSemanticMetadata } from '../../src/types/index.js';
import { getSupportedGpuModelHuggingfaceIds, getSupportedCpuModelIds } from '../../src/config/model-registry.js';
import { vi } from "vitest";

/**
 * Factory for creating mock domain objects
 */
export class MockFactory {
  /**
   * Create mock file fingerprint
   */
  static createFileFingerprint(overrides: Partial<FileFingerprint> = {}): FileFingerprint {
    return {
      hash: 'sha256-mock-hash-' + Math.random().toString(36).substring(7),
      path: 'test/file.txt',
      size: 1024,
      modified: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create mock text chunk
   */
  static createTextChunk(overrides: Partial<TextChunk> = {}): TextChunk {
    return {
      content: 'This is a test text chunk with some content for testing purposes.',
      startPosition: 0,
      endPosition: 65,
      tokenCount: 12,
      chunkIndex: 0,
      metadata: {
        sourceFile: 'test/file.txt',
        sourceType: 'txt',
        totalChunks: 1,
        hasOverlap: false,
        originalMetadata: {
          originalPath: 'test/file.txt',
          type: 'txt',
          size: 1024,
          lastModified: new Date().toISOString(),
          lines: 10
        }
      },
      semanticMetadata: createDefaultSemanticMetadata(),
      ...overrides
    };
  }

  /**
   * Create mock parsed content
   */
  static createParsedContent(overrides: Partial<ParsedContent> = {}): ParsedContent {
    return {
      content: 'This is test content that has been parsed from a file.',
      type: 'txt',
      originalPath: 'test/file.txt',
      metadata: {
        originalPath: 'test/file.txt',
        type: 'txt',
        size: 1024,
        lastModified: new Date().toISOString(),
        lines: 10
      },
      ...overrides
    };
  }

  /**
   * Create mock embedding vector
   */
  static createEmbeddingVector(overrides: Partial<EmbeddingVector> = {}): EmbeddingVector {
    const dimensions = overrides.dimensions || 384;
    return {
      vector: Array.from({ length: dimensions }, () => Math.random() * 2 - 1),
      dimensions,
      model: 'test-embedding-model',
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Create mock embedding (simple number array)
   */
  static createEmbedding(dimensions = 384): number[] {
    return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
  }

  /**
   * Create normalized embedding (unit vector)
   */
  static createNormalizedEmbedding(dimensions = 384): number[] {
    // Create embeddings with some similarity for testing
    const baseVector = Array.from({ length: dimensions }, (_, i) => 
      Math.sin(i * 0.1) + Math.random() * 0.2 - 0.1
    );
    const magnitude = Math.sqrt(baseVector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? baseVector.map(val => val / magnitude) : baseVector;
  }

  /**
   * Create embedding for specific text (deterministic for testing)
   */
  static createEmbeddingForText(text: string): number[] {
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    
    // Simple hash-based deterministic embedding for testing
    const hash = this.simpleHash(text);
    const dimensions = 384;
    const embedding = Array.from({ length: dimensions }, (_, i) => {
      return Math.sin((hash + i) * 0.01) * Math.cos((hash - i) * 0.01);
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  /**
   * Create batch embeddings
   */
  static createBatchEmbeddings(texts: string[]): number[][] {
    return texts.map(text => this.createEmbeddingForText(text));
  }

  /**
   * Create embedding with specific model
   */
  static createEmbeddingWithModel(text: string, model: string): number[] {
    // Use dynamic model validation from curated models registry - NO hardcoded model lists
    const supportedGpuModels = getSupportedGpuModelHuggingfaceIds();
    const supportedCpuModels = getSupportedCpuModelIds();
    const allSupportedModels = [...supportedGpuModels, ...supportedCpuModels];
    
    // Also support common test models for backwards compatibility
    const testModels = ['text-embedding-ada-002', 'sentence-transformers', 'nomic-embed-text', 'mxbai-embed-large', 'text-embedding-3-small'];
    const validModels = [...allSupportedModels, ...testModels];
    
    if (!validModels.some(valid => model.includes(valid))) {
      throw new Error(`Unsupported embedding model: ${model}. Supported models: ${validModels.join(', ')}`);
    }
    
    const baseEmbedding = this.createEmbeddingForText(text);
    // Simulate model differences by applying a transformation
    const modelHash = this.simpleHash(model);
    return baseEmbedding.map((val, i) => {
      const modelFactor = Math.sin(modelHash * 0.001 + i * 0.01);
      return val * (1 + modelFactor * 0.1); // Small model-specific variation
    });
  }

  /**
   * Create embedding with metadata
   */
  static createEmbeddingWithMetadata(text: string) {
    const embedding = this.createEmbeddingForText(text);
    return {
      embedding,
      metadata: {
        text,
        model: 'test-model',
        timestamp: new Date(),
        dimensions: embedding.length,
        generationTime: Math.random() * 50 + 10, // 10-60ms
        contentHash: this.sha256Hash(text)
      }
    };
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same dimensions');
    }
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Rank embeddings by similarity to query
   */
  static rankEmbeddingsBySimilarity(query: number[], candidates: number[][]) {
    return candidates
      .map((embedding, index) => ({
        embedding,
        index,
        similarity: this.calculateCosineSimilarity(query, embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Create mock search index
   */
  static createSearchIndex(populateWithTestData = true) {
    const vectors = new Map<string, { vector: number[]; metadata: DocumentMetadata }>();
    const analytics = {
      totalSearches: 0,
      totalResults: 0,
      averageSearchTime: 0,
      averageResultCount: 0
    };

    const defaultMetadata: TextMetadata = {
      originalPath: '',
      type: 'txt',
      size: 0,
      lastModified: new Date().toISOString(),
      lines: 0
    };

    const searchIndex = {
      add(id: string, vector: number[], metadata: any = {}) {
        vectors.set(id, { vector, metadata });
      },

      remove(id: string): boolean {
        return vectors.delete(id);
      },

      update(id: string, vector: number[], metadata: DocumentMetadata = defaultMetadata) {
        vectors.set(id, { vector, metadata });
      },

      has(id: string): boolean {
        return vectors.has(id);
      },

      size(): number {
        return vectors.size;
      },

      clear() {
        vectors.clear();
        analytics.totalSearches = 0;
        analytics.totalResults = 0;
        analytics.averageResultCount = 0;
        analytics.averageSearchTime = 0;
      },

      getMetadata(id: string): DocumentMetadata | undefined {
        return vectors.get(id)?.metadata;
      },

      search(query: number[], topK: number, threshold = 0.0): SearchResult[] {
        const results: SearchResult[] = [];
        const startTime = performance.now();

        for (const [id, { vector, metadata }] of vectors) {
          const similarity = MockFactory.calculateCosineSimilarity(query, vector);
          if (similarity >= threshold) {
            results.push({
              chunk: {
                content: `Content for ${id}`,
                startPosition: 0,
                endPosition: 100,
                tokenCount: 25,
                chunkIndex: 0,
                metadata: {
                  sourceFile: metadata.originalPath || id,
                  sourceType: metadata.type || 'txt',
                  totalChunks: 1,
                  hasOverlap: false,
                  originalMetadata: { ...metadata }
                },
                semanticMetadata: createDefaultSemanticMetadata()
              },
              score: similarity,
              context: {}
            });
          }
        }

        // Sort by similarity and limit to topK
        results.sort((a, b) => b.score - a.score);
        const limitedResults = results.slice(0, topK);

        // Update analytics
        const endTime = performance.now();
        const searchTime = endTime - startTime;
        analytics.totalSearches++;
        analytics.totalResults += limitedResults.length;
        analytics.averageSearchTime = (analytics.averageSearchTime * (analytics.totalSearches - 1) + searchTime) / analytics.totalSearches;
        analytics.averageResultCount = analytics.totalResults / analytics.totalSearches;

        return limitedResults;
      },

      searchWithFilter(query: number[], topK: number, threshold: number, filter: Record<string, unknown>): SearchResult[] {
        const results: SearchResult[] = [];
        const startTime = performance.now();

        for (const [id, { vector, metadata }] of vectors) {
          // Enhanced filter logic
          let matchesFilter = true;
          for (const [key, value] of Object.entries(filter)) {
            if (key.endsWith('GreaterThan')) {
              const baseKey = key.replace('GreaterThan', '');
              if (!((metadata as any)[baseKey] > (value as number))) {
                matchesFilter = false;
                break;
              }
            } else if (key.endsWith('LessThan')) {
              const baseKey = key.replace('LessThan', '');
              if (!((metadata as any)[baseKey] < (value as number))) {
                matchesFilter = false;
                break;
              }
            } else {
              if ((metadata as any)[key] !== value) {
                matchesFilter = false;
                break;
              }
            }
          }

          if (matchesFilter) {
            const similarity = MockFactory.calculateCosineSimilarity(query, vector);
            if (similarity >= threshold) {
              results.push({
                chunk: {
                  content: `Content for ${id}`,
                  startPosition: 0,
                  endPosition: 100,
                  tokenCount: 25,
                  chunkIndex: 0,
                  metadata: {
                    sourceFile: metadata.originalPath || id,
                    sourceType: metadata.type || 'txt',
                    totalChunks: 1,
                    hasOverlap: false,
                    originalMetadata: { ...metadata }
                  },
                  semanticMetadata: createDefaultSemanticMetadata()
                },
                score: similarity,
                context: {}
              });
            }
          }
        }

        // Sort by similarity and limit to topK
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
      },

      async save(indexName: string): Promise<boolean> {
        // Simulate saving index
        return true;
      },

      async load(indexName: string): Promise<boolean> {
        // Clear existing vectors
        vectors.clear();
        
        // Simulate loading 5 test vectors
        for (let i = 0; i < 5; i++) {
          const id = `id-${i}`;
          vectors.set(id, {
            vector: MockFactory.createEmbedding(384),
            metadata: {
              originalPath: `test/file${i}.txt`,
              type: 'txt',
              size: 1024,
              lastModified: new Date().toISOString(),
              lines: 10
            }
          });
        }
        return true;
      },

      async loadFromCorruptedData(): Promise<boolean> {
        // Clear existing vectors
        vectors.clear();
        return false;
      },

      getSearchPatterns() {
        return [
          { pattern: 'test query', frequency: 5 },
          { pattern: 'another query', frequency: 3 }
        ];
      },

      getAnalytics() {
        return { ...analytics };
      },

      getStatistics() {
        // Assume all vectors have the same dimension as the first, or 384 if empty
        const first = vectors.values().next().value;
        const dimensions = first ? first.vector.length : 384;
        return {
          totalVectors: vectors.size,
          dimensions,
          averageVectorDimension: dimensions,
          indexSize: vectors.size * dimensions * 4, // 4 bytes per number
          memoryUsage: vectors.size * dimensions * 4,
          lastUpdated: new Date().toISOString()
        };
      },

      approximateSearch(query: number[], topK: number, threshold: number) {
        // For testing, just use regular search but simulate approximate behavior
        return this.search(query, topK, threshold);
      }
    };

    if (populateWithTestData) {
      for (let i = 0; i < 10; i++) {
        searchIndex.add(`id-${i}`, MockFactory.createNormalizedEmbedding(), {
          originalPath: `test/file${i}.txt`,
          type: 'txt',
          size: 1024,
          lastModified: new Date().toISOString(),
          lines: 10
        });
      }
    }

    return searchIndex;
  }

  /**
   * Create approximate search index for large datasets
   */
  static createApproximateSearchIndex() {
    const searchIndex = this.createSearchIndex();
    
    return {
      ...searchIndex,
      approximateSearch(query: number[], topK: number, threshold: number) {
        // For testing, just use regular search but simulate approximate behavior
        return this.search(query, topK, threshold);
      }
    };
  }

  /**
   * Create search result ranker
   */
  static createSearchRanker() {
    return {
      rankResults(results: any[], options: any = {}) {
        return results
          .map(result => ({
            ...result,
            score: this.calculateScore(result, options)
          }))
          .sort((a, b) => b.score - a.score);
      },

      rankResultsWithCustomScorer(results: any[], scorer: (result: any) => number) {
        return results
          .map(result => ({
            ...result,
            score: scorer(result)
          }))
          .sort((a, b) => b.score - a.score);
      },

      calculateScore(result: any, options: any) {
        let score = result.score;
        
        if (options.boostPrimaryType && result.metadata.type === 'primary') {
          score += 0.1;
        }
        
        if (options.titleWeight && result.metadata.title) {
          score += options.titleWeight;
        }
        
        return score;
      }
    };
  }

  /**
   * Create error factory for testing error conditions
   */
  static createErrorFactory() {
    return {
      createEmbeddingForText(text: string): never {
        throw new Error('Embedding generation failed');
      }
    };
  }

  /**
   * Create slow factory for testing timeouts
   */
  static createSlowFactory(delayMs: number) {
    return {
      async createEmbeddingForText(text: string): Promise<number[]> {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return MockFactory.createEmbeddingForText(text);
      }
    };
  }

  /**
   * Simple hash function for deterministic embeddings
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Mock SHA-256 hash (for testing)
   */
  private static sha256Hash(str: string): string {
    return this.simpleHash(str).toString(16).padStart(16, '0').repeat(4);
  }

  /**
   * Create multiple mock objects
   */
  static createMultiple = {
    fileFingerprints: (count: number): FileFingerprint[] => {
      return Array.from({ length: count }, (_, i) => 
        MockFactory.createFileFingerprint({
          path: `test/file${i + 1}.txt`,
          hash: `sha256-hash-${i + 1}`
        })
      );
    },

    textChunks: (count: number): TextChunk[] => {
      return Array.from({ length: count }, (_, i) => 
        MockFactory.createTextChunk({
          chunkIndex: i,
          content: `This is test chunk number ${i + 1} with unique content.`,
          startPosition: i * 100,
          endPosition: (i + 1) * 100
        })
      );
    },

    embeddingVectors: (count: number, dimensions = 384): EmbeddingVector[] => {
      return Array.from({ length: count }, (_, i) => 
        MockFactory.createEmbeddingVector({
          dimensions
        })
      );
    },

    normalizedEmbeddings: (count: number, dimensions = 384): number[][] => {
      return Array.from({ length: count }, () => 
        MockFactory.createNormalizedEmbedding(dimensions)
      );
    },

    searchResults: (count: number): SearchResult[] => {
      return Array.from({ length: count }, (_, i) => ({
        chunk: MockFactory.createTextChunk({
          content: `Result ${i}`,
          startPosition: i * 100,
          endPosition: (i + 1) * 100,
          tokenCount: 10,
          chunkIndex: i
        }),
        score: 0.9 - (i * 0.1),
        context: {
          ...(i > 0 && {
            previous: MockFactory.createTextChunk({
              content: `Previous ${i}`,
              startPosition: (i - 1) * 100,
              endPosition: i * 100,
              tokenCount: 10,
              chunkIndex: i - 1
            })
          }),
          ...(i < count - 1 && {
            next: MockFactory.createTextChunk({
              content: `Next ${i}`,
              startPosition: (i + 1) * 100,
              endPosition: (i + 2) * 100,
              tokenCount: 10,
              chunkIndex: i + 1
            })
          })
        }
      }));
    }
  };

  /**
   * Create mock service responses
   */
  static createServiceResponses = {
    indexingResult: (overrides = {}) => ({
      success: true,
      filesProcessed: 5,
      chunksGenerated: 25,
      embeddingsCreated: 25,
      processingTime: 1500,
      errors: [],
      statistics: {
        totalBytes: 10240,
        totalWords: 2048,
        averageChunkSize: 409,
        processingRate: 3.33,
        embeddingRate: 16.67
      },
      ...overrides
    }),

    searchResult: (overrides = {}) => ({
      success: true,
      results: [
        {
          filePath: 'test/file1.txt',
          content: 'Relevant content from the search',
          similarity: 0.95,
          metadata: {
            chunkIndex: 0,
            chunkCount: 5,
            fileSize: 2048,
            lastModified: new Date(),
            relevanceScore: 0.95
          }
        }
      ],
      totalResults: 1,
      processingTime: 150,
      query: 'test query',
      options: {
        threshold: 0.7,
        maxResults: 10,
        includeContext: true
      },
      ...overrides
    }),

    fileContentResult: (overrides = {}) => ({
      success: true,
      content: 'This is the content of the requested file.',
      metadata: {
        size: 42,
        lastModified: new Date(),
        contentType: 'text/plain',
        encoding: 'utf8',
        isIndexed: true
      },
      ...overrides
    }),

    success: {
      status: 'success',
      data: { message: 'Operation completed successfully' }
    },

    error: {
      status: 'error',
      error: { message: 'Operation failed', code: 'TEST_ERROR' }
    },

    progress: {
      status: 'progress',
      progress: { current: 50, total: 100 }
    }
  };

  /**
   * Create mock error objects
   */
  static createErrors = {
    notFound: new Error('Resource not found'),
    invalidInput: new Error('Invalid input provided'),
    timeout: new Error('Operation timed out'),
    network: new Error('Network error occurred')
  };

  /**
   * Create mock configurations
   */
  static createConfigs = {
    default: {
      maxChunkSize: 1000,
      overlapSize: 100,
      embeddingModel: 'test-model',
      similarityThreshold: 0.7
    },
    strict: {
      maxChunkSize: 500,
      overlapSize: 50,
      embeddingModel: 'test-model',
      similarityThreshold: 0.9
    },
    lenient: {
      maxChunkSize: 2000,
      overlapSize: 200,
      embeddingModel: 'test-model',
      similarityThreshold: 0.5
    }
  };

  static createSearchResult({ id, vector, similarity, metadata, chunk, score, context }: any): any {
    // Provide both legacy and new properties for compatibility
    return {
      id: id ?? (chunk ? chunk.metadata?.sourceFile : undefined),
      vector: vector ?? (chunk ? chunk.vector : undefined),
      similarity: similarity ?? score,
      metadata: metadata ?? (chunk ? chunk.metadata : undefined),
      chunk,
      score: score ?? similarity,
      context: context ?? {},
    };
  }
}

/**
 * Mock service implementations
 */
export class MockServices {
  /**
   * Create a mock file parsing service
   */
  static createFileParsingService() {
    return {
      parseFile: vi.fn().mockResolvedValue(MockFactory.createParsedContent()),
      isSupported: vi.fn().mockReturnValue(true),
      getSupportedExtensions: vi.fn().mockReturnValue(['.txt', '.md', '.pdf'])
    };
  }

  /**
   * Create a mock chunking service
   */
  static createChunkingService() {
    return {
      chunkText: vi.fn().mockResolvedValue({
        chunks: MockFactory.createMultiple.textChunks(3),
        totalChunks: 3
      }),
      estimateTokenCount: vi.fn().mockReturnValue(100)
    };
  }

  /**
   * Create a mock embedding service
   */
  static createEmbeddingService() {
    return {
      initialize: vi.fn().mockResolvedValue(undefined),
      generateEmbeddings: vi.fn().mockResolvedValue(
        MockFactory.createMultiple.embeddingVectors(3)
      ),
      generateQueryEmbedding: vi.fn().mockResolvedValue(
        MockFactory.createEmbeddingVector()
      ),
      getModelConfig: vi.fn().mockReturnValue({ model: 'test-model' }),
      isInitialized: vi.fn().mockReturnValue(true)
    };
  }

  /**
   * Create a mock cache service
   */
  static createCacheService() {
    const cache = new Map();
    return {
      setupCacheDirectory: vi.fn().mockResolvedValue(undefined),
      saveData: vi.fn().mockImplementation((key, data) => {
        cache.set(key, data);
        return Promise.resolve();
      }),
      loadData: vi.fn().mockImplementation((key) => {
        return Promise.resolve(cache.get(key));
      }),
      deleteData: vi.fn().mockImplementation((key) => {
        cache.delete(key);
        return Promise.resolve();
      }),
      clearCache: vi.fn().mockImplementation(() => {
        cache.clear();
        return Promise.resolve();
      }),
      getCacheStats: vi.fn().mockResolvedValue({
        size: cache.size,
        memoryUsage: 1024,
        hitRate: 0.85
      })
    };
  }

  /**
   * Create a mock logger service
   */
  static createLoggerService() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn()
    };
  }

  /**
   * Create a mock configuration service
   */
  static createConfigurationService() {
    return {
      resolveConfig: vi.fn().mockResolvedValue(MockFactory.createConfigs.default),
      generateRuntimeConfig: vi.fn().mockResolvedValue({
        ...MockFactory.createConfigs.default,
        runtime: {
          startTime: new Date(),
          version: '1.0.0',
          nodeVersion: process.version
        }
      }),
      validateConfig: vi.fn().mockReturnValue([]),
      getSystemCapabilities: vi.fn().mockResolvedValue({
        memoryGB: 8,
        cpuCores: 4,
        platform: 'test'
      })
    };
  }
}
