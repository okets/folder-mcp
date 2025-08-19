/**
 * Request Logger - Domain Layer
 * 
 * Provides enhanced request lifecycle tracking with unique IDs and full context logging.
 * Enables detailed tracing of WebSocket operations from start to completion.
 */

import { EventEmitter } from 'events';

/**
 * Request context information
 */
export interface RequestContext {
  requestId: string;
  clientId?: string;
  operationType: string;
  triggerType: 'user' | 'validation' | 'system';
  timestamp: Date;
  parameters?: Record<string, any>;
  userAgent?: string;
  sessionInfo?: Record<string, any>;
}

/**
 * Request completion information
 */
export interface RequestCompletion {
  requestId: string;
  status: 'success' | 'failure' | 'timeout';
  duration: number;
  responseSize?: number;
  errorCode?: string;
  errorMessage?: string;
  performanceMetrics?: {
    processingTime: number;
    queueTime?: number;
    networkTime?: number;
  };
}

/**
 * Request lifecycle entry
 */
export interface RequestLifecycleEntry {
  context: RequestContext;
  completion?: RequestCompletion;
  isComplete: boolean;
}

/**
 * Request logger events
 */
export interface RequestLoggerEvents {
  'requestStarted': (context: RequestContext) => void;
  'requestCompleted': (context: RequestContext, completion: RequestCompletion) => void;
  'requestTimeout': (context: RequestContext) => void;
}

/**
 * Request logger implementation
 */
