/**
 * Operation Outcome Tracker - Domain Layer
 * 
 * Tracks detailed operation outcomes with performance metrics, cache information,
 * and comprehensive success/failure statistics for all system operations.
 */

import { EventEmitter } from 'events';

/**
 * Cache performance metrics for an operation
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize?: number;
  evictions?: number;
}

/**
 * Performance metrics for an operation
 */
export interface PerformanceMetrics {
  duration: number;
  itemsProcessed?: number;
  throughput?: number; // items per second
  memoryUsed?: number; // bytes
  cpuTime?: number; // milliseconds
  diskIo?: {
    bytesRead: number;
    bytesWritten: number;
    operationsCount: number;
  };
  networkIo?: {
    requestCount: number;
    bytesTransferred: number;
    latency: number;
  };
}

/**
 * Operation outcome record
 */
export interface OperationOutcome {
  operationId: string;
  operationType: string;
  operationGroup: string; // e.g., 'indexing', 'serving', 'maintenance'
  status: 'success' | 'failure' | 'partial' | 'timeout';
  startTime: Date;
  endTime: Date;
  performanceMetrics: PerformanceMetrics;
  cacheMetrics?: CacheMetrics;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  context?: {
    clientId?: string;
    requestId?: string;
    folderPath?: string;
    userId?: string;
    operationPhase?: string;
  };
}

/**
 * Operation statistics aggregated over time
 */
export interface OperationStatistics {
  operationType: string;
  totalOperations: number;
  successCount: number;
  failureCount: number;
  partialCount: number;
  timeoutCount: number;
  successRate: number;
  averageDuration: number;
  totalItemsProcessed: number;
  averageThroughput: number;
  totalCacheHits: number;
  totalCacheMisses: number;
  averageCacheHitRate: number;
  lastOperationTime: Date;
  fastestOperation: number;
  slowestOperation: number;
  recentErrors: Array<{ errorCode: string; count: number; lastOccurrence: Date }>;
}

/**
 * Operation outcome tracker events
 */
export interface OperationOutcomeTrackerEvents {
  'operationStarted': (operationId: string, operationType: string) => void;
  'operationCompleted': (outcome: OperationOutcome) => void;
  'operationFailed': (outcome: OperationOutcome) => void;
  'slowOperationDetected': (outcome: OperationOutcome) => void;
  'performanceThresholdExceeded': (operationType: string, metric: string, value: number, threshold: number) => void;
}

/**
 * Operation outcome tracker implementation
 */
export class OperationOutcomeTracker extends EventEmitter {
  private activeOperations = new Map<string, { startTime: Date; operationType: string; operationGroup: string; context?: any }>();
  private operationHistory: OperationOutcome[] = [];
  private operationStats = new Map<string, OperationStatistics>();
  private operationCounter = 0;

  constructor(
    private logger: { info: (msg: string, metadata?: any) => void; error: (msg: string, error?: Error, metadata?: any) => void; warn: (msg: string, metadata?: any) => void; debug: (msg: string, metadata?: any) => void; },
    private config: {
      historyLimit: number;
      slowOperationThresholdMs: number;
      performanceThresholds: {
        memoryUsageMB: number;
        cpuTimeMs: number;
        diskIoMB: number;
      };
      logLevel: 'detailed' | 'summary' | 'minimal';
    } = {
      historyLimit: 10000,
      slowOperationThresholdMs: 5000, // 5 seconds
      performanceThresholds: {
        memoryUsageMB: 100,
        cpuTimeMs: 1000,
        diskIoMB: 50
      },
      logLevel: 'summary'
    }
  ) {
    super();
  }

  /**
   * Generate unique operation ID
   */
  generateOperationId(): string {
    this.operationCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.operationCounter.toString(36).padStart(4, '0');
    return `op_${timestamp}_${counter}`;
  }

