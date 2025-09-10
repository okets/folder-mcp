/**
 * Sprint 11: PDF Document Format-Aware Chunking
 * 
 * Implements chunking that respects PDF page structure using pdf2json's
 * page and text block coordinate system for precise text location.
 */

import { ParsedContent, TextChunk, ChunkedContent, PDFMetadata, createDefaultSemanticMetadata } from '../../types/index.js';
import { ExtractionParamsFactory } from '../extraction/extraction-params.factory.js';
import { ExtractionParamsValidator } from '../extraction/extraction-params.validator.js';
import { PdfExtractionParams } from '../extraction/extraction-params.types.js';

/**
 * Represents a text block from pdf2json
 */
interface PdfTextBlock {
    x: number;      // X coordinate
    y: number;      // Y coordinate
    w: number;      // Width
    h: number;      // Height
    text: string;   // Actual text content
}

/**
 * Represents a parsed PDF page structure
 */
interface PdfPageStructure {
    pageIndex: number;
    textBlocks: PdfTextBlock[];
    width: number;
    height: number;
}

/**
 * Service for PDF document format-aware chunking
 */
export class PdfChunkingService {
    private readonly DEFAULT_MAX_TOKENS = 1000;
    private readonly DEFAULT_MIN_TOKENS = 100;
    
