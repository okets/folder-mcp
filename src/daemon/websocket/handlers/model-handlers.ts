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
import { IFMDMService } from '../../services/fmdm-service.js';


/**
 * Model handlers for WebSocket protocol
 */
export class ModelHandlers {
  private requestLogger: RequestLogger;
  private structuredLogger: any;

  constructor(
    private logger: ILoggingService,
    private modelSelectionService: ModelSelectionService,
    private ollamaDetector: OllamaDetector,
    private fmdmService: IFMDMService
  ) {
    this.requestLogger = new RequestLogger(this.logger);
    this.structuredLogger = createStructuredLogger(this.logger, 'model-handler');
  }

  /**
   * Get machine capabilities - exposed for get_server_info endpoint
   */
  async getMachineCapabilities() {
    return await this.modelSelectionService.getMachineCapabilities();
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
      const recommendation = mode === 'assisted' 
        ? await this.modelSelectionService.getAssistedModeRecommendation(languages)
        : await this.modelSelectionService.getManualModeOptions(languages);

      // Convert compatibility scores to WebSocket format
      const models: ModelCompatibilityScore[] = [];
      
      // Add all scored models (compatible and incompatible for manual mode)
      const allScores = [recommendation.primaryChoice, ...recommendation.alternatives];
      const scoresToProcess = allScores.filter(score => {
        if (!score) return false;
        // Skip incompatible models in assisted mode
        if (mode === 'assisted' && !score.hardwareCompatible) return false;
        return true;
      });

      // Check local copy status for all models in parallel
      const localCopyChecks = await Promise.all(
        scoresToProcess.map(score => this.checkLocalCopy(score.model))
      );

      // Build model list with local copy status
      for (let i = 0; i < scoresToProcess.length; i++) {
        const score = scoresToProcess[i];
        const isLocalCopy = localCopyChecks[i] || false; // Ensure boolean

        if (!score) continue; // Extra safety check

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
            size: this.formatModelSize(score.model),
            localCopy: isLocalCopy,
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
                type: 'Ollama',
                size: this.formatModelSize(ollamaModel),
                localCopy: true // Ollama models are already downloaded if they're detected
              }
            });
          }
        } catch (error) {
          // Ollama detection failed - that's OK, just continue without Ollama models
          this.logger.warn('Ollama detection failed (this is OK):', error);
        }
      }

      // Add any additional locally cached models not already in the recommendations
      await this.addCachedModelsNotInRecommendations(models, languages, mode);

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
   * Check if a model is available locally - now uses FMDM cache!
   */
  private async checkLocalCopy(model: any): Promise<boolean> {
    const modelId = model.id;
    
    // For Ollama models - they are installed if detected
    if (model.source === 'ollama') {
      return true; // Ollama models are by definition installed if they're detected
    }
    
    // For curated models - instant FMDM lookup (no Python spawning!)
    const fmdm = this.fmdmService.getFMDM();
    const modelInfo = fmdm.curatedModels.find(m => m.id === modelId);
    
    if (modelInfo) {
      return modelInfo.installed;
    }
    
    // Fallback for unknown models (shouldn't happen with our curated list)
    if (modelId.includes('xenova')) {
      // Quick filesystem check for ONNX models not in FMDM
      try {
        const { ONNXDownloader } = await import('../../../infrastructure/embeddings/onnx/onnx-downloader.js');
        const downloader = new ONNXDownloader();
        return await downloader.isModelAvailable(modelId);
      } catch {
        return false;
      }
    }
    
    // For GPU models not in FMDM - assume not installed (avoids Python spawning)
    return false;
  }

  private formatModelSize(model: any): string {
    // Handle curated models (modelSizeMB property)
    if (model.modelSizeMB) {
      const sizeInMB = model.modelSizeMB;
      if (sizeInMB >= 1024) {
        const sizeInGB = sizeInMB / 1024;
        return `${sizeInGB.toFixed(1)}GB`;
      }
      return `${sizeInMB}MB`;
    }
    
    // Handle Ollama models (size property in bytes)
    if (model.size) {
      const sizeInBytes = model.size;
      const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      if (sizeInGB >= 1) {
        return `${sizeInGB.toFixed(1)}GB`;
      }
      return `${Math.round(sizeInMB)}MB`;
    }
    
    return '-';
  }

  /**
   * Get supported models - single source of truth for all model lists
   */
  getSupportedModels(): string[] {
    // Use FMDM curated models as the single source of truth
    const fmdm = this.fmdmService.getFMDM();
    return fmdm.curatedModels.map(model => model.id);
  }

  /**
   * Validate if a model is supported
   */
  isModelSupported(model: string): boolean {
    return this.getSupportedModels().includes(model);
  }

  /**
   * Get model display name by ID for better error messages
   */
  getModelDisplayName(modelId: string): string {
    // Try getting from modelSelectionService first
    const model = this.modelSelectionService.getModelById(modelId);
    if (model) {
      return model.displayName;
    }
    
    // For curated models, get displayName from curated-models.json via FMDM
    // This requires loading curated-models.json to get the displayName field
    // For now, fall back to the model ID as the display name
    return modelId;
  }

  /**
   * Get supported models with display names for error messages
   */
  getSupportedModelsWithNames(): { id: string; displayName: string }[] {
    const supportedIds = this.getSupportedModels();
    return supportedIds.map(id => ({
      id,
      displayName: this.getModelDisplayName(id)
    }));
  }

  /**
   * Add any locally cached models that aren't already in the recommendations
   */
  private async addCachedModelsNotInRecommendations(
    models: ModelCompatibilityScore[],
    languages: string[],
    mode: 'assisted' | 'manual'
  ): Promise<void> {
    // Get all supported models
    const allSupportedModelIds = this.getSupportedModels();
    const alreadyIncludedIds = new Set(models.map(m => m.modelId));
    
    // Find models not already in the recommendations
    const notIncludedIds = allSupportedModelIds.filter(id => !alreadyIncludedIds.has(id));
    
    if (notIncludedIds.length === 0) {
      return; // No additional models to check
    }

    // Check which of these models are locally cached
    const cachedModelChecks = await Promise.all(
      notIncludedIds.map(async (modelId) => {
        const model = this.modelSelectionService.getModelById(modelId);
        if (!model) return null;
        
        const isLocalCopy = await this.checkLocalCopy(model);
        return isLocalCopy ? { modelId, model } : null;
      })
    );

    // Add cached models to the list
    for (const cachedModel of cachedModelChecks) {
      if (!cachedModel) continue;

      const { model } = cachedModel;
      
      // Get basic machine capabilities for simple compatibility scoring
      const machineCapabilities = await this.modelSelectionService.getMachineCapabilities();
      
      // Actually evaluate cached models to get proper scores
      const evaluator = this.modelSelectionService.getEvaluator();
      const score = evaluator.scoreModel(model, machineCapabilities, {
        languages,
        mode,
        prioritizeAccuracy: mode === 'assisted'
      });
      
      models.push({
        modelId: model.id,
        displayName: model.displayName,
        score: score.score, // Use actual calculated score
        compatibility: score.hardwareCompatible ? 'supported' : this.getCompatibilityStatus(score),
        compatibilityReason: score.hardwareCompatible ? undefined : score.reasons.join(', '),
        details: {
          speed: this.formatSpeed(model),
          accuracy: this.formatAccuracy(model),
          languages: this.formatLanguageCount(model),
          type: this.formatModelType(model),
          size: this.formatModelSize(model),
          localCopy: true, // These are all locally cached
          recommendation: 'Previously Downloaded' // Special indicator
        }
      });
    }
  }
}