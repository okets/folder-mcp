/**
 * Text Preprocessor Service (Sprint 13)
 *
 * Provides format-specific text cleaning to improve keyword extraction quality.
 * Removes formatting artifacts that pollute n-gram extraction.
 */

/**
 * Text preprocessor for format-specific cleaning
 */
export class TextPreprocessor {
  constructor(private fileType: string) {}

  /**
   * Clean text based on file format
   */
  preprocess(content: string): string {
    switch (this.fileType) {
      case '.md':
      case 'markdown':
        return this.cleanMarkdown(content);
      case '.pdf':
      case 'pdf':
        return this.cleanPDF(content);
      case '.docx':
      case 'word':
        return this.cleanWord(content);
      case '.xlsx':
      case 'excel':
        return this.cleanExcel(content);
      case '.pptx':
      case 'powerpoint':
        return this.cleanPowerPoint(content);
      default:
        return this.cleanGeneric(content);
    }
  }

  /**
   * Clean markdown formatting artifacts
   */
  private cleanMarkdown(content: string): string {
    return content
      // Remove header markers but keep the text
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic formatting
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove code blocks
      .replace(/```[^`]*```/gs, '')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Remove table formatting
      .replace(/^\|.+\|$/gm, '')
      // Remove link formatting but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove image references
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Clean PDF extraction artifacts
   */
  private cleanPDF(content: string): string {
    return content
      // Remove common PDF artifacts
      .replace(/^\s*\d+\s*$/gm, '') // Page numbers alone on lines
      .replace(/^\s*Page\s+\d+\s*$/gim, '') // "Page N" headers
      .replace(/^\s*\f\s*$/gm, '') // Form feed characters
      // Remove excessive whitespace and line breaks
      .replace(/\s{3,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Clean Word document artifacts
   */
  private cleanWord(content: string): string {
    return content
      // Remove excessive whitespace from Word conversion
      .replace(/\s{3,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      // Remove common Word artifacts
      .replace(/\u00A0/g, ' ') // Non-breaking spaces
      .replace(/\u2013|\u2014/g, '-') // En/em dashes
      .replace(/\u201C|\u201D/g, '"') // Smart quotes
      .replace(/\u2018|\u2019/g, "'") // Smart apostrophes
      .trim();
  }

  /**
   * Clean Excel/CSV content
   */
  private cleanExcel(content: string): string {
    return content
      // Remove CSV separators that might interfere
      .replace(/,+/g, ' ')
      // Remove cell references and formulas
      .replace(/[A-Z]+\d+/g, '') // Remove cell references like "A1", "B12"
      // Clean up excessive whitespace
      .replace(/\s{3,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Clean PowerPoint content
   */
  private cleanPowerPoint(content: string): string {
    return content
      // Remove slide markers
      .replace(/^=== Slide \d+ ===/gm, '')
      // Remove speaker notes markers
      .replace(/^\[Speaker Notes\]/gm, '')
      // Clean up excessive whitespace
      .replace(/\s{3,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Generic text cleaning for unknown formats
   */
  private cleanGeneric(content: string): string {
    return content
      // Remove excessive whitespace
      .replace(/\s{3,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }
}

/**
 * Factory function for creating text preprocessor
 */
export function createTextPreprocessor(fileType: string): TextPreprocessor {
  return new TextPreprocessor(fileType);
}