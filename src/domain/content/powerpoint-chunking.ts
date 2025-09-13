/**
 * Sprint 11: PowerPoint Document Format-Aware Chunking
 * 
 * Implements chunking that respects PowerPoint slide structure and speaker notes
 * using slide numbers for precise extraction with notes support.
 */

import { ParsedContent, TextChunk, ChunkedContent, createDefaultSemanticMetadata } from '../../types/index.js';
import JSZip from 'jszip';
import { promises as fs } from 'fs';

/**
 * Service for PowerPoint document format-aware chunking
 */
export class PowerPointChunkingService {
    private readonly DEFAULT_MAX_TOKENS = 1000;
    private readonly DEFAULT_MIN_TOKENS = 100;
    
    /**
     * Chunk a PowerPoint document respecting slide boundaries and notes
     */
    public chunkPowerPointDocument(
        content: ParsedContent,
        maxTokens: number = this.DEFAULT_MAX_TOKENS,
        minTokens: number = this.DEFAULT_MIN_TOKENS
    ): ChunkedContent {
        if (content.type !== 'powerpoint') {
            throw new Error('Content must be a PowerPoint document');
        }
        
        // Create chunks respecting slide boundaries
        const chunks = this.createSlideAwareChunks(
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
     * Create chunks respecting slide boundaries and notes
     */
    private createSlideAwareChunks(
        fullText: string,
        maxTokens: number,
        minTokens: number
    ): TextChunk[] {
        const chunks: TextChunk[] = [];
        
        // Split content by slide markers - Match both parser output formats
        // Supports both "=== Slide 1 ===" and "Slide 1:" formats
        const slidePattern = /(?:=== Slide (\d+) ===|^Slide (\d+):)/gm;
        const slides: Array<{
            slideNumber: number;
            content: string;
            hasNotes: boolean;
        }> = [];
        
        let lastIndex = 0;
        let match;
        
        // Reset regex state for matching
        slidePattern.lastIndex = 0;
        
        while ((match = slidePattern.exec(fullText)) !== null) {
            if (lastIndex > 0) {
                // Get previous slide content
                const prevSlideContent = fullText.substring(lastIndex, match.index).trim();
                const prevSlideNum = slides.length;
                if (prevSlideNum > 0 && prevSlideContent) {
                    const prevSlide = slides[prevSlideNum - 1];
                    if (prevSlide) {
                        prevSlide.content = prevSlideContent;
                        prevSlide.hasNotes = prevSlideContent.includes('[Speaker Notes]');
                    }
                }
            }
            
            // Handle both capture groups (match[1] for === format, match[2] for Slide: format)
            const slideNum = match[1] || match[2] || '1';
            slides.push({
                slideNumber: parseInt(slideNum),
                content: '',
                hasNotes: false
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Get last slide content
        if (lastIndex < fullText.length && slides.length > 0) {
            const lastSlide = slides[slides.length - 1];
            if (lastSlide) {
                const lastSlideContent = fullText.substring(lastIndex).trim();
                lastSlide.content = lastSlideContent;
                lastSlide.hasNotes = lastSlideContent.includes('[Speaker Notes]');
            }
        }
        
        // Create chunks from slides
        let currentChunk: {
            slides: Array<{ slideNumber: number; content: string; hasNotes: boolean }>;
            text: string;
            tokenCount: number;
            startSlide: number;
            endSlide: number;
            includeNotes: boolean;
        } | null = null;
        
        for (const slide of slides) {
            const slideText = `Slide ${slide.slideNumber}:\n${slide.content}`;
            const slideTokens = Math.ceil(slideText.length / 4);
            
            if (!currentChunk) {
                // Start new chunk
                currentChunk = {
                    slides: [slide],
                    text: slideText,
                    tokenCount: slideTokens,
                    startSlide: slide.slideNumber,
                    endSlide: slide.slideNumber,
                    includeNotes: slide.hasNotes
                };
            } else {
                // Check if adding this slide would exceed max tokens
                const potentialTokens = currentChunk.tokenCount + slideTokens;
                
                if (potentialTokens > maxTokens && currentChunk.tokenCount >= minTokens) {
                    // Save current chunk
                    chunks.push(this.createChunk(
                        currentChunk.text,
                        chunks.length,
                        fullText,
                        currentChunk
                    ));
                    
                    // Start new chunk
                    currentChunk = {
                        slides: [slide],
                        text: slideText,
                        tokenCount: slideTokens,
                        startSlide: slide.slideNumber,
                        endSlide: slide.slideNumber,
                        includeNotes: slide.hasNotes
                    };
                } else {
                    // Add slide to current chunk
                    currentChunk.slides.push(slide);
                    currentChunk.text += '\n\n' + slideText;
                    currentChunk.tokenCount += slideTokens;
                    currentChunk.endSlide = slide.slideNumber;
                    currentChunk.includeNotes = currentChunk.includeNotes || slide.hasNotes;
                }
            }
        }
        
        // Save final chunk
        if (currentChunk && currentChunk.text.trim()) {
            chunks.push(this.createChunk(
                currentChunk.text,
                chunks.length,
                fullText,
                currentChunk
            ));
        }
        
        // Safety fallback: If no chunks were created but we have content
        if (chunks.length === 0 && fullText.length > minTokens * 4) {
            // Create a single chunk with the entire content as a fallback
            chunks.push(this.createChunk(
                fullText,
                0,
                fullText,
                {
                    startSlide: 1,
                    endSlide: 1,
                    includeNotes: fullText.includes('[Speaker Notes]')
                }
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
        chunkData: {
            startSlide: number;
            endSlide: number;
            includeNotes: boolean;
        }
    ): TextChunk {
        // For PowerPoint documents, we use slide-based chunking
        // The offsets represent positions in the full presentation text
        // Since we're working with structured slides, we use slide indices directly
        const startOffset = 0; // Will be calculated during actual extraction
        const endOffset = text.length;
        
        // No longer tracking extraction params - lazy loading retrieves content by chunk ID
        
        return {
            content: text,
            startPosition: startOffset,
            endPosition: endOffset,
            tokenCount: Math.ceil(text.length / 4),
            chunkIndex: index,
            metadata: {
                sourceFile: '',
                sourceType: 'powerpoint',
                totalChunks: 0,
                hasOverlap: false
            },
            semanticMetadata: createDefaultSemanticMetadata()
        };
    }
    
}
