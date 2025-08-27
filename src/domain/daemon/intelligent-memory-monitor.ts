/**
 * Intelligent Memory Monitor - Domain Layer
 * 
 * Establishes intelligent memory baselines and provides context-aware memory alerts.
 * Replaces hardcoded thresholds with adaptive monitoring based on system context.
 */

import { EventEmitter } from 'events';
import { ISystemMonitor } from './interfaces.js';

/**
 * Memory baseline data structure
 */
export interface MemoryBaseline {
  heapUsedMB: number;
  heapUtilizationPercent: number;
  establishedAt: Date;
  sampleCount: number;
  standardDeviation: number;
  isStable: boolean;
}

/**
 * Memory alert with context and recommendations
 */
export interface MemoryAlert {
  level: 'normal' | 'elevated' | 'critical';
  heapUsedMB: number;
  heapUtilizationPercent: number;
  baselineDeviation: number;
  growthRateMBPerHour: number;
  trend: 'stable' | 'growing' | 'declining';
  recommendations: string[];
  timestamp: Date;
  systemContext: {
    totalSystemMemoryMB: number;
    availableSystemMemoryMB: number;
    nodeJsProcessAge: number;
  };
}

/**
 * Memory monitoring events
 */
export interface MemoryMonitorEvents {
  'baselineEstablished': (baseline: MemoryBaseline) => void;
  'memoryAlert': (alert: MemoryAlert) => void;
  'monitoringStarted': () => void;
  'monitoringStopped': () => void;
}

/**
 * Intelligent memory monitor implementation
 */
export class IntelligentMemoryMonitor extends EventEmitter {
  private isMonitoringActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private baseline: MemoryBaseline | null = null;
  private memoryHistory: Array<{ timestamp: Date; heapUsedMB: number; heapUtilizationPercent: number }> = [];
  private baselineEstablishmentStartTime: Date | null = null;
  private lastAlertTime: Date | null = null;
  private processStartTime = Date.now();

  constructor(
    private systemMonitor: ISystemMonitor,
    private logger: { info: (msg: string, metadata?: any) => void; error: (msg: string, error?: Error, metadata?: any) => void; warn: (msg: string, metadata?: any) => void; debug: (msg: string, metadata?: any) => void; },
    private config: {
      baselineEstablishmentDurationMs: number;
      monitoringIntervalMs: number;
      alertIntervals: {
        normal: number;
        elevated: number;
        critical: number;
      };
      stabilityThreshold: number;
    } = {
      baselineEstablishmentDurationMs: 5 * 60 * 1000, // 5 minutes
      monitoringIntervalMs: 30 * 1000, // 30 seconds
      alertIntervals: {
        normal: 5 * 60 * 1000,  // 5 minutes
        elevated: 30 * 1000,    // 30 seconds
        critical: 10 * 1000     // 10 seconds
      },
      stabilityThreshold: 0.1 // 10% standard deviation for stability
    }
  ) {
    super();
  }

  /**
   * Start intelligent memory monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoringActive) {
      this.logger.warn('Intelligent memory monitoring is already active');
      return;
    }

    this.logger.info('Starting intelligent memory monitoring with adaptive baseline establishment...');
    this.isMonitoringActive = true;
    this.baselineEstablishmentStartTime = new Date();
    
    // Start monitoring interval
    this.monitoringInterval = setInterval(
      () => this.collectMemoryData(),
      this.config.monitoringIntervalMs
    );

    // Collect initial data
    this.collectMemoryData();

    this.emit('monitoringStarted');
    this.logger.info(`Intelligent memory monitoring started - establishing baseline for ${this.config.baselineEstablishmentDurationMs / 1000}s`);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoringActive) {
      this.logger.warn('Intelligent memory monitoring is not active');
      return;
    }

    this.logger.info('Stopping intelligent memory monitoring...');
    this.isMonitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoringStopped');
    this.logger.info('Intelligent memory monitoring stopped');
  }

  /**
   * Get current baseline if established
   */
  getBaseline(): MemoryBaseline | null {
    return this.baseline;
  }

  /**
   * Check if baseline has been established
   */
  isBaselineEstablished(): boolean {
    return this.baseline !== null && this.baseline.isStable;
  }

  /**
   * Get memory monitoring statistics
   */
  getStatistics(): {
    baselineEstablished: boolean;
    samplesCollected: number;
    currentHeapUsedMB: number;
    currentHeapUtilization: number;
    baselineDeviation?: number;
    monitoringDuration: number;
  } {
    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const stats = {
      baselineEstablished: this.isBaselineEstablished(),
      samplesCollected: this.memoryHistory.length,
      currentHeapUsedMB: current?.heapUsedMB || 0,
      currentHeapUtilization: current?.heapUtilizationPercent || 0,
      monitoringDuration: this.baselineEstablishmentStartTime 
        ? Date.now() - this.baselineEstablishmentStartTime.getTime() 
        : 0
    };

    if (this.baseline && current) {
      (stats as any).baselineDeviation = Math.abs(current.heapUsedMB - this.baseline.heapUsedMB);
    }

    return stats;
  }

