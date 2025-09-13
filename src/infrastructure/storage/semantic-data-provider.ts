/**
 * Semantic Data Provider
 *
 * SQLite implementation of semantic data provider interface.
 * Retrieves semantic metadata from the chunks table for folder aggregation.
 *
 * Sprint 1: Perfect list_folders Endpoint
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import path from 'path';
import type { ILoggingService } from '../../di/interfaces.js';
import type { ISemanticDataProvider, DocumentSemanticData } from '../../domain/search/semantic-aggregation.js';

/**
 * SQLite implementation of semantic data provider
 * Queries semantic metadata from the chunks table
 */
export class SqliteSemanticDataProvider implements ISemanticDataProvider {

  constructor(
    private readonly logger: ILoggingService,
    private readonly getFolderDatabase?: (folderPath: string) => Database.Database | null
  ) {}

  /**
   * Get semantic data for all documents matching the folder path pattern
   *
   * Queries the chunks table for semantic metadata:
   * - topics (JSON array)
   * - key_phrases (JSON array)
   * - readability_score (float)
   *
   * Performance: Uses indexed queries on file_path patterns
   */
  async getDocumentSemanticData(folderPathPattern: string): Promise<DocumentSemanticData[]> {
    const startTime = Date.now();

    try {
      this.logger.debug('Querying semantic data', { folderPathPattern });

      // Extract base folder path from pattern
      const baseFolderPath = folderPathPattern.replace('/%', '');

      // Get database connection for this folder
      const db = this.getDatabaseForFolder(baseFolderPath);
      if (!db) {
        this.logger.warn('No database found for folder', { baseFolderPath });
        return [];
      }

      // Query semantic data from chunks table with document join
      const query = `
        SELECT
          c.topics,
          c.key_phrases,
          c.readability_score
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE d.file_path LIKE ?
          AND c.semantic_processed = 1
          AND c.topics IS NOT NULL
          AND c.readability_score IS NOT NULL
      `;

      this.logger.debug('Executing semantic data query', {
        query,
        pattern: folderPathPattern
      });

      const stmt = db.prepare(query);
      const rows = stmt.all(folderPathPattern) as any[];

      this.logger.debug('Query executed successfully', {
        rowCount: rows.length,
        duration: Date.now() - startTime
      });

      // Map database rows to DocumentSemanticData
      const results: DocumentSemanticData[] = rows.map((row: any) => ({
        topics: row.topics || '[]',
        key_phrases: row.key_phrases || '[]',
        readability_score: row.readability_score || 0
      }));

      const duration = Date.now() - startTime;
      this.logger.debug('Semantic data retrieval completed', {
        folderPathPattern,
        resultCount: results.length,
        duration
      });

      // Performance warning if over 50ms
      if (duration > 50) {
        this.logger.warn('Semantic data query slow', {
          folderPathPattern,
          duration,
          resultCount: results.length
        });
      }

      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to get semantic data', error as Error, {
        folderPathPattern,
        duration
      });

      // Fail fast - don't return empty fallback
      throw new Error(`Failed to get semantic data for pattern ${folderPathPattern}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all direct subfolder names under a parent path
   *
   * Extracts subfolder names from document file paths
   * Only returns direct children, not grandchildren
   */
  async getDirectSubfolderNames(parentPath: string): Promise<string[]> {
    const startTime = Date.now();

    try {
      this.logger.debug('Getting direct subfolders', { parentPath });

      // Get database connection for this folder
      const db = this.getDatabaseForFolder(parentPath);
      if (!db) {
        this.logger.warn('No database found for folder', { parentPath });
        return [];
      }

      // Query to extract direct subfolder names from file paths
      const query = `
        WITH path_analysis AS (
          SELECT DISTINCT
            CASE
              WHEN file_path LIKE ? || '/%' AND file_path NOT LIKE ? || '/%/%'
              THEN SUBSTR(file_path, LENGTH(?) + 2, INSTR(SUBSTR(file_path, LENGTH(?) + 2), '/') - 1)
              ELSE NULL
            END as subfolder_name
          FROM documents
          WHERE file_path LIKE ? || '/%'
        )
        SELECT subfolder_name
        FROM path_analysis
        WHERE subfolder_name IS NOT NULL
          AND subfolder_name != ''
        ORDER BY subfolder_name
      `;

      const childrenPattern = `${parentPath}/%`;
      const grandchildrenPattern = `${parentPath}/%/%`;

      this.logger.debug('Executing subfolder query', {
        query,
        parentPath,
        childrenPattern
      });

      const stmt = db.prepare(query);
      const rows = stmt.all(
        parentPath,      // First ? - for checking children pattern
        parentPath,      // Second ? - for checking grandchildren pattern
        parentPath,      // Third ? - for SUBSTR length calculation
        parentPath,      // Fourth ? - for SUBSTR length calculation
        parentPath       // Fifth ? - for WHERE clause pattern
      ) as any[];

      const subfolderNames = rows
        .map((row: any) => row.subfolder_name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0);

      const duration = Date.now() - startTime;
      this.logger.debug('Subfolder names retrieved', {
        parentPath,
        subfolderCount: subfolderNames.length,
        subfolders: subfolderNames,
        duration
      });

      return subfolderNames;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to get subfolder names', error as Error, {
        parentPath,
        duration
      });

      // Return empty array instead of failing - this is not critical
      this.logger.warn('Returning empty subfolder list due to error', { parentPath });
      return [];
    }
  }

  /**
   * Get database connection for a folder
   * Uses either injected database provider or direct file path
   */
  private getDatabaseForFolder(folderPath: string): Database.Database | null {
    try {
      // If we have a database provider function, use it
      if (this.getFolderDatabase) {
        return this.getFolderDatabase(folderPath);
      }

      // Fallback: direct database file access
      const dbPath = path.join(folderPath, '.folder-mcp', 'embeddings.db');

      if (!existsSync(dbPath)) {
        this.logger.debug('Database file does not exist', { dbPath });
        return null;
      }

      // Open database connection
      const db = new Database(dbPath, { readonly: true });

      // Verify database has required tables
      const tablesQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('documents', 'chunks')";
      const tables = db.prepare(tablesQuery).all();

      if (tables.length < 2) {
        this.logger.warn('Database missing required tables', {
          dbPath,
          foundTables: tables.map((t: any) => t.name)
        });
        db.close();
        return null;
      }

      return db;

    } catch (error) {
      this.logger.error('Failed to get database for folder', error as Error, { folderPath });
      return null;
    }
  }
}