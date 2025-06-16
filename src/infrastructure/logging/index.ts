/**
 * Logging Infrastructure Module
 * 
 * This module provides technical logging services,
 * including structured logging, formatters, and transport mechanisms.
 */

// Infrastructure service interfaces
export interface ILoggingService {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, error?: Error, metadata?: LogMetadata): void;
  fatal(message: string, error?: Error, metadata?: LogMetadata): void;
  setLevel?(level: LogLevel): void; // Optional for backwards compatibility
}

export interface ILogFormatter {
  format(entry: LogEntry): string;
}

export interface ILogTransport {
  log(entry: LogEntry): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}

// Infrastructure types
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  metadata?: LogMetadata;
  error?: Error;
  correlationId?: string;
  source: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogMetadata {
  [key: string]: any;
  filePath?: string;
  operation?: string;
  duration?: number;
  userId?: string;
  requestId?: string;
}

export interface LogConfiguration {
  level: LogLevel;
  format: 'json' | 'text' | 'structured';
  transports: TransportConfiguration[];
  enableMetadata: boolean;
  enableStackTrace: boolean;
  correlationIdHeader?: string;
}

export interface TransportConfiguration {
  type: 'console' | 'file' | 'rotating-file' | 'syslog' | 'http';
  options: TransportOptions;
}

export interface TransportOptions {
  // Console transport options
  colorize?: boolean;
  
  // File transport options
  filename?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  
  // HTTP transport options
  url?: string;
  headers?: Record<string, string>;
  batchSize?: number;
  
  // Common options
  level?: LogLevel;
  format?: string;
}

export interface LogStatistics {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  errorRate: number;
  averageLogsPerMinute: number;
  transportStats: TransportStatistics[];
}

export interface TransportStatistics {
  transport: string;
  messagesWritten: number;
  messagesDropped: number;
  averageLatency: number;
  lastError?: string;
}

// Infrastructure implementations (to be created)
// export { Logger } from './logger.js';
// export { JsonFormatter, TextFormatter } from './formatters.js';
// export { ConsoleTransport, FileTransport } from './transports.js';

// Implementation exports
export * from './logger.js';
export * from './rotating-transport.js';
export * from './bridge.js';
export * from './manager.js';
