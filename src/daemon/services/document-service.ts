/**
 * Document Service for REST API
 * Sprint 5: Document listing and metadata operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentInfo, FolderContext, PaginationInfo, DocumentData, DocumentDataResponse, DocumentOutline, DocumentOutlineResponse } from '../rest/types.js';
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
   * Get full document data including content (Sprint 6)
   */
  async getDocumentData(
    folderPath: string,
    folderId: string,
    folderName: string,
    model: string,
    status: string,
    docId: string
  ): Promise<DocumentDataResponse> {
    this.logger.debug(`[DOC-SERVICE] Getting document data for ${docId} in ${folderPath}`);

    // Resolve document path from doc ID
    const docPath = await this.resolveDocumentPath(folderPath, docId);
    if (!docPath) {
      throw new Error(`Document '${docId}' not found in folder '${folderId}'`);
    }

    // Check if document exists and is accessible
    if (!fs.existsSync(docPath)) {
      throw new Error(`Document file not found: ${docPath}`);
    }

    const stats = fs.statSync(docPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${docPath}`);
    }

    // Get file extension
    const ext = path.extname(docPath).toLowerCase();
    const supportedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.md'];
    
    if (!supportedExtensions.includes(ext)) {
      throw new Error(`File type not supported: ${ext}`);
    }

    // Read document content based on file type
    let content: string = '';
    let metadata: any = {};

    try {
      switch (ext) {
        case '.txt':
        case '.md':
          content = await fs.promises.readFile(docPath, 'utf-8');
          metadata = this.getTextMetadata(content);
          break;
        case '.pdf':
          // For now, return placeholder content
          // TODO: Implement PDF text extraction
          content = `[PDF Document: ${path.basename(docPath)}]\nPages: ${metadata.pageCount || 'Unknown'}\nContent extraction not yet implemented.`;
          metadata = { pageCount: 0 }; // TODO: Extract actual page count
          break;
        case '.docx':
          // For now, return placeholder content
          // TODO: Implement DOCX text extraction
          content = `[Word Document: ${path.basename(docPath)}]\nContent extraction not yet implemented.`;
          metadata = { wordCount: 0 }; // TODO: Extract actual word count
          break;
        case '.xlsx':
          // For now, return placeholder content  
          // TODO: Implement Excel data extraction
          content = `[Excel Spreadsheet: ${path.basename(docPath)}]\nContent extraction not yet implemented.`;
          metadata = { sheetCount: 1 }; // TODO: Extract actual sheet count
          break;
        case '.pptx':
          // For now, return placeholder content
          // TODO: Implement PowerPoint extraction
          content = `[PowerPoint Presentation: ${path.basename(docPath)}]\nContent extraction not yet implemented.`;
          metadata = { slideCount: 0 }; // TODO: Extract actual slide count
          break;
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      this.logger.warn(`[DOC-SERVICE] Error reading document ${docPath}:`, error);
      throw new Error(`Failed to read document content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const document: DocumentData = {
      id: docId,
      name: path.basename(docPath),
      type: ext.substring(1),
      size: stats.size,
      content: content,
      metadata: {
        ...metadata,
        lastModified: stats.mtime.toISOString()
      }
    };

    const folderContext: FolderContext = {
      id: folderId,
      name: folderName,
      path: folderPath,
      model: model,
      status: status
    };

    this.logger.debug(`[DOC-SERVICE] Returning document data for ${docId}, content length: ${content.length}`);

    return {
      folderContext,
      document
    };
  }

  /**
   * Get document outline/structure (Sprint 6)
   */
  async getDocumentOutline(
    folderPath: string,
    folderId: string,
    folderName: string,
    model: string,
    status: string,
    docId: string
  ): Promise<DocumentOutlineResponse> {
    this.logger.debug(`[DOC-SERVICE] Getting document outline for ${docId} in ${folderPath}`);

    // Resolve document path from doc ID
    const docPath = await this.resolveDocumentPath(folderPath, docId);
    if (!docPath) {
      throw new Error(`Document '${docId}' not found in folder '${folderId}'`);
    }

    // Check if document exists and is accessible
    if (!fs.existsSync(docPath)) {
      throw new Error(`Document file not found: ${docPath}`);
    }

    const stats = fs.statSync(docPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${docPath}`);
    }

    // Get file extension
    const ext = path.extname(docPath).toLowerCase();
    const supportedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.md'];
    
    if (!supportedExtensions.includes(ext)) {
      throw new Error(`File type not supported: ${ext}`);
    }

    // Generate outline based on file type
    let outline: DocumentOutline;

    try {
      switch (ext) {
        case '.txt':
        case '.md':
          outline = await this.getTextOutline(docPath);
          break;
        case '.pdf':
          outline = await this.getPDFOutline(docPath);
          break;
        case '.docx':
          outline = await this.getDocxOutline(docPath);
          break;
        case '.xlsx':
          outline = await this.getExcelOutline(docPath);
          break;
        case '.pptx':
          outline = await this.getPowerPointOutline(docPath);
          break;
        default:
          throw new Error(`Unsupported file type for outline: ${ext}`);
      }
    } catch (error) {
      this.logger.warn(`[DOC-SERVICE] Error generating outline for ${docPath}:`, error);
      throw new Error(`Failed to generate document outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const folderContext: FolderContext = {
      id: folderId,
      name: folderName,
      path: folderPath,
      model: model,
      status: status
    };

    this.logger.debug(`[DOC-SERVICE] Returning document outline for ${docId}, type: ${outline.type}`);

    return {
      folderContext,
      outline
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

  /**
   * Resolve document ID to actual file path (Sprint 6)
   */
  private async resolveDocumentPath(folderPath: string, docId: string): Promise<string | null> {
    // Get all files in the folder
    const allFiles = await this.getAllFiles(folderPath);
    
    // Try to find file by ID (generated from filename)
    for (const file of allFiles) {
      const generatedId = this.generateDocumentId(file.path);
      if (generatedId === docId) {
        return file.path;
      }
      
      // Also try exact filename match (without extension processing)
      if (file.name === docId || path.basename(file.path, path.extname(file.path)) === docId) {
        return file.path;
      }
    }
    
    return null;
  }

  /**
   * Get text document metadata
   */
  private getTextMetadata(content: string): any {
    const lines = content.split('\n');
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const chars = content.length;
    
    return {
      wordCount: words.length,
      charCount: chars,
      lineCount: lines.length
    };
  }

  /**
   * Generate text document outline
   */
  private async getTextOutline(filePath: string): Promise<DocumentOutline> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const headings: Array<{ level: number; title: string; lineNumber: number }> = [];
    
    // For Markdown files, extract headings
    if (path.extname(filePath).toLowerCase() === '.md') {
      lines.forEach((line, index) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match && match[1] && match[2]) {
          headings.push({
            level: match[1].length,
            title: match[2].trim(),
            lineNumber: index + 1
          });
        }
      });
    } else {
      // For plain text, look for lines that might be headings (all caps, etc.)
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.length > 0 && trimmed.length < 100) {
          // Simple heuristic: if line is short and has capital letters
          if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
            headings.push({
              level: 1,
              title: trimmed,
              lineNumber: index + 1
            });
          }
        }
      });
    }
    
    return {
      type: 'text',
      totalItems: headings.length,
      headings: headings
    };
  }

  /**
   * Generate PDF outline (placeholder implementation)
   */
  private async getPDFOutline(filePath: string): Promise<DocumentOutline> {
    // TODO: Implement actual PDF parsing
    // For now, return placeholder structure
    const stats = fs.statSync(filePath);
    const estimatedPages = Math.max(1, Math.floor(stats.size / 50000)); // Rough estimate
    
    const pages = Array.from({ length: estimatedPages }, (_, i) => ({
      pageNumber: i + 1,
      title: `Page ${i + 1}`,
      content: `[Content of page ${i + 1}]`
    }));
    
    return {
      type: 'pdf',
      totalItems: estimatedPages,
      pages: pages
    };
  }

  /**
   * Generate Word document outline (placeholder implementation)
   */
  private async getDocxOutline(filePath: string): Promise<DocumentOutline> {
    // TODO: Implement actual DOCX parsing
    // For now, return placeholder structure
    return {
      type: 'docx',
      totalItems: 1,
      sections: [
        {
          level: 1,
          title: path.basename(filePath, '.docx'),
          pageNumber: 1
        }
      ]
    };
  }

  /**
   * Generate Excel outline (placeholder implementation)
   */
  private async getExcelOutline(filePath: string): Promise<DocumentOutline> {
    // TODO: Implement actual Excel parsing
    // For now, return placeholder structure
    return {
      type: 'xlsx',
      totalItems: 1,
      sheets: [
        {
          sheetIndex: 0,
          name: 'Sheet1',
          rowCount: 100,
          columnCount: 10
        }
      ]
    };
  }

  /**
   * Generate PowerPoint outline (placeholder implementation)
   */
  private async getPowerPointOutline(filePath: string): Promise<DocumentOutline> {
    // TODO: Implement actual PowerPoint parsing
    // For now, return placeholder structure
    const stats = fs.statSync(filePath);
    const estimatedSlides = Math.max(1, Math.floor(stats.size / 100000)); // Rough estimate
    
    const slides = Array.from({ length: estimatedSlides }, (_, i) => ({
      slideNumber: i + 1,
      title: `Slide ${i + 1}`,
      notes: `[Notes for slide ${i + 1}]`
    }));
    
    return {
      type: 'pptx',
      totalItems: estimatedSlides,
      slides: slides
    };
  }
}