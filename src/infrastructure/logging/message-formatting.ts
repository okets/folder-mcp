/**
 * Consistent Message Formatting - Story 5.1
 * 
 * Provides standardized log message formats across all components
 * with structured data, correlation IDs, and consistent metadata fields.
 */

import { LogMetadata, LogLevel } from './index.js';

/**
 * Standardized message templates for common operations
 */
export const MESSAGE_TEMPLATES = {
  // Operation lifecycle
  OPERATION_STARTED: (operation: string) => `${operation} started`,
  OPERATION_PROGRESS: (operation: string) => `${operation} progress`,
  OPERATION_COMPLETED: (operation: string) => `${operation} completed`,
  OPERATION_FAILED: (operation: string) => `${operation} failed`,
  
  // Connection lifecycle
  CLIENT_CONNECTED: 'Client connected',
  CLIENT_DISCONNECTED: 'Client disconnected',
  CLIENT_ERROR: 'Client connection error',
  
  // Folder operations
  FOLDER_ADDED: 'Folder added to monitoring',
  FOLDER_REMOVED: 'Folder removed from monitoring',
  FOLDER_INDEXED: 'Folder indexing completed',
  FOLDER_ERROR: 'Folder operation failed',
  
  // System events
  DAEMON_STARTED: 'Daemon started',
  DAEMON_STOPPED: 'Daemon stopped',
  SERVICE_INITIALIZED: (service: string) => `${service} initialized`,
  SERVICE_ERROR: (service: string) => `${service} error`,
  
  // Memory and performance
  MEMORY_ALERT: 'Memory usage alert',
  PERFORMANCE_DEGRADED: 'Performance degradation detected',
  HEALTH_CHECK: 'System health check',
  
  // Protocol messages
  MESSAGE_RECEIVED: 'Protocol message received',
  MESSAGE_SENT: 'Protocol message sent',
  PROTOCOL_ERROR: 'Protocol validation error',
} as const;

/**
 * Standardized metadata field names across all components
 */
export const METADATA_FIELDS = {
  // Identifiers
  REQUEST_ID: 'requestId',
  CORRELATION_ID: 'correlationId',
  OPERATION_ID: 'operationId',
  CLIENT_ID: 'clientId',
  SESSION_ID: 'sessionId',
  
  // Component identification
  COMPONENT: 'component',
  SERVICE: 'service',
  MODULE: 'module',
  HANDLER: 'handler',
  
  // Operation details
  OPERATION: 'operation',
  ACTION: 'action',
  METHOD: 'method',
  ENDPOINT: 'endpoint',
  
  // Timing and performance
  DURATION: 'duration',
  ELAPSED_TIME: 'elapsedTime',
  START_TIME: 'startTime',
  END_TIME: 'endTime',
  TIMESTAMP: 'timestamp',
  
  // Quantities and metrics
  COUNT: 'count',
  TOTAL: 'total',
  PROCESSED: 'processed',
  REMAINING: 'remaining',
  PERCENT_COMPLETE: 'percentComplete',
  
  // File and path information
  FILE_PATH: 'filePath',
  FOLDER_PATH: 'folderPath',
  RELATIVE_PATH: 'relativePath',
  FILE_SIZE: 'fileSize',
  FILE_COUNT: 'fileCount',
  
  // Error information
  ERROR_TYPE: 'errorType',
  ERROR_CODE: 'errorCode',
  ERROR_MESSAGE: 'errorMessage',
  STACK_TRACE: 'stackTrace',
  
  // Recovery and recommendations
  RETRY_ATTEMPT: 'retryAttempt',
  WILL_RETRY: 'willRetry',
  RECOMMENDED_ACTION: 'recommendedAction',
  USER_IMPACT: 'userImpact',
  
  // System information
  MEMORY_USAGE_MB: 'memoryUsageMB',
  MEMORY_UTILIZATION_PERCENT: 'memoryUtilizationPercent',
  CPU_USAGE_PERCENT: 'cpuUsagePercent',
  DISK_USAGE_MB: 'diskUsageMB',
  
  // Network and connection
  REMOTE_ADDRESS: 'remoteAddress',
  USER_AGENT: 'userAgent',
  CONNECTION_COUNT: 'connectionCount',
  CONNECTION_DURATION: 'connectionDuration',
  
  // Business context
  MODEL_NAME: 'modelName',
  EMBEDDING_MODEL: 'embeddingModel',
  SEARCH_QUERY: 'searchQuery',
  RESULT_COUNT: 'resultCount',
} as const;

