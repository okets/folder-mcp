/**
 * System Performance Telemetry - Domain Layer
 * 
 * Provides periodic performance snapshots and system health monitoring.
 * Tracks key performance indicators (KPIs) and system resource utilization.
 */

import { EventEmitter } from 'events';

/**
 * System performance snapshot
 */
export interface PerformanceSnapshot {
  timestamp: Date;
  systemMetrics: {
    memoryUsageMB: number;
    memoryUtilizationPercent: number;
    heapUsedMB: number;
    heapTotalMB: number;
    uptimeSeconds: number;
    processAgeSeconds: number;
  };
  connectionMetrics: {
    activeConnections: number;
    totalConnectionsServed: number;
    averageConnectionDurationMs: number;
    connectionErrorRate: number;
  };
  folderMetrics: {
    activeFolders: number;
    indexingFolders: number;
    pausedFolders: number;
    totalDocumentsIndexed: number;
    totalChunksGenerated: number;
  };
  queryMetrics: {
    totalQueries: number;
    averageQueryTimeMs: number;
    cacheHitRate: number;
    slowQueriesCount: number; // Queries > 5s
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    healthScore: number; // 0-100
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Performance telemetry configuration
 */
export interface TelemetryConfig {
  snapshotIntervalMs: number;
  performanceHistoryLimit: number;
  slowQueryThresholdMs: number;
  healthCheckIntervalMs: number;
  enableDetailedMetrics: boolean;
}

/**
 * System performance telemetry events
 */
export interface PerformanceTelemetryEvents {
  'snapshot': (snapshot: PerformanceSnapshot) => void;
  'healthAlert': (issue: string, severity: 'warning' | 'critical') => void;
  'performanceDegradation': (metric: string, currentValue: number, baselineValue: number) => void;
  'telemetryStarted': () => void;
  'telemetryStopped': () => void;
}

/**
 * System performance telemetry implementation
 */
export class SystemPerformanceTelemetry extends EventEmitter {
  private isActive = false;
  private telemetryInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private performanceHistory: PerformanceSnapshot[] = [];
  private startupTime = Date.now();
  private lastSnapshot: PerformanceSnapshot | null = null;

  // Connection tracking
  private connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    connectionDurations: [] as number[],
    connectionErrors: 0
  };

  // Query performance tracking
  private queryStats = {
    totalQueries: 0,
    queryTimes: [] as number[],
    slowQueries: 0,
    cacheHits: 0,
    totalCacheRequests: 0
  };

  constructor(
    private logger: { info: (msg: string, metadata?: any) => void; error: (msg: string, error?: Error, metadata?: any) => void; warn: (msg: string, metadata?: any) => void; debug: (msg: string, metadata?: any) => void; },
    private systemMonitor: { getMemoryUsage: () => Promise<any> },
    private orchestrator: { getStatistics: () => any },
    private config: TelemetryConfig = {
      snapshotIntervalMs: 5 * 60 * 1000, // 5 minutes
      performanceHistoryLimit: 288, // 24 hours of 5-minute snapshots
      slowQueryThresholdMs: 5000, // 5 seconds
      healthCheckIntervalMs: 30 * 1000, // 30 seconds
      enableDetailedMetrics: true
    }
  ) {
    super();
    this.logger.info('System Performance Telemetry initialized', {
      snapshotInterval: `${this.config.snapshotIntervalMs / 1000}s`,
      historyLimit: this.config.performanceHistoryLimit,
      slowQueryThreshold: `${this.config.slowQueryThresholdMs}ms`
    });
  }

  /**
   * Start performance telemetry monitoring
   */
  startTelemetry(): void {
    if (this.isActive) {
      this.logger.warn('Performance telemetry is already active');
      return;
    }

    this.logger.info('Starting system performance telemetry monitoring...');
    this.isActive = true;

    // Take initial snapshot
    this.takePerformanceSnapshot();

    // Start periodic snapshots
    this.telemetryInterval = setInterval(() => {
      this.takePerformanceSnapshot();
    }, this.config.snapshotIntervalMs);

    // Start health monitoring
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    this.emit('telemetryStarted');
    this.logger.info('System performance telemetry started', {
      snapshotInterval: `${this.config.snapshotIntervalMs / 1000}s`,
      healthCheckInterval: `${this.config.healthCheckIntervalMs / 1000}s`
    });
  }

  /**
   * Stop performance telemetry monitoring
   */
  stopTelemetry(): void {
    if (!this.isActive) {
      this.logger.warn('Performance telemetry is not active');
      return;
    }

    this.logger.info('Stopping system performance telemetry...');
    this.isActive = false;

    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Take final snapshot
    this.takePerformanceSnapshot();

    this.emit('telemetryStopped');
    this.logger.info('System performance telemetry stopped');
  }

  /**
   * Record connection event
   */
  recordConnection(duration?: number, isError = false): void {
    this.connectionStats.totalConnections++;
    
    if (duration) {
      this.connectionStats.activeConnections--;
      this.connectionStats.connectionDurations.push(duration);
      
      // Keep only recent durations (last 1000)
      if (this.connectionStats.connectionDurations.length > 1000) {
        this.connectionStats.connectionDurations = this.connectionStats.connectionDurations.slice(-1000);
      }
    } else {
      this.connectionStats.activeConnections++;
    }

    if (isError) {
      this.connectionStats.connectionErrors++;
    }
  }

  /**
   * Record query performance
   */
  recordQuery(durationMs: number, cacheHit = false): void {
    this.queryStats.totalQueries++;
    this.queryStats.queryTimes.push(durationMs);
    this.queryStats.totalCacheRequests++;

    if (cacheHit) {
      this.queryStats.cacheHits++;
    }

    if (durationMs > this.config.slowQueryThresholdMs) {
      this.queryStats.slowQueries++;
    }

    // Keep only recent query times (last 1000)
    if (this.queryStats.queryTimes.length > 1000) {
      this.queryStats.queryTimes = this.queryStats.queryTimes.slice(-1000);
    }
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): PerformanceSnapshot[] {
    return limit ? this.performanceHistory.slice(-limit) : this.performanceHistory;
  }

  /**
   * Get current system health status
   */
  getCurrentHealth(): { status: string; score: number; issues: string[] } {
    if (!this.lastSnapshot) {
      return { status: 'unknown', score: 0, issues: ['No telemetry data available'] };
    }

    return {
      status: this.lastSnapshot.systemHealth.status,
      score: this.lastSnapshot.systemHealth.healthScore,
      issues: this.lastSnapshot.systemHealth.issues
    };
  }

  /**
   * Take a performance snapshot
   */
  private async takePerformanceSnapshot(): Promise<void> {
    try {
      const now = new Date();
      
      // Get system metrics
      const memoryUsage = await this.systemMonitor.getMemoryUsage();
      const processAgeSeconds = (Date.now() - this.startupTime) / 1000;
      
      // Get orchestrator statistics
      const orchestratorStats = this.orchestrator.getStatistics();

      // Calculate connection metrics
      const avgConnectionDuration = this.connectionStats.connectionDurations.length > 0
        ? this.connectionStats.connectionDurations.reduce((sum, dur) => sum + dur, 0) / this.connectionStats.connectionDurations.length
        : 0;

      const connectionErrorRate = this.connectionStats.totalConnections > 0
        ? (this.connectionStats.connectionErrors / this.connectionStats.totalConnections) * 100
        : 0;

      // Calculate query metrics
      const avgQueryTime = this.queryStats.queryTimes.length > 0
        ? this.queryStats.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryStats.queryTimes.length
        : 0;

      const cacheHitRate = this.queryStats.totalCacheRequests > 0
        ? (this.queryStats.cacheHits / this.queryStats.totalCacheRequests) * 100
        : 0;

      // Create performance snapshot
      const snapshot: PerformanceSnapshot = {
        timestamp: now,
        systemMetrics: {
          memoryUsageMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
          memoryUtilizationPercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
          heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
          heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
          uptimeSeconds: Math.round(process.uptime()),
          processAgeSeconds: Math.round(processAgeSeconds)
        },
        connectionMetrics: {
          activeConnections: this.connectionStats.activeConnections,
          totalConnectionsServed: this.connectionStats.totalConnections,
          averageConnectionDurationMs: Math.round(avgConnectionDuration),
          connectionErrorRate: Math.round(connectionErrorRate * 100) / 100
        },
        folderMetrics: {
          activeFolders: orchestratorStats.activeFolders || 0,
          indexingFolders: orchestratorStats.activeFolders || 0,
          pausedFolders: orchestratorStats.pausedFolders || 0,
          totalDocumentsIndexed: 0, // Would need to be tracked
          totalChunksGenerated: 0 // Would need to be tracked
        },
        queryMetrics: {
          totalQueries: this.queryStats.totalQueries,
          averageQueryTimeMs: Math.round(avgQueryTime),
          cacheHitRate: Math.round(cacheHitRate * 100) / 100,
          slowQueriesCount: this.queryStats.slowQueries
        },
        systemHealth: this.calculateSystemHealth(memoryUsage, avgQueryTime, connectionErrorRate)
      };

      // Add to history
      this.performanceHistory.push(snapshot);
      this.lastSnapshot = snapshot;

      // Apply history limit
      if (this.performanceHistory.length > this.config.performanceHistoryLimit) {
        this.performanceHistory = this.performanceHistory.slice(-this.config.performanceHistoryLimit);
      }

      // Log the snapshot
      this.logPerformanceSnapshot(snapshot);

      // Emit snapshot event
      this.emit('snapshot', snapshot);

    } catch (error) {
      this.logger.error('Failed to take performance snapshot:', error as Error);
    }
  }

  /**
   * Calculate system health score and status
   */
  private calculateSystemHealth(memoryUsage: any, avgQueryTime: number, connectionErrorRate: number): {
    status: 'healthy' | 'warning' | 'critical';
    healthScore: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 100;

    // Memory health check
    const memoryUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUtilization > 90) {
      issues.push('Critical memory usage detected');
      recommendations.push('Consider restarting the daemon or reducing concurrent operations');
      healthScore -= 30;
    } else if (memoryUtilization > 75) {
      issues.push('High memory usage detected');
      recommendations.push('Monitor memory usage and consider reducing folder count');
      healthScore -= 15;
    }

    // Query performance check
    if (avgQueryTime > 5000) {
      issues.push('Slow query performance detected');
      recommendations.push('Check index integrity and consider reindexing');
      healthScore -= 20;
    } else if (avgQueryTime > 2000) {
      issues.push('Degraded query performance');
      recommendations.push('Monitor query patterns and cache effectiveness');
      healthScore -= 10;
    }

    // Connection error rate check
    if (connectionErrorRate > 10) {
      issues.push('High connection error rate');
      recommendations.push('Check network stability and client configurations');
      healthScore -= 25;
    } else if (connectionErrorRate > 5) {
      issues.push('Elevated connection errors');
      recommendations.push('Monitor connection patterns');
      healthScore -= 10;
    }

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (healthScore < 50) {
      status = 'critical';
    } else if (healthScore < 75) {
      status = 'warning';
    }

    return { status, healthScore: Math.max(0, healthScore), issues, recommendations };
  }

