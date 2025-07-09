/**
 * Development Mode Features
 * 
 * Implements hot reload and development-time features for enhanced MCP server development.
 * These features are only active when FOLDER_MCP_DEVELOPMENT_ENABLED=true.
 */

import { watch } from 'chokidar';
import type { EnhancedMCPConfig } from './enhanced-mcp.js';
import type { ILoggingService } from '../di/interfaces.js';

export interface DevModeManager {
  startWatching(): Promise<void>;
  stopWatching(): Promise<void>;
  isWatching(): boolean;
}

export class DevModeManager implements DevModeManager {
  private watcher: any = null;
  private restartCallback: (() => void) | null = null;

  constructor(
    private readonly config: EnhancedMCPConfig,
    private readonly logger: ILoggingService,
    restartCallback?: () => void
  ) {
    this.restartCallback = restartCallback || null;
  }

  async startWatching(): Promise<void> {
    if (!this.config.dev?.watch || !this.config.dev?.hotReload) {
      this.logger.info('Development mode disabled or hot reload not configured');
      return;
    }

    if (this.watcher) {
      this.logger.info('File watcher already running');
      return;
    }

    const watchPattern = this.config.dev.watch;
    this.logger.info('Starting development mode file watcher', { pattern: watchPattern });

    try {
      this.watcher = watch(watchPattern, {
        ignoreInitial: true,
        persistent: true,
      });

      this.watcher.on('change', (path: string) => {
        this.logger.info('File changed - triggering hot reload', { path });
        this.handleFileChange(path);
      });

      this.watcher.on('add', (path: string) => {
        this.logger.info('File added - triggering hot reload', { path });
        this.handleFileChange(path);
      });

      this.watcher.on('unlink', (path: string) => {
        this.logger.info('File removed - triggering hot reload', { path });
        this.handleFileChange(path);
      });

      this.watcher.on('error', (error: Error) => {
        this.logger.error('File watcher error', error);
      });

      this.logger.info('Development mode file watcher started successfully', { 
        pattern: watchPattern,
        hotReload: this.config.dev.hotReload 
      });

    } catch (error) {
      this.logger.error('Failed to start development mode file watcher', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async stopWatching(): Promise<void> {
    if (this.watcher) {
      this.logger.info('Stopping development mode file watcher');
      await this.watcher.close();
      this.watcher = null;
      this.logger.info('Development mode file watcher stopped');
    }
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }

  private handleFileChange(path: string): void {
    this.logger.info('🔥 Hot reload triggered', { changedFile: path });
    
    if (this.restartCallback) {
      // Debounce rapid file changes
      setTimeout(() => {
        if (this.restartCallback) {
          this.logger.info('🚀 Restarting MCP server due to file changes');
          this.restartCallback();
        }
      }, 500);
    } else {
      this.logger.warn('Hot reload triggered but no restart callback configured');
    }
  }
}

/**
 * Initialize development mode features if enabled
 */
export async function initializeDevMode(
  config: EnhancedMCPConfig | null,
  logger: ILoggingService,
  restartCallback?: () => void
): Promise<DevModeManager | null> {
  if (!config?.dev?.hotReload) {
    logger.info('Development mode not enabled');
    return null;
  }

  logger.info('Initializing development mode features', {
    watch: config.dev.watch,
    debug: config.dev.debug,
    hotReload: config.dev.hotReload,
    autoRestart: config.dev.autoRestart
  });

  const devManager = new DevModeManager(config, logger, restartCallback);
  await devManager.startWatching();

  return devManager;
}

/**
 * Get debug configuration for development mode
 */
export function getDebugConfig(config: EnhancedMCPConfig): any {
  if (!config.dev?.debug?.enabled) {
    return null;
  }

  return {
    type: config.dev.debug.type || 'node',
    port: config.dev.debug.port || 9229,
    enabled: config.dev.debug.enabled
  };
}

/**
 * Check if development mode features should be enabled
 */
export function shouldEnableDevMode(): boolean {
  return process.env.FOLDER_MCP_DEVELOPMENT_ENABLED === 'true' || 
         process.env.NODE_ENV === 'development';
}
