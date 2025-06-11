/**
 * Error Infrastructure Module
 * 
 * This module provides technical error handling services,
 * including error recovery, handlers, and error tracking.
 */

// Infrastructure service interfaces
export interface IErrorHandler {
  handleError(error: Error, context: ErrorContext): Promise<ErrorHandlingResult>;
  canHandle(error: Error): boolean;
  getPriority(): number;
}

export interface IErrorRecoveryService {
  attemptRecovery(error: Error, context: ErrorContext): Promise<RecoveryResult>;
  getRecoveryStrategies(error: Error): RecoveryStrategy[];
  isRecoverable(error: Error): boolean;
}

export interface IErrorReporter {
  reportError(error: Error, context: ErrorContext): Promise<void>;
  reportMetrics(metrics: ErrorMetrics): Promise<void>;
}

// Infrastructure types
export interface ErrorContext {
  operation: string;
  component: string;
  filePath?: string;
  userId?: string;
  requestId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface ErrorHandlingResult {
  handled: boolean;
  action: ErrorAction;
  message?: string;
  recoveryAttempted: boolean;
  shouldTerminate: boolean;
}

export type ErrorAction = 
  | 'retry' 
  | 'skip' 
  | 'fallback' 
  | 'terminate' 
  | 'log' 
  | 'ignore';

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  attemptsUsed: number;
  message?: string;
  fallbackUsed?: boolean;
}

export interface RecoveryStrategy {
  name: string;
  maxAttempts: number;
  backoffMs: number;
  applicableErrors: string[]; // error class names or patterns
  execute: (error: Error, context: ErrorContext) => Promise<boolean>;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  criticalErrors: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ErrorConfiguration {
  enableRecovery: boolean;
  maxRecoveryAttempts: number;
  recoveryBackoffMs: number;
  enableReporting: boolean;
  reportingThreshold: ErrorSeverity;
  handlers: ErrorHandlerConfiguration[];
}

export interface ErrorHandlerConfiguration {
  type: string;
  priority: number;
  options: Record<string, any>;
  errorPatterns?: string[];
  components?: string[];
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CategorizedError {
  originalError: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestedActions: string[];
}

export type ErrorCategory = 
  | 'network'
  | 'filesystem'
  | 'parsing'
  | 'validation'
  | 'configuration'
  | 'authentication'
  | 'permission'
  | 'resource'
  | 'timeout'
  | 'external_service'
  | 'unknown';

export interface ErrorPattern {
  pattern: string | RegExp;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  suggestedActions: string[];
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: CategorizedError;
  context: ErrorContext;
  handlingResult: ErrorHandlingResult;
  recoveryAttempts: RecoveryAttempt[];
  resolved: boolean;
  resolutionTime?: number;
}

export interface RecoveryAttempt {
  strategy: string;
  attemptNumber: number;
  timestamp: Date;
  success: boolean;
  duration: number;
  error?: string;
}

// Infrastructure implementations (to be migrated/created)
// export { ErrorRecoveryManager } from './recovery.js';
// export { ErrorHandler, FileSystemErrorHandler } from './handlers.js';
// export { ErrorReporter } from './reporter.js';
// export { ErrorCategorizer } from './categorizer.js';

// Implementation exports
export * from './recovery';
