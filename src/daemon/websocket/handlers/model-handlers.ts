/**
 * Model Handlers
 * 
 * Handles model-related operations for the WebSocket protocol.
 * Provides model list retrieval and cache status checking.
 */

import { 
  WSClientMessage,
  ModelListResponseMessage,
  isModelListMessage,
  createModelListResponse,
  createErrorMessage
} from '../message-types.js';
import { ILoggingService } from '../../../di/interfaces.js';


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
   * Get supported models - single source of truth for all model lists
   */
  getSupportedModels(): string[] {
    // Single hardcoded model for now - this is the authoritative list
    // All other components (TUI, validation) must get models from this endpoint
    return [
      'folder-mcp:all-MiniLM-L6-v2'
    ];
  }

  /**
   * Validate if a model is supported
   */
  isModelSupported(model: string): boolean {
    return this.getSupportedModels().includes(model);
  }
}