/**
 * Unit tests for Performance Monitor
 * 
 * Tests performance monitoring functionality without external dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor, MetricType } from '../../../src/domain/daemon/performance-monitor.js';
import { DEFAULT_DAEMON_CONFIG } from '../../../src/config/schema/daemon.js';

// Mock implementations
const mockSystemMonitor = {
  getCpuUsage: vi.fn(() => Promise.resolve({ user: 10, system: 5, total: 15 })),
  getMemoryUsage: vi.fn(() => Promise.resolve({
    rss: 100 * 1024 * 1024,      // 100MB
    heapUsed: 50 * 1024 * 1024,  // 50MB
    heapTotal: 80 * 1024 * 1024, // 80MB
    external: 10 * 1024 * 1024   // 10MB
  })),
  getLoadAverages: vi.fn(() => Promise.resolve({ load1: 1.0, load5: 1.2, load15: 1.1 })),
  getDiskUsage: vi.fn(() => Promise.resolve({
    used: 500 * 1024 * 1024 * 1024,  // 500GB
    free: 500 * 1024 * 1024 * 1024,  // 500GB
    total: 1000 * 1024 * 1024 * 1024 // 1TB
  })),
  getSystemUptime: vi.fn(() => Promise.resolve(3600000)) // 1 hour
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  let config = { ...DEFAULT_DAEMON_CONFIG.performance };

  beforeEach(() => {
    vi.clearAllMocks();
    config = { ...DEFAULT_DAEMON_CONFIG.performance };
    
    performanceMonitor = new PerformanceMonitor(
      config,
      mockSystemMonitor,
      mockLogger
    );
  });

  afterEach(() => {
    // Clean up any running intervals
    performanceMonitor.stopMonitoring();
  });

  describe('startMonitoring', () => {
    it('should start monitoring successfully', () => {
      performanceMonitor.startMonitoring();

      expect(performanceMonitor.isMonitoring()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting performance monitoring...');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Performance monitoring started'));
    });

    it('should not start if already monitoring', () => {
      performanceMonitor.startMonitoring();
      vi.clearAllMocks();
      
      performanceMonitor.startMonitoring();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Performance monitoring is already active');
    });

    it('should not start if disabled in config', () => {
      config.monitoring = false;
      const disabledMonitor = new PerformanceMonitor(config, mockSystemMonitor, mockLogger);
      
      disabledMonitor.startMonitoring();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Performance monitoring is disabled in configuration');
      expect(disabledMonitor.isMonitoring()).toBe(false);
    });

    it('should emit monitoringStarted event', () => {
      const startedListener = vi.fn();
      performanceMonitor.on('monitoringStarted', startedListener);
      
      performanceMonitor.startMonitoring();
      
      expect(startedListener).toHaveBeenCalled();
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring successfully', () => {
      performanceMonitor.startMonitoring();
      expect(performanceMonitor.isMonitoring()).toBe(true);
      
      performanceMonitor.stopMonitoring();
      
      expect(performanceMonitor.isMonitoring()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping performance monitoring...');
      expect(mockLogger.info).toHaveBeenCalledWith('Performance monitoring stopped');
    });

    it('should handle stop when not monitoring', () => {
      performanceMonitor.stopMonitoring();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Performance monitoring is not active');
    });

    it('should emit monitoringStopped event', () => {
      const stoppedListener = vi.fn();
      performanceMonitor.on('monitoringStopped', stoppedListener);
      
      performanceMonitor.startMonitoring();
      performanceMonitor.stopMonitoring();
      
      expect(stoppedListener).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = performanceMonitor.getMetrics();

      expect(metrics).toMatchObject({
        timestamp: expect.any(Date),
        uptime: expect.any(Number),
        cpu: expect.any(Number),
        memory: {
          rss: expect.any(Number),
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
          external: expect.any(Number)
        },
        disk: {
          used: expect.any(Number),
          free: expect.any(Number),
          total: expect.any(Number)
        },
        processCount: expect.any(Number),
        customMetrics: expect.any(Object),
        collectionInfo: {
          lastCollection: expect.any(Object), // null or Date
          totalCollections: expect.any(Number),
          monitoringActive: expect.any(Boolean),
          intervalMs: config.metricsInterval
        }
      });
    });

    it('should include custom metrics', () => {
      performanceMonitor.recordMetric('test_metric', 123);
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.customMetrics).toHaveProperty('test_metric', 123);
    });
  });

  describe('recordMetric', () => {
    it('should record custom metric successfully', () => {
      performanceMonitor.recordMetric('requests_per_second', 100);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.customMetrics).toHaveProperty('requests_per_second', 100);
      expect(mockLogger.debug).toHaveBeenCalledWith('Recording custom metric: requests_per_second = 100');
    });

    it('should add metric to history', () => {
      performanceMonitor.recordMetric('test_metric', 42);
      
      const history = performanceMonitor.getHistoricalMetrics('test_metric');
      
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        timestamp: expect.any(Date),
        value: 42,
        type: MetricType.CUSTOM
      });
    });

    it('should emit metricThresholdExceeded for high values', () => {
      const thresholdListener = vi.fn();
      performanceMonitor.on('metricThresholdExceeded', thresholdListener);
      
      // Record a high CPU usage value
      performanceMonitor.recordMetric(MetricType.CPU_USAGE, 95);
      
      expect(thresholdListener).toHaveBeenCalledWith(MetricType.CPU_USAGE, 95, 80);
    });
  });

  describe('getHistoricalMetrics', () => {
    it('should return historical metrics for a metric', () => {
      performanceMonitor.recordMetric('test_metric', 10);
      performanceMonitor.recordMetric('test_metric', 20);
      performanceMonitor.recordMetric('test_metric', 30);
      
      const history = performanceMonitor.getHistoricalMetrics('test_metric');
      
      expect(history).toHaveLength(3);
      expect(history.map(h => h.value)).toEqual([10, 20, 30]);
    });

    it('should return limited historical metrics when limit specified', () => {
      performanceMonitor.recordMetric('test_metric', 10);
      performanceMonitor.recordMetric('test_metric', 20);
      performanceMonitor.recordMetric('test_metric', 30);
      
      const history = performanceMonitor.getHistoricalMetrics('test_metric', 2);
      
      expect(history).toHaveLength(2);
      expect(history.map(h => h.value)).toEqual([20, 30]); // Last 2
    });

    it('should return empty array for unknown metric', () => {
      const history = performanceMonitor.getHistoricalMetrics('unknown_metric');
      
      expect(history).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = { metricsInterval: 30000, cpuTracking: false };
      
      performanceMonitor.updateConfig(newConfig);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.collectionInfo.intervalMs).toBe(30000);
      expect(mockLogger.info).toHaveBeenCalledWith('Performance monitoring configuration updated');
    });

    it('should restart monitoring when active', () => {
      performanceMonitor.startMonitoring();
      vi.clearAllMocks();
      
      performanceMonitor.updateConfig({ metricsInterval: 30000 });
      
      // Should have stopped and started again
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping performance monitoring...');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting performance monitoring...');
    });
  });

  describe('getStatistics', () => {
    it('should return performance statistics', () => {
      // Add some metrics to get statistics
      performanceMonitor.recordMetric('memory_heap_used', 100);
      performanceMonitor.recordMetric('memory_heap_used', 110);
      performanceMonitor.recordMetric('memory_heap_used', 105);
      
      performanceMonitor.recordMetric(MetricType.CPU_USAGE, 50);
      performanceMonitor.recordMetric(MetricType.CPU_USAGE, 60);
      
      const stats = performanceMonitor.getStatistics();
      
      expect(stats).toMatchObject({
        totalCollections: expect.any(Number),
        averageCollectionTime: expect.any(Number),
        memoryTrend: expect.stringMatching(/increasing|decreasing|stable/),
        cpuAverageLastHour: expect.any(Number),
        uptimeHours: expect.any(Number)
      });
      
      expect(stats.totalCollections).toBeGreaterThanOrEqual(0);
      expect(stats.averageCollectionTime).toBeGreaterThan(0);
      expect(stats.uptimeHours).toBeGreaterThanOrEqual(0);
    });

    it('should calculate memory trend correctly', () => {
      // Add increasing memory usage
      performanceMonitor.recordMetric('memory_heap_used', 100);
      performanceMonitor.recordMetric('memory_heap_used', 110);
      performanceMonitor.recordMetric('memory_heap_used', 120);
      
      const stats = performanceMonitor.getStatistics();
      
      expect(stats.memoryTrend).toBe('increasing');
    });
  });

  describe('clearHistory', () => {
    it('should clear metrics history', () => {
      performanceMonitor.recordMetric('test_metric', 42);
      expect(performanceMonitor.getHistoricalMetrics('test_metric')).toHaveLength(1);
      
      performanceMonitor.clearHistory();
      
      expect(performanceMonitor.getHistoricalMetrics('test_metric')).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Performance metrics history cleared');
    });

    it('should clear custom metrics', () => {
      performanceMonitor.recordMetric('test_metric', 42);
      let metrics = performanceMonitor.getMetrics();
      expect(metrics.customMetrics).toHaveProperty('test_metric');
      
      performanceMonitor.clearHistory();
      
      metrics = performanceMonitor.getMetrics();
      expect(metrics.customMetrics).not.toHaveProperty('test_metric');
    });
  });

  describe('metrics collection', () => {
    it('should collect metrics at configured intervals', async () => {
      // Use a short interval for testing
      const quickConfig = { ...config, metricsInterval: 100 };
      const quickMonitor = new PerformanceMonitor(quickConfig, mockSystemMonitor, mockLogger);
      
      const metricsListener = vi.fn();
      quickMonitor.on('metricsCollected', metricsListener);
      
      quickMonitor.startMonitoring();
      
      // Wait for a couple of intervals
      await new Promise(resolve => setTimeout(resolve, 250));
      
      quickMonitor.stopMonitoring();
      
      // Should have collected multiple metrics
      expect(metricsListener).toHaveBeenCalled();
      expect(mockSystemMonitor.getCpuUsage).toHaveBeenCalled();
      expect(mockSystemMonitor.getMemoryUsage).toHaveBeenCalled();
    });

    it('should handle collection errors gracefully', async () => {
      // Make system monitor throw errors
      mockSystemMonitor.getCpuUsage.mockRejectedValue(new Error('CPU collection failed'));
      mockSystemMonitor.getMemoryUsage.mockRejectedValue(new Error('Memory collection failed'));
      
      performanceMonitor.startMonitoring();
      
      // Wait for collection attempt
      await new Promise(resolve => setTimeout(resolve, 50));
      
      performanceMonitor.stopMonitoring();
      
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to collect CPU metrics:', expect.any(Error));
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to collect memory metrics:', expect.any(Error));
    });

    it('should respect tracking configuration', async () => {
      // Disable CPU tracking
      const configWithoutCpu = { ...config, cpuTracking: false, memoryTracking: true };
      const selectiveMonitor = new PerformanceMonitor(configWithoutCpu, mockSystemMonitor, mockLogger);
      
      selectiveMonitor.startMonitoring();
      
      // Wait for collection
      await new Promise(resolve => setTimeout(resolve, 50));
      
      selectiveMonitor.stopMonitoring();
      
      expect(mockSystemMonitor.getCpuUsage).not.toHaveBeenCalled();
      expect(mockSystemMonitor.getMemoryUsage).toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('should emit metricsCollected event', async () => {
      const metricsListener = vi.fn();
      performanceMonitor.on('metricsCollected', metricsListener);
      
      performanceMonitor.startMonitoring();
      
      // Wait for initial collection
      await new Promise(resolve => setTimeout(resolve, 50));
      
      performanceMonitor.stopMonitoring();
      
      expect(metricsListener).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Date),
        uptime: expect.any(Number)
      }));
    });

    it('should emit metricThresholdExceeded event', () => {
      const thresholdListener = vi.fn();
      performanceMonitor.on('metricThresholdExceeded', thresholdListener);
      
      // Record a metric that exceeds threshold
      performanceMonitor.recordMetric(MetricType.CPU_USAGE, 90);
      
      expect(thresholdListener).toHaveBeenCalledWith(MetricType.CPU_USAGE, 90, 80);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Metric threshold exceeded'));
    });
  });

  describe('metric retention', () => {
    it('should maintain metric history within limits', () => {
      // Record many metrics to test retention
      for (let i = 0; i < 1200; i++) {
        performanceMonitor.recordMetric('test_metric', i);
      }
      
      const history = performanceMonitor.getHistoricalMetrics('test_metric');
      
      // Should be limited to 1000 records
      expect(history.length).toBe(1000);
      
      // Should keep the most recent records
      expect(history[history.length - 1]?.value).toBe(1199);
      expect(history[0]?.value).toBe(200); // 1200 - 1000 = 200
    });
  });
});