/**
 * Unified Model Factory
 * 
 * Creates embedding model instances that implement the unified IEmbeddingModel interface.
 * Supports Python, ONNX, and Ollama models with consistent behavior.
 */

import type { 
  IEmbeddingModel, 
  IEmbeddingModelFactory,
  EmbeddingModelConfig, 
} from '../../domain/models/embedding-model-interface.js';
import type { ILoggingService } from '../../di/interfaces.js';
import { PythonModelBridge } from '../../infrastructure/embeddings/bridges/python-model-bridge.js';
import { ONNXModelBridge } from '../../infrastructure/embeddings/bridges/onnx-model-bridge.js';

export class UnifiedModelFactory implements IEmbeddingModelFactory {
  // Model caching removed - always create fresh instances to avoid reusing disposed models

  constructor(
    private logger: ILoggingService,
  ) {}

  async createModel(config: EmbeddingModelConfig): Promise<IEmbeddingModel> {
    const modelKey = `${config.modelType}:${config.modelId}`;

    // Always create fresh model bridge instance
    this.logger.info(`[MODEL-FACTORY] Creating new model bridge: ${modelKey}`);

    let model: IEmbeddingModel;

    switch (config.modelType) {
      case 'python':
        model = new PythonModelBridge(config, this.logger);
        break;

      case 'onnx':
        model = new ONNXModelBridge(config, this.logger);
        break;

      case 'ollama':
        // TODO: Implement OllamaModelBridge if needed
        throw new Error('Ollama models not yet implemented in unified system');

      default:
        throw new Error(`Unsupported model type: ${config.modelType}`);
    }

    return model;
  }

  isSupported(modelType: string): boolean {
    return ['python', 'onnx', 'ollama'].includes(modelType);
  }

  getAvailableTypes(): string[] {
    return ['python', 'onnx', 'ollama'];
  }

  /**
   * Clear the model cache (no-op since caching removed)
   */
  clearCache(): void {
    // No-op: caching has been removed to ensure fresh instances
    this.logger.debug('[MODEL-FACTORY] clearCache called (no-op - caching removed)');
  }

  /**
   * Get model type from model ID by checking curated models
   */
  static getModelTypeFromId(modelId: string): 'python' | 'onnx' | 'ollama' {
    // Check prefixes according to our model ID convention:
    // - cpu: = CPU/ONNX models
    // - gpu: = GPU/Python models  
    // - ollama: = Ollama models
    if (modelId.startsWith('cpu:')) {
      return 'onnx';
    } else if (modelId.startsWith('gpu:')) {
      return 'python';
    } else if (modelId.startsWith('ollama:')) {
      return 'ollama';
    } else if (modelId.toLowerCase().includes('onnx')) {
      // Fallback for explicit onnx in name
      return 'onnx';
    } else {
      // Default to Ollama for backward compatibility
      return 'ollama';
    }
  }
}