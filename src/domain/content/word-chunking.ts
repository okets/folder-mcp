/**
 * Sprint 11: Word Document Format-Aware Chunking
 * 
 * Implements chunking that respects Word document structure using mammoth's
 * natural paragraph-based coordinate system from HTML extraction.
 */

import { ParsedContent, TextChunk, ChunkedContent, WordMetadata, createDefaultSemanticMetadata } from '../../types/index.js';

/**
 * Represents a parsed paragraph from Word HTML
 */
interface WordParagraph {
    index: number;           // 0-based paragraph index
    type: string;            // HTML element type (p, h1, h2, etc.)
    text: string;            // Plain text content
    html: string;            // Original HTML
    lines: string[];         // Lines within the paragraph
    tokenCount: number;      // Estimated token count
    headingLevel?: number;   // 1-6 for h1-h6 tags
}

/**
 * Word document structure map
 */
interface WordStructureMap {
    paragraphs: WordParagraph[];
    totalTokens: number;
    hasFormatting: boolean;
    headingCount: number;
}

/**
 * Service for Word document format-aware chunking
 */
export class WordChunkingService {
    private readonly DEFAULT_MAX_TOKENS = 1000;
    private readonly DEFAULT_MIN_TOKENS = 100;
    
    /**
     * Chunk a Word document respecting paragraph boundaries
     */
    public chunkWordDocument(
        content: ParsedContent,
        maxTokens: number = this.DEFAULT_MAX_TOKENS,
        minTokens: number = this.DEFAULT_MIN_TOKENS
    ): ChunkedContent {
        if (content.type !== 'word') {
            throw new Error('Content must be a Word document');
        }
        
        const metadata = content.metadata as WordMetadata;
        if (!metadata.htmlContent) {
            throw new Error('Word document must have HTML content from mammoth');
        }
        
        // Parse HTML structure into paragraphs
        const structureMap = this.parseWordStructure(metadata.htmlContent, content.content);
        
        // Create chunks respecting paragraph boundaries
        const chunks = this.createParagraphAwareChunks(
            structureMap,
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
     * Parse HTML content into structured paragraphs
     */
    private parseWordStructure(htmlContent: string, plainText: string): WordStructureMap {
        const paragraphs: WordParagraph[] = [];
        let totalTokens = 0;
        let hasFormatting = false;
        let headingCount = 0;
        
        // Simple HTML parsing using regex (avoiding heavy DOM parsers)
        // Match all paragraph and heading elements
        const elementPattern = /<(p|h[1-6])[^>]*>(.*?)<\/\1>/gs;
        const matches = Array.from(htmlContent.matchAll(elementPattern));
        
        // Also get plain text paragraphs for mapping
        const textParagraphs = plainText.split(/\n\s*\n/).filter(p => p.trim());
        
        matches.forEach((match, index) => {
            const tagName = match[1]?.toLowerCase() || 'p';
            const htmlFragment = match[0] || '';
            const innerHtml = match[2] || '';
            
            // Extract plain text from HTML (remove tags)
            const text = this.extractTextFromHtml(innerHtml);
            if (!text.trim()) return;
            
            // Determine if this is a heading
            const headingMatch = tagName.match(/^h([1-6])$/);
            const headingLevel = headingMatch && headingMatch[1] ? parseInt(headingMatch[1]) : undefined;
            
            if (headingLevel) {
                headingCount++;
                hasFormatting = true;
            }
            
            // Check for other formatting
            if (innerHtml && (innerHtml.includes('<strong>') || innerHtml.includes('<em>') || 
                innerHtml.includes('<u>') || innerHtml.includes('<a '))) {
                hasFormatting = true;
            }
            
            // Split into lines for partial paragraph chunking
            const lines = text.split('\n').filter(l => l.trim());
            
            // Estimate token count (rough: 1 token ≈ 4 characters)
            const tokenCount = Math.ceil(text.length / 4);
            totalTokens += tokenCount;
            
            const paragraph: WordParagraph = {
                index: paragraphs.length,
                type: tagName,
                text,
                html: htmlFragment,
                lines,
                tokenCount
            };
            
            if (headingLevel !== undefined) {
                paragraph.headingLevel = headingLevel;
            }
            
            paragraphs.push(paragraph);
        });
        
        return {
            paragraphs,
            totalTokens,
            hasFormatting,
            headingCount
        };
    }
    
    /**
     * Extract plain text from HTML fragment
     */
    private extractTextFromHtml(html: string): string {
        // Remove HTML tags
        let text = html.replace(/<[^>]+>/g, ' ');
        // Decode HTML entities
        text = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        // Clean up whitespace
        return text.replace(/\s+/g, ' ').trim();
    }
    
    /**
     * Create chunks respecting paragraph boundaries
     */
    private createParagraphAwareChunks(
        structureMap: WordStructureMap,
        fullText: string,
        maxTokens: number,
        minTokens: number
    ): TextChunk[] {
        const chunks: TextChunk[] = [];
        
        // Build paragraph offset map for accurate position tracking
        const paragraphOffsets: Map<number, { start: number; end: number }> = new Map();
        let currentOffset = 0;
        for (const paragraph of structureMap.paragraphs) {
            const start = fullText.indexOf(paragraph.text, currentOffset);
            if (start >= 0) {
                paragraphOffsets.set(paragraph.index, {
                    start,
                    end: start + paragraph.text.length
                });
                currentOffset = start + paragraph.text.length;
            }
        }
        
        let currentChunk: {
            paragraphs: WordParagraph[];
            text: string;
            tokenCount: number;
            startParagraph: number;
            endParagraph: number;
            paragraphTypes: string[];
            headingLevel?: number;
        } | null = null;
        
        for (const paragraph of structureMap.paragraphs) {
            // Start new chunk if none exists
            if (!currentChunk) {
                currentChunk = {
                    paragraphs: [paragraph],
                    text: paragraph.text,
                    tokenCount: paragraph.tokenCount,
                    startParagraph: paragraph.index,
                    endParagraph: paragraph.index,
                    paragraphTypes: [paragraph.type],
                    ...(paragraph.headingLevel !== undefined && { headingLevel: paragraph.headingLevel })
                };
                continue;
            }
            
            // Check if adding this paragraph would exceed max tokens
            const potentialTokens = currentChunk.tokenCount + paragraph.tokenCount;
            
            if (potentialTokens > maxTokens && currentChunk.tokenCount >= minTokens) {
                // Save current chunk
                chunks.push(this.createChunk(
                    currentChunk.text,
                    chunks.length,
                    fullText,
                    currentChunk,
                    paragraphOffsets
                ));
                
                // Start new chunk with this paragraph
                currentChunk = {
                    paragraphs: [paragraph],
                    text: paragraph.text,
                    tokenCount: paragraph.tokenCount,
                    startParagraph: paragraph.index,
                    endParagraph: paragraph.index,
                    paragraphTypes: [paragraph.type],
                    ...(paragraph.headingLevel !== undefined && { headingLevel: paragraph.headingLevel })
                };
            } else {
                // Add paragraph to current chunk
                currentChunk.paragraphs.push(paragraph);
                currentChunk.text += '\n\n' + paragraph.text;
                currentChunk.tokenCount += paragraph.tokenCount;
                currentChunk.endParagraph = paragraph.index;
                currentChunk.paragraphTypes.push(paragraph.type);
                
                // Update heading level if this is a higher-level heading
                if (paragraph.headingLevel && 
                    (!currentChunk.headingLevel || paragraph.headingLevel < currentChunk.headingLevel)) {
                    currentChunk.headingLevel = paragraph.headingLevel;
                }
            }
        }
        
        // Save final chunk
        if (currentChunk && currentChunk.text.trim()) {
            chunks.push(this.createChunk(
                currentChunk.text,
                chunks.length,
                fullText,
                currentChunk,
                paragraphOffsets
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
            startParagraph: number;
            endParagraph: number;
            paragraphTypes: string[];
            headingLevel?: number;
        },
        paragraphOffsets?: Map<number, { start: number; end: number }>
    ): TextChunk {
        // Calculate actual offsets from paragraph map
        let startOffset = 0;
        let endOffset = text.length;
        
        if (paragraphOffsets) {
            const startInfo = paragraphOffsets.get(chunkData.startParagraph);
            const endInfo = paragraphOffsets.get(chunkData.endParagraph);
            
            if (startInfo) {
                startOffset = startInfo.start;
            }
            if (endInfo) {
                endOffset = endInfo.end;
            }
        }
        
        // No longer tracking extraction params - lazy loading retrieves content by chunk ID
        
        return {
            content: text,
            startPosition: startOffset,
            endPosition: endOffset,
            tokenCount: Math.ceil(text.length / 4),
            chunkIndex: index,
            metadata: {
                sourceFile: '',
                sourceType: 'word',
                totalChunks: 0,
                hasOverlap: false
            },
            semanticMetadata: createDefaultSemanticMetadata()
        };
    }
}