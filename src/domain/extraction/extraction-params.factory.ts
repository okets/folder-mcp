/**
 * Sprint 11: Factory for creating normalized extraction parameters
 * 
 * Provides type-safe methods for creating extraction params for each file type.
 * Ensures consistent structure and validation at creation time.
 */

import {
    TextExtractionParams,
    MarkdownExtractionParams,
    PdfExtractionParams,
    ExcelExtractionParams,
    PowerPointExtractionParams,
    WordExtractionParams,
    EXTRACTION_PARAMS_VERSION
} from './extraction-params.types.js';

/**
 * Factory class for creating extraction parameters
 * Single Responsibility: Create valid, normalized extraction params
 */
export class ExtractionParamsFactory {
    /**
     * Create extraction params for text files
     */
    static createTextParams(startLine: number, endLine: number): TextExtractionParams {
        if (startLine < 1) {
            throw new Error('startLine must be >= 1');
        }
        if (endLine < startLine) {
            throw new Error('endLine must be >= startLine');
        }
        
        return {
            type: 'text',
            version: EXTRACTION_PARAMS_VERSION,
            startLine,
            endLine
        };
    }
    
    /**
     * Create extraction params for markdown files
     */
    static createMarkdownParams(
        startLine: number, 
        endLine: number, 
        section?: string
    ): MarkdownExtractionParams {
        if (startLine < 1) {
            throw new Error('startLine must be >= 1');
        }
        if (endLine < startLine) {
            throw new Error('endLine must be >= startLine');
        }
        
        return {
            type: 'markdown',
            version: EXTRACTION_PARAMS_VERSION,
            startLine,
            endLine,
            ...(section && { section })
        };
    }
    
    /**
     * Create extraction params for PDF files with pdf2json coordinates
     */
    static createPdfParams(
        page: number, 
        startTextBlock: number, 
        endTextBlock: number,
        coordinates?: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
        }
    ): PdfExtractionParams {
        if (page < 0) {
            throw new Error('page must be >= 0 (0-based index)');
        }
        if (startTextBlock < 0) {
            throw new Error('startTextBlock must be >= 0');
        }
        if (endTextBlock < startTextBlock) {
            throw new Error('endTextBlock must be >= startTextBlock');
        }
        
        return {
            type: 'pdf',
            version: EXTRACTION_PARAMS_VERSION,
            page,
            startTextBlock,
            endTextBlock,
            ...(coordinates?.x !== undefined && { x: coordinates.x }),
            ...(coordinates?.y !== undefined && { y: coordinates.y }),
            ...(coordinates?.width !== undefined && { width: coordinates.width }),
            ...(coordinates?.height !== undefined && { height: coordinates.height })
        };
    }
    
    /**
     * Create extraction params for Excel files
     */
    static createExcelParams(
        sheet: string, 
        startRow: number, 
        endRow: number,
        startCol: string,
        endCol: string
    ): ExcelExtractionParams {
        if (!sheet || sheet.trim() === '') {
            throw new Error('sheet name cannot be empty');
        }
        if (startRow < 1) {
            throw new Error('startRow must be >= 1');
        }
        if (endRow < startRow) {
            throw new Error('endRow must be >= startRow');
        }
        if (!this.isValidColumnLetter(startCol)) {
            throw new Error('startCol must be a valid column letter (A-ZZ)');
        }
        if (!this.isValidColumnLetter(endCol)) {
            throw new Error('endCol must be a valid column letter (A-ZZ)');
        }
        if (this.columnToNumber(endCol) < this.columnToNumber(startCol)) {
            throw new Error('endCol must be >= startCol');
        }
        
        return {
            type: 'excel',
            version: EXTRACTION_PARAMS_VERSION,
            sheet,
            startRow,
            endRow,
            startCol: startCol.toUpperCase(),
            endCol: endCol.toUpperCase()
        };
    }
    
    /**
     * Create extraction params for PowerPoint files
     */
    static createPowerPointParams(
        slide: number, 
        includeNotes: boolean = false,
        includeComments: boolean = false
    ): PowerPointExtractionParams {
        if (slide < 1) {
            throw new Error('slide must be >= 1');
        }
        
        return {
            type: 'powerpoint',
            version: EXTRACTION_PARAMS_VERSION,
            slide,
            includeNotes,
            ...(includeComments && { includeComments })
        };
    }
    
    /**
     * Create extraction params for Word documents
     * Uses mammoth's natural paragraph structure
     */
    static createWordParams(
        startParagraph: number, 
        endParagraph: number,
        options?: {
            paragraphTypes?: string[];
            startLineInPara?: number;
            endLineInPara?: number;
            hasFormatting?: boolean;
            headingLevel?: number;
        }
    ): WordExtractionParams {
        if (startParagraph < 0) {
            throw new Error('startParagraph must be >= 0');
        }
        if (endParagraph < startParagraph) {
            throw new Error('endParagraph must be >= startParagraph');
        }
        if (options?.startLineInPara !== undefined && options.startLineInPara < 0) {
            throw new Error('startLineInPara must be >= 0');
        }
        if (options?.endLineInPara !== undefined && options.endLineInPara < 0) {
            throw new Error('endLineInPara must be >= 0');
        }
        if (options?.headingLevel !== undefined && 
            (options.headingLevel < 1 || options.headingLevel > 6)) {
            throw new Error('headingLevel must be between 1 and 6');
        }
        
        return {
            type: 'word',
            version: EXTRACTION_PARAMS_VERSION,
            startParagraph,
            endParagraph,
            ...(options?.paragraphTypes && { paragraphTypes: options.paragraphTypes }),
            ...(options?.startLineInPara !== undefined && { startLineInPara: options.startLineInPara }),
            ...(options?.endLineInPara !== undefined && { endLineInPara: options.endLineInPara }),
            ...(options?.hasFormatting !== undefined && { hasFormatting: options.hasFormatting }),
            ...(options?.headingLevel !== undefined && { headingLevel: options.headingLevel })
        };
    }
    
    /**
     * Helper: Validate column letter format
     */
    private static isValidColumnLetter(col: string): boolean {
        return /^[A-Z]{1,3}$/i.test(col);
    }
    
    /**
     * Helper: Convert column letter to number (A=1, B=2, ..., Z=26, AA=27, etc.)
     */
    private static columnToNumber(col: string): number {
        let result = 0;
        for (let i = 0; i < col.length; i++) {
            result = result * 26 + (col.charCodeAt(i) - 64);
        }
        return result;
    }
    
    /**
     * Create default text params when file type is unknown
     * This is a fallback for the current implementation
     */
    static createDefaultParams(startOffset: number, endOffset: number): TextExtractionParams {
        // For now, use byte offsets as pseudo line numbers
        // This will be improved when proper chunking is implemented
        return this.createTextParams(
            Math.max(1, startOffset),
            Math.max(1, endOffset)
        );
    }
}