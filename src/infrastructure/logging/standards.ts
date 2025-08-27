/**
 * Logging Standards Implementation - Story 3.2
 * 
 * This module implements standardized logging guidelines and patterns
 * as defined in docs/design/daemon-logging-guidelines.md
 * 
 * Provides type-safe logging interfaces, standardized patterns,
 * and validation to ensure consistent logging across all components.
 */

import { ILoggingService, LogMetadata, LogLevel } from './index.js';
import { correlationManager } from '../../shared/utils/correlation-id.js';

/**
 * Standardized log level guidelines enforcer
 */
export class LogLevelEnforcer {
  /**
   * Validates if a log level is appropriate for the given context
   */
  static validateLevel(level: LogLevel, context: LogContext): ValidationResult {
    const violations: string[] = [];
    
    switch (level) {
      case 'debug':
        if (context.isUserFacing) {
          violations.push('User-facing operations should not use DEBUG level');
        }
        break;
        
      case 'info':
        if (context.isProtocolDetail || context.isInternalStateTransition) {
          violations.push('Protocol details and internal state changes should use DEBUG level');
        }
        if (context.isError && !context.isRecoverable) {
          violations.push('Unrecoverable errors should use ERROR level');
        }
        break;
        
      case 'warn':
        if (context.isNormalOperation) {
          violations.push('Normal operations should not use WARN level');
        }
        if (!context.isRecoverable && !context.isPerformanceConcern) {
          violations.push('WARN should be reserved for recoverable issues or performance concerns');
        }
        break;
        
      case 'error':
        if (context.isNormalOperation || !context.isError) {
          violations.push('ERROR level should only be used for actual failures');
        }
        break;
        
      case 'fatal':
        if (!context.requiresRestart) {
          violations.push('FATAL level requires system restart or critical failure');
        }
        break;
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      suggestedLevel: this.suggestLevel(context)
    };
  }
  
  private static suggestLevel(context: LogContext): LogLevel {
    if (context.requiresRestart) return 'fatal';
    if (context.isError && !context.isRecoverable) return 'error';
    if (context.isPerformanceConcern || (context.isRecoverable && context.isError)) return 'warn';
    if (context.isUserFacing || context.isOperationalEvent) return 'info';
    return 'debug';
  }
}

/**
 * Context information for log level validation
 */
export interface LogContext {
  isUserFacing: boolean;
  isOperationalEvent: boolean;
  isProtocolDetail: boolean;
  isInternalStateTransition: boolean;
  isError: boolean;
  isRecoverable: boolean;
  isPerformanceConcern: boolean;
  requiresRestart: boolean;
  isNormalOperation: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  suggestedLevel: LogLevel;
}

/**
 * Standardized logging patterns implementing guidelines
 */
export class StandardizedLogger {
  constructor(
    private logger: ILoggingService,
    private component: string,
    private validateLevels: boolean = process.env.NODE_ENV === 'development'
  ) {}
  
  /**
   * Log operation start with standardized format
   */
  logOperationStart(operation: string, context: OperationContext): string {
    const requestId = context.requestId || this.generateRequestId();
    
    this.logger.info(`${operation} started`, {
      requestId,
      component: this.component,
      clientId: context.clientId,
      ...context.metadata
    });
    
    return requestId;
  }
  
  /**
   * Log operation progress with standardized format
   */
  logOperationProgress(requestId: string, progress: ProgressUpdate): void {
    // Only log progress at significant intervals to avoid spam
    if (this.shouldLogProgress(progress)) {
      this.logger.info('Operation progress', {
        requestId,
        component: this.component,
        progress: progress.percentComplete,
        itemsProcessed: progress.itemsProcessed,
        itemsRemaining: progress.itemsRemaining,
        estimatedCompletion: progress.estimatedCompletion
      });
    }
  }
  
  /**
   * Log operation completion with standardized format
   */
  logOperationComplete(requestId: string, outcome: OperationOutcome): void {
    const duration = outcome.endTime - outcome.startTime;
    const success = outcome.success;
    
    const metadata = {
      requestId,
      component: this.component,
      success,
      duration,
      ...outcome.metrics
    };
    
    if (success) {
      this.logger.info(`Operation completed`, metadata);
    } else {
      this.logger.error(`Operation failed`, outcome.error, metadata);
    }
  }
  