  /**
   * Log performance snapshot
   */
  private logPerformanceSnapshot(snapshot: PerformanceSnapshot): void {
    const logData = {
      timestamp: snapshot.timestamp.toISOString(),
      system: {
        memoryMB: snapshot.systemMetrics.memoryUsageMB,
        memoryUtilization: `${snapshot.systemMetrics.memoryUtilizationPercent}%`,
        uptime: `${Math.floor(snapshot.systemMetrics.uptimeSeconds / 60)}min`
      },
      connections: {
        active: snapshot.connectionMetrics.activeConnections,
        total: snapshot.connectionMetrics.totalConnectionsServed,
        avgDuration: `${snapshot.connectionMetrics.averageConnectionDurationMs}ms`,
        errorRate: `${snapshot.connectionMetrics.connectionErrorRate}%`
      },
      folders: {
        active: snapshot.folderMetrics.activeFolders,
        indexing: snapshot.folderMetrics.indexingFolders,
        paused: snapshot.folderMetrics.pausedFolders
      },
      queries: {
        total: snapshot.queryMetrics.totalQueries,
        avgTime: `${snapshot.queryMetrics.averageQueryTimeMs}ms`,
        cacheHit: `${snapshot.queryMetrics.cacheHitRate}%`,
        slowQueries: snapshot.queryMetrics.slowQueriesCount
      },
      health: {
        status: snapshot.systemHealth.status,
        score: snapshot.systemHealth.healthScore,
        issues: snapshot.systemHealth.issues.length
      }
    };

    this.logger.info('System performance telemetry snapshot', logData);

    // Log health issues separately if any
    if (snapshot.systemHealth.issues.length > 0) {
      const healthLogData = {
        status: snapshot.systemHealth.status,
        healthScore: snapshot.systemHealth.healthScore,
        issues: snapshot.systemHealth.issues,
        recommendations: snapshot.systemHealth.recommendations
      };

      if (snapshot.systemHealth.status === 'critical') {
        this.logger.error('CRITICAL system health issues detected', undefined, healthLogData);
      } else if (snapshot.systemHealth.status === 'warning') {
        this.logger.warn('System health warnings detected', healthLogData);
      }
    }
  }

