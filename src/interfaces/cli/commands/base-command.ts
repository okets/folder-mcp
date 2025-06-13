/**
 * Base Command Class
 * 
 * Provides lazy dependency injection resolution for CLI commands.
 * Commands extend this class to avoid requiring services at construction time.
 */

import { Command } from 'commander';
import { setupDependencyInjection } from '../../../di/setup.js';
import { DependencyContainer } from '../../../di/container.js';

export abstract class BaseCommand extends Command {
  private _container?: DependencyContainer;
  
  constructor(name: string) {
    super(name);
  }
  
  /**
   * Get or create the DI container with the provided folder path
   */
  protected getContainer(folderPath: string, logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'): DependencyContainer {
    if (!this._container) {
      this._container = setupDependencyInjection({
        folderPath,
        logLevel
      });
    }
    return this._container;
  }
  
  /**
   * Helper method to resolve a service from the container
   */
  protected resolveService<T>(folderPath: string, token: symbol, logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'): T {
    const container = this.getContainer(folderPath, logLevel);
    return container.resolve(token) as T;
  }
}
