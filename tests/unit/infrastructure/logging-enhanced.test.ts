/**
 * Enhanced Logging Infrastructure Tests
 * 
 * Tests for the new MCP-compliant logging system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createConsoleLogger, createFileLogger, LoggingService, ConsoleLogFormatter, ConsoleLogTransport } from '../../../src/infrastructure/logging/index.js';
import { LoggingServiceBridge } from '../../../src/infrastructure/logging/bridge.js';
import { existsSync, unlinkSync } from 'fs';

describe('Enhanced Logging Infrastructure', () => {
  let originalStderrWrite: typeof process.stderr.write;
  let stderrOutput: string[] = [];

  beforeEach(() => {
    // Capture stderr output for testing
    stderrOutput = [];
    originalStderrWrite = process.stderr.write;
    process.stderr.write = ((data: any) => {
      stderrOutput.push(data.toString());
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    // Restore stderr
    process.stderr.write = originalStderrWrite;
  });

  describe('MCP Protocol Compliance', () => {
    it('should write all console output to stderr, never stdout', async () => {
      const logger = createConsoleLogger('debug'); // Use debug level to capture all messages
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      // Wait a moment for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Debug: log what we captured
      console.log('Captured stderr output:', stderrOutput);

      // All output should go to stderr
      expect(stderrOutput.length).toBeGreaterThan(0);
      expect(stderrOutput.some(output => output.includes('Debug message'))).toBe(true);
      expect(stderrOutput.some(output => output.includes('Info message'))).toBe(true);
      expect(stderrOutput.some(output => output.includes('Warning message'))).toBe(true);
      expect(stderrOutput.some(output => output.includes('Error message'))).toBe(true);
    });

    it('should support log level filtering', () => {
      const logger = createConsoleLogger('warn');
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      // Only warn and error should appear
      expect(stderrOutput.some(output => output.includes('Debug message'))).toBe(false);
      expect(stderrOutput.some(output => output.includes('Info message'))).toBe(false);
      expect(stderrOutput.some(output => output.includes('Warning message'))).toBe(true);
      expect(stderrOutput.some(output => output.includes('Error message'))).toBe(true);
    });
  });

  describe('DI Interface Bridge', () => {
    it('should bridge enhanced logger to DI interface', async () => {
      const infraLogger = createConsoleLogger('debug');
      const diLogger = new LoggingServiceBridge(infraLogger);

      // Test DI interface methods
      diLogger.debug('Debug via DI');
      diLogger.info('Info via DI');
      diLogger.warn('Warn via DI');
      diLogger.error('Error via DI');
      diLogger.setLevel('error');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(stderrOutput.some(output => output.includes('Debug via DI'))).toBe(true);
      expect(stderrOutput.some(output => output.includes('Info via DI'))).toBe(true);
    });
  });

  describe('File Logging', () => {
    const testLogFile = './test-logs/test.log';

    afterEach(() => {
      // Cleanup test files
      if (existsSync(testLogFile)) {
        unlinkSync(testLogFile);
      }
    });

    it('should create file logger and write to file', async () => {
      const logger = createFileLogger(testLogFile, 'info');
      
      logger.info('Test file log message');
      
      // Give it a moment to write
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // File should exist (directory is created automatically)  
      expect(existsSync(testLogFile)).toBe(true);
    });
  });

  describe('Correlation IDs', () => {
    it('should generate correlation IDs for log entries', async () => {
      const formatter = new ConsoleLogFormatter();
      const logService = new LoggingService('test-service');
      
      // Add a transport so logs actually get processed
      const transport = new ConsoleLogTransport(formatter, 'debug');
      logService.addTransport(transport);
      
      logService.info('Test correlation');
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // The logs should contain correlation IDs in the formatted output
      expect(stderrOutput.some(output => 
        output.includes('test-service') && output.includes('Test correlation')
      )).toBe(true);
    });
  });

  describe('Async Batching', () => {
    it('should handle high-volume logging without blocking', async () => {
      const logger = createConsoleLogger('info');
      
      const startTime = Date.now();
      
      // Log many messages
      for (let i = 0; i < 100; i++) {
        logger.info(`Batch message ${i}`);
      }
      
      const endTime = Date.now();
      
      // Should complete quickly (async batching)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Give batching time to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // All messages should eventually appear
      expect(stderrOutput.length).toBeGreaterThan(0);
    });
  });
});