/**
 * Message formatter that enforces consistent structure
 */
export class StandardMessageFormatter {
  /**
   * Format operation lifecycle message
   */
  static formatOperationMessage(
    phase: 'started' | 'progress' | 'completed' | 'failed',
    operation: string,
    context: OperationMessageContext
  ): FormattedMessage {
    let template: string;
    let level: LogLevel;
    
    switch (phase) {
      case 'started':
        template = MESSAGE_TEMPLATES.OPERATION_STARTED(operation);
        level = 'info';
        break;
      case 'progress':
        template = MESSAGE_TEMPLATES.OPERATION_PROGRESS(operation);
        level = 'debug'; // Progress updates should be debug level unless significant
        break;
      case 'completed':
        template = MESSAGE_TEMPLATES.OPERATION_COMPLETED(operation);
        level = 'info';
        break;
      case 'failed':
        template = MESSAGE_TEMPLATES.OPERATION_FAILED(operation);
        level = 'error';
        break;
    }
    
    const metadata: LogMetadata = {
      [METADATA_FIELDS.OPERATION]: operation,
      [METADATA_FIELDS.REQUEST_ID]: context.requestId,
      [METADATA_FIELDS.COMPONENT]: context.component,
    };
    
    // Add phase-specific metadata
    if (phase === 'started' && context.estimatedDuration) {
      metadata[METADATA_FIELDS.DURATION] = context.estimatedDuration;
    }
    
    if (phase === 'progress' && context.progress) {
      metadata[METADATA_FIELDS.PERCENT_COMPLETE] = context.progress.percentComplete;
      metadata[METADATA_FIELDS.PROCESSED] = context.progress.itemsProcessed;
      metadata[METADATA_FIELDS.REMAINING] = context.progress.itemsRemaining;
    }
    
    if ((phase === 'completed' || phase === 'failed') && context.duration) {
      metadata[METADATA_FIELDS.DURATION] = context.duration;
    }
    
    if (phase === 'failed' && context.error) {
      metadata[METADATA_FIELDS.ERROR_TYPE] = context.error.name;
      metadata[METADATA_FIELDS.ERROR_MESSAGE] = context.error.message;
      metadata[METADATA_FIELDS.RECOMMENDED_ACTION] = context.recommendedAction;
    }
    
    // Add additional context
    Object.assign(metadata, context.additionalMetadata);
    
    return {
      message: template,
      level,
      metadata,
      error: phase === 'failed' ? context.error : undefined
    };
  }
  
  /**
   * Format connection lifecycle message
   */
  static formatConnectionMessage(
    event: 'connected' | 'disconnected' | 'error',
    context: ConnectionMessageContext
  ): FormattedMessage {
    let template: string;
    let level: LogLevel;
    
    switch (event) {
      case 'connected':
        template = MESSAGE_TEMPLATES.CLIENT_CONNECTED;
        level = 'info';
        break;
      case 'disconnected':
        template = MESSAGE_TEMPLATES.CLIENT_DISCONNECTED;
        level = 'info';
        break;
      case 'error':
        template = MESSAGE_TEMPLATES.CLIENT_ERROR;
        level = 'error';
        break;
    }
    
    const metadata: LogMetadata = {
      [METADATA_FIELDS.CLIENT_ID]: context.clientId,
      [METADATA_FIELDS.COMPONENT]: 'websocket-server',
    };
    
    if (context.clientType) {
      metadata.clientType = context.clientType;
    }
    
    if (context.remoteAddress) {
      metadata[METADATA_FIELDS.REMOTE_ADDRESS] = context.remoteAddress;
    }
    
    if (event === 'disconnected' && context.connectionDuration) {
      metadata[METADATA_FIELDS.CONNECTION_DURATION] = context.connectionDuration;
    }
    
    if (context.totalConnections !== undefined) {
      metadata[METADATA_FIELDS.CONNECTION_COUNT] = context.totalConnections;
    }
    
    if (event === 'disconnected' && context.reason) {
      metadata.disconnectionReason = context.reason;
    }
    
    return {
      message: template,
      level,
      metadata,
      error: event === 'error' ? context.error : undefined
    };
  }
  
