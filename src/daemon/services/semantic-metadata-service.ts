/**
 * Semantic Metadata Service
 * Provides aggregated semantic metadata for folders and documents
 * Sprint 10: Semantic Enhancement
 */

import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// Simple logger interface
interface ILogger {
  debug(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}

export interface FolderSemanticMetadata {
  dominantThemes: string[];
  contentComplexity: string;
  languageDistribution: Record<string, number>;
  lastSemanticUpdate: string;
  avgReadabilityScore: number;
  keyPhrases: string[];
  totalChunks: number;
  totalDocuments: number;
}

export interface DocumentSemanticSummary {
  primaryPurpose: string;
  keyPhrases: string[];
  contentType: string;
  complexityLevel: string;
  hasCodeExamples: boolean;
  hasDiagrams: boolean;
}

export interface SectionSemantics {
  keyPhrases: string[];
  hasCodeExamples: boolean;
  subsectionCount: number;
  codeLanguages?: string[];
}

export class SemanticMetadataService {
  private db: Database | null = null;
  private logger: ILogger;
  private dbPath: string;

  constructor(logger: ILogger, dbPath?: string) {
    this.logger = logger;
    // Use the provided database path or default to the project-specific one
    this.dbPath = dbPath || path.join(process.cwd(), '.folder-mcp', 'embeddings.db');
  }

