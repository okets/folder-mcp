/**
 * Sprint 11: Bidirectional Chunk Translation System
 * 
 * Type definitions for normalized extraction parameters.
 * These parameters enable perfect reconstruction of chunks from their source documents.
 */

/**
 * Base interface for all extraction params
 * Every extraction param must have a type and version for schema evolution
 */
export interface BaseExtractionParams {
    type: 'text' | 'pdf' | 'excel' | 'powerpoint' | 'word' | 'markdown';
    version: number; // Schema version for future compatibility
}

/**
 * Text file extraction parameters
 * Uses line numbers for precise extraction
 */
export interface TextExtractionParams extends BaseExtractionParams {
    type: 'text';
    startLine: number;  // 1-based line number
    endLine: number;    // 1-based line number (inclusive)
}

/**
 * Markdown file extraction parameters
 * Similar to text but may include section information
 */
export interface MarkdownExtractionParams extends BaseExtractionParams {
    type: 'markdown';
    startLine: number;  // 1-based line number
    endLine: number;    // 1-based line number (inclusive)
    section?: string;   // Optional section heading
}

/**
 * PDF file extraction parameters
 * Page-aware with text block coordinates from pdf2json
 */
export interface PdfExtractionParams extends BaseExtractionParams {
    type: 'pdf';
    page: number;           // 0-based page index from pdf2json Pages array
    startTextBlock: number; // Starting text block index on page
    endTextBlock: number;   // Ending text block index on page
    x?: number;             // X coordinate of first text block
    y?: number;             // Y coordinate of first text block
    width?: number;         // Width of text area
    height?: number;        // Height of text area
}

/**
 * Excel file extraction parameters
 * Sheet-based with cell range tracking
 */
export interface ExcelExtractionParams extends BaseExtractionParams {
    type: 'excel';
    sheet: string;      // Sheet name
    startRow: number;   // 1-based row number
    endRow: number;     // 1-based row number (inclusive)
    startCol: string;   // Column letter (A, B, C, etc.)
    endCol: string;     // Column letter (inclusive)
}

/**
 * PowerPoint file extraction parameters
 * Slide-based extraction with optional notes
 */
export interface PowerPointExtractionParams extends BaseExtractionParams {
    type: 'powerpoint';
    slide: number;      // 1-based slide number
    includeNotes: boolean;
    includeComments?: boolean;
}

/**
 * Word document extraction parameters
 * Uses mammoth's natural paragraph structure from HTML extraction
 */
export interface WordExtractionParams extends BaseExtractionParams {
    type: 'word';
    startParagraph: number;     // 0-based index of starting paragraph (from HTML structure)
    endParagraph: number;       // 0-based index of ending paragraph (inclusive)
    paragraphTypes?: string[];  // HTML element types (p, h1, h2, etc.) for each paragraph
    startLineInPara?: number;   // 0-based line within first paragraph (for partial)
    endLineInPara?: number;     // 0-based line within last paragraph (for partial)
    hasFormatting?: boolean;    // Whether chunk preserves HTML formatting
    headingLevel?: number;      // If chunk contains heading (1-6)
}

/**
 * Union type of all extraction parameter types
 */
export type ExtractionParams = 
    | TextExtractionParams 
    | MarkdownExtractionParams
    | PdfExtractionParams 
    | ExcelExtractionParams 
    | PowerPointExtractionParams 
    | WordExtractionParams;

/**
 * Type guards for runtime type checking
 */
export const ExtractionParamsTypeGuards = {
    isTextParams(params: unknown): params is TextExtractionParams {
        const p = params as any;
        return p?.type === 'text' && 
               typeof p.startLine === 'number' && 
               typeof p.endLine === 'number';
    },

    isMarkdownParams(params: unknown): params is MarkdownExtractionParams {
        const p = params as any;
        return p?.type === 'markdown' && 
               typeof p.startLine === 'number' && 
               typeof p.endLine === 'number';
    },

    isPdfParams(params: unknown): params is PdfExtractionParams {
        const p = params as any;
        return p?.type === 'pdf' && 
               typeof p.page === 'number' &&
               typeof p.startTextBlock === 'number' && 
               typeof p.endTextBlock === 'number';
    },

    isExcelParams(params: unknown): params is ExcelExtractionParams {
        const p = params as any;
        return p?.type === 'excel' && 
               typeof p.sheet === 'string' &&
               typeof p.startRow === 'number' && 
               typeof p.endRow === 'number' &&
               typeof p.startCol === 'string' && 
               typeof p.endCol === 'string';
    },

    isPowerPointParams(params: unknown): params is PowerPointExtractionParams {
        const p = params as any;
        return p?.type === 'powerpoint' && 
               typeof p.slide === 'number' &&
               typeof p.includeNotes === 'boolean';
    },

    isWordParams(params: unknown): params is WordExtractionParams {
        const p = params as any;
        return p?.type === 'word' && 
               typeof p.startParagraph === 'number' && 
               typeof p.endParagraph === 'number';
    }
};

/**
 * Current schema version
 */
export const EXTRACTION_PARAMS_VERSION = 1;