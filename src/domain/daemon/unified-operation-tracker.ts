/**
 * Unified Operation Tracker - Domain Layer
 * 
 * Combines RequestLogger and OperationOutcomeTracker to provide comprehensive
 * operation tracking with request context, performance metrics, and cache statistics.
 */

import { RequestLogger, RequestContext, RequestCompletion } from './request-logger.js';
import { OperationOutcomeTracker, OperationOutcome, PerformanceMetrics, CacheMetrics } from './operation-outcome-tracker.js';

/**
 * Unified tracking entry that combines request and operation information
 */
export interface UnifiedTrackingEntry {
  requestId?: string;
  operationId?: string;
  type: 'request' | 'operation' | 'both';
  operationType: string;
  status: 'active' | 'completed' | 'failed' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  context?: {
    clientId?: string;
    folderPath?: string;
    operationGroup?: string;
    triggerType?: 'user' | 'validation' | 'system';
  };
  performanceMetrics?: PerformanceMetrics;
  cacheMetrics?: CacheMetrics;
  errorInfo?: {
    errorCode?: string;
    errorMessage?: string;
  };
}

/**
 * Unified operation tracker that combines request and operation tracking
 */
export class UnifiedOperationTracker {
  private requestLogger!: RequestLogger;
  private operationTracker!: OperationOutcomeTracker;
  private unifiedEntries = new Map<string, UnifiedTrackingEntry>();

  constructor(
    private logger: { info: (msg: string, metadata?: any) => void; error: (msg: string, error?: Error, metadata?: any) => void; warn: (msg: string, metadata?: any) => void; debug: (msg: string, metadata?: any) => void; },
    private config?: {
      enableRequestTracking?: boolean;
      enableOperationTracking?: boolean;
      correlateRequestsAndOperations?: boolean;
    }
  ) {
    const finalConfig = {
      enableRequestTracking: true,
      enableOperationTracking: true,
      correlateRequestsAndOperations: true,
      ...config
    };

    if (finalConfig.enableRequestTracking) {
      this.requestLogger = new RequestLogger(this.logger);
      this.setupRequestLoggerEvents();
    }

    if (finalConfig.enableOperationTracking) {
      this.operationTracker = new OperationOutcomeTracker(this.logger);
      this.setupOperationTrackerEvents();
    }
  }

  /**
   * Start tracking a user request (WebSocket, HTTP, etc.)
   */
  startRequest(
    operationType: string,
    parameters?: Record<string, any>,
    options?: {
      clientId?: string;
      triggerType?: 'user' | 'validation' | 'system';
      timeoutMs?: number;
      userAgent?: string;
      sessionInfo?: Record<string, any>;
    }
  ): string {
    if (!this.requestLogger) {
      throw new Error('Request tracking not enabled');
    }

    const requestId = this.requestLogger.startRequest(operationType, parameters, options);
    
    // Create unified entry
    const entry: UnifiedTrackingEntry = {
      requestId,
      type: 'request',
      operationType,
      status: 'active',
      startTime: new Date(),
      context: {
        ...(options?.clientId && { clientId: options.clientId }),
        ...(options?.triggerType && { triggerType: options.triggerType })
      }
    };
    
    this.unifiedEntries.set(requestId, entry);
    return requestId;
  }

  /**
   * Complete a request
   */
  completeRequest(
    requestId: string,
    status: 'success' | 'failure',
    options?: {
      responseSize?: number;
      errorCode?: string;
      errorMessage?: string;
      performanceMetrics?: {
        processingTime: number;
        queueTime?: number;
        networkTime?: number;
      };
    }
  ): void {
    if (!this.requestLogger) {
      throw new Error('Request tracking not enabled');
    }

    this.requestLogger.completeRequest(requestId, status, options);
    
    // Update unified entry
    const entry = this.unifiedEntries.get(requestId);
    if (entry) {
      entry.status = status === 'success' ? 'completed' : 'failed';
      entry.endTime = new Date();
      entry.duration = entry.endTime.getTime() - entry.startTime.getTime();
      
      if (options?.errorCode || options?.errorMessage) {
        entry.errorInfo = {
          ...(options.errorCode && { errorCode: options.errorCode }),
          ...(options.errorMessage && { errorMessage: options.errorMessage })
        };
      }
    }
  }

