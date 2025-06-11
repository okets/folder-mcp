/**
 * File Watching Domain Logic
 * 
 * Pure business logic for file change detection and monitoring.
 * Contains the core algorithms for change detection without external dependencies.
 */

import { PathProvider } from '../index';

/**
 * File change event types
 */
export type FileChangeType = 'add' | 'change' | 'unlink';

/**
 * File change event
 */
export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  relativePath: string;
  timestamp: Date;
  extension: string;
}

/**
 * Processed batch of file events
 */
export interface FileEventBatch {
  events: FileChangeEvent[];
  processedAt: Date;
  batchSize: number;
}

/**
 * File change statistics
 */
export interface FileChangeStats {
  totalEvents: number;
  addedFiles: number;
  modifiedFiles: number;
  deletedFiles: number;
  supportedFiles: number;
  unsupportedFiles: number;
}

/**
 * Domain interface for file watching operations
 */
export interface FileWatchingOperations {
  isFileSupported(filePath: string): boolean;
  createFileEvent(type: FileChangeType, filePath: string, basePath: string): FileChangeEvent;
  batchEvents(events: FileChangeEvent[], batchSize: number): FileEventBatch[];
  calculateStats(events: FileChangeEvent[]): FileChangeStats;
  deduplicateEvents(events: Map<string, FileChangeEvent>): FileChangeEvent[];
}

/**
 * File Watcher Logic - Core domain logic for file change processing
 */
export class FileWatchingDomainService implements FileWatchingOperations {
  private readonly supportedExtensions: string[] = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];

  constructor(private readonly pathProvider: PathProvider) {}

  /**
   * Check if a file is supported for processing
   */
  isFileSupported(filePath: string): boolean {
    const ext = this.pathProvider.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  /**
   * Create a standardized file change event
   */
  createFileEvent(type: FileChangeType, filePath: string, basePath: string): FileChangeEvent {
    const relativePath = this.pathProvider.relative(basePath, filePath);
    const extension = this.pathProvider.extname(filePath).toLowerCase();
    
    return {
      type,
      path: filePath,
      relativePath,
      timestamp: new Date(),
      extension
    };
  }

  /**
   * Batch events for efficient processing
   */
  batchEvents(events: FileChangeEvent[], batchSize: number): FileEventBatch[] {
    const batches: FileEventBatch[] = [];
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batchEvents = events.slice(i, i + batchSize);
      batches.push({
        events: batchEvents,
        processedAt: new Date(),
        batchSize: batchEvents.length
      });
    }
    
    return batches;
  }

  /**
   * Calculate statistics for a set of file events
   */
  calculateStats(events: FileChangeEvent[]): FileChangeStats {
    let addedFiles = 0;
    let modifiedFiles = 0;
    let deletedFiles = 0;
    let supportedFiles = 0;
    let unsupportedFiles = 0;
    
    for (const event of events) {
      switch (event.type) {
        case 'add':
          addedFiles++;
          break;
        case 'change':
          modifiedFiles++;
          break;
        case 'unlink':
          deletedFiles++;
          break;
      }
      
      if (this.isFileSupported(event.path)) {
        supportedFiles++;
      } else {
        unsupportedFiles++;
      }
    }
    
    return {
      totalEvents: events.length,
      addedFiles,
      modifiedFiles,
      deletedFiles,
      supportedFiles,
      unsupportedFiles
    };
  }

  /**
   * Deduplicate events by keeping the latest event for each file
   */
  deduplicateEvents(eventMap: Map<string, FileChangeEvent>): FileChangeEvent[] {
    return Array.from(eventMap.values());
  }

  /**
   * Filter events to only supported file types
   */
  filterSupportedEvents(events: FileChangeEvent[]): FileChangeEvent[] {
    return events.filter(event => this.isFileSupported(event.path));
  }

  /**
   * Sort events by timestamp (oldest first)
   */
  sortEventsByTimestamp(events: FileChangeEvent[]): FileChangeEvent[] {
    return [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Group events by file type
   */
  groupEventsByType(events: FileChangeEvent[]): Map<string, FileChangeEvent[]> {
    const groups = new Map<string, FileChangeEvent[]>();
    
    for (const event of events) {
      const extension = event.extension;
      if (!groups.has(extension)) {
        groups.set(extension, []);
      }
      groups.get(extension)!.push(event);
    }
    
    return groups;
  }

  /**
   * Check if an event should trigger immediate processing
   */
  shouldProcessImmediately(event: FileChangeEvent): boolean {
    // For now, no immediate processing rules
    // This could be extended to handle critical file types or patterns
    return false;
  }

  /**
   * Validate event integrity
   */
  isValidEvent(event: FileChangeEvent): boolean {
    return !!(
      event.type &&
      event.path &&
      event.relativePath &&
      event.timestamp &&
      event.extension !== undefined
    );
  }
}

/**
 * Event aggregation utilities
 */
export class FileEventAggregator {
  private readonly domainService: FileWatchingDomainService;
  
  constructor(pathProvider: PathProvider) {
    this.domainService = new FileWatchingDomainService(pathProvider);
  }

  /**
   * Process a collection of raw events into structured batches
   */
  processEventCollection(
    eventMap: Map<string, FileChangeEvent>, 
    batchSize: number = 32
  ): {
    batches: FileEventBatch[];
    stats: FileChangeStats;
    supportedEvents: FileChangeEvent[];
  } {
    // Deduplicate and get all events
    const allEvents = this.domainService.deduplicateEvents(eventMap);
    
    // Filter to supported events only
    const supportedEvents = this.domainService.filterSupportedEvents(allEvents);
    
    // Sort by timestamp
    const sortedEvents = this.domainService.sortEventsByTimestamp(supportedEvents);
    
    // Create batches
    const batches = this.domainService.batchEvents(sortedEvents, batchSize);
    
    // Calculate statistics
    const stats = this.domainService.calculateStats(allEvents);
    
    return {
      batches,
      stats,
      supportedEvents: sortedEvents
    };
  }
}

/**
 * Factory functions for dependency injection
 */
export const createFileWatchingDomainService = (pathProvider: PathProvider): FileWatchingDomainService => 
  new FileWatchingDomainService(pathProvider);

export const createFileEventAggregator = (pathProvider: PathProvider): FileEventAggregator => 
  new FileEventAggregator(pathProvider);
