/**
 * Sprint 11: Validator for extraction parameters
 * 
 * Validates, serializes, and deserializes extraction params with type safety.
 * Ensures data integrity when storing and retrieving from the database.
 */

import {
    ExtractionParams,
    ExtractionParamsTypeGuards,
    TextExtractionParams,
    MarkdownExtractionParams,
    PdfExtractionParams,
    ExcelExtractionParams,
    PowerPointExtractionParams,
    WordExtractionParams,
    EXTRACTION_PARAMS_VERSION
} from './extraction-params.types.js';

/**
 * Validation error with detailed context
 */
export class ExtractionParamsValidationError extends Error {
    constructor(
        message: string,
        public readonly field?: string,
        public readonly value?: unknown
    ) {
        super(message);
        this.name = 'ExtractionParamsValidationError';
    }
}

/**
 * Validator for extraction parameters
 * Single Responsibility: Validate and serialize/deserialize extraction params
 */
export class ExtractionParamsValidator {
    /**
     * Validate extraction params and return typed result
     * @throws ExtractionParamsValidationError if validation fails
     */
    static validate(params: unknown): ExtractionParams {
        if (!params || typeof params !== 'object') {
            throw new ExtractionParamsValidationError(
                'Extraction params must be an object',
                undefined,
                params
            );
        }
        
        const p = params as any;
        
        // Check required base fields
        if (!p.type) {
            throw new ExtractionParamsValidationError(
                'Missing required field: type',
                'type',
                undefined
            );
        }
        
        if (typeof p.version !== 'number') {
            throw new ExtractionParamsValidationError(
                'Missing or invalid version field',
                'version',
                p.version
            );
        }
        
        // Validate based on type
        switch (p.type) {
            case 'text':
                return this.validateTextParams(p);
            case 'markdown':
                return this.validateMarkdownParams(p);
            case 'pdf':
                return this.validatePdfParams(p);
            case 'excel':
                return this.validateExcelParams(p);
            case 'powerpoint':
                return this.validatePowerPointParams(p);
            case 'word':
                return this.validateWordParams(p);
            default:
                throw new ExtractionParamsValidationError(
                    `Unknown extraction params type: ${p.type}`,
                    'type',
                    p.type
                );
        }
    }
    
    /**
     * Serialize extraction params to JSON string
     */
    static serialize(params: ExtractionParams): string {
        // Validate before serializing
        this.validate(params);
        return JSON.stringify(params);
    }
    
