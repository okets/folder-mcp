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

    console.error(`\n=== PYTHON REGISTRY SERVICE REQUEST ===`);
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Requested model: ${requestedModel || '(none)'}`);
    console.error(`Current model: ${this.currentModelName || '(none)'}`);
    console.error(`Singleton exists: ${!!this.singletonService}`);
    console.error(`Singleton initialized: ${this.singletonService?.isInitialized() ?? 'N/A'}`);
    console.error(`=== END REQUEST DIAGNOSTIC ===\n`);

    // Prepare enhanced config for Python service
    const venvPythonPath = getVenvPythonPath();
    const enhancedConfig = {
      ...config,
      pythonPath: venvPythonPath,  // Use venv Python instead of system Python
      modelName: ''  // Start empty - no model loaded initially
    };

    // Create singleton ONCE, without model
    if (!this.singletonService) {
      console.error(`\n🔧 [PYTHON-REGISTRY] Creating SINGLETON PythonEmbeddingService (no model)`);

      this.singletonService = new PythonEmbeddingService(enhancedConfig);

      console.error(`[PYTHON-REGISTRY] ⏳ Initializing singleton...`);
      await this.singletonService.initialize();

      // The service is already initialized and in idle state after initialize() completes
      console.error(`[PYTHON-REGISTRY] ✅ Singleton initialized in idle state`);
    }

    // CRITICAL: Check if service has crashed and needs reinitialization
    if (this.singletonService && !this.singletonService.isInitialized()) {
      console.error(`[PYTHON-REGISTRY] ⚠️  Singleton exists but not initialized (likely crashed)`);
      console.error(`[PYTHON-REGISTRY] ⏳ Reinitializing crashed Python service...`);

      try {
        await this.singletonService.initialize();
        console.error(`[PYTHON-REGISTRY] ✅ Python service reinitialized successfully`);
      } catch (error) {
        console.error(`[PYTHON-REGISTRY] ❌ Failed to reinitialize, creating new singleton`);
        this.singletonService = new PythonEmbeddingService(enhancedConfig);
        await this.singletonService.initialize();
      }

      // Reset current model tracking after crash recovery
      this.currentModelName = null;
    }

    // Load model if requested and different from current
    if (requestedModel && this.currentModelName !== requestedModel) {
      console.error(`\n📦 [PYTHON-REGISTRY] MODEL SWITCH NEEDED:`);
      console.error(`From: ${this.currentModelName || '(none)'} → To: ${requestedModel}`);

      // If a model is currently loaded, unload it first
      if (this.currentModelName) {
        console.error(`[PYTHON-REGISTRY] ⏳ Unloading current model: ${this.currentModelName}`);
        await this.singletonService.unloadModel();
        await this.singletonService.waitForState('idle');
        this.currentModelName = null;
        console.error(`[PYTHON-REGISTRY] ✅ Model unloaded`);
      }

      // Load the new model
      console.error(`[PYTHON-REGISTRY] ⏳ Loading new model: ${requestedModel}`);
      const loadStartTime = Date.now();

      await this.singletonService.loadModel(requestedModel);

      console.error(`[PYTHON-REGISTRY] ⏳ Waiting for model to reach 'ready' state...`);
      await this.singletonService.waitForState('ready', 30000);

      const loadDuration = Date.now() - loadStartTime;
      this.currentModelName = requestedModel;
      console.error(`[PYTHON-REGISTRY] ✅ Successfully loaded model: ${requestedModel} (${loadDuration}ms)`);

    } else if (!requestedModel && this.currentModelName) {
      // If no model requested but one is loaded, keep it for efficiency
      console.error(`[PYTHON-REGISTRY] ℹ️  No model requested, keeping current: ${this.currentModelName}`);
    } else if (requestedModel === this.currentModelName) {
      console.error(`[PYTHON-REGISTRY] ♻️  REUSING singleton with model: ${requestedModel}`);
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

      // CRITICAL: Also update the service's internal config to reflect idle state
      // Otherwise it will think the model is still loaded
      if (this.singletonService) {
        (this.singletonService as any).config.modelName = '';
      }
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