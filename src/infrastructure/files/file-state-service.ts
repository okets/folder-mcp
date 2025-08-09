/**
 * Infrastructure implementation of file state service
 */

import { IFileStateService } from '../../di/interfaces.js';
import { FileStateManager } from '../../domain/files/file-state-manager.js';
import { SqliteFileStateStorage } from '../storage/sqlite-file-state-storage.js';
import type { ILoggingService } from '../../di/interfaces.js';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

/**
 * File state service implementation using SQLite storage
 */
export class FileStateService implements IFileStateService {
  private fileStateManager: FileStateManager;
  private storage: SqliteFileStateStorage;

  constructor(
    private databasePath: string,
    private logger: ILoggingService
  ) {
    this.storage = new SqliteFileStateStorage(this.databasePath);
    this.fileStateManager = new FileStateManager(this.storage);
    
    this.logger.debug(`[FILE-STATE-SERVICE] Initialized with database: ${this.databasePath}`);
  }

  async makeProcessingDecision(filePath: string, contentHash: string): Promise<{
    shouldProcess: boolean;
    reason: string;
    action: 'process' | 'skip' | 'retry' | 'ignore';
  }> {
    try {
      const decision = await this.fileStateManager.makeProcessingDecision(filePath, contentHash);
      
      this.logger.debug(`[FILE-STATE-DECISION] File: ${filePath} -> ${decision.action} (${decision.reason})`);
      
      return {
        shouldProcess: decision.shouldProcess,
        reason: decision.reason,
        action: decision.action
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[FILE-STATE-ERROR] Failed to make decision for ${filePath}: ${errorMessage}`);
      
      // Fail-safe: if we can't make a decision, process the file
      return {
        shouldProcess: true,
        reason: 'Error in state management - defaulting to process',
        action: 'process'
      };
    }
  }

  async startProcessing(filePath: string, contentHash: string): Promise<void> {
    try {
      await this.fileStateManager.startProcessing(filePath, contentHash);
      this.logger.debug(`[FILE-STATE-START] Started processing: ${filePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[FILE-STATE-ERROR] Failed to record processing start for ${filePath}: ${errorMessage}`);
      // Don't throw - this shouldn't block processing
    }
  }

  async markProcessingSuccess(filePath: string, chunkCount: number): Promise<void> {
    try {
      await this.fileStateManager.markProcessingSuccess(filePath, chunkCount);
      this.logger.debug(`[FILE-STATE-SUCCESS] Marked success: ${filePath} (${chunkCount} chunks)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[FILE-STATE-ERROR] Failed to record processing success for ${filePath}: ${errorMessage}`);
      // Don't throw - this shouldn't block processing
    }
  }

  async markProcessingFailure(filePath: string, reason: string, isCorrupted = false): Promise<void> {
    try {
      await this.fileStateManager.markProcessingFailure(filePath, reason, isCorrupted);
      this.logger.debug(`[FILE-STATE-FAILURE] Marked failure: ${filePath} (corrupted: ${isCorrupted}, reason: ${reason})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[FILE-STATE-ERROR] Failed to record processing failure for ${filePath}: ${errorMessage}`);
      // Don't throw - this shouldn't block processing
    }
  }

  async markFileSkipped(filePath: string, contentHash: string, reason: string): Promise<void> {
    try {
      await this.fileStateManager.markFileSkipped(filePath, contentHash, reason);
      this.logger.debug(`[FILE-STATE-SKIP] Marked skipped: ${filePath} (${reason})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[FILE-STATE-ERROR] Failed to record file skip for ${filePath}: ${errorMessage}`);
      // Don't throw - this shouldn't block processing
    }
  }

  async getStats(): Promise<{
    total: number;
    byState: Record<string, number>;
    processingEfficiency: number;
  }> {
    try {
      return await this.fileStateManager.getStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[FILE-STATE-ERROR] Failed to get stats: ${errorMessage}`);
      return {
        total: 0,
        byState: {},
        processingEfficiency: 0
      };
    }
  }

  /**
   * Generate content hash for a file
   */
  static generateContentHash(filePath: string): string {
    try {
      const content = readFileSync(filePath);
      const hash = createHash('md5');
      hash.update(filePath); // Include path for uniqueness
      hash.update(content);
      return hash.digest('hex');
    } catch (error) {
      // If we can't read the file, use a fallback hash based on path and timestamp
      const hash = createHash('md5');
      hash.update(filePath);
      hash.update(Date.now().toString());
      return hash.digest('hex');
    }
  }

  /**
   * Clean up database connection
   */
  close(): void {
    this.storage.close();
  }
}