  /**
   * Start tracking a new operation
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
    const operationId = this.generateOperationId();
    const startTime = new Date();

    this.activeOperations.set(operationId, {
      startTime,
      operationType,
      operationGroup,
      context
    });

    this.emit('operationStarted', operationId, operationType);

    if (this.config.logLevel === 'detailed') {
      this.logger.debug('Operation started', {
        operationId,
        operationType,
        operationGroup,
        context
      });
    }

    return operationId;
  }

  /**
   * Complete an operation with outcome details
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
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      this.logger.warn('Attempted to complete unknown operation', { operationId });
      return;
    }

    const endTime = new Date();
    const outcome: OperationOutcome = {
      operationId,
      operationType: operation.operationType,
      operationGroup: operation.operationGroup,
      status,
      startTime: operation.startTime,
      endTime,
      performanceMetrics,
      ...(options?.cacheMetrics && { cacheMetrics: options.cacheMetrics }),
      ...(options?.errorCode && { errorCode: options.errorCode }),
      ...(options?.errorMessage && { errorMessage: options.errorMessage }),
      ...(options?.errorDetails && { errorDetails: options.errorDetails }),
      ...(operation.context && { context: operation.context })
    };

    // Remove from active operations
    this.activeOperations.delete(operationId);

    // Add to history
    this.operationHistory.push(outcome);
    if (this.operationHistory.length > this.config.historyLimit) {
      this.operationHistory.splice(0, this.operationHistory.length - this.config.historyLimit);
    }

    // Update statistics
    this.updateOperationStatistics(outcome);

    // Log outcome
    this.logOperationOutcome(outcome);

    // Check for performance issues
    this.checkPerformanceThresholds(outcome);

    // Emit events
    this.emit('operationCompleted', outcome);
    if (status === 'failure') {
      this.emit('operationFailed', outcome);
    }

    // Check for slow operations
    if (performanceMetrics.duration > this.config.slowOperationThresholdMs) {
      this.emit('slowOperationDetected', outcome);
    }
  }

  /**
   * Get statistics for a specific operation type
   */
  getOperationStatistics(operationType: string): OperationStatistics | undefined {
    return this.operationStats.get(operationType);
  }

  /**
   * Get all operation statistics
   */
  getAllStatistics(): Map<string, OperationStatistics> {
    return new Map(this.operationStats);
  }

