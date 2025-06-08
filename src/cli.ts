#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { glob } from 'glob';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as JSZip from 'jszip';
import * as xml2js from 'xml2js';

const program = new Command();

// Read package.json to get version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

program
  .name('folder-mcp')
  .description('Universal Folder-to-MCP-Server Tool - Transform any local folder into an intelligent knowledge base')
  .version(packageJson.version);

program
  .command('index')
  .description('Index a folder to create embeddings and vector database')
  .argument('<folder>', 'Path to the folder to index')
  .action(async (folder: string) => {
    await indexFolder(folder);
  });

async function setupCacheDirectory(folderPath: string): Promise<void> {
  try {
    const cacheDir = path.join(folderPath, '.folder-mcp-cache');
    
    console.log('Setting up cache directory...');
    
    // Create main cache directory
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
      console.log(`Created cache directory: ${path.relative(folderPath, cacheDir)}`);
    } else {
      console.log(`Cache directory already exists: ${path.relative(folderPath, cacheDir)}`);
    }

    // Create subdirectories
    const subdirs = ['embeddings', 'metadata', 'vectors'];
    for (const subdir of subdirs) {
      const subdirPath = path.join(cacheDir, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath);
        console.log(`Created subdirectory: ${path.relative(folderPath, subdirPath)}`);
      }
    }

    // Create version.json with tool version and timestamp
    const versionFile = path.join(cacheDir, 'version.json');
    const versionData = {
      toolVersion: packageJson.version,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
    console.log(`Created version file: ${path.relative(folderPath, versionFile)}`);

  } catch (error: any) {
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      console.error(`Permission error: Cannot create cache directory in "${folderPath}".`);
      console.error('Please ensure you have write permissions to this folder.');
      process.exit(1);
    } else {
      console.error(`Error setting up cache directory: ${error.message}`);
      process.exit(1);
    }
  }
}

interface FileFingerprint {
  hash: string;
  path: string;
  size: number;
  modified: string;
}

interface CacheIndex {
  generated: string;
  fileCount: number;
  files: FileFingerprint[];
}

interface CacheStatus {
  newFiles: FileFingerprint[];
  modifiedFiles: FileFingerprint[];
  deletedFiles: FileFingerprint[];
  unchangedFiles: FileFingerprint[];
}

function loadPreviousIndex(cacheDir: string): CacheIndex | null {
  const indexFile = path.join(cacheDir, 'index.json');
  
  if (!fs.existsSync(indexFile)) {
    return null;
  }
  
  try {
    const indexContent = fs.readFileSync(indexFile, 'utf8');
    return JSON.parse(indexContent) as CacheIndex;
  } catch (error) {
    console.warn(`Warning: Could not load previous index: ${error}`);
    return null;
  }
}

function detectCacheStatus(currentFingerprints: FileFingerprint[], previousIndex: CacheIndex | null): CacheStatus {
  const status: CacheStatus = {
    newFiles: [],
    modifiedFiles: [],
    deletedFiles: [],
    unchangedFiles: []
  };
  
  if (!previousIndex) {
    // If no previous index, all files are new
    status.newFiles = [...currentFingerprints];
    return status;
  }
  
  // Create lookup maps for efficient comparison
  const previousFiles = new Map<string, FileFingerprint>();
  previousIndex.files.forEach(file => {
    previousFiles.set(file.path, file);
  });
  
  const currentFiles = new Map<string, FileFingerprint>();
  currentFingerprints.forEach(file => {
    currentFiles.set(file.path, file);
  });
  
  // Check current files against previous
  for (const currentFile of currentFingerprints) {
    const previousFile = previousFiles.get(currentFile.path);
    
    if (!previousFile) {
      // File is new
      status.newFiles.push(currentFile);
    } else if (previousFile.hash !== currentFile.hash) {
      // File is modified (hash changed)
      status.modifiedFiles.push(currentFile);
    } else {
      // File is unchanged
      status.unchangedFiles.push(currentFile);
    }
  }
  
  // Check for deleted files (in previous but not in current)
  for (const previousFile of previousIndex.files) {
    if (!currentFiles.has(previousFile.path)) {
      status.deletedFiles.push(previousFile);
    }
  }
  
  return status;
}