  /**
   * Format folder operation message
   */
  static formatFolderMessage(
    operation: 'added' | 'removed' | 'indexed' | 'error',
    context: FolderMessageContext
  ): FormattedMessage {
    let template: string;
    let level: LogLevel;
    
    switch (operation) {
      case 'added':
        template = MESSAGE_TEMPLATES.FOLDER_ADDED;
        level = 'info';
        break;
      case 'removed':
        template = MESSAGE_TEMPLATES.FOLDER_REMOVED;
        level = 'info';
        break;
      case 'indexed':
        template = MESSAGE_TEMPLATES.FOLDER_INDEXED;
        level = 'info';
        break;
      case 'error':
        template = MESSAGE_TEMPLATES.FOLDER_ERROR;
        level = 'error';
        break;
    }
    
    const metadata: LogMetadata = {
      [METADATA_FIELDS.FOLDER_PATH]: context.folderPath,
      [METADATA_FIELDS.REQUEST_ID]: context.requestId,
      [METADATA_FIELDS.COMPONENT]: 'folder-manager',
    };
    
    if (context.modelName) {
      metadata[METADATA_FIELDS.MODEL_NAME] = context.modelName;
    }
    
    if (operation === 'indexed') {
      if (context.fileCount !== undefined) {
        metadata[METADATA_FIELDS.FILE_COUNT] = context.fileCount;
      }
      if (context.duration !== undefined) {
        metadata[METADATA_FIELDS.DURATION] = context.duration;
      }
      if (context.databaseSize) {
        metadata.databaseSizeMB = context.databaseSize;
      }
    }
    
    return {
      message: template,
      level,
      metadata,
      error: operation === 'error' ? context.error : undefined
    };
  }
  
  /**
   * Format system health message
   */
  static formatHealthMessage(
    type: 'memory' | 'performance' | 'health-check',
    context: HealthMessageContext
  ): FormattedMessage {
    let template: string;
    let level: LogLevel;
    
    switch (type) {
      case 'memory':
        template = MESSAGE_TEMPLATES.MEMORY_ALERT;
        level = context.severity === 'critical' ? 'error' : 'warn';
        break;
      case 'performance':
        template = MESSAGE_TEMPLATES.PERFORMANCE_DEGRADED;
        level = 'warn';
        break;
      case 'health-check':
        template = MESSAGE_TEMPLATES.HEALTH_CHECK;
        level = 'debug';
        break;
    }
    
    const metadata: LogMetadata = {
      [METADATA_FIELDS.COMPONENT]: 'system-monitor',
    };
    
    if (type === 'memory') {
      metadata[METADATA_FIELDS.MEMORY_USAGE_MB] = context.memoryUsageMB;
      metadata[METADATA_FIELDS.MEMORY_UTILIZATION_PERCENT] = context.memoryUtilizationPercent;
      if (context.baselineMemoryMB) {
        metadata.baselineMemoryMB = context.baselineMemoryMB;
      }
      if (context.growthRateMBPerHour) {
        metadata.growthRateMBPerHour = context.growthRateMBPerHour;
      }
      metadata[METADATA_FIELDS.RECOMMENDED_ACTION] = context.recommendedAction;
    }
    
    if (type === 'performance' && context.performanceMetrics) {
      Object.assign(metadata, context.performanceMetrics);
    }
    
    return {
      message: template,
      level,
      metadata
    };
  }
  