  /**
   * Start tracking a system operation (indexing, serving, etc.)
   */
  startOperation(
    operationType: string,
    operationGroup: string,
    context?: {
      clientId?: string;
      requestId?: string;
      folderPath?: string;
      userId?: string;
      operationPhase?: string;
    }
  ): string {
    if (!this.operationTracker) {
      throw new Error('Operation tracking not enabled');
    }

    const operationId = this.operationTracker.startOperation(operationType, operationGroup, context);
    
    // Create unified entry
    const entry: UnifiedTrackingEntry = {
      operationId,
      type: 'operation',
      operationType,
      status: 'active',
      startTime: new Date(),
      context: {
        ...(context?.clientId && { clientId: context.clientId }),
        ...(context?.folderPath && { folderPath: context.folderPath }),
        operationGroup
      }
    };
    
    this.unifiedEntries.set(operationId, entry);
    
    // If we have a request ID, try to correlate
    if (context?.requestId && this.unifiedEntries.has(context.requestId)) {
      const requestEntry = this.unifiedEntries.get(context.requestId)!;
      if (requestEntry.type === 'request') {
        // Create a combined entry
        const combinedEntry: UnifiedTrackingEntry = {
          requestId: context.requestId,
          operationId,
          type: 'both',
          operationType: requestEntry.operationType,
          status: 'active',
          startTime: requestEntry.startTime,
          context: {
            ...requestEntry.context,
            ...entry.context
          }
        };
        
        this.unifiedEntries.set(`${context.requestId}_${operationId}`, combinedEntry);
      }
    }
    
    return operationId;
  }

  /**
   * Complete an operation
   */
  completeOperation(
    operationId: string,
    status: 'success' | 'failure' | 'partial' | 'timeout',
    performanceMetrics: PerformanceMetrics,
    options?: {
      cacheMetrics?: CacheMetrics;
      errorCode?: string;
      errorMessage?: string;
      errorDetails?: Record<string, any>;
    }
  ): void {
    if (!this.operationTracker) {
      throw new Error('Operation tracking not enabled');
    }

    this.operationTracker.completeOperation(operationId, status, performanceMetrics, options);
    
    // Update unified entry
    const entry = this.unifiedEntries.get(operationId);
    if (entry) {
      entry.status = status === 'success' ? 'completed' : 
                   status === 'failure' ? 'failed' : 
                   status === 'timeout' ? 'timeout' : 'completed';
      entry.endTime = new Date();
      entry.duration = entry.endTime.getTime() - entry.startTime.getTime();
      entry.performanceMetrics = performanceMetrics;
      if (options?.cacheMetrics) {
        entry.cacheMetrics = options.cacheMetrics;
      }
      
      if (options?.errorCode || options?.errorMessage) {
        entry.errorInfo = {
          ...(options.errorCode && { errorCode: options.errorCode }),
          ...(options.errorMessage && { errorMessage: options.errorMessage })
        };
      }
    }
  }

  /**
   * Start tracking both request and operation together
   */
  startRequestWithOperation(
    operationType: string,
    operationGroup: string,
    parameters?: Record<string, any>,
    options?: {
      clientId?: string;
      folderPath?: string;
      triggerType?: 'user' | 'validation' | 'system';
      timeoutMs?: number;
    }
  ): { requestId: string; operationId: string } {
    const requestId = this.startRequest(operationType, parameters, {
      ...(options?.clientId && { clientId: options.clientId }),
      ...(options?.triggerType && { triggerType: options.triggerType }),
      ...(options?.timeoutMs && { timeoutMs: options.timeoutMs })
    });

    const operationId = this.startOperation(operationType, operationGroup, {
      ...(options?.clientId && { clientId: options.clientId }),
      requestId,
      ...(options?.folderPath && { folderPath: options.folderPath })
    });

    return { requestId, operationId };
  }