    /**
     * Deserialize JSON string to typed extraction params
     * @throws ExtractionParamsValidationError if JSON is invalid
     */
    static deserialize(json: string): ExtractionParams {
        try {
            const parsed = JSON.parse(json);
            return this.validate(parsed);
        } catch (error) {
            if (error instanceof ExtractionParamsValidationError) {
                throw error;
            }
            throw new ExtractionParamsValidationError(
                `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
                undefined,
                json
            );
        }
    }
    
    /**
     * Validate text extraction params
     */
    private static validateTextParams(params: any): TextExtractionParams {
        if (!ExtractionParamsTypeGuards.isTextParams(params)) {
            throw new ExtractionParamsValidationError(
                'Invalid text extraction params structure'
            );
        }
        
        if (params.startLine < 1) {
            throw new ExtractionParamsValidationError(
                'startLine must be >= 1',
                'startLine',
                params.startLine
            );
        }
        
        if (params.endLine < params.startLine) {
            throw new ExtractionParamsValidationError(
                'endLine must be >= startLine',
                'endLine',
                params.endLine
            );
        }
        
        return params;
    }
    
    /**
     * Validate markdown extraction params
     */
    private static validateMarkdownParams(params: any): MarkdownExtractionParams {
        if (!ExtractionParamsTypeGuards.isMarkdownParams(params)) {
            throw new ExtractionParamsValidationError(
                'Invalid markdown extraction params structure'
            );
        }
        
        if (params.startLine < 1) {
            throw new ExtractionParamsValidationError(
                'startLine must be >= 1',
                'startLine',
                params.startLine
            );
        }
        
        if (params.endLine < params.startLine) {
            throw new ExtractionParamsValidationError(
                'endLine must be >= startLine',
                'endLine',
                params.endLine
            );
        }
        
        return params;
    }
    
    /**
     * Validate PDF extraction params
     */
    private static validatePdfParams(params: any): PdfExtractionParams {
        if (!ExtractionParamsTypeGuards.isPdfParams(params)) {
            throw new ExtractionParamsValidationError(
                'Invalid PDF extraction params structure'
            );
        }
        
        if (params.page < 0) {
            throw new ExtractionParamsValidationError(
                'page must be >= 0 (0-based index)',
                'page',
                params.page
            );
        }
        
        if (params.startTextBlock < 0) {
            throw new ExtractionParamsValidationError(
                'startTextBlock must be >= 0',
                'startTextBlock',
                params.startTextBlock
            );
        }
        
        if (params.endTextBlock < params.startTextBlock) {
            throw new ExtractionParamsValidationError(
                'endTextBlock must be >= startTextBlock',
                'endTextBlock',
                params.endTextBlock
            );
        }
        
        return params;
    }
    
    /**
     * Validate Excel extraction params
     */
    private static validateExcelParams(params: any): ExcelExtractionParams {
        if (!ExtractionParamsTypeGuards.isExcelParams(params)) {
            throw new ExtractionParamsValidationError(
                'Invalid Excel extraction params structure'
            );
        }
        
        if (!params.sheet || params.sheet.trim() === '') {
            throw new ExtractionParamsValidationError(
                'sheet name cannot be empty',
                'sheet',
                params.sheet
            );
        }
        
        if (params.startRow < 1) {
            throw new ExtractionParamsValidationError(
                'startRow must be >= 1',
                'startRow',
                params.startRow
            );
        }
        
        if (params.endRow < params.startRow) {
            throw new ExtractionParamsValidationError(
                'endRow must be >= startRow',
                'endRow',
                params.endRow
            );
        }
        
        if (!this.isValidColumnLetter(params.startCol)) {
            throw new ExtractionParamsValidationError(
                'startCol must be a valid column letter',
                'startCol',
                params.startCol
            );
        }
        
        if (!this.isValidColumnLetter(params.endCol)) {
            throw new ExtractionParamsValidationError(
                'endCol must be a valid column letter',
                'endCol',
                params.endCol
            );
        }
        
        return params;
    }
    
    /**
     * Validate PowerPoint extraction params
     */
    private static validatePowerPointParams(params: any): PowerPointExtractionParams {
        if (!ExtractionParamsTypeGuards.isPowerPointParams(params)) {
            throw new ExtractionParamsValidationError(
                'Invalid PowerPoint extraction params structure'
            );
        }
        
        if (params.slide < 1) {
            throw new ExtractionParamsValidationError(
                'slide must be >= 1',
                'slide',
                params.slide
            );
        }
        
        return params;
    }
    
    /**
     * Validate Word extraction params
     */
    private static validateWordParams(params: any): WordExtractionParams {
        if (!ExtractionParamsTypeGuards.isWordParams(params)) {
            throw new ExtractionParamsValidationError(
                'Invalid Word extraction params structure'
            );
        }
        
        if (params.startParagraph < 0) {
            throw new ExtractionParamsValidationError(
                'startParagraph must be >= 0',
                'startParagraph',
                params.startParagraph
            );
        }
        
        if (params.endParagraph < params.startParagraph) {
            throw new ExtractionParamsValidationError(
                'endParagraph must be >= startParagraph',
                'endParagraph',
                params.endParagraph
            );
        }
        
        return params;
    }
    
    /**
     * Helper: Validate column letter format
     */
    private static isValidColumnLetter(col: string): boolean {
        // Validate column letters (A-ZZZ), uppercase the input for consistency
        return /^[A-Z]{1,3}$/.test(col.toUpperCase());
    }
}