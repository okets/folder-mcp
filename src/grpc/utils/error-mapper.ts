/**
 * Error Mapping Utilities
 * 
 * Maps domain errors to appropriate gRPC status codes and messages.
 */

import * as grpc from '@grpc/grpc-js';
import { createGrpcError } from './proto-loader.js';

/**
 * Map domain errors to gRPC status codes
 */
export function mapDomainErrorToGrpcStatus(error: Error): grpc.ServiceError {
  const message = error.message.toLowerCase();
  
  // File not found errors
  if (message.includes('not found') || message.includes('does not exist') || message.includes('enoent')) {
    return createGrpcError(grpc.status.NOT_FOUND, error.message);
  }
  
  // Permission errors
  if (message.includes('permission') || message.includes('access denied') || message.includes('eacces')) {
    return createGrpcError(grpc.status.PERMISSION_DENIED, error.message);
  }
  
  // Validation errors
  if (message.includes('invalid') || message.includes('validation') || message.includes('malformed')) {
    return createGrpcError(grpc.status.INVALID_ARGUMENT, error.message);
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('deadline')) {
    return createGrpcError(grpc.status.DEADLINE_EXCEEDED, error.message);
  }
  
  // Resource exhaustion
  if (message.includes('limit') || message.includes('quota') || message.includes('too many')) {
    return createGrpcError(grpc.status.RESOURCE_EXHAUSTED, error.message);
  }
  
  // Unimplemented features
  if (message.includes('not implemented') || message.includes('unsupported')) {
    return createGrpcError(grpc.status.UNIMPLEMENTED, error.message);
  }
  
  // Temporary unavailability
  if (message.includes('unavailable') || message.includes('service down') || message.includes('connection')) {
    return createGrpcError(grpc.status.UNAVAILABLE, error.message);
  }
  
  // Default to internal error
  return createGrpcError(grpc.status.INTERNAL, `Internal server error: ${error.message}`);
}

/**
 * Map validation errors to gRPC invalid argument errors
 */
export function mapValidationError(field: string, issue: string): grpc.ServiceError {
  return createGrpcError(
    grpc.status.INVALID_ARGUMENT,
    `Validation error in field '${field}': ${issue}`
  );
}

/**
 * Create a gRPC error for missing required fields
 */
export function createMissingFieldError(field: string): grpc.ServiceError {
  return createGrpcError(
    grpc.status.INVALID_ARGUMENT,
    `Required field '${field}' is missing or empty`
  );
}

/**
 * Create a gRPC error for out of range values
 */
export function createOutOfRangeError(field: string, value: any, min?: number, max?: number): grpc.ServiceError {
  let message = `Field '${field}' value ${value} is out of range`;
  if (min !== undefined && max !== undefined) {
    message += ` (must be between ${min} and ${max})`;
  } else if (min !== undefined) {
    message += ` (must be at least ${min})`;
  } else if (max !== undefined) {
    message += ` (must be at most ${max})`;
  }
  
  return createGrpcError(grpc.status.INVALID_ARGUMENT, message);
}

/**
 * Create a gRPC error for authentication failures
 */
export function createAuthenticationError(message: string = 'Authentication required'): grpc.ServiceError {
  return createGrpcError(grpc.status.UNAUTHENTICATED, message);
}

/**
 * Create a gRPC error for authorization failures
 */
export function createAuthorizationError(message: string = 'Access denied'): grpc.ServiceError {
  return createGrpcError(grpc.status.PERMISSION_DENIED, message);
}

/**
 * Create a gRPC error for rate limiting
 */
export function createRateLimitError(message: string = 'Rate limit exceeded'): grpc.ServiceError {
  return createGrpcError(grpc.status.RESOURCE_EXHAUSTED, message);
}
