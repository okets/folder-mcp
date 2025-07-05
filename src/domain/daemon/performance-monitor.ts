/**
 * Performance Monitor - Domain Layer
 * 
 * Monitors daemon and system performance with configurable metrics collection.
 * Provides comprehensive performance tracking and reporting.
 */

import { EventEmitter } from 'events';
import { 
  IPerformanceMonitor, 
  ISystemMonitor,
  PerformanceMetrics,
  MetricRecord
} from './interfaces.js';
import { PerformanceConfig } from '../../config/schema/daemon.js';

/**
 * Performance monitor events
 */
export interface PerformanceMonitorEvents {
  'metricsCollected': (metrics: PerformanceMetrics) => void;
  'monitoringStarted': () => void;
  'monitoringStopped': () => void;
  'metricThresholdExceeded': (metric: string, value: number, threshold: number) => void;
}

/**
 * Metric type enumeration
 */
export enum MetricType {
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  HEAP_USAGE = 'heap_usage',
  DISK_USAGE = 'disk_usage',
  UPTIME = 'uptime',
  PROCESS_COUNT = 'process_count',
  CUSTOM = 'custom'
}

/**
 * Performance monitor implementation
 */
export class PerformanceMonitor extends EventEmitter implements IPerformanceMonitor {
  private isMonitoringActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: Map<string, MetricRecord[]> = new Map();
  private customMetrics: Map<string, number> = new Map();
  private startTime = Date.now();
  private lastCollectionTime: Date | null = null;

  constructor(
    private config: PerformanceConfig,
    private systemMonitor: ISystemMonitor,
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {
    super();
    this.initializeMetricsHistory();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoringActive) {
      this.logger.warn('Performance monitoring is already active');
      return;
    }

    if (!this.config.monitoring) {
      this.logger.info('Performance monitoring is disabled in configuration');
      return;
    }

    this.logger.info('Starting performance monitoring...');
    this.isMonitoringActive = true;
    
    // Start monitoring interval
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      this.config.metricsInterval
    );

    // Collect initial metrics
    this.collectMetrics();

