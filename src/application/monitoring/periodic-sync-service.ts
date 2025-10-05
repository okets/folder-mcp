/**
 * Periodic Filesystem Sync Service
 *
 * Provides a safety net for detecting files missed by chokidar during bulk operations,
 * cleaning up orphaned Vec0 embeddings, and retrying folders in error state.
 *
 * Key Features:
 * - Retries folders in "error" state automatically (every 60 seconds)
 * - Only syncs folders in "active" state (skips pending/indexing to avoid conflicts)
 * - Detects new files on disk that aren't in database
 * - Validates Vec0 table integrity
 * - Cleans orphan embeddings automatically
 */

import { ILoggingService } from '../../di/interfaces.js';
import { IFileSystemService } from '../../domain/files/file-system-operations.js';
import { IFolderLifecycleManager } from '../../domain/folders/folder-lifecycle-manager.js';
import { SQLiteVecStorage } from '../../infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import { getSupportedExtensions } from '../../domain/files/supported-extensions.js';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as path from 'path';
import * as fs from 'fs';

export interface PeriodicSyncOptions {
  intervalMs?: number;
  vec0CleanupEnabled?: boolean;
}

export class PeriodicSyncService {
  private syncTimer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly vec0CleanupEnabled: boolean;
  private readonly supportedExtensions: readonly string[];

  constructor(
    private logger: ILoggingService,
    private fileSystemService: IFileSystemService,
    options: PeriodicSyncOptions = {}
  ) {
    this.intervalMs = options.intervalMs ?? 60000; // Default 60 seconds
    this.vec0CleanupEnabled = options.vec0CleanupEnabled ?? true;
    this.supportedExtensions = getSupportedExtensions();
  }

  /**
   * Start periodic sync with callback
   * IDEMPOTENT: Returns early if already started to prevent timer cancellation
   */
  start(syncCallback: () => Promise<void>): void {
    // Return early if already started to prevent canceling active timer
    if (this.syncTimer) {
      this.logger.warn('[PERIODIC-SYNC] Already started, ignoring duplicate start() call');
      return;
    }

    this.logger.info(`[PERIODIC-SYNC] Starting periodic sync (interval: ${this.intervalMs}ms, vec0Cleanup: ${this.vec0CleanupEnabled})`);

    // Use setInterval and store the timer reference
    this.syncTimer = setInterval(() => {
      this.logger.info('[PERIODIC-SYNC] ⏰ Timer fired, executing sync callback');

      // Execute async callback without await to prevent blocking the timer
      syncCallback()
        .then(() => {
          this.logger.info('[PERIODIC-SYNC] ✅ Sync callback completed successfully');
        })
        .catch((error) => {
          this.logger.error('[PERIODIC-SYNC] ❌ Error during sync:', error instanceof Error ? error : new Error(String(error)));
        });
    }, this.intervalMs);

    this.logger.info(`[PERIODIC-SYNC] Timer created and active (next execution in ${this.intervalMs}ms)`);
  }

