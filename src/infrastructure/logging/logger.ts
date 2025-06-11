/**
 * Logging Infrastructure Implementation
 * 
 * Provides concrete implementations of logging services for the infrastructure layer.
 */

import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { ILoggingService, ILogFormatter, ILogTransport, LogEntry, LogLevel, LogMetadata, LogConfiguration } from './index';

/**
 * Console log formatter
 */
export class ConsoleLogFormatter implements ILogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const source = entry.source ? `[${entry.source}]` : '';
    
    let message = `${timestamp} ${level} ${source} ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` | ${JSON.stringify(entry.metadata)}`;
    }
    
    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    return message;
  }
}

/**
 * JSON log formatter
 */
export class JsonLogFormatter implements ILogFormatter {
  format(entry: LogEntry): string {
    const logData = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      source: entry.source,
      correlationId: entry.correlationId,
      metadata: entry.metadata,
      error: entry.error ? {
        message: entry.error.message,
        name: entry.error.name,
        stack: entry.error.stack
      } : undefined
    };
    
    return JSON.stringify(logData);
  }
}

/**
 * Console log transport
 */
export class ConsoleLogTransport implements ILogTransport {
  private formatter: ILogFormatter;
  private minLevel: LogLevel;

  constructor(formatter: ILogFormatter, minLevel: LogLevel = 'info') {
    this.formatter = formatter;
    this.minLevel = minLevel;
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatter.format(entry);
    
    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }
  }

  async flush(): Promise<void> {
    // Console doesn't need flushing
  }

  async close(): Promise<void> {
    // Console doesn't need closing
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }
}

/**
 * File log transport
 */
export class FileLogTransport implements ILogTransport {
  private formatter: ILogFormatter;
  private filePath: string;
  private minLevel: LogLevel;

  constructor(filePath: string, formatter: ILogFormatter, minLevel: LogLevel = 'info') {
    this.filePath = filePath;
    this.formatter = formatter;
    this.minLevel = minLevel;
    
    // Ensure directory exists
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatter.format(entry) + '\n';
    
    try {
      appendFileSync(this.filePath, formatted);
    } catch (error) {
      console.error(`Failed to write to log file ${this.filePath}:`, error);
    }
  }

  async flush(): Promise<void> {
    // File system handles flushing
  }

  async close(): Promise<void> {
    // File system handles closing
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }
}

/**
 * Main logging service implementation
 */
export class LoggingService implements ILoggingService {
  private transports: ILogTransport[] = [];
  private source: string;

  constructor(source: string = 'folder-mcp') {
    this.source = source;
  }

  addTransport(transport: ILogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(transport: ILogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index !== -1) {
      this.transports.splice(index, 1);
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, undefined, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, undefined, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, undefined, metadata);
  }

  error(message: string, error?: Error, metadata?: LogMetadata): void {
    this.log('error', message, error, metadata);
  }

  fatal(message: string, error?: Error, metadata?: LogMetadata): void {
    this.log('fatal', message, error, metadata);
  }

  private async log(level: LogLevel, message: string, error?: Error, metadata?: LogMetadata): Promise<void> {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      source: this.source,
      ...(metadata && { metadata }),
      ...(error && { error }),
      correlationId: this.generateCorrelationId()
    };

    // Send to all transports
    const promises = this.transports.map(transport => 
      transport.log(entry).catch(err => 
        console.error('Transport error:', err)
      )
    );

    await Promise.all(promises);
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async flush(): Promise<void> {
    const promises = this.transports.map(transport => transport.flush());
    await Promise.all(promises);
  }

  async close(): Promise<void> {
    const promises = this.transports.map(transport => transport.close());
    await Promise.all(promises);
  }
}

/**
 * Factory functions for creating logging infrastructure
 */
export function createConsoleLogger(minLevel: LogLevel = 'info'): ILoggingService {
  const logger = new LoggingService();
  const formatter = new ConsoleLogFormatter();
  const transport = new ConsoleLogTransport(formatter, minLevel);
  
  logger.addTransport(transport);
  return logger;
}

export function createFileLogger(filePath: string, minLevel: LogLevel = 'info'): ILoggingService {
  const logger = new LoggingService();
  const formatter = new JsonLogFormatter();
  const transport = new FileLogTransport(filePath, formatter, minLevel);
  
  logger.addTransport(transport);
  return logger;
}

export function createDualLogger(filePath: string, consoleLevel: LogLevel = 'info', fileLevel: LogLevel = 'debug'): ILoggingService {
  const logger = new LoggingService();
  
  // Console transport
  const consoleFormatter = new ConsoleLogFormatter();
  const consoleTransport = new ConsoleLogTransport(consoleFormatter, consoleLevel);
  logger.addTransport(consoleTransport);
  
  // File transport
  const fileFormatter = new JsonLogFormatter();
  const fileTransport = new FileLogTransport(filePath, fileFormatter, fileLevel);
  logger.addTransport(fileTransport);
  
  return logger;
}
