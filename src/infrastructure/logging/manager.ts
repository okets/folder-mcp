/**
 * Log Management Utilities
 * 
 * Provides utilities for managing log files, rotation, cleanup, and statistics.
 */

import { readdir, stat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { ILoggingService, LogLevel } from './index.js';

export interface LogFileStats {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  lineCount?: number;
}

export interface LogCleanupOptions {
  maxAge?: number; // days
  maxFiles?: number;
  maxTotalSize?: number; // bytes
  dryRun?: boolean;
}

export interface LogStats {
  totalFiles: number;
  totalSize: number;
  oldestFile?: Date | undefined;
  newestFile?: Date | undefined;
  files: LogFileStats[];
}

/**
 * Log management utilities for cleanup, rotation, and statistics
 */
export class LogManager {
  constructor(
    private readonly logDirectory: string,
    private readonly logger?: ILoggingService
  ) {}

  /**
   * Get statistics about log files in the directory
   */
  async getLogStats(): Promise<LogStats> {
    if (!existsSync(this.logDirectory)) {
      return {
        totalFiles: 0,
        totalSize: 0,
        files: []
      };
    }

    const files = await readdir(this.logDirectory);
    const logFiles = files.filter(file => 
      extname(file) === '.log' || 
      file.includes('.log.')
    );

    const fileStats: LogFileStats[] = [];
    let totalSize = 0;
    let oldestFile: Date | undefined;
    let newestFile: Date | undefined;

    for (const file of logFiles) {
      const filePath = join(this.logDirectory, file);
      try {
        const stats = await stat(filePath);
        const fileInfo: LogFileStats = {
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };

        fileStats.push(fileInfo);
        totalSize += stats.size;

        if (!oldestFile || stats.birthtime < oldestFile) {
          oldestFile = stats.birthtime;
        }
        if (!newestFile || stats.birthtime > newestFile) {
          newestFile = stats.birthtime;
        }
      } catch (error) {
        this.logger?.warn('Failed to stat log file', { file, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return {
      totalFiles: fileStats.length,
      totalSize,
      oldestFile,
      newestFile,
      files: fileStats.sort((a, b) => b.modified.getTime() - a.modified.getTime())
    };
  }

  /**
   * Clean up old log files based on specified criteria
   */
  async cleanupLogs(options: LogCleanupOptions = {}): Promise<string[]> {
    const {
      maxAge = 30, // 30 days default
      maxFiles = 50, // 50 files default
      maxTotalSize = 100 * 1024 * 1024, // 100MB default
      dryRun = false
    } = options;

    const stats = await this.getLogStats();
    const filesToDelete: string[] = [];

    // Sort files by age (oldest first)
    const filesByAge = [...stats.files].sort((a, b) => a.created.getTime() - b.created.getTime());

    // Delete files older than maxAge
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    for (const file of filesByAge) {
      const age = now.getTime() - file.created.getTime();
      if (age > maxAgeMs) {
        filesToDelete.push(file.path);
      }
    }

    // Delete excess files if more than maxFiles
    if (stats.totalFiles > maxFiles) {
      const excessFiles = filesByAge.slice(0, stats.totalFiles - maxFiles);
      for (const file of excessFiles) {
        if (!filesToDelete.includes(file.path)) {
          filesToDelete.push(file.path);
        }
      }
    }

    // Delete files if total size exceeds maxTotalSize
    if (stats.totalSize > maxTotalSize) {
      let currentSize = stats.totalSize;
      for (const file of filesByAge) {
        if (currentSize <= maxTotalSize) break;
        if (!filesToDelete.includes(file.path)) {
          filesToDelete.push(file.path);
          currentSize -= file.size;
        }
      }
    }

    // Execute deletion if not dry run
    if (!dryRun && filesToDelete.length > 0) {
      const deleted: string[] = [];
      for (const filePath of filesToDelete) {
        try {
          await unlink(filePath);
          deleted.push(filePath);
          this.logger?.info('Deleted old log file', { filePath });
        } catch (error) {
          this.logger?.error('Failed to delete log file', error instanceof Error ? error : new Error(String(error)), { filePath });
        }
      }
      return deleted;
    }

    return filesToDelete;
  }

  /**
   * Archive old log files by compressing them
   */
  async archiveLogs(olderThanDays: number = 7): Promise<string[]> {
    // This would typically use a compression library like zlib
    // For now, we'll just return the files that would be archived
    const stats = await this.getLogStats();
    const maxAgeMs = olderThanDays * 24 * 60 * 60 * 1000;
    const now = new Date();

    const filesToArchive = stats.files.filter(file => {
      const age = now.getTime() - file.created.getTime();
      return age > maxAgeMs && !file.path.endsWith('.gz');
    });

    this.logger?.info('Would archive log files', {
      count: filesToArchive.length,
      files: filesToArchive.map(f => f.path)
    });

    return filesToArchive.map(f => f.path);
  }

  /**
   * Get health status of logging system
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    stats: LogStats;
  }> {
    const stats = await this.getLogStats();
    const issues: string[] = [];

    // Check if log directory is writable
    if (!existsSync(this.logDirectory)) {
      issues.push('Log directory does not exist');
    }

    // Check for excessive log size
    const maxTotalSize = 500 * 1024 * 1024; // 500MB
    if (stats.totalSize > maxTotalSize) {
      issues.push(`Total log size (${Math.round(stats.totalSize / 1024 / 1024)}MB) exceeds recommended limit`);
    }

    // Check for too many log files
    if (stats.totalFiles > 100) {
      issues.push(`Too many log files (${stats.totalFiles}). Consider cleanup.`);
    }

    // Check for very old files
    if (stats.oldestFile) {
      const age = new Date().getTime() - stats.oldestFile.getTime();
      const ageDays = age / (24 * 60 * 60 * 1000);
      if (ageDays > 90) {
        issues.push(`Oldest log file is ${Math.round(ageDays)} days old. Consider archiving.`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      stats
    };
  }
}

/**
 * Utility functions for runtime log configuration
 */
export class LogConfigManager {
  private static instances = new Map<string, ILoggingService>();

  /**
   * Register a logger instance for runtime configuration
   */
  static registerLogger(name: string, logger: ILoggingService): void {
    this.instances.set(name, logger);
  }

  /**
   * Update log level for a specific logger or all loggers
   */
  static setLogLevel(level: LogLevel, loggerName?: string): void {
    if (loggerName) {
      const logger = this.instances.get(loggerName);
      if (logger && 'setLevel' in logger) {
        (logger as any).setLevel(level);
      }
    } else {
      // Update all registered loggers
      for (const logger of this.instances.values()) {
        if ('setLevel' in logger) {
          (logger as any).setLevel(level);
        }
      }
    }
  }

  /**
   * Get current configuration of all loggers
   */
  static getLoggerInfo(): Array<{
    name: string;
    level?: LogLevel;
    transports?: string[];
  }> {
    const info: Array<{
      name: string;
      level?: LogLevel;
      transports?: string[];
    }> = [];

    for (const [name, logger] of this.instances.entries()) {
      const loggerInfo: any = {
        name
      };

      // Try to get level if available
      if ('level' in logger) {
        loggerInfo.level = (logger as any).level;
      }

      // Try to get transport info if available
      if ('getTransports' in logger) {
        const transports = (logger as any).getTransports();
        if (Array.isArray(transports)) {
          loggerInfo.transports = transports.map((t: any) => t.constructor.name);
        }
      }

      info.push(loggerInfo);
    }

    return info;
  }

  /**
   * Clear all registered loggers
   */
  static clear(): void {
    this.instances.clear();
  }
}