  /**
   * Stop periodic sync
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.logger.info('[PERIODIC-SYNC] Stopped periodic sync');
    }
  }

  /**
   * Sync a single folder - detect new files, clean Vec0, and retry errors
   * Processes folders in "active" state for sync, "error" state for retry
   */
  async syncFolder(
    folderPath: string,
    manager: IFolderLifecycleManager,
    sqliteVecStorage: SQLiteVecStorage
  ): Promise<void> {
    const state = manager.getState();

    // Handle folders in error state - retry indexing
    if (state.status === 'error') {
      this.logger.info(`[PERIODIC-SYNC] Retrying folder in error state: ${folderPath}`);
      this.logger.info(`[PERIODIC-SYNC] Error details: ${state.errorMessage || 'Unknown error'}`);

      try {
        // Attempt to restart scanning/indexing
        await manager.startScanning();
        this.logger.info(`[PERIODIC-SYNC] Successfully re-queued error folder: ${folderPath}`);
      } catch (error) {
        this.logger.error(`[PERIODIC-SYNC] Failed to retry folder ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      }
      return;
    }

    // CRITICAL: Only sync folders that are "active" (not indexing/pending/scanning)
    if (state.status !== 'active') {
      this.logger.debug(`[PERIODIC-SYNC] Skipping folder ${folderPath} (status: ${state.status})`);
      return;
    }

    try {
      // 1. Filesystem Sync: Detect new files missed by chokidar
      const newFiles = await this.detectNewFiles(folderPath, sqliteVecStorage);

      if (newFiles.length > 0) {
        this.logger.info(`[PERIODIC-SYNC] Found ${newFiles.length} new files missed by chokidar in ${folderPath}`);

        // Trigger re-scan via manager to pick up new files
        // This will transition the folder to scanning/indexing state
        await manager.startScanning();
      }

      // 2. Vec0 Integrity: Clean orphan embeddings
      if (this.vec0CleanupEnabled) {
        await this.validateAndCleanVec0(folderPath, sqliteVecStorage);
      }

    } catch (error) {
      this.logger.error(`[PERIODIC-SYNC] Error syncing folder ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      // Continue with other folders - don't fail entire sync
    }
  }

  /**
   * Detect files on disk that aren't in database
   */
  private async detectNewFiles(folderPath: string, sqliteVecStorage: SQLiteVecStorage): Promise<string[]> {
    try {
      // Get all files from filesystem (recursive)
      const filesOnDisk = await this.scanFilesRecursively(folderPath);

      // Get all files from database
      const filesInDb = await sqliteVecStorage.getAllDocumentPaths();

      // Find files on disk but not in DB
      const filesInDbSet = new Set(filesInDb);
      const newFiles = filesOnDisk.filter(f => !filesInDbSet.has(f));

      return newFiles;
    } catch (error) {
      this.logger.error(`[PERIODIC-SYNC] Error detecting new files in ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Recursively scan folder for supported files
   */
  private async scanFilesRecursively(folderPath: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);

        if (entry.isDirectory()) {
          // Skip .folder-mcp directory
          if (entry.name === '.folder-mcp') {
            continue;
          }

          // Recursively scan subdirectory
          const subFiles = await this.scanFilesRecursively(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Check if file has supported extension
          const ext = path.extname(fullPath).toLowerCase();
          if (this.supportedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }

      return files;
    } catch (error) {
      this.logger.warn(`[PERIODIC-SYNC] Error scanning directory ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Validate Vec0 table integrity and clean orphans
   */
  private async validateAndCleanVec0(folderPath: string, sqliteVecStorage: SQLiteVecStorage): Promise<void> {
    const dbPath = `${folderPath}/.folder-mcp/embeddings.db`;

    try {
      // Open database with Vec0 extension
      const db = new Database(dbPath);
      db.loadExtension(sqliteVec.getLoadablePath());

      // Check for orphan document embeddings
      const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
      const docEmbCount = db.prepare('SELECT COUNT(*) as count FROM document_embeddings').get() as { count: number };

      if (docEmbCount.count > docCount.count) {
        const orphanCount = docEmbCount.count - docCount.count;
        this.logger.warn(`[VEC0-CLEANUP] Found ${orphanCount} orphan document embeddings in ${folderPath}`);

        // Clean orphan document embeddings
        const cleaned = await this.cleanOrphanDocumentEmbeddings(db);
        this.logger.info(`[VEC0-CLEANUP] Cleaned ${cleaned} orphan document embeddings from ${folderPath}`);
      }

      // Check for orphan chunk embeddings
      const chunkCount = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
      const chunkEmbCount = db.prepare('SELECT COUNT(*) as count FROM chunk_embeddings').get() as { count: number };

      if (chunkEmbCount.count > chunkCount.count) {
        const orphanCount = chunkEmbCount.count - chunkCount.count;
        this.logger.warn(`[VEC0-CLEANUP] Found ${orphanCount} orphan chunk embeddings in ${folderPath}`);

        // Clean orphan chunk embeddings
        const cleaned = await this.cleanOrphanChunkEmbeddings(db);
        this.logger.info(`[VEC0-CLEANUP] Cleaned ${cleaned} orphan chunk embeddings from ${folderPath}`);
      }

      db.close();
    } catch (error) {
      this.logger.error(`[VEC0-CLEANUP] Error validating Vec0 for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Clean orphan document embeddings from Vec0 table
   */
  private async cleanOrphanDocumentEmbeddings(db: Database.Database): Promise<number> {
    try {
      // Find valid document IDs
      const validDocIds = db.prepare('SELECT id FROM documents').all() as { id: number }[];
      const validDocIdSet = new Set(validDocIds.map(d => d.id));

      // Find all document embedding rowids
      const allEmbeddings = db.prepare('SELECT rowid FROM document_embeddings').all() as { rowid: number }[];

      // Find orphans (rowids not in valid document IDs)
      const orphanRowids = allEmbeddings
        .map(e => e.rowid)
        .filter(rowid => !validDocIdSet.has(rowid));

      if (orphanRowids.length === 0) {
        return 0;
      }

      // Delete orphan embeddings
      const deleteStmt = db.prepare('DELETE FROM document_embeddings WHERE rowid = ?');
      const transaction = db.transaction(() => {
        for (const rowid of orphanRowids) {
          deleteStmt.run(rowid);
        }
      });

      transaction();
      return orphanRowids.length;
    } catch (error) {
      this.logger.error('[VEC0-CLEANUP] Error cleaning orphan document embeddings:', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * Clean orphan chunk embeddings from Vec0 table
   */
  private async cleanOrphanChunkEmbeddings(db: Database.Database): Promise<number> {
    try {
      // Find valid chunk IDs
      const validChunkIds = db.prepare('SELECT id FROM chunks').all() as { id: number }[];
      const validChunkIdSet = new Set(validChunkIds.map(c => c.id));

      // Find all chunk embeddings (chunk_id column contains the chunk ID)
      const allEmbeddings = db.prepare('SELECT chunk_id FROM chunk_embeddings').all() as { chunk_id: number }[];

      // Find orphans (chunk_ids not in valid chunk IDs)
      const orphanChunkIds = allEmbeddings
        .map(e => e.chunk_id)
        .filter(chunkId => !validChunkIdSet.has(chunkId));

      if (orphanChunkIds.length === 0) {
        return 0;
      }

      // Delete orphan embeddings
      const deleteStmt = db.prepare('DELETE FROM chunk_embeddings WHERE chunk_id = ?');
      const transaction = db.transaction(() => {
        for (const chunkId of orphanChunkIds) {
          deleteStmt.run(chunkId);
        }
      });

      transaction();
      return orphanChunkIds.length;
    } catch (error) {
      this.logger.error('[VEC0-CLEANUP] Error cleaning orphan chunk embeddings:', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }
}
