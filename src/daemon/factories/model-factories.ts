/**
 * Model Factories
 * 
 * Factory functions for creating model-related services.
 * Avoids direct instantiation to maintain dependency injection pattern.
 */

import { PythonEmbeddingService } from '../../infrastructure/embeddings/python-embedding-service.js';
import { ONNXDownloader } from '../../infrastructure/embeddings/onnx/onnx-downloader.js';

/**
 * Factory function for creating PythonEmbeddingService
 */
export function createPythonEmbeddingService(config: any): PythonEmbeddingService {
  return new PythonEmbeddingService(config);
}

/**
 * Factory function for creating ONNXDownloader
 */
export function createONNXDownloader(): ONNXDownloader {
  return new ONNXDownloader();
}