  /**
   * Collect memory data and analyze
   */
  private async collectMemoryData(): Promise<void> {
    try {
      const memoryUsage = await this.systemMonitor.getMemoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);
      const heapUtilizationPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      // Add to history
      const dataPoint = {
        timestamp: new Date(),
        heapUsedMB,
        heapUtilizationPercent
      };
      this.memoryHistory.push(dataPoint);

      // Keep only recent history (last 1 hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      this.memoryHistory = this.memoryHistory.filter(point => point.timestamp.getTime() > oneHourAgo);

      // Check if we should establish baseline
      if (!this.baseline && this.shouldEstablishBaseline()) {
        this.establishBaseline();
      }

      // Generate alert if baseline is established
      if (this.baseline) {
        this.analyzeMemoryAndGenerateAlert(dataPoint);
      }

    } catch (error) {
      this.logger.error('Failed to collect memory data:', error as Error);
    }
  }

  /**
   * Check if we have enough data to establish baseline
   */
  private shouldEstablishBaseline(): boolean {
    if (!this.baselineEstablishmentStartTime) {
      return false;
    }

    const elapsedTime = Date.now() - this.baselineEstablishmentStartTime.getTime();
    const hasEnoughTime = elapsedTime >= this.config.baselineEstablishmentDurationMs;
    const hasEnoughSamples = this.memoryHistory.length >= 5; // Minimum samples

    return hasEnoughTime && hasEnoughSamples;
  }

  /**
   * Establish memory baseline from collected data
   */
  private establishBaseline(): void {
    if (this.memoryHistory.length === 0) {
      return;
    }

    // Calculate statistics from stable period data
    const heapValues = this.memoryHistory.map(point => point.heapUsedMB);
    const utilizationValues = this.memoryHistory.map(point => point.heapUtilizationPercent);

    const avgHeapUsed = heapValues.reduce((sum, val) => sum + val, 0) / heapValues.length;
    const avgUtilization = utilizationValues.reduce((sum, val) => sum + val, 0) / utilizationValues.length;

    // Calculate standard deviation for stability assessment
    const heapVariance = heapValues.reduce((sum, val) => sum + Math.pow(val - avgHeapUsed, 2), 0) / heapValues.length;
    const standardDeviation = Math.sqrt(heapVariance);

    // Determine if baseline is stable (low standard deviation relative to mean)
    const coefficientOfVariation = standardDeviation / avgHeapUsed;
    const isStable = coefficientOfVariation <= this.config.stabilityThreshold;

    this.baseline = {
      heapUsedMB: avgHeapUsed,
      heapUtilizationPercent: avgUtilization,
      establishedAt: new Date(),
      sampleCount: this.memoryHistory.length,
      standardDeviation,
      isStable
    };

    this.emit('baselineEstablished', this.baseline);
    
    this.logger.info('Memory baseline established', {
      heapUsedMB: Math.round(avgHeapUsed),
      heapUtilizationPercent: Math.round(avgUtilization),
      sampleCount: this.memoryHistory.length,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      isStable,
      message: isStable ? 'Baseline is stable - monitoring for genuine issues' : 'Baseline shows variation - will monitor more closely'
    });
  }

  /**
   * Analyze current memory against baseline and generate alerts
   */
  private analyzeMemoryAndGenerateAlert(current: { timestamp: Date; heapUsedMB: number; heapUtilizationPercent: number }): void {
    if (!this.baseline) {
      return;
    }

    // Calculate deviation from baseline
    const heapDeviation = current.heapUsedMB - this.baseline.heapUsedMB;
    const utilizationDeviation = current.heapUtilizationPercent - this.baseline.heapUtilizationPercent;

    // Calculate growth rate (MB per hour)
    const growthRate = this.calculateGrowthRate();

    // Determine alert level based on intelligent criteria
    const alertLevel = this.determineAlertLevel(heapDeviation, utilizationDeviation, growthRate);

    // Check if we should emit alert based on timing
    if (this.shouldEmitAlert(alertLevel)) {
      const alert = this.createMemoryAlert(current, heapDeviation, growthRate, alertLevel);
      this.emit('memoryAlert', alert);
      this.logMemoryAlert(alert);
      this.lastAlertTime = new Date();
    } else {
      // Log at debug level for normal monitoring
      this.logger.debug('Memory usage within expected range', {
        currentHeapMB: Math.round(current.heapUsedMB),
        baselineHeapMB: Math.round(this.baseline.heapUsedMB),
        deviationMB: Math.round(heapDeviation),
        currentUtilization: Math.round(current.heapUtilizationPercent),
        alertLevel
      });
    }
  }

  /**
   * Calculate memory growth rate in MB per hour
   */
  private calculateGrowthRate(): number {
    if (this.memoryHistory.length < 2) {
      return 0;
    }

    // Use data from last 10 minutes for growth calculation
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const recentData = this.memoryHistory.filter(point => point.timestamp.getTime() > tenMinutesAgo);

    if (recentData.length < 2) {
      return 0;
    }

    const oldest = recentData[0];
    const newest = recentData[recentData.length - 1];
    
    if (!oldest || !newest) {
      return 0;
    }
    
    const timeDiffHours = (newest.timestamp.getTime() - oldest.timestamp.getTime()) / (1000 * 60 * 60);
    const memoryDiffMB = newest.heapUsedMB - oldest.heapUsedMB;

    return timeDiffHours > 0 ? memoryDiffMB / timeDiffHours : 0;
  }

  /**
   * Determine alert level based on intelligent criteria
   */
  private determineAlertLevel(heapDeviation: number, utilizationDeviation: number, growthRate: number): 'normal' | 'elevated' | 'critical' {
    const baselineThreshold = this.baseline!.standardDeviation * 2; // 2 standard deviations
    const systemMemoryMB = this.getSystemMemoryMB();
    
    // Critical: Large deviation OR high growth rate OR approaching system limits
    if (heapDeviation > baselineThreshold * 3 || 
        growthRate > 100 || // 100MB/hour growth
        heapDeviation > systemMemoryMB * 0.1) { // Using more than 10% of system memory above baseline
      return 'critical';
    }

    // Elevated: Moderate deviation OR sustained growth
    if (heapDeviation > baselineThreshold || 
        growthRate > 50 || // 50MB/hour growth
        utilizationDeviation > 20) { // 20% utilization increase
      return 'elevated';
    }

    return 'normal';
  }

  /**
   * Check if alert should be emitted based on timing and level
   */
  private shouldEmitAlert(level: 'normal' | 'elevated' | 'critical'): boolean {
    if (level === 'normal') {
      return false; // Don't emit alerts for normal levels
    }

    if (!this.lastAlertTime) {
      return true; // First alert
    }

    const timeSinceLastAlert = Date.now() - this.lastAlertTime.getTime();
    const requiredInterval = this.config.alertIntervals[level];

    return timeSinceLastAlert >= requiredInterval;
  }

  /**
   * Create comprehensive memory alert
   */
  private createMemoryAlert(
    current: { timestamp: Date; heapUsedMB: number; heapUtilizationPercent: number },
    baselineDeviation: number,
    growthRate: number,
    level: 'normal' | 'elevated' | 'critical'
  ): MemoryAlert {
    const trend = growthRate > 10 ? 'growing' : growthRate < -10 ? 'declining' : 'stable';
    const systemMemoryMB = this.getSystemMemoryMB();
    const availableMemoryMB = this.getAvailableMemoryMB();

    const recommendations: string[] = [];
    
    if (level === 'critical') {
      recommendations.push('Consider immediate action: restart daemon or reduce concurrent operations');
      if (growthRate > 50) {
        recommendations.push('Memory leak suspected - monitor for continuous growth');
      }
    } else if (level === 'elevated') {
      recommendations.push('Monitor closely for continued growth');
      if (baselineDeviation > 100) {
        recommendations.push('Consider reducing folder count or batch sizes');
      }
    }

    if (availableMemoryMB < 1000) {
      recommendations.push('System memory is low - consider closing other applications');
    }

    return {
      level,
      heapUsedMB: current.heapUsedMB,
      heapUtilizationPercent: current.heapUtilizationPercent,
      baselineDeviation,
      growthRateMBPerHour: growthRate,
      trend,
      recommendations,
      timestamp: current.timestamp,
      systemContext: {
        totalSystemMemoryMB: systemMemoryMB,
        availableSystemMemoryMB: availableMemoryMB,
        nodeJsProcessAge: Date.now() - this.processStartTime
      }
    };
  }

  /**
   * Log memory alert with appropriate level and context
   */
  private logMemoryAlert(alert: MemoryAlert): void {
    const logData = {
      level: alert.level,
      currentMemoryMB: Math.round(alert.heapUsedMB),
      baselineDeviationMB: Math.round(alert.baselineDeviation),
      growthRateMBPerHour: Math.round(alert.growthRateMBPerHour * 100) / 100,
      trend: alert.trend,
      utilization: Math.round(alert.heapUtilizationPercent),
      systemMemoryMB: alert.systemContext.totalSystemMemoryMB,
      recommendations: alert.recommendations
    };

    if (alert.level === 'critical') {
      this.logger.error('CRITICAL memory alert - immediate action recommended', undefined, logData);
    } else if (alert.level === 'elevated') {
      this.logger.warn('Elevated memory usage detected - monitoring closely', logData);
    } else {
      this.logger.info('Memory alert', logData);
    }
  }

  /**
   * Get total system memory in MB (simplified)
   */
  private getSystemMemoryMB(): number {
    try {
      const os = require('os');
      return Math.round(os.totalmem() / (1024 * 1024));
    } catch {
      return 8192; // 8GB default assumption
    }
  }

  /**
   * Get available system memory in MB (simplified)
   */
  private getAvailableMemoryMB(): number {
    try {
      const os = require('os');
      return Math.round(os.freemem() / (1024 * 1024));
    } catch {
      return 4096; // 4GB default assumption
    }
  }
}