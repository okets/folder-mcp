/**
 * Signal Handler - Domain Layer
 * 
 * Handles system signals for daemon control (shutdown, reload, etc.)
 * Provides cross-platform signal handling with graceful shutdown.
 */

import { EventEmitter } from 'events';
import { DaemonConfig } from '../../config/schema/daemon.js';
import { IDaemonService } from './interfaces.js';

/**
 * Signal handler events
 */
export interface SignalHandlerEvents {
  'shutdown': (signal: string) => void;
  'reload': (signal: string) => void;
  'beforeShutdown': () => void;
  'afterShutdown': () => void;
}

/**
 * Signal handler interface
 */
export interface ISignalHandler {
  registerHandlers(): void;
  unregisterHandlers(): void;
  handleShutdown(signal: string): Promise<void>;
  handleReload(signal: string): Promise<void>;
  isShuttingDown(): boolean;
}

/**
 * Signal handler implementation
 */
export class SignalHandler extends EventEmitter implements ISignalHandler {
  private isShutdownInProgress = false;
  private registeredHandlers: Map<string, NodeJS.SignalsListener> = new Map();
  private uncaughtExceptionHandler: ((error: Error) => void) | null = null;
  private unhandledRejectionHandler: ((reason: unknown, promise: Promise<any>) => void) | null = null;