    /**
     * Chunk a PDF document respecting page boundaries and text blocks
     */
    public chunkPdfDocument(
        content: ParsedContent,
        maxTokens: number = this.DEFAULT_MAX_TOKENS,
        minTokens: number = this.DEFAULT_MIN_TOKENS
    ): ChunkedContent {
        if (content.type !== 'pdf') {
            throw new Error('Content must be a PDF document');
        }
        
        const metadata = content.metadata as PDFMetadata;
        
        // Get page structures from metadata (stored by parser)
        const pageStructures = (metadata as any).pageStructures as PdfPageStructure[];
        
        if (!pageStructures || pageStructures.length === 0) {
            // Fallback to simple text chunking if no structure available
            return this.fallbackTextChunking(content, maxTokens, minTokens);
        }
        // Create chunks respecting page boundaries
        const chunks = this.createPageAwareChunks(
            pageStructures,
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
     * Create chunks respecting page boundaries and text blocks
     */
    private createPageAwareChunks(
        pageStructures: PdfPageStructure[],
        fullText: string,
        maxTokens: number,
        minTokens: number
    ): TextChunk[] {
        const chunks: TextChunk[] = [];
        let globalTextOffset = 0;
        
        for (const pageStructure of pageStructures) {
            const pageChunks = this.chunkSinglePage(
                pageStructure,
                fullText,
                globalTextOffset,
                chunks.length,
                maxTokens,
                minTokens
            );
            
            chunks.push(...pageChunks);
            
            // Update global offset
            if (pageStructure.textBlocks.length > 0) {
                const pageText = pageStructure.textBlocks
                    .map(block => block.text)
                    .join(' ');
                globalTextOffset += pageText.length;
            }
        }
        
        return chunks;
    }
    
    /**
     * Chunk a single page into text chunks
     */
    private chunkSinglePage(
        pageStructure: PdfPageStructure,
        fullText: string,
        textOffset: number,
        startChunkIndex: number,
        maxTokens: number,
        minTokens: number
    ): TextChunk[] {
        const chunks: TextChunk[] = [];
        
        if (!pageStructure.textBlocks || pageStructure.textBlocks.length === 0) {
            return chunks;
        }
        
        let currentChunk: {
            textBlocks: PdfTextBlock[];
            text: string;
            tokenCount: number;
            startBlockIndex: number;
            endBlockIndex: number;
            minX?: number;
            minY?: number;
            maxWidth?: number;
            maxHeight?: number;
        } | null = null;
        
        for (let i = 0; i < pageStructure.textBlocks.length; i++) {
            const block = pageStructure.textBlocks[i];
            if (!block || !block.text) continue;
            const blockTokens = Math.ceil(block.text.length / 4);
            
            if (!currentChunk) {
                // Start new chunk
                currentChunk = {
                    textBlocks: [block],
                    text: block.text,
                    tokenCount: blockTokens,
                    startBlockIndex: i,
                    endBlockIndex: i,
                    minX: block.x,
                    minY: block.y,
                    maxWidth: block.w,
                    maxHeight: block.h
                };
            } else {
                // Check if adding this block would exceed max tokens
                const potentialTokens = currentChunk.tokenCount + blockTokens;
                
                if (potentialTokens > maxTokens && currentChunk.tokenCount >= minTokens) {
                    // Save current chunk
                    chunks.push(this.createChunk(
                        currentChunk.text,
                        startChunkIndex + chunks.length,
                        fullText,
                        pageStructure.pageIndex,
                        currentChunk
                    ));
                    
                    // Start new chunk with this block
                    currentChunk = {
                        textBlocks: [block],
                        text: block.text,
                        tokenCount: blockTokens,
                        startBlockIndex: i,
                        endBlockIndex: i,
                        minX: block.x,
                        minY: block.y,
                        maxWidth: block.w,
                        maxHeight: block.h
                    };
                } else {
                    // Add block to current chunk
                    currentChunk.textBlocks.push(block);
                    currentChunk.text += ' ' + block.text;
                    currentChunk.tokenCount += blockTokens;
                    currentChunk.endBlockIndex = i;
                    
                    // Update coordinate bounds
                    if (block.x < (currentChunk.minX || Infinity)) {
                        currentChunk.minX = block.x;
                    }
                    if (block.y < (currentChunk.minY || Infinity)) {
                        currentChunk.minY = block.y;
                    }
                    if (block.w > (currentChunk.maxWidth || 0)) {
                        currentChunk.maxWidth = block.w;
                    }
                    if (block.h > (currentChunk.maxHeight || 0)) {
                        currentChunk.maxHeight = block.h;
                    }
                }
            }
        }
        
        // Save final chunk
        if (currentChunk && currentChunk.text.trim()) {
            chunks.push(this.createChunk(
                currentChunk.text,
                startChunkIndex + chunks.length,
                fullText,
                pageStructure.pageIndex,
                currentChunk
            ));
        }
        
        return chunks;
    }
    
    /**
     * Create a single chunk with extraction parameters
     */
    private createChunk(
        text: string,
        index: number,
        fullText: string,
        pageIndex: number,
        chunkData: {
            startBlockIndex: number;
            endBlockIndex: number;
            minX?: number;
            minY?: number;
            maxWidth?: number;
            maxHeight?: number;
        },
        searchFromOffset: number = 0
    ): TextChunk {
        // Find byte offsets in full text, searching from the correct position
        const startOffset = fullText.indexOf(text, searchFromOffset);
        const endOffset = startOffset >= 0 ? startOffset + text.length : searchFromOffset + text.length;
        
        // Create extraction params using factory
        const coordinates = chunkData.minX !== undefined && 
                            chunkData.minY !== undefined && 
                            chunkData.maxWidth !== undefined && 
                            chunkData.maxHeight !== undefined
            ? {
                x: chunkData.minX,
                y: chunkData.minY,
                width: chunkData.maxWidth,
                height: chunkData.maxHeight
            }
            : undefined;
        
        const extractionParams = ExtractionParamsFactory.createPdfParams(
            pageIndex,
            chunkData.startBlockIndex,
            chunkData.endBlockIndex,
            coordinates
        );
        
        // Serialize extraction params
        const serializedParams = ExtractionParamsValidator.serialize(extractionParams);
        
        return {
            content: text,
            startPosition: startOffset >= 0 ? startOffset : 0,
            endPosition: endOffset >= 0 ? endOffset : text.length,
            tokenCount: Math.ceil(text.length / 4),
            chunkIndex: index,
            metadata: {
                sourceFile: '',
                sourceType: 'pdf',
                totalChunks: 0,
                hasOverlap: false,
                // Store extraction params in metadata (extending base type)
                ...{ extractionParams: serializedParams }
            },
            semanticMetadata: createDefaultSemanticMetadata()
        };
    }
    
    /**
     * Fallback to simple text chunking if no page structure available
     */
    private fallbackTextChunking(
        content: ParsedContent,
        maxTokens: number,
        minTokens: number
    ): ChunkedContent {
        const chunks: TextChunk[] = [];
        const text = content.content;
        const words = text.split(/\s+/);
        
        let currentChunk = '';
        let currentTokens = 0;
        let chunkStart = 0;
        
        for (const word of words) {
            const wordTokens = Math.ceil(word.length / 4);
            
            if (currentTokens + wordTokens > maxTokens && currentTokens >= minTokens) {
                // Save current chunk
                chunks.push({
                    content: currentChunk.trim(),
                    startPosition: chunkStart,
                    endPosition: chunkStart + currentChunk.length,
                    tokenCount: currentTokens,
                    chunkIndex: chunks.length,
                    metadata: {
                        sourceFile: '',
                        sourceType: 'pdf',
                        totalChunks: 0,
                        hasOverlap: false,
                        // Extraction params for fallback chunking (extending base type)
                        ...{
                            extractionParams: ExtractionParamsValidator.serialize(
                                ExtractionParamsFactory.createPdfParams(
                                    0, // Default to page 0 in fallback mode
                                    0, // Start at first text block
                                    0  // End at first text block
                                )
                            )
                        }
                    },
                    semanticMetadata: createDefaultSemanticMetadata()
                });
                
                // Start new chunk
                chunkStart += currentChunk.length + 1;
                currentChunk = word;
                currentTokens = wordTokens;
            } else {
                currentChunk += (currentChunk ? ' ' : '') + word;
                currentTokens += wordTokens;
            }
        }
        
        // Save final chunk
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                startPosition: chunkStart,
                endPosition: text.length,
                tokenCount: currentTokens,
                chunkIndex: chunks.length,
                metadata: {
                    sourceFile: '',
                    sourceType: 'pdf',
                    totalChunks: 0,
                    hasOverlap: false,
                    ...{
                        extractionParams: ExtractionParamsValidator.serialize(
                            ExtractionParamsFactory.createPdfParams(
                                0, // Default to page 0 in fallback mode
                                0, // Start at first text block
                                0  // End at first text block
                            )
                        )
                    }
                },
                semanticMetadata: createDefaultSemanticMetadata()
            });
        }
        
