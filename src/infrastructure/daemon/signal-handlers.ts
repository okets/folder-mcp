/**
 * Platform-Specific Signal Handlers - Infrastructure Layer
 * 
 * Implements platform-specific signal handling for Unix and Windows systems.
 * Provides proper signal handling abstractions for different platforms.
 */

import { ISignalHandler } from '../../domain/daemon/signal-handler.js';
import { DaemonConfig } from '../../config/schema/daemon.js';
import { IDaemonService } from '../../domain/daemon/interfaces.js';

/**
 * Unix signal handler implementation
 */
export class UnixSignalHandler implements ISignalHandler {
  private isShutdownInProgress = false;
  private registeredHandlers: Map<string, NodeJS.SignalsListener> = new Map();

  constructor(
    private config: DaemonConfig,
    private daemonService: IDaemonService,
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {}

  /**
   * Register Unix signal handlers
   */
  registerHandlers(): void {
    if (this.registeredHandlers.size > 0) {
      this.logger.warn('Unix signal handlers are already registered');
      return;
    }

    this.logger.info('Registering Unix signal handlers...');

    // SIGTERM - Graceful shutdown
    const sigtermHandler = this.createHandler('SIGTERM', () => this.handleShutdown('SIGTERM'));
    this.registeredHandlers.set('SIGTERM', sigtermHandler);
    process.on('SIGTERM', sigtermHandler);

    // SIGINT - Interrupt (Ctrl+C)
    const sigintHandler = this.createHandler('SIGINT', () => this.handleShutdown('SIGINT'));
    this.registeredHandlers.set('SIGINT', sigintHandler);
    process.on('SIGINT', sigintHandler);

    // SIGHUP - Reload configuration
    const sighupHandler = this.createHandler('SIGHUP', () => this.handleReload('SIGHUP'));
    this.registeredHandlers.set('SIGHUP', sighupHandler);
    process.on('SIGHUP', sighupHandler);

    // SIGQUIT - Quit with core dump
    const sigquitHandler = this.createHandler('SIGQUIT', () => this.handleShutdown('SIGQUIT'));
    this.registeredHandlers.set('SIGQUIT', sigquitHandler);
    process.on('SIGQUIT', sigquitHandler);

    // Custom signals if configured
    if (this.config.shutdownSignal && !['SIGTERM', 'SIGINT', 'SIGQUIT'].includes(this.config.shutdownSignal)) {
      const customShutdownHandler = this.createHandler(this.config.shutdownSignal, () => this.handleShutdown(this.config.shutdownSignal!));
      this.registeredHandlers.set(this.config.shutdownSignal, customShutdownHandler);
      process.on(this.config.shutdownSignal as NodeJS.Signals, customShutdownHandler);
    }

    if (this.config.reloadSignal && !['SIGHUP'].includes(this.config.reloadSignal)) {
      const customReloadHandler = this.createHandler(this.config.reloadSignal, () => this.handleReload(this.config.reloadSignal!));
      this.registeredHandlers.set(this.config.reloadSignal, customReloadHandler);
      process.on(this.config.reloadSignal as NodeJS.Signals, customReloadHandler);
    }

    this.logger.info(`Unix signal handlers registered: ${Array.from(this.registeredHandlers.keys()).join(', ')}`);
  }

  /**
   * Unregister Unix signal handlers
   */
  unregisterHandlers(): void {
    if (this.registeredHandlers.size === 0) {
      this.logger.warn('No Unix signal handlers to unregister');
      return;
    }

    this.logger.info('Unregistering Unix signal handlers...');

    for (const [signal, handler] of this.registeredHandlers) {
      process.removeListener(signal as NodeJS.Signals, handler);
      this.logger.debug(`Unregistered Unix handler for ${signal}`);
    }

    this.registeredHandlers.clear();
    this.logger.info('All Unix signal handlers unregistered');
  }

  /**
   * Handle shutdown signal
   */
  async handleShutdown(signal: string): Promise<void> {
    if (this.isShutdownInProgress) {
      this.logger.warn(`Unix shutdown already in progress, ignoring ${signal}`);
      return;
    }

    this.isShutdownInProgress = true;
    this.logger.info(`Unix: Received shutdown signal: ${signal}`);

    try {
      await this.performGracefulShutdown();
      this.logger.info('Unix: Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      this.logger.error('Unix: Error during graceful shutdown:', error as Error);
      process.exit(1);
    }
  }

  /**
   * Handle reload signal
   */
  async handleReload(signal: string): Promise<void> {
    if (this.isShutdownInProgress) {
      this.logger.warn('Unix: Cannot reload during shutdown');
      return;
    }

    this.logger.info(`Unix: Received reload signal: ${signal}`);

    try {
      await this.daemonService.reload();
      this.logger.info('Unix: Configuration reload completed');

    } catch (error) {
      this.logger.error('Unix: Error during configuration reload:', error as Error);
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return this.isShutdownInProgress;
  }

  /**
   * Create signal handler with error handling
   */
  private createHandler(signal: string, handler: () => void | Promise<void>): NodeJS.SignalsListener {
    return () => {
      this.logger.debug(`Unix: Handling signal: ${signal}`);
      
      try {
        const result = handler();
        if (result instanceof Promise) {
          result.catch(error => {
            this.logger.error(`Unix: Error in ${signal} handler:`, error as Error);
          });
        }
      } catch (error) {
        this.logger.error(`Unix: Error in ${signal} handler:`, error as Error);
      }
    };
  }

  /**
   * Perform graceful shutdown
   */
  private async performGracefulShutdown(): Promise<void> {
    const shutdownTimeout = this.config.shutdownTimeout || 10000;
    
    this.logger.info(`Unix: Starting graceful shutdown (timeout: ${shutdownTimeout}ms)`);

    const shutdownPromise = this.daemonService.stop();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Unix shutdown timed out after ${shutdownTimeout}ms`));
      }, shutdownTimeout);
    });

    await Promise.race([shutdownPromise, timeoutPromise]);
    this.unregisterHandlers();
  }
}

/**
 * Windows signal handler implementation
 */
export class WindowsSignalHandler implements ISignalHandler {
  private isShutdownInProgress = false;
  private registeredHandlers: Map<string, NodeJS.SignalsListener> = new Map();

  constructor(
    private config: DaemonConfig,
    private daemonService: IDaemonService,
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {}

  /**
   * Register Windows signal handlers
   */
  registerHandlers(): void {
    if (this.registeredHandlers.size > 0) {
      this.logger.warn('Windows signal handlers are already registered');
      return;
    }

    this.logger.info('Registering Windows signal handlers...');

    // SIGINT - Interrupt (Ctrl+C)
    const sigintHandler = this.createHandler('SIGINT', () => this.handleShutdown('SIGINT'));
    this.registeredHandlers.set('SIGINT', sigintHandler);
    process.on('SIGINT', sigintHandler);

    // SIGTERM - Terminate
    const sigtermHandler = this.createHandler('SIGTERM', () => this.handleShutdown('SIGTERM'));
    this.registeredHandlers.set('SIGTERM', sigtermHandler);
    process.on('SIGTERM', sigtermHandler);

    // Windows-specific: SIGBREAK (Ctrl+Break)
    if (process.platform === 'win32') {
      const sigbreakHandler = this.createHandler('SIGBREAK', () => this.handleShutdown('SIGBREAK'));
      this.registeredHandlers.set('SIGBREAK', sigbreakHandler);
      process.on('SIGBREAK' as NodeJS.Signals, sigbreakHandler);
    }

    // Custom shutdown signal if configured
    if (this.config.shutdownSignal && !['SIGINT', 'SIGTERM', 'SIGBREAK'].includes(this.config.shutdownSignal)) {
      const customHandler = this.createHandler(this.config.shutdownSignal, () => this.handleShutdown(this.config.shutdownSignal!));
      this.registeredHandlers.set(this.config.shutdownSignal, customHandler);
      process.on(this.config.shutdownSignal as NodeJS.Signals, customHandler);
    }

    this.logger.info(`Windows signal handlers registered: ${Array.from(this.registeredHandlers.keys()).join(', ')}`);
  }

  /**
   * Unregister Windows signal handlers
   */
  unregisterHandlers(): void {
    if (this.registeredHandlers.size === 0) {
      this.logger.warn('No Windows signal handlers to unregister');
      return;
    }

    this.logger.info('Unregistering Windows signal handlers...');

    for (const [signal, handler] of this.registeredHandlers) {
      process.removeListener(signal as NodeJS.Signals, handler);
      this.logger.debug(`Unregistered Windows handler for ${signal}`);
    }

    this.registeredHandlers.clear();
    this.logger.info('All Windows signal handlers unregistered');
  }

  /**
   * Handle shutdown signal
   */
  async handleShutdown(signal: string): Promise<void> {
    if (this.isShutdownInProgress) {
      this.logger.warn(`Windows shutdown already in progress, ignoring ${signal}`);
      return;
    }

    this.isShutdownInProgress = true;
    this.logger.info(`Windows: Received shutdown signal: ${signal}`);

    try {
      await this.performGracefulShutdown();
      this.logger.info('Windows: Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      this.logger.error('Windows: Error during graceful shutdown:', error as Error);
      process.exit(1);
    }
  }

  /**
   * Handle reload signal (Windows doesn't support SIGHUP)
   */
  async handleReload(signal: string): Promise<void> {
    this.logger.warn(`Windows: Reload signal ${signal} not supported on Windows platform`);
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return this.isShutdownInProgress;
  }

  /**
   * Create signal handler with error handling
   */
  private createHandler(signal: string, handler: () => void | Promise<void>): NodeJS.SignalsListener {
    return () => {
      this.logger.debug(`Windows: Handling signal: ${signal}`);
      
      try {
        const result = handler();
        if (result instanceof Promise) {
          result.catch(error => {
            this.logger.error(`Windows: Error in ${signal} handler:`, error as Error);
          });
        }
      } catch (error) {
        this.logger.error(`Windows: Error in ${signal} handler:`, error as Error);
      }
    };
  }

  /**
   * Perform graceful shutdown
   */
  private async performGracefulShutdown(): Promise<void> {
    const shutdownTimeout = this.config.shutdownTimeout || 10000;
    
    this.logger.info(`Windows: Starting graceful shutdown (timeout: ${shutdownTimeout}ms)`);

    const shutdownPromise = this.daemonService.stop();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Windows shutdown timed out after ${shutdownTimeout}ms`));
      }, shutdownTimeout);
    });

    await Promise.race([shutdownPromise, timeoutPromise]);
    this.unregisterHandlers();
  }
}

/**
 * Factory function to create platform-specific signal handler
 */
export function createSignalHandler(
  config: DaemonConfig,
  daemonService: IDaemonService,
  logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
): ISignalHandler {
  if (process.platform === 'win32') {
    return new WindowsSignalHandler(config, daemonService, logger);
  } else {
    return new UnixSignalHandler(config, daemonService, logger);
  }
}