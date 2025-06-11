import { readFileSync, statSync } from 'fs';
import { relative, extname } from 'path';
import * as mammoth from 'mammoth';
import XLSX from 'xlsx';
import JSZip from 'jszip';
import * as xml2js from 'xml2js';
import { ParsedContent, TextMetadata, PDFMetadata, WordMetadata, ExcelMetadata, PowerPointMetadata } from '../types/index.js';
import type { ILoggingService } from '../di/interfaces.js';

// Lazy load pdf-parse to avoid initialization issues
let pdfParse: any = null;
async function getPdfParse() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  return pdfParse;
}

export async function parseTextFile(filePath: string, basePath: string, loggingService?: ILoggingService): Promise<ParsedContent> {
  try {
    // Read file with UTF-8 encoding
    const content = readFileSync(filePath, 'utf8');
    const stats = statSync(filePath);
    
    // Normalize line endings (handle CRLF/LF)
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const relativePath = relative(basePath, filePath);
    const ext = extname(filePath).toLowerCase();
    
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
      metadata: metadata
    };
  } catch (error) {
    // Log the error and throw a structured error
    const errorMessage = `Failed to parse text file ${filePath}`;
    if (loggingService) {
      loggingService.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
    } else {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }
}

export async function parsePdfFile(filePath: string, basePath: string, loggingService?: ILoggingService): Promise<ParsedContent> {
  try {
    const relativePath = relative(basePath, filePath);
    const stats = statSync(filePath);
    
    // Show progress for large PDFs (> 1MB)
    if (stats.size > 1024 * 1024) {
      console.log(`    Processing large PDF (${Math.round(stats.size / 1024 / 1024)}MB)...`);
    }
    
    // Read PDF file as buffer
    const dataBuffer = readFileSync(filePath);
    
    // Parse PDF
    const pdfParseLib = await getPdfParse();
    const pdfData = await pdfParseLib(dataBuffer);
    
    // Extract page-by-page content if available
    const pages: string[] = [];
    if (pdfData.text) {
      // Split content by common page break indicators
      const pageBreaks = pdfData.text.split(/\f|\n\s*\n\s*\n/);
      pageBreaks.forEach((pageContent: string, index: number) => {
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
  } catch (error: any) {
    // Handle encrypted PDFs gracefully
    if (error.message && (
      error.message.includes('encrypted') || 
      error.message.includes('password') ||
      error.message.includes('Invalid PDF')
    )) {
      if (loggingService) {
        loggingService.warn(`Warning: Skipping encrypted or password-protected PDF: ${relative(basePath, filePath)}`);
      } else {
        console.warn(`    Warning: Skipping encrypted or password-protected PDF: ${relative(basePath, filePath)}`);
      }
      const stats = statSync(filePath);
      const errorMetadata: PDFMetadata = {
        type: 'pdf',
        originalPath: relative(basePath, filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        pages: 0,
        error: 'encrypted_or_protected',
        errorMessage: 'PDF is encrypted or password-protected'
      };
      return {
        content: '',
        type: 'pdf',
        originalPath: relative(basePath, filePath),
        metadata: errorMetadata
      };
    }
    
    // Log the error and throw a structured error
    const errorMessage = `Failed to parse PDF file ${filePath}`;
    if (loggingService) {
      loggingService.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
    } else {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }
}

export async function parseWordFile(filePath: string, basePath: string, loggingService?: ILoggingService): Promise<ParsedContent> {
  try {
    const relativePath = relative(basePath, filePath);
    const stats = statSync(filePath);
    
    // Show progress for large Word documents (> 500KB)
    if (stats.size > 500 * 1024) {
      console.log(`    Processing large Word document (${Math.round(stats.size / 1024)}KB)...`);
    }
    
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
  } catch (error: any) {
    // Handle corrupted or unsupported Word documents
    if (error.message && (
      error.message.includes('corrupted') || 
      error.message.includes('not a valid') ||
      error.message.includes('ENOENT') ||
      error.message.includes('unexpected end of file')
    )) {
      if (loggingService) {
        loggingService.warn(`Warning: Skipping corrupted or unsupported Word document: ${relative(basePath, filePath)}`);
      } else {
        console.warn(`    Warning: Skipping corrupted or unsupported Word document: ${relative(basePath, filePath)}`);
      }
      const stats = statSync(filePath);
      const errorMetadata: WordMetadata = {
        type: 'docx',
        originalPath: relative(basePath, filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        paragraphs: 0,
        charCount: 0,
        wordCount: 0,
        htmlContent: '',
        hasImages: false,
        hasTables: false,
        hasLinks: false,
        warnings: [],
        htmlWarnings: [],
        error: 'corrupted_or_unsupported',
        errorMessage: 'Word document is corrupted or unsupported'
      };
      return {
        content: '',
        type: 'word',
        originalPath: relative(basePath, filePath),
        metadata: errorMetadata
      };
    }
    
    // Log the error and throw a structured error
    const errorMessage = `Failed to parse Word file ${filePath}`;
    if (loggingService) {
      loggingService.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
    } else {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }
}

export async function parseExcelFile(filePath: string, basePath: string, loggingService?: ILoggingService): Promise<ParsedContent> {
  try {
    const relativePath = relative(basePath, filePath);
    const stats = statSync(filePath);
    
    // Show progress for large Excel files (> 1MB)
    if (stats.size > 1024 * 1024) {
      console.log(`    Processing large Excel file (${Math.round(stats.size / 1024 / 1024)}MB)...`);
    }
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Extract text content from all worksheets
    let allTextContent = '';
    const worksheets: any[] = [];
    
    // Process each worksheet
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        if (loggingService) {
          loggingService.warn(`Warning: Sheet ${sheetName} is empty or invalid`);
        } else {
          console.warn(`    Warning: Sheet ${sheetName} is empty or invalid`);
        }
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
  } catch (error: any) {
    // Handle corrupted or password-protected Excel files
    if (error.message && (
      error.message.includes('password') ||
      error.message.includes('encrypted') ||
      error.message.includes('Unsupported file') ||
      error.message.includes('corrupted') ||
      error.message.includes('Invalid file')
    )) {
      const errorMessage = `Warning: Skipping protected or corrupted Excel file: ${relative(basePath, filePath)}`;
      if (loggingService) {
        loggingService.warn(errorMessage);
      } else {
        console.warn(`    ${errorMessage}`);
      }
      const stats = statSync(filePath);
      const errorMetadata: ExcelMetadata = {
        type: 'xlsx',
        originalPath: relative(basePath, filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        sheets: [],
        sheetCount: 0,
        error: 'protected_or_corrupted',
        errorMessage: 'Excel file is password-protected, encrypted, or corrupted'
      };
      return {
        content: '',
        type: 'excel',
        originalPath: relative(basePath, filePath),
        metadata: errorMetadata
      };
    }
    
    // Log the error and throw a structured error
    const errorMessage = `Failed to parse Excel file ${filePath}`;
    if (loggingService) {
      loggingService.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
    } else {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }
}

export async function parsePowerPointFile(filePath: string, basePath: string, loggingService?: ILoggingService): Promise<ParsedContent> {
  try {
    const relativePath = relative(basePath, filePath);
    const stats = statSync(filePath);
    
    // Show progress for large PowerPoint files (> 1MB)
    if (stats.size > 1024 * 1024) {
      console.log(`    Processing large PowerPoint file (${Math.round(stats.size / 1024 / 1024)}MB)...`);
    }
    
    // Read PowerPoint file
    const zip = new JSZip();
    const content = await zip.loadAsync(readFileSync(filePath));
    
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
        try {
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
        } catch (slideError) {
          if (loggingService) {
            loggingService.warn(`Warning: Failed to process slide ${filename}`, slideError instanceof Error ? slideError : new Error(String(slideError)));
          } else {
            console.warn(`    Warning: Failed to process slide ${filename}`);
          }
        }
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
  } catch (error: any) {
    // Handle corrupted or password-protected PowerPoint files
    if (error.message && (
      error.message.includes('password') ||
      error.message.includes('encrypted') ||
      error.message.includes('Unsupported file') ||
      error.message.includes('corrupted') ||
      error.message.includes('Invalid file')
    )) {
      const errorMessage = `Warning: Skipping protected or corrupted PowerPoint file: ${relative(basePath, filePath)}`;
      if (loggingService) {
        loggingService.warn(errorMessage);
      } else {
        console.warn(`    ${errorMessage}`);
      }
      const stats = statSync(filePath);
      const errorMetadata: PowerPointMetadata = {
        type: 'pptx',
        originalPath: relative(basePath, filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        slides: 0,
        slideCount: 0,
        error: 'protected_or_corrupted',
        errorMessage: 'PowerPoint file is password-protected, encrypted, or corrupted'
      };
      return {
        content: '',
        type: 'powerpoint',
        originalPath: relative(basePath, filePath),
        metadata: errorMetadata
      };
    }
    
    // Log the error and throw a structured error
    const errorMessage = `Failed to parse PowerPoint file ${filePath}`;
    if (loggingService) {
      loggingService.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
    } else {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }
}
