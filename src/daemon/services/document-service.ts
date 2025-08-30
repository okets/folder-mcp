/**
 * Document Service for REST API
 * Sprint 5: Document listing and metadata operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentInfo, FolderContext, PaginationInfo } from '../rest/types.js';
// Simple logger interface for REST operations
interface SimpleLogger {
  debug: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
}

export interface DocumentListParams {
  limit?: number;
  offset?: number;
  sort?: 'name' | 'modified' | 'size' | 'type';
  order?: 'asc' | 'desc';
  type?: string;
}

export interface DocumentListResult {
  folderContext: FolderContext;
  documents: DocumentInfo[];
  pagination: PaginationInfo;
}

/**
 * Service for document operations and metadata
 */
export class DocumentService {
  constructor(private logger: SimpleLogger) {}

  /**
   * List documents in a folder with pagination and filtering
   */
  async listDocuments(
    folderPath: string, 
    folderId: string,
    folderName: string,
    model: string,
    status: string,
    params: DocumentListParams = {}
  ): Promise<DocumentListResult> {
    const {
      limit = 50,
      offset = 0,
      sort = 'name',
      order = 'asc',
      type
    } = params;

    this.logger.debug(`[DOC-SERVICE] Listing documents in ${folderPath}`);

    // Check if folder exists and is accessible
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${folderPath}`);
    }

    // Get all files recursively
    const allFiles = await this.getAllFiles(folderPath);
    
    // Filter by supported file types
    const supportedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.md'];
    let filteredFiles = allFiles.filter(file => {
      const ext = path.extname(file.path).toLowerCase();
      return supportedExtensions.includes(ext);
    });

    // Apply type filter if specified
    if (type) {
      filteredFiles = filteredFiles.filter(file => {
        const ext = path.extname(file.path).toLowerCase().substring(1);
        return ext === type.toLowerCase();
      });
    }

    // Sort files
    filteredFiles.sort((a, b) => {
      let comparison = 0;
      
      switch (sort) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'modified':
          comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = path.extname(a.path).localeCompare(path.extname(b.path));
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return order === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const total = filteredFiles.length;
    const paginatedFiles = filteredFiles.slice(offset, offset + limit);

    // Convert to DocumentInfo format
    const documents: DocumentInfo[] = paginatedFiles.map(file => ({
      id: this.generateDocumentId(file.path),
      name: file.name,
      path: file.relativePath,
      type: path.extname(file.path).toLowerCase().substring(1),
      size: file.size,
      modified: file.modified,
      indexed: false, // TODO: Check actual indexing status from database
      metadata: this.getFileMetadata(file.path, file.stats)
    }));

    const folderContext: FolderContext = {
      id: folderId,
      name: folderName,
      path: folderPath,
      model: model,
      status: status
    };

    const pagination: PaginationInfo = {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };

    this.logger.debug(`[DOC-SERVICE] Found ${total} documents, returning ${documents.length}`);

    return {
      folderContext,
      documents,
      pagination
    };
  }

  /**
   * Get all files recursively from a directory
   */
  private async getAllFiles(dirPath: string): Promise<Array<{
    path: string;
    relativePath: string;
    name: string;
    size: number;
    modified: string;
    stats: fs.Stats;
  }>> {
    const files: Array<{
      path: string;
      relativePath: string;
      name: string;
      size: number;
      modified: string;
      stats: fs.Stats;
    }> = [];

    const walkDir = async (currentPath: string) => {
      try {
        const items = await fs.promises.readdir(currentPath);

        for (const item of items) {
          const fullPath = path.join(currentPath, item);

          // Skip hidden files and directories
          if (item.startsWith('.')) {
            continue;
          }

          // Skip common directories we don't want to index
          const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
          if (skipDirs.includes(item)) {
            continue;
          }

          try {
            const stats = await fs.promises.stat(fullPath);

            if (stats.isDirectory()) {
              await walkDir(fullPath);
            } else if (stats.isFile()) {
              const relativePath = path.relative(dirPath, fullPath);
              files.push({
                path: fullPath,
                relativePath,
                name: item,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                stats
              });
            }
          } catch (statError) {
            this.logger.warn(`[DOC-SERVICE] Could not stat ${fullPath}:`, statError);
            // Continue with other files
          }
        }
      } catch (readError) {
        this.logger.warn(`[DOC-SERVICE] Could not read directory ${currentPath}:`, readError);
      }
    };

    await walkDir(dirPath);
    return files;
  }

  /**
   * Generate a document ID from file path
   */
  private generateDocumentId(filePath: string): string {
    const basename = path.basename(filePath);
    return basename
      .toLowerCase()
      .replace(/[^a-z0-9\-_.]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get file type-specific metadata
   */
  private getFileMetadata(filePath: string, stats: fs.Stats): any {
    const ext = path.extname(filePath).toLowerCase();
    const metadata: any = {};
    
    // For now, just return basic metadata
    // In the future, we could parse file contents for more specific metadata
    switch (ext) {
      case '.pdf':
        // TODO: Extract PDF page count
        break;
      case '.docx':
        // TODO: Extract word count
        break;
      case '.xlsx':
        // TODO: Extract sheet count
        break;
      case '.pptx':
        // TODO: Extract slide count
        break;
      default:
        // Basic text files
        break;
    }
    
    return metadata;
  }

  /**
   * Resolve folder ID to actual folder path from FMDM
   */
  static resolveFolderPath(folderId: string, folders: any[]): { path: string; folder: any } | null {
    // Find folder by generating ID from each path and comparing
    for (const folder of folders) {
      const generatedId = DocumentService.generateFolderId(folder.path);
      if (generatedId === folderId) {
        return { path: folder.path, folder };
      }
    }
    return null;
  }

  /**
   * Generate folder ID from path (same logic as in REST server)
   */
  static generateFolderId(folderPath: string): string {
    const pathParts = folderPath.split(/[/\\]/);
    const lastPart = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || 'unknown';
    
    return lastPart
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}