  /**
   * Log memory status with intelligent thresholds
   */
  logMemoryStatus(context: MemoryContext): void {
    const memoryMB = Math.round(context.currentUsage / (1024 * 1024));
    const baselineMB = Math.round(context.baseline / (1024 * 1024));
    const systemUtilization = (context.currentUsage / context.systemMemory) * 100;
    
    if (context.trend === 'growing' && context.growthRate > 10) {
      this.logger.warn('Memory growth detected', {
        component: this.component,
        currentUsageMB: memoryMB,
        baselineMB,
        growthRateMBPerHour: context.growthRate,
        systemUtilizationPercent: Math.round(systemUtilization * 100) / 100,
        trend: context.trend,
        recommendation: this.getMemoryRecommendation(context)
      });
    } else if (systemUtilization > 90) {
      this.logger.error('Critical memory usage', undefined, {
        component: this.component,
        currentUsageMB: memoryMB,
        systemUtilizationPercent: Math.round(systemUtilization * 100) / 100,
        recommendation: 'Immediate action required - restart daemon'
      });
    } else {
      // Normal monitoring - DEBUG level only
      this.logger.debug('Memory status', {
        component: this.component,
        usageMB: memoryMB,
        baselineMB,
        trend: context.trend,
        systemUtilizationPercent: Math.round(systemUtilization * 100) / 100
      });
    }
  }
  
  /**
   * Log performance metrics with baseline comparison
   */
  logPerformanceMetrics(operation: string, metrics: PerformanceMetrics): void {
    const isPerformanceDegraded = metrics.current > metrics.baseline * 1.5;
    const level = isPerformanceDegraded ? 'warn' : 'debug';
    
    this.logger[level](`Performance metrics: ${operation}`, {
      component: this.component,
      operation,
      currentMs: metrics.current,
      baselineMs: metrics.baseline,
      degradationPercent: Math.round(((metrics.current - metrics.baseline) / metrics.baseline) * 100),
      throughput: metrics.throughput,
      recommendation: isPerformanceDegraded 
        ? 'Monitor system resources and consider optimization'
        : undefined
    });
  }
  
  /**
   * Log errors with comprehensive context
   */
  logError(operation: string, error: Error, context: ErrorContext): void {
    const metadata = {
      component: this.component,
      operation,
      requestId: context.requestId || 'unknown',
      errorType: error.name,
      recoveryAttempts: context.recoveryAttempts || 0,
      willRetry: context.willRetry || false,
      userImpact: context.userImpact || undefined,
      recommendedAction: context.recommendedAction || undefined,
      ...context.additionalContext
    };
    
    this.logger.error(`${operation} failed`, error, metadata);
  }
  
  /**
   * Log connection lifecycle events
   */
  logConnection(event: 'connected' | 'disconnected', clientId: string, metadata: ConnectionMetadata): void {
    this.logger.info(`Client ${event}`, {
      component: this.component,
      clientId,
      clientType: metadata.clientType,
      remoteAddress: metadata.remoteAddress,
      connectionDuration: event === 'disconnected' ? metadata.duration : undefined,
      totalConnections: metadata.totalConnections,
      reason: event === 'disconnected' ? metadata.reason : undefined
    });
  }
  
  /**
   * Log protocol messages at appropriate level
   */
  logProtocolMessage(direction: 'incoming' | 'outgoing', clientId: string, message: ProtocolMessage): void {
    // Protocol details are DEBUG level, not INFO
    this.logger.debug(`Message ${direction}`, {
      component: this.component,
      clientId,
      messageType: message.type,
      messageId: message.id,
      correlationId: message.correlationId,
      payloadSize: message.payloadSize
    });
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private shouldLogProgress(progress: ProgressUpdate): boolean {
    // Log at 25% intervals or every minute, whichever comes first
    const percentThreshold = progress.percentComplete % 25 === 0;
    const timeThreshold = Date.now() - (progress.lastLogTime || 0) > 60000;
    
    return percentThreshold || timeThreshold;
  }
  
  private getMemoryRecommendation(context: MemoryContext): string {
    if (context.growthRate > 50) {
      return 'Potential memory leak detected - investigate immediately';
    } else if (context.growthRate > 20) {
      return 'Monitor memory usage patterns and consider reducing concurrent operations';
    } else {
      return 'Monitor for continued growth trend';
    }
  }
}

/**
 * Supporting interfaces for standardized logging
 */
export interface OperationContext {
  requestId?: string;
  clientId?: string;
  metadata?: LogMetadata;
}

export interface ProgressUpdate {
  percentComplete: number;
  itemsProcessed: number;
  itemsRemaining: number;
  estimatedCompletion?: string;
  lastLogTime?: number;
}

export interface OperationOutcome {
  success: boolean;
  startTime: number;
  endTime: number;
  error?: Error;
  metrics?: LogMetadata;
}

export interface MemoryContext {
  currentUsage: number;
  baseline: number;
  systemMemory: number;
  trend: 'stable' | 'growing' | 'oscillating';
  growthRate: number; // MB/hour
}

export interface PerformanceMetrics {
  current: number;
  baseline: number;
  throughput?: number;
}

export interface ErrorContext {
  requestId?: string;
  recoveryAttempts?: number;
  willRetry?: boolean;
  userImpact?: string;
  recommendedAction?: string;
  additionalContext?: LogMetadata;
}

export interface ConnectionMetadata {
  clientType: string;
  remoteAddress?: string;
  duration?: number;
  totalConnections: number;
  reason?: string;
}

export interface ProtocolMessage {
  type: string;
  id: string;
  correlationId?: string;
  payloadSize: number;
}

/**
 * Logging standards compliance checker
 */
export class LoggingStandardsChecker {
  private violations: string[] = [];
  