  /**
   * Format protocol message
   */
  static formatProtocolMessage(
    direction: 'received' | 'sent' | 'error',
    context: ProtocolMessageContext
  ): FormattedMessage {
    let template: string;
    let level: LogLevel;
    
    switch (direction) {
      case 'received':
        template = MESSAGE_TEMPLATES.MESSAGE_RECEIVED;
        level = 'debug'; // Protocol details are debug level
        break;
      case 'sent':
        template = MESSAGE_TEMPLATES.MESSAGE_SENT;
        level = 'debug';
        break;
      case 'error':
        template = MESSAGE_TEMPLATES.PROTOCOL_ERROR;
        level = 'debug'; // Protocol validation errors are debug, not user errors
        break;
    }
    
    const metadata: LogMetadata = {
      [METADATA_FIELDS.CLIENT_ID]: context.clientId,
      [METADATA_FIELDS.COMPONENT]: 'websocket-protocol',
    };
    
    if (context.messageType) {
      metadata.messageType = context.messageType;
    }
    
    if (context.messageId) {
      metadata.messageId = context.messageId;
    }
    
    if (context.correlationId) {
      metadata[METADATA_FIELDS.CORRELATION_ID] = context.correlationId;
    }
    
    if (context.payloadSize !== undefined) {
      metadata.payloadSizeBytes = context.payloadSize;
    }
    
    return {
      message: template,
      level,
      metadata,
      error: direction === 'error' ? context.error : undefined
    };
  }
}

/**
 * Correlation ID manager for request tracking
 */
export class CorrelationIdManager {
  private static requestCounter = 0;
  private static threadLocal = new Map<string, string>();
  
  /**
   * Generate a new correlation ID
   */
  static generateId(prefix: string = 'req'): string {
    return `${prefix}_${Date.now()}_${++this.requestCounter}_${Math.random().toString(36).substr(2, 6)}`;
  }
  
  /**
   * Set correlation ID for current execution context
   */
  static setCurrentId(correlationId: string): void {
    // In Node.js, we'll use a simple approach since we don't have async_hooks everywhere
    this.threadLocal.set('current', correlationId);
  }
  
  /**
   * Get current correlation ID
   */
  static getCurrentId(): string | undefined {
    return this.threadLocal.get('current');
  }
  
  /**
   * Clear current correlation ID
   */
  static clearCurrentId(): void {
    this.threadLocal.delete('current');
  }
  
  /**
   * Run function with correlation ID in context
   */
  static withId<T>(correlationId: string, fn: () => T): T {
    const previous = this.getCurrentId();
    this.setCurrentId(correlationId);
    
    try {
      return fn();
    } finally {
      if (previous) {
        this.setCurrentId(previous);
      } else {
        this.clearCurrentId();
      }
    }
  }
}

/**
 * Message context interfaces
 */
export interface OperationMessageContext {
  requestId: string;
  component: string;
  estimatedDuration?: number;
  duration?: number;
  progress?: {
    percentComplete: number;
    itemsProcessed: number;
    itemsRemaining: number;
  };
  error?: Error;
  recommendedAction?: string;
  additionalMetadata?: LogMetadata;
}

export interface ConnectionMessageContext {
  clientId: string;
  clientType?: string;
  remoteAddress?: string;
  connectionDuration?: number;
  totalConnections?: number;
  reason?: string;
  error?: Error;
}

export interface FolderMessageContext {
  folderPath: string;
  requestId: string;
  modelName?: string;
  fileCount?: number;
  duration?: number;
  databaseSize?: number;
  error?: Error;
}

export interface HealthMessageContext {
  severity?: 'warning' | 'critical';
  memoryUsageMB?: number;
  memoryUtilizationPercent?: number;
  baselineMemoryMB?: number;
  growthRateMBPerHour?: number;
  recommendedAction?: string;
  performanceMetrics?: LogMetadata;
}

export interface ProtocolMessageContext {
  clientId: string;
  messageType?: string;
  messageId?: string;
  correlationId?: string;
  payloadSize?: number;
  error?: Error;
}

export interface FormattedMessage {
  message: string;
  level: LogLevel;
  metadata: LogMetadata;
  error?: Error | undefined;
}

/**
 * Structured logging helper that enforces message formatting
 */
