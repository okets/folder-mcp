/**
 * Model Factories
 * 
 * Factory functions for creating model-related services.
 * Uses singleton registry to prevent multiple Python processes for same model.
 */

import { PythonEmbeddingService } from '../../infrastructure/embeddings/python-embedding-service.js';
import { ONNXDownloader } from '../../infrastructure/embeddings/onnx/onnx-downloader.js';
import { ONNXEmbeddingService } from '../../infrastructure/embeddings/onnx/onnx-embedding-service.js';
import { getVenvPythonPath } from '../../utils/python-venv-path.js';
import { ModelCompatibilityEvaluator } from '../../domain/models/model-evaluator.js';

/**
 * Singleton registry for PythonEmbeddingService
 * Maintains ONE Python process that switches models as needed
 */
export class PythonEmbeddingServiceRegistry {
  private static instance: PythonEmbeddingServiceRegistry;
  private singletonService: PythonEmbeddingService | null = null;
  private currentModelName: string | null = null;

  private constructor() {}

  public static getInstance(): PythonEmbeddingServiceRegistry {
    if (!PythonEmbeddingServiceRegistry.instance) {
      PythonEmbeddingServiceRegistry.instance = new PythonEmbeddingServiceRegistry();
    }
    return PythonEmbeddingServiceRegistry.instance;
  }

  /**
   * Get the singleton PythonEmbeddingService, switching models if needed
   */
  public async getService(config: any): Promise<PythonEmbeddingService> {
    const requestedModel = config.modelName;

    // Create singleton ONCE, without model
    if (!this.singletonService) {
      console.log(`[PYTHON-REGISTRY] Creating SINGLETON PythonEmbeddingService (no model)`);

      // Use venv Python to ensure KeyBERT and other dependencies are available
      const venvPythonPath = getVenvPythonPath();
      const enhancedConfig = {
        ...config,
        pythonPath: venvPythonPath,  // Use venv Python instead of system Python
        modelName: ''  // Start empty - no model loaded initially
      };

      this.singletonService = new PythonEmbeddingService(enhancedConfig);
      await this.singletonService.initialize();

      // The service is already initialized and in idle state after initialize() completes
      console.log(`[PYTHON-REGISTRY] Singleton initialized in idle state`);
    }

    // Load model if requested and different from current
    if (requestedModel && this.currentModelName !== requestedModel) {
      console.log(`[PYTHON-REGISTRY] Loading model: ${requestedModel} (current: ${this.currentModelName || 'none'})`);

      // If a model is currently loaded, unload it first
      if (this.currentModelName) {
        console.log(`[PYTHON-REGISTRY] Unloading current model: ${this.currentModelName}`);
        await this.singletonService.unloadModel();
        await this.singletonService.waitForState('idle');
        this.currentModelName = null;
      }

      // Load new model via RPC
      await this.singletonService.loadModel(requestedModel);
      await this.singletonService.waitForState('ready');
      this.currentModelName = requestedModel;

      console.log(`[PYTHON-REGISTRY] Successfully loaded model: ${requestedModel}`);
    } else if (!requestedModel && this.currentModelName) {
      // If no model requested but one is loaded, keep it for efficiency
      console.log(`[PYTHON-REGISTRY] No model requested, keeping current: ${this.currentModelName}`);
    } else if (requestedModel === this.currentModelName) {
      console.log(`[PYTHON-REGISTRY] REUSING singleton with model: ${requestedModel}`);
    }

    return this.singletonService;
  }
  
  /**
   * Notify registry that model has been unloaded externally
   * This happens when the queue unloads the model
   */
  public notifyModelUnloaded(): void {
    if (this.currentModelName) {
      console.log(`[PYTHON-REGISTRY] Model ${this.currentModelName} unloaded externally, updating registry`);
      this.currentModelName = null;
    }
  }

  /**
   * Get registry status for debugging
   */
  public getStatus(): { [key: string]: any } {
    if (!this.singletonService) {
      return { singleton: 'No service initialized' };
    }

    return {
      singleton: {
        currentModel: this.currentModelName,
        initialized: (this.singletonService as any).initialized,
        processRunning: (this.singletonService as any).pythonProcess !== null
      }
    };
  }

  /**
   * Cleanup the singleton service
   */
  public async cleanup(): Promise<void> {
    if (this.singletonService) {
      console.log(`[PYTHON-REGISTRY] Cleaning up singleton service with model: ${this.currentModelName}`);
      await this.singletonService.shutdown();
      this.singletonService = null;
      this.currentModelName = null;
    }
  }
}

/**
 * Factory function for creating PythonEmbeddingService (now uses singleton registry)
 */
export async function createPythonEmbeddingService(config: any): Promise<PythonEmbeddingService> {
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
 * Factory function for creating ModelCompatibilityEvaluator
 */
export function createModelCompatibilityEvaluator(): ModelCompatibilityEvaluator {
  return new ModelCompatibilityEvaluator();
}

/**
 * Factory function for creating ONNXDownloader
 */
export function createONNXDownloader(config?: any): ONNXDownloader {
  return new ONNXDownloader(config);
}

/**
 * Factory function for creating ONNXEmbeddingService
 */
export function createONNXEmbeddingService(config: any): ONNXEmbeddingService {
  return new ONNXEmbeddingService(config);
}