        return {
            originalContent: content,
            chunks,
            totalChunks: chunks.length
        };
    }
    
    /**
     * Extract content using PDF extraction parameters
     * This enables bidirectional chunk translation
     */
    public async extractByParams(
        filePath: string,
        extractionParams: string
    ): Promise<string> {
        const params = ExtractionParamsValidator.deserialize(extractionParams);
        
        if (params.type !== 'pdf') {
            throw new Error('Invalid extraction params type for PDF document');
        }
        
        const pdfParams = params as PdfExtractionParams;
        
        // Import PDF2Json dynamically
        const PDF2Json = (await import('pdf2json')).default;
        
        // Parse the PDF document
        return new Promise((resolve, reject) => {
            const pdfParser = new (PDF2Json as any)();
            
            // Set up error handler
            pdfParser.on('pdfParser_dataError', (errData: any) => {
                reject(new Error(`Failed to parse PDF: ${errData.parserError}`));
            });
            
            // Set up success handler
            pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
                try {
                    // Validate page index
                    if (!pdfData.Pages || !Array.isArray(pdfData.Pages)) {
                        throw new Error('PDF has no pages');
                    }
                    
                    if (pdfParams.page < 0 || pdfParams.page >= pdfData.Pages.length) {
                        throw new Error(`Invalid page index: ${pdfParams.page}. Document has ${pdfData.Pages.length} pages`);
                    }
                    
                    // Get the specified page
                    const page = pdfData.Pages[pdfParams.page];
                    
                    if (!page.Texts || !Array.isArray(page.Texts)) {
                        throw new Error(`Page ${pdfParams.page} has no text blocks`);
                    }
                    
                    // Extract text blocks in the specified range
                    const startIdx = Math.max(0, pdfParams.startTextBlock);
                    const endIdx = Math.min(page.Texts.length - 1, pdfParams.endTextBlock);
                    
                    if (startIdx > endIdx) {
                        throw new Error(`Invalid text block range: ${startIdx}-${endIdx}`);
                    }
                    
                    let extractedText = '';
                    
                    // Process text blocks in range
                    for (let i = startIdx; i <= endIdx; i++) {
                        const textItem = page.Texts[i];
                        
                        // If coordinates are specified, verify the text block is within bounds
                        if (pdfParams.x !== undefined && textItem.x < pdfParams.x) {
                            continue; // Skip blocks outside x coordinate
                        }
                        if (pdfParams.y !== undefined && textItem.y < pdfParams.y) {
                            continue; // Skip blocks outside y coordinate
                        }
                        
                        // Extract text from the text block
                        if (textItem.R && Array.isArray(textItem.R)) {
                            textItem.R.forEach((run: any) => {
                                if (run.T) {
                                    try {
                                        // Decode URI component (pdf2json encodes text)
                                        const decodedText = decodeURIComponent(run.T);
                                        extractedText += decodedText + ' ';
                                    } catch (error) {
                                        // If decoding fails, use the raw text
                                        extractedText += run.T + ' ';
                                    }
                                }
                            });
                        }
                    }
                    
                    // Clean up the extracted text
                    extractedText = extractedText
                        .replace(/\s+/g, ' ')  // Normalize whitespace
                        .trim();
                    
                    resolve(extractedText);
                } catch (error) {
                    reject(error);
                }
            });
            
            // Read and parse the PDF file
            import('fs').then(fs => {
                const pdfBuffer = fs.readFileSync(filePath);
                pdfParser.parseBuffer(pdfBuffer);
            }).catch(reject);
        });
    }
}