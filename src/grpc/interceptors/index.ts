/**
 * Interceptors Index
 * 
 * Exports all gRPC interceptors
 */

import { IDependencyContainer } from '../../di/interfaces.js';

export interface GrpcInterceptors {
  auth?: any;
  logging?: any;
  metrics?: any;
}

/**
 * Create all interceptors
 */
export function createInterceptors(container: IDependencyContainer): GrpcInterceptors {
  // Placeholder for now - will implement actual interceptors
  return {
    // auth: createAuthInterceptor(container),
    // logging: createLoggingInterceptor(container),
    // metrics: createMetricsInterceptor(container)
  };
}
