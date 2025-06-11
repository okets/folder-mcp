/**
 * Centralized Error Handling
 * 
 * This module provides consistent error handling across the application,
 * including error types, logging, and recovery strategies.
 */

import { ILoggingService } from '../../di/interfaces.js';

// Base error class for application errors
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Domain-specific error types
export class FileError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FILE_ERROR', details);
    this.name = 'FileError';
  }
}

export class SearchError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SEARCH_ERROR', details);
    this.name = 'SearchError';
  }
}

export class EmbeddingError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EMBEDDING_ERROR', details);
    this.name = 'EmbeddingError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

// Error handling utilities
export function handleError(error: unknown, logger?: ILoggingService): never {
  if (error instanceof AppError) {
    if (logger) {
      logger.error(error.message, error, {
        code: error.code,
        details: error.details
      });
    }
    throw error;
  }

  if (error instanceof Error) {
    if (logger) {
      logger.error(error.message, error);
    }
    throw new AppError(error.message, 'UNKNOWN_ERROR', {
      originalError: {
        name: error.name,
        stack: error.stack
      }
    });
  }

  const unknownError = new Error('An unknown error occurred');
  if (logger) {
    logger.error(unknownError.message, unknownError);
  }
  throw new AppError(unknownError.message, 'UNKNOWN_ERROR');
}

// Error recovery utilities
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code !== 'FATAL_ERROR';
  }
  return true;
}

export function getErrorContext(error: unknown): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      code: error.code,
      details: error.details
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return {
    type: typeof error,
    value: error
  };
} 