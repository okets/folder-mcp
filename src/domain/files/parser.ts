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

    // Extract structured candidates for markdown files (Sprint 13)
    let structuredCandidates: ParsedContent['structuredCandidates'];
    let contentZones: ParsedContent['contentZones'];

    if (fileType === 'md') {
      const candidates = this.extractMarkdownCandidates(normalizedContent);
      structuredCandidates = candidates.headers || candidates.emphasized ? candidates : undefined;
      contentZones = this.extractMarkdownZones(normalizedContent);
    }

    const result: ParsedContent = {
      content: normalizedContent,
      type: fileType,
      originalPath: relativePath,
      metadata
    };

    if (structuredCandidates && (structuredCandidates.headers || structuredCandidates.emphasized)) {
      result.structuredCandidates = structuredCandidates;
    }

    if (contentZones && contentZones.length > 0) {
      result.contentZones = contentZones;
    }

    return result;
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
          
          // Extract structured candidates (Sprint 13)
          const structuredCandidates = this.extractPdfCandidates(pdfData, pageTexts);
          const contentZones = this.extractPdfZones(pageTexts);

          const parsedResult: ParsedContent = {
            content: fullText.trim(),
            type: 'pdf',
            originalPath: relativePath,
            metadata
          };

          if (structuredCandidates && Object.keys(structuredCandidates).length > 0) {
            parsedResult.structuredCandidates = structuredCandidates;
          }
          if (contentZones && contentZones.length > 0) {
            parsedResult.contentZones = contentZones;
          }

          resolve(parsedResult);
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
    
    // Extract structured candidates (Sprint 13)
    const structuredCandidates = this.extractWordCandidates(htmlContent, keywords);
    const contentZones = this.extractWordZones(htmlContent);

    const parsedResult: ParsedContent = {
      content: textContent,
      type: 'word',
      originalPath: relativePath,
      metadata
    };

    if (structuredCandidates && Object.keys(structuredCandidates).length > 0) {
      parsedResult.structuredCandidates = structuredCandidates;
    }
    if (contentZones && contentZones.length > 0) {
      parsedResult.contentZones = contentZones;
    }

    return parsedResult;
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
    
    // Extract structured candidates (Sprint 13)
    const structuredCandidates = this.extractExcelCandidates(workbook, worksheets);
    const contentZones = this.extractExcelZones(worksheets);

    const parsedResult: ParsedContent = {
      content: allTextContent.trim(),
      type: 'excel',
      originalPath: relativePath,
      metadata
    };

    if (structuredCandidates && Object.keys(structuredCandidates).length > 0) {
      parsedResult.structuredCandidates = structuredCandidates;
    }
    if (contentZones && contentZones.length > 0) {
      parsedResult.contentZones = contentZones;
    }

    return parsedResult;
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
    
    // Extract structured candidates (Sprint 13)
    const structuredCandidates = this.extractPowerPointCandidates(slides);
    const contentZones = this.extractPowerPointZones(slides);

    const parsedResult: ParsedContent = {
      content: allTextContent.trim(),
      type: 'powerpoint',
      originalPath: relativePath,
      metadata,
      slides: slides
    };

    if (structuredCandidates && Object.keys(structuredCandidates).length > 0) {
      parsedResult.structuredCandidates = structuredCandidates;
    }
    if (contentZones && contentZones.length > 0) {
      parsedResult.contentZones = contentZones;
    }

    return parsedResult;
  }

  /**
   * Extract structured keyword candidates from markdown content (Sprint 13)
   */
  private extractMarkdownCandidates(content: string): { headers?: string[]; emphasized?: string[] } {
    const headers: string[] = [];
    const emphasized: string[] = [];

    // Extract headers (# ## ### etc.)
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
      const headerText = match[2]?.trim();
      if (headerText) {
        // Clean any remaining markdown formatting from header text
        const cleanHeader = headerText
          .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
          .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
          .replace(/`([^`]+)`/g, '$1')        // Remove inline code
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links
        if (cleanHeader.length > 0) {
          headers.push(cleanHeader);
        }
      }
    }

    // Extract emphasized text (bold, italic)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    while ((match = boldRegex.exec(content)) !== null) {
      const boldText = match[1]?.trim();
      if (boldText && boldText.length > 2 && boldText.length < 50) { // Reasonable length for keywords
        emphasized.push(boldText);
      }
    }

    const italicRegex = /\*([^*]+)\*/g;
    while ((match = italicRegex.exec(content)) !== null) {
      const italicText = match[1]?.trim();
      if (italicText && italicText.length > 2 && italicText.length < 50) { // Reasonable length for keywords
        emphasized.push(italicText);
      }
    }

    // Extract code spans as potential technical terms
    const codeRegex = /`([^`]+)`/g;
    while ((match = codeRegex.exec(content)) !== null) {
      const codeText = match[1]?.trim();
      if (codeText && codeText.length > 2 && codeText.length < 30) { // Technical terms are usually shorter
        emphasized.push(codeText);
      }
    }

    // Deduplicate arrays
    const uniqueHeaders = [...new Set(headers)];
    const uniqueEmphasized = [...new Set(emphasized)];

    const result: { headers?: string[]; emphasized?: string[] } = {};
    if (uniqueHeaders.length > 0) result.headers = uniqueHeaders;
    if (uniqueEmphasized.length > 0) result.emphasized = uniqueEmphasized;
    return result;
  }

  /**
   * Extract content zones with importance weights from markdown (Sprint 13)
   */
  private extractMarkdownZones(content: string): Array<{
    text: string;
    type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
    weight: number;
  }> {
    const zones: Array<{
      text: string;
      type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
      weight: number;
    }> = [];

    const lines = content.split('\n');
    let currentZone = { text: '', type: 'body' as const, weight: 0.4 };

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for headers
      const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        // Save previous zone if it has content
        if (currentZone.text.trim()) {
          zones.push({ ...currentZone });
        }

        const headerLevel = headerMatch[1]?.length || 1;
        const headerText = headerMatch[2] || '';

        // Create header zone
        const headerType = headerLevel === 1 ? 'title' :
                          headerLevel === 2 ? 'header1' :
                          headerLevel === 3 ? 'header2' : 'header3';
        const headerWeight = headerLevel === 1 ? 1.0 :
                           headerLevel === 2 ? 0.9 :
                           headerLevel === 3 ? 0.8 : 0.7;

        zones.push({
          text: headerText,
          type: headerType,
          weight: headerWeight
        });

        // Start new body zone
        currentZone = { text: '', type: 'body', weight: 0.4 };
        continue;
      }

      // Add line to current zone
      if (trimmedLine.length > 0) {
        currentZone.text += (currentZone.text ? '\n' : '') + trimmedLine;
      }
    }

    // Add final zone if it has content
    if (currentZone.text.trim()) {
      zones.push(currentZone);
    }

    return zones.filter(zone => zone.text.length > 0);
  }

  /**
   * Extract structured keyword candidates from Excel content (Sprint 13)
   */
  private extractExcelCandidates(workbook: any, worksheets: any[]): { entities?: string[]; headers?: string[] } {
    const entities: string[] = [];
    const headers: string[] = [];

    // Extract sheet names as entities
    if (workbook.SheetNames && Array.isArray(workbook.SheetNames)) {
      entities.push(...workbook.SheetNames);
    }

    // Extract column headers from each worksheet
    worksheets.forEach(worksheet => {
      if (worksheet.jsonData && Array.isArray(worksheet.jsonData) && worksheet.jsonData.length > 0) {
        const firstRow = worksheet.jsonData[0];
        if (Array.isArray(firstRow)) {
          // First row might contain headers
          firstRow.forEach((cell: any) => {
            if (typeof cell === 'string' && cell.length > 1 && cell.length < 50) {
              headers.push(cell.trim());
            }
          });
        }
      }
    });

    const result: { entities?: string[]; headers?: string[] } = {};
    if (entities.length > 0) result.entities = [...new Set(entities)];
    if (headers.length > 0) result.headers = [...new Set(headers)];
    return result;
  }

  /**
   * Extract content zones with importance weights from Excel (Sprint 13)
   */
  private extractExcelZones(worksheets: any[]): Array<{
    text: string;
    type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
    weight: number;
  }> {
    const zones: Array<{
      text: string;
      type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
      weight: number;
    }> = [];

    worksheets.forEach((worksheet, index) => {
      if (worksheet.csvContent && worksheet.csvContent.trim()) {
        // Treat first worksheet as more important
        zones.push({
          text: worksheet.csvContent,
          type: index === 0 ? 'title' : 'body',
          weight: index === 0 ? 0.8 : 0.4
        });
      }
    });

    return zones.filter(zone => zone.text.length > 0);
  }

  /**
   * Extract structured keyword candidates from PowerPoint content (Sprint 13)
   */
  private extractPowerPointCandidates(slides: any[]): { headers?: string[]; entities?: string[] } {
    const headers: string[] = [];
    const entities: string[] = [];

    slides.forEach(slide => {
      // Extract slide titles as headers
      if (slide.text && slide.text.length > 0) {
        // First few words of slide text could be title
        const lines = slide.text.split('\n').filter((line: string) => line.trim().length > 0);
        if (lines.length > 0) {
          const firstLine = lines[0].trim();
          if (firstLine.length > 3 && firstLine.length < 100) {
            headers.push(firstLine);
          }
        }
      }

      // Extract bullet points as entities
      const bulletRegex = /^\s*[-•*]\s+(.+)$/gm;
      let match;
      while ((match = bulletRegex.exec(slide.text)) !== null) {
        const bulletText = match[1]?.trim();
        if (bulletText && bulletText.length > 3 && bulletText.length < 80) {
          entities.push(bulletText);
        }
      }
    });

    const result: { headers?: string[]; entities?: string[] } = {};
    if (headers.length > 0) result.headers = [...new Set(headers)];
    if (entities.length > 0) result.entities = [...new Set(entities)];
    return result;
  }

  /**
   * Extract content zones with importance weights from PowerPoint (Sprint 13)
   */
  private extractPowerPointZones(slides: any[]): Array<{
    text: string;
    type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
    weight: number;
  }> {
    const zones: Array<{
      text: string;
      type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
      weight: number;
    }> = [];

    slides.forEach((slide, index) => {
      if (slide.text && slide.text.trim()) {
        // First slide is often title slide
        zones.push({
          text: slide.text.trim(),
          type: index === 0 ? 'title' : 'body',
          weight: index === 0 ? 0.9 : 0.4
        });
      }

      // Speaker notes have lower weight
      if (slide.notes && slide.notes.trim()) {
        zones.push({
          text: slide.notes.trim(),
          type: 'footer',
          weight: 0.2
        });
      }
    });

    return zones.filter(zone => zone.text.length > 0);
  }

  /**
   * Extract structured keyword candidates from Word HTML content (Sprint 13)
   */
  private extractWordCandidates(htmlContent: string, metadataKeywords?: string): { metadata?: string[]; headers?: string[]; emphasized?: string[] } {
    const metadata: string[] = [];
    const headers: string[] = [];
    const emphasized: string[] = [];

    // Extract metadata keywords if available
    if (metadataKeywords) {
      const keywords = metadataKeywords.split(/[,;]/).map(k => k.trim()).filter(Boolean);
      metadata.push(...keywords);
    }

    // Extract headers from HTML structure
    const headerRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
    let match;
    while ((match = headerRegex.exec(htmlContent)) !== null) {
      const headerText = match[2]?.trim();
      if (headerText && headerText.length > 3 && headerText.length < 100) {
        headers.push(headerText);
      }
    }

    // Extract emphasized text (bold, italic)
    const boldRegex = /<(?:b|strong)[^>]*>([^<]+)<\/(?:b|strong)>/gi;
    while ((match = boldRegex.exec(htmlContent)) !== null) {
      const boldText = match[1]?.trim();
      if (boldText && boldText.length > 2 && boldText.length < 50) {
        emphasized.push(boldText);
      }
    }

    const italicRegex = /<(?:i|em)[^>]*>([^<]+)<\/(?:i|em)>/gi;
    while ((match = italicRegex.exec(htmlContent)) !== null) {
      const italicText = match[1]?.trim();
      if (italicText && italicText.length > 2 && italicText.length < 50) {
        emphasized.push(italicText);
      }
    }

    const result: { metadata?: string[]; headers?: string[]; emphasized?: string[] } = {};
    if (metadata.length > 0) result.metadata = [...new Set(metadata)];
    if (headers.length > 0) result.headers = [...new Set(headers)];
    if (emphasized.length > 0) result.emphasized = [...new Set(emphasized)];
    return result;
  }

  /**
   * Extract content zones with importance weights from Word HTML (Sprint 13)
   */
  private extractWordZones(htmlContent: string): Array<{
    text: string;
    type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
    weight: number;
  }> {
    const zones: Array<{
      text: string;
      type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
      weight: number;
    }> = [];

    // Extract headers with weights
    const headerRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
    let match;
    while ((match = headerRegex.exec(htmlContent)) !== null) {
      const level = parseInt(match[1] || '1');
      const headerText = match[2]?.trim();
      if (headerText) {
        const headerType = level === 1 ? 'title' :
                          level === 2 ? 'header1' :
                          level === 3 ? 'header2' : 'header3';
        const weight = level === 1 ? 1.0 :
                      level === 2 ? 0.9 :
                      level === 3 ? 0.8 : 0.7;

        zones.push({
          text: headerText,
          type: headerType,
          weight
        });
      }
    }

    // Extract paragraph content as body zones
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
    while ((match = paragraphRegex.exec(htmlContent)) !== null) {
      const paragraphText = match[1]?.replace(/<[^>]+>/g, '').trim(); // Strip remaining HTML tags
      if (paragraphText && paragraphText.length > 20) { // Only substantial paragraphs
        zones.push({
          text: paragraphText,
          type: 'body',
          weight: 0.4
        });
      }
    }

    return zones.filter(zone => zone.text.length > 0);
  }

  /**
   * Extract structured keyword candidates from PDF content (Sprint 13)
   */
  private extractPdfCandidates(pdfData: any, _pageTexts: string[]): { metadata?: string[]; headers?: string[] } {
    const metadata: string[] = [];
    const headers: string[] = [];

    // Extract metadata keywords if available
    if (pdfData.Meta?.Keywords) {
      const keywords = pdfData.Meta.Keywords.split(/[,;]/).map((k: string) => k.trim()).filter(Boolean);
      metadata.push(...keywords);
    }

    // Extract potential headers from page structure
    // Look for text that appears to be headers (larger font, positioned as titles)
    if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
      pdfData.Pages.forEach((page: any) => {
        if (page.Texts && Array.isArray(page.Texts)) {
          // Find text items that could be headers (simple heuristic: shorter text, first on page)
          const potentialHeaders = page.Texts
            .filter((text: any) => {
              const textContent = text.R?.map((r: any) => decodeURIComponent(r.T || '')).join(' ').trim();
              return textContent && textContent.length > 3 && textContent.length < 100 &&
                     !textContent.includes('\n') && // Single line
                     textContent.charAt(0) === textContent.charAt(0).toUpperCase(); // Starts with capital
            })
            .slice(0, 3) // Take first 3 potential headers per page
            .map((text: any) => text.R?.map((r: any) => decodeURIComponent(r.T || '')).join(' ').trim())
            .filter(Boolean);

          headers.push(...potentialHeaders);
        }
      });
    }

    const result: { metadata?: string[]; headers?: string[] } = {};
    if (metadata.length > 0) result.metadata = [...new Set(metadata)];
    if (headers.length > 0) result.headers = [...new Set(headers)];
    return result;
  }

  /**
   * Extract content zones with importance weights from PDF (Sprint 13)
   */
  private extractPdfZones(pageTexts: string[]): Array<{
    text: string;
    type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
    weight: number;
  }> {
    const zones: Array<{
      text: string;
      type: 'title' | 'header1' | 'header2' | 'header3' | 'body' | 'caption' | 'footer';
      weight: number;
    }> = [];

    pageTexts.forEach((pageText, pageIndex) => {
      if (pageText.trim()) {
        // For PDFs, treat each page as a body zone
        // Future enhancement: detect headers vs body text based on formatting
        zones.push({
          text: pageText.trim(),
          type: pageIndex === 0 ? 'title' : 'body', // First page might contain title
          weight: pageIndex === 0 ? 0.8 : 0.4
        });
      }
    });

    return zones;
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
