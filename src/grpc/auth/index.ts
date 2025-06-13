/**
 * gRPC Authentication Module
 * 
 * Provides API key management and authentication middleware for gRPC transport.
 */

export { ApiKeyManager, ApiKeyEntry, ApiKeyStorage, ApiKeyManagerOptions } from './api-key-manager.js';
export { AuthInterceptor, AuthContext, AuthInterceptorOptions, createAuthInterceptor } from './auth-interceptor.js';
