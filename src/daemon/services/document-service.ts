/**
 * Document Service for REST API
 * Sprint 5: Document listing and metadata operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentInfo, FolderContext, PaginationInfo, DocumentData, DocumentDataResponse, DocumentOutline, DocumentOutlineResponse } from '../rest/types.js';
import { IndexingTracker } from './indexing-tracker.js';
import { PathNormalizer } from '../utils/path-normalizer.js';
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import xml2js from 'xml2js';

// Simple logger interface for REST operations
interface SimpleLogger {
  debug: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
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
// Helper interface for parsed PPTX data
interface ParsedSlide {
  slideNumber: number;
  content: string;
  title?: string;
  notes?: string;
}

export class DocumentService {
  private indexingTracker: IndexingTracker;
  private xmlParser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
  
  constructor(private logger: SimpleLogger) {
    this.indexingTracker = new IndexingTracker(logger);
  }

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

    // Get indexing status for all paginated files
    const relativePaths = paginatedFiles.map(file => file.relativePath);
    const indexingStatusMap = await this.indexingTracker.getDocumentsIndexingStatus(
      folderPath,
      relativePaths
    );

    // Convert to DocumentInfo format with real indexing status
    const documents: DocumentInfo[] = paginatedFiles.map(file => ({
      id: this.generateDocumentId(file.relativePath),  // Use relative path for ID generation
      name: file.name,
      path: file.relativePath,
      type: path.extname(file.path).toLowerCase().substring(1),
      size: file.size,
      modified: file.modified,
      indexed: indexingStatusMap.get(file.relativePath) || false,
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
          // Extract text from PDF using pdf-parse
          try {
            const pdfBuffer = await fs.promises.readFile(docPath);
            const pdfData = await pdfParse(pdfBuffer);
            content = pdfData.text;
            metadata = {
              pageCount: pdfData.numpages,
              info: pdfData.info,
              metadata: pdfData.metadata
            };
          } catch (pdfError) {
            this.logger.error(`[DOC-SERVICE] Failed to extract PDF content from ${docPath}: ${pdfError}`);
            throw new Error(`Failed to extract PDF content: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`);
          }
          break;
        case '.docx':
          // Extract text from Word document using mammoth
          try {
            const docBuffer = await fs.promises.readFile(docPath);
            const result = await mammoth.extractRawText({ buffer: docBuffer });
            content = result.value;
            
            // Count words in the extracted text
            const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
            
            // Extract messages/warnings if any
            const messages = result.messages || [];
            metadata = {
              wordCount: wordCount,
              messages: messages.length > 0 ? messages : undefined
            };
          } catch (docxError) {
            this.logger.error(`[DOC-SERVICE] Failed to extract Word document content from ${docPath}: ${docxError}`);
            throw new Error(`Failed to extract Word document content: ${docxError instanceof Error ? docxError.message : String(docxError)}`);
          }
          break;
        case '.xlsx':
          // Extract data from Excel using xlsx library
          try {
            const workbook = XLSX.readFile(docPath);
            const sheetNames = workbook.SheetNames;
            
            // Convert all sheets to CSV format for text representation
            let fullContent = '';
            sheetNames.forEach((sheetName) => {
              const worksheet = workbook.Sheets[sheetName];
              if (worksheet) {
                const csvContent = XLSX.utils.sheet_to_csv(worksheet);
                fullContent += `Sheet: ${sheetName}\n${csvContent}\n\n`;
              }
            });
            
            content = fullContent;
            metadata = {
              sheetCount: sheetNames.length,
              sheetNames: sheetNames
            };
          } catch (xlsxError) {
            this.logger.error(`[DOC-SERVICE] Failed to extract Excel content from ${docPath}: ${xlsxError}`);
            throw new Error(`Failed to extract Excel content: ${xlsxError instanceof Error ? xlsxError.message : String(xlsxError)}`);
          }
          break;
        case '.pptx':
          // Extract text from PowerPoint using our comprehensive parser
          try {
            const pptxBuffer = await fs.promises.readFile(docPath);
            const parsedSlides = await this.parsePPTX(pptxBuffer);
            
            // Combine slide content
            const slideContents = parsedSlides.map(slide => {
              let slideText = slide.content;
              if (slide.notes) {
                slideText += `\n\n[Speaker Notes: ${slide.notes}]`;
              }
              return slideText;
            });
            
            content = slideContents.join('\n\n');
            metadata = {
              slideCount: parsedSlides.length,
              hasNotes: parsedSlides.some(slide => !!slide.notes),
              titles: parsedSlides.map(slide => slide.title)
            };
          } catch (pptxError) {
            this.logger.error(`[DOC-SERVICE] Failed to extract PowerPoint content from ${docPath}: ${pptxError}`);
            throw new Error(`Failed to extract PowerPoint content: ${pptxError instanceof Error ? pptxError.message : String(pptxError)}`);
          }
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
   * Generate a document ID from relative file path
   * Uses PathNormalizer for consistent cross-platform path handling
   */
  private generateDocumentId(relativePath: string): string {
    return PathNormalizer.generateDocumentId(relativePath);
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
   * Resolve document ID to actual file path
   * Uses relative path-based IDs for uniqueness
   */
  private async resolveDocumentPath(folderPath: string, docId: string): Promise<string | null> {
    // Get all files in the folder
    const allFiles = await this.getAllFiles(folderPath);
    
    // Find file by matching generated ID from relative path
    for (const file of allFiles) {
      const generatedId = this.generateDocumentId(file.relativePath);
      if (generatedId === docId) {
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
   * Generate PDF outline with real page count
   */
  private async getPDFOutline(filePath: string): Promise<DocumentOutline> {
    try {
      const pdfBuffer = await fs.promises.readFile(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      
      // Extract real page count and any available outline/bookmarks
      const pageCount = pdfData.numpages || 1;
      
      // Create basic page structure
      const pages = Array.from({ length: pageCount }, (_, i) => ({
        pageNumber: i + 1,
        title: `Page ${i + 1}`,
        // We could extract page-specific content here if needed
        content: `Page ${i + 1} of ${pageCount}`
      }));
      
      // Add metadata if available
      const outline: DocumentOutline = {
        type: 'pdf',
        totalItems: pageCount,
        pages: pages
      };
      
      // Add PDF metadata if available
      if (pdfData.info) {
        (outline as any).metadata = {
          title: pdfData.info.Title,
          author: pdfData.info.Author,
          subject: pdfData.info.Subject,
          keywords: pdfData.info.Keywords,
          creator: pdfData.info.Creator,
          producer: pdfData.info.Producer,
          creationDate: pdfData.info.CreationDate,
          modDate: pdfData.info.ModDate
        };
      }
      
      return outline;
    } catch (error) {
      this.logger.error(`[DOC-SERVICE] Failed to extract PDF outline from ${filePath}: ${error}`);
      throw new Error(`Failed to extract PDF outline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate Word document outline with real structure extraction
   */
  private async getDocxOutline(filePath: string): Promise<DocumentOutline> {
    try {
      const docBuffer = await fs.promises.readFile(filePath);
      
      // Extract structured content - mammoth will automatically detect headings
      const result = await mammoth.convertToHtml({ buffer: docBuffer });
      
      // Parse HTML to extract headings
      const html = result.value;
      const sections: Array<{ level: number; title: string; pageNumber?: number }> = [];
      
      // Simple regex-based heading extraction
      const headingRegex = /<h([1-6])>(.*?)<\/h[1-6]>/gi;
      let match;
      let sectionNumber = 1;
      
      while ((match = headingRegex.exec(html)) !== null) {
        const levelStr = match[1];
        const titleText = match[2];
        if (!levelStr) continue;
        const level = parseInt(levelStr, 10);
        if (titleText) {
          const title = titleText.replace(/<[^>]*>/g, ''); // Strip any nested HTML tags
          sections.push({
            level: level,
            title: title,
            pageNumber: sectionNumber // Word doesn't have page numbers in the same way as PDF
          });
          sectionNumber++;
        }
      }
      
      // If no headings found, add document title as a section
      if (sections.length === 0) {
        sections.push({
          level: 1,
          title: path.basename(filePath, '.docx'),
          pageNumber: 1
        });
      }
      
      return {
        type: 'docx',
        totalItems: sections.length,
        sections: sections
      };
    } catch (error) {
      this.logger.error(`[DOC-SERVICE] Failed to extract Word document outline from ${filePath}: ${error}`);
      throw new Error(`Failed to extract Word document outline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate Excel outline with real sheet information
   */
  private async getExcelOutline(filePath: string): Promise<DocumentOutline> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      const sheets = sheetNames.map((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          return {
            sheetIndex: index,
            name: sheetName,
            rowCount: 0,
            columnCount: 0
          };
        }
        
        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const rows = range.e.r - range.s.r + 1;
        const columns = range.e.c - range.s.c + 1;
        
        return {
          sheetIndex: index,
          name: sheetName,
          rowCount: rows,
          columnCount: columns
        };
      });
      
      return {
        type: 'xlsx',
        totalItems: sheetNames.length,
        sheets: sheets
      };
    } catch (error) {
      this.logger.error(`[DOC-SERVICE] Failed to extract Excel outline from ${filePath}: ${error}`);
      throw new Error(`Failed to extract Excel outline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate PowerPoint outline with real slide extraction
   */
  private async getPowerPointOutline(filePath: string): Promise<DocumentOutline> {
    try {
      const pptxBuffer = await fs.promises.readFile(filePath);
      const parsedSlides = await this.parsePPTX(pptxBuffer);
      
      // Convert parsed slides to outline format
      const slides = parsedSlides.map(slide => {
        const slideObj: { slideNumber: number; title: string; notes?: string } = {
          slideNumber: slide.slideNumber,
          title: slide.title || `Slide ${slide.slideNumber}`
        };
        if (slide.notes) {
          slideObj.notes = slide.notes;
        }
        return slideObj;
      });
      
      return {
        type: 'pptx',
        totalItems: slides.length,
        slides: slides
      };
    } catch (error) {
      this.logger.error(`[DOC-SERVICE] Failed to extract PowerPoint outline from ${filePath}: ${error}`);
      throw new Error(`Failed to extract PowerPoint outline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse PPTX file and extract slide data with proper relationship-based notes mapping
   */
  private async parsePPTX(pptxBuffer: Buffer): Promise<ParsedSlide[]> {
    const zip = await JSZip.loadAsync(pptxBuffer);
    const slides: ParsedSlide[] = [];
    
    // Get slide files with proper numeric sorting
    const slideFiles = Object.keys(zip.files)
      .filter(name =>
        name.startsWith('ppt/slides/slide') &&
        name.endsWith('.xml') &&
        !name.includes('_rels')
      )
      .sort((a, b) =>
        parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10) -
        parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10)
      );
    
    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      if (!slideFile) continue;
      
      const file = zip.files[slideFile];
      if (!file) continue;
      
      const slideXml = await file.async('string');
      const slideNumber = i + 1;
      
      try {
        // Parse slide XML
        const slideData = await this.xmlParser.parseStringPromise(slideXml);
        
        // Extract all text content from the slide
        const textNodes: string[] = [];
        let slideTitle: string | undefined;
        
        // Recursive function to extract text from XML structure
        const extractText = (obj: any, isTitle = false): void => {
          if (!obj) return;
          
          // Check for title placeholder
          if (obj['p:nvSpPr']?.['p:nvPr']?.['p:ph']?.['$']?.type === 'title' || 
              obj['p:nvSpPr']?.['p:nvPr']?.['p:ph']?.['$']?.type === 'ctrTitle') {
            isTitle = true;
          }
          
          // Extract text from a:t nodes
          if (obj['a:t']) {
            const text = typeof obj['a:t'] === 'string' ? obj['a:t'] : obj['a:t']['_'] || '';
            if (text.trim()) {
              if (isTitle && !slideTitle) {
                slideTitle = text.trim();
              }
              textNodes.push(text.trim());
            }
          }
          
          // Recursively process all properties
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              if (Array.isArray(obj[key])) {
                obj[key].forEach((item: any) => extractText(item, isTitle));
              } else {
                extractText(obj[key], isTitle);
              }
            }
          }
        };
        
        extractText(slideData);
        
        // Get notes via relationship file
        let notes: string | undefined;
        const slideMatch = slideFile.match(/slide(\d+)\.xml$/);
        if (slideMatch) {
          const slideNum = slideMatch[1];
          const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
          
          if (zip.files[relsFile]) {
            const relsXml = await zip.files[relsFile].async('string');
            const relsData = await this.xmlParser.parseStringPromise(relsXml);
            
            // Find the notes relationship
            const relationships = Array.isArray(relsData?.Relationships?.Relationship) 
              ? relsData.Relationships.Relationship 
              : [relsData?.Relationships?.Relationship].filter(Boolean);
            
            for (const rel of relationships) {
              if (rel?.['$']?.Type?.endsWith('/notesSlide')) {
                const notesTarget = rel['$'].Target;
                const notesPath = notesTarget.startsWith('../') 
                  ? `ppt/${notesTarget.substring(3)}`
                  : `ppt/slides/${notesTarget}`;
                
                if (zip.files[notesPath]) {
                  const notesXml = await zip.files[notesPath].async('string');
                  const notesData = await this.xmlParser.parseStringPromise(notesXml);
                  
                  const notesTextNodes: string[] = [];
                  const extractNotesText = (obj: any): void => {
                    if (!obj) return;
                    if (obj['a:t']) {
                      const text = typeof obj['a:t'] === 'string' ? obj['a:t'] : obj['a:t']['_'] || '';
                      if (text.trim()) {
                        notesTextNodes.push(text.trim());
                      }
                    }
                    for (const key in obj) {
                      if (typeof obj[key] === 'object') {
                        if (Array.isArray(obj[key])) {
                          obj[key].forEach((item: any) => extractNotesText(item));
                        } else {
                          extractNotesText(obj[key]);
                        }
                      }
                    }
                  };
                  extractNotesText(notesData);
                  const notesText = notesTextNodes.join(' ').trim();
                  if (notesText) {
                    notes = notesText;
                  }
                }
                break;
              }
            }
          }
        }
        
        const slideObj: ParsedSlide = {
          slideNumber,
          content: textNodes.join(' '),
          title: slideTitle || `Slide ${slideNumber}`
        };
        if (notes) {
          slideObj.notes = notes;
        }
        slides.push(slideObj);
        
      } catch (parseError) {
        // If XML parsing fails, fall back to regex extraction
        this.logger.warn(`[DOC-SERVICE] XML parsing failed for slide ${slideNumber}, using fallback: ${parseError}`);
        
        const textMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
        const content = textMatches
          .map(match => match.replace(/<[^>]+>/g, ''))
          .filter(text => text.trim().length > 0)
          .join(' ');
        
        slides.push({
          slideNumber,
          content,
          title: `Slide ${slideNumber}`
        });
      }
    }
    
    return slides;
  }

  /**
   * Cleanup resources (close database connections)
   */
  async cleanup(): Promise<void> {
    await this.indexingTracker.close();
  }
}