/**
 * Unified Embedding Model Interface
 * 
 * All embedding model implementations (Python, ONNX, Ollama) must implement this interface.
 * This ensures consistent behavior across different model types and enables sequential processing.
 */

import type { TextChunk } from '../../types/index.js';
import type { EmbeddingVector, EmbeddingResult } from '../embeddings/index.js';

/**
 * Model status information
 */
export interface ModelStatus {
  isLoaded: boolean;
  modelName: string;
  modelType: 'python' | 'onnx' | 'ollama';
  memoryUsageMB?: number;
  device?: string;
  lastUsed?: Date;
}

/**
 * Model loading progress for downloads
 */
export interface ModelLoadProgress {
  stage: 'downloading' | 'loading' | 'ready' | 'error';
  progress?: number; // 0-100 for downloading
  message?: string;
  error?: string;
}

/**
 * Unified interface for all embedding models
 * 
 * Key principles:
 * - Models are loaded on-demand (lazy loading)
 * - Models can be unloaded to free memory
 * - Only one model should be loaded at a time (sequential processing)
 * - Semantic search requests get priority (immediate flag)
 */
export interface IEmbeddingModel {
  /**
   * Get the current status of the model
   */
  getStatus(): Promise<ModelStatus>;

  /**
   * Load the model into memory
   * @param onProgress - Optional callback for download/load progress
   */
  load(onProgress?: (progress: ModelLoadProgress) => void): Promise<void>;

  /**
   * Unload the model from memory to free resources
   */
  unload(): Promise<void>;

  /**
   * Check if the model is currently loaded
   */
  isLoaded(): Promise<boolean>;

  /**
   * Generate embeddings for a batch of text chunks
   * @param chunks - Text chunks to embed
   * @param immediate - If true, this is a priority request (semantic search)
   */
  generateEmbeddings(chunks: TextChunk[], immediate?: boolean): Promise<EmbeddingVector[]>;

  /**
   * Generate a single embedding
   * @param text - Text to embed
   * @param immediate - If true, this is a priority request
   */
  generateSingleEmbedding(text: string, immediate?: boolean): Promise<EmbeddingVector>;

  /**
   * Process embeddings in batches with progress tracking
   * @param chunks - All chunks to process
   * @param batchSize - Size of each batch
   * @param immediate - If true, this is a priority request
   */
  processBatch(chunks: TextChunk[], batchSize?: number, immediate?: boolean): Promise<EmbeddingResult[]>;

  /**
   * Calculate similarity between two vectors
   */
  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number;

  /**
   * Estimate processing time for a given number of chunks
   */
  estimateProcessingTime(chunkCount: number): number;

  /**
   * Clean up resources when the model is being destroyed
   */
  dispose(): Promise<void>;
}

/**
 * Configuration for creating embedding models
 */
export interface EmbeddingModelConfig {
  modelId: string;
  modelType: 'python' | 'onnx' | 'ollama';
  modelName?: string;
  pythonPath?: string;
  cacheDirectory?: string;
  timeout?: number;
  maxRetries?: number;
  batchSize?: number;
}

/**
 * Factory interface for creating embedding models
 */
export interface IEmbeddingModelFactory {
  /**
   * Create an embedding model instance
   * @param config - Model configuration
   */
  createModel(config: EmbeddingModelConfig): Promise<IEmbeddingModel>;

  /**
   * Check if a model type is supported
   * @param modelType - The type of model
   */
  isSupported(modelType: string): boolean;

  /**
   * Get available model types
   */
  getAvailableTypes(): string[];
}