function displayCacheStatus(status: CacheStatus): void {
  const counts = [
    status.newFiles.length > 0 ? `${status.newFiles.length} new` : null,
    status.modifiedFiles.length > 0 ? `${status.modifiedFiles.length} modified` : null,
    status.deletedFiles.length > 0 ? `${status.deletedFiles.length} deleted` : null
  ].filter(Boolean);
  
  if (counts.length === 0) {
    console.log('Cache status: All files up to date');
  } else {
    console.log(`Cache status: ${counts.join(', ')}`);
  }
  
  // Show details if there are changes
  if (status.newFiles.length > 0) {
    console.log(`\nNew files (${status.newFiles.length}):`);
    status.newFiles.forEach(file => console.log(`  + ${file.path}`));
  }
  
  if (status.modifiedFiles.length > 0) {
    console.log(`\nModified files (${status.modifiedFiles.length}):`);
    status.modifiedFiles.forEach(file => console.log(`  * ${file.path}`));
  }
  
  if (status.deletedFiles.length > 0) {
    console.log(`\nDeleted files (${status.deletedFiles.length}):`);
    status.deletedFiles.forEach(file => console.log(`  - ${file.path}`));
  }
}

interface ParsedContent {
  content: string;
  type: string;
  originalPath: string;
  metadata?: any;
}

