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
import PDF2Json from 'pdf2json';
import { 
  ParsedContent, 
  TextMetadata, 
  PDFMetadata, 
  WordMetadata, 
  ExcelMetadata, 
  PowerPointMetadata 
} from '../../types/index.js';
import { FileSystemProvider, PathProvider, DomainLogger } from '../index';
import { getSupportedExtensions, isDocumentExtension } from './supported-extensions.js';

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
  private readonly supportedExtensions = getSupportedExtensions();

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
    return isDocumentExtension(extension);
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
    
    // Read PDF file as buffer
    const dataBuffer = this.fileSystem.readFileBuffer(filePath);
    
    // Parse PDF using pdf2json
    return new Promise((resolve, reject) => {
      const pdfParser = new (PDF2Json as any)();
      
      // Set up event handlers
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        this.logger?.error('Error parsing PDF file', errData.parserError);
        reject(new Error(`Failed to parse PDF: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          let fullText = '';
          const pageTexts: string[] = [];
          const pageStructures: any[] = [];
          
          // Process each page
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any, pageIndex: number) => {
              let pageText = '';
              const textBlocks: any[] = [];
              
              // Extract text from text blocks
              if (page.Texts && Array.isArray(page.Texts)) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R && Array.isArray(textItem.R)) {
                    textItem.R.forEach((run: any) => {
                      if (run.T) {
                        // Decode URI component (pdf2json encodes text)
                        const decodedText = decodeURIComponent(run.T);
                        pageText += decodedText + ' ';
                      }
                    });
                  }
                  
                  // Store text block info for chunking
                  textBlocks.push({
                    x: textItem.x,
                    y: textItem.y,
                    w: textItem.w,
                    h: textItem.h,
                    text: textItem.R?.map((r: any) => decodeURIComponent(r.T || '')).join(' ')
                  });
                });
              }
              
              pageTexts.push(pageText.trim());
              pageStructures.push({
                pageIndex,
                textBlocks,
                width: page.Width,
                height: page.Height
              });
              
              if (pageText.trim()) {
                fullText += pageText.trim() + '\n\n';
              }
            });
          }
          
          // Extract metadata
          const metadata: PDFMetadata = {
            type: 'pdf',
            originalPath: relativePath,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            pages: pdfData.Pages?.length || 0,
            // Store page structures for chunking (extending the type)
            ...(pageStructures.length > 0 && { pageStructures } as any),
            // Extract metadata if available
            ...(pdfData.Meta && {
              author: pdfData.Meta.Author,
              created: pdfData.Meta.CreationDate,
              keywords: pdfData.Meta.Keywords || pdfData.Meta.Subject,
              pdfInfo: {
                title: pdfData.Meta.Title,
                author: pdfData.Meta.Author,
                subject: pdfData.Meta.Subject,
                creator: pdfData.Meta.Creator,
                producer: pdfData.Meta.Producer,
                creationDate: pdfData.Meta.CreationDate,
                modificationDate: pdfData.Meta.ModDate
              }
            })
          };
          
          resolve({
            content: fullText.trim(),
            type: 'pdf',
            originalPath: relativePath,
            metadata
          });
        } catch (error) {
          reject(error);
        }
      });
      
      // Parse the buffer
      pdfParser.parseBuffer(dataBuffer);
    });
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

    // Extract core properties from DOCX (author, created, keywords)
    let author: string | undefined;
    let created: string | undefined;
    let keywords: string | undefined;
    try {
      const zip = new JSZip();
      const docxBuffer = this.fileSystem.readFileBuffer(filePath);
      const loaded = await zip.loadAsync(docxBuffer);
      const coreXmlFile = loaded.file('docProps/core.xml');
      if (coreXmlFile) {
        const coreXml = await coreXmlFile.async('string');
        const parser = new xml2js.Parser();
        const coreProps = await parser.parseStringPromise(coreXml);
        const cp = coreProps['cp:coreProperties'] || {};
        author = cp['dc:creator']?.[0];
        created = cp['dcterms:created']?.[0]?._ || cp['dcterms:created']?.[0];
        keywords = cp['cp:keywords']?.[0];
      }
    } catch (e) {
      // ignore errors, fallback to undefined
    }

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
      htmlWarnings: htmlWarnings.length > 0 ? htmlWarnings.map(w => w.message) : [],
      ...(author && { author }),
      ...(created && { created }),
      ...(keywords && { keywords })
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
    
    // First, map slides to their notes through relationships
    const slideToNotesMap = new Map<number, string>();
    
    // Process relationship files to find notes associations
    for (const [filename, file] of Object.entries(content.files)) {
      if (filename.match(/ppt\/slides\/_rels\/slide\d+\.xml\.rels$/)) {
        const slideNum = parseInt(filename.match(/slide(\d+)\.xml\.rels$/)?.[1] || '0');
        const relsContent = await file.async('text');
        
        // Look for notes relationship
        const notesMatch = relsContent.match(/Target="\.\.\/notesSlides\/notesSlide\d+\.xml"/);
        if (notesMatch) {
          const notesNum = notesMatch[0].match(/notesSlide(\d+)\.xml/)?.[1];
          if (notesNum) {
            slideToNotesMap.set(slideNum, `ppt/notesSlides/notesSlide${notesNum}.xml`);
          }
        }
      }
    }
    
    // Extract notes content
    const notesContent = new Map<string, string>();
    for (const [filename, file] of Object.entries(content.files)) {
      if (filename.match(/ppt\/notesSlides\/notesSlide\d+\.xml$/)) {
        const notesXml = await file.async('text');
        const parser = new xml2js.Parser();
        try {
          const result = await parser.parseStringPromise(notesXml);
          const notesText = extractTextFromNode(result);
          // Clean up the notes text (remove slide numbers at the beginning)
          const cleanedNotes = notesText.replace(/^\d+\s*/, '').trim();
          if (cleanedNotes) {
            notesContent.set(filename, cleanedNotes);
          }
        } catch (e) {
          this.logger?.warn('Failed to parse notes file', { filename, error: e });
        }
      }
    }
    
    // Process each slide
    for (const [filename, file] of Object.entries(content.files)) {
      if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
        const slideContent = await file.async('text');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(slideContent);
        
        // Extract text from slide
        const slideText = extractTextFromNode(result);
        const slideNumber = parseInt(filename.match(/\d+/)?.[0] || '0');
        
        // Get associated notes
        const notesFile = slideToNotesMap.get(slideNumber);
        const slideNotes = notesFile ? notesContent.get(notesFile) : undefined;
        
        // Add to overall text content
        if (slideText.trim() || slideNotes) {
          allTextContent += `\n\n=== Slide ${slideNumber} ===\n`;
          if (slideText.trim()) {
            allTextContent += slideText.trim();
          }
          if (slideNotes) {
            allTextContent += `\n\n[Speaker Notes]\n${slideNotes}`;
          }
        }
        
        // Extract slide metadata
        const hasImages = slideContent.includes('<a:blip');
        const hasShapes = slideContent.includes('<p:sp');
        const hasTables = slideContent.includes('<a:tbl');
        
        slides.push({
          number: slideNumber,
          text: slideText,
          notes: slideNotes || '',
          hasNotes: !!slideNotes,
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
      hasTables: slides.some(s => s.hasTables),
      hasNotes: slides.some(s => s.hasNotes),
      notesCount: slides.filter(s => s.hasNotes).length,
      slideData: slides
    };
    
    return {
      content: allTextContent.trim(),
      type: 'powerpoint',
      originalPath: relativePath,
      metadata,
      slides: slides
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