  /**
   * Get recent operation history
   */
  getOperationHistory(limit?: number, operationType?: string): OperationOutcome[] {
    let history = this.operationHistory;
    
    if (operationType) {
      history = history.filter(op => op.operationType === operationType);
    }
    
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get currently active operations
   */
  getActiveOperations(): Array<{ operationId: string; operationType: string; operationGroup: string; startTime: Date; duration: number }> {
    const now = Date.now();
    return Array.from(this.activeOperations.entries()).map(([operationId, operation]) => ({
      operationId,
      operationType: operation.operationType,
      operationGroup: operation.operationGroup,
      startTime: operation.startTime,
      duration: now - operation.startTime.getTime()
    }));
  }

  /**
   * Get performance summary across all operations
   */
  getPerformanceSummary(): {
    totalOperations: number;
    overallSuccessRate: number;
    averageOperationTime: number;
    totalItemsProcessed: number;
    overallCacheHitRate: number;
    operationGroups: Record<string, {
      count: number;
      successRate: number;
      averageDuration: number;
    }>;
    recentErrorPatterns: Array<{ errorCode: string; count: number; operationTypes: string[] }>;
  } {
    const allOutcomes = this.operationHistory;
    const totalOperations = allOutcomes.length;
    
    if (totalOperations === 0) {
      return {
        totalOperations: 0,
        overallSuccessRate: 0,
        averageOperationTime: 0,
        totalItemsProcessed: 0,
        overallCacheHitRate: 0,
        operationGroups: {},
        recentErrorPatterns: []
      };
    }

    const successCount = allOutcomes.filter(op => op.status === 'success').length;
    const totalDuration = allOutcomes.reduce((sum, op) => sum + op.performanceMetrics.duration, 0);
    const totalItemsProcessed = allOutcomes.reduce((sum, op) => sum + (op.performanceMetrics.itemsProcessed || 0), 0);
    
    // Cache statistics
    const cacheOps = allOutcomes.filter(op => op.cacheMetrics);
    const totalCacheHits = cacheOps.reduce((sum, op) => sum + (op.cacheMetrics?.hits || 0), 0);
    const totalCacheRequests = cacheOps.reduce((sum, op) => sum + (op.cacheMetrics?.totalRequests || 0), 0);

    // Group statistics
    const groupStats: Record<string, { operations: OperationOutcome[]; }> = {};
    allOutcomes.forEach(op => {
      if (!groupStats[op.operationGroup]) {
        groupStats[op.operationGroup] = { operations: [] };
      }
      groupStats[op.operationGroup]!.operations.push(op);
    });

    const operationGroups: Record<string, { count: number; successRate: number; averageDuration: number; }> = {};
    Object.entries(groupStats).forEach(([group, data]) => {
      const ops = data.operations;
      operationGroups[group] = {
        count: ops.length,
        successRate: (ops.filter(op => op.status === 'success').length / ops.length) * 100,
        averageDuration: ops.reduce((sum, op) => sum + op.performanceMetrics.duration, 0) / ops.length
      };
    });

    // Recent error patterns (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = allOutcomes.filter(op => 
      op.status === 'failure' && op.endTime.getTime() > oneDayAgo && op.errorCode
    );
    
    const errorPatterns = new Map<string, { count: number; operationTypes: Set<string> }>();
    recentErrors.forEach(op => {
      const key = op.errorCode!;
      if (!errorPatterns.has(key)) {
        errorPatterns.set(key, { count: 0, operationTypes: new Set() });
      }
      errorPatterns.get(key)!.count++;
      errorPatterns.get(key)!.operationTypes.add(op.operationType);
    });

    const recentErrorPatterns = Array.from(errorPatterns.entries()).map(([errorCode, data]) => ({
      errorCode,
      count: data.count,
      operationTypes: Array.from(data.operationTypes)
    })).sort((a, b) => b.count - a.count);

    return {
      totalOperations,
      overallSuccessRate: (successCount / totalOperations) * 100,
      averageOperationTime: totalDuration / totalOperations,
      totalItemsProcessed,
      overallCacheHitRate: totalCacheRequests > 0 ? (totalCacheHits / totalCacheRequests) * 100 : 0,
      operationGroups,
      recentErrorPatterns
    };
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.operationHistory = [];
    this.operationStats.clear();
    this.logger.info('Operation outcome history cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Operation outcome tracker configuration updated', config);
  }

  /**
   * Update operation statistics
   */
  private updateOperationStatistics(outcome: OperationOutcome): void {
    const { operationType } = outcome;
    let stats = this.operationStats.get(operationType);

    if (!stats) {
      stats = {
        operationType,
        totalOperations: 0,
        successCount: 0,
        failureCount: 0,
        partialCount: 0,
        timeoutCount: 0,
        successRate: 0,
        averageDuration: 0,
        totalItemsProcessed: 0,
        averageThroughput: 0,
        totalCacheHits: 0,
        totalCacheMisses: 0,
        averageCacheHitRate: 0,
        lastOperationTime: outcome.endTime,
        fastestOperation: outcome.performanceMetrics.duration,
        slowestOperation: outcome.performanceMetrics.duration,
        recentErrors: []
      };
    }

    // Update counts
    stats.totalOperations++;
    switch (outcome.status) {
      case 'success': stats.successCount++; break;
      case 'failure': stats.failureCount++; break;
      case 'partial': stats.partialCount++; break;
      case 'timeout': stats.timeoutCount++; break;
    }

    // Update rates and averages
    stats.successRate = (stats.successCount / stats.totalOperations) * 100;
    
    // Update duration statistics
    const totalDuration = (stats.averageDuration * (stats.totalOperations - 1)) + outcome.performanceMetrics.duration;
    stats.averageDuration = totalDuration / stats.totalOperations;
    stats.fastestOperation = Math.min(stats.fastestOperation, outcome.performanceMetrics.duration);
    stats.slowestOperation = Math.max(stats.slowestOperation, outcome.performanceMetrics.duration);

    // Update throughput
    if (outcome.performanceMetrics.itemsProcessed) {
      stats.totalItemsProcessed += outcome.performanceMetrics.itemsProcessed;
      stats.averageThroughput = stats.totalItemsProcessed / (stats.totalOperations * (stats.averageDuration / 1000));
    }

    // Update cache statistics
    if (outcome.cacheMetrics) {
      stats.totalCacheHits += outcome.cacheMetrics.hits;
      stats.totalCacheMisses += outcome.cacheMetrics.misses;
      const totalCacheRequests = stats.totalCacheHits + stats.totalCacheMisses;
      stats.averageCacheHitRate = totalCacheRequests > 0 ? (stats.totalCacheHits / totalCacheRequests) * 100 : 0;
    }

    // Update error tracking
    if (outcome.status === 'failure' && outcome.errorCode) {
      const existingError = stats.recentErrors.find(e => e.errorCode === outcome.errorCode);
      if (existingError) {
        existingError.count++;
        existingError.lastOccurrence = outcome.endTime;
      } else {
        stats.recentErrors.push({
          errorCode: outcome.errorCode,
          count: 1,
          lastOccurrence: outcome.endTime
        });
      }

      // Keep only recent errors (last 50)
      stats.recentErrors.sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime());
      if (stats.recentErrors.length > 50) {
        stats.recentErrors = stats.recentErrors.slice(0, 50);
      }
    }

