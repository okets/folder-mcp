/**
 * Unit tests for Daemon Service
 * 
 * Tests the core daemon functionality without external dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DaemonService } from '../../../src/domain/daemon/daemon-service.js';
import { DaemonStatus } from '../../../src/domain/daemon/interfaces.js';
import { DEFAULT_DAEMON_CONFIG } from '../../../src/config/schema/daemon.js';

// Mock implementations
const mockProcessManager = {
  startMcpServer: vi.fn(),
  stopMcpServer: vi.fn(),
  restartMcpServer: vi.fn(),
  getProcessStatus: vi.fn(() => ({
    pid: 1234,
    status: DaemonStatus.RUNNING,
    startTime: new Date(),
    uptime: 1000,
    restartCount: 0,
    lastRestart: null,
    lastError: null
  })),
  killProcess: vi.fn(),
  isProcessResponsive: vi.fn()
};

const mockHealthMonitor = {
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  getHealthStatus: vi.fn(),
  performHealthCheck: vi.fn(),
  isMonitoring: vi.fn(() => true),
  onHealthCheckFailure: vi.fn()
};

const mockSignalHandler = {
  registerHandlers: vi.fn(),
  handleShutdown: vi.fn(),
  handleReload: vi.fn(),
  unregisterHandlers: vi.fn(),
  getRegisteredSignals: vi.fn()
};

const mockPerformanceMonitor = {
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  getMetrics: vi.fn(),
  recordMetric: vi.fn(),
  getHistoricalMetrics: vi.fn(),
  isMonitoring: vi.fn(() => true)
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('DaemonService', () => {
  let daemonService: DaemonService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    daemonService = new DaemonService(
      DEFAULT_DAEMON_CONFIG,
      mockProcessManager,
      mockHealthMonitor,
      mockSignalHandler,
      mockPerformanceMonitor,
      mockLogger
    );
  });

  describe('start', () => {
    it('should start daemon successfully', async () => {
      mockProcessManager.startMcpServer.mockResolvedValue(undefined);

      await daemonService.start();

      expect(mockSignalHandler.registerHandlers).toHaveBeenCalled();
      expect(mockProcessManager.startMcpServer).toHaveBeenCalled();
      expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
      expect(mockPerformanceMonitor.startMonitoring).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Daemon started successfully');
    });

    it('should handle start failure', async () => {
      const error = new Error('Failed to start process');
      mockProcessManager.startMcpServer.mockRejectedValue(error);

      await expect(daemonService.start()).rejects.toThrow('Failed to start process');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to start daemon:', error);
    });

    it('should not start if already running', async () => {
      // Start daemon first
      mockProcessManager.startMcpServer.mockResolvedValue(undefined);
      await daemonService.start();
      
      // Clear mocks
      vi.clearAllMocks();
      
      // Try to start again
      await daemonService.start();
      
      expect(mockProcessManager.startMcpServer).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Daemon is already running');
    });
  });

  describe('stop', () => {
    it('should stop daemon successfully', async () => {
      // Start daemon first
      mockProcessManager.startMcpServer.mockResolvedValue(undefined);
      await daemonService.start();
      
      // Clear mocks
      vi.clearAllMocks();
      
      // Stop daemon
      mockProcessManager.stopMcpServer.mockResolvedValue(undefined);
      await daemonService.stop();

      expect(mockPerformanceMonitor.stopMonitoring).toHaveBeenCalled();
      expect(mockHealthMonitor.stopMonitoring).toHaveBeenCalled();
      expect(mockProcessManager.stopMcpServer).toHaveBeenCalled();
      expect(mockSignalHandler.unregisterHandlers).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Daemon stopped successfully');
    });

    it('should handle stop failure', async () => {
      // Start daemon first
      mockProcessManager.startMcpServer.mockResolvedValue(undefined);
      await daemonService.start();
      
      // Setup stop failure
      const error = new Error('Failed to stop process');
      mockProcessManager.stopMcpServer.mockRejectedValue(error);

      await expect(daemonService.stop()).rejects.toThrow('Failed to stop process');
      expect(mockLogger.error).toHaveBeenCalledWith('Error during daemon shutdown:', error);
    });
  });

  describe('restart', () => {
    it('should restart daemon successfully', async () => {
      // Start daemon first
      mockProcessManager.startMcpServer.mockResolvedValue(undefined);
      await daemonService.start();
      
      // Verify daemon is running
      expect(daemonService.isRunning()).toBe(true);
      
      // Setup restart mocks
      mockProcessManager.stopMcpServer.mockResolvedValue(undefined);
      
      await daemonService.restart();

      // Should have restarted
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Daemon restarted successfully'));
    });
  });

  describe('getStatus', () => {
    it('should return process status', async () => {
      const status = daemonService.getStatus();

      expect(status).toMatchObject({
        pid: 1234,
        status: DaemonStatus.STOPPED, // Initial status
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastRestart: null,
        lastError: null
      });
    });
  });

  describe('isRunning', () => {
    it('should return false when stopped', () => {
      expect(daemonService.isRunning()).toBe(false);
    });

    it('should return true when running', async () => {
      mockProcessManager.startMcpServer.mockResolvedValue(undefined);
      await daemonService.start();
      
      expect(daemonService.isRunning()).toBe(true);
    });
  });

  describe('getPid', () => {
    it('should return process ID from process manager', () => {
      const pid = daemonService.getPid();
      expect(pid).toBe(1234);
      expect(mockProcessManager.getProcessStatus).toHaveBeenCalled();
    });
  });

  describe('reload', () => {
    it('should reload configuration successfully', async () => {
      await daemonService.reload();
      expect(mockLogger.info).toHaveBeenCalledWith('Configuration reloaded successfully');
    });
  });
});