    this.emit('monitoringStarted');
    this.logger.info(`Performance monitoring started with ${this.config.metricsInterval}ms interval`);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoringActive) {
      this.logger.warn('Performance monitoring is not active');
      return;
    }

    this.logger.info('Stopping performance monitoring...');
    this.isMonitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoringStopped');
    this.logger.info('Performance monitoring stopped');
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const now = new Date();
    const uptime = Date.now() - this.startTime;

    return {
      timestamp: now,
      uptime,
      cpu: this.getLatestMetric(MetricType.CPU_USAGE) || 0,
      memory: {
        rss: this.getLatestMetric('memory_rss') || 0,
        heapUsed: this.getLatestMetric('memory_heap_used') || 0,
        heapTotal: this.getLatestMetric('memory_heap_total') || 0,
        external: this.getLatestMetric('memory_external') || 0
      },
      disk: {
        used: this.getLatestMetric('disk_used') || 0,
        free: this.getLatestMetric('disk_free') || 0,
        total: this.getLatestMetric('disk_total') || 0
      },
      processCount: this.getLatestMetric(MetricType.PROCESS_COUNT) || 0,
      customMetrics: Object.fromEntries(this.customMetrics),
      collectionInfo: {
        lastCollection: this.lastCollectionTime,
        totalCollections: this.getTotalCollections(),
        monitoringActive: this.isMonitoringActive,
        intervalMs: this.config.metricsInterval
      }
    };
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number): void {
    this.logger.debug(`Recording custom metric: ${name} = ${value}`);
    
    this.customMetrics.set(name, value);
    this.addMetricToHistory(name, {
      timestamp: new Date(),
      value,
      type: MetricType.CUSTOM
    });

    // Check for threshold violations
    this.checkMetricThresholds(name, value);
  }

  /**
   * Get historical metrics for a specific metric
   */
  getHistoricalMetrics(metricName: string, limit?: number): MetricRecord[] {
    const history = this.metricsHistory.get(metricName) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  /**
   * Update performance configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if active to apply new config
    if (this.isMonitoringActive) {
      this.stopMonitoring();
      this.startMonitoring();
    }
    
    this.logger.info('Performance monitoring configuration updated');
  }

  /**
   * Get performance statistics
   */
  getStatistics(): {
    totalCollections: number;
    averageCollectionTime: number;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    cpuAverageLastHour: number;
    uptimeHours: number;
  } {
    const totalCollections = this.getTotalCollections();
    const memoryHistory = this.getHistoricalMetrics('memory_heap_used', 10);
    const cpuHistory = this.getHistoricalMetrics(MetricType.CPU_USAGE, 60); // Last hour assuming 1min intervals
    
    return {
      totalCollections,
      averageCollectionTime: this.calculateAverageCollectionTime(),
      memoryTrend: this.calculateMemoryTrend(memoryHistory),
      cpuAverageLastHour: this.calculateAverage(cpuHistory),
      uptimeHours: (Date.now() - this.startTime) / (1000 * 60 * 60)
    };
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.metricsHistory.clear();
    this.customMetrics.clear();
    this.logger.info('Performance metrics history cleared');
  }

  /**
   * Initialize metrics history storage
   */
  private initializeMetricsHistory(): void {
    const metricTypes = [
      MetricType.CPU_USAGE,
      MetricType.MEMORY_USAGE,
      'memory_rss',
      'memory_heap_used',
      'memory_heap_total',
      'memory_external',
      MetricType.DISK_USAGE,
      'disk_used',
      'disk_free',
      'disk_total',
      MetricType.UPTIME,
      MetricType.PROCESS_COUNT
    ];

    for (const type of metricTypes) {
      this.metricsHistory.set(type, []);
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      this.logger.debug('Collecting performance metrics...');
      const startTime = Date.now();

      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        cpu: 0,
        memory: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
        disk: { used: 0, free: 0, total: 0 },
        processCount: 0,
        customMetrics: {},
        collectionInfo: {
          lastCollection: new Date(),
          totalCollections: 0,
          monitoringActive: true,
          intervalMs: this.config.metricsInterval
        }
      };

      // Collect CPU metrics if enabled
      if (this.config.cpuTracking) {
        try {
          const cpuUsage = await this.systemMonitor.getCpuUsage();
          metrics.cpu = cpuUsage.total;
          this.addMetricToHistory(MetricType.CPU_USAGE, {
            timestamp: metrics.timestamp,
            value: cpuUsage.total,
            type: MetricType.CPU_USAGE
          });
        } catch (error) {
          this.logger.error('Failed to collect CPU metrics:', error as Error);
        }
      }

      // Collect Memory metrics if enabled
      if (this.config.memoryTracking) {
        try {
          const memoryUsage = await this.systemMonitor.getMemoryUsage();
          metrics.memory = memoryUsage;
          
          this.addMetricToHistory('memory_rss', {
            timestamp: metrics.timestamp,
            value: memoryUsage.rss,
            type: MetricType.MEMORY_USAGE
          });
          
          this.addMetricToHistory('memory_heap_used', {
            timestamp: metrics.timestamp,
            value: memoryUsage.heapUsed,
            type: MetricType.MEMORY_USAGE
          });
          
          this.addMetricToHistory('memory_heap_total', {
            timestamp: metrics.timestamp,
            value: memoryUsage.heapTotal,
            type: MetricType.MEMORY_USAGE
          });
          
          this.addMetricToHistory('memory_external', {
            timestamp: metrics.timestamp,
            value: memoryUsage.external,
            type: MetricType.MEMORY_USAGE
          });
        } catch (error) {
          this.logger.error('Failed to collect memory metrics:', error as Error);
        }
      }

      // Collect Disk metrics if enabled
      if (this.config.diskTracking) {
        try {
          const diskUsage = await this.systemMonitor.getDiskUsage('/');
          metrics.disk = diskUsage;
          
          this.addMetricToHistory('disk_used', {
            timestamp: metrics.timestamp,
            value: diskUsage.used,
            type: MetricType.DISK_USAGE
          });
          
          this.addMetricToHistory('disk_free', {
            timestamp: metrics.timestamp,
            value: diskUsage.free,
            type: MetricType.DISK_USAGE
          });
          
          this.addMetricToHistory('disk_total', {
            timestamp: metrics.timestamp,
            value: diskUsage.total,
            type: MetricType.DISK_USAGE
          });
        } catch (error) {
          this.logger.error('Failed to collect disk metrics:', error as Error);
        }
      }

      // Record uptime
      this.addMetricToHistory(MetricType.UPTIME, {
        timestamp: metrics.timestamp,
        value: metrics.uptime,
        type: MetricType.UPTIME
      });

      // Add custom metrics
      metrics.customMetrics = Object.fromEntries(this.customMetrics);

      this.lastCollectionTime = metrics.timestamp;
      
      // Emit metrics collected event
      this.emit('metricsCollected', metrics);

      const collectionTime = Date.now() - startTime;
      this.logger.debug(`Metrics collected in ${collectionTime}ms`);

    } catch (error) {
      this.logger.error('Error during metrics collection:', error as Error);
    }
  }

  /**
   * Add metric to history with retention policy
   */
  private addMetricToHistory(metricName: string, record: MetricRecord): void {
    if (!this.metricsHistory.has(metricName)) {
      this.metricsHistory.set(metricName, []);
    }

    const history = this.metricsHistory.get(metricName);
    if (!history) {
      this.metricsHistory.set(metricName, []);
      return;
    }
    history.push(record);

    // Apply retention policy (keep last 1000 records)
    const maxRecords = 1000;
    if (history.length > maxRecords) {
      history.splice(0, history.length - maxRecords);
    }
  }

  /**
   * Get latest metric value
   */
  private getLatestMetric(metricName: string): number | null {
    const history = this.metricsHistory.get(metricName);
    if (!history || history.length === 0) {
      return null;
    }
    
    return history[history.length - 1]?.value || null;
  }

  /**
   * Get total number of collections
   */
  private getTotalCollections(): number {
    const uptimeHistory = this.metricsHistory.get(MetricType.UPTIME);
    return uptimeHistory ? uptimeHistory.length : 0;
  }

  /**
   * Calculate average collection time
   */
  private calculateAverageCollectionTime(): number {
    // This would track actual collection times in a real implementation
    return 50; // Placeholder: 50ms average
  }

  /**
   * Calculate memory trend
   */
  private calculateMemoryTrend(memoryHistory: MetricRecord[]): 'increasing' | 'decreasing' | 'stable' {
    if (memoryHistory.length < 3) {
      return 'stable';
    }

    const recent = memoryHistory.slice(-3);
    const trend = (recent[2]?.value || 0) - (recent[0]?.value || 0);
    const threshold = (recent[0]?.value || 0) * 0.1; // 10% threshold

    if (trend && trend > threshold) {
      return 'increasing';
    } else if (trend && trend < -threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate average of metric records
   */
  private calculateAverage(records: MetricRecord[]): number {
    if (records.length === 0) {
      return 0;
    }

    const sum = records.reduce((acc, record) => acc + record.value, 0);
    return sum / records.length;
  }

  /**
   * Check metric thresholds and emit warnings
   */
  private checkMetricThresholds(metricName: string, value: number): void {
    // This could be configurable thresholds in a real implementation
    const thresholds: Record<string, number> = {
      [MetricType.CPU_USAGE]: 80, // 80% CPU
      'memory_heap_used': 1024 * 1024 * 1024, // 1GB heap
      [MetricType.DISK_USAGE]: 90 // 90% disk
    };

    const threshold = thresholds[metricName];
    if (threshold && value > threshold) {
      this.emit('metricThresholdExceeded', metricName, value, threshold);
      this.logger.warn(`Metric threshold exceeded: ${metricName} = ${value} > ${threshold}`);
    }
  }
}