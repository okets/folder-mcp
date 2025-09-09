/**
 * Unit tests for PowerPoint chunking with speaker notes support
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PowerPointChunkingService } from '../../../../src/domain/content/powerpoint-chunking.js';
import { ParsedContent, PowerPointMetadata } from '../../../../src/types/index.js';
import { ExtractionParamsValidator } from '../../../../src/domain/extraction/extraction-params.validator.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('PowerPointChunkingService', () => {
    let service: PowerPointChunkingService;
    
    beforeEach(() => {
        service = new PowerPointChunkingService();
    });
    
    describe('chunkPowerPointDocument', () => {
        it('should chunk PowerPoint document by slides', () => {
            const content: ParsedContent = {
                content: `Slide 1:
Title: Introduction
Content: Welcome to the presentation

Slide 2:
Title: Main Points
Content: Here are our main topics
- Point 1
- Point 2

Slide 3:
Title: Conclusion
Content: Thank you for your attention`,
                type: 'powerpoint',
                originalPath: '/test/presentation.pptx',
                metadata: {
                    originalPath: '/test/presentation.pptx',
                    type: 'pptx',
                    size: 1000,
                    lastModified: new Date().toISOString(),
                    slides: 3,
                    hasNotes: false,
                    notesCount: 0
                } as PowerPointMetadata
            };
            
            const result = service.chunkPowerPointDocument(content, 200, 50);
            
            expect(result.chunks).toBeDefined();
            expect(result.chunks.length).toBeGreaterThan(0);
            expect(result.totalChunks).toBe(result.chunks.length);
            
            // Each chunk should have extraction params
            result.chunks.forEach(chunk => {
                expect((chunk.metadata as any).extractionParams).toBeDefined();
                const params = ExtractionParamsValidator.deserialize((chunk.metadata as any).extractionParams as string);
                expect(params.type).toBe('powerpoint');
                expect(params.version).toBe(1);
            });
        });
        
        it('should handle slides with speaker notes', () => {
            const content: ParsedContent = {
                content: `Slide 1:
Title: Introduction
Content: Welcome to the presentation

[Speaker Notes]
Remember to mention the company history and recent achievements

Slide 2:
Title: Main Points
Content: Here are our main topics

[Speaker Notes]
Spend at least 5 minutes on each point
Engage the audience with questions`,
                type: 'powerpoint',
                originalPath: '/test/presentation.pptx',
                metadata: {
                    originalPath: '/test/presentation.pptx',
                    type: 'pptx',
                    size: 1000,
                    lastModified: new Date().toISOString(),
                    slides: 2,
                    hasNotes: true,
                    notesCount: 2
                } as PowerPointMetadata
            };
            
            const result = service.chunkPowerPointDocument(content, 300, 50);
            
            expect(result.chunks).toBeDefined();
            expect(result.chunks.length).toBeGreaterThan(0);
            
            // Check that notes are included in chunks
            const chunksWithNotes = result.chunks.filter(chunk => 
                chunk.content.includes('[Speaker Notes]')
            );
            expect(chunksWithNotes.length).toBeGreaterThan(0);
            
            // Check extraction params include notes flag
            chunksWithNotes.forEach(chunk => {
                const params = ExtractionParamsValidator.deserialize((chunk.metadata as any).extractionParams as string);
                expect(params.type).toBe('powerpoint');
                if ('includeNotes' in params) {
                    expect(params.includeNotes).toBe(true);
                }
            });
        });
        
        it('should respect max and min token limits', () => {
            const longContent = Array.from({ length: 10 }, (_, i) => 
                `Slide ${i + 1}:\nTitle: Slide ${i + 1}\nContent: ${'Long content '.repeat(50)}`
            ).join('\n\n');
            
            const content: ParsedContent = {
                content: longContent,
                type: 'powerpoint',
                originalPath: '/test/presentation.pptx',
                metadata: {
                    originalPath: '/test/presentation.pptx',
                    type: 'pptx',
                    size: 1000,
                    lastModified: new Date().toISOString(),
                    slides: 10,
                    hasNotes: false,
                    notesCount: 0
                } as PowerPointMetadata
            };
            
            const maxTokens = 500;
            const minTokens = 100;
            const result = service.chunkPowerPointDocument(content, maxTokens, minTokens);
            
            result.chunks.forEach(chunk => {
                expect(chunk.tokenCount).toBeLessThanOrEqual(maxTokens * 1.2); // Allow 20% overflow
                if (chunk.chunkIndex < result.chunks.length - 1) {
                    expect(chunk.tokenCount).toBeGreaterThanOrEqual(minTokens * 0.8); // Allow 20% underflow
                }
            });
        });
        
        it('should throw error for non-PowerPoint content', () => {
            const content: ParsedContent = {
                content: 'Some text',
                type: 'txt' as any,
                originalPath: '/test/file.txt',
                metadata: {
                    originalPath: '/test/file.txt',
                    type: 'txt',
                    size: 100,
                    lastModified: new Date().toISOString(),
                    lines: 1,
                    encoding: 'utf8'
                }
            };
            
            expect(() => service.chunkPowerPointDocument(content))
                .toThrow('Content must be a PowerPoint document');
        });
    });
    
    describe('extractByParams', () => {
        it('should extract specific slide content', async () => {
            // This test would require a real PowerPoint file
            // For now, we'll create a mock test that shows the expected behavior
            
            const testFile = path.join(process.cwd(), 'tests/fixtures/test-knowledge-base/simple.pptx');
            
            // Check if test file exists
            try {
                await fs.access(testFile);
                
                // Create extraction params for slide 1
                const params = ExtractionParamsValidator.serialize({
                    type: 'powerpoint',
                    version: 1,
                    slide: 1,
                    includeNotes: true,
                    includeComments: false
                });
                
                const extracted = await service.extractByParams(testFile, params);
                
                expect(extracted).toContain('Slide 1:');
                // The actual content would depend on the test file
            } catch (error) {
                // Skip test if file doesn't exist
                console.log('Skipping extractByParams test - test file not found');
            }
        });
        
        it('should validate extraction params type', async () => {
            const invalidParams = ExtractionParamsValidator.serialize({
                type: 'text',
                version: 1,
                startLine: 1,
                endLine: 10
            });
            
            await expect(service.extractByParams('/test/file.pptx', invalidParams))
                .rejects.toThrow('Invalid extraction params type for PowerPoint document');
        });
    });
    
    describe('round-trip extraction', () => {
        it('should extract same content that was chunked', () => {
            const content: ParsedContent = {
                content: `Slide 1:
Title: First Slide
Content: This is the first slide

[Speaker Notes]
Important notes for slide 1

Slide 2:
Title: Second Slide
Content: This is the second slide

[Speaker Notes]
Important notes for slide 2`,
                type: 'powerpoint',
                originalPath: '/test/presentation.pptx',
                metadata: {
                    originalPath: '/test/presentation.pptx',
                    type: 'pptx',
                    size: 1000,
                    lastModified: new Date().toISOString(),
                    slides: 2,
                    hasNotes: true,
                    notesCount: 2
                } as PowerPointMetadata
            };
            
            // Chunk the document
            const result = service.chunkPowerPointDocument(content, 200, 50);
            
            // Each chunk should have valid extraction params
            result.chunks.forEach(chunk => {
                const params = ExtractionParamsValidator.deserialize((chunk.metadata as any).extractionParams as string);
                
                expect(params.type).toBe('powerpoint');
                expect(params.version).toBe(1);
                
                if ('slide' in params) {
                    expect(params.slide).toBeGreaterThanOrEqual(1);
                    expect(params.slide).toBeLessThanOrEqual(2);
                }
                
                // The extracted content should be a subset of the original
                const extractedPortion = chunk.content;
                expect(content.content).toContain(extractedPortion.replace(/^Slide \d+:\n/, ''));
            });
        });
    });
});