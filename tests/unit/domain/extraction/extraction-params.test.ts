/**
 * Unit tests for Sprint 11: Extraction params system
 * 
 * Tests the factory, validator, and serialization of extraction params
 * to ensure bidirectional chunk translation works correctly.
 */

import { describe, it, expect } from 'vitest';
import {
    ExtractionParamsFactory,
    ExtractionParamsValidator,
    ExtractionParamsValidationError,
    ExtractionParams
} from '../../../../src/domain/extraction/index.js';

describe('ExtractionParamsFactory', () => {
    describe('createTextParams', () => {
        it('should create valid text extraction params', () => {
            const params = ExtractionParamsFactory.createTextParams(10, 50);
            
            expect(params).toEqual({
                type: 'text',
                version: 1,
                startLine: 10,
                endLine: 50
            });
        });
        
        it('should throw error for invalid line numbers', () => {
            expect(() => ExtractionParamsFactory.createTextParams(0, 10))
                .toThrow('startLine must be >= 1');
            
            expect(() => ExtractionParamsFactory.createTextParams(10, 5))
                .toThrow('endLine must be >= startLine');
        });
    });
    
    describe('createPdfParams', () => {
        it('should create valid PDF extraction params', () => {
            const params = ExtractionParamsFactory.createPdfParams(2, 10, 45);
            
            expect(params).toEqual({
                type: 'pdf',
                version: 1,
                page: 2,
                startTextBlock: 10,
                endTextBlock: 45
            });
        });
        
        it('should create PDF params with coordinates', () => {
            const params = ExtractionParamsFactory.createPdfParams(0, 5, 10, {
                x: 72.5,
                y: 156.3,
                width: 450,
                height: 24
            });
            
            expect(params).toEqual({
                type: 'pdf',
                version: 1,
                page: 0,
                startTextBlock: 5,
                endTextBlock: 10,
                x: 72.5,
                y: 156.3,
                width: 450,
                height: 24
            });
        });
        
        it('should throw error for invalid page number', () => {
            expect(() => ExtractionParamsFactory.createPdfParams(-1, 1, 10))
                .toThrow('page must be >= 0');
        });
    });
    
    describe('createExcelParams', () => {
        it('should create valid Excel extraction params', () => {
            const params = ExtractionParamsFactory.createExcelParams(
                'Budget', 1, 100, 'A', 'Z'
            );
            
            expect(params).toEqual({
                type: 'excel',
                version: 1,
                sheet: 'Budget',
                startRow: 1,
                endRow: 100,
                startCol: 'A',
                endCol: 'Z'
            });
        });
        
        it('should normalize column letters to uppercase', () => {
            const params = ExtractionParamsFactory.createExcelParams(
                'Sheet1', 1, 10, 'a', 'z'
            );
            
            expect(params.startCol).toBe('A');
            expect(params.endCol).toBe('Z');
        });
        
        it('should throw error for empty sheet name', () => {
            expect(() => ExtractionParamsFactory.createExcelParams('', 1, 10, 'A', 'Z'))
                .toThrow('sheet name cannot be empty');
        });
        
        it('should throw error for invalid column letters', () => {
            expect(() => ExtractionParamsFactory.createExcelParams(
                'Sheet1', 1, 10, '123', 'Z'
            )).toThrow('startCol must be a valid column letter');
        });
    });
    
    describe('createPowerPointParams', () => {
        it('should create valid PowerPoint extraction params', () => {
            const params = ExtractionParamsFactory.createPowerPointParams(5, true);
            
            expect(params).toEqual({
                type: 'powerpoint',
                version: 1,
                slide: 5,
                includeNotes: true
            });
        });
        
        it('should default includeNotes to false', () => {
            const params = ExtractionParamsFactory.createPowerPointParams(1);
            expect(params.includeNotes).toBe(false);
        });
    });
    
    describe('createWordParams', () => {
        it('should create valid Word extraction params', () => {
            const params = ExtractionParamsFactory.createWordParams(1, 5);
            
            expect(params).toEqual({
                type: 'word',
                version: 1,
                startParagraph: 1,
                endParagraph: 5
            });
        });
        
        it('should create Word params with optional fields', () => {
            const params = ExtractionParamsFactory.createWordParams(0, 3, {
                paragraphTypes: ['p', 'h2', 'p', 'p'],
                hasFormatting: true,
                headingLevel: 2
            });
            
            expect(params).toEqual({
                type: 'word',
                version: 1,
                startParagraph: 0,
                endParagraph: 3,
                paragraphTypes: ['p', 'h2', 'p', 'p'],
                hasFormatting: true,
                headingLevel: 2
            });
        });
    });
});

