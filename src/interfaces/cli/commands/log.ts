/**
 * Log Management CLI Command
 * 
 * Provides commands for managing log files, levels, and cleanup.
 */

import { Command } from 'commander';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { LogManager, LogConfigManager } from '../../../infrastructure/logging/manager.js';
import { createConsoleLogger, LogLevel } from '../../../infrastructure/logging/index.js';

/**
 * Configure log management commands
 */
export function configureLogCommands(program: Command): void {
  const logCommand = program
    .command('log')
    .description('Log management commands');

  // Log cleanup command
  logCommand
    .command('cleanup')
    .description('Clean up old log files')
    .argument('<folder>', 'Folder path to clean up logs for')
    .option('--max-age <days>', 'Maximum age of log files in days', '30')
    .option('--max-files <count>', 'Maximum number of log files to keep', '50')
    .option('--max-size <bytes>', 'Maximum total size of log files in bytes', '104857600')
    .option('--dry-run', 'Show what would be deleted without actually deleting')
    .action(async (folder: string, options: {
      maxAge: string;
      maxFiles: string;
      maxSize: string;
      dryRun?: boolean;
    }) => {
      try {
        const logDir = join(folder, '.folder-mcp', 'logs');
        const logger = createConsoleLogger('info');
        const manager = new LogManager(logDir, logger);
        
        const deleted = await manager.cleanupLogs({
          maxAge: parseInt(options.maxAge),
          maxFiles: parseInt(options.maxFiles),
          maxTotalSize: parseInt(options.maxSize),
          dryRun: options.dryRun || false
        });

        if (options.dryRun) {
          console.log('🔍 Dry Run - Files that would be deleted:');
          if (deleted.length === 0) {
            console.log('  No files would be deleted.');
          } else {
            deleted.forEach(file => console.log(`  - ${file}`));
          }
        } else {
          console.log(`🧹 Cleaned up ${deleted.length} log files`);
          if (deleted.length > 0) {
            console.log('Deleted files:');
            deleted.forEach(file => console.log(`  - ${file}`));
          }
        }
      } catch (error) {
        console.error('❌ Failed to cleanup logs:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Log statistics command
  logCommand
    .command('stats')
    .description('Show log file statistics')
    .argument('<folder>', 'Folder path to analyze logs for')
    .action(async (folder: string) => {
      try {
        const logDir = join(folder, '.folder-mcp', 'logs');
        const logger = createConsoleLogger('info');
        const manager = new LogManager(logDir, logger);
        
        const stats = await manager.getLogStats();
        
        console.log('📊 Log File Statistics');
        console.log('');
        console.log(`📁 Log Directory: ${logDir}`);
        console.log(`📄 Total Files: ${stats.totalFiles}`);
        console.log(`💾 Total Size: ${Math.round(stats.totalSize / 1024 / 1024 * 100) / 100} MB`);
        
        if (stats.oldestFile) {
          console.log(`📅 Oldest File: ${stats.oldestFile.toLocaleDateString()}`);
        }
        if (stats.newestFile) {
          console.log(`📅 Newest File: ${stats.newestFile.toLocaleDateString()}`);
        }
        
        if (stats.files.length > 0) {
          console.log('');
          console.log('Recent Files:');
          stats.files.slice(0, 10).forEach(file => {
            const size = Math.round(file.size / 1024 * 100) / 100;
            console.log(`  - ${file.path} (${size} KB, ${file.modified.toLocaleString()})`);
          });
          
          if (stats.files.length > 10) {
            console.log(`  ... and ${stats.files.length - 10} more files`);
          }
        }
      } catch (error) {
        console.error('❌ Failed to get log stats:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Log health command
  logCommand
    .command('health')
    .description('Check log system health')
    .argument('<folder>', 'Folder path to check log health for')
    .action(async (folder: string) => {
      try {
        const logDir = join(folder, '.folder-mcp', 'logs');
        const logger = createConsoleLogger('info');
        const manager = new LogManager(logDir, logger);
        
        const health = await manager.getHealthStatus();
        
        console.log('🏥 Log System Health Check');
        console.log('');
        console.log(`Status: ${health.healthy ? '✅ Healthy' : '⚠️  Issues Found'}`);
        
        if (health.issues.length > 0) {
          console.log('');
          console.log('Issues:');
          health.issues.forEach(issue => console.log(`  ⚠️  ${issue}`));
        }
        
        console.log('');
        console.log('Statistics:');
        console.log(`  📄 Files: ${health.stats.totalFiles}`);
        console.log(`  💾 Size: ${Math.round(health.stats.totalSize / 1024 / 1024 * 100) / 100} MB`);
        
        if (!health.healthy) {
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Failed to check log health:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Set log level command
  logCommand
    .command('level')
    .description('Set log level for running services')
    .argument('<level>', 'Log level (debug, info, warn, error, fatal)')
    .option('--logger <name>', 'Specific logger name to update')
    .action(async (level: string, options: { logger?: string }) => {
      try {
        const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
        if (!validLevels.includes(level as LogLevel)) {
          console.error(`❌ Invalid log level: ${level}`);
          console.error(`Valid levels: ${validLevels.join(', ')}`);
          process.exit(1);
        }
        
        LogConfigManager.setLogLevel(level as LogLevel, options.logger);
        
        if (options.logger) {
          console.log(`✅ Set log level to '${level}' for logger '${options.logger}'`);
        } else {
          console.log(`✅ Set global log level to '${level}'`);
        }
        
        // Show current logger info
        const loggers = LogConfigManager.getLoggerInfo();
        if (loggers.length > 0) {
          console.log('');
          console.log('Current loggers:');
          loggers.forEach(logger => {
            console.log(`  - ${logger.name}: ${logger.level || 'unknown'}`);
          });
        }
      } catch (error) {
        console.error('❌ Failed to set log level:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // List loggers command
  logCommand
    .command('list')
    .description('List active loggers and their configuration')
    .action(async () => {
      try {
        const loggers = LogConfigManager.getLoggerInfo();
        
        console.log('📝 Active Loggers');
        console.log('');
        
        if (loggers.length === 0) {
          console.log('No active loggers found.');
          console.log('Loggers are registered when the application starts.');
        } else {
          loggers.forEach(logger => {
            console.log(`🔍 ${logger.name}`);
            console.log(`  Level: ${logger.level || 'unknown'}`);
            if (logger.transports) {
              console.log(`  Transports: ${logger.transports.join(', ')}`);
            }
            console.log('');
          });
        }
      } catch (error) {
        console.error('❌ Failed to list loggers:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Archive command
  logCommand
    .command('archive')
    .description('Archive old log files')
    .argument('<folder>', 'Folder path to archive logs for')
    .option('--older-than <days>', 'Archive files older than specified days', '7')
    .action(async (folder: string, options: { olderThan: string }) => {
      try {
        const logDir = join(folder, '.folder-mcp', 'logs');
        const logger = createConsoleLogger('info');
        const manager = new LogManager(logDir, logger);
        
        const archived = await manager.archiveLogs(parseInt(options.olderThan));
        
        console.log(`📦 Would archive ${archived.length} log files`);
        console.log('(Archive functionality requires compression library - placeholder for now)');
        
        if (archived.length > 0) {
          console.log('Files to archive:');
          archived.forEach(file => console.log(`  - ${file}`));
        }
      } catch (error) {
        console.error('❌ Failed to archive logs:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
