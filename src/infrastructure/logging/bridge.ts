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

  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    if (this.infraLogger.setLevel) {
      this.infraLogger.setLevel(level as LogLevel);
    }
  }
}
