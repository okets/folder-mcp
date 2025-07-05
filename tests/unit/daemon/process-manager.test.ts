/**
 * Unit tests for Process Manager
 * 
 * Tests process lifecycle management without external dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessManager } from '../../../src/domain/daemon/process-manager.js';
import { DaemonStatus } from '../../../src/domain/daemon/interfaces.js';
import { DEFAULT_DAEMON_CONFIG } from '../../../src/config/schema/daemon.js';

// Mock implementations
const mockMcpServerExecutor = {
  start: vi.fn(),
  stop: vi.fn(),
  kill: vi.fn(),
  isRunning: vi.fn()
};

const mockPidManager = {
  writePidFile: vi.fn(),
  readPidFile: vi.fn(),
  removePidFile: vi.fn(),
  isProcessRunning: vi.fn(),
  isValidPidFile: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  const testFolderPath = '/test/folder';

  beforeEach(() => {
    vi.clearAllMocks();
    
    processManager = new ProcessManager(
      DEFAULT_DAEMON_CONFIG.autoRestart,
      testFolderPath,
      mockMcpServerExecutor,
      mockPidManager,
      mockLogger
    );
  });

  describe('startMcpServer', () => {
    it('should start MCP server successfully', async () => {
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);

      await processManager.startMcpServer();

      expect(mockMcpServerExecutor.start).toHaveBeenCalledWith(testFolderPath);
      expect(mockLogger.info).toHaveBeenCalledWith(`MCP server process started with PID: ${testPid}`);
      
      const status = processManager.getProcessStatus();
      expect(status.pid).toBe(testPid);
      expect(status.status).toBe(DaemonStatus.RUNNING);
    });

    it('should handle start failure', async () => {
      const error = new Error('Failed to start process');
      mockMcpServerExecutor.start.mockRejectedValue(error);

      await expect(processManager.startMcpServer()).rejects.toThrow('Failed to start process');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to start MCP server process:', error);
      
      const status = processManager.getProcessStatus();
      expect(status.status).toBe(DaemonStatus.FAILED);
    });

    it('should not start if already running', async () => {
      // Start process first
      mockMcpServerExecutor.start.mockResolvedValue(1234);
      await processManager.startMcpServer();
      
      // Clear mocks
      vi.clearAllMocks();
      
      // Try to start again
      await processManager.startMcpServer();
      
      expect(mockMcpServerExecutor.start).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('MCP server process is already running');
    });
  });

  describe('stopMcpServer', () => {
    it('should stop MCP server successfully', async () => {
      // Start process first
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      // Clear mocks
      vi.clearAllMocks();
      
      // Stop process
      mockMcpServerExecutor.stop.mockResolvedValue(undefined);
      await processManager.stopMcpServer();

      expect(mockMcpServerExecutor.stop).toHaveBeenCalledWith(testPid);
      expect(mockLogger.info).toHaveBeenCalledWith(`MCP server process ${testPid} stopped`);
      
      const status = processManager.getProcessStatus();
      expect(status.pid).toBe(null);
      expect(status.status).toBe(DaemonStatus.STOPPED);
    });

    it('should handle stop failure', async () => {
      // Start process first
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      // Setup stop failure
      const error = new Error('Failed to stop process');
      mockMcpServerExecutor.stop.mockRejectedValue(error);

      await expect(processManager.stopMcpServer()).rejects.toThrow('Failed to stop process');
      expect(mockLogger.error).toHaveBeenCalledWith('Error stopping MCP server process:', error);
    });

    it('should not stop if already stopped', async () => {
      await processManager.stopMcpServer();
      
      expect(mockMcpServerExecutor.stop).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('MCP server process is already stopped');
    });
  });

  describe('restartMcpServer', () => {
    it('should restart MCP server successfully', async () => {
      // Start process first
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      // Setup restart
      mockMcpServerExecutor.stop.mockResolvedValue(undefined);
      const newPid = 5678;
      mockMcpServerExecutor.start.mockResolvedValueOnce(newPid);
      
      await processManager.restartMcpServer();

      expect(mockMcpServerExecutor.stop).toHaveBeenCalled();
      expect(mockMcpServerExecutor.start).toHaveBeenCalledTimes(2); // Once for start, once for restart
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('MCP server process restarted successfully'));
      
      const status = processManager.getProcessStatus();
      expect(status.restartCount).toBe(1);
    });

    it('should handle restart failure', async () => {
      // Start process first
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      // Setup restart failure
      mockMcpServerExecutor.stop.mockResolvedValue(undefined);
      const error = new Error('Failed to restart');
      mockMcpServerExecutor.start.mockRejectedValueOnce(error);

      await expect(processManager.restartMcpServer()).rejects.toThrow('Failed to restart');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to restart MCP server process:', error);
    });
  });

  describe('killProcess', () => {
    it('should kill process successfully', async () => {
      // Start process first
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      // Kill process
      mockMcpServerExecutor.kill.mockResolvedValue(undefined);
      await processManager.killProcess();

      expect(mockMcpServerExecutor.kill).toHaveBeenCalledWith(testPid);
      expect(mockLogger.info).toHaveBeenCalledWith('MCP server process force killed');
      
      const status = processManager.getProcessStatus();
      expect(status.pid).toBe(null);
      expect(status.status).toBe(DaemonStatus.STOPPED);
    });

    it('should handle kill when no process running', async () => {
      await processManager.killProcess();
      
      expect(mockMcpServerExecutor.kill).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('No process to kill');
    });
  });

  describe('isProcessResponsive', () => {
    it('should return true for responsive process', async () => {
      // Start process first
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      mockPidManager.isProcessRunning.mockReturnValue(true);
      
      const isResponsive = await processManager.isProcessResponsive();
      
      expect(isResponsive).toBe(true);
      expect(mockPidManager.isProcessRunning).toHaveBeenCalledWith(testPid);
    });

    it('should return false for dead process', async () => {
      // Start process first
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      mockPidManager.isProcessRunning.mockReturnValue(false);
      
      const isResponsive = await processManager.isProcessResponsive();
      
      expect(isResponsive).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(`Process ${testPid} is no longer running`);
    });

    it('should return false when no process running', async () => {
      const isResponsive = await processManager.isProcessResponsive();
      
      expect(isResponsive).toBe(false);
      expect(mockPidManager.isProcessRunning).not.toHaveBeenCalled();
    });
  });

  describe('getProcessStatus', () => {
    it('should return correct status', async () => {
      const status = processManager.getProcessStatus();

      expect(status).toMatchObject({
        pid: null,
        status: DaemonStatus.STOPPED,
        startTime: null,
        uptime: 0,
        restartCount: 0,
        lastRestart: null,
        lastError: null
      });
    });

    it('should return status after starting', async () => {
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      // Add a small delay to ensure uptime > 0
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const status = processManager.getProcessStatus();
      
      expect(status.pid).toBe(testPid);
      expect(status.status).toBe(DaemonStatus.RUNNING);
      expect(status.startTime).toBeInstanceOf(Date);
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRestartStats', () => {
    it('should return restart statistics', () => {
      const stats = processManager.getRestartStats();
      
      expect(stats).toMatchObject({
        totalRestarts: 0,
        currentAttempts: 0,
        maxRetries: DEFAULT_DAEMON_CONFIG.autoRestart.maxRetries,
        lastRestart: null,
        autoRestartEnabled: DEFAULT_DAEMON_CONFIG.autoRestart.enabled
      });
    });
  });

  describe('getCurrentPid', () => {
    it('should return null when no process running', () => {
      expect(processManager.getCurrentPid()).toBe(null);
    });

    it('should return PID when process running', async () => {
      const testPid = 1234;
      mockMcpServerExecutor.start.mockResolvedValue(testPid);
      await processManager.startMcpServer();
      
      expect(processManager.getCurrentPid()).toBe(testPid);
    });
  });
});