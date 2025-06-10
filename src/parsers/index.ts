import { readFileSync, statSync } from 'fs';
import { relative, extname } from 'path';
import * as mammoth from 'mammoth';
import XLSX from 'xlsx';
import JSZip from 'jszip';
import * as xml2js from 'xml2js';
import { ParsedContent, TextMetadata, PDFMetadata, WordMetadata, ExcelMetadata, PowerPointMetadata } from '../types/index.js';

// Lazy load pdf-parse to avoid initialization issues
let pdfParse: any = null;
async function getPdfParse() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  return pdfParse;
}

export async function parseTextFile(filePath: string, basePath: string): Promise<ParsedContent> {
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
    throw new Error(`Failed to parse text file ${filePath}: ${error}`);
  }
}

export async function parsePdfFile(filePath: string, basePath: string): Promise<ParsedContent> {
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
      console.warn(`    Warning: Skipping encrypted or password-protected PDF: ${relative(basePath, filePath)}`);
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
    
    throw new Error(`Failed to parse PDF file ${filePath}: ${error.message}`);
  }
}

export async function parseWordFile(filePath: string, basePath: string): Promise<ParsedContent> {
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
      console.warn(`    Warning: Skipping corrupted or invalid Word document: ${relative(basePath, filePath)}`);
      const stats = statSync(filePath);
      const errorMetadata: WordMetadata = {
        type: 'docx',
        originalPath: relative(basePath, filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        paragraphs: 0,
        error: 'corrupted_or_invalid',
        errorMessage: 'Word document is corrupted or invalid'
      };
      return {
        content: '',
        type: 'word',
        originalPath: relative(basePath, filePath),
        metadata: errorMetadata
      };
    }
    
    throw new Error(`Failed to parse Word document ${filePath}: ${error.message}`);
  }
}

export async function parseExcelFile(filePath: string, basePath: string): Promise<ParsedContent> {
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
        console.warn(`    Warning: Sheet ${sheetName} is empty or invalid`);
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
      console.warn(`    Warning: Skipping protected or corrupted Excel file: ${relative(basePath, filePath)}`);
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
    
    throw new Error(`Failed to parse Excel file ${filePath}: ${error.message}`);
  }
}