  /**
   * Perform health check and emit alerts if needed
   */
  private performHealthCheck(): void {
    if (!this.lastSnapshot) {
      return;
    }

    const health = this.lastSnapshot.systemHealth;
    
    // Emit health alerts for critical issues
    if (health.status === 'critical' && health.issues.length > 0) {
      for (const issue of health.issues) {
        this.emit('healthAlert', issue, 'critical');
      }
    } else if (health.status === 'warning' && health.issues.length > 0) {
      for (const issue of health.issues) {
        this.emit('healthAlert', issue, 'warning');
      }
    }

    // Check for performance degradation compared to baseline
    if (this.performanceHistory.length > 5) {
      this.checkPerformanceDegradation();
    }
  }

  /**
   * Check for performance degradation trends
   */
  private checkPerformanceDegradation(): void {
    if (this.performanceHistory.length < 6) return;

    const recent = this.performanceHistory.slice(-3);
    const baseline = this.performanceHistory.slice(-6, -3);

    // Check memory trend
    const recentMemory = recent.reduce((sum, snap) => sum + snap.systemMetrics.memoryUsageMB, 0) / recent.length;
    const baselineMemory = baseline.reduce((sum, snap) => sum + snap.systemMetrics.memoryUsageMB, 0) / baseline.length;

    if (recentMemory > baselineMemory * 1.2) { // 20% increase
      this.emit('performanceDegradation', 'memory', recentMemory, baselineMemory);
    }

    // Check query time trend
    const recentQueryTime = recent.reduce((sum, snap) => sum + snap.queryMetrics.averageQueryTimeMs, 0) / recent.length;
    const baselineQueryTime = baseline.reduce((sum, snap) => sum + snap.queryMetrics.averageQueryTimeMs, 0) / baseline.length;

    if (recentQueryTime > baselineQueryTime * 1.5) { // 50% increase
      this.emit('performanceDegradation', 'queryTime', recentQueryTime, baselineQueryTime);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Performance telemetry configuration updated', newConfig);

    // Restart intervals if active
    if (this.isActive) {
      this.stopTelemetry();
      this.startTelemetry();
    }
  }

  /**
   * Get telemetry statistics
   */
  getStatistics(): {
    isActive: boolean;
    snapshotCount: number;
    uptimeSeconds: number;
    totalConnections: number;
    totalQueries: number;
    averageHealthScore: number;
  } {
    const averageHealthScore = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((sum, snap) => sum + snap.systemHealth.healthScore, 0) / this.performanceHistory.length
      : 0;

    return {
      isActive: this.isActive,
      snapshotCount: this.performanceHistory.length,
      uptimeSeconds: Math.round((Date.now() - this.startupTime) / 1000),
      totalConnections: this.connectionStats.totalConnections,
      totalQueries: this.queryStats.totalQueries,
      averageHealthScore: Math.round(averageHealthScore)
    };
  }
}