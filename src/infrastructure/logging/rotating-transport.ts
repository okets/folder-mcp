/**
 * Rotating File Transport
 * 
 * Provides file logging with automatic rotation based on size and age.
 */

import { existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import { appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { ILogTransport, ILogFormatter, LogEntry, LogLevel } from './index.js';

export interface RotatingFileOptions {
  maxFileSize: number; // in bytes
  maxFiles: number;    // number of files to keep
  maxAge: number;      // in milliseconds
}

export class RotatingFileTransport implements ILogTransport {
  private formatter: ILogFormatter;
  private filePath: string;
  private minLevel: LogLevel;
  private options: RotatingFileOptions;

  constructor(
    filePath: string, 
    formatter: ILogFormatter, 
    options: RotatingFileOptions,
    minLevel: LogLevel = 'info'
  ) {
    this.filePath = filePath;
    this.formatter = formatter;
    this.minLevel = minLevel;
    this.options = options;
    
    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Check if rotation is needed
    this.rotateIfNeeded();

    const formatted = this.formatter.format(entry) + '\n';
    
    try {
      appendFileSync(this.filePath, formatted);
    } catch (error) {
      // Use stderr for transport errors to avoid infinite loops
      process.stderr.write(`[ROTATING-FILE-TRANSPORT-ERROR] Failed to write to ${this.filePath}: ${error}\n`);
    }
  }

  async flush(): Promise<void> {
    // File system handles flushing
  }

  async close(): Promise<void> {
    // Cleanup old files on close
    this.cleanupOldFiles();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private rotateIfNeeded(): void {
    if (!existsSync(this.filePath)) {
      return;
    }

    const stats = statSync(this.filePath);
    
    // Check size-based rotation
    if (stats.size >= this.options.maxFileSize) {
      this.rotateFile();
      return;
    }

    // Check age-based rotation
    const age = Date.now() - stats.mtime.getTime();
    if (age >= this.options.maxAge) {
      this.rotateFile();
    }
  }

  private rotateFile(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${this.filePath}.${timestamp}`;
    
    try {
      // Rename current log file
      require('fs').renameSync(this.filePath, rotatedPath);
      
      // Cleanup old files
      this.cleanupOldFiles();
    } catch (error) {
      process.stderr.write(`[ROTATING-FILE-TRANSPORT-ERROR] Failed to rotate log file: ${error}\n`);
    }
  }

  private cleanupOldFiles(): void {
    try {
      const dir = dirname(this.filePath);
      const baseName = require('path').basename(this.filePath);
      
      // Get all rotated files
      const files = readdirSync(dir)
        .filter(file => file.startsWith(baseName + '.'))
        .map(file => ({
          name: file,
          path: join(dir, file),
          stats: statSync(join(dir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove excess files
      if (files.length > this.options.maxFiles) {
        const filesToDelete = files.slice(this.options.maxFiles);
        filesToDelete.forEach(file => {
          try {
            unlinkSync(file.path);
          } catch (error) {
            process.stderr.write(`[ROTATING-FILE-TRANSPORT-ERROR] Failed to delete old log file ${file.path}: ${error}\n`);
          }
        });
      }
    } catch (error) {
      process.stderr.write(`[ROTATING-FILE-TRANSPORT-ERROR] Failed to cleanup old log files: ${error}\n`);
    }
  }
}