describe('ExtractionParamsValidator', () => {
    describe('validate', () => {
        it('should validate valid text params', () => {
            const params = {
                type: 'text',
                version: 1,
                startLine: 10,
                endLine: 50
            };
            
            const validated = ExtractionParamsValidator.validate(params);
            expect(validated).toEqual(params);
        });
        
        it('should throw error for missing type', () => {
            const params = {
                version: 1,
                startLine: 10,
                endLine: 50
            };
            
            expect(() => ExtractionParamsValidator.validate(params))
                .toThrow('Missing required field: type');
        });
        
        it('should throw error for unknown type', () => {
            const params = {
                type: 'unknown',
                version: 1
            };
            
            expect(() => ExtractionParamsValidator.validate(params))
                .toThrow('Unknown extraction params type: unknown');
        });
        
        it('should throw error for invalid structure', () => {
            expect(() => ExtractionParamsValidator.validate(null))
                .toThrow('Extraction params must be an object');
            
            expect(() => ExtractionParamsValidator.validate('string'))
                .toThrow('Extraction params must be an object');
        });
    });
    
    describe('serialize and deserialize', () => {
        it('should serialize and deserialize text params', () => {
            const original = ExtractionParamsFactory.createTextParams(10, 50);
            const serialized = ExtractionParamsValidator.serialize(original);
            const deserialized = ExtractionParamsValidator.deserialize(serialized);
            
            expect(deserialized).toEqual(original);
        });
        
        it('should serialize and deserialize PDF params', () => {
            const original = ExtractionParamsFactory.createPdfParams(2, 10, 45);
            const serialized = ExtractionParamsValidator.serialize(original);
            const deserialized = ExtractionParamsValidator.deserialize(serialized);
            
            expect(deserialized).toEqual(original);
        });
        
        it('should serialize and deserialize Excel params', () => {
            const original = ExtractionParamsFactory.createExcelParams(
                'Budget', 1, 100, 'A', 'Z'
            );
            const serialized = ExtractionParamsValidator.serialize(original);
            const deserialized = ExtractionParamsValidator.deserialize(serialized);
            
            expect(deserialized).toEqual(original);
        });
        
        it('should throw error for invalid JSON', () => {
            expect(() => ExtractionParamsValidator.deserialize('not json'))
                .toThrow('Invalid JSON');
        });
        
        it('should validate params before serializing', () => {
            const invalidParams = {
                type: 'text',
                version: 1,
                startLine: 0, // Invalid
                endLine: 10
            } as any;
            
            expect(() => ExtractionParamsValidator.serialize(invalidParams))
                .toThrow('startLine must be >= 1');
        });
    });
    
    describe('round-trip testing', () => {
        it('should maintain data integrity through serialization cycle', () => {
            const testCases: ExtractionParams[] = [
                ExtractionParamsFactory.createTextParams(1, 100),
                ExtractionParamsFactory.createMarkdownParams(50, 150, '## Section'),
                ExtractionParamsFactory.createPdfParams(4, 1, 20),
                ExtractionParamsFactory.createExcelParams('Data', 1, 1000, 'A', 'AZ'),
                ExtractionParamsFactory.createPowerPointParams(10, true),
                ExtractionParamsFactory.createWordParams(0, 10)
            ];
            
            testCases.forEach(original => {
                const serialized = ExtractionParamsValidator.serialize(original);
                const deserialized = ExtractionParamsValidator.deserialize(serialized);
                
                expect(deserialized).toEqual(original);
                expect(typeof serialized).toBe('string');
                expect(JSON.parse(serialized)).toEqual(original);
            });
        });
    });
});

describe('ExtractionParamsValidationError', () => {
    it('should include field and value information', () => {
        try {
            ExtractionParamsValidator.validate({
                type: 'text',
                version: 1,
                startLine: -1,
                endLine: 10
            });
        } catch (error) {
            expect(error).toBeInstanceOf(ExtractionParamsValidationError);
            const validationError = error as ExtractionParamsValidationError;
            expect(validationError.field).toBe('startLine');
            expect(validationError.value).toBe(-1);
        }
    });
});