export async function parsePowerPointFile(filePath: string, basePath: string): Promise<ParsedContent> {
  try {
    const relativePath = relative(basePath, filePath);
    const stats = statSync(filePath);
    
    // Show progress for large PowerPoint files (> 5MB)
    if (stats.size > 5 * 1024 * 1024) {
      console.log(`    Processing large PowerPoint file (${Math.round(stats.size / 1024 / 1024)}MB)...`);
    }
    
    // Read PowerPoint file as buffer
    const fileBuffer = readFileSync(filePath);
    
    // Load as ZIP archive
    const zip = await JSZip.loadAsync(fileBuffer);
    
    let allTextContent = '';
    const slides: any[] = [];
    let slideCount = 0;
    
    // Extract presentation properties
    let presentationProps: any = {};
    const appPropsFile = zip.file('docProps/app.xml');
    if (appPropsFile) {
      try {
        const appPropsXml = await appPropsFile.async('string');
        const parsed = await xml2js.parseStringPromise(appPropsXml);
        if (parsed.Properties) {
          presentationProps = {
            application: parsed.Properties.Application?.[0] || 'Unknown',
            slides: parsed.Properties.Slides?.[0] || '0',
            company: parsed.Properties.Company?.[0] || '',
            createdDate: parsed.Properties.CreatedDate?.[0] || ''
          };
        }
      } catch (error) {
        // Ignore app props parsing errors
      }
    }
    
    // Find all slide files
    const slideFiles = Object.keys(zip.files).filter(filename => 
      filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
    );
    
    slideCount = slideFiles.length;
    
    // Process each slide
    for (let i = 0; i < slideFiles.length; i++) {
      const slideFilename = slideFiles[i];
      if (!slideFilename) continue;
      
      const slideFile = zip.file(slideFilename);
      if (!slideFile) continue;
      
      try {
        const slideXml = await slideFile.async('string');
        const slideData: any = {
          slideNumber: i + 1,
          title: '',
          content: '',
          hasImages: false,
          hasCharts: false,
          hasTables: false,
          textElements: []
        };
        
        // Parse slide XML
        const parsed = await xml2js.parseStringPromise(slideXml);
        
        let slideText = '';
        
        // Extract text from the slide
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
        
        if (parsed['p:sld']) {
          slideText = extractTextFromNode(parsed['p:sld']);
          
          // Detect slide elements
          const slideXmlString = slideXml.toLowerCase();
          slideData.hasImages = slideXmlString.includes('<p:pic') || slideXmlString.includes('<a:blip');
          slideData.hasCharts = slideXmlString.includes('<c:chart') || slideXmlString.includes('chart');
          slideData.hasTables = slideXmlString.includes('<a:tbl') || slideXmlString.includes('table');
        }
        
        // Clean and structure the text
        slideText = slideText.replace(/\s+/g, ' ').trim();
        
        if (slideText) {
          // Try to identify title (usually the first significant text block)
          const sentences = slideText.split(/[.!?]\s+/);
          if (sentences.length > 0 && sentences[0] && sentences[0].length < 100) {
            slideData.title = sentences[0].trim();
            slideData.content = sentences.slice(1).join('. ').trim();
          } else {
            slideData.content = slideText;
          }
          
          slideData.textElements.push(slideText);
          slides.push(slideData);
          
          // Add to overall text content
          allTextContent += `\n\n=== Slide ${i + 1} ===\n${slideText}`;
        } else {
          // Even if no text, add slide info for completeness
          slideData.content = '[No text content]';
          slides.push(slideData);
        }
        
      } catch (error) {
        console.warn(`    Warning: Could not parse slide ${i + 1}: ${error}`);
        slides.push({
          slideNumber: i + 1,
          title: '',
          content: '[Parse error]',
          hasImages: false,
          hasCharts: false,
          hasTables: false,
          textElements: []
        });
      }
    }
    
    // Calculate summary statistics
    const totalImages = slides.reduce((sum, slide) => sum + (slide.hasImages ? 1 : 0), 0);
    const totalCharts = slides.reduce((sum, slide) => sum + (slide.hasCharts ? 1 : 0), 0);
    const totalTables = slides.reduce((sum, slide) => sum + (slide.hasTables ? 1 : 0), 0);
    
    // Count words across all slides
    const words = allTextContent.trim().split(/\s+/).filter(w => w.length > 0);

    const metadata: PowerPointMetadata = {
      type: 'pptx',
      originalPath: relativePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      slides: slideCount,
      charCount: allTextContent.length,
      wordCount: words.length,
      slideData: slides,
      hasImages: totalImages > 0,
      hasCharts: totalCharts > 0,
      hasTables: totalTables > 0,
      totalImages: totalImages,
      totalCharts: totalCharts,
      totalTables: totalTables,
      ...(Object.keys(presentationProps).length > 0 && {
        presentationProperties: {
          title: presentationProps.title,
          author: presentationProps.author,
          subject: presentationProps.subject,
          created: presentationProps.createdDate,
          modified: presentationProps.modifiedDate
        }
      })
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
      error.message.includes('corrupted') ||
      error.message.includes('Invalid') ||
      error.message.includes('not a valid') ||
      error.message.includes('ZIP') ||
      error.message.includes('End of central directory')
    )) {
      console.warn(`    Warning: Skipping protected or corrupted PowerPoint file: ${relative(basePath, filePath)}`);
      const stats = statSync(filePath);
      const errorMetadata: PowerPointMetadata = {
        type: 'pptx',
        originalPath: relative(basePath, filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        slides: 0,
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
    
    throw new Error(`Failed to parse PowerPoint file ${filePath}: ${error.message}`);
  }
}
