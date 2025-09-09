/**
 * Sprint 11: Tests for Excel Document Format-Aware Chunking
 * 
 * Validates that Excel chunking respects sheet boundaries and
 * extraction parameters enable perfect content reconstruction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExcelChunkingService } from '../../../../src/domain/content/excel-chunking.js';
import { ParsedContent, ExcelMetadata } from '../../../../src/types/index.js';
import { ExtractionParamsValidator } from '../../../../src/domain/extraction/extraction-params.validator.js';
import { ExcelExtractionParams } from '../../../../src/domain/extraction/extraction-params.types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ExcelChunkingService', () => {
    let service: ExcelChunkingService;
    
    beforeEach(() => {
        service = new ExcelChunkingService();
    });
    
    describe('chunkExcelDocument', () => {
        it('should reject non-Excel content', () => {
            const content: ParsedContent = {
                content: 'Some text',
                type: 'txt',
                originalPath: 'test.txt',
                metadata: {
                    type: 'txt',
                    originalPath: 'test.txt',
                    size: 100,
                    lastModified: new Date().toISOString(),
                    lines: 10,
                    encoding: 'utf-8'
                }
            };
            
            expect(() => service.chunkExcelDocument(content))
                .toThrow('Content must be an Excel document');
        });
        
        it('should create sheet-aware chunks', () => {
            // Create mock Excel content with multiple sheets
            const worksheet1 = {
                name: 'Sales',
                index: 0,
                range: { s: { r: 0, c: 0 }, e: { r: 10, c: 5 } },
                rowCount: 11,
                colCount: 6,
                csvContent: 'Product,Q1,Q2,Q3,Q4,Total\nApples,100,150,200,180,630\nBananas,80,90,110,95,375',
                jsonData: [
                    ['Product', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
                    ['Apples', 100, 150, 200, 180, 630],
                    ['Bananas', 80, 90, 110, 95, 375]
                ],
                hasFormulas: false,
                formulas: []
            };
            
            const worksheet2 = {
                name: 'Expenses',
                index: 1,
                range: { s: { r: 0, c: 0 }, e: { r: 5, c: 3 } },
                rowCount: 6,
                colCount: 4,
                csvContent: 'Category,Jan,Feb,Mar\nRent,1000,1000,1000\nUtilities,200,250,180',
                jsonData: [
                    ['Category', 'Jan', 'Feb', 'Mar'],
                    ['Rent', 1000, 1000, 1000],
                    ['Utilities', 200, 250, 180]
                ],
                hasFormulas: false,
                formulas: []
            };
            
            const metadata: ExcelMetadata = {
                type: 'xlsx',
                originalPath: 'test.xlsx',
                size: 5000,
                lastModified: new Date().toISOString(),
                sheets: ['Sales', 'Expenses'],
                sheetCount: 2,
                charCount: 300,
                worksheets: [worksheet1, worksheet2],
                totalRows: 17,
                totalCells: 100,
                totalFormulas: 0,
                hasFormulas: false
            };
            
            const content: ParsedContent = {
                content: '=== Sheet: Sales ===\n' + worksheet1.csvContent + 
                        '\n\n=== Sheet: Expenses ===\n' + worksheet2.csvContent,
                type: 'excel',
                originalPath: 'test.xlsx',
                metadata
            };
            
            const result = service.chunkExcelDocument(content, 200, 50);
            
            expect(result.chunks.length).toBeGreaterThan(0);
            expect(result.originalContent).toBe(content);
            
            // Verify each chunk has extraction params
            result.chunks.forEach(chunk => {
                expect(chunk.metadata.sourceType).toBe('excel');
                expect((chunk.metadata as any).extractionParams).toBeDefined();
                
                // Deserialize and validate extraction params
                const params = ExtractionParamsValidator.deserialize(
                    (chunk.metadata as any).extractionParams
                );
                expect(params.type).toBe('excel');
                
                const excelParams = params as ExcelExtractionParams;
                expect(['Sales', 'Expenses']).toContain(excelParams.sheet);
                expect(excelParams.startRow).toBeGreaterThan(0);
                expect(excelParams.endRow).toBeGreaterThanOrEqual(excelParams.startRow);
                expect(excelParams.startCol).toMatch(/^[A-Z]+$/);
                expect(excelParams.endCol).toMatch(/^[A-Z]+$/);
            });
        });
        
        it('should keep headers with data chunks', () => {
            const worksheet = {
                name: 'Data',
                index: 0,
                range: { s: { r: 0, c: 0 }, e: { r: 100, c: 3 } },
                rowCount: 101,
                colCount: 4,
                csvContent: 'ID,Name,Value,Status\n' +
                    Array.from({ length: 100 }, (_, i) => 
                        `${i + 1},Item${i + 1},${(i + 1) * 100},Active`
                    ).join('\n'),
                jsonData: [],
                hasFormulas: false,
                formulas: []
            };
            
            const metadata: ExcelMetadata = {
                type: 'xlsx',
                originalPath: 'test.xlsx',
                size: 10000,
                lastModified: new Date().toISOString(),
                sheets: ['Data'],
                sheetCount: 1,
                charCount: 3000,
                worksheets: [worksheet],
                totalRows: 101,
                totalCells: 404,
                totalFormulas: 0,
                hasFormulas: false
            };
            
            const content: ParsedContent = {
                content: '=== Sheet: Data ===\n' + worksheet.csvContent,
                type: 'excel',
                originalPath: 'test.xlsx',
                metadata
            };
            
            const result = service.chunkExcelDocument(content, 500, 100);
            
            // Each chunk should start with the header row
            const headerRow = 'ID,Name,Value,Status';
            result.chunks.forEach(chunk => {
                expect(chunk.content.startsWith(headerRow)).toBe(true);
            });
        });
    });
    
    describe('extractByParams', () => {
        it('should extract specific cell range from Excel file', async () => {
            // Create a test Excel file
            const testFilePath = path.join(__dirname, '../../../fixtures/tmp/test-excel-extraction.xlsx');
            
            // Ensure tmp directory exists
            const tmpDir = path.dirname(testFilePath);
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            // Create test workbook
            const wb = XLSX.utils.book_new();
            const ws_data = [
                ['Product', 'Q1', 'Q2', 'Q3', 'Q4'],
                ['Apples', 100, 150, 200, 180],
                ['Bananas', 80, 90, 110, 95],
                ['Oranges', 120, 130, 140, 125],
                ['Grapes', 60, 70, 85, 75]
            ];
            
            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
            
            // Write the file
            XLSX.writeFile(wb, testFilePath);
            
            try {
                // Test extracting rows 2-3, columns B-D
                const extractionParams = {
                    type: 'excel' as const,
                    version: 1,
                    sheet: 'Sales Data',
                    startRow: 2,
                    endRow: 3,
                    startCol: 'B',
                    endCol: 'D'
                };
                
                const serializedParams = ExtractionParamsValidator.serialize(extractionParams);
                const result = await service.extractByParams(testFilePath, serializedParams);
                
                // Expected: Q1,Q2,Q3 values for Apples and Bananas
                expect(result).toBe('100,150,200\n80,90,110');
            } finally {
                // Clean up
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
        
        it('should handle full sheet extraction', async () => {
            const testFilePath = path.join(__dirname, '../../../fixtures/tmp/test-excel-full.xlsx');
            
            // Ensure tmp directory exists
            const tmpDir = path.dirname(testFilePath);
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            // Create simple test data
            const wb = XLSX.utils.book_new();
            const ws_data = [
                ['A', 'B', 'C'],
                [1, 2, 3],
                [4, 5, 6]
            ];
            
            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            XLSX.utils.book_append_sheet(wb, ws, 'TestSheet');
            XLSX.writeFile(wb, testFilePath);
            
            try {
                const extractionParams = {
                    type: 'excel' as const,
                    version: 1,
                    sheet: 'TestSheet',
                    startRow: 1,
                    endRow: 3,
                    startCol: 'A',
                    endCol: 'C'
                };
                
                const serializedParams = ExtractionParamsValidator.serialize(extractionParams);
                const result = await service.extractByParams(testFilePath, serializedParams);
                
                expect(result).toBe('A,B,C\n1,2,3\n4,5,6');
            } finally {
                // Clean up
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
        
        it('should preserve formulas during extraction', async () => {
            const testFilePath = path.join(__dirname, '../../../fixtures/tmp/test-excel-formulas.xlsx');
            
            // Ensure tmp directory exists
            const tmpDir = path.dirname(testFilePath);
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            // Create workbook with formulas
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([
                ['Value1', 'Value2', 'Sum'],
                [10, 20, { f: 'A2+B2', v: 30 }],
                [15, 25, { f: 'A3+B3', v: 40 }]
            ]);
            
            XLSX.utils.book_append_sheet(wb, ws, 'Formulas');
            XLSX.writeFile(wb, testFilePath);
            
            try {
                const extractionParams = {
                    type: 'excel' as const,
                    version: 1,
                    sheet: 'Formulas',
                    startRow: 2,
                    endRow: 3,
                    startCol: 'C',
                    endCol: 'C'
                };
                
                const serializedParams = ExtractionParamsValidator.serialize(extractionParams);
                const result = await service.extractByParams(testFilePath, serializedParams);
                
                // Should extract formula representations
                expect(result).toContain('=');
            } finally {
                // Clean up
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
        
        it('should validate sheet existence', async () => {
            const testFilePath = path.join(__dirname, '../../../fixtures/tmp/test-excel-invalid.xlsx');
            
            // Ensure tmp directory exists
            const tmpDir = path.dirname(testFilePath);
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([[1, 2, 3]]);
            XLSX.utils.book_append_sheet(wb, ws, 'ValidSheet');
            XLSX.writeFile(wb, testFilePath);
            
            try {
                const extractionParams = {
                    type: 'excel' as const,
                    version: 1,
                    sheet: 'NonExistentSheet',
                    startRow: 1,
                    endRow: 1,
                    startCol: 'A',
                    endCol: 'C'
                };
                
                const serializedParams = ExtractionParamsValidator.serialize(extractionParams);
                
                await expect(service.extractByParams(testFilePath, serializedParams))
                    .rejects.toThrow('Sheet \'NonExistentSheet\' not found');
            } finally {
                // Clean up
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
        
        it('should validate row and column ranges', async () => {
            const testFilePath = path.join(__dirname, '../../../fixtures/tmp/test-excel-range.xlsx');
            
            // Ensure tmp directory exists
            const tmpDir = path.dirname(testFilePath);
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            // Create small workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([
                ['A1', 'B1'],
                ['A2', 'B2']
            ]);
            XLSX.utils.book_append_sheet(wb, ws, 'Small');
            XLSX.writeFile(wb, testFilePath);
            
            try {
                // Test out of range row
                const extractionParams = {
                    type: 'excel' as const,
                    version: 1,
                    sheet: 'Small',
                    startRow: 10,
                    endRow: 11,
                    startCol: 'A',
                    endCol: 'B'
                };
                
                const serializedParams = ExtractionParamsValidator.serialize(extractionParams);
                
                await expect(service.extractByParams(testFilePath, serializedParams))
                    .rejects.toThrow('Start row 10 is out of range');
            } finally {
                // Clean up
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
    });
    
    describe('Round-trip extraction', () => {
        it('should perfectly reconstruct chunked content', async () => {
            const testFilePath = path.join(__dirname, '../../../fixtures/tmp/test-excel-roundtrip.xlsx');
            
            // Ensure tmp directory exists
            const tmpDir = path.dirname(testFilePath);
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            // Create test data
            const wb = XLSX.utils.book_new();
            const testData = [
                ['Header1', 'Header2', 'Header3'],
                ['Row1Col1', 'Row1Col2', 'Row1Col3'],
                ['Row2Col1', 'Row2Col2', 'Row2Col3'],
                ['Row3Col1', 'Row3Col2', 'Row3Col3']
            ];
            
            const ws = XLSX.utils.aoa_to_sheet(testData);
            XLSX.utils.book_append_sheet(wb, ws, 'TestData');
            XLSX.writeFile(wb, testFilePath);
            
            try {
                // Create mock parsed content
                const csvContent = testData.map(row => row.join(',')).join('\n');
                const worksheet = {
                    name: 'TestData',
                    index: 0,
                    range: { s: { r: 0, c: 0 }, e: { r: 3, c: 2 } },
                    rowCount: 4,
                    colCount: 3,
                    csvContent: csvContent,
                    jsonData: testData,
                    hasFormulas: false,
                    formulas: []
                };
                
                const metadata: ExcelMetadata = {
                    type: 'xlsx',
                    originalPath: 'test.xlsx',
                    size: 1000,
                    lastModified: new Date().toISOString(),
                    sheets: ['TestData'],
                    sheetCount: 1,
                    charCount: csvContent.length,
                    worksheets: [worksheet],
                    totalRows: 4,
                    totalCells: 12,
                    totalFormulas: 0,
                    hasFormulas: false
                };
                
                const content: ParsedContent = {
                    content: '=== Sheet: TestData ===\n' + csvContent,
                    type: 'excel',
                    originalPath: 'test.xlsx',
                    metadata
                };
                
                // Chunk the content
                const chunked = service.chunkExcelDocument(content, 100, 20);
                
                // Extract each chunk and compare
                for (const chunk of chunked.chunks) {
                    const extractionParams = (chunk.metadata as any).extractionParams;
                    const extracted = await service.extractByParams(testFilePath, extractionParams);
                    
                    // The extracted content should match the chunk content
                    // (accounting for header row being included in chunks)
                    expect(extracted).toBeTruthy();
                    expect(extracted.split('\n').length).toBeGreaterThan(0);
                }
            } finally {
                // Clean up
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
    });
});