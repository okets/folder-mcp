/**
 * Unit tests for Signal Handler
 * 
 * Tests signal handling functionality without external dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignalHandler } from '../../../src/domain/daemon/signal-handler.js';
import { UnixSignalHandler, WindowsSignalHandler, createSignalHandler } from '../../../src/infrastructure/daemon/signal-handlers.js';
import { DaemonStatus } from '../../../src/domain/daemon/interfaces.js';
import { DEFAULT_DAEMON_CONFIG } from '../../../src/config/schema/daemon.js';

// Mock implementations
const mockDaemonService = {
  start: vi.fn(),
  stop: vi.fn(),
  restart: vi.fn(),
  getStatus: vi.fn(() => ({
    pid: 1234,
    status: DaemonStatus.RUNNING,
    startTime: new Date(),
    uptime: 1000,
    restartCount: 0,
    lastRestart: null,
    lastError: null
  })),
  reload: vi.fn(),
  isRunning: vi.fn(() => true),
  getPid: vi.fn(() => 1234)
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// Mock process methods
const originalPlatform = process.platform;
const originalExit = process.exit;
const originalOn = process.on;
const originalRemoveListener = process.removeListener;

describe('SignalHandler', () => {
  let signalHandler: SignalHandler;
  let config = { ...DEFAULT_DAEMON_CONFIG };

  beforeEach(() => {
    vi.clearAllMocks();
    config = { ...DEFAULT_DAEMON_CONFIG };
    
    // Mock process methods
    process.exit = vi.fn() as any;
    process.on = vi.fn() as any;
    process.removeListener = vi.fn() as any;
    
    signalHandler = new SignalHandler(
      config,
      mockDaemonService,
      mockLogger
    );
  });

  afterEach(() => {
    signalHandler.unregisterHandlers();
    // Restore original methods
    process.exit = originalExit;
    process.on = originalOn;
    process.removeListener = originalRemoveListener;
  });

  describe('registerHandlers', () => {
    it('should register signal handlers successfully', () => {
      signalHandler.registerHandlers();

      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Registering signal handlers...');
    });

    it('should register reload handlers on Unix platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      signalHandler.registerHandlers();

      expect(process.on).toHaveBeenCalledWith('SIGHUP', expect.any(Function));
      expect(mockLogger.debug).toHaveBeenCalledWith('Registered reload handler for SIGHUP');
    });

    it('should not register reload handlers on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      signalHandler.registerHandlers();

      expect(process.on).not.toHaveBeenCalledWith('SIGHUP', expect.any(Function));
    });

    it('should not register handlers twice', () => {
      signalHandler.registerHandlers();
      vi.clearAllMocks();
      
      signalHandler.registerHandlers();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Signal handlers are already registered');
      expect(process.on).not.toHaveBeenCalled();
    });

    it('should register custom signals if configured', () => {
      config.shutdownSignal = 'SIGUSR2';  // Use a signal not in the default list
      config.reloadSignal = 'SIGUSR1';    // Use a signal not in the default list
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      const customSignalHandler = new SignalHandler(config, mockDaemonService, mockLogger);
      customSignalHandler.registerHandlers();

      // Should register the custom shutdown signal (not in defaults)
      expect(process.on).toHaveBeenCalledWith('SIGUSR2', expect.any(Function));
      // Should register the custom reload signal (not in defaults)
      expect(process.on).toHaveBeenCalledWith('SIGUSR1', expect.any(Function));
    });
  });

  describe('unregisterHandlers', () => {
    it('should unregister signal handlers successfully', () => {
      signalHandler.registerHandlers();
      vi.clearAllMocks();
      
      signalHandler.unregisterHandlers();

      expect(process.removeListener).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Unregistering signal handlers...');
      expect(mockLogger.info).toHaveBeenCalledWith('All signal handlers unregistered');
    });

    it('should handle unregister when no handlers registered', () => {
      signalHandler.unregisterHandlers();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('No signal handlers to unregister');
      expect(process.removeListener).not.toHaveBeenCalled();
    });
  });

  describe('handleShutdown', () => {
    it('should handle shutdown signal successfully', async () => {
      mockDaemonService.stop.mockResolvedValue(undefined);
      
      await signalHandler.handleShutdown('SIGTERM');

      expect(mockLogger.info).toHaveBeenCalledWith('Received shutdown signal: SIGTERM');
      expect(mockDaemonService.stop).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Graceful shutdown completed');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle shutdown failure', async () => {
      const error = new Error('Shutdown failed');
      mockDaemonService.stop.mockRejectedValue(error);
      
      await signalHandler.handleShutdown('SIGTERM');

      expect(mockLogger.error).toHaveBeenCalledWith('Error during graceful shutdown:', error);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should prevent multiple shutdown attempts', async () => {
      mockDaemonService.stop.mockResolvedValue(undefined);
      
      // Start first shutdown
      const shutdownPromise = signalHandler.handleShutdown('SIGTERM');
      
      // Try second shutdown
      await signalHandler.handleShutdown('SIGINT');
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Shutdown already in progress, ignoring SIGINT');
      
      // Complete first shutdown
      await shutdownPromise;
    });

    it('should handle shutdown timeout', async () => {
      // Create a config with very short timeout
      const shortTimeoutConfig = { ...config, shutdownTimeout: 100 };
      const timeoutSignalHandler = new SignalHandler(shortTimeoutConfig, mockDaemonService, mockLogger);
      
      // Make stop method hang
      mockDaemonService.stop.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));
      
      await timeoutSignalHandler.handleShutdown('SIGTERM');

      expect(mockLogger.error).toHaveBeenCalledWith('Error during graceful shutdown:', expect.any(Error));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('handleReload', () => {
    it('should handle reload signal successfully', async () => {
      mockDaemonService.reload.mockResolvedValue(undefined);
      
      await signalHandler.handleReload('SIGHUP');

      expect(mockLogger.info).toHaveBeenCalledWith('Received reload signal: SIGHUP');
      expect(mockDaemonService.reload).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Configuration reload completed');
    });

    it('should handle reload failure', async () => {
      const error = new Error('Reload failed');
      mockDaemonService.reload.mockRejectedValue(error);
      
      await signalHandler.handleReload('SIGHUP');

      expect(mockLogger.error).toHaveBeenCalledWith('Error during configuration reload:', error);
    });

    it('should prevent reload during shutdown', async () => {
      mockDaemonService.stop.mockResolvedValue(undefined);
      
      // Start shutdown
      const shutdownPromise = signalHandler.handleShutdown('SIGTERM');
      
      // Try reload during shutdown
      await signalHandler.handleReload('SIGHUP');
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot reload during shutdown');
      expect(mockDaemonService.reload).not.toHaveBeenCalled();
      
      // Complete shutdown
      await shutdownPromise;
    });
  });

  describe('isShuttingDown', () => {
    it('should return false initially', () => {
      expect(signalHandler.isShuttingDown()).toBe(false);
    });

    it('should return true during shutdown', async () => {
      mockDaemonService.stop.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const shutdownPromise = signalHandler.handleShutdown('SIGTERM');
      
      expect(signalHandler.isShuttingDown()).toBe(true);
      
      await shutdownPromise;
    });
  });

  describe('events', () => {
    it('should emit shutdown event', () => {
      const shutdownListener = vi.fn();
      signalHandler.on('shutdown', shutdownListener);
      
      // Test the createShutdownHandler method by triggering it
      signalHandler.registerHandlers();
      
      // Simulate emitting the shutdown event (which the createShutdownHandler does)
      signalHandler.emit('shutdown', 'SIGTERM');

      expect(shutdownListener).toHaveBeenCalledWith('SIGTERM');
    });

    it('should emit reload event', () => {
      const reloadListener = vi.fn();
      signalHandler.on('reload', reloadListener);
      
      // Test the createReloadHandler method by triggering it
      signalHandler.registerHandlers();
      
      // Simulate emitting the reload event (which the createReloadHandler does)
      signalHandler.emit('reload', 'SIGHUP');

      expect(reloadListener).toHaveBeenCalledWith('SIGHUP');
    });

    it('should emit beforeShutdown and afterShutdown events', async () => {
      mockDaemonService.stop.mockResolvedValue(undefined);
      
      const beforeShutdownListener = vi.fn();
      const afterShutdownListener = vi.fn();
      signalHandler.on('beforeShutdown', beforeShutdownListener);
      signalHandler.on('afterShutdown', afterShutdownListener);
      
      await signalHandler.handleShutdown('SIGTERM');

      expect(beforeShutdownListener).toHaveBeenCalled();
      expect(afterShutdownListener).toHaveBeenCalled();
    });
  });
});

describe('UnixSignalHandler', () => {
  let unixSignalHandler: UnixSignalHandler;
  let config = { ...DEFAULT_DAEMON_CONFIG };

  beforeEach(() => {
    vi.clearAllMocks();
    config = { ...DEFAULT_DAEMON_CONFIG };
    
    // Mock process methods
    process.exit = vi.fn() as any;
    process.on = vi.fn() as any;
    process.removeListener = vi.fn() as any;
    
    unixSignalHandler = new UnixSignalHandler(
      config,
      mockDaemonService,
      mockLogger
    );
  });

  afterEach(() => {
    unixSignalHandler.unregisterHandlers();
    // Restore original methods
    process.exit = originalExit;
    process.on = originalOn;
    process.removeListener = originalRemoveListener;
  });

  describe('registerHandlers', () => {
    it('should register Unix-specific signal handlers', () => {
      unixSignalHandler.registerHandlers();

      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGHUP', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGQUIT', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Registering Unix signal handlers...');
    });

    it('should handle Unix shutdown signals', async () => {
      mockDaemonService.stop.mockResolvedValue(undefined);
      
      await unixSignalHandler.handleShutdown('SIGTERM');

      expect(mockLogger.info).toHaveBeenCalledWith('Unix: Received shutdown signal: SIGTERM');
      expect(mockDaemonService.stop).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle Unix reload signals', async () => {
      mockDaemonService.reload.mockResolvedValue(undefined);
      
      await unixSignalHandler.handleReload('SIGHUP');

      expect(mockLogger.info).toHaveBeenCalledWith('Unix: Received reload signal: SIGHUP');
      expect(mockDaemonService.reload).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Unix: Configuration reload completed');
    });
  });
});

describe('WindowsSignalHandler', () => {
  let windowsSignalHandler: WindowsSignalHandler;
  let config = { ...DEFAULT_DAEMON_CONFIG };

  beforeEach(() => {
    vi.clearAllMocks();
    config = { ...DEFAULT_DAEMON_CONFIG };
    
    // Mock process methods
    process.exit = vi.fn() as any;
    process.on = vi.fn() as any;
    process.removeListener = vi.fn() as any;
    
    windowsSignalHandler = new WindowsSignalHandler(
      config,
      mockDaemonService,
      mockLogger
    );
  });

  afterEach(() => {
    windowsSignalHandler.unregisterHandlers();
    // Restore original methods
    process.exit = originalExit;
    process.on = originalOn;
    process.removeListener = originalRemoveListener;
  });

  describe('registerHandlers', () => {
    it('should register Windows-specific signal handlers', () => {
      windowsSignalHandler.registerHandlers();

      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Registering Windows signal handlers...');
    });

    it('should handle Windows shutdown signals', async () => {
      mockDaemonService.stop.mockResolvedValue(undefined);
      
      await windowsSignalHandler.handleShutdown('SIGINT');

      expect(mockLogger.info).toHaveBeenCalledWith('Windows: Received shutdown signal: SIGINT');
      expect(mockDaemonService.stop).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should not support reload on Windows', async () => {
      await windowsSignalHandler.handleReload('SIGHUP');

      expect(mockLogger.warn).toHaveBeenCalledWith('Windows: Reload signal SIGHUP not supported on Windows platform');
      expect(mockDaemonService.reload).not.toHaveBeenCalled();
    });
  });
});

describe('createSignalHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('should create Windows signal handler on Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    
    const handler = createSignalHandler(DEFAULT_DAEMON_CONFIG, mockDaemonService, mockLogger);
    
    expect(handler).toBeInstanceOf(WindowsSignalHandler);
  });

  it('should create Unix signal handler on Unix systems', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    
    const handler = createSignalHandler(DEFAULT_DAEMON_CONFIG, mockDaemonService, mockLogger);
    
    expect(handler).toBeInstanceOf(UnixSignalHandler);
  });

  it('should create Unix signal handler on macOS', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    
    const handler = createSignalHandler(DEFAULT_DAEMON_CONFIG, mockDaemonService, mockLogger);
    
    expect(handler).toBeInstanceOf(UnixSignalHandler);
  });
});