async function parseTextFile(filePath: string, basePath: string): Promise<ParsedContent> {
  try {
    // Read file with UTF-8 encoding
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Normalize line endings (handle CRLF/LF)
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const relativePath = path.relative(basePath, filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    const fileType = ext === '.md' ? 'markdown' : 'text';
    
    return {
      content: normalizedContent,
      type: fileType,
      originalPath: relativePath,
      metadata: {
        encoding: 'utf-8',
        lineCount: normalizedContent.split('\n').length,
        charCount: normalizedContent.length,
        extension: ext
      }
    };
  } catch (error) {
    throw new Error(`Failed to parse text file ${filePath}: ${error}`);
  }
}

async function parsePdfFile(filePath: string, basePath: string): Promise<ParsedContent> {
  try {
    const relativePath = path.relative(basePath, filePath);
    const stats = fs.statSync(filePath);
    
    // Show progress for large PDFs (> 1MB)
    if (stats.size > 1024 * 1024) {
      console.log(`    Processing large PDF (${Math.round(stats.size / 1024 / 1024)}MB)...`);
    }
    
    // Read PDF file as buffer
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF
    const pdfData = await pdfParse(dataBuffer);
    
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
    
    return {
      content: pdfData.text || '',
      type: 'pdf',
      originalPath: relativePath,
      metadata: {
        totalPages: pdfData.numpages || pages.length,
        pages: pages,
        pageCount: pages.length,
        info: pdfData.info || {},
        version: pdfData.version || 'unknown',
        charCount: (pdfData.text || '').length,
        extension: '.pdf'
      }
    };
  } catch (error: any) {
    // Handle encrypted PDFs gracefully
    if (error.message && (
      error.message.includes('encrypted') || 
      error.message.includes('password') ||
      error.message.includes('Invalid PDF')
    )) {
      console.warn(`    Warning: Skipping encrypted or password-protected PDF: ${path.relative(basePath, filePath)}`);
      return {
        content: '',
        type: 'pdf',
        originalPath: path.relative(basePath, filePath),
        metadata: {
          error: 'encrypted_or_protected',
          errorMessage: 'PDF is encrypted or password-protected',
          totalPages: 0,
          pages: [],
          pageCount: 0,
          extension: '.pdf'
        }
      };
    }
    
    throw new Error(`Failed to parse PDF file ${filePath}: ${error.message}`);
  }
}

async function parseWordFile(filePath: string, basePath: string): Promise<ParsedContent> {
  try {
    const relativePath = path.relative(basePath, filePath);
    const stats = fs.statSync(filePath);
    
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
    
    return {
      content: textContent,
      type: 'word',
      originalPath: relativePath,
      metadata: {
        charCount: textContent.length,
        wordCount: words.length,
        paragraphCount: paragraphs.length,
        htmlContent: htmlContent,
        hasImages: htmlContent.includes('<img'),
        hasTables: htmlContent.includes('<table'),
        hasLinks: htmlContent.includes('<a '),
        warnings: warnings.length > 0 ? warnings.map(w => w.message) : [],
        htmlWarnings: htmlWarnings.length > 0 ? htmlWarnings.map(w => w.message) : [],
        extension: '.docx',
        fileSize: stats.size
      }
    };
  } catch (error: any) {
    // Handle corrupted or unsupported Word documents
    if (error.message && (
      error.message.includes('corrupted') || 
      error.message.includes('not a valid') ||
      error.message.includes('ENOENT') ||
      error.message.includes('unexpected end of file')
    )) {
      console.warn(`    Warning: Skipping corrupted or invalid Word document: ${path.relative(basePath, filePath)}`);
      return {
        content: '',
        type: 'word',
        originalPath: path.relative(basePath, filePath),
        metadata: {
          error: 'corrupted_or_invalid',
          errorMessage: 'Word document is corrupted or invalid',
          charCount: 0,
          wordCount: 0,
          paragraphCount: 0,
          extension: '.docx'
        }
      };
    }
    
    throw new Error(`Failed to parse Word document ${filePath}: ${error.message}`);
  }
}

async function parseExcelFile(filePath: string, basePath: string): Promise<ParsedContent> {
  try {
    const relativePath = path.relative(basePath, filePath);
    const stats = fs.statSync(filePath);
    
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
    
    return {
      content: allTextContent.trim(),
      type: 'excel',
      originalPath: relativePath,
      metadata: {
        charCount: allTextContent.length,
        worksheetCount: workbook.SheetNames.length,
        worksheets: worksheets,
        sheetNames: workbook.SheetNames,
        totalRows: totalRows,
        totalCells: totalCells,
        totalFormulas: totalFormulas,
        hasFormulas: totalFormulas > 0,
        fileSize: stats.size,
        extension: '.xlsx',
        workbookProps: workbook.Props || {}
      }
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
      console.warn(`    Warning: Skipping protected or corrupted Excel file: ${path.relative(basePath, filePath)}`);
      return {
        content: '',
        type: 'excel',
        originalPath: path.relative(basePath, filePath),
        metadata: {
          error: 'protected_or_corrupted',
          errorMessage: 'Excel file is password-protected, encrypted, or corrupted',
          worksheetCount: 0,
          totalRows: 0,
          totalCells: 0,
          extension: '.xlsx'
        }
      };
    }
    
    throw new Error(`Failed to parse Excel file ${filePath}: ${error.message}`);
  }
}

async function parsePowerPointFile(filePath: string, basePath: string): Promise<ParsedContent> {
  try {
    const relativePath = path.relative(basePath, filePath);
    const stats = fs.statSync(filePath);
    
    // Show progress for large PowerPoint files (> 5MB)
    if (stats.size > 5 * 1024 * 1024) {
      console.log(`    Processing large PowerPoint file (${Math.round(stats.size / 1024 / 1024)}MB)...`);
    }
    
    // Read PowerPoint file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    
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
      const slideFile = zip.file(slideFiles[i]);
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
          if (sentences.length > 0 && sentences[0].length < 100) {
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
    
    return {
      content: allTextContent.trim(),
      type: 'powerpoint',
      originalPath: relativePath,
      metadata: {
        charCount: allTextContent.length,
        wordCount: words.length,
        slideCount: slideCount,
        slides: slides,
        hasImages: totalImages > 0,
        hasCharts: totalCharts > 0,
        hasTables: totalTables > 0,
        totalImages: totalImages,
        totalCharts: totalCharts,
        totalTables: totalTables,
        fileSize: stats.size,
        extension: '.pptx',
        presentationProps: presentationProps
      }
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
      console.warn(`    Warning: Skipping protected or corrupted PowerPoint file: ${path.relative(basePath, filePath)}`);
      return {
        content: '',
        type: 'powerpoint',
        originalPath: path.relative(basePath, filePath),
        metadata: {
          error: 'protected_or_corrupted',
          errorMessage: 'PowerPoint file is password-protected, encrypted, or corrupted',
          slideCount: 0,
          charCount: 0,
          wordCount: 0,
          extension: '.pptx'
        }
      };
    }
    
    throw new Error(`Failed to parse PowerPoint file ${filePath}: ${error.message}`);
  }
}

async function saveContentToCache(parsedContent: ParsedContent, hash: string, cacheDir: string): Promise<void> {
  const metadataDir = path.join(cacheDir, 'metadata');
  const metadataFile = path.join(metadataDir, `${hash}.json`);
  
  const metadataContent = {
    ...parsedContent,
    cachedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(metadataFile, JSON.stringify(metadataContent, null, 2));
}

async function processFiles(fingerprints: FileFingerprint[], basePath: string, cacheDir: string): Promise<void> {
  console.log('Processing file content...');
  
  for (let i = 0; i < fingerprints.length; i++) {
    const fingerprint = fingerprints[i];
    const fullPath = path.join(basePath, fingerprint.path);
    const ext = path.extname(fingerprint.path).toLowerCase();
    
    try {
      if (ext === '.txt' || ext === '.md') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parseTextFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else if (ext === '.pdf') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parsePdfFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else if (ext === '.docx') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parseWordFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else if (ext === '.xlsx') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parseExcelFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else if (ext === '.pptx') {
        console.log(`  ${i + 1}/${fingerprints.length}: Parsing ${fingerprint.path}`);
        const parsedContent = await parsePowerPointFile(fullPath, basePath);
        await saveContentToCache(parsedContent, fingerprint.hash, cacheDir);
      } else {
        console.log(`  ${i + 1}/${fingerprints.length}: Skipping ${fingerprint.path} (parser not implemented yet)`);
      }
    } catch (error) {
      console.warn(`  Warning: Could not process ${fingerprint.path}: ${error}`);
    }
  }
}

function generateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function createFileFingerprint(filePath: string, basePath: string): FileFingerprint {
  const stats = fs.statSync(filePath);
  const relativePath = path.relative(basePath, filePath);
  const hash = generateFileHash(filePath);
  
  return {
    hash,
    path: relativePath,
    size: stats.size,
    modified: stats.mtime.toISOString()
  };
}

async function generateFingerprints(files: string[], basePath: string): Promise<FileFingerprint[]> {
  console.log('Generating file fingerprints...');
  const fingerprints: FileFingerprint[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fingerprint = createFileFingerprint(file, basePath);
      fingerprints.push(fingerprint);
      console.log(`  ${i + 1}/${files.length}: ${fingerprint.path}`);
    } catch (error) {
      console.warn(`  Warning: Could not fingerprint ${path.relative(basePath, file)}: ${error}`);
    }
  }
  
  return fingerprints;
}

async function saveFingerprintsToCache(fingerprints: FileFingerprint[], cacheDir: string): Promise<void> {
  const indexFile = path.join(cacheDir, 'index.json');
  const indexData = {
    generated: new Date().toISOString(),
    fileCount: fingerprints.length,
    files: fingerprints
  };
  
  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
  console.log(`Saved fingerprints to: ${path.basename(indexFile)}`);
}

async function indexFolder(folderPath: string): Promise<void> {
  try {
    // Check if folder exists
    const resolvedPath = path.resolve(folderPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Folder "${folderPath}" does not exist.`);
      process.exit(1);
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      console.error(`Error: "${folderPath}" is not a directory.`);
      process.exit(1);
    }

    console.log(`Scanning folder: ${resolvedPath}`);
    console.log('');

    // Supported file extensions (case-insensitive)
    const supportedExtensions = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'];
    
    // Find all files recursively
    const pattern = path.join(resolvedPath, '**', '*').replace(/\\/g, '/');
    const allFiles = await glob(pattern, { 
      nodir: true,  // Only files, not directories
      dot: false,   // Ignore hidden files
      ignore: ['**/.folder-mcp-cache/**']  // Exclude our cache directory
    });

    // Additional filter to ensure no cache files slip through
    const filteredFiles = allFiles.filter(file => {
      const relativePath = path.relative(resolvedPath, file);
      return !relativePath.includes('.folder-mcp-cache');
    });

    // Filter by supported extensions (case-insensitive)
    const supportedFiles = filteredFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return supportedExtensions.includes(ext);
    });

    if (supportedFiles.length === 0) {
      console.log('No supported files found in the folder.');
      console.log(`Supported file types: ${supportedExtensions.join(', ')}`);
      return;
    }

    // Convert to relative paths from the target folder
    const relativePaths = supportedFiles.map(file => {
      return path.relative(resolvedPath, file);
    });

    // Count files by type
    const fileTypeCounts: { [key: string]: number } = {};
    const fileTypeNames: { [key: string]: string } = {
      '.txt': 'Text',
      '.md': 'Markdown',
      '.pdf': 'PDFs',
      '.docx': 'Word',
      '.xlsx': 'Excel',
      '.pptx': 'PowerPoint'
    };

    supportedFiles.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      fileTypeCounts[ext] = (fileTypeCounts[ext] || 0) + 1;
    });

    // Display file counts by type
    const typeCountStrings = Object.entries(fileTypeCounts)
      .map(([ext, count]) => `${fileTypeNames[ext]}: ${count}`)
      .join(', ');
    
    console.log(`Found ${supportedFiles.length} supported files (${typeCountStrings})`);
    console.log('');

    // Setup cache directory
    await setupCacheDirectory(resolvedPath);
    console.log('');

    // Load previous index for comparison
    const cacheDir = path.join(resolvedPath, '.folder-mcp-cache');
    const previousIndex = loadPreviousIndex(cacheDir);
    
    // Generate fingerprints for all supported files
    const fingerprints = await generateFingerprints(supportedFiles, resolvedPath);
    console.log('');

    // Detect cache status (new, modified, deleted files)
    const cacheStatus = detectCacheStatus(fingerprints, previousIndex);
    displayCacheStatus(cacheStatus);
    console.log('');

    // Process file content (parse and cache)
    await processFiles(fingerprints, resolvedPath, cacheDir);
    console.log('');

    // Save fingerprints to cache
    await saveFingerprintsToCache(fingerprints, cacheDir);
    console.log('');

    // Display all files
    console.log('Supported files found:');
    relativePaths.forEach(file => {
      console.log(`  ${file}`);
    });

    console.log('');
    console.log(`Total supported files: ${supportedFiles.length}`);

  } catch (error) {
    console.error(`Error scanning folder: ${error}`);
    process.exit(1);
  }
}

program.parse();
