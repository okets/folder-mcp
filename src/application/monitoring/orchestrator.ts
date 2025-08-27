/**
 * Monitoring Orchestrator
 * 
 * Orchestrates monitoring workflows including file watching,
 * health checking, and system monitoring.
 */

import { 
  MonitoringWorkflow,
  WatchingOptions,
  WatchingResult,
  WatchingStatus,
  SystemHealthResult
} from './index.js';
import { getSupportedExtensions } from '../../domain/files/supported-extensions.js';

// Domain service interfaces
import { 
  IFileParsingService,
  ICacheService,
  ILoggingService,
  IConfigurationService 
} from '../../di/interfaces.js';

// Domain types
import { FileFingerprint } from '../../types/index.js';

// Import the incremental indexer for processing changes
import { IncrementalIndexer } from '../indexing/index.js';

// Import chokidar for actual file watching
import chokidar, { FSWatcher } from 'chokidar';

export interface FileWatchEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  timestamp: Date;
  stats?: {
    size: number;
    mtime: Date;
  };
}

export class MonitoringOrchestrator implements MonitoringWorkflow {
  private watchers: Map<string, FileWatcher> = new Map();
  private eventQueues: Map<string, FileWatchEvent[]> = new Map();
  private processingTimers: Map<string, NodeJS.Timeout> = new Map();
  private changeDetectionCallback?: (folderPath: string, changeCount: number) => void;

  constructor(
    private readonly fileParsingService: IFileParsingService,
    private readonly cacheService: ICacheService,
    private readonly loggingService: ILoggingService,
    private readonly configService: IConfigurationService,
    private readonly incrementalIndexer: IncrementalIndexer
  ) {}

  /**
   * Set callback for when file changes are detected and processed
   */
  setChangeDetectionCallback(callback: (folderPath: string, changeCount: number) => void): void {
    this.changeDetectionCallback = callback;
  }

