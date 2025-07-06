import { IContentService } from './interfaces';

export class ContentService implements IContentService {
    measureText(text: string): number {
        // In a terminal, we need to account for Unicode characters
        // This is a simplified version - in production, we'd use a proper
        // Unicode width library like 'string-width'
        let width = 0;
        for (const char of text) {
            // Basic check for common double-width characters
            const code = char.charCodeAt(0);
            if (code >= 0x1100 && code <= 0x115F || // Hangul Jamo
                code >= 0x2E80 && code <= 0x9FFF || // CJK
                code >= 0xAC00 && code <= 0xD7AF || // Hangul Syllables
                code >= 0xF900 && code <= 0xFAFF || // CJK Compatibility
                code >= 0xFE30 && code <= 0xFE6F || // CJK Compatibility Forms
                code >= 0xFF00 && code <= 0xFF60 || // Fullwidth Forms
                code >= 0xFFE0 && code <= 0xFFE6) { // Fullwidth Forms
                width += 2;
            } else {
                width += 1;
            }
        }
        return width;
    }

    truncateText(text: string, maxWidth: number, ellipsis: string = '…'): string {
        const textWidth = this.measureText(text);
        // Change from <= to < to ensure text exactly at maxWidth gets truncated
        // This prevents edge cases where text fits exactly but leaves no margin
        if (textWidth < maxWidth) {
            if (process.env.DEBUG_TRUNCATE) {
                console.error(`[ContentService] No truncation needed: "${text}" (${textWidth} < ${maxWidth})`);
            }
            return text;
        }

        const ellipsisWidth = this.measureText(ellipsis);
        const targetWidth = maxWidth - ellipsisWidth;
        
        if (process.env.DEBUG_TRUNCATE) {
            console.error(`[ContentService] Truncating: "${text}" (${textWidth} > ${maxWidth})`);
            console.error(`  Ellipsis width: ${ellipsisWidth}, Target width: ${targetWidth}`);
        }
        
        if (targetWidth <= 0) {
            return ellipsis.substring(0, Math.max(0, maxWidth));
        }

        let result = '';
        let currentWidth = 0;
        
        for (const char of text) {
            const charWidth = this.measureText(char);
            if (currentWidth + charWidth > targetWidth) {
                break;
            }
            result += char;
            currentWidth += charWidth;
        }
        
        const truncated = result + ellipsis;
        if (process.env.DEBUG_TRUNCATE) {
            console.error(`  Result: "${truncated}" (width: ${this.measureText(truncated)})`);
        }
        
        return truncated;
    }

    wrapText(text: string, maxWidth: number): string[] {
        if (maxWidth <= 0) {
            return [text];
        }

        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        let currentWidth = 0;

        for (const word of words) {
            const wordWidth = this.measureText(word);
            const spaceWidth = currentLine ? 1 : 0;

            if (currentWidth + spaceWidth + wordWidth <= maxWidth) {
                if (currentLine) {
                    currentLine += ' ';
                    currentWidth += 1;
                }
                currentLine += word;
                currentWidth += wordWidth;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                
                // If word is too long, break it
                if (wordWidth > maxWidth) {
                    let remainingWord = word;
                    while (remainingWord) {
                        let part = '';
                        let partWidth = 0;
                        
                        for (const char of remainingWord) {
                            const charWidth = this.measureText(char);
                            if (partWidth + charWidth > maxWidth) {
                                break;
                            }
                            part += char;
                            partWidth += charWidth;
                        }
                        
                        if (part) {
                            lines.push(part);
                            remainingWord = remainingWord.substring(part.length);
                        } else {
                            // Can't fit even one character, force it
                            if (typeof remainingWord === 'string' && remainingWord.length > 0) {
                                lines.push(remainingWord[0] as string);
                                remainingWord = remainingWord.substring(1);
                            }
                        }
                    }
                    currentLine = '';
                    currentWidth = 0;
                } else {
                    currentLine = word;
                    currentWidth = wordWidth;
                }
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [''];
    }
}