  /**
   * Complete both request and operation together
   */
  completeBoth(
    requestId: string,
    operationId: string,
    status: 'success' | 'failure',
    performanceMetrics: PerformanceMetrics,
    options?: {
      responseSize?: number;
      cacheMetrics?: CacheMetrics;
      errorCode?: string;
      errorMessage?: string;
      errorDetails?: Record<string, any>;
    }
  ): void {
    // Complete operation first
    this.completeOperation(operationId, status === 'failure' ? 'failure' : 'success', performanceMetrics, {
      ...(options?.cacheMetrics && { cacheMetrics: options.cacheMetrics }),
      ...(options?.errorCode && { errorCode: options.errorCode }),
      ...(options?.errorMessage && { errorMessage: options.errorMessage }),
      ...(options?.errorDetails && { errorDetails: options.errorDetails })
    });

    // Then complete request
    this.completeRequest(requestId, status, {
      ...(options?.responseSize !== undefined && { responseSize: options.responseSize }),
      ...(options?.errorCode && { errorCode: options.errorCode }),
      ...(options?.errorMessage && { errorMessage: options.errorMessage }),
      performanceMetrics: {
        processingTime: performanceMetrics.duration
      }
    });
  }

  /**
   * Get unified tracking entries
   */
  getUnifiedEntries(limit?: number, operationType?: string): UnifiedTrackingEntry[] {
    let entries = Array.from(this.unifiedEntries.values());
    
    if (operationType) {
      entries = entries.filter(entry => entry.operationType === operationType);
    }
    
    entries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    return limit ? entries.slice(0, limit) : entries;
  }

  /**
   * Get request statistics
   */
  getRequestStatistics() {
    return this.requestLogger?.getStatistics();
  }

  /**
   * Get operation statistics
   */
  getOperationStatistics(operationType?: string) {
    if (operationType) {
      return this.operationTracker?.getOperationStatistics(operationType);
    }
    return this.operationTracker?.getAllStatistics();
  }

  /**
   * Get comprehensive performance summary
   */
  getPerformanceSummary() {
    const requestStats = this.requestLogger?.getStatistics();
    const operationSummary = this.operationTracker?.getPerformanceSummary();
    
    return {
      requests: requestStats,
      operations: operationSummary,
      unified: {
        totalTrackedEntries: this.unifiedEntries.size,
        correlatedEntries: Array.from(this.unifiedEntries.values()).filter(e => e.type === 'both').length
      }
    };
  }

  /**
   * Setup request logger events
   */
  private setupRequestLoggerEvents(): void {
    if (!this.requestLogger) return;

    this.requestLogger.on('requestStarted', (context: RequestContext) => {
      this.logger.debug('Unified tracker: Request started', {
        requestId: context.requestId,
        operationType: context.operationType,
        triggerType: context.triggerType
      });
    });

    this.requestLogger.on('requestCompleted', (context: RequestContext, completion: RequestCompletion) => {
      this.logger.debug('Unified tracker: Request completed', {
        requestId: context.requestId,
        status: completion.status,
        duration: completion.duration
      });
    });
  }

  /**
   * Setup operation tracker events
   */
  private setupOperationTrackerEvents(): void {
    if (!this.operationTracker) return;

    this.operationTracker.on('operationStarted', (operationId: string, operationType: string) => {
      this.logger.debug('Unified tracker: Operation started', {
        operationId,
        operationType
      });
    });

    this.operationTracker.on('operationCompleted', (outcome: OperationOutcome) => {
      this.logger.debug('Unified tracker: Operation completed', {
        operationId: outcome.operationId,
        operationType: outcome.operationType,
        status: outcome.status,
        duration: outcome.performanceMetrics.duration,
        itemsProcessed: outcome.performanceMetrics.itemsProcessed
      });
    });

    this.operationTracker.on('slowOperationDetected', (outcome: OperationOutcome) => {
      this.logger.warn('Slow operation detected', {
        operationId: outcome.operationId,
        operationType: outcome.operationType,
        duration: outcome.performanceMetrics.duration,
        itemsProcessed: outcome.performanceMetrics.itemsProcessed
      });
    });

    this.operationTracker.on('performanceThresholdExceeded', (operationType: string, metric: string, value: number, threshold: number) => {
      this.logger.warn('Performance threshold exceeded', {
        operationType,
        metric,
        value,
        threshold,
        exceedancePercentage: ((value - threshold) / threshold) * 100
      });
    });
  }
}