  async startFileWatching(folderPath: string, options: WatchingOptions = {}): Promise<WatchingResult> {
    const watchId = this.generateWatchId(folderPath);
    
    this.loggingService.info('🔍 Starting file watching for integration test', { 
      folderPath, 
      watchId, 
      options,
      timestamp: new Date().toISOString()
    });

    try {
      // Check if already watching this folder
      if (this.watchers.has(folderPath)) {
        this.loggingService.warn('⚠️ Folder is already being watched', { folderPath });
        return {
          success: false,
          watchId: '',
          folderPath,
          startedAt: new Date(),
          options,
          error: 'Folder is already being watched'
        };
      }

      // Create file watcher with enhanced logging
      const watcher = new FileWatcher(
        folderPath,
        options,
        this.loggingService,
        this.handleFileWatchEvent.bind(this)
      );

      // Start watching
      await watcher.start();

      // Store watcher and initialize event queue
      this.watchers.set(folderPath, watcher);
      this.eventQueues.set(folderPath, []);

      const result: WatchingResult = {
        success: true,
        watchId,
        folderPath,
        startedAt: new Date(),
        options
      };

      this.loggingService.info('✅ File watching started successfully', { 
        folderPath, 
        watchId,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      this.loggingService.error('❌ Failed to start file watching', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        watchId: '',
        folderPath,
        startedAt: new Date(),
        options,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async stopFileWatching(folderPath: string): Promise<void> {
    this.loggingService.info('Stopping file watching', { folderPath });

    try {
      const watcher = this.watchers.get(folderPath);
      if (!watcher) {
        this.loggingService.warn('No watcher found for folder', { folderPath });
        return;
      }

      // Stop the watcher
      await watcher.stop();

      // Clear any pending processing
      const timer = this.processingTimers.get(folderPath);
      if (timer) {
        clearTimeout(timer);
        this.processingTimers.delete(folderPath);
      }

      // Clean up
      this.watchers.delete(folderPath);
      this.eventQueues.delete(folderPath);

      this.loggingService.info('File watching stopped successfully', { folderPath });

    } catch (error) {
      this.loggingService.error('Failed to stop file watching', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getWatchingStatus(folderPath: string): Promise<WatchingStatus> {
    const watcher = this.watchers.get(folderPath);
    const eventQueue = this.eventQueues.get(folderPath) || [];

    if (!watcher) {
      return {
        isActive: false,
        watchId: '',
        folderPath,
        eventsProcessed: 0,
        queuedEvents: 0,
        errors: []
      };
    }

    const status = watcher.getStatus();

    const result: WatchingStatus = {
      isActive: status.isActive,
      watchId: status.watchId,
      folderPath,
      eventsProcessed: status.eventsProcessed,
      queuedEvents: eventQueue.length,
      errors: status.errors
    };

    // Only add optional fields if they have values
    if (status.startedAt) {
      result.startedAt = status.startedAt;
    }
    if (status.lastEventAt) {
      result.lastEventAt = status.lastEventAt;
    }

    return result;
  }

  async getSystemHealth(): Promise<SystemHealthResult> {
    this.loggingService.debug('Checking system health');

    try {
      // Check various system components without requiring getConfiguration method
      const healthChecks = await Promise.allSettled([
        this.checkFileSystemHealth(),
        this.checkCacheHealth(),
        this.checkWatchingHealth(),
        this.checkMemoryHealth(),
        this.checkPerformanceHealth()
      ]);

      const results = healthChecks.map((check, index) => {
        const componentNames = ['filesystem', 'cache', 'watching', 'memory', 'performance'];
        const componentName = componentNames[index] || 'unknown';
        const isHealthy = check.status === 'fulfilled' && check.value.healthy;
        
        return {
          component: componentName,
          status: isHealthy ? 'healthy' as const : 'critical' as const,
          message: isHealthy ? 'Component is functioning normally' : (check.status === 'rejected' ? check.reason?.message || 'Unknown error' : 'Component check failed'),
          lastChecked: new Date(),
          details: check.status === 'fulfilled' ? check.value.details : { error: check.reason?.message }
        };
      });

      const overallHealth = results.every(r => r.status === 'healthy');

      return {
        overall: overallHealth ? 'healthy' as const : 'critical' as const,
        timestamp: new Date(),
        uptime: process.uptime(),
        version: '1.0.0',
        components: results
      };

    } catch (error) {
      this.loggingService.error('System health check failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        overall: 'critical' as const,
        timestamp: new Date(),
        uptime: process.uptime(),
        version: '1.0.0',
        components: []
      };
    }
  }

  private async handleFileWatchEvent(folderPath: string, event: FileWatchEvent): Promise<void> {
    this.loggingService.info('🔥 File watch event received - CRITICAL for integration test', { 
      folderPath, 
      event: {
        type: event.type,
        path: event.path,
        timestamp: event.timestamp.toISOString()
      }
    });

    // Add event to queue
    const eventQueue = this.eventQueues.get(folderPath) || [];
    eventQueue.push(event);
    this.eventQueues.set(folderPath, eventQueue);

    // Log queue updates for small queues (now that we only watch supported files, queues will be small)
    if (eventQueue.length < 10) {
      this.loggingService.info(`📊 Event queue updated - ${eventQueue.length} events queued`, { 
        folderPath,
        queueLength: eventQueue.length
      });
    }

    // Get watcher options for debouncing
    const watcher = this.watchers.get(folderPath);
    if (!watcher) {
      this.loggingService.error('❌ No watcher found for folder', new Error(`No watcher found for folder: ${folderPath}`));
      return;
    }

    const options = watcher.getOptions();
    const debounceMs = options.debounceMs || 1000;

    this.loggingService.debug(`⏱️ Setting debounce timer for ${debounceMs}ms`, { folderPath, debounceMs });

    // Clear existing timer and set new one
    const existingTimer = this.processingTimers.get(folderPath);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.loggingService.debug('🔄 Cleared existing debounce timer', { folderPath });
    }

    const timer = setTimeout(() => {
      this.loggingService.info('🚀 Debounce timer triggered - processing queued events', { 
        folderPath,
        timestamp: new Date().toISOString()
      });
      
      this.processQueuedEvents(folderPath).catch(error => {
        this.loggingService.error('❌ Failed to process queued events', error instanceof Error ? error : new Error(String(error)));
      });
    }, debounceMs);

    this.processingTimers.set(folderPath, timer);
  }

  private async processQueuedEvents(folderPath: string): Promise<void> {
    const eventQueue = this.eventQueues.get(folderPath) || [];
    if (eventQueue.length === 0) {
      this.loggingService.debug('📭 No queued events to process', { folderPath });
      return;
    }

    this.loggingService.info('🔄 Processing queued file events', { 
      folderPath, 
      eventCount: eventQueue.length,
      timestamp: new Date().toISOString()
    });

    try {
      // Get watcher options
      const watcher = this.watchers.get(folderPath);
      if (!watcher) {
        this.loggingService.error('❌ No watcher found during event processing', new Error(`No watcher found during event processing: ${folderPath}`));
        return;
      }

      const options = watcher.getOptions();

      // Group events by file path to handle multiple events for the same file
      const fileEvents = new Map<string, FileWatchEvent[]>();
      for (const event of eventQueue) {
        if (!fileEvents.has(event.path)) {
          fileEvents.set(event.path, []);
        }
        fileEvents.get(event.path)!.push(event);
      }

      this.loggingService.info('📂 Grouped events by file', { 
        folderPath,
        uniqueFiles: fileEvents.size,
        totalEvents: eventQueue.length
      });

      // Process events in batches if enabled
      if (options.enableBatchProcessing) {
        await this.processBatchedEvents(folderPath, fileEvents, options);
      } else {
        await this.processIndividualEvents(folderPath, fileEvents);
      }

      // Clear the event queue after processing
      this.eventQueues.set(folderPath, []);
      
      // Update watcher statistics
      watcher.recordEventsProcessed(eventQueue.length);

      this.loggingService.info('✅ Successfully processed all queued events', { 
        folderPath,
        processedCount: eventQueue.length,
        timestamp: new Date().toISOString()
      });
      
      // Notify about changes detected if callback is set
      if (this.changeDetectionCallback && eventQueue.length > 0) {
        this.loggingService.info('🔔 Notifying about file changes detected', { 
          folderPath,
          changeCount: eventQueue.length 
        });
        this.changeDetectionCallback(folderPath, eventQueue.length);
      }

    } catch (error) {
      this.loggingService.error('❌ Failed to process queued events', error instanceof Error ? error : new Error(String(error)), {
        folderPath,
        eventCount: eventQueue.length
      });
    }
  }  private async processBatchedEvents(
    folderPath: string, 
    fileEvents: Map<string, FileWatchEvent[]>,
    options: WatchingOptions
  ): Promise<void> {
    const batchSize = options.batchSize || 10;
    const filePaths = Array.from(fileEvents.keys());
    
    // Process files in batches
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const changedFiles = batch.filter(path => this.shouldProcessFile(path, fileEvents.get(path)!));
      
      if (changedFiles.length > 0) {
        this.loggingService.info(`🔄 Processing batch of ${changedFiles.length} changed files`, {
          folderPath,
          batchIndex: Math.floor(i / batchSize) + 1,
          files: changedFiles
        });
        
        try {
          // Create a simple change detection result for these files
          const changes = {
            newFiles: changedFiles.filter(path => {
              const events = fileEvents.get(path) || [];
              return events.some(e => e.type === 'add');
            }),
            modifiedFiles: changedFiles.filter(path => {
              const events = fileEvents.get(path) || [];
              return events.some(e => e.type === 'change');
            }),
            deletedFiles: changedFiles.filter(path => {
              const events = fileEvents.get(path) || [];
              return events.some(e => e.type === 'unlink');
            }),
            unchangedFiles: [],
            summary: {
              totalChanges: changedFiles.length,
              estimatedProcessingTime: changedFiles.length * 1000,
              requiresFullReindex: false
            }
          };
          
          // Use incremental indexer to process the changes
          const result = await this.incrementalIndexer.indexChanges(changes, {
            includeFileTypes: options.includeFileTypes || [...getSupportedExtensions()],
            excludePatterns: options.excludePatterns || [],
            forceReindex: false // Incremental updates
          });
          
          this.loggingService.info(`✅ Batch processing completed`, {
            folderPath,
            filesProcessed: result.filesProcessed,
            chunksGenerated: result.chunksGenerated,
            embeddingsCreated: result.embeddingsCreated,
            errors: result.errors.length
          });
          
          if (result.errors.length > 0) {
            this.loggingService.warn(`⚠️ Batch had ${result.errors.length} errors`, {
              errors: result.errors.map((e: any) => ({ file: e.filePath, error: e.error }))
            });
          }
        } catch (error) {
          this.loggingService.error('❌ Batch processing failed', error instanceof Error ? error : new Error(String(error)), {
            folderPath,
            files: changedFiles
          });
        }
      }
    }
  }

  private async processIndividualEvents(
    folderPath: string,
    fileEvents: Map<string, FileWatchEvent[]>
  ): Promise<void> {
    for (const [filePath, events] of fileEvents) {
      if (this.shouldProcessFile(filePath, events)) {
        this.loggingService.info(`🔄 Processing individual file change`, { 
          filePath,
          eventCount: events.length,
          eventTypes: events.map(e => e.type)
        });
        
        try {
          // Create a simple change detection result for this file
          const changes = {
            newFiles: events.some(e => e.type === 'add') ? [filePath] : [],
            modifiedFiles: events.some(e => e.type === 'change') ? [filePath] : [],
            deletedFiles: events.some(e => e.type === 'unlink') ? [filePath] : [],
            unchangedFiles: [],
            summary: {
              totalChanges: 1,
              estimatedProcessingTime: 1000,
              requiresFullReindex: false
            }
          };
          
          // Use incremental indexer to process the change
          const result = await this.incrementalIndexer.indexChanges(changes, {
            includeFileTypes: [...getSupportedExtensions()],
            excludePatterns: [],
            forceReindex: false // Incremental updates
          });
          
          this.loggingService.info(`✅ File processing completed`, {
            filePath,
            chunksGenerated: result.chunksGenerated,
            embeddingsCreated: result.embeddingsCreated,
            success: result.success
          });
          
          if (result.errors.length > 0) {
            this.loggingService.warn(`⚠️ File processing had errors`, {
              filePath,
              errors: result.errors.map((e: any) => e.error)
            });
          }
        } catch (error) {
          this.loggingService.error('❌ Individual file processing failed', error instanceof Error ? error : new Error(String(error)), {
            filePath
          });
        }
      }
    }
  }

  private shouldProcessFile(filePath: string, events: FileWatchEvent[]): boolean {
    // Check if file should be processed based on events
    const lastEvent = events[events.length - 1];
    
    // Check if we have events and the last event exists
    if (!lastEvent) {
      return false;
    }
    
    // Skip if file was deleted
    if (lastEvent.type === 'unlink') {
      return false;
    }

    // Check file extension
    const supportedExtensions = getSupportedExtensions();
    const hasValidExtension = supportedExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
    
    return hasValidExtension;
  }

  private async checkFileSystemHealth(folderPath?: string): Promise<{ healthy: boolean; details: any }> {
    if (!folderPath) {
      return { healthy: false, details: { error: 'No folder path configured' } };
    }

    try {
      // Use filesystem check instead of parsing service methods that don't exist
      const fs = await import('fs');
      const stats = await fs.promises.stat(folderPath);
      
      if (!stats.isDirectory()) {
        return { healthy: false, details: { error: 'Configured path is not a directory' } };
      }

      return { 
        healthy: true, 
        details: { 
          path: folderPath, 
          readable: true, 
          isDirectory: true 
        } 
      };

    } catch (error) {
      return { 
        healthy: false, 
        details: { error: error instanceof Error ? error.message : String(error) } 
      };
    }
  }

  private async checkCacheHealth(): Promise<{ healthy: boolean; details: any }> {
    try {
      const stats = await this.cacheService.getCacheStatus([]);
      return {
        healthy: true,
        details: {
          status: 'operational'
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async checkWatchingHealth(): Promise<{ healthy: boolean; details: any }> {
    const activeWatchers = Array.from(this.watchers.entries()).map(([path, watcher]) => ({
      path,
      status: watcher.getStatus()
    }));

    return {
      healthy: true,
      details: {
        activeWatchers: activeWatchers.length,
        watchers: activeWatchers
      }
    };
  }

  private async checkMemoryHealth(): Promise<{ healthy: boolean; details: any }> {
    const memoryUsage = process.memoryUsage();
    const totalMemoryMB = memoryUsage.heapTotal / 1024 / 1024;
    const usedMemoryMB = memoryUsage.heapUsed / 1024 / 1024;
    const usagePercentage = (usedMemoryMB / totalMemoryMB) * 100;

    return {
      healthy: usagePercentage < 80, // Consider unhealthy if using >80% of heap
      details: {
        totalMB: Math.round(totalMemoryMB),
        usedMB: Math.round(usedMemoryMB),
        usagePercentage: Math.round(usagePercentage),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }
    };
  }

  private async checkPerformanceHealth(): Promise<{ healthy: boolean; details: any }> {
    // This would check various performance metrics
    // For now, return a basic check
    return {
      healthy: true,
      details: {
        uptime: process.uptime(),
        activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
        activeRequests: (process as any)._getActiveRequests?.()?.length || 0
      }
    };
  }

  private generateWatchId(folderPath: string): string {
    const timestamp = Date.now().toString(36);
    const pathHash = Buffer.from(folderPath).toString('base64').substring(0, 8);
    return `watch_${pathHash}_${timestamp}`;
  }
}

// Enhanced FileWatcher implementation with actual chokidar integration
class FileWatcher {
  private isActive = false;
  private watchId = '';
  private startedAt?: Date;
  private eventsProcessed = 0;
  private lastEventAt?: Date;
  private errors: any[] = [];
  private chokidarWatcher: FSWatcher | undefined;

  constructor(
    private readonly folderPath: string,
    private readonly options: WatchingOptions,
    private readonly loggingService: ILoggingService,
    private readonly eventHandler: (folderPath: string, event: FileWatchEvent) => Promise<void>
  ) {
    this.watchId = this.generateWatchId();
  }

  async start(): Promise<void> {
    this.loggingService.info('🚀 Starting chokidar file watcher', { 
      folderPath: this.folderPath,
      watchId: this.watchId,
      options: this.options
    });
    
    try {
      // Get supported extensions and create glob patterns for them
      const supportedExtensions = this.options.includeFileTypes || getSupportedExtensions();
      const globPatterns = supportedExtensions.map(ext => `**/*${ext}`);
      
      this.loggingService.info('📋 Configuring file watcher with extension filtering', {
        supportedExtensions,
        globPatterns,
        folderPath: this.folderPath
      });
      
      // Initialize chokidar watcher - ONLY watch files with supported extensions
      this.chokidarWatcher = chokidar.watch(globPatterns, {
        cwd: this.folderPath,  // Set working directory first
        ignored: [
          /(^|[\/\\])\../,  // ignore dotfiles
          ...(this.options.excludePatterns || [])  // apply exclude patterns
        ],
        persistent: true,
        ignoreInitial: false, // Set to false to detect existing files
        followSymlinks: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 20
        }
      });

      // Set up event handlers
      this.chokidarWatcher        .on('add', (filePath: string, stats?: any) => {
          this.loggingService.info('📄 File added', { filePath, size: stats?.size });
          this.handleChokidarEvent('add', filePath, stats);
        })
        .on('change', (filePath: string, stats?: any) => {
          this.loggingService.info('📝 File changed - THIS IS CRITICAL FOR INTEGRATION TEST', { 
            filePath, 
            size: stats?.size,
            timestamp: new Date().toISOString()
          });
          this.handleChokidarEvent('change', filePath, stats);
        })
        .on('unlink', (filePath: string) => {
          this.loggingService.info('🗑️ File deleted', { filePath });
          this.handleChokidarEvent('unlink', filePath);
        })
        .on('addDir', (dirPath: string) => {
          this.loggingService.info('📁 Directory added', { dirPath });
          this.handleChokidarEvent('addDir', dirPath);
        })
        .on('unlinkDir', (dirPath: string) => {
          this.loggingService.info('📁❌ Directory deleted', { dirPath });
          this.handleChokidarEvent('unlinkDir', dirPath);
        })
        .on('error', (error: any) => {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          this.loggingService.error('❌ Chokidar watcher error', errorObj);
          this.errors.push({
            timestamp: new Date(),
            error: errorObj.message
          });
        })
        .on('ready', () => {
          this.loggingService.info('✅ Chokidar watcher ready', { 
            folderPath: this.folderPath,
            watchId: this.watchId
          });
        });

      this.isActive = true;
      this.startedAt = new Date();
      
      this.loggingService.info('✅ File watcher started successfully', { 
        folderPath: this.folderPath,
        watchId: this.watchId,
        timestamp: this.startedAt.toISOString()
      });    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.loggingService.error('❌ Failed to start chokidar watcher', errorObj);
      throw errorObj;
    }
  }

  async stop(): Promise<void> {
    this.loggingService.info('🛑 Stopping file watcher', { 
      folderPath: this.folderPath,
      watchId: this.watchId
    });
    
    try {
      if (this.chokidarWatcher) {
        await this.chokidarWatcher.close();
        this.chokidarWatcher = undefined;
      }
      
      this.isActive = false;
      
      this.loggingService.info('✅ File watcher stopped successfully', { 
        folderPath: this.folderPath,
        watchId: this.watchId,
        eventsProcessed: this.eventsProcessed
      });    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.loggingService.error('❌ Error stopping file watcher', errorObj);
      throw errorObj;
    }
  }
  private handleChokidarEvent(eventType: FileWatchEvent['type'], filePath: string, stats?: any): void {
    const event: FileWatchEvent = {
      type: eventType,
      path: filePath,
      timestamp: new Date()
    };

    // Add stats if available
    if (stats && stats.size !== undefined && stats.mtime !== undefined) {
      event.stats = {
        size: stats.size,
        mtime: stats.mtime
      };
    }

    this.loggingService.debug('🔄 Processing chokidar event', { 
      eventType,
      filePath,
      watchId: this.watchId
    });

    // Forward to the event handler
    this.eventHandler(this.folderPath, event).catch(error => {
      this.loggingService.error('❌ Error handling file watch event', error instanceof Error ? error : new Error(String(error)), {
        eventType,
        filePath,
        watchId: this.watchId
      });
    });
  }

  getStatus() {
    return {
      isActive: this.isActive,
      watchId: this.watchId,
      startedAt: this.startedAt,
      eventsProcessed: this.eventsProcessed,
      lastEventAt: this.lastEventAt,
      errors: this.errors
    };
  }

  getOptions(): WatchingOptions {
    return this.options;
  }

  recordEventsProcessed(count: number): void {
    this.eventsProcessed += count;
    this.lastEventAt = new Date();
  }

  private generateWatchId(): string {
    return `watcher_${Date.now().toString(36)}`;
  }
}
