/**
 * Logging Service Bridge
 * 
 * Bridges the enhanced infrastructure logging service with the DI interface.
 */

import { ILoggingService as DILoggingService } from '../../di/interfaces.js';
import { ILoggingService as InfraLoggingService, LogLevel } from './index.js';

export class LoggingServiceBridge implements DILoggingService {
  constructor(private readonly infraLogger: InfraLoggingService) {}

  debug(message: string, context?: any): void {
    this.infraLogger.debug(message, context);
  }

  info(message: string, context?: any): void {
    this.infraLogger.info(message, context);
  }

  warn(message: string, context?: any): void {
    this.infraLogger.warn(message, context);
  }

  error(message: string, error?: Error, context?: any): void {
    this.infraLogger.error(message, error, context);
  }

  fatal(message: string, error?: Error, context?: any): void {
    this.infraLogger.error(message, error, context); // Use error level for fatal
  }

  setLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'): void {
    if (this.infraLogger.setLevel) {
      // Map fatal to error for infrastructure logger
      const mappedLevel = level === 'fatal' ? 'error' : level;
      this.infraLogger.setLevel(mappedLevel as LogLevel);
    }
  }
}
