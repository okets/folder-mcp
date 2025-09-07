/**
 * Indexing Tracker Service
 * 
 * Provides simple tracking of document indexing status by checking
 * the SQLite database for each folder.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

interface SimpleLogger {
  debug: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

export class IndexingTracker {
  private databases: Map<string, Database.Database> = new Map();
  
  constructor(private logger: SimpleLogger) {}

  /**
   * Check if a document is indexed in the database
   * @param folderPath The folder path containing the document
   * @param documentPath The relative path of the document within the folder
   * @returns true if document is indexed, false otherwise
   */
  async isDocumentIndexed(folderPath: string, documentPath: string): Promise<boolean> {
    try {
      const db = this.getOrOpenDatabase(folderPath);
      if (!db) return false;
      
      // Construct the full file path as stored in the database
      const fullPath = path.join(folderPath, documentPath);
      
      // Query to check if document exists in the database
      const stmt = db.prepare('SELECT 1 FROM documents WHERE file_path = ? LIMIT 1');
      const result = stmt.get(fullPath);
      
      return !!result;
    } catch (error) {
      this.logger.debug(`[INDEXING-TRACKER] Error checking document index status: ${error}`);
      return false;
    }
  }

  /**
   * Get indexing status for multiple documents
   * @param folderPath The folder path
   * @param documentPaths Array of relative document paths
   * @returns Map of document path to indexing status
   */
  async getDocumentsIndexingStatus(
    folderPath: string, 
    documentPaths: string[]
  ): Promise<Map<string, boolean>> {
    const statusMap = new Map<string, boolean>();
    
    try {
      const db = this.getOrOpenDatabase(folderPath);
      if (!db) {
        // If no database, all documents are not indexed
        documentPaths.forEach(doc => statusMap.set(doc, false));
        return statusMap;
      }
      
      // Batch query for all documents
      const placeholders = documentPaths.map(() => '?').join(',');
      const fullPaths = documentPaths.map(doc => path.join(folderPath, doc));
      
      const query = `SELECT file_path FROM documents WHERE file_path IN (${placeholders})`;
      const stmt = db.prepare(query);
      const results = stmt.all(...fullPaths) as Array<{ file_path: string }>;
      
      // Create set of indexed paths for fast lookup
      const indexedPaths = new Set(results.map(r => r.file_path));
      
      // Map each document to its status
      documentPaths.forEach(doc => {
        const fullPath = path.join(folderPath, doc);
        statusMap.set(doc, indexedPaths.has(fullPath));
      });
      
      return statusMap;
    } catch (error) {
      this.logger.error(`[INDEXING-TRACKER] Error getting documents status: ${error}`);
      // On error, assume all documents are not indexed
      documentPaths.forEach(doc => statusMap.set(doc, false));
      return statusMap;
    }
  }

  /**
   * Get or open a database connection for a folder
   */
  private getOrOpenDatabase(folderPath: string): Database.Database | null {
    // Check if we already have a connection
    let db = this.databases.get(folderPath);
    if (db) return db;
    
    // Construct database path
    const dbPath = path.join(folderPath, '.folder-mcp', 'embeddings.db');
    
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      this.logger.debug(`[INDEXING-TRACKER] No database found at ${dbPath}`);
      return null;
    }
    
    try {
      // Open database in readonly mode for safety
      db = new Database(dbPath, { readonly: true });
      this.databases.set(folderPath, db);
      return db;
    } catch (error) {
      this.logger.error(`[INDEXING-TRACKER] Failed to open database: ${error}`);
      return null;
    }
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    for (const [path, db] of this.databases.entries()) {
      try {
        db.close();
        this.logger.debug(`[INDEXING-TRACKER] Closed database for ${path}`);
      } catch (error) {
        this.logger.error(`[INDEXING-TRACKER] Error closing database: ${error}`);
      }
    }
    this.databases.clear();
  }

  /**
   * Get statistics for a folder's indexing
   */
  async getFolderStats(folderPath: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    databaseExists: boolean;
  } | null> {
    try {
      const db = this.getOrOpenDatabase(folderPath);
      if (!db) {
        return {
          totalDocuments: 0,
          totalChunks: 0,
          databaseExists: false
        };
      }
      
      const docCountStmt = db.prepare('SELECT COUNT(*) as count FROM documents');
      const chunkCountStmt = db.prepare('SELECT COUNT(*) as count FROM chunks');
      
      const docCount = (docCountStmt.get() as any)?.count || 0;
      const chunkCount = (chunkCountStmt.get() as any)?.count || 0;
      
      return {
        totalDocuments: docCount,
        totalChunks: chunkCount,
        databaseExists: true
      };
    } catch (error) {
      this.logger.error(`[INDEXING-TRACKER] Error getting folder stats: ${error}`);
      return null;
    }
  }
}