  /**
   * Check a log statement for compliance with standards
   */
  checkLogStatement(
    level: LogLevel, 
    message: string, 
    metadata?: LogMetadata,
    context?: Partial<LogContext>
  ): ComplianceResult {
    this.violations = [];
    
    // Check level appropriateness
    if (context) {
      const validation = LogLevelEnforcer.validateLevel(level, context as LogContext);
      if (!validation.isValid) {
        this.violations.push(...validation.violations);
      }
    }
    
    // Check message quality
    this.checkMessageQuality(message);
    
    // Check metadata completeness
    this.checkMetadataCompleteness(level, metadata);
    
    return {
      isCompliant: this.violations.length === 0,
      violations: this.violations,
      suggestions: this.generateSuggestions(level, message, metadata)
    };
  }
  
  private checkMessageQuality(message: string): void {
    if (message.length < 10) {
      this.violations.push('Message too brief - provide sufficient context');
    }
    
    if (!/^[A-Z]/.test(message)) {
      this.violations.push('Message should start with capital letter');
    }
    
    if (message.includes('error') && message.toLowerCase().includes('error')) {
      // Allow 'error' in messages but check for redundancy
    }
    
    const vagueTerms = ['something', 'stuff', 'thing', 'issue', 'problem'];
    if (vagueTerms.some(term => message.toLowerCase().includes(term))) {
      this.violations.push('Message contains vague terminology - be specific');
    }
  }
  
  private checkMetadataCompleteness(level: LogLevel, metadata?: LogMetadata): void {
    if (level === 'error' || level === 'fatal') {
      if (!metadata?.requestId && !metadata?.correlationId) {
        this.violations.push('Error logs should include request/correlation ID for tracing');
      }
    }
    
    if (metadata?.duration !== undefined && typeof metadata.duration !== 'number') {
      this.violations.push('Duration should be a number (milliseconds)');
    }
  }
  
  private generateSuggestions(level: LogLevel, message: string, metadata?: LogMetadata): string[] {
    const suggestions: string[] = [];
    
    if (level === 'info' && message.includes('started')) {
      suggestions.push('Consider adding estimated duration or expected outcome');
    }
    
    if (level === 'error' && !metadata?.recommendedAction) {
      suggestions.push('Include recommended action or next steps for error resolution');
    }
    
    if (!metadata?.component && !metadata?.source) {
      suggestions.push('Add component identifier for better log organization');
    }
    
    return suggestions;
  }
}

export interface ComplianceResult {
  isCompliant: boolean;
  violations: string[];
  suggestions: string[];
}

/**
 * Factory function for creating standardized loggers
 */
export function createStandardizedLogger(
  baseLogger: ILoggingService, 
  component: string,
  options: { validateLevels?: boolean } = {}
): StandardizedLogger {
  return new StandardizedLogger(baseLogger, component, options.validateLevels);
}

/**
 * Utility functions for common logging patterns
 */
export class LoggingPatterns {
  /**
   * Create timing wrapper for operations
   */
  static createTimedOperation<T>(
    logger: StandardizedLogger,
    operationName: string,
    context: OperationContext
  ) {
    const startTime = Date.now();
    const requestId = logger.logOperationStart(operationName, context);
    
    return {
      requestId,
      complete: (result: { success: boolean; error?: Error; metrics?: LogMetadata }) => {
        logger.logOperationComplete(requestId, {
          ...result,
          startTime,
          endTime: Date.now()
        });
      }
    };
  }
  
  /**
   * Create correlation ID context for request tracking
   */
  static withCorrelationId<T>(correlationId: string, operation: () => T): T {
    return correlationManager.runWithNewId('manual', operation, { correlationId });
  }
  
  /**
   * Generate unique operation ID
   */
  static generateOperationId(prefix: string = 'op'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}