export class StructuredLogger {
  constructor(
    private baseLogger: { 
      debug: (msg: string, meta?: LogMetadata) => void;
      info: (msg: string, meta?: LogMetadata) => void;
      warn: (msg: string, meta?: LogMetadata) => void;
      error: (msg: string, error?: Error, meta?: LogMetadata) => void;
      fatal: (msg: string, error?: Error, meta?: LogMetadata) => void;
    },
    private defaultComponent: string
  ) {}
  
  /**
   * Log operation lifecycle events
   */
  logOperation(
    phase: 'started' | 'progress' | 'completed' | 'failed',
    operation: string,
    context: Omit<OperationMessageContext, 'component'>
  ): void {
    const formatted = StandardMessageFormatter.formatOperationMessage(
      phase, 
      operation, 
      { ...context, component: this.defaultComponent }
    );
    
    if (formatted.level === 'error' || formatted.level === 'fatal') {
      this.baseLogger[formatted.level](formatted.message, formatted.error, formatted.metadata);
    } else {
      this.baseLogger[formatted.level](formatted.message, formatted.metadata);
    }
  }
  
  /**
   * Log connection events
   */
  logConnection(
    event: 'connected' | 'disconnected' | 'error',
    context: ConnectionMessageContext
  ): void {
    const formatted = StandardMessageFormatter.formatConnectionMessage(event, context);
    
    if (formatted.error) {
      if (formatted.level === 'fatal') {
        this.baseLogger.fatal(formatted.message, formatted.error, formatted.metadata);
      } else {
        this.baseLogger.error(formatted.message, formatted.error, formatted.metadata);
      }
    } else {
      if (formatted.level === 'error' || formatted.level === 'fatal') {
        this.baseLogger[formatted.level](formatted.message, undefined, formatted.metadata);
      } else {
        this.baseLogger[formatted.level](formatted.message, formatted.metadata);
      }
    }
  }
  
  /**
   * Log folder operations
   */
  logFolder(
    operation: 'added' | 'removed' | 'indexed' | 'error',
    context: FolderMessageContext
  ): void {
    const formatted = StandardMessageFormatter.formatFolderMessage(operation, context);
    
    if (formatted.error) {
      if (formatted.level === 'fatal') {
        this.baseLogger.fatal(formatted.message, formatted.error, formatted.metadata);
      } else {
        this.baseLogger.error(formatted.message, formatted.error, formatted.metadata);
      }
    } else {
      if (formatted.level === 'error' || formatted.level === 'fatal') {
        this.baseLogger[formatted.level](formatted.message, undefined, formatted.metadata);
      } else {
        this.baseLogger[formatted.level](formatted.message, formatted.metadata);
      }
    }
  }
  
  /**
   * Log system health events
   */
  logHealth(
    type: 'memory' | 'performance' | 'health-check',
    context: HealthMessageContext
  ): void {
    const formatted = StandardMessageFormatter.formatHealthMessage(type, context);
    
    if (formatted.level === 'error' || formatted.level === 'fatal') {
      this.baseLogger[formatted.level](formatted.message, formatted.error, formatted.metadata);
    } else {
      this.baseLogger[formatted.level](formatted.message, formatted.metadata);
    }
  }
  
  /**
   * Log protocol messages
   */
  logProtocol(
    direction: 'received' | 'sent' | 'error',
    context: ProtocolMessageContext
  ): void {
    const formatted = StandardMessageFormatter.formatProtocolMessage(direction, context);
    
    if (formatted.error) {
      if (formatted.level === 'fatal') {
        this.baseLogger.fatal(formatted.message, formatted.error, formatted.metadata);
      } else {
        this.baseLogger.error(formatted.message, formatted.error, formatted.metadata);
      }
    } else {
      if (formatted.level === 'error' || formatted.level === 'fatal') {
        this.baseLogger[formatted.level](formatted.message, undefined, formatted.metadata);
      } else {
        this.baseLogger[formatted.level](formatted.message, formatted.metadata);
      }
    }
  }
}

/**
 * Factory function for creating structured loggers
 */
export function createStructuredLogger(
  baseLogger: any,
  component: string
): StructuredLogger {
  return new StructuredLogger(baseLogger, component);
}