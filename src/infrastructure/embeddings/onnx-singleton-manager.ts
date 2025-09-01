/**
 * ONNX Model Singleton Manager
 * Ensures only one instance of each ONNX model exists in memory
 * Prevents memory leaks from multiple model instances
 */

import { ONNXEmbeddingService } from './onnx/onnx-embedding-service.js';
import type { IEmbeddingService } from '../../di/interfaces.js';
import path from 'path';
import os from 'os';

export class ONNXSingletonManager {
  private static instance: ONNXSingletonManager;
  private modelInstances: Map<string, IEmbeddingService> = new Map();
  private initializationPromises: Map<string, Promise<IEmbeddingService>> = new Map();

  private constructor() {}

  static getInstance(): ONNXSingletonManager {
    if (!ONNXSingletonManager.instance) {
      ONNXSingletonManager.instance = new ONNXSingletonManager();
    }
    return ONNXSingletonManager.instance;
  }

  /**
   * Get or create a singleton ONNX model instance
   * Ensures only one instance per modelId exists
   */
  async getModel(modelId: string): Promise<IEmbeddingService> {
    // Return existing instance if available
    if (this.modelInstances.has(modelId)) {
      console.error(`[ONNXSingletonManager] Returning existing instance for ${modelId}`);
      return this.modelInstances.get(modelId)!;
    }

    // Check if initialization is already in progress
    if (this.initializationPromises.has(modelId)) {
      console.error(`[ONNXSingletonManager] Waiting for ongoing initialization of ${modelId}`);
      return this.initializationPromises.get(modelId)!;
    }

    // Create initialization promise to prevent race conditions
    const initPromise = this.createModel(modelId);
    this.initializationPromises.set(modelId, initPromise);

    try {
      const model = await initPromise;
      this.modelInstances.set(modelId, model);
      console.error(`[ONNXSingletonManager] Created new singleton instance for ${modelId}`);
      return model;
    } catch (error) {
      throw error;
    } finally {
      this.initializationPromises.delete(modelId);
    }
  }

  private async createModel(modelId: string): Promise<IEmbeddingService> {
    const onnxService = new ONNXEmbeddingService({
      modelId: modelId,
      cacheDirectory: path.join(os.homedir(), '.cache', 'folder-mcp', 'onnx-models'),
      maxSequenceLength: 512,
      batchSize: 32
    });

    await onnxService.initialize();
    return onnxService;
  }

  /**
   * Clear all model instances (for cleanup)
   */
  async clearAll(): Promise<void> {
    console.error(`[ONNXSingletonManager] Clearing all ${this.modelInstances.size} model instances`);
    
    // Wait for in-flight initializations to settle
    if (this.initializationPromises.size > 0) {
      await Promise.allSettled(Array.from(this.initializationPromises.values()));
    }
    
    // Dispose all models
    for (const [modelId, service] of this.modelInstances) {
      try {
        if ('dispose' in service && typeof service.dispose === 'function') {
          await service.dispose();
        }
      } catch (error) {
        console.error(`[ONNXSingletonManager] Error disposing ${modelId}:`, error);
      }
    }

    this.modelInstances.clear();
    this.initializationPromises.clear();
  }

  /**
   * Get current memory usage stats
   */
  getStats(): { modelCount: number; modelIds: string[]; initializingCount: number; initializingIds: string[] } {
    return {
      modelCount: this.modelInstances.size,
      modelIds: Array.from(this.modelInstances.keys()),
      initializingCount: this.initializationPromises.size,
      initializingIds: Array.from(this.initializationPromises.keys())
    };
  }
}