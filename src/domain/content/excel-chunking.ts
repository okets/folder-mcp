/**
 * Sprint 11: Excel Document Format-Aware Chunking
 * 
 * Implements chunking that respects Excel sheet structure using xlsx's
 * natural cell address coordinate system (A1, B2, etc.) for precise extraction.
 */

import XLSX from 'xlsx';
import { ParsedContent, TextChunk, ChunkedContent, ExcelMetadata, createDefaultSemanticMetadata } from '../../types/index.js';
import { ExtractionParamsFactory } from '../extraction/extraction-params.factory.js';
import { ExtractionParamsValidator } from '../extraction/extraction-params.validator.js';
import { ExcelExtractionParams } from '../extraction/extraction-params.types.js';

/**
 * Represents a worksheet structure for chunking
 */
interface WorksheetStructure {
    name: string;
    index: number;
    range: XLSX.Range | string | null;  // Can be either Range object or string like "A1:Z100"
    rowCount: number;
    colCount: number;
    csvContent: string;
    jsonData: any[][];
    hasFormulas: boolean;
    formulas: string[];
}

/**
 * Service for Excel document format-aware chunking
 */
export class ExcelChunkingService {
    private readonly DEFAULT_MAX_TOKENS = 1000;
    private readonly DEFAULT_MIN_TOKENS = 100;
    private readonly DEFAULT_MAX_ROWS_PER_CHUNK = 50;
    
    /**
     * Chunk an Excel document respecting sheet boundaries
     */
    public chunkExcelDocument(
        content: ParsedContent,
        maxTokens: number = this.DEFAULT_MAX_TOKENS,
        minTokens: number = this.DEFAULT_MIN_TOKENS
    ): ChunkedContent {
        if (content.type !== 'excel') {
            throw new Error('Content must be an Excel document');
        }
        
        const metadata = content.metadata as ExcelMetadata;
        
        // Get worksheet structures from metadata
        const worksheets = metadata.worksheets as WorksheetStructure[];
        
        if (!worksheets || worksheets.length === 0) {
            throw new Error('Excel document has no worksheets');
        }
        
        // Create chunks respecting sheet boundaries
        const chunks = this.createSheetAwareChunks(
            worksheets,
            content.content,
            maxTokens,
            minTokens
        );
        
        return {
            originalContent: content,
            chunks,
            totalChunks: chunks.length
        };
    }
    
    /**
     * Create chunks respecting sheet boundaries
     */
    private createSheetAwareChunks(
        worksheets: WorksheetStructure[],
        fullText: string,
        maxTokens: number,
        minTokens: number
    ): TextChunk[] {
        const chunks: TextChunk[] = [];
        
        for (const worksheet of worksheets) {
            if (!worksheet.csvContent || !worksheet.csvContent.trim()) {
                continue;
            }
            
            const sheetChunks = this.chunkSingleSheet(
                worksheet,
                fullText,
                chunks.length,
                maxTokens,
                minTokens
            );
            
            chunks.push(...sheetChunks);
        }
        
        return chunks;
    }
    
    /**
     * Chunk a single sheet into text chunks
     */
    private chunkSingleSheet(
        worksheet: WorksheetStructure,
        fullText: string,
        startChunkIndex: number,
        maxTokens: number,
        minTokens: number
    ): TextChunk[] {
        const chunks: TextChunk[] = [];
        
        // Parse CSV content into rows
        const rows = worksheet.csvContent.split('\n');
        if (rows.length === 0) {
            return chunks;
        }
        
        // Keep header row with each chunk
        const headerRow = rows[0] || '';
        const headerTokens = Math.ceil(headerRow.length / 4);
        
        let currentChunk: {
            rows: string[];
            text: string;
            tokenCount: number;
            startRow: number;
            endRow: number;
            startCol: string;
            endCol: string;
        } | null = null;
        
        // Start from row 1 (skip header, we'll add it to each chunk)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i] || '';
            if (!row.trim()) continue;
            
            const rowTokens = Math.ceil(row.length / 4);
            
            if (!currentChunk) {
                // Start new chunk with header
                currentChunk = {
                    rows: [headerRow, row],
                    text: headerRow + '\n' + row,
                    tokenCount: headerTokens + rowTokens,
                    startRow: 1, // Excel uses 1-based rows
                    endRow: i + 1, // Convert to 1-based
                    startCol: 'A',
                    endCol: this.getLastColumn(worksheet)
                };
            } else {
                // Check if adding this row would exceed max tokens
                const potentialTokens = currentChunk.tokenCount + rowTokens;
                
                if (potentialTokens > maxTokens && currentChunk.tokenCount >= minTokens) {
                    // Save current chunk
                    chunks.push(this.createChunk(
                        currentChunk.text,
                        startChunkIndex + chunks.length,
                        fullText,
                        worksheet.name,
                        currentChunk
                    ));
                    
                    // Start new chunk with header
                    currentChunk = {
                        rows: [headerRow, row],
                        text: headerRow + '\n' + row,
                        tokenCount: headerTokens + rowTokens,
                        startRow: i + 1, // Convert to 1-based
                        endRow: i + 1,
                        startCol: 'A',
                        endCol: this.getLastColumn(worksheet)
                    };
                } else {
                    // Add row to current chunk
                    currentChunk.rows.push(row);
                    currentChunk.text += '\n' + row;
                    currentChunk.tokenCount += rowTokens;
                    currentChunk.endRow = i + 1; // Convert to 1-based
                }
            }
        }
        
