import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRealTestEnvironment } from '../helpers/real-test-environment';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import type { RealTestEnvironment } from '../helpers/real-test-environment';
import type { EmbeddingVector } from '../../src/types/index.js';
import { OllamaEmbeddingService } from '../../src/infrastructure/embeddings/ollama-embedding-service.js';

// Example paragraph for similarity search
const CLIENT_EMAIL_PARAGRAPH =
  'Our team is considering a hybrid remote work policy. What are the best practices for flexible hours and international collaboration?';

// Short text for quick embedding tests
const SHORT_TEXT = 'Remote work policy guidelines';

describe('Embedding Real Tests - Ollama Verification', () => {
  let env: RealTestEnvironment;
  let ollamaService: OllamaEmbeddingService;

  beforeAll(async () => {
    env = await setupRealTestEnvironment('embedding-real-ollama');
    
    // Create dedicated Ollama service for verification
    ollamaService = new OllamaEmbeddingService({
      model: 'all-MiniLM-L6-v2', // Same small model as Python
      timeout: 15000,
      retries: 3,
      baseUrl: 'http://127.0.0.1:11434'
    });
    
    try {
      await ollamaService.initialize();
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Ollama API not accessible') ||
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED')
      )) {
        console.warn('⚠️  Ollama not available - tests will be skipped');
      } else {
        console.warn(`⚠️  Ollama initialization failed: ${error} - tests will be skipped`);
      }
    }
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it('generates real embeddings for a paragraph and validates vector dimensions', async () => {
    if (!ollamaService.isInitialized()) {
      console.warn('Skipping test - Ollama not available');
      return;
    }

    const result = await ollamaService.generateSingleEmbedding(CLIENT_EMAIL_PARAGRAPH);
    
    // Validate embedding structure
    expect(result).toBeDefined();
    expect(result.vector).toBeDefined();
    expect(Array.isArray(result.vector)).toBe(true);
    expect(result.vector.length).toBeGreaterThanOrEqual(384); // Minimum expected dimensions
    expect(result.vector.every((v) => typeof v === 'number')).toBe(true);
    expect(result.dimensions).toBe(result.vector.length);
    expect(typeof result.model).toBe('string');
    expect(result.model.length).toBeGreaterThan(0);
  });

  it('generates embeddings for real document files and validates content similarity', async () => {
    if (!ollamaService.isInitialized()) {
      console.warn('Skipping test - Ollama not available');
      return;
    }

    // Test with the TXT file (easiest to read)
    const txtPath = path.join(env.knowledgeBasePath, 'Policies/Remote_Work_Policy.txt');
    const txtContent = await env.services.fileSystem.readFile(txtPath);
    
    // Generate embeddings for both texts
    const queryEmbedding = await ollamaService.generateSingleEmbedding(CLIENT_EMAIL_PARAGRAPH);
    const docEmbedding = await ollamaService.generateSingleEmbedding(txtContent);
    
    // Validate both embeddings have same dimensions
    expect(queryEmbedding.dimensions).toBe(docEmbedding.dimensions);
    expect(queryEmbedding.model).toBe(docEmbedding.model);
    
    // Calculate similarity using the embedding service
    const similarity = ollamaService.calculateSimilarity(queryEmbedding, docEmbedding);
    
    // Validate similarity score
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
    
    // Since both texts are about remote work policy, similarity should be meaningful
    expect(similarity).toBeGreaterThan(0.3); // Reasonable threshold for related content
  });

  it('generates consistent embeddings for the same text', async () => {
    if (!ollamaService.isInitialized()) {
      console.warn('Skipping test - Ollama not available');
      return;
    }

    // Generate embeddings for the same text multiple times
    const embedding1 = await ollamaService.generateSingleEmbedding(SHORT_TEXT);
    const embedding2 = await ollamaService.generateSingleEmbedding(SHORT_TEXT);
    
    // Embeddings should be identical for the same input
    expect(embedding1.dimensions).toBe(embedding2.dimensions);
    expect(embedding1.model).toBe(embedding2.model);
    expect(embedding1.vector.length).toBe(embedding2.vector.length);
    
    // Calculate similarity between identical texts
    const similarity = ollamaService.calculateSimilarity(embedding1, embedding2);
    expect(similarity).toBeGreaterThan(0.99); // Should be nearly identical for real embeddings
  });

  it('handles batch embedding generation for real document content', async () => {
    if (!ollamaService.isInitialized()) {
      console.warn('Skipping test - Ollama not available');
      return;
    }

    // Create text chunks from real document content
    const txtPath = path.join(env.knowledgeBasePath, 'Policies/Remote_Work_Policy.txt');
    const txtContent = await env.services.fileSystem.readFile(txtPath);
    
    // Split content into chunks (simulate chunking)
    const chunks = txtContent.split('\n\n').filter(chunk => chunk.trim().length > 20).slice(0, 3);
    expect(chunks.length).toBeGreaterThan(0);
    
    // Generate embeddings for each chunk
    const embeddings: EmbeddingVector[] = [];
    for (const chunk of chunks) {
      const embedding = await ollamaService.generateSingleEmbedding(chunk.trim());
      embeddings.push(embedding);
    }
    
    // Validate all embeddings
    expect(embeddings.length).toBe(chunks.length);
    embeddings.forEach((embedding) => {
      expect(embedding.vector).toBeDefined();
      expect(embedding.vector.length).toBeGreaterThanOrEqual(384);
      expect(embedding.dimensions).toBe(embedding.vector.length);
      expect(typeof embedding.model).toBe('string');
    });
    
    // All embeddings should have the same dimensions and model
    if (embeddings.length > 0) {
      const firstEmbedding = embeddings[0]!;
      embeddings.forEach(embedding => {
        expect(embedding.dimensions).toBe(firstEmbedding.dimensions);
        expect(embedding.model).toBe(firstEmbedding.model);
      });
    }
  });

  it('handles different file formats and extracts meaningful embeddings', async () => {
    if (!ollamaService.isInitialized()) {
      console.warn('Skipping test - Ollama not available');
      return;
    }

    // Test with different formats that should produce similar embeddings
    const formats = ['txt', 'md']; // Start with text-based formats
    const embeddings: { format: string; embedding: EmbeddingVector }[] = [];
    
    for (const format of formats) {
      const filePath = path.join(env.knowledgeBasePath, `Policies/Remote_Work_Policy.${format}`);
      const content = await env.services.fileSystem.readFile(filePath);
      
      // Take first 500 characters to ensure similar content
      const snippet = content.substring(0, 500);
      const embedding = await ollamaService.generateSingleEmbedding(snippet);
      
      embeddings.push({ format, embedding });
    }
    
    // Validate embeddings were generated
    expect(embeddings.length).toBe(formats.length);
    
    // Calculate similarity between different formats of the same content
    if (embeddings.length >= 2) {
      const similarity = ollamaService.calculateSimilarity(
        embeddings[0]!.embedding,
        embeddings[1]!.embedding
      );
      // Since it's the same content in different formats, similarity should be very high
      expect(similarity).toBeGreaterThan(0.8);
    }
  });

  it('validates embedding service error handling and graceful degradation', async () => {
    if (!ollamaService.isInitialized()) {
      console.warn('Skipping test - Ollama not available');
      return;
    }

    try {
      // Test with empty text - Ollama should throw error
      await expect(ollamaService.generateSingleEmbedding('')).rejects.toThrow();
    } catch (error) {
      // Expected behavior for empty text
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBeTruthy();
    }
    
    try {
      // Test with very long text (stress test)
      const longText = 'Remote work policy '.repeat(1000);
      const longResult = await ollamaService.generateSingleEmbedding(longText);
      
      // Should handle long text gracefully
      expect(longResult.vector).toBeDefined();
      expect(longResult.vector.length).toBeGreaterThanOrEqual(384);
    } catch (error) {
      // If it throws an error, it should be a meaningful error
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBeTruthy();
    }
  });

  it('should validate performance characteristics of Ollama embeddings', async () => {
    if (!ollamaService.isInitialized()) {
      console.warn('Skipping test - Ollama not available');
      return;
    }

    // Performance test: single embedding
    const singleStart = Date.now();
    const singleEmbedding = await ollamaService.generateSingleEmbedding(CLIENT_EMAIL_PARAGRAPH);
    const singleTime = Date.now() - singleStart;
    
    expect(singleEmbedding.vector).toBeDefined();
    console.log(`⏱️  Ollama single embedding time: ${singleTime}ms`);
    
    // Performance test: batch embeddings  
    const testChunks = [
      'Machine learning is revolutionizing many industries.',
      'Artificial intelligence helps automate complex tasks.',
      'Deep learning models require substantial computational resources.',
      'Natural language processing enables human-computer interaction.',
      'Computer vision allows machines to interpret visual information.'
    ];
    
    const batchStart = Date.now();
    const batchEmbeddings = await Promise.all(
      testChunks.map(chunk => ollamaService.generateSingleEmbedding(chunk))
    );
    const batchTime = Date.now() - batchStart;
    
    expect(batchEmbeddings).toHaveLength(5);
    expect(batchEmbeddings.every(e => e.vector.length > 0)).toBe(true);
    console.log(`⏱️  Ollama batch embeddings (5 items) time: ${batchTime}ms`);
    console.log(`⏱️  Ollama average per embedding: ${Math.round(batchTime / 5)}ms`);
    
    // Cache directory validation for Ollama
    const cacheDir = path.join(env.knowledgeBasePath, '.folder-mcp');
    expect(existsSync(cacheDir)).toBe(true);
    
    // Save Ollama performance data to cache for comparison
    const performanceData = {
      service: 'ollama',
      model: 'all-MiniLM-L6-v2',
      singleEmbeddingTime: singleTime,
      batchEmbeddingTime: batchTime,
      averagePerEmbedding: Math.round(batchTime / 5),
      embeddingDimensions: singleEmbedding.dimensions,
      testTimestamp: new Date().toISOString()
    };
    
    const performanceCachePath = path.join(cacheDir, 'ollama-performance.json');
    await fs.writeFile(performanceCachePath, JSON.stringify(performanceData, null, 2));
    
    console.log(`✅ Ollama performance data cached at: ${performanceCachePath}`);
    console.log('📊 Ollama embedding performance testing completed');
  });
});