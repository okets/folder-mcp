import { ParsedContent, TextChunk, ChunkedContent } from '../types';

// Simple tokenizer - approximates tokens as words * 1.3 (common rule of thumb)
export function estimateTokenCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return Math.ceil(words.length * 1.3);
}

// Find sentence boundaries to avoid splitting mid-sentence
export function findSentenceBoundaries(text: string): number[] {
  const boundaries: number[] = [0];
  const sentenceEnders = /[.!?]+\s+/g;
  let match;
  
  while ((match = sentenceEnders.exec(text)) !== null) {
    const endPos = match.index + match[0].length;
    if (endPos < text.length) {
      boundaries.push(endPos);
    }
  }
  
  if (boundaries[boundaries.length - 1] !== text.length) {
    boundaries.push(text.length);
  }
  
  return boundaries;
}

// Smart text chunking function
export function chunkText(parsedContent: ParsedContent, minTokens: number = 200, maxTokens: number = 500, overlapPercent: number = 0.1): ChunkedContent {
  const { content, type, originalPath, metadata } = parsedContent;
  
  if (!content || content.trim().length === 0) {
    return {
      originalContent: parsedContent,
      chunks: [],
      totalChunks: 0
    };
  }
  
  // Adjust parameters based on content type
  let adjustedMinTokens = minTokens;
  let adjustedMaxTokens = maxTokens;
  
  // For dense content types (Excel, CSV-like data), use larger chunk sizes
  if (type === 'excel' || type === 'powerpoint') {
    adjustedMinTokens = minTokens * 2;
    adjustedMaxTokens = maxTokens * 2;
  }
  
  const chunks: TextChunk[] = [];
  
  // First, split on paragraph boundaries (double line breaks)
  const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  
  let globalPosition = 0;
  let chunkIndex = 0;
  let currentChunk = '';
  let chunkStartPos = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (!paragraph) continue;
    
    const paragraphStart = content.indexOf(paragraph, globalPosition);
    
    // Check if adding this paragraph would exceed max tokens
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
    const tokenCount = estimateTokenCount(potentialChunk);
    
    if (currentChunk && tokenCount > adjustedMaxTokens) {
      // Current chunk is ready, but we need to check if it meets minimum tokens
      const currentTokenCount = estimateTokenCount(currentChunk);
      
      if (currentTokenCount >= adjustedMinTokens) {
        // Create chunk from current content
        chunks.push({
          content: currentChunk,
          startPosition: chunkStartPos,
          endPosition: chunkStartPos + currentChunk.length,
          tokenCount: currentTokenCount,
          chunkIndex: chunkIndex++,
          metadata: {
            sourceFile: originalPath,
            sourceType: type,
            totalChunks: 0,
            hasOverlap: false,
            ...(metadata && { originalMetadata: metadata })
          }
        });
        
        // Calculate overlap for next chunk
        const overlapLength = Math.floor(currentChunk.length * overlapPercent);
        if (overlapLength > 0) {
          // Find the best place to start overlap (sentence boundary if possible)
          const overlapStart = Math.max(0, currentChunk.length - overlapLength);
          const sentenceBoundaries = findSentenceBoundaries(currentChunk);
          
          // Find the sentence boundary closest to our desired overlap start
          let bestBoundary = overlapStart;
          for (const boundary of sentenceBoundaries) {
            if (boundary >= overlapStart) {
              bestBoundary = boundary;
              break;
            }
          }
          
          const overlapText = currentChunk.substring(bestBoundary);
          currentChunk = overlapText + '\n\n' + paragraph;
          chunkStartPos = chunkStartPos + bestBoundary;
        } else {
          currentChunk = paragraph;
          chunkStartPos = paragraphStart;
        }
      } else {
        // Current chunk is too small, add this paragraph anyway
        currentChunk = potentialChunk;
      }
    } else if (currentChunk && tokenCount >= adjustedMinTokens && tokenCount <= adjustedMaxTokens) {
      // Perfect size chunk
      currentChunk = potentialChunk;
    } else if (!currentChunk) {
      // Starting a new chunk
      currentChunk = paragraph;
      chunkStartPos = paragraphStart;
    } else {
      // Continue building current chunk
      currentChunk = potentialChunk;
    }
    
    // Update global position
    globalPosition = paragraphStart + paragraph.length;
  }
  
  // Handle the last chunk
  if (currentChunk.trim().length > 0) {
    const lastChunkTokenCount = estimateTokenCount(currentChunk);
    
    // If the last chunk is too small, try to merge it with the previous chunk
    if (lastChunkTokenCount < adjustedMinTokens && chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk) {
        const mergedContent = lastChunk.content + '\n\n' + currentChunk;
        const mergedTokenCount = estimateTokenCount(mergedContent);
        
        if (mergedTokenCount <= adjustedMaxTokens * 1.2) {
          // Merge with previous chunk
          chunks[chunks.length - 1] = {
            content: mergedContent,
            startPosition: lastChunk.startPosition,
            endPosition: chunkStartPos + currentChunk.length,
            tokenCount: mergedTokenCount,
            chunkIndex: lastChunk.chunkIndex,
            metadata: lastChunk.metadata
          };
        } else {
          // Keep as separate chunk even if small
          chunks.push({
            content: currentChunk,
            startPosition: chunkStartPos,
            endPosition: chunkStartPos + currentChunk.length,
            tokenCount: lastChunkTokenCount,
            chunkIndex: chunkIndex++,
            metadata: {
              sourceFile: originalPath,
              sourceType: type,
              totalChunks: 0,
              hasOverlap: false,
              ...(metadata && { originalMetadata: metadata })
            }
          });
        }
      } else {
        // Add as standalone chunk if no previous chunk exists
        chunks.push({
          content: currentChunk,
          startPosition: chunkStartPos,
          endPosition: chunkStartPos + currentChunk.length,
          tokenCount: lastChunkTokenCount,
          chunkIndex: chunkIndex++,
          metadata: {
            sourceFile: originalPath,
            sourceType: type,
            totalChunks: 0,
            hasOverlap: false,
            ...(metadata && { originalMetadata: metadata })
          }
        });
      }
    } else {
      chunks.push({
        content: currentChunk,
        startPosition: chunkStartPos,
        endPosition: chunkStartPos + currentChunk.length,
        tokenCount: lastChunkTokenCount,
        chunkIndex: chunkIndex++,
        metadata: {
          sourceFile: originalPath,
          sourceType: type,
          totalChunks: 0,
          hasOverlap: false,
          ...(metadata && { originalMetadata: metadata })
        }
      });
    }
  }
  
  // Update total chunks and overlap flags
  chunks.forEach((chunk, index) => {
    chunk.metadata.totalChunks = chunks.length;
    chunk.metadata.hasOverlap = index > 0;
  });
  
  return {
    originalContent: parsedContent,
    chunks,
    totalChunks: chunks.length
  };
}
