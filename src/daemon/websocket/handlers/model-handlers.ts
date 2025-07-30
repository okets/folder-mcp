/**
 * Model Handlers
 * 
 * Handles model-related operations for the WebSocket protocol.
 * Provides model list retrieval and cache status checking.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  WSClientMessage,
  ModelListResponseMessage,
  isModelListMessage,
  createModelListResponse,
  createErrorMessage
} from '../message-types.js';
import { ILoggingService } from '../../../di/interfaces.js';

/**
 * Interface for supported models configuration
 */
interface SystemConfiguration {
  embeddings?: {
    python?: {
      supportedModels?: string[];
    };
  };
}

/**
 * Model handlers for WebSocket protocol
 */
export class ModelHandlers {
  constructor(
    private logger: ILoggingService
  ) {}

  /**
   * Handle model list request
   */
  async handleModelList(message: WSClientMessage): Promise<ModelListResponseMessage> {
    if (!isModelListMessage(message)) {
      throw new Error('Invalid model list message');
    }

    const { id } = message;

    this.logger.info('Handling model list request');

    try {
      // Get supported models from system configuration
      const supportedModels = this.getSupportedModels();

      // For now, we'll just return the models without cache status
      // Cache status checking can be added later as an enhancement
      const response = createModelListResponse(
        id,
        supportedModels,
        'python' // Hardcoded to python for Phase 8 Task 10
      );

      this.logger.debug(`Returning ${supportedModels.length} supported models`);
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get model list', error instanceof Error ? error : new Error(String(error)));
      
      // Return error as a model list response with empty models
      return createModelListResponse(id, [], 'python');
    }
  }

  /**
   * Get supported models from system configuration
   */
  private getSupportedModels(): string[] {
    try {
      // Read from system configuration file
      const configPath = join(process.cwd(), 'system-configuration.json');
      const configContent = readFileSync(configPath, 'utf8');
      const config: SystemConfiguration = JSON.parse(configContent);
      
      const models = config.embeddings?.python?.supportedModels;
      if (Array.isArray(models) && models.length > 0) {
        return models;
      }
      
      // Fallback to default models if config doesn't have them
      return this.getFallbackModels();
      
    } catch (error) {
      this.logger.warn('Failed to read system configuration, using fallback models', error instanceof Error ? error : new Error(String(error)));
      return this.getFallbackModels();
    }
  }

  /**
   * Get fallback model list when configuration is unavailable
   */
  private getFallbackModels(): string[] {
    return [
      'all-MiniLM-L6-v2',
      'all-mpnet-base-v2',
      'all-MiniLM-L12-v2',
      'all-distilroberta-v1',
      'paraphrase-MiniLM-L6-v2'
    ];
  }
}