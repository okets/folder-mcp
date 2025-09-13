/**
 * PDF Document Format-Aware Chunking
 * 
 * Implements chunking that respects PDF page structure using pdf2json's
 * page and text block coordinate system for precise text location.
 */

import { ParsedContent, TextChunk, ChunkedContent, PDFMetadata, createDefaultSemanticMetadata } from '../../types/index.js';

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
        
        // No longer tracking extraction params - lazy loading retrieves content by chunk ID
        
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
                hasOverlap: false
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
        
        // Handle edge case: empty or very short content
        if (!text || text.trim().length === 0) {
            return {
                originalContent: content,
                chunks: [],
                totalChunks: 0
            };
        }
        
        // Try to split by spaces first
        let words = text.split(/\s+/).filter(w => w.length > 0);
        
        // CRITICAL FIX: If no spaces found (or very few), force character-based chunking
        // This prevents creating one massive chunk that exceeds model context window
        if (words.length <= 1) {
            // No word boundaries found - likely corrupted PDF extraction
            // Fall back to character-based chunking
            const maxChars = maxTokens * 4; // Approximate 4 chars per token
            const chunks: TextChunk[] = [];
            
            for (let i = 0; i < text.length; i += maxChars) {
                const chunkContent = text.substring(i, Math.min(i + maxChars, text.length));
                const tokenCount = Math.ceil(chunkContent.length / 4);
                
                chunks.push({
                    content: chunkContent,
                    startPosition: i,
                    endPosition: Math.min(i + maxChars, text.length),
                    tokenCount: tokenCount,
                    chunkIndex: chunks.length,
                    metadata: {
                        sourceFile: '',
                        sourceType: 'pdf',
                        totalChunks: 0,
                        hasOverlap: false
                    },
                    semanticMetadata: createDefaultSemanticMetadata()
                });
            }
            
            // Update total chunks
            chunks.forEach(chunk => {
                chunk.metadata.totalChunks = chunks.length;
            });
            
            return {
                originalContent: content,
                chunks,
                totalChunks: chunks.length
            };
        }
        
        // Normal word-based chunking when spaces are available
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
                        hasOverlap: false
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
        
        // Save final chunk - but ONLY if it's within size limits
        if (currentChunk.trim()) {
            // CRITICAL FIX: Check if final chunk exceeds max tokens
            // If it does, split it into smaller chunks
            if (currentTokens > maxTokens) {
                // Final chunk is too large - need to split it
                const finalText = currentChunk.trim();
                const maxChars = maxTokens * 4;
                
                for (let i = 0; i < finalText.length; i += maxChars) {
                    const chunkContent = finalText.substring(i, Math.min(i + maxChars, finalText.length));
                    const tokenCount = Math.ceil(chunkContent.length / 4);
                    
                    chunks.push({
                        content: chunkContent,
                        startPosition: chunkStart + i,
                        endPosition: chunkStart + Math.min(i + maxChars, finalText.length),
                        tokenCount: tokenCount,
                        chunkIndex: chunks.length,
                        metadata: {
                            sourceFile: '',
                            sourceType: 'pdf',
                            totalChunks: 0,
                            hasOverlap: false
                        },
                        semanticMetadata: createDefaultSemanticMetadata()
                    });
                }
            } else {
                // Final chunk is within limits
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
                        hasOverlap: false
                    },
                    semanticMetadata: createDefaultSemanticMetadata()
                });
            }
        }
        
        return {
            originalContent: content,
            chunks,
            totalChunks: chunks.length
        };
    }
    
}
