/**
 * Unit tests for Health Monitor
 * 
 * Tests health monitoring functionality without external dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthMonitor, HealthCheckType } from '../../../src/domain/daemon/health-monitor.js';
import { DaemonStatus } from '../../../src/domain/daemon/interfaces.js';
import { DEFAULT_DAEMON_CONFIG } from '../../../src/config/schema/daemon.js';

// Mock implementations
const mockProcessManager = {
  startMcpServer: vi.fn(),
  stopMcpServer: vi.fn(),
  restartMcpServer: vi.fn(),
  killProcess: vi.fn(),
  getProcessStatus: vi.fn(() => ({
    pid: 1234,
    status: DaemonStatus.RUNNING,
    startTime: new Date(),
    uptime: 1000,
    restartCount: 0,
    lastRestart: null,
    lastError: null
  })),
  isProcessResponsive: vi.fn(() => Promise.resolve(true))
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;
  let config = { ...DEFAULT_DAEMON_CONFIG.healthCheck };

  beforeEach(() => {
    vi.clearAllMocks();
    config = { ...DEFAULT_DAEMON_CONFIG.healthCheck };
    
    healthMonitor = new HealthMonitor(
      config,
      mockProcessManager,
      mockLogger
    );
  });

  afterEach(() => {
    // Clean up any running intervals
    healthMonitor.stopMonitoring();
  });

  describe('startMonitoring', () => {
    it('should start monitoring successfully', () => {
      healthMonitor.startMonitoring();

      expect(healthMonitor.isMonitoring()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting health monitoring...');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Health monitoring started'));
    });

    it('should not start if already monitoring', () => {
      healthMonitor.startMonitoring();
      vi.clearAllMocks();
      
      healthMonitor.startMonitoring();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Health monitoring is already active');
    });

    it('should not start if disabled in config', () => {
      config.enabled = false;
      const disabledMonitor = new HealthMonitor(config, mockProcessManager, mockLogger);
      
      disabledMonitor.startMonitoring();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Health monitoring is disabled in configuration');
      expect(disabledMonitor.isMonitoring()).toBe(false);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring successfully', () => {
      healthMonitor.startMonitoring();
      expect(healthMonitor.isMonitoring()).toBe(true);
      
      healthMonitor.stopMonitoring();
      
      expect(healthMonitor.isMonitoring()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping health monitoring...');
      expect(mockLogger.info).toHaveBeenCalledWith('Health monitoring stopped');
    });

    it('should handle stop when not monitoring', () => {
      healthMonitor.stopMonitoring();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Health monitoring is not active');
    });
  });

  describe('performHealthCheck', () => {
    it('should perform health check successfully', async () => {
      const result = await healthMonitor.performHealthCheck();

      expect(result.healthy).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.details).toBeDefined();
    });

    it('should handle health check failure', async () => {
      // Make process manager return unhealthy status
      (mockProcessManager.getProcessStatus as any).mockReturnValue({
        pid: null,
        status: DaemonStatus.STOPPED,
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastRestart: null,
        lastError: null
      });

      const result = await healthMonitor.performHealthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('Failed checks');
    });

    it('should include check details in result', async () => {
      const result = await healthMonitor.performHealthCheck();

      expect(result.details).toMatchObject({
        totalChecks: expect.any(Number),
        passedChecks: expect.any(Number),
        failedChecks: expect.any(Number),
        checks: expect.any(Array)
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return current health status', () => {
      const status = healthMonitor.getHealthStatus();

      expect(status).toMatchObject({
        healthy: true,
        lastCheck: expect.any(Date),
        consecutiveFailures: 0,
        recentChecks: expect.any(Array),
        config: {
          enabled: config.enabled,
          interval: config.interval,
          timeout: config.timeout,
          retries: config.retries
        }
      });
    });

    it('should track consecutive failures', async () => {
      // Make health checks fail
      (mockProcessManager.getProcessStatus as any).mockReturnValue({
        pid: null,
        status: DaemonStatus.FAILED,
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastRestart: null,
        lastError: 'Test error'
      });

      await healthMonitor.performHealthCheck();
      await healthMonitor.performHealthCheck();

      const status = healthMonitor.getHealthStatus();
      expect(status.healthy).toBe(false);
      expect(status.consecutiveFailures).toBe(2);
    });
  });

  describe('onHealthCheckFailure', () => {
    it('should call failure handlers when health check fails', async () => {
      const failureHandler = vi.fn();
      healthMonitor.onHealthCheckFailure(failureHandler);

      // Make health check fail
      (mockProcessManager.getProcessStatus as any).mockReturnValue({
        pid: null,
        status: DaemonStatus.FAILED,
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastRestart: null,
        lastError: 'Test error'
      });

      await healthMonitor.performHealthCheck();

      expect(failureHandler).toHaveBeenCalledWith(expect.objectContaining({
        healthy: false
      }));
    });

    it('should not call failure handlers when health check passes', async () => {
      const failureHandler = vi.fn();
      healthMonitor.onHealthCheckFailure(failureHandler);

      await healthMonitor.performHealthCheck();

      expect(failureHandler).not.toHaveBeenCalled();
    });
  });

  describe('addHealthCheck', () => {
    it('should add custom health check', async () => {
      const customCheck = {
        type: HealthCheckType.MEMORY_USAGE,
        name: 'Memory Usage Check',
        execute: vi.fn(() => Promise.resolve({
          healthy: true,
          timestamp: new Date(),
          responseTime: 10
        }))
      };

      healthMonitor.addHealthCheck(HealthCheckType.MEMORY_USAGE, customCheck);

      const result = await healthMonitor.performHealthCheck();
      
      expect(customCheck.execute).toHaveBeenCalled();
      expect(result.details?.totalChecks).toBeGreaterThan(2); // Default checks + custom
    });
  });

  describe('removeHealthCheck', () => {
    it('should remove health check', async () => {
      const initialChecks = healthMonitor.getRegisteredChecks();
      
      healthMonitor.removeHealthCheck(HealthCheckType.PROCESS_ALIVE);
      
      const updatedChecks = healthMonitor.getRegisteredChecks();
      expect(updatedChecks).not.toContain(HealthCheckType.PROCESS_ALIVE);
      expect(updatedChecks.length).toBe(initialChecks.length - 1);
    });
  });

  describe('getRegisteredChecks', () => {
    it('should return list of registered health checks', () => {
      const checks = healthMonitor.getRegisteredChecks();
      
      expect(checks).toContain(HealthCheckType.PROCESS_ALIVE);
      expect(checks).toContain(HealthCheckType.PROCESS_RESPONSIVE);
      expect(checks.length).toBeGreaterThan(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = { interval: 60000, timeout: 10000 };
      
      healthMonitor.updateConfig(newConfig);
      
      const status = healthMonitor.getHealthStatus();
      expect(status.config.interval).toBe(60000);
      expect(status.config.timeout).toBe(10000);
    });

    it('should restart monitoring when active', () => {
      healthMonitor.startMonitoring();
      vi.clearAllMocks();
      
      healthMonitor.updateConfig({ interval: 60000 });
      
      // Should have stopped and started again
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping health monitoring...');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting health monitoring...');
    });
  });

  describe('getStatistics', () => {
    it('should return health check statistics', async () => {
      await healthMonitor.performHealthCheck();
      await healthMonitor.performHealthCheck();
      
      const stats = healthMonitor.getStatistics();
      
      expect(stats).toMatchObject({
        totalChecks: expect.any(Number),
        passedChecks: expect.any(Number),
        failedChecks: expect.any(Number),
        averageResponseTime: expect.any(Number),
        consecutiveFailures: expect.any(Number),
        uptime: expect.any(Number)
      });
      
      expect(stats.totalChecks).toBeGreaterThan(0);
    });
  });

  describe('monitoring interval', () => {
    it('should perform health checks at configured intervals', async () => {
      // Use a short interval for testing
      const quickConfig = { ...config, interval: 100 };
      const quickMonitor = new HealthMonitor(quickConfig, mockProcessManager, mockLogger);
      
      quickMonitor.startMonitoring();
      
      // Wait for a couple of intervals
      await new Promise(resolve => setTimeout(resolve, 250));
      
      quickMonitor.stopMonitoring();
      
      // Should have performed multiple health checks
      expect(mockLogger.debug).toHaveBeenCalledWith('Performing health check...');
    });
  });
});