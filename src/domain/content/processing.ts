/**
 * Content Processing Domain Logic
 * 
 * Pure business logic for content transformation and enhancement.
 */

import { ParsedContent } from '../../types/index.js';

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
 * Domain interface for content processing operations
 */
export interface ContentProcessingOperations {
  transformContent(content: ParsedContent, options?: ContentTransformationOptions): ParsedContent;
  enhanceContent(content: ParsedContent): EnhancedContent;
  extractKeyPhrases(text: string, maxPhrases?: number): string[];
  generateSummary(text: string, maxLength?: number): string;
  detectTopics(text: string): string[];
  calculateReadabilityScore(text: string): number;
}

/**
 * Content Processing Service - Core domain logic for content enhancement
 * 
 * Note: Methods are static for pure functional operations without instance state.
 * The ContentProcessingOperations interface is preserved for type reference but
 * not implemented since static methods cannot satisfy instance interfaces.
 */
export class ContentProcessingService {
  /**
   * Transform and normalize content
   */
  transformContent(content: ParsedContent, options: ContentTransformationOptions = {}): ParsedContent {
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
        ContentProcessingService.wrapText(paragraph, opts.maxLineLength!)
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
   */
  enhanceContent(content: ParsedContent): EnhancedContent {
    const keyPhrases = ContentProcessingService.extractKeyPhrases(content.content);
    const summary = ContentProcessingService.generateSummary(content.content);
    const topics = ContentProcessingService.detectTopics(content.content);
    const readabilityScore = ContentProcessingService.calculateReadabilityScore(content.content);
    
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
   * Extract key phrases from text using simple frequency analysis
   */
  static extractKeyPhrases(text: string, maxPhrases: number = 10): string[] {
    // Input validation - return empty array for invalid input
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    // Simple implementation - could be enhanced with NLP libraries
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !ContentProcessingService.isStopWord(word));
    
    // Count word frequencies
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    // Sort by frequency and return top phrases
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPhrases)
      .map(([word]) => word);
  }

  /**
   * Generate a simple extractive summary
   */
  static generateSummary(text: string, maxLength: number = 200): string {
    const sentences = ContentProcessingService.extractSentences(text);
    
    if (sentences.length <= 2) {
      return text.substring(0, maxLength);
    }
    
    // Simple scoring based on sentence position and length
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      score: ContentProcessingService.scoreSentence(sentence, index, sentences.length)
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
   * Detect topics using simple keyword clustering
   */
  static detectTopics(text: string): string[] {
    // Input validation - return default topic for invalid input
    if (!text || typeof text !== 'string') {
      return ['general'];
    }
    
    const keyPhrases = ContentProcessingService.extractKeyPhrases(text, 20);
    
    // Group related phrases (simple implementation)
    const topics: string[] = [];
    const topicKeywords = ContentProcessingService.getTopicKeywords();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matches = keyPhrases.filter(phrase => 
        keywords.some(keyword => phrase.includes(keyword))
      );
      
      if (matches.length > 0) {
        topics.push(topic);
      }
    }
    
    return topics.length > 0 ? topics : ['general'];
  }

  /**
   * Calculate readability score (Flesch Reading Ease approximation)
   */
  static calculateReadabilityScore(text: string): number {
    // Input validation - return 0 for invalid or empty input
    if (!text || typeof text !== 'string') {
      return 0;
    }
    
    const sentences = ContentProcessingService.extractSentences(text);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((total, word) => total + ContentProcessingService.countSyllables(word), 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    // Clamp score between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Private helper methods
   */
  private static wrapText(text: string, maxLength: number): string {
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

  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private static extractSentences(text: string): string[] {
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private static scoreSentence(sentence: string, index: number, totalSentences: number): number {
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

  private static countSyllables(word: string): number {
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

  private static getTopicKeywords(): Record<string, string[]> {
    return {
      'technology': ['software', 'computer', 'digital', 'tech', 'system', 'data', 'code', 'program'],
      'business': ['company', 'market', 'revenue', 'profit', 'customer', 'strategy', 'management'],
      'science': ['research', 'study', 'analysis', 'experiment', 'theory', 'method', 'result'],
      'education': ['learn', 'teach', 'student', 'school', 'course', 'knowledge', 'skill'],
      'health': ['medical', 'health', 'patient', 'treatment', 'disease', 'medicine', 'care'],
      'finance': ['money', 'financial', 'investment', 'budget', 'cost', 'price', 'economic']
    };
  }
}

/**
 * Default implementation for dependency injection
 */
export const createContentProcessingService = (): ContentProcessingService => new ContentProcessingService();
