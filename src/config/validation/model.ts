import { ValidationError, ValidationErrorCode, ValidationResult } from './errors.js';
import { getEmbeddingModels, EmbeddingModelInfo } from '../ollama.js';

export class ModelValidator {
  async validate(config: any): Promise<ValidationResult> {
    const result = new ValidationResult(true);

    // Check if model is specified
    if (!config.model) {
      result.addError(new ValidationError(
        ValidationErrorCode.MODEL_NOT_FOUND,
        'Embedding model is required',
        'model',
        undefined,
        'Specify an embedding model name'
      ));
      return result;
    }

    try {
      // Get embedding models from Ollama
      const models = await getEmbeddingModels();
      const modelExists = models.some((m: EmbeddingModelInfo) => m.name === config.model);
      
      if (!modelExists) {
        result.addError(new ValidationError(
          ValidationErrorCode.MODEL_NOT_FOUND,
          `Model '${config.model}' not found in Ollama`,
          'model',
          config.model,
          `Run 'ollama pull ${config.model}' to install the model`
        ));
        return result;
      }

      // Validate model parameters
      const modelInfo = models.find((m: EmbeddingModelInfo) => m.name === config.model);
      if (modelInfo) {
        // Check if model is an embedding model
        if (!modelInfo.isEmbedding) {
          result.addError(new ValidationError(
            ValidationErrorCode.MODEL_INCOMPATIBLE,
            `Model '${config.model}' is not an embedding model`,
            'model',
            config.model,
            'Choose a model that supports embeddings (e.g., nomic-embed-text)'
          ));
        }
      }
    } catch (error) {
      result.addError(new ValidationError(
        ValidationErrorCode.MODEL_INCOMPATIBLE,
        'Failed to validate model configuration',
        'model',
        config.model,
        'Check Ollama service status and model availability'
      ));
    }

    return result;
  }

  async applyDefaults(config: any): Promise<any> {
    const result = { ...config };

    // Set default model if not specified
    if (!result.model) {
      result.model = 'nomic-embed-text';
    }

    // Get model info for defaults
    try {
      const models = await getEmbeddingModels();
      const modelInfo = models.find((m: EmbeddingModelInfo) => m.name === result.model);
    } catch (error) {
      // Use safe defaults if model info can't be fetched
    }

    return result;
  }
} 