/**
 * Model Factories
 * 
 * Factory functions for creating model-related services.
 * Uses singleton registry to prevent multiple Python processes for same model.
 */

import { PythonEmbeddingService } from '../../infrastructure/embeddings/python-embedding-service.js';
import { ONNXDownloader } from '../../infrastructure/embeddings/onnx/onnx-downloader.js';

/**
 * Singleton registry for PythonEmbeddingService instances
 * Ensures only one instance per model exists across the entire application
 */
class PythonEmbeddingServiceRegistry {
  private static instance: PythonEmbeddingServiceRegistry;
  private services: Map<string, PythonEmbeddingService> = new Map();
  
  private constructor() {}
  
  public static getInstance(): PythonEmbeddingServiceRegistry {
    if (!PythonEmbeddingServiceRegistry.instance) {
      PythonEmbeddingServiceRegistry.instance = new PythonEmbeddingServiceRegistry();
    }
    return PythonEmbeddingServiceRegistry.instance;
  }
  
  /**
   * Get or create a PythonEmbeddingService instance for the specified model
   */
  public getService(config: any): PythonEmbeddingService {
    const key = config.modelName || 'default';
    
    if (!this.services.has(key)) {
      console.log(`[PYTHON-REGISTRY] Creating NEW PythonEmbeddingService for ${key}`);
      const service = new PythonEmbeddingService(config);
      this.services.set(key, service);
    } else {
      console.log(`[PYTHON-REGISTRY] REUSING existing PythonEmbeddingService for ${key}`);
    }
    
    return this.services.get(key)!;
  }
  
  /**
   * Get registry status for debugging
   */
  public getStatus(): { [key: string]: any } {
    const status: { [key: string]: any } = {};
    for (const [key, service] of this.services.entries()) {
      status[key] = {
        initialized: (service as any).initialized,
        processRunning: (service as any).pythonProcess !== null
      };
    }
    return status;
  }
  
  /**
   * Cleanup all services
   */
  public async cleanup(): Promise<void> {
    console.log(`[PYTHON-REGISTRY] Cleaning up ${this.services.size} services`);
    const cleanupPromises = Array.from(this.services.values()).map(service => service.shutdown());
    await Promise.all(cleanupPromises);
    this.services.clear();
  }
}

/**
 * Factory function for creating PythonEmbeddingService (now uses singleton registry)
 */
export function createPythonEmbeddingService(config: any): PythonEmbeddingService {
  const registry = PythonEmbeddingServiceRegistry.getInstance();
  return registry.getService(config);
}

/**
 * Get registry status for debugging
 */
export function getPythonEmbeddingServiceStatus(): { [key: string]: any } {
  const registry = PythonEmbeddingServiceRegistry.getInstance();
  return registry.getStatus();
}

/**
 * Factory function for creating ONNXDownloader
 */
export function createONNXDownloader(): ONNXDownloader {
  return new ONNXDownloader();
}