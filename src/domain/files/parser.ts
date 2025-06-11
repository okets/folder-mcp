/**
 * File Parser Domain Logic
 * 
 * Pure business logic for parsing different file types.
 * Uses dependency injection for all infrastructure concerns.
 */

import * as mammoth from 'mammoth';
import XLSX from 'xlsx';
import JSZip from 'jszip';
import * as xml2js from 'xml2js';
import { 
  ParsedContent, 
  TextMetadata, 
  PDFMetadata, 
  WordMetadata, 
  ExcelMetadata, 
  PowerPointMetadata 
} from '../../types/index.js';
import { FileSystemProvider, PathProvider, DomainLogger } from '../index';

/**
 * Domain interface for file parsing operations
 */
export interface FileParsingOperations {
  parseFile(filePath: string, basePath: string): Promise<ParsedContent>;
  isSupported(extension: string): boolean;
  getSupportedExtensions(): string[];
}

/**
 * File Parser - Core domain logic for file parsing
 */
export class FileParser implements FileParsingOperations {
  private readonly supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];
  private pdfParse: any = null;

  constructor(
    private readonly fileSystem: FileSystemProvider,
    private readonly pathProvider: PathProvider,
    private readonly logger?: DomainLogger
  ) {}

  /**
   * Parse a file based on its extension
   */
  async parseFile(filePath: string, basePath: string): Promise<ParsedContent> {
    const ext = this.pathProvider.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.txt':
      case '.md':
        return this.parseTextFile(filePath, basePath);
      case '.pdf':
        return this.parsePdfFile(filePath, basePath);
      case '.docx':
        return this.parseWordFile(filePath, basePath);
      case '.xlsx':
        return this.parseExcelFile(filePath, basePath);
      case '.pptx':
        return this.parsePowerPointFile(filePath, basePath);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  /**
   * Check if file extension is supported
   */
  isSupported(extension: string): boolean {
    return this.supportedExtensions.includes(extension.toLowerCase());
  }

  /**
   * Get list of supported file extensions
   */
  getSupportedExtensions(): string[] {
    return [...this.supportedExtensions];
  }

  /**
   * Parse text files (.txt, .md)
   */
  private parseTextFile(filePath: string, basePath: string): ParsedContent {
    const content = this.fileSystem.readFile(filePath, 'utf8');
    const stats = this.fileSystem.statFile(filePath);
    
    // Normalize line endings (handle CRLF/LF)
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const relativePath = this.pathProvider.relative(basePath, filePath);
    const ext = this.pathProvider.extname(filePath).toLowerCase();
    
    const fileType = ext === '.md' ? 'md' : 'txt';
    const lines = normalizedContent.split('\n').length;
    
    const metadata: TextMetadata = {
      type: fileType as 'txt' | 'md',
      originalPath: relativePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      lines: lines,
      encoding: 'utf-8'
    };
    
    return {
      content: normalizedContent,
      type: fileType,
      originalPath: relativePath,
      metadata
    };
  }

  /**
   * Parse PDF files
   */
  private async parsePdfFile(filePath: string, basePath: string): Promise<ParsedContent> {
    const relativePath = this.pathProvider.relative(basePath, filePath);
    const stats = this.fileSystem.statFile(filePath);
    
    // Lazy load pdf-parse to avoid initialization issues
    if (!this.pdfParse) {
      this.pdfParse = (await import('pdf-parse')).default;
    }
    
    // Read PDF file as buffer
    const dataBuffer = this.fileSystem.readFileBuffer(filePath);
    
    // Parse PDF
    const pdfData = await this.pdfParse(dataBuffer);
    
    // Extract page-by-page content if available
    const pages: string[] = [];
    if (pdfData.text) {
      // Split content by common page break indicators
      const pageBreaks = pdfData.text.split(/\f|\n\s*\n\s*\n/);
      pageBreaks.forEach((pageContent: string) => {
        const trimmedContent = pageContent.trim();
        if (trimmedContent.length > 0) {
          pages.push(trimmedContent);
        }
      });
    }
    
    // If no pages detected, use the full text as one page
    if (pages.length === 0 && pdfData.text) {
      pages.push(pdfData.text.trim());
    }
    
    const metadata: PDFMetadata = {
      type: 'pdf',
      originalPath: relativePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      pages: pdfData.numpages || pages.length,
      ...(pdfData.info && {
        pdfInfo: {
          title: pdfData.info.Title,
          author: pdfData.info.Author,
          subject: pdfData.info.Subject,
          creator: pdfData.info.Creator,
          producer: pdfData.info.Producer,
          creationDate: pdfData.info.CreationDate,
          modificationDate: pdfData.info.ModDate
        }
      })
    };

    return {
      content: pdfData.text || '',
      type: 'pdf',
      originalPath: relativePath,
      metadata
    };
  }

  /**
   * Parse Word documents (.docx)
   */
  private async parseWordFile(filePath: string, basePath: string): Promise<ParsedContent> {
    const relativePath = this.pathProvider.relative(basePath, filePath);
    const stats = this.fileSystem.statFile(filePath);
    
    // Convert Word document to plain text and HTML
    const result = await mammoth.extractRawText({ path: filePath });
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    
    // Extract additional information
    const warnings = result.messages || [];
    const htmlWarnings = htmlResult.messages || [];
    
    // Get basic statistics
    const textContent = result.value || '';
    const htmlContent = htmlResult.value || '';
    
    // Count paragraphs (estimate from double line breaks)
    const paragraphs = textContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Count words (simple whitespace split)
    const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);

    const metadata: WordMetadata = {
      type: 'docx',
      originalPath: relativePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      paragraphs: paragraphs.length,
      charCount: textContent.length,
      wordCount: words.length,
      htmlContent: htmlContent,
      hasImages: htmlContent.includes('<img'),
      hasTables: htmlContent.includes('<table'),
      hasLinks: htmlContent.includes('<a '),
      warnings: warnings.length > 0 ? warnings.map(w => w.message) : [],
      htmlWarnings: htmlWarnings.length > 0 ? htmlWarnings.map(w => w.message) : []
    };
    
    return {
      content: textContent,
      type: 'word',
      originalPath: relativePath,
      metadata
    };
  }

  /**
   * Parse Excel files (.xlsx)
   */
  private parseExcelFile(filePath: string, basePath: string): ParsedContent {
    const relativePath = this.pathProvider.relative(basePath, filePath);
    const stats = this.fileSystem.statFile(filePath);
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Extract text content from all worksheets
    let allTextContent = '';
    const worksheets: any[] = [];
    
    // Process each worksheet
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        return;
      }

      // Convert to CSV format for text extraction
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      
      // Convert to JSON for structured data
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Get worksheet range info
      const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
      const rowCount = range ? range.e.r - range.s.r + 1 : 0;
      const colCount = range ? range.e.c - range.s.c + 1 : 0;
      
      // Count non-empty cells
      const cellCount = Object.keys(worksheet).filter(key => !key.startsWith('!')).length;
      
      // Extract formulas if any
      const formulas: string[] = [];
      Object.keys(worksheet).forEach(cellAddress => {
        const cell = worksheet[cellAddress];
        if (cell && cell.f) {
          formulas.push(`${cellAddress}: ${cell.f}`);
        }
      });
      
      worksheets.push({
        name: sheetName,
        index: index,
        csvContent: csvContent,
        jsonData: jsonData,
        rowCount: rowCount,
        colCount: colCount,
        cellCount: cellCount,
        hasFormulas: formulas.length > 0,
        formulas: formulas,
        range: range ? `${XLSX.utils.encode_cell(range.s)}:${XLSX.utils.encode_cell(range.e)}` : null
      });
      
      // Add to overall text content
      if (csvContent.trim()) {
        allTextContent += `\n\n=== Sheet: ${sheetName} ===\n${csvContent}`;
      }
    });
    
    // Calculate summary statistics
    const totalRows = worksheets.reduce((sum, ws) => sum + ws.rowCount, 0);
    const totalCells = worksheets.reduce((sum, ws) => sum + ws.cellCount, 0);
    const totalFormulas = worksheets.reduce((sum, ws) => sum + ws.formulas.length, 0);

    const metadata: ExcelMetadata = {
      type: 'xlsx',
      originalPath: relativePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      sheets: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length,
      charCount: allTextContent.length,
      worksheets: worksheets,
      totalRows: totalRows,
      totalCells: totalCells,
      totalFormulas: totalFormulas,
      hasFormulas: totalFormulas > 0,
      ...(workbook.Props && Object.keys(workbook.Props).length > 0 && {
        workbookProperties: {
          ...(workbook.Props.Title && { title: workbook.Props.Title }),
          ...(workbook.Props.Author && { author: workbook.Props.Author }),
          ...(workbook.Props.Subject && { subject: workbook.Props.Subject }),
          ...(workbook.Props.CreatedDate && { created: workbook.Props.CreatedDate.toISOString() }),
          ...(workbook.Props.ModifiedDate && { modified: workbook.Props.ModifiedDate.toISOString() })
        }
      })
    };
    
    return {
      content: allTextContent.trim(),
      type: 'excel',
      originalPath: relativePath,
      metadata
    };
  }

  /**
   * Parse PowerPoint files (.pptx)
   */
  private async parsePowerPointFile(filePath: string, basePath: string): Promise<ParsedContent> {
    const relativePath = this.pathProvider.relative(basePath, filePath);
    const stats = this.fileSystem.statFile(filePath);
    
    // Read PowerPoint file
    const zip = new JSZip();
    const content = await zip.loadAsync(this.fileSystem.readFileBuffer(filePath));
    
    // Extract slides
    const slides: any[] = [];
    let allTextContent = '';
    
    // Helper function to extract text from XML nodes
    const extractTextFromNode = (node: any): string => {
      let text = '';
      if (typeof node === 'string') {
        return node;
      }
      if (Array.isArray(node)) {
        node.forEach(item => {
          text += extractTextFromNode(item);
        });
      } else if (node && typeof node === 'object') {
        // Look for text content in various Office XML structures
        if (node['a:t']) {
          text += extractTextFromNode(node['a:t']) + ' ';
        }
        if (node.t) {
          text += extractTextFromNode(node.t) + ' ';
        }
        if (node._) {
          text += node._ + ' ';
        }
        // Recursively search child nodes
        Object.keys(node).forEach(key => {
          if (key !== '$' && key !== '_') {
            text += extractTextFromNode(node[key]);
          }
        });
      }
      return text;
    };
    
    // Process each slide
    for (const [filename, file] of Object.entries(content.files)) {
      if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
        const slideContent = await file.async('text');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(slideContent);
        
        // Extract text from slide
        const slideText = extractTextFromNode(result);
        if (slideText.trim()) {
          allTextContent += `\n\n=== Slide ${filename.match(/\d+/)?.[0] || '?'} ===\n${slideText}`;
        }
        
        // Extract slide metadata
        const slideNumber = parseInt(filename.match(/\d+/)?.[0] || '0');
        const hasImages = slideContent.includes('<a:blip');
        const hasShapes = slideContent.includes('<p:sp');
        const hasTables = slideContent.includes('<a:tbl');
        
        slides.push({
          number: slideNumber,
          text: slideText,
          hasImages,
          hasShapes,
          hasTables
        });
      }
    }
    
    // Sort slides by number
    slides.sort((a, b) => a.number - b.number);
    
    const metadata: PowerPointMetadata = {
      type: 'pptx',
      originalPath: relativePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      slides: slides.length,
      slideCount: slides.length,
      charCount: allTextContent.length,
      hasImages: slides.some(s => s.hasImages),
      hasShapes: slides.some(s => s.hasShapes),
      hasTables: slides.some(s => s.hasTables)
    };
    
    return {
      content: allTextContent.trim(),
      type: 'powerpoint',
      originalPath: relativePath,
      metadata
    };
  }
}

/**
 * Factory function for dependency injection
 */
export const createFileParser = (
  fileSystem: FileSystemProvider,
  pathProvider: PathProvider,
  logger?: DomainLogger
): FileParser => new FileParser(fileSystem, pathProvider, logger);
