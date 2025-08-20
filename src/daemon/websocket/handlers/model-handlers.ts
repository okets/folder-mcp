/**
 * Model Handlers
 * 
 * Handles model-related operations for the WebSocket protocol.
 * Provides model list retrieval and cache status checking.
 */

import { 
  WSClientMessage,
  ModelListResponseMessage,
  ModelRecommendResponseMessage,
  ModelCompatibilityScore,
  isModelListMessage,
  isModelRecommendMessage,
  createModelListResponse,
  createModelRecommendResponse,
  createErrorMessage
} from '../message-types.js';
import { ILoggingService } from '../../../di/interfaces.js';
import { RequestLogger } from '../../../domain/daemon/request-logger.js';
import { createStructuredLogger, CorrelationIdManager } from '../../../infrastructure/logging/message-formatting.js';
import { ModelSelectionService } from '../../../application/models/model-selection-service.js';
import { OllamaDetector } from '../../../infrastructure/ollama/ollama-detector.js';


/**
 * Model handlers for WebSocket protocol
 */
export class ModelHandlers {
  private requestLogger: RequestLogger;
  private structuredLogger: any;

  constructor(
    private logger: ILoggingService,
    private modelSelectionService: ModelSelectionService,
    private ollamaDetector: OllamaDetector
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
   * Handle model recommendation request
   */
  async handleModelRecommend(message: WSClientMessage, clientId?: string): Promise<ModelRecommendResponseMessage> {
    if (!isModelRecommendMessage(message)) {
      throw new Error('Invalid model recommendation message');
    }

    const { id, payload } = message;
    const { languages, mode } = payload;

    // Generate correlation ID and start operation tracking
    const correlationId = CorrelationIdManager.generateId('model-recommend');
    
    return CorrelationIdManager.withId(correlationId, () => {
      // Start structured operation logging
      const operationRequestId = this.structuredLogger.logOperation('started', 'model_recommend_request', {
        requestId: correlationId,
        clientId: clientId || 'unknown',
        metadata: {
          messageId: id,
          triggerType: 'user',
          mode,
          languages: languages.join(',')
        }
      });

      // Also use the existing request logger for compatibility
      const requestId = this.requestLogger.startRequest(
        'model_recommend',
        { messageId: id, mode, languages },
        {
          triggerType: 'user',
          ...(clientId && { clientId })
        }
      );

      return this.executeModelRecommendOperation(id, requestId, operationRequestId, languages, mode, clientId);
    });
  }

  private async executeModelRecommendOperation(
    messageId: string, 
    requestId: string, 
    operationRequestId: string,
    languages: string[],
    mode: 'assisted' | 'manual',
    clientId?: string
  ): Promise<ModelRecommendResponseMessage> {

    const startTime = Date.now();

    try {
      // Get machine capabilities and model recommendations
      const machineCapabilities = await this.modelSelectionService.getMachineCapabilities();
      const recommendation = await this.modelSelectionService.recommendModels({
        languages,
        mode,
        maxAlternatives: mode === 'assisted' ? 3 : 10
      });

      // Convert compatibility scores to WebSocket format
      const models: ModelCompatibilityScore[] = [];
      
      // Add all scored models (compatible and incompatible for manual mode)
      const allScores = [recommendation.primaryChoice, ...recommendation.alternatives];
      for (const score of allScores) {
        if (!score) continue;
        
        // Skip incompatible models in assisted mode
        if (mode === 'assisted' && !score.hardwareCompatible) {
          continue;
        }

        models.push({
          modelId: score.model.id,
          displayName: score.model.displayName,
          score: score.score,
          compatibility: score.hardwareCompatible ? 'supported' : this.getCompatibilityStatus(score),
          compatibilityReason: score.hardwareCompatible ? undefined : score.reasons.join(', '),
          details: {
            speed: this.formatSpeed(score.model),
            accuracy: this.formatAccuracy(score.model),
            languages: this.formatLanguageCount(score.model),
            type: this.formatModelType(score.model),
            ...(mode === 'assisted' && score === recommendation.primaryChoice && { recommendation: 'Recommended' })
          }
        });
      }

      // Add Ollama models for manual mode
      if (mode === 'manual') {
        try {
          const ollamaResult = await this.ollamaDetector.detectModels('manual');
          for (const ollamaModel of ollamaResult.models) {
            models.push({
              modelId: ollamaModel.id,
              displayName: ollamaModel.displayName,
              score: 0, // No scoring for Ollama models
              compatibility: 'user_managed',
              details: {
                speed: '-',
                accuracy: '-',
                languages: '-',
                type: 'Ollama'
              }
            });
          }
        } catch (error) {
          // Ollama detection failed - that's OK, just continue without Ollama models
          this.logger.warn('Ollama detection failed (this is OK):', error);
        }
      }

      // Build response
      const response = createModelRecommendResponse(
        messageId,
        mode,
        models,
        {
          hasGPU: machineCapabilities.gpu.type !== 'none',
          ...(machineCapabilities.gpu.vramGB !== undefined && { gpuMemoryGB: machineCapabilities.gpu.vramGB }),
          cpuCores: machineCapabilities.cpu.cores,
          ramGB: machineCapabilities.memory.totalRAMGB
        },
        mode === 'assisted' && recommendation.primaryChoice ? recommendation.primaryChoice.model.id : undefined
      );

      const duration = Date.now() - startTime;

      // Complete structured operation logging
      this.structuredLogger.logOperation('completed', 'model_recommend_request', {
        requestId: operationRequestId,
        clientId: clientId || 'unknown',
        duration,
        metadata: {
          modelCount: models.length,
          responseSize: JSON.stringify(response).length,
          mode,
          languageCount: languages.length
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
      this.structuredLogger.logOperation('failed', 'model_recommend_request', {
        requestId: operationRequestId,
        clientId: clientId || 'unknown',
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
        recommendedAction: 'Check model selection service and machine capabilities'
      });

      // Complete legacy request tracking for compatibility
      this.requestLogger.completeRequest(requestId, 'failure', {
        errorCode: 'MODEL_RECOMMEND_ERROR',
        errorMessage
      });
      
      // Return error as empty recommendation response
      return createModelRecommendResponse(
        messageId,
        mode,
        [],
        { hasGPU: false, cpuCores: 1, ramGB: 1 }
      );
    }
  }

  private getCompatibilityStatus(score: any): 'needs_gpu' | 'needs_vram' | 'incompatible' {
    const reasons = score.reasons.join(' ');
    if (reasons.includes('GPU required') || reasons.includes('No GPU')) {
      return 'needs_gpu';
    }
    if (reasons.includes('VRAM')) {
      return 'needs_vram';
    }
    return 'incompatible';
  }

  private formatSpeed(model: any): string {
    const tokensPerSec = model.requirements?.gpu?.expectedTokensPerSec ||
                         model.requirements?.cpu?.expectedTokensPerSec || 0;
    if (tokensPerSec > 200) return 'High';
    if (tokensPerSec > 100) return 'Medium';
    return 'Low';
  }

  private formatAccuracy(model: any): string {
    if (model.mtebScore) return `${model.mtebScore}%`;
    return '-';
  }

  private formatLanguageCount(model: any): string {
    const count = Object.keys(model.languagePerformance || {}).length;
    if (count > 100) return '100+';
    if (count > 50) return '50+';
    return `${count}`;
  }

  private formatModelType(model: any): string {
    if (model.huggingfaceId?.includes('Xenova')) return 'CPU';
    if (model.requirements?.gpu) return 'GPU';
    return 'Curated';
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