  constructor(
    private config: DaemonConfig,
    private daemonService: IDaemonService,
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {
    super();
  }

  /**
   * Register signal handlers
   */
  registerHandlers(): void {
    if (this.registeredHandlers.size > 0) {
      this.logger.warn('Signal handlers are already registered');
      return;
    }

    this.logger.info('Registering signal handlers...');

    // Shutdown signals
    const shutdownSignals = ['SIGTERM', 'SIGINT'];
    if (this.config.shutdownSignal && !shutdownSignals.includes(this.config.shutdownSignal)) {
      shutdownSignals.push(this.config.shutdownSignal);
    }

    for (const signal of shutdownSignals) {
      const handler = this.createShutdownHandler(signal);
      this.registeredHandlers.set(signal, handler);
      process.on(signal as NodeJS.Signals, handler);
      this.logger.debug(`Registered shutdown handler for ${signal}`);
    }

    // Reload signals (Unix only)
    if (process.platform !== 'win32') {
      const reloadSignals = ['SIGHUP'];
      if (this.config.reloadSignal && !reloadSignals.includes(this.config.reloadSignal)) {
        reloadSignals.push(this.config.reloadSignal);
      }

      for (const signal of reloadSignals) {
        const handler = this.createReloadHandler(signal);
        this.registeredHandlers.set(signal, handler);
        process.on(signal as NodeJS.Signals, handler);
        this.logger.debug(`Registered reload handler for ${signal}`);
      }
    }

    // Handle uncaught exceptions and unhandled rejections
    this.uncaughtExceptionHandler = this.createUncaughtExceptionHandler();
    this.unhandledRejectionHandler = this.createUnhandledRejectionHandler();
    
    process.on('uncaughtException', this.uncaughtExceptionHandler);
    process.on('unhandledRejection', this.unhandledRejectionHandler);

    this.logger.info(`Signal handlers registered for platform: ${process.platform}`);
  }

  /**
   * Unregister signal handlers
   */
  unregisterHandlers(): void {
    if (this.registeredHandlers.size === 0) {
      this.logger.warn('No signal handlers to unregister');
      return;
    }

    this.logger.info('Unregistering signal handlers...');

    for (const [signal, handler] of this.registeredHandlers) {
      process.removeListener(signal as NodeJS.Signals, handler);
      this.logger.debug(`Unregistered handler for ${signal}`);
    }

    // Remove uncaught exception handlers separately
    if (this.uncaughtExceptionHandler) {
      process.removeListener('uncaughtException', this.uncaughtExceptionHandler);
      this.uncaughtExceptionHandler = null;
    }

    if (this.unhandledRejectionHandler) {
      process.removeListener('unhandledRejection', this.unhandledRejectionHandler);
      this.unhandledRejectionHandler = null;
    }

    this.registeredHandlers.clear();
    this.logger.info('All signal handlers unregistered');
  }

  /**
   * Handle shutdown signal
   */
  async handleShutdown(signal: string): Promise<void> {
    if (this.isShutdownInProgress) {
      this.logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    this.isShutdownInProgress = true;
    this.logger.info(`Received shutdown signal: ${signal}`);

    try {
      // Emit before shutdown event
      this.emit('beforeShutdown');

      // Start graceful shutdown
      await this.performGracefulShutdown();

      // Emit after shutdown event
      this.emit('afterShutdown');
      
      this.logger.info('Graceful shutdown completed');
      
      // Exit with success code
      process.exit(0);

    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error as Error);
      
      // Force exit on error
      process.exit(1);
    }
  }

  /**
   * Handle reload signal
   */
  async handleReload(signal: string): Promise<void> {
    if (this.isShutdownInProgress) {
      this.logger.warn('Cannot reload during shutdown');
      return;
    }

    this.logger.info(`Received reload signal: ${signal}`);

    try {
      // Emit reload event
      this.emit('reload', signal);

      // Reload daemon configuration
      await this.daemonService.reload();

      this.logger.info('Configuration reload completed');

    } catch (error) {
      this.logger.error('Error during configuration reload:', error as Error);
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return this.isShutdownInProgress;
  }

  /**
   * Create shutdown handler
   */
  private createShutdownHandler(signal: string): NodeJS.SignalsListener {
    return () => {
      this.emit('shutdown', signal);
      this.handleShutdown(signal).catch(error => {
        this.logger.error(`Error in shutdown handler for ${signal}:`, error as Error);
        process.exit(1);
      });
    };
  }

  /**
   * Create reload handler
   */
  private createReloadHandler(signal: string): NodeJS.SignalsListener {
    return () => {
      this.emit('reload', signal);
      this.handleReload(signal).catch(error => {
        this.logger.error(`Error in reload handler for ${signal}:`, error as Error);
      });
    };
  }

  /**
   * Create uncaught exception handler
   */
  private createUncaughtExceptionHandler(): (error: Error) => void {
    return (error: Error) => {
      this.logger.error('Uncaught exception:', error);
      this.handleShutdown('uncaughtException').catch(() => {
        process.exit(1);
      });
    };
  }

  /**
   * Create unhandled rejection handler
   */
  private createUnhandledRejectionHandler(): (reason: unknown, promise: Promise<any>) => void {
    return (reason: unknown, promise: Promise<any>) => {
      this.logger.error('Unhandled promise rejection:', reason as Error);
      this.logger.error('Promise: ' + String(promise));
      this.handleShutdown('unhandledRejection').catch(() => {
        process.exit(1);
      });
    };
  }

  /**
   * Perform graceful shutdown sequence
   */
  private async performGracefulShutdown(): Promise<void> {
    const shutdownTimeout = this.config.shutdownTimeout || 10000;
    
    this.logger.info(`Starting graceful shutdown (timeout: ${shutdownTimeout}ms)`);

    // Create shutdown promise
    const shutdownPromise = this.executeShutdownSequence();

    // Create timeout promise
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Shutdown timed out after ${shutdownTimeout}ms`));
      }, shutdownTimeout);
    });

    try {
      // Race between shutdown and timeout
      await Promise.race([shutdownPromise, timeoutPromise]);
      
    } catch (error) {
      this.logger.error('Shutdown timeout exceeded, forcing exit:', error as Error);
      throw error;
    }
  }

  /**
   * Execute shutdown sequence
   */
  private async executeShutdownSequence(): Promise<void> {
    this.logger.info('Executing shutdown sequence...');

    try {
      // 1. Stop accepting new requests
      this.logger.debug('Step 1: Stopping new requests');

      // 2. Stop daemon service
      this.logger.debug('Step 2: Stopping daemon service');
      await this.daemonService.stop();

      // 3. Clean up resources
      this.logger.debug('Step 3: Cleaning up resources');
      this.unregisterHandlers();

      // 4. Final cleanup
      this.logger.debug('Step 4: Final cleanup complete');

    } catch (error) {
      this.logger.error('Error in shutdown sequence:', error as Error);
      throw error;
    }
  }
}