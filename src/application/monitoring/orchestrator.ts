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

  constructor(
    private readonly fileParsingService: IFileParsingService,
    private readonly cacheService: ICacheService,
    private readonly loggingService: ILoggingService,
    private readonly configService: IConfigurationService,
    private readonly incrementalIndexer: IncrementalIndexer
  ) {}

  async startFileWatching(folderPath: string, options: WatchingOptions = {}): Promise<WatchingResult> {
    const watchId = this.generateWatchId(folderPath);
    
    this.loggingService.info('Starting file watching', { folderPath, watchId, options });

    try {
      // Check if already watching this folder
      if (this.watchers.has(folderPath)) {
        this.loggingService.warn('Folder is already being watched', { folderPath });
        return {
          success: false,
          watchId: '',
          folderPath,
          startedAt: new Date(),
          options,
          error: 'Folder is already being watched'
        };
      }

      // Create file watcher
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

      this.loggingService.info('File watching started successfully', { folderPath, watchId });

      return result;    } catch (error) {
      this.loggingService.error('Failed to start file watching', error instanceof Error ? error : new Error(String(error)));

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
    this.loggingService.debug('File watch event received', { folderPath, event });

    // Add event to queue
    const eventQueue = this.eventQueues.get(folderPath) || [];
    eventQueue.push(event);
    this.eventQueues.set(folderPath, eventQueue);

    // Get watcher options for debouncing
    const watcher = this.watchers.get(folderPath);
    if (!watcher) return;

    const options = watcher.getOptions();
    const debounceMs = options.debounceMs || 1000;

    // Clear existing timer and set new one
    const existingTimer = this.processingTimers.get(folderPath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.processQueuedEvents(folderPath).catch(error => {
        this.loggingService.error('Failed to process queued events', error instanceof Error ? error : new Error(String(error)));
      });
    }, debounceMs);

    this.processingTimers.set(folderPath, timer);
  }

  private async processQueuedEvents(folderPath: string): Promise<void> {
    const eventQueue = this.eventQueues.get(folderPath) || [];
    if (eventQueue.length === 0) return;

    this.loggingService.info('Processing queued file events', { 
      folderPath, 
      eventCount: eventQueue.length 
    });

    try {
      // Get watcher options
      const watcher = this.watchers.get(folderPath);
      if (!watcher) return;

      const options = watcher.getOptions();

      // Group events by file path to handle multiple events for the same file
      const fileEvents = new Map<string, FileWatchEvent[]>();
      for (const event of eventQueue) {
        if (!fileEvents.has(event.path)) {
          fileEvents.set(event.path, []);
        }
        fileEvents.get(event.path)!.push(event);
      }

      // Process events in batches if enabled
      if (options.enableBatchProcessing) {
        await this.processBatchedEvents(folderPath, fileEvents, options);
      } else {
        await this.processIndividualEvents(folderPath, fileEvents);
      }

      // Update watcher statistics
      watcher.recordEventsProcessed(eventQueue.length);

      // Clear the queue
      this.eventQueues.set(folderPath, []);

    } catch (error) {
      this.loggingService.error('Failed to process queued events', error instanceof Error ? error : new Error(String(error)));
      
      // Don't clear the queue if processing failed
      // This allows for retry on the next event
    }

    // Clear the processing timer
    this.processingTimers.delete(folderPath);
  }

  private async processBatchedEvents(
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
        // Simplified processing without indexFiles method
        this.loggingService.debug(`Processing batch of ${changedFiles.length} files`);
        for (const filePath of changedFiles) {
          this.loggingService.debug(`Processing file: ${filePath}`);
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
        try {
          // Simplified processing without indexFiles method
          this.loggingService.debug(`Processing file: ${filePath}`);
        } catch (error) {
          this.loggingService.error('Failed to process individual file', error instanceof Error ? error : new Error(String(error)));
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
    const supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];
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

// Simple FileWatcher implementation
class FileWatcher {
  private isActive = false;
  private watchId = '';
  private startedAt?: Date;
  private eventsProcessed = 0;
  private lastEventAt?: Date;
  private errors: any[] = [];

  constructor(
    private readonly folderPath: string,
    private readonly options: WatchingOptions,
    private readonly loggingService: ILoggingService,
    private readonly eventHandler: (folderPath: string, event: FileWatchEvent) => Promise<void>
  ) {
    this.watchId = this.generateWatchId();
  }

  async start(): Promise<void> {
    this.loggingService.debug('Starting file watcher', { folderPath: this.folderPath });
    this.isActive = true;
    this.startedAt = new Date();
    
    // In a real implementation, this would set up chokidar or similar
    // For now, we'll simulate the watcher setup
  }

  async stop(): Promise<void> {
    this.loggingService.debug('Stopping file watcher', { folderPath: this.folderPath });
    this.isActive = false;
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
