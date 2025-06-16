/**
 * Logging Infrastructure Implementation
 * 
 * Provides concrete implementations of logging services for the infrastructure layer.
 */

import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { ILoggingService, ILogFormatter, ILogTransport, LogEntry, LogLevel, LogMetadata, LogConfiguration } from './index';
import { correlationManager } from '../../shared/utils/correlation-id.js';
import { LogConfigManager } from './manager.js';

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
    
    // MCP Protocol Safety: ALL console output must go to stderr
    // Never use stdout as it's reserved for JSON-RPC messages
    switch (entry.level) {
      case 'debug':
      case 'info':
        process.stderr.write(formatted + '\n');
        break;
      case 'warn':
        process.stderr.write(formatted + '\n');
        break;
      case 'error':
      case 'fatal':
        process.stderr.write(formatted + '\n');
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
      process.stderr.write(`[ERROR] Failed to write to log file ${this.filePath}: ${error}\n`);
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
  private transports: ILogTransport[] = [];  private source: string;
  private correlationIdCounter = 0;
  private logQueue: LogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 1000; // 1 second
  private flushTimer?: NodeJS.Timeout | undefined;
  private minLevel: LogLevel = 'info';  constructor(source: string = 'folder-mcp', options: { enableBatching?: boolean } = {}) {
    this.source = source;
    
    // Register this logger instance for runtime configuration
    LogConfigManager.registerLogger(source, this);
    
    // Only enable batching in production (when explicitly requested)
    if (options.enableBatching) {
      this.startBatchProcessor();
    }
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
  }  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  get level(): LogLevel {
    return this.minLevel;
  }

  getTransports(): any[] {
    return this.transports;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }  private async log(level: LogLevel, message: string, error?: Error, metadata?: LogMetadata): Promise<void> {
    // Check level filtering first
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      source: this.source,
      ...(metadata && { metadata }),
      ...(error && { error }),
      correlationId: this.generateCorrelationId()
    };

    if (this.flushTimer) {
      // Batching mode: Add to queue
      this.logQueue.push(entry);

      // Flush immediately for error/fatal levels
      if (level === 'error' || level === 'fatal') {
        await this.processBatch();
      }
    } else {
      // Immediate mode: Process directly
      await this.processLogEntry(entry);
    }
  }

  private async processLogEntry(entry: LogEntry): Promise<void> {
    // Send to all transports
    const promises = this.transports.map(transport => 
      transport.log(entry).catch(err => 
        process.stderr.write(`[TRANSPORT-ERROR] ${err.message}\n`)
      )
    );

    await Promise.all(promises);
  }
  private generateCorrelationId(): string {
    // Try to get correlation ID from async context first
    const contextId = correlationManager.getCurrentId();
    if (contextId) {
      return contextId;
    }
    
    // Fallback to generated ID
    return `${this.source}-${Date.now()}-${++this.correlationIdCounter}`;
  }

  private startBatchProcessor(): void {
    this.flushTimer = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.processBatch();
      }
    }, this.flushInterval);
  }
  private async processBatch(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const batch = this.logQueue.splice(0, this.batchSize);
    
    // Process each entry
    for (const entry of batch) {
      await this.processLogEntry(entry);
    }
  }
  async flush(): Promise<void> {
    // Process any remaining logs in queue
    await this.processBatch();
    
    // Flush all transports
    const promises = this.transports.map(transport => transport.flush());
    await Promise.all(promises);
  }

  async close(): Promise<void> {
    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Process any remaining logs
    await this.flush();
    
    // Close all transports
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
  logger.setLevel(minLevel); // Set the logger level to match transport
  return logger;
}

export function createFileLogger(filePath: string, minLevel: LogLevel = 'info'): ILoggingService {
  const logger = new LoggingService();
  const formatter = new JsonLogFormatter();
  const transport = new FileLogTransport(filePath, formatter, minLevel);
  
  logger.addTransport(transport);
  logger.setLevel(minLevel); // Set the logger level to match transport
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
  
  // Set logger level to the most permissive (lowest) level
  const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
  const minLevel = levels.includes(fileLevel) && levels.indexOf(fileLevel) < levels.indexOf(consoleLevel) 
    ? fileLevel 
    : consoleLevel;
  logger.setLevel(minLevel as LogLevel);
  
  return logger;
}