    stats.lastOperationTime = outcome.endTime;
    this.operationStats.set(operationType, stats);
  }

  /**
   * Log operation outcome
   */
  private logOperationOutcome(outcome: OperationOutcome): void {
    const logData: any = {
      operationId: outcome.operationId,
      operationType: outcome.operationType,
      operationGroup: outcome.operationGroup,
      status: outcome.status,
      duration: outcome.performanceMetrics.duration,
      itemsProcessed: outcome.performanceMetrics.itemsProcessed,
      context: outcome.context
    };

    if (this.config.logLevel !== 'minimal') {
      logData.performanceMetrics = outcome.performanceMetrics;
      logData.cacheMetrics = outcome.cacheMetrics;
    }

    if (outcome.status === 'failure') {
      logData.errorCode = outcome.errorCode;
      logData.errorMessage = outcome.errorMessage;
      if (this.config.logLevel === 'detailed') {
        logData.errorDetails = outcome.errorDetails;
      }
      this.logger.error('Operation failed', undefined, logData);
    } else if (outcome.status === 'timeout') {
      this.logger.warn('Operation timed out', logData);
    } else if (outcome.status === 'partial') {
      this.logger.warn('Operation completed with partial success', logData);
    } else {
      this.logger.info('Operation completed successfully', logData);
    }
  }

  /**
   * Check performance thresholds and emit warnings
   */
  private checkPerformanceThresholds(outcome: OperationOutcome): void {
    const metrics = outcome.performanceMetrics;
    const thresholds = this.config.performanceThresholds;

    // Memory usage check
    if (metrics.memoryUsed && metrics.memoryUsed > thresholds.memoryUsageMB * 1024 * 1024) {
      this.emit('performanceThresholdExceeded', outcome.operationType, 'memoryUsage', 
        metrics.memoryUsed / (1024 * 1024), thresholds.memoryUsageMB);
    }

    // CPU time check
    if (metrics.cpuTime && metrics.cpuTime > thresholds.cpuTimeMs) {
      this.emit('performanceThresholdExceeded', outcome.operationType, 'cpuTime', 
        metrics.cpuTime, thresholds.cpuTimeMs);
    }

    // Disk I/O check
    if (metrics.diskIo) {
      const totalDiskIo = (metrics.diskIo.bytesRead + metrics.diskIo.bytesWritten) / (1024 * 1024);
      if (totalDiskIo > thresholds.diskIoMB) {
        this.emit('performanceThresholdExceeded', outcome.operationType, 'diskIo', 
          totalDiskIo, thresholds.diskIoMB);
      }
    }
  }
}