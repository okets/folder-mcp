/**
 * Unified Model Factory
 * 
 * Creates embedding model instances that implement the unified IEmbeddingModel interface.
 * Supports Python, ONNX, and Ollama models with consistent behavior.
 */

import type { 
  IEmbeddingModel, 
  IEmbeddingModelFactory,
  EmbeddingModelConfig 
} from '../../domain/models/embedding-model-interface.js';
import type { ILoggingService } from '../../di/interfaces.js';
import { PythonModelBridge } from '../../infrastructure/embeddings/bridges/python-model-bridge.js';

export class UnifiedModelFactory implements IEmbeddingModelFactory {
  private modelCache = new Map<string, IEmbeddingModel>();
  
  constructor(
    private logger: ILoggingService
  ) {}

  async createModel(config: EmbeddingModelConfig): Promise<IEmbeddingModel> {
    const cacheKey = `${config.modelType}:${config.modelId}`;
    
    // Check cache for existing instance
    if (this.modelCache.has(cacheKey)) {
      this.logger.debug(`[MODEL-FACTORY] Returning cached model: ${cacheKey}`);
      return this.modelCache.get(cacheKey)!;
    }

    this.logger.info(`[MODEL-FACTORY] Creating new model: ${cacheKey}`);

    let model: IEmbeddingModel;

    switch (config.modelType) {
      case 'python':
        model = new PythonModelBridge(config, this.logger);
        break;
        
      case 'onnx':
        // TODO: Implement ONNXModelBridge in Step 4
        throw new Error('ONNX models not yet implemented in unified system');
        
      case 'ollama':
        // TODO: Implement OllamaModelBridge if needed
        throw new Error('Ollama models not yet implemented in unified system');
        
      default:
        throw new Error(`Unsupported model type: ${config.modelType}`);
    }

    // Cache the model instance
    this.modelCache.set(cacheKey, model);
    
    return model;
  }

  isSupported(modelType: string): boolean {
    return ['python', 'onnx', 'ollama'].includes(modelType);
  }

  getAvailableTypes(): string[] {
    return ['python', 'onnx', 'ollama'];
  }

  /**
   * Clear the model cache
   */
  clearCache(): void {
    this.logger.info('[MODEL-FACTORY] Clearing model cache');
    
    // Dispose all cached models
    for (const [key, model] of this.modelCache.entries()) {
      this.logger.debug(`[MODEL-FACTORY] Disposing cached model: ${key}`);
      model.dispose().catch(error => {
        this.logger.error(`[MODEL-FACTORY] Error disposing model ${key}:`, error);
      });
    }
    
    this.modelCache.clear();
  }

  /**
   * Get model type from model ID by checking curated models
   */
  static getModelTypeFromId(modelId: string): 'python' | 'onnx' | 'ollama' {
    // Check if it's an ONNX model
    if (modelId.toLowerCase().includes('onnx')) {
      return 'onnx';
    }
    
    // Check if it's an Ollama model
    if (modelId.toLowerCase().includes('ollama')) {
      return 'ollama';
    }
    
    // Default to Python for GPU models
    return 'python';
  }
}