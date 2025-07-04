/**
 * Configuration File Watcher
 * 
 * Monitors configuration files for changes and triggers reload events.
 * Supports debouncing to handle rapid file changes gracefully.
 */

import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { join, resolve } from 'path';
import { debounce } from '../utils/debounce.js';
import { createConsoleLogger } from '../infrastructure/logging/logger.js';

const logger = createConsoleLogger('warn');

/**
 * Configuration change event
 */
export interface ConfigFileChangeEvent {
  path: string;
  type: 'add' | 'change' | 'unlink';
  timestamp: Date;
}

/**
 * Configuration watcher options
 */
export interface ConfigWatcherOptions {
  /**
   * Paths to watch
   */
  paths: string[];

  /**
   * Ignore patterns
   */
  ignored?: string[];

  /**
   * Debounce delay in milliseconds
   */
  debounceDelay?: number;

  /**
   * Enable polling (for network drives)
   */
  usePolling?: boolean;

  /**
   * Polling interval
   */
  interval?: number;
}

/**
 * Configuration file watcher
 */
export class ConfigurationWatcher extends EventEmitter {
  private watcher?: FSWatcher;
  private options: Required<ConfigWatcherOptions>;
  private isWatching: boolean = false;
  private debouncedEmit: (event: ConfigFileChangeEvent) => void;

  constructor(options: ConfigWatcherOptions) {
    super();
    
    this.options = {
      paths: options.paths,
      ignored: options.ignored || [],
      debounceDelay: options.debounceDelay || 500,
      usePolling: options.usePolling || false,
      interval: options.interval || 100
    };

    // Create debounced emit function
    this.debouncedEmit = debounce(
      (event: ConfigFileChangeEvent) => this.emit('change', event),
      this.options.debounceDelay
    );
  }

  /**
   * Start watching configuration files
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      logger.warn('Configuration watcher already running');
      return;
    }

    try {
      // Resolve all paths
      const resolvedPaths = this.options.paths.map(p => resolve(p));

      // Create watcher
      this.watcher = watch(resolvedPaths, {
        persistent: true,
        ignoreInitial: true,
        ignored: this.options.ignored,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100
        },
        usePolling: this.options.usePolling,
        interval: this.options.interval
      });

      // Set up event handlers
      this.watcher
        .on('add', (path) => this.handleChange(path, 'add'))
        .on('change', (path) => this.handleChange(path, 'change'))
        .on('unlink', (path) => this.handleChange(path, 'unlink'))
        .on('error', (error) => this.handleError(error as Error))
        .on('ready', () => {
          this.isWatching = true;
          logger.info('Configuration watcher started', { paths: resolvedPaths });
          this.emit('ready');
        });

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to start configuration watcher:', err);
      throw error;
    }
  }

  /**
   * Stop watching configuration files
   */
  async stop(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      return;
    }

    try {
      await this.watcher.close();
      this.watcher = undefined as any;
      this.isWatching = false;
      logger.info('Configuration watcher stopped');
      this.emit('stopped');
    } catch (error) {
      logger.error('Failed to stop configuration watcher:', error as Error);
      throw error;
    }
  }

  /**
   * Add a path to watch
   */
  async addPath(path: string): Promise<void> {
    if (!this.watcher) {
      throw new Error('Watcher not started');
    }

    const resolvedPath = resolve(path);
    this.watcher.add(resolvedPath);
    this.options.paths.push(resolvedPath);
    logger.debug('Added path to watcher:', { path: resolvedPath });
  }

  /**
   * Remove a path from watching
   */
  async removePath(path: string): Promise<void> {
    if (!this.watcher) {
      throw new Error('Watcher not started');
    }

    const resolvedPath = resolve(path);
    await this.watcher.unwatch(resolvedPath);
    this.options.paths = this.options.paths.filter(p => p !== resolvedPath);
    logger.debug('Removed path from watcher:', { path: resolvedPath });
  }

  /**
   * Get watched paths
   */
  getWatchedPaths(): string[] {
    if (!this.watcher) {
      return [];
    }
    
    const watched = this.watcher.getWatched();
    const paths: string[] = [];
    
    for (const dir in watched) {
      const files = watched[dir];
      if (files && Array.isArray(files)) {
        for (const file of files) {
          paths.push(join(dir, file));
        }
      }
    }
    
    return paths;
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this.isWatching;
  }

  /**
   * Handle file change event
   */
  private handleChange(path: string, type: 'add' | 'change' | 'unlink'): void {
    const event: ConfigFileChangeEvent = {
      path,
      type,
      timestamp: new Date()
    };

    logger.debug('Configuration file change detected:', event);
    
    // Use debounced emit to handle rapid changes
    if (this.debouncedEmit) {
      this.debouncedEmit(event);
    }
  }

  /**
   * Handle watcher error
   */
  private handleError(error: Error): void {
    logger.error('Configuration watcher error:', error);
    this.emit('error', error);
  }
}

/**
 * Create a simple debounce utility if not available
 */
function createDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function debounced(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}