export class RequestLogger extends EventEmitter {
  private activeRequests = new Map<string, RequestLifecycleEntry>();
  private requestHistory: RequestLifecycleEntry[] = [];
  private requestCounter = 0;
  private requestTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private logger: { info: (msg: string, metadata?: any) => void; error: (msg: string, error?: Error, metadata?: any) => void; warn: (msg: string, metadata?: any) => void; debug: (msg: string, metadata?: any) => void; },
    private config: {
      historyLimit: number;
      defaultTimeoutMs: number;
      logLevel: 'detailed' | 'summary' | 'minimal';
    } = {
      historyLimit: 1000,
      defaultTimeoutMs: 30000, // 30 seconds
      logLevel: 'detailed'
    }
  ) {
    super();
  }

  /**
   * Generate unique request ID
   */
  generateRequestId(): string {
    this.requestCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.requestCounter.toString(36).padStart(4, '0');
    return `req_${timestamp}_${counter}`;
  }

  /**
   * Start tracking a new request
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
    const requestId = this.generateRequestId();
    const sanitizedParams = this.sanitizeParameters(parameters);
    const context: RequestContext = {
      requestId,
      operationType,
      triggerType: options?.triggerType || 'user',
      timestamp: new Date(),
      ...(options?.clientId && { clientId: options.clientId }),
      ...(sanitizedParams && { parameters: sanitizedParams }),
      ...(options?.userAgent && { userAgent: options.userAgent }),
      ...(options?.sessionInfo && { sessionInfo: options.sessionInfo })
    };

    const entry: RequestLifecycleEntry = {
      context,
      isComplete: false
    };

    this.activeRequests.set(requestId, entry);
    
    // Set up timeout
    const timeoutMs = options?.timeoutMs || this.config.defaultTimeoutMs;
    const timeoutHandle = setTimeout(() => {
      this.handleRequestTimeout(requestId);
    }, timeoutMs);
    this.requestTimeouts.set(requestId, timeoutHandle);

    // Log request start
    this.logRequestStart(context);
    
    // Emit event
    this.emit('requestStarted', context);

    return requestId;
  }

  /**
   * Complete a request with success or failure
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
    const entry = this.activeRequests.get(requestId);
    if (!entry || entry.isComplete) {
      this.logger.warn('Attempted to complete unknown or already completed request', { requestId });
      return;
    }

    // Clear timeout
    const timeoutHandle = this.requestTimeouts.get(requestId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.requestTimeouts.delete(requestId);
    }

    // Calculate duration
    const duration = Date.now() - entry.context.timestamp.getTime();

    // Create completion record
    const completion: RequestCompletion = {
      requestId,
      status,
      duration,
      ...(options?.responseSize !== undefined && { responseSize: options.responseSize }),
      ...(options?.errorCode && { errorCode: options.errorCode }),
      ...(options?.errorMessage && { errorMessage: options.errorMessage }),
      ...(options?.performanceMetrics && { performanceMetrics: options.performanceMetrics })
    };

    // Update entry
    entry.completion = completion;
    entry.isComplete = true;

    // Move to history and remove from active
    this.requestHistory.push(entry);
    this.activeRequests.delete(requestId);

    // Apply history limit
    if (this.requestHistory.length > this.config.historyLimit) {
      this.requestHistory.splice(0, this.requestHistory.length - this.config.historyLimit);
    }

    // Log completion
    this.logRequestCompletion(entry.context, completion);

    // Emit event
    this.emit('requestCompleted', entry.context, completion);
  }

  /**
   * Get active request by ID
   */
  getActiveRequest(requestId: string): RequestLifecycleEntry | undefined {
    return this.activeRequests.get(requestId);
  }

  /**
   * Get all active requests
   */
  getActiveRequests(): RequestLifecycleEntry[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get request history
   */
  getRequestHistory(limit?: number): RequestLifecycleEntry[] {
    return limit ? this.requestHistory.slice(-limit) : this.requestHistory;
  }

  /**
   * Get request statistics
   */
  getStatistics(): {
    activeRequests: number;
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
    operationCounts: Record<string, number>;
    triggerTypeCounts: Record<string, number>;
  } {
    const completedRequests = this.requestHistory.filter(entry => entry.isComplete);
    const totalRequests = completedRequests.length;
    
    let totalResponseTime = 0;
    let successCount = 0;
    const operationCounts: Record<string, number> = {};
    const triggerTypeCounts: Record<string, number> = {};

    for (const entry of completedRequests) {
      if (entry.completion) {
        totalResponseTime += entry.completion.duration;
        if (entry.completion.status === 'success') {
          successCount++;
        }
      }

      // Count operations
      const operation = entry.context.operationType;
      operationCounts[operation] = (operationCounts[operation] || 0) + 1;

      // Count trigger types
      const trigger = entry.context.triggerType;
      triggerTypeCounts[trigger] = (triggerTypeCounts[trigger] || 0) + 1;
    }

    return {
      activeRequests: this.activeRequests.size,
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
      operationCounts,
      triggerTypeCounts
    };
  }

  /**
   * Clear request history
   */
  clearHistory(): void {
    this.requestHistory = [];
    this.logger.info('Request history cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Request logger configuration updated', config);
  }

  /**
   * Handle request timeout
   */
  private handleRequestTimeout(requestId: string): void {
    const entry = this.activeRequests.get(requestId);
    if (!entry || entry.isComplete) {
      return;
    }

    const duration = Date.now() - entry.context.timestamp.getTime();
    
    const completion: RequestCompletion = {
      requestId,
      status: 'timeout',
      duration,
      errorMessage: 'Request timed out'
    };

    entry.completion = completion;
    entry.isComplete = true;

    // Move to history
    this.requestHistory.push(entry);
    this.activeRequests.delete(requestId);
    this.requestTimeouts.delete(requestId);

    // Log timeout
    this.logger.warn('Request timed out', {
      requestId,
      operationType: entry.context.operationType,
      duration,
      clientId: entry.context.clientId
    });

    // Emit event
    this.emit('requestTimeout', entry.context);
  }

  /**
   * Log request start
   */
  private logRequestStart(context: RequestContext): void {
    const logData: any = {
      requestId: context.requestId,
      operationType: context.operationType,
      triggerType: context.triggerType,
      clientId: context.clientId,
      timestamp: context.timestamp.toISOString(),
      parametersCount: context.parameters ? Object.keys(context.parameters).length : 0
    };

    if (this.config.logLevel === 'detailed') {
      logData.parameters = context.parameters;
      logData.userAgent = context.userAgent;
      logData.sessionInfo = context.sessionInfo;
    }

    this.logger.info('Request started', logData);

    if (this.config.logLevel === 'detailed' && context.parameters) {
      this.logger.debug('Request parameters', {
        requestId: context.requestId,
        parameters: context.parameters
      });
    }
  }

  /**
   * Log request completion
   */
  private logRequestCompletion(context: RequestContext, completion: RequestCompletion): void {
    const logData: any = {
      requestId: completion.requestId,
      operationType: context.operationType,
      status: completion.status,
      duration: completion.duration,
      clientId: context.clientId,
      triggerType: context.triggerType
    };

    if (this.config.logLevel !== 'minimal') {
      logData.responseSize = completion.responseSize;
      logData.performanceMetrics = completion.performanceMetrics;
    }

    if (completion.status === 'failure') {
      logData.errorCode = completion.errorCode;
      logData.errorMessage = completion.errorMessage;
      this.logger.error('Request failed', undefined, logData);
    } else if (completion.status === 'timeout') {
      this.logger.warn('Request timed out', logData);
    } else {
      this.logger.info('Request completed successfully', logData);
    }

    // Log performance details for slow requests
    if (completion.duration > 5000) { // 5 seconds
      this.logger.warn('Slow request detected', {
        requestId: completion.requestId,
        operationType: context.operationType,
        duration: completion.duration,
        performanceMetrics: completion.performanceMetrics
      });
    }
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParameters(parameters?: Record<string, any>): Record<string, any> | undefined {
    if (!parameters) {
      return undefined;
    }

    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}