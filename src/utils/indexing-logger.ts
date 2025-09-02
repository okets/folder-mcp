/**
 * Focused Indexing Logger
 * 
 * A specialized logger for debugging indexing decisions and file processing loops.
 * Writes to a dedicated log file with structured, concise output.
 */

import * as fs from 'fs';
import * as path from 'path';

export class IndexingLogger {
  private logFilePath: string;
  private stream: fs.WriteStream | null = null;
  
  constructor() {
    // Create log file in project tmp directory
    const projectRoot = path.resolve(process.cwd());
    const logDir = path.join(projectRoot, 'tmp');
    
    // Ensure tmp directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    this.logFilePath = path.join(logDir, 'indexing-decisions.log');
    
    // Clear previous log on startup
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.unlinkSync(this.logFilePath);
      }
    } catch (e) {
      console.warn('[INDEXING-LOGGER] Failed to clear previous log:', (e as Error).message);
    }
    // Create write stream
    try {
      this.stream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
      this.stream.on('error', (err) => {
        console.error('[INDEXING-LOGGER] Stream error:', err.message);
        this.stream = null;
      });
    } catch (e) {
      console.error('[INDEXING-LOGGER] Failed to open log file:', (e as Error).message);
      this.stream = null;
    }
  }
  
  private formatTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }
  
  private extractFileName(filePath: string): string {
    return path.basename(filePath);
  }
  
  private write(message: string): void {
    if (this.stream) {
      this.stream.write(message + '\n');
    }
    // Also write to console for immediate visibility
    console.log('[INDEXING-LOGGER]', message);
  }
  
  /**
   * Log when a file is detected during scanning
   */
  logFileDetected(
    filePath: string,
    currentHash: string,
    storedHash: string | null,
    decision: 'PROCESS' | 'SKIP' | 'RETRY',
    reason: string,
    fileState?: {
      processingState?: string;
      chunkCount?: number;
      attemptCount?: number;
    }
  ): void {
    const fileName = this.extractFileName(filePath);
    const timestamp = this.formatTimestamp();
    
    let message = `[${timestamp}] FILE_DETECTED: ${fileName}\n`;
    message += `  - Current Hash: ${currentHash.substring(0, 12)}...\n`;
    message += `  - Stored Hash: ${storedHash ? storedHash.substring(0, 12) + '...' : 'NONE'}\n`;
    message += `  - Hash Match: ${currentHash === storedHash}\n`;
    message += `  - Decision: ${decision}\n`;
    message += `  - Reason: ${reason}\n`;
    
    if (fileState) {
      message += `  - Previous State: ${fileState.processingState || 'unknown'}\n`;
      message += `  - Chunks in DB: ${fileState.chunkCount || 0}\n`;
      message += `  - Attempt Count: ${fileState.attemptCount || 0}\n`;
    }
    
    this.write(message);
  }
  
  /**
   * Log when processing starts for a file
   */
  logProcessingStart(
    filePath: string,
    hash: string,
    attempt: number
  ): void {
    const fileName = this.extractFileName(filePath);
    const timestamp = this.formatTimestamp();
    
    let message = `[${timestamp}] PROCESSING_START: ${fileName}\n`;
    message += `  - Hash: ${hash.substring(0, 12)}...\n`;
    message += `  - Attempt: ${attempt}\n`;
    
    this.write(message);
  }
  
  /**
   * Log when processing completes for a file
   */
  logProcessingComplete(
    filePath: string,
    status: 'SUCCESS' | 'FAILURE',
    chunks: number,
    dbUpdateSuccess: boolean,
    newState?: string,
    error?: string
  ): void {
    const fileName = this.extractFileName(filePath);
    const timestamp = this.formatTimestamp();
    
    let message = `[${timestamp}] PROCESSING_COMPLETE: ${fileName}\n`;
    message += `  - Status: ${status}\n`;
    message += `  - Chunks: ${chunks}\n`;
    message += `  - DB Update: ${dbUpdateSuccess ? 'SUCCESS' : 'FAILED'}\n`;
    
    if (newState) {
      message += `  - New State: ${newState}\n`;
    }
    
    if (error) {
      message += `  - Error: ${error}\n`;
    }
    
    this.write(message);
  }
  
  /**
   * Log file watcher events
   */
  logWatcherEvent(
    eventType: string,
    filePath: string
  ): void {
    const fileName = this.extractFileName(filePath);
    const timestamp = this.formatTimestamp();
    
    let message = `[${timestamp}] WATCHER_EVENT: ${eventType} - ${fileName}`;
    this.write(message);
  }
  
  /**
   * Log scan initiation
   */
  logScanStarted(
    folderPath: string,
    fileCount: number
  ): void {
    const timestamp = this.formatTimestamp();
    
    let message = `[${timestamp}] SCAN_STARTED: ${folderPath}\n`;
    message += `  - Total Files: ${fileCount}\n`;
    
    this.write(message);
  }
  
  /**
   * Log scan completion
   */
  logScanCompleted(
    folderPath: string,
    processCount: number,
    skipCount: number
  ): void {
    const timestamp = this.formatTimestamp();
    
    let message = `[${timestamp}] SCAN_COMPLETED: ${folderPath}\n`;
    message += `  - Files to Process: ${processCount}\n`;
    message += `  - Files Skipped: ${skipCount}\n`;
    
    this.write(message);
  }
  
  /**
   * Close the logger
   */
  close(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}

// Singleton instance
let indexingLogger: IndexingLogger | null = null;

export function getIndexingLogger(): IndexingLogger {
  if (!indexingLogger) {
    indexingLogger = new IndexingLogger();
  }
  return indexingLogger;
}