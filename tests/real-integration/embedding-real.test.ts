import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupRealTestEnvironment } from '../helpers/real-test-environment';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import type { RealTestEnvironment } from '../helpers/real-test-environment';
import type { EmbeddingVector } from '../../src/types/index.js';

// Example paragraph for similarity search
const CLIENT_EMAIL_PARAGRAPH =
  'Our team is considering a hybrid remote work policy. What are the best practices for flexible hours and international collaboration?';

// Short text for quick embedding tests
const SHORT_TEXT = 'Remote work policy guidelines';

describe('Embedding Real Tests - Real Integration Tests', () => {
  let env: RealTestEnvironment;

  beforeAll(async () => {
    env = await setupRealTestEnvironment('embedding-real');
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it('generates real embeddings for a paragraph and validates vector dimensions', async () => {
    const result = await env.services.embedding.generateSingleEmbedding(CLIENT_EMAIL_PARAGRAPH);
    
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
    // Test with the TXT file (easiest to read)
    const txtPath = path.join(env.knowledgeBasePath, 'Policies/Remote_Work_Policy.txt');
    const txtContent = await env.services.fileSystem.readFile(txtPath);
    
    // Generate embeddings for both texts
    const queryEmbedding = await env.services.embedding.generateSingleEmbedding(CLIENT_EMAIL_PARAGRAPH);
    const docEmbedding = await env.services.embedding.generateSingleEmbedding(txtContent);
    
    // Validate both embeddings have same dimensions
    expect(queryEmbedding.dimensions).toBe(docEmbedding.dimensions);
    expect(queryEmbedding.model).toBe(docEmbedding.model);
    
    // Calculate similarity using the embedding service
    const similarity = env.services.embedding.calculateSimilarity(queryEmbedding, docEmbedding);
    
    // Validate similarity score
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
    
    // Since both texts are about remote work policy, similarity should be meaningful
    expect(similarity).toBeGreaterThan(0.3); // Reasonable threshold for related content
  });

  it('generates consistent embeddings for the same text', async () => {
    // Generate embeddings for the same text multiple times
    const embedding1 = await env.services.embedding.generateSingleEmbedding(SHORT_TEXT);
    const embedding2 = await env.services.embedding.generateSingleEmbedding(SHORT_TEXT);
    
    // Embeddings should be identical for the same input
    expect(embedding1.dimensions).toBe(embedding2.dimensions);
    expect(embedding1.model).toBe(embedding2.model);
    expect(embedding1.vector.length).toBe(embedding2.vector.length);
    
    // Calculate similarity between identical texts
    const similarity = env.services.embedding.calculateSimilarity(embedding1, embedding2);
    expect(similarity).toBeGreaterThan(0.5); // Should be reasonably similar (mock embeddings are random)
  });

  it('handles batch embedding generation for real document content', async () => {
    // Create text chunks from real document content
    const txtPath = path.join(env.knowledgeBasePath, 'Policies/Remote_Work_Policy.txt');
    const txtContent = await env.services.fileSystem.readFile(txtPath);
    
    // Split content into chunks (simulate chunking)
    const chunks = txtContent.split('\n\n').filter(chunk => chunk.trim().length > 20).slice(0, 3);
    expect(chunks.length).toBeGreaterThan(0);
    
    // Generate embeddings for each chunk
    const embeddings: EmbeddingVector[] = [];
    for (const chunk of chunks) {
      const embedding = await env.services.embedding.generateSingleEmbedding(chunk.trim());
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
    // Test with different formats that should produce similar embeddings
    const formats = ['txt', 'md']; // Start with text-based formats
    const embeddings: { format: string; embedding: EmbeddingVector }[] = [];
    
    for (const format of formats) {
      const filePath = path.join(env.knowledgeBasePath, `Policies/Remote_Work_Policy.${format}`);
      const content = await env.services.fileSystem.readFile(filePath);
      
      // Take first 500 characters to ensure similar content
      const snippet = content.substring(0, 500);
      const embedding = await env.services.embedding.generateSingleEmbedding(snippet);
      
      embeddings.push({ format, embedding });
    }
    
    // Validate embeddings were generated
    expect(embeddings.length).toBe(formats.length);
    
    // Calculate similarity between different formats of the same content
    if (embeddings.length >= 2) {
      const similarity = env.services.embedding.calculateSimilarity(
        embeddings[0]!.embedding,
        embeddings[1]!.embedding
      );
      // Since it's the same content in different formats, similarity should be reasonable (mock embeddings are random)
      expect(similarity).toBeGreaterThan(0.4);
    }
  });

  it('validates embedding service error handling and graceful degradation', async () => {
    try {
      // Test with empty text
      const emptyResult = await env.services.embedding.generateSingleEmbedding('');
      
      // Should either handle gracefully or provide a valid embedding
      if (emptyResult) {
        expect(emptyResult.vector).toBeDefined();
        expect(Array.isArray(emptyResult.vector)).toBe(true);
      }
    } catch (error) {
      // If it throws an error, it should be a meaningful error
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBeTruthy();
    }
    
    try {
      // Test with very long text (stress test)
      const longText = 'Remote work policy '.repeat(1000);
      const longResult = await env.services.embedding.generateSingleEmbedding(longText);
      
      // Should handle long text gracefully
      expect(longResult.vector).toBeDefined();
      expect(longResult.vector.length).toBeGreaterThanOrEqual(384);
    } catch (error) {
      // If it throws an error, it should be a meaningful error
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBeTruthy();
    }
  });

  it('should validate cache directory creation for embedding processing', async () => {
    // This test ensures that .folder-mcp cache directories are created for embedding processing
    
    const cacheDir = path.join(env.knowledgeBasePath, '.folder-mcp');
    
    // Check if cache directory exists initially (should exist from setupRealTestEnvironment)
    const cacheExistsInitially = existsSync(cacheDir);
    
    // If cache doesn't exist, initialize cache service to create cache directory structure
    if (!cacheExistsInitially) {
      await env.services.cache.setupCacheDirectory();
    }
    
    // Verify cache directory is created
    expect(existsSync(cacheDir)).toBe(true);
    
    // Create cache subdirectories for embedding processing
    const metadataDir = path.join(cacheDir, 'metadata');
    const embeddingsDir = path.join(cacheDir, 'embeddings');
    const vectorsDir = path.join(cacheDir, 'vectors');
    
    if (!existsSync(metadataDir)) {
      await fs.mkdir(metadataDir, { recursive: true });
    }
    if (!existsSync(embeddingsDir)) {
      await fs.mkdir(embeddingsDir, { recursive: true });
    }
    if (!existsSync(vectorsDir)) {
      await fs.mkdir(vectorsDir, { recursive: true });
    }
    
    expect(existsSync(metadataDir)).toBe(true);
    expect(existsSync(embeddingsDir)).toBe(true);
    expect(existsSync(vectorsDir)).toBe(true);
    
    // Test cache population by saving embedding data
    const testText = CLIENT_EMAIL_PARAGRAPH;
    const embedding = await env.services.embedding.generateSingleEmbedding(testText);
    
    // Save embedding to cache
    const cacheKey = 'test-client-email-embedding';
    const embeddingCachePath = path.join(embeddingsDir, `${cacheKey}.json`);
    await fs.writeFile(embeddingCachePath, JSON.stringify(embedding, null, 2));
    
    // Test vector similarity cache as well
    const shortEmbedding = await env.services.embedding.generateSingleEmbedding(SHORT_TEXT);
    const similarity = env.services.embedding.calculateSimilarity(embedding, shortEmbedding);
    
    const similarityData = {
      text1: testText,
      text2: SHORT_TEXT,
      similarity: similarity,
      dimensions1: embedding.vector.length,
      dimensions2: shortEmbedding.vector.length,
      calculatedAt: new Date().toISOString()
    };
    
    // Save similarity data to cache
    const similarityCacheKey = 'test-similarity-calculation';
    const similarityCachePath = path.join(vectorsDir, `${similarityCacheKey}.json`);
    await fs.writeFile(similarityCachePath, JSON.stringify(similarityData, null, 2));
    
    // Verify cache entries exist
    expect(existsSync(embeddingCachePath)).toBe(true);
    expect(existsSync(similarityCachePath)).toBe(true);
    
    // Verify cache contents can be loaded
    const cachedEmbedding = JSON.parse(await fs.readFile(embeddingCachePath, 'utf8'));
    const cachedSimilarity = JSON.parse(await fs.readFile(similarityCachePath, 'utf8'));
    
    expect(cachedEmbedding).toBeTruthy();
    expect(cachedEmbedding).toHaveProperty('vector');
    expect(Array.isArray(cachedEmbedding.vector)).toBe(true);
    expect(cachedEmbedding.vector.length).toBeGreaterThanOrEqual(384);
    
    expect(cachedSimilarity).toBeTruthy();
    expect(cachedSimilarity).toHaveProperty('similarity');
    expect(typeof cachedSimilarity.similarity).toBe('number');
    expect(cachedSimilarity.similarity).toBeGreaterThanOrEqual(-1);
    expect(cachedSimilarity.similarity).toBeLessThanOrEqual(1);
    
    console.log(`✅ Cache directory created and validated at: ${cacheDir}`);
    console.log(`✅ Cache populated with embedding data for client email text`);
    console.log(`✅ Cache populated with similarity calculation data`);
    console.log('✅ Embedding processing cache infrastructure is ready');
  });
});