  /**
   * Connect to the embeddings database
   */
  private async connectDb(): Promise<Database> {
    if (this.db) return this.db;

    if (!fs.existsSync(this.dbPath)) {
      throw new Error(`Embeddings database not found at ${this.dbPath}`);
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err: Error | null) => {
        if (err) {
          this.logger.error('Failed to connect to embeddings database', err);
          reject(err);
        } else {
          this.logger.debug('Connected to embeddings database');
          resolve(this.db!);
        }
      });
    });
  }

  /**
   * Get aggregated semantic metadata for a folder
   */
  async getFolderSemanticMetadata(folderPath: string): Promise<FolderSemanticMetadata | null> {
    try {
      const db = await this.connectDb();
      
      // Get basic stats
      const stats = await this.runQuery<{
        doc_count: number;
        chunk_count: number;
        avg_readability: number;
      }>(db, `
        SELECT 
          COUNT(DISTINCT d.id) as doc_count,
          COUNT(c.id) as chunk_count,
          AVG(c.readability_score) as avg_readability
        FROM documents d
        JOIN chunks c ON c.document_id = d.id
        WHERE d.file_path LIKE ? || '%'
      `, [folderPath]);

      if (!stats || stats.doc_count === 0) {
        return null;
      }

      // Get key phrases from chunks (simpler approach)
      const keyPhrasesRaw = await this.runQueryAll<{ key_phrases: string }>(db, `
        SELECT c.key_phrases
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE d.file_path LIKE ? || '%'
          AND d.file_path NOT LIKE '%test%'
          AND d.file_path NOT LIKE '%.venv%'
          AND c.key_phrases IS NOT NULL
          AND c.key_phrases != '[]'
        LIMIT 100
      `, [folderPath]);
      
      // Process key phrases in JavaScript
      const phraseCount = new Map<string, number>();
      for (const row of keyPhrasesRaw) {
        try {
          const phrases = JSON.parse(row.key_phrases);
          for (const phrase of phrases) {
            // Handle both old format (strings) and new format (SemanticScore objects)
            const phraseText = typeof phrase === 'string' ? phrase : phrase.text;
            phraseCount.set(phraseText, (phraseCount.get(phraseText) || 0) + 1);
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
      
      // Sort and get top phrases
      const keyPhrases = Array.from(phraseCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([phrase]) => ({ phrase }));


      // Determine complexity based on readability score
      const avgReadability = stats.avg_readability || 50;
      let complexity = 'Intermediate';
      if (avgReadability < 30) complexity = 'Advanced/Technical';
      else if (avgReadability < 50) complexity = 'Intermediate';
      else complexity = 'Basic';

      return {
        dominantThemes: this.extractThemes(keyPhrases.map(k => k.phrase)),
        contentComplexity: complexity,
        languageDistribution: { 'English': 100 }, // Simplified for now
        lastSemanticUpdate: new Date().toISOString(),
        avgReadabilityScore: Math.round(avgReadability * 10) / 10,
        keyPhrases: keyPhrases.map(k => k.phrase).filter(Boolean).slice(0, 8),
        totalChunks: stats.chunk_count,
        totalDocuments: stats.doc_count
      };
    } catch (error) {
      this.logger.error('Failed to get folder semantic metadata', error as Error);
      return null;
    }
  }

  /**
   * Get semantic summary for a document
   */
  async getDocumentSemanticSummary(filePath: string): Promise<DocumentSemanticSummary | null> {
    try {
      const db = await this.connectDb();
      
      // Get document chunks
      const chunks = await this.runQueryAll<{
        content: string;
        key_phrases: string;
        readability_score: number;
      }>(db, `
        SELECT c.content, c.key_phrases, c.readability_score
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE d.file_path = ?
        LIMIT 10
      `, [filePath]);

      if (!chunks || chunks.length === 0) {
        return null;
      }

      // Aggregate data
      const allKeyPhrases: string[] = [];
      let totalReadability = 0;
      let hasCode = false;

      for (const chunk of chunks) {
        if (chunk.key_phrases) {
          try {
            const phrases = JSON.parse(chunk.key_phrases);
            allKeyPhrases.push(...phrases);
          } catch {}
        }

        totalReadability += chunk.readability_score || 0;

        if (chunk.content && /```|function|class|const|let|var/.test(chunk.content)) {
          hasCode = true;
        }
      }

      const avgReadability = totalReadability / chunks.length;

      // Determine content type and purpose
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'document';
      let primaryPurpose = 'General documentation';

      if (['.ts', '.js', '.py', '.java'].includes(ext)) {
        contentType = 'source code';
        primaryPurpose = 'Implementation code';
      } else if (['.md', '.txt'].includes(ext)) {
        contentType = 'documentation';
        if (filePath.includes('README')) {
          primaryPurpose = 'Project overview and setup instructions';
        } else if (filePath.includes('test')) {
          primaryPurpose = 'Test documentation';
        }
      } else if (['.json', '.yaml', '.yml'].includes(ext)) {
        contentType = 'configuration';
        primaryPurpose = 'Configuration settings';
      }

      // Get unique key phrases
      const uniqueKeyPhrases = [...new Set(allKeyPhrases)].slice(0, 8);

      return {
        primaryPurpose,
        keyPhrases: uniqueKeyPhrases,
        contentType,
        complexityLevel: avgReadability < 30 ? 'Advanced' : avgReadability < 50 ? 'Intermediate' : 'Basic',
        hasCodeExamples: hasCode,
        hasDiagrams: false // Would need more sophisticated detection
      };
    } catch (error) {
      this.logger.error('Failed to get document semantic summary', error as Error);
      return null;
    }
  }

  /**
   * Extract themes from key phrases
   */
  private extractThemes(keyPhrases: string[]): string[] {
    const themes = new Map<string, number>();
    
    // Theme detection patterns
    const themePatterns = {
      'software architecture': /architect|design|pattern|structure|system/i,
      'API design': /api|endpoint|rest|service|interface/i,
      'semantic search': /semantic|search|embedding|vector|similarity/i,
      'testing': /test|spec|mock|fixture|coverage/i,
      'configuration': /config|setting|option|environment|setup/i,
      'documentation': /doc|readme|guide|tutorial|help/i,
      'database': /database|sql|query|table|schema/i,
      'performance': /performance|optimize|speed|cache|efficiency/i
    };

    for (const phrase of keyPhrases) {
      for (const [theme, pattern] of Object.entries(themePatterns)) {
        if (pattern.test(phrase)) {
          themes.set(theme, (themes.get(theme) || 0) + 1);
        }
      }
    }

    // Sort by frequency and return top themes
    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme]) => theme);
  }

  /**
   * Run a single query that returns one row
   */
  private runQuery<T>(db: Database, sql: string, params: any[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err: Error | null, row: T) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Run a query that returns multiple rows
   */
  private runQueryAll<T>(db: Database, sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err: Error | null, rows: T[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Get chunks with semantic data for section mapping
   * Returns all chunks for a document with their positions and semantic data
   */
  async getDocumentChunksForSections(documentPath: string): Promise<Array<{
    start_offset: number;
    end_offset: number;
    keyPhrases: string[];
    hasCode: boolean;
  }> | null> {
    try {
      const db = await this.connectDb();
      
      // Query all chunks for the document with their semantic data
      const chunks = await this.runQueryAll<{
        start_offset: number;
        end_offset: number;
        key_phrases: string | null;
        content: string;
      }>(db, `
        SELECT
          c.start_offset,
          c.end_offset,
          c.key_phrases,
          c.content
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE d.file_path = ?
        ORDER BY c.start_offset
      `, [documentPath]);

      if (!chunks || chunks.length === 0) {
        this.logger.debug(`No chunks found for document: ${documentPath}`);
        return null;
      }

      // Process and return chunks with parsed JSON fields
      return chunks.map(chunk => {
        let keyPhrases: string[] = [];

        try {
          if (chunk.key_phrases) {
            keyPhrases = JSON.parse(chunk.key_phrases);
          }
        } catch (e) {
          // Skip malformed JSON
        }

        // Detect if chunk contains code
        const hasCode = /```|<code>|function\s+\w+|class\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+/.test(chunk.content);

        return {
          start_offset: chunk.start_offset,
          end_offset: chunk.end_offset,
          keyPhrases,
          hasCode
        };
      });
    } catch (error) {
      this.logger.error('Failed to get document chunks for sections', error as Error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err: Error | null) => {
          if (err) {
            this.logger.error('Error closing database', err);
            reject(err);
          } else {
            this.db = null;
            resolve();
          }
        });
      });
    }
  }
}