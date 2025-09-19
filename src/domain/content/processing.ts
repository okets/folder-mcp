/**
 * Content Processing Utilities
 *
 * Minimal utilities for content transformation. The main semantic extraction
 * is now handled by SemanticExtractionService (Sprint 0 implementation).
 */

import { ParsedContent } from '../../types/index.js';
import { extractKeyPhraseCandidates } from '../semantic/algorithms/ngram-utils.js';

/**
 * Content transformation options
 */
export interface ContentTransformationOptions {
  normalizeWhitespace?: boolean;
  removeEmptyLines?: boolean;
  preserveFormatting?: boolean;
  maxLineLength?: number;
}

/**
 * Content enhancement metadata
 */
export interface ContentEnhancement {
  keyPhrases: string[];
  summary?: string;
  topics: string[];
  readabilityScore?: number;
}

/**
 * Enhanced content with processing metadata
 */
export interface EnhancedContent extends ParsedContent {
  enhancement: ContentEnhancement;
  transformationApplied: ContentTransformationOptions;
  processingTimestamp: Date;
}
/**
 * Transform and normalize content
 * @deprecated Use SemanticExtractionService for new extraction workflows
 */
export function transformContent(content: ParsedContent, options: ContentTransformationOptions = {}): ParsedContent {
  const defaultOptions: ContentTransformationOptions = {
    normalizeWhitespace: true,
    removeEmptyLines: true,
    preserveFormatting: false
  };

  const opts = { ...defaultOptions, ...options };
  let transformedContent = content.content;

  if (opts.normalizeWhitespace) {
    // Normalize whitespace while preserving intentional formatting
    transformedContent = transformedContent.replace(/[ \t]+/g, ' ');
  }

  if (opts.removeEmptyLines) {
    // Remove excessive empty lines but preserve paragraph breaks
    transformedContent = transformedContent.replace(/\n\s*\n\s*\n+/g, '\n\n');
  }

  if (opts.maxLineLength && !opts.preserveFormatting) {
    // Wrap long lines while preserving paragraph structure
    const paragraphs = transformedContent.split(/\n\s*\n/);
    const wrappedParagraphs = paragraphs.map(paragraph =>
      wrapText(paragraph, opts.maxLineLength!)
    );
    transformedContent = wrappedParagraphs.join('\n\n');
  }

  return {
    ...content,
    content: transformedContent.trim()
  };
}

/**
 * Enhance content with extracted metadata
 * @deprecated Use SemanticExtractionService for new extraction workflows
 */
export function enhanceContent(content: ParsedContent): EnhancedContent {
  const keyPhrases = extractKeyPhraseCandidates(content.content, 10);
  const summary = generateSummary(content.content);
  const topics = ['general']; // Simple fallback - main extraction handled by SemanticExtractionService
  const readabilityScore = calculateReadabilityScore(content.content);

  return {
    ...content,
    enhancement: {
      keyPhrases,
      summary,
      topics,
      readabilityScore
    },
    transformationApplied: {},
    processingTimestamp: new Date()
  };
}


/**
 * Generate a simple extractive summary
 */
export function generateSummary(text: string, maxLength: number = 200): string {
  const sentences = extractSentences(text);
    
    if (sentences.length <= 2) {
      return text.substring(0, maxLength);
    }
    
    // Simple scoring based on sentence position and length
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      score: scoreSentence(sentence, index, sentences.length)
    }));
    
    // Sort by score and take top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    let currentLength = 0;
    
    for (const { sentence } of scoredSentences) {
      if (currentLength + sentence.length > maxLength) break;
      if (summary) summary += ' ';
      summary += sentence;
      currentLength += sentence.length;
    }
    
    return summary || (sentences[0] ? sentences[0].substring(0, maxLength) : '');
  }


/**
 * Calculate readability score (Flesch Reading Ease approximation)
 */
export function calculateReadabilityScore(text: string): number {
  // Input validation - return 0 for invalid or empty input
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const sentences = extractSentences(text);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    // Clamp score between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

/**
 * Helper functions
 */
function wrapText(text: string, maxLength: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }


function extractSentences(text: string): string[] {
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

function scoreSentence(sentence: string, index: number, totalSentences: number): number {
    let score = 0;
    
    // Position bonus (first and early sentences are often important)
    if (index === 0) score += 3;
    else if (index < totalSentences * 0.2) score += 2;
    
    // Length bonus (medium-length sentences often contain key information)
    const words = sentence.split(/\s+/).length;
    if (words >= 10 && words <= 25) score += 2;
    
    // Keyword bonus (sentences with common important words)
    const importantWords = ['important', 'key', 'main', 'primary', 'significant', 'note', 'conclusion'];
    const lowerSentence = sentence.toLowerCase();
    importantWords.forEach(word => {
      if (lowerSentence.includes(word)) score += 1;
    });
    
    return score;
  }

function countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let syllableCount = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const currentChar = word[i];
      if (currentChar) {
        const isVowel = vowels.includes(currentChar);
        if (isVowel && !previousWasVowel) {
          syllableCount++;
        }
        previousWasVowel = isVowel;
      }
    }
    
    // Adjust for silent 'e'
    if (word.endsWith('e')) syllableCount--;
    
    return Math.max(1, syllableCount);
}
