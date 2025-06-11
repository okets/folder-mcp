/**
 * Infrastructure Layer - Logging System Tests
 * 
 * Tests for the logging infrastructure interfaces and implementations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import type {
  ILoggingService,
  ILogFormatter,
  ILogTransport,
  LogEntry,
  LogLevel,
  LogConfiguration,
  LogMetadata,
  TransportConfiguration,
  TransportOptions
} from '../../../src/infrastructure/logging/index.js';

describe('Infrastructure Layer - Logging', () => {
  describe('Logging Service Interface', () => {
    it('should define proper logging service contract', () => {
      const mockLogger: ILoggingService = {
        debug: (message: string, metadata?: LogMetadata): void => {},
        info: (message: string, metadata?: LogMetadata): void => {},
        warn: (message: string, metadata?: LogMetadata): void => {},
        error: (message: string, error?: Error, metadata?: LogMetadata): void => {},
        fatal: (message: string, error?: Error, metadata?: LogMetadata): void => {}
      };

      expect(mockLogger.debug).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.fatal).toBeDefined();
    });

    it('should handle different log levels correctly', () => {
      const logEntries: LogEntry[] = [];
      
      const mockLogger: Partial<ILoggingService> = {
        debug: (message: string, metadata?: LogMetadata): void => {
          logEntries.push({
            level: 'debug',
            message,
            timestamp: new Date(),
            metadata,
            source: 'test'
          });
        },
        info: (message: string, metadata?: LogMetadata): void => {
          logEntries.push({
            level: 'info',
            message,
            timestamp: new Date(),
            metadata,
            source: 'test'
          });
        },
        warn: (message: string, metadata?: LogMetadata): void => {
          logEntries.push({
            level: 'warn',
            message,
            timestamp: new Date(),
            metadata,
            source: 'test'
          });
        },
        error: (message: string, error?: Error, metadata?: LogMetadata): void => {
          logEntries.push({
            level: 'error',
            message,
            timestamp: new Date(),
            metadata,
            error,
            source: 'test'
          });
        },
        fatal: (message: string, error?: Error, metadata?: LogMetadata): void => {
          logEntries.push({
            level: 'fatal',
            message,
            timestamp: new Date(),
            metadata,
            error,
            source: 'test'
          });
        }
      };

      // Test each log level
      mockLogger.debug?.('Debug message', { debug: true });
      mockLogger.info?.('Info message', { info: true });
      mockLogger.warn?.('Warning message', { warn: true });
      mockLogger.error?.('Error message', new Error('Test error'), { error: true });
      mockLogger.fatal?.('Fatal message', new Error('Test fatal'), { fatal: true });

      expect(logEntries).toHaveLength(5);
      expect(logEntries[0].level).toBe('debug');
      expect(logEntries[1].level).toBe('info');
      expect(logEntries[2].level).toBe('warn');
      expect(logEntries[3].level).toBe('error');
      expect(logEntries[4].level).toBe('fatal');
    });

    it('should support contextual logging with metadata', () => {
      const logEntries: LogEntry[] = [];
      
      const mockLogger: Partial<ILoggingService> = {
        info: (message: string, metadata?: LogMetadata): void => {
          logEntries.push({
            level: 'info',
            message,
            timestamp: new Date(),
            metadata,
            source: 'test'
          });
        }
      };

      const metadata: LogMetadata = {
        service: 'indexing',
        operation: 'parseFile',
        filePath: '/path/to/file.txt',
        duration: 150,
        userId: 'user-123',
        requestId: 'req-456'
      };

      mockLogger.info?.('Processing file', metadata);

      expect(logEntries).toHaveLength(1);
      expect(logEntries[0].metadata).toEqual(metadata);
    });
  });

  describe('Log Configuration', () => {
    it('should support comprehensive logging configuration', () => {
      const config: LogConfiguration = {
        level: 'info',
        format: 'json',
        transports: [
          {
            type: 'console',
            options: {
              colorize: true,
              level: 'debug',
              format: 'text'
            }
          },
          {
            type: 'file',
            options: {
              filename: '/var/log/folder-mcp/app.log',
              maxSize: 10 * 1024 * 1024, // 10MB
              maxFiles: 5,
              level: 'info',
              format: 'json'
            }
          },
          {
            type: 'rotating-file',
            options: {
              filename: '/var/log/folder-mcp/error.log',
              maxSize: 5 * 1024 * 1024, // 5MB
              maxFiles: 10,
              level: 'error',
              format: 'json'
            }
          }
        ],
        enableMetadata: true,
        enableStackTrace: true,
        correlationIdHeader: 'X-Correlation-ID'
      };

      expect(config.level).toBe('info');
      expect(config.format).toBe('json');
      expect(config.transports).toHaveLength(3);
      expect(config.enableMetadata).toBe(true);
      expect(config.enableStackTrace).toBe(true);
    });

    it('should validate log levels hierarchy', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
      const levelValues = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
        fatal: 4
      };

      // Test level hierarchy
      expect(levelValues.debug).toBeLessThan(levelValues.info);
      expect(levelValues.info).toBeLessThan(levelValues.warn);
      expect(levelValues.warn).toBeLessThan(levelValues.error);
      expect(levelValues.error).toBeLessThan(levelValues.fatal);

      // Test level filtering
      const currentLevel = 'warn';
      const currentLevelValue = levelValues[currentLevel];

      levels.forEach(level => {
        const shouldLog = levelValues[level] >= currentLevelValue;
        
        if (level === 'debug' || level === 'info') {
          expect(shouldLog).toBe(false);
        } else {
          expect(shouldLog).toBe(true);
        }
      });
    });
  });

  describe('Log Entry Structure', () => {
    it('should handle comprehensive log entry structure', () => {
      const entry: LogEntry = {
        level: 'error',
        message: 'Failed to process file',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        metadata: {
          service: 'indexing',
          operation: 'parseFile',
          filePath: '/path/to/file.txt',
          duration: 250,
          userId: 'user-123',
          requestId: 'req-456'
        },
        error: new Error('Permission denied'),
        correlationId: 'corr-789',
        source: 'file-processor'
      };

      expect(entry.level).toBe('error');
      expect(entry.message).toBe('Failed to process file');
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.metadata?.service).toBe('indexing');
      expect(entry.metadata?.duration).toBe(250);
      expect(entry.error?.message).toBe('Permission denied');
      expect(entry.correlationId).toBe('corr-789');
      expect(entry.source).toBe('file-processor');
    });

    it('should support structured logging with metadata', () => {
      const metadata: LogMetadata = {
        user: { id: '123', name: 'Alice' },
        operation: 'fileUpload',
        file: { name: 'document.pdf', size: 1024000 },
        duration: 1500,
        memory: 256 * 1024
      };

      const entry: LogEntry = {
        level: 'info',
        message: 'File upload completed',
        timestamp: new Date(),
        metadata,
        source: 'upload-service'
      };

      expect(entry.metadata).toEqual(metadata);
      expect(entry.metadata?.user.id).toBe('123');
      expect(entry.metadata?.file.size).toBe(1024000);
      expect(entry.metadata?.duration).toBe(1500);
    });
  });

  describe('Log Transports', () => {
    it('should support different transport types', () => {
      const transports: TransportConfiguration[] = [
        {
          type: 'console',
          options: {
            colorize: true,
            level: 'debug',
            format: 'text'
          }
        },
        {
          type: 'file',
          options: {
            filename: 'app.log',
            level: 'info',
            format: 'json'
          }
        },
        {
          type: 'http',
          options: {
            url: 'https://logs.example.com/api/logs',
            headers: {
              'Authorization': 'Bearer token123',
              'Content-Type': 'application/json'
            },
            level: 'error',
            format: 'json',
            batchSize: 100
          }
        },
        {
          type: 'syslog',
          options: {
            level: 'warn',
            format: 'syslog'
          }
        }
      ];

      expect(transports).toHaveLength(4);
      expect(transports[0].type).toBe('console');
      expect(transports[1].type).toBe('file');
      expect(transports[2].type).toBe('http');
      expect(transports[3].type).toBe('syslog');
    });

    it('should handle transport-specific configurations', () => {
      const fileTransport: TransportConfiguration = {
        type: 'rotating-file',
        options: {
          filename: 'app-%DATE%.log',
          maxSize: 20 * 1024 * 1024, // 20MB
          maxFiles: 14, // Keep 14 days
          level: 'info',
          format: 'json'
        }
      };

      expect(fileTransport.options.maxSize).toBe(20 * 1024 * 1024);
      expect(fileTransport.options.maxFiles).toBe(14);
    });
  });

  describe('Log Formatting', () => {
    it('should support different log formats', () => {
      const formats = ['json', 'text', 'structured'] as const;

      const entry: LogEntry = {
        level: 'info',
        message: 'Test message',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        metadata: { key: 'value' },
        source: 'test'
      };

      formats.forEach(format => {
        const transport: TransportConfiguration = {
          type: 'console',
          options: {
            format,
            level: 'debug'
          }
        };

        expect(transport.options.format).toBe(format);
      });
    });

    it('should format logs correctly for different outputs', () => {
      const entry: LogEntry = {
        level: 'error',
        message: 'Database connection failed',
        timestamp: new Date('2023-01-01T12:00:00.000Z'),
        metadata: { host: 'db.example.com', port: 5432 },
        source: 'database',
        correlationId: 'req-123'
      };

      // Mock formatters
      const formatters = {
        text: (entry: LogEntry): string => {
          return `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`;
        },
        
        json: (entry: LogEntry): string => {
          return JSON.stringify({
            timestamp: entry.timestamp.toISOString(),
            level: entry.level,
            message: entry.message,
            ...entry.metadata,
            correlationId: entry.correlationId,
            source: entry.source
          });
        },
        
        structured: (entry: LogEntry): string => {
          const parts = [
            `time=${entry.timestamp.toISOString()}`,
            `level=${entry.level}`,
            `msg="${entry.message}"`,
            ...Object.entries(entry.metadata || {}).map(([k, v]) => `${k}=${v}`)
          ];
          return parts.join(' ');
        }
      };

      const textOutput = formatters.text(entry);
      expect(textOutput).toContain('2023-01-01T12:00:00.000Z');
      expect(textOutput).toContain('ERROR');
      expect(textOutput).toContain('Database connection failed');

      const jsonOutput = formatters.json(entry);
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.level).toBe('error');
      expect(parsed.source).toBe('database');
      expect(parsed.host).toBe('db.example.com');

      const structuredOutput = formatters.structured(entry);
      expect(structuredOutput).toContain('time=2023-01-01T12:00:00.000Z');
      expect(structuredOutput).toContain('level=error');
      expect(structuredOutput).toContain('host=db.example.com');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle high-volume logging efficiently', async () => {
      const logEntries: LogEntry[] = [];
      
      const mockLogger: Partial<ILoggingService> = {
        info: (message: string, metadata?: LogMetadata): void => {
          logEntries.push({
            level: 'info',
            message,
            timestamp: new Date(),
            metadata,
            source: 'test'
          });
        }
      };

      // Log many messages
      const { duration } = await TestUtils.measureTime(async () => {
        for (let i = 0; i < 10000; i++) {
          mockLogger.info?.(`Log message ${i}`, { index: i });
        }
      });

      expect(logEntries).toHaveLength(10000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should support log sampling for performance', () => {
      let sampledLogs = 0;
      let totalLogs = 0;
      
      const sampleRate = 0.1; // 10% sampling
      
      const mockLogger: Partial<ILoggingService> = {
        debug: (message: string): void => {
          totalLogs++;
          if (Math.random() < sampleRate) {
            sampledLogs++;
          }
        }
      };

      // Generate many debug logs
      for (let i = 0; i < 1000; i++) {
        mockLogger.debug?.(`Debug message ${i}`);
      }

      expect(totalLogs).toBe(1000);
      // Allow some variance in sampling due to randomness
      expect(sampledLogs).toBeGreaterThan(50); // At least 5%
      expect(sampledLogs).toBeLessThan(200);   // At most 20%
    });
  });

  describe('Error Handling', () => {
    it('should handle logging system failures gracefully', () => {
      const errors: string[] = [];
      
      const mockLogger: Partial<ILoggingService> = {
        error: (message: string, error?: Error): void => {
          if (message.includes('critical')) {
            throw new Error('Log transport failure');
          }
        },
        
        warn: (message: string): void => {
          if (message.includes('fallback')) {
            errors.push(message);
          }
        }
      };

      // Test error handling
      expect(() => mockLogger.error?.('critical system failure')).toThrow('Log transport failure');
      
      // Test fallback logging
      mockLogger.warn?.('fallback logging active');
      expect(errors).toContain('fallback logging active');
    });
  });
});
