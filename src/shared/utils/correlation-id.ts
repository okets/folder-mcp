/**
 * Correlation ID Utilities
 * 
 * Provides request correlation tracking for distributed logging.
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface CorrelationContext {
  id: string;
  source: string;
  startTime: number;
  metadata?: Record<string, any>;
}

class CorrelationManager {
  private storage = new AsyncLocalStorage<CorrelationContext>();
  private counter = 0;

  /**
   * Generate a new correlation ID
   */
  generateId(source: string = 'folder-mcp'): string {
    return `${source}-${Date.now()}-${++this.counter}`;
  }

  /**
   * Run code with correlation context
   */
  runWithContext<T>(context: CorrelationContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * Run code with new correlation ID
   */
  runWithNewId<T>(source: string, fn: () => T, metadata?: Record<string, any>): T {
    const context: CorrelationContext = {
      id: this.generateId(source),
      source,
      startTime: Date.now(),
      ...(metadata && { metadata })
    };
    return this.runWithContext(context, fn);
  }

  /**
   * Get current correlation context
   */
  getCurrentContext(): CorrelationContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Get current correlation ID
   */
  getCurrentId(): string | undefined {
    return this.getCurrentContext()?.id;
  }

  /**
   * Add metadata to current context
   */
  addMetadata(key: string, value: any): void {
    const context = this.getCurrentContext();
    if (context) {
      if (!context.metadata) {
        context.metadata = {};
      }
      context.metadata[key] = value;
    }
  }

  /**
   * Get elapsed time for current context
   */
  getElapsedTime(): number {
    const context = this.getCurrentContext();
    return context ? Date.now() - context.startTime : 0;
  }
}

// Global instance
export const correlationManager = new CorrelationManager();

/**
 * Decorator for automatic correlation context
 */
export function withCorrelation(source: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return correlationManager.runWithNewId(source, () => {
        return method.apply(this, args);
      });
    };

    return descriptor;
  };
}
