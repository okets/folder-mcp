/**
 * Dependency injection container implementation
 * 
 * Provides service registration, resolution, and lifetime management
 * with support for singletons, factories, and transient instances.
 */

import { IDependencyContainer, ServiceToken } from './interfaces.js';

/**
 * Service registration types
 */
type ServiceRegistration = {
  type: 'instance';
  value: any;
} | {
  type: 'factory';
  factory: () => any;
} | {
  type: 'singleton';
  factory: () => any;
  instance?: any;
  pendingPromise?: Promise<any> | undefined;
};

/**
 * Dependency injection container implementation
 */
export class DependencyContainer implements IDependencyContainer {
  private services = new Map<string | symbol, ServiceRegistration>();

  /**
   * Register a service instance
   */
  register<T>(token: string | symbol, instance: T): void {
    if (this.services.has(token)) {
      console.warn(`⚠️ Service already registered for token: ${String(token)}. Overwriting.`);
    }
    
    this.services.set(token, {
      type: 'instance',
      value: instance
    });
  }

  /**
   * Register a service factory
   */
  registerFactory<T>(token: string | symbol, factory: () => T): void {
    if (this.services.has(token)) {
      console.warn(`⚠️ Service already registered for token: ${String(token)}. Overwriting.`);
    }
    
    this.services.set(token, {
      type: 'factory',
      factory
    });
  }

  /**
   * Register a singleton service factory
   */
  registerSingleton<T>(token: string | symbol, factory: () => T): void {
    if (this.services.has(token)) {
      console.warn(`⚠️ Service already registered for token: ${String(token)}. Overwriting.`);
    }
    
    this.services.set(token, {
      type: 'singleton',
      factory
    });
  }

  /**
   * Resolve a service instance asynchronously (for async factories)
   */
  async resolveAsync<T>(token: string | symbol): Promise<T> {
    const registration = this.services.get(token);
    
    if (!registration) {
      throw new Error(`Service not registered for token: ${String(token)}`);
    }

    switch (registration.type) {
      case 'instance':
        return registration.value;
        
      case 'factory':
        try {
          const result = registration.factory();
          // If the factory returns a Promise, await it
          return result instanceof Promise ? await result : result;
        } catch (error) {
          throw new Error(`Failed to create service for token ${String(token)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
      case 'singleton':
        if (registration.instance !== undefined) {
          return registration.instance;
        }
        
        // If there's already a pending Promise for this singleton, return it
        if (registration.pendingPromise) {
          return await registration.pendingPromise;
        }
        
        try {
          const result = registration.factory();
          
          if (result instanceof Promise) {
            // Store the Promise to prevent multiple concurrent executions
            registration.pendingPromise = result;
            
            try {
              const resolvedResult = await result;
              registration.instance = resolvedResult;
              registration.pendingPromise = undefined; // Clear the pending promise
              return resolvedResult;
            } catch (error) {
              registration.pendingPromise = undefined; // Clear the pending promise on error
              throw error;
            }
          } else {
            registration.instance = result;
            return result;
          }
        } catch (error) {
          throw new Error(`Failed to create singleton service for token ${String(token)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
      default:
        throw new Error(`Unknown registration type for token: ${String(token)}`);
    }
  }

  /**
   * Resolve a service instance
   */
  resolve<T>(token: string | symbol): T {
    const registration = this.services.get(token);
    
    if (!registration) {
      throw new Error(`Service not registered for token: ${String(token)}`);
    }

    switch (registration.type) {
      case 'instance':
        return registration.value;
        
      case 'factory':
        try {
          return registration.factory();
        } catch (error) {
          throw new Error(`Failed to create service for token ${String(token)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
      case 'singleton':
        if (registration.instance !== undefined) {
          return registration.instance;
        }
        
        // If there's a pending Promise, it means this is an async singleton
        // being resolved synchronously - this should fail
        if (registration.pendingPromise) {
          throw new Error(`Cannot resolve async singleton service synchronously for token: ${String(token)}`);
        }
        
        try {
          const result = registration.factory();
          
          if (result instanceof Promise) {
            throw new Error(`Cannot resolve async service synchronously for token: ${String(token)}`);
          }
          
          registration.instance = result;
          return result;
        } catch (error) {
          throw new Error(`Failed to create singleton service for token ${String(token)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
      default:
        throw new Error(`Unknown registration type for token: ${String(token)}`);
    }
  }

  /**
   * Check if service is registered
   */
  isRegistered(token: string | symbol): boolean {
    return this.services.has(token);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    // Clear singleton instances to allow garbage collection
    for (const registration of this.services.values()) {
      if (registration.type === 'singleton' && registration.instance) {
        // If the instance has a cleanup method, call it
        if (typeof registration.instance.dispose === 'function') {
          try {
            registration.instance.dispose();
          } catch (error) {
            console.warn('⚠️ Error disposing service:', error);
          }
        }
      }
    }
    
    this.services.clear();
  }

  /**
   * Get all registered service tokens (for debugging)
   */
  getRegisteredTokens(): (string | symbol)[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service registration info (for debugging)
   */
  getServiceInfo(token: string | symbol): { type: string; hasInstance: boolean } | null {
    const registration = this.services.get(token);
    if (!registration) {
      return null;
    }

    return {
      type: registration.type,
      hasInstance: registration.type === 'singleton' ? !!registration.instance : registration.type === 'instance'
    };
  }
}

/**
 * Global container instance
 */
let globalContainer: DependencyContainer | null = null;

/**
 * Get the global dependency container
 */
export function getContainer(): DependencyContainer {
  if (!globalContainer) {
    globalContainer = new DependencyContainer();
  }
  return globalContainer;
}

/**
 * Reset the global container (mainly for testing)
 */
export function resetContainer(): void {
  if (globalContainer) {
    globalContainer.clear();
  }
  globalContainer = null;
}

/**
 * Create a new isolated container (for testing or specific contexts)
 */
export function createContainer(): DependencyContainer {
  return new DependencyContainer();
}
