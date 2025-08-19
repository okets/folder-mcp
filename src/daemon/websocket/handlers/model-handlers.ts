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
import { RequestLogger } from '../../../domain/daemon/request-logger.js';
import { createStructuredLogger, CorrelationIdManager } from '../../../infrastructure/logging/message-formatting.js';


/**
 * Model handlers for WebSocket protocol
 */
export class ModelHandlers {
  private requestLogger: RequestLogger;
  private structuredLogger: any;

  constructor(
    private logger: ILoggingService
  ) {
    this.requestLogger = new RequestLogger(this.logger);
    this.structuredLogger = createStructuredLogger(this.logger, 'model-handler');
  }

  /**
   * Handle model list request
   */
  async handleModelList(message: WSClientMessage, clientId?: string): Promise<ModelListResponseMessage> {
    if (!isModelListMessage(message)) {
      throw new Error('Invalid model list message');
    }

    const { id } = message;

    // Generate correlation ID and start operation tracking
    const correlationId = CorrelationIdManager.generateId('model-list');
    
    return CorrelationIdManager.withId(correlationId, () => {
      // Start structured operation logging
      const operationRequestId = this.structuredLogger.logOperation('started', 'model_list_request', {
        requestId: correlationId,
        clientId: clientId || 'unknown',
        metadata: {
          messageId: id,
          triggerType: 'user'
        }
      });

      // Also use the existing request logger for compatibility
      const requestId = this.requestLogger.startRequest(
        'model_list',
        { messageId: id },
        {
          triggerType: 'user',
          ...(clientId && { clientId })
        }
      );

      return this.executeModelListOperation(id, requestId, operationRequestId, clientId);
    });
  }

  private async executeModelListOperation(
    messageId: string, 
    requestId: string, 
    operationRequestId: string, 
    clientId?: string
  ): Promise<ModelListResponseMessage> {

    const startTime = Date.now();

    try {
      // Get supported models from system configuration
      const supportedModels = this.getSupportedModels();

      // For now, we'll just return the models without cache status
      // Cache status checking can be added later as an enhancement
      const response = createModelListResponse(
        messageId,
        supportedModels,
        'python' // Hardcoded to python for Phase 8 Task 10
      );

      const duration = Date.now() - startTime;

      // Complete structured operation logging
      this.structuredLogger.logOperation('completed', 'model_list_request', {
        requestId: operationRequestId,
        clientId: clientId || 'unknown',
        duration,
        metadata: {
          modelCount: supportedModels.length,
          responseSize: JSON.stringify(response).length,
          provider: 'python'
        }
      });

      // Complete legacy request tracking for compatibility
      this.requestLogger.completeRequest(requestId, 'success', {
        responseSize: JSON.stringify(response).length,
        performanceMetrics: {
          processingTime: duration
        }
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Complete structured operation logging with error
      this.structuredLogger.logOperation('failed', 'model_list_request', {
        requestId: operationRequestId,
        clientId: clientId || 'unknown',
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
        recommendedAction: 'Check model configuration and system status'
      });

      // Complete legacy request tracking for compatibility
      this.requestLogger.completeRequest(requestId, 'failure', {
        errorCode: 'MODEL_LIST_ERROR',
        errorMessage
      });
      
      // Return error as a model list response with empty models
      return createModelListResponse(messageId, [], 'python');
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