        // Save final chunk
        if (currentChunk && currentChunk.text.trim()) {
            chunks.push(this.createChunk(
                currentChunk.text,
                startChunkIndex + chunks.length,
                fullText,
                worksheet.name,
                currentChunk
            ));
        }
        
        return chunks;
    }
    
    /**
     * Get the last column letter from worksheet range
     */
    private getLastColumn(worksheet: WorksheetStructure): string {
        if (worksheet.range && typeof worksheet.range === 'object' && 'e' in worksheet.range) {
            return XLSX.utils.encode_col((worksheet.range as any).e.c);
        }
        // If range is a string like "A1:Z100", extract the last column
        if (typeof worksheet.range === 'string' && worksheet.range.includes(':')) {
            const parts = worksheet.range.split(':');
            if (parts.length === 2 && parts[1]) {
                const endCell = parts[1];
                // Extract column letters from cell address (e.g., "Z100" -> "Z")
                const match = endCell.match(/^([A-Z]+)/);
                if (match && match[1]) {
                    return match[1];
                }
            }
        }
        // Default to column Z if no range
        return 'Z';
    }
    
    /**
     * Create a single chunk with extraction parameters
     */
    private createChunk(
        text: string,
        index: number,
        fullText: string,
        sheetName: string,
        chunkData: {
            startRow: number;
            endRow: number;
            startCol: string;
            endCol: string;
        }
    ): TextChunk {
        // Find byte offsets in full text
        const sheetMarker = `=== Sheet: ${sheetName} ===`;
        const sheetStart = fullText.indexOf(sheetMarker);
        const textStart = fullText.indexOf(text, sheetStart);
        const startOffset = textStart >= 0 ? textStart : 0;
        const endOffset = startOffset + text.length;
        
        // Create extraction params using factory
        const extractionParams = ExtractionParamsFactory.createExcelParams(
            sheetName,
            chunkData.startRow,
            chunkData.endRow,
            chunkData.startCol,
            chunkData.endCol
        );
        
        // Serialize extraction params
        const serializedParams = ExtractionParamsValidator.serialize(extractionParams);
        
        return {
            content: text,
            startPosition: startOffset,
            endPosition: endOffset,
            tokenCount: Math.ceil(text.length / 4),
            chunkIndex: index,
            metadata: {
                sourceFile: '',
                sourceType: 'excel',
                totalChunks: 0,
                hasOverlap: false,
                // Store extraction params in metadata
                ...{ extractionParams: serializedParams }
            },
            semanticMetadata: createDefaultSemanticMetadata()
        };
    }
    
    /**
     * Extract content using Excel extraction parameters
     * This enables bidirectional chunk translation
     */
    public async extractByParams(
        filePath: string,
        extractionParams: string
    ): Promise<string> {
        const params = ExtractionParamsValidator.deserialize(extractionParams);
        
        if (params.type !== 'excel') {
            throw new Error('Invalid extraction params type for Excel document');
        }
        
        const excelParams = params as ExcelExtractionParams;
        
        // Read the Excel file
        const workbook = XLSX.readFile(filePath);
        
        // Validate sheet exists
        if (!workbook.SheetNames.includes(excelParams.sheet)) {
            throw new Error(`Sheet '${excelParams.sheet}' not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
        }
        
        // Get the worksheet
        const worksheet = workbook.Sheets[excelParams.sheet];
        if (!worksheet) {
            throw new Error(`Failed to load sheet '${excelParams.sheet}'`);
        }
        
        // Get sheet range
        const sheetRange = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
        if (!sheetRange) {
            throw new Error(`Sheet '${excelParams.sheet}' has no data`);
        }
        
        // Convert column letters to indices
        const startColIndex = XLSX.utils.decode_col(excelParams.startCol);
        const endColIndex = XLSX.utils.decode_col(excelParams.endCol);
        
        // Validate row and column ranges
        // Convert 1-based rows to 0-based for internal use
        const startRow0 = excelParams.startRow - 1;
        const endRow0 = excelParams.endRow - 1;
        
        if (startRow0 < sheetRange.s.r || startRow0 > sheetRange.e.r) {
            throw new Error(`Start row ${excelParams.startRow} is out of range. Sheet has rows ${sheetRange.s.r + 1} to ${sheetRange.e.r + 1}`);
        }
        
        if (endRow0 < startRow0 || endRow0 > sheetRange.e.r) {
            throw new Error(`End row ${excelParams.endRow} is out of range. Sheet has rows ${sheetRange.s.r + 1} to ${sheetRange.e.r + 1}`);
        }
        
        if (startColIndex < sheetRange.s.c || startColIndex > sheetRange.e.c) {
            throw new Error(`Start column ${excelParams.startCol} is out of range`);
        }
        
        if (endColIndex < startColIndex || endColIndex > sheetRange.e.c) {
            throw new Error(`End column ${excelParams.endCol} is out of range`);
        }
        
        // Extract the specified range
        const extractedRows: string[][] = [];
        
        for (let r = startRow0; r <= endRow0; r++) {
            const row: string[] = [];
            for (let c = startColIndex; c <= endColIndex; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r, c });
                const cell = worksheet[cellAddress];
                
                // Get cell value or formula
                if (cell) {
                    if (cell.f) {
                        // If cell has formula, include it
                        row.push(`=${cell.f}`);
                    } else if (cell.v !== undefined) {
                        // Otherwise use the value
                        row.push(String(cell.v));
                    } else {
                        row.push('');
                    }
                } else {
                    row.push('');
                }
            }
            extractedRows.push(row);
        }
        
        // Convert to CSV format (matching how we chunk)
        const extractedText = extractedRows
            .map(row => row.join(','))
            .join('\n');
        
        return extractedText;
    }
}