import React, { ReactElement } from 'react';
import { Text, Key, Transform } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';

export type TextOverflowMode = 'truncate' | 'wrap';

/**
 * Responsive text-based ListItem with proper overflow handling
 * Shows a label with an optional value, supports truncation or wrapping
 */
export class TextListItem implements IListItem {
    readonly selfConstrained = true as const;
    private _isControllingInput: boolean = false;
    private _overflowMode: TextOverflowMode;
    
    constructor(
        public icon: string,
        private label: string,
        private value: string = '',
        public isActive: boolean = false,
        private onSelectCallback?: () => void,
        overflowMode: TextOverflowMode = 'wrap'
    ) {
        this._overflowMode = overflowMode;
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    /**
     * Calculate required lines based on text content and overflow mode
     */
    getRequiredLines(maxWidth: number): number {
        if (this._overflowMode === 'truncate') {
            return 1; // Always single line with truncation
        }
        
        // Wrap mode: calculate actual lines needed using the same algorithm as render
        const iconWidth = this.icon.length + 1; // icon + space
        const availableForFirstLine = maxWidth - iconWidth - (this.value ? 2 : 0);
        
        if (availableForFirstLine <= 0) return 1;
        
        // Use the actual wrapping algorithm to get precise line count
        const labelLines = this.wrapText(this.label, availableForFirstLine);
        let totalLines = labelLines.length;
        
        // Add value lines if present
        if (this.value) {
            const valueLines = this.wrapText(this.value, maxWidth - iconWidth);
            totalLines += valueLines.length;
        }
        
        console.error(`\n=== GET REQUIRED LINES DEBUG ===`);
        console.error(`maxWidth: ${maxWidth}, iconWidth: ${iconWidth}, availableForFirstLine: ${availableForFirstLine}`);
        console.error(`labelLines count: ${labelLines.length}, lines: ${JSON.stringify(labelLines)}`);
        console.error(`totalLines calculated: ${totalLines}`);
        console.error(`=== END GET REQUIRED LINES DEBUG ===\n`);
        
        return Math.max(1, totalLines);
    }
    
    /**
     * Break text into lines that fit within maxWidth using word boundaries
     * Based on the proven ConfirmationBody wrapText implementation
     */
    private wrapText(text: string, maxWidth: number, indent: string = ''): string[] {
        console.error(`\n=== WRAPTEXT DEBUG ===`);
        console.error(`Input: "${text}", maxWidth: ${maxWidth}, indent: "${indent}"`);
        
        if (maxWidth <= 0) return [text];
        
        const lines: string[] = [];
        const words = text.split(' ');
        let currentLine = indent;
        
        console.error(`Words to process: ${JSON.stringify(words)}`);
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            console.error(`\n--- Processing word ${i}: "${word}" ---`);
            console.error(`currentLine before: "${currentLine}" (${currentLine.length} chars)`);
            
            const testLine = currentLine + (currentLine.length > indent.length ? ' ' : '') + word;
            const testLineLength = testLine.length;
            
            console.error(`testLine: "${testLine}" (${testLineLength} chars)`);
            console.error(`fits? ${testLineLength} <= ${maxWidth} = ${testLineLength <= maxWidth}`);
            
            if (testLineLength <= maxWidth) {
                currentLine = testLine;
                console.error(`FITS: currentLine updated to: "${currentLine}"`);
            } else {
                console.error(`DOESN'T FIT: processing overflow...`);
                
                // Push current line if it has content
                if (currentLine.length > indent.length) {
                    console.error(`Pushing current line: "${currentLine}"`);
                    lines.push(currentLine);
                    currentLine = indent;
                }
                
                // Check if the word itself is too long
                const wordWithIndent = indent + word;
                console.error(`wordWithIndent: "${wordWithIndent}" (${wordWithIndent.length} chars)`);
                
                if (wordWithIndent.length > maxWidth) {
                    console.error(`Word too long, truncating...`);
                    // Word is too long, truncate with ellipsis
                    const availableWidth = maxWidth - indent.length - 3; // -3 for ellipsis
                    if (availableWidth > 0) {
                        const truncatedWord = word.substring(0, availableWidth);
                        const truncatedLine = indent + truncatedWord + '...';
                        console.error(`Pushing truncated: "${truncatedLine}"`);
                        lines.push(truncatedLine);
                    } else {
                        const ellipsisLine = indent + '...';
                        console.error(`Pushing ellipsis: "${ellipsisLine}"`);
                        lines.push(ellipsisLine);
                    }
                } else {
                    console.error(`Word fits on new line, setting currentLine to: "${wordWithIndent}"`);
                    // Word fits, start new line with it
                    currentLine = wordWithIndent;
                }
            }
            console.error(`currentLine after: "${currentLine}"`);
        }
        
        // Push any remaining content
        if (currentLine.length > indent.length) {
            console.error(`Pushing final line: "${currentLine}"`);
            lines.push(currentLine);
        }
        
        console.error(`Final result: ${JSON.stringify(lines)}`);
        console.error(`=== END WRAPTEXT DEBUG ===\n`);
        
        return lines;
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        console.error(`\n=== TEXTLISTITEM RENDER DEBUG ===`);
        console.error(`maxWidth: ${maxWidth}, maxLines: ${maxLines}`);
        console.error(`icon: "${this.icon}" (${this.icon.length} chars)`);
        console.error(`label: "${this.label}" (${this.label.length} chars)`);
        console.error(`value: "${this.value}" (${this.value.length} chars)`);
        console.error(`overflowMode: ${this._overflowMode}`);
        
        const displayValue = this.value || '';
        // For wrap mode, calculate actual required lines based on content
        // Don't artificially limit with maxLines - let the content determine space needed
        const actualRequiredLines = this.getRequiredLines(maxWidth);
        const maxLinesToUse = this._overflowMode === 'wrap' ? actualRequiredLines : (maxLines || actualRequiredLines);
        
        console.error(`actualRequiredLines: ${actualRequiredLines}, passed maxLines: ${maxLines}, using: ${maxLinesToUse}`);
        
        if (this._overflowMode === 'truncate') {
            // Single line with truncation
            const fullText = `${this.icon} ${this.label}${this.value ? `: ${displayValue}` : ''}`;
            console.error(`fullText: "${fullText}" (${fullText.length} chars)`);
            console.error(`maxWidth: ${maxWidth}, fullText.length: ${fullText.length}`);
            console.error(`EACH CHARACTER: [${fullText.split('').map((c, i) => `${i}:'${c}'`).join(', ')}]`);
            
            let truncatedText = fullText;
            if (fullText.length > maxWidth) {
                const cutPoint = maxWidth - 3;
                truncatedText = fullText.substring(0, cutPoint) + '...';
                console.error(`TRUNCATION: cutPoint=${cutPoint}, maxWidth=${maxWidth}`);
                console.error(`BEFORE: "${fullText.substring(0, cutPoint)}" (${fullText.substring(0, cutPoint).length} chars)`);
                console.error(`AFTER: "${truncatedText}" (${truncatedText.length} chars)`);
                console.error(`EXPECTED FINAL LENGTH: ${cutPoint + 3} should equal ${truncatedText.length}`);
            } else {
                console.error(`NO TRUNCATION needed: ${fullText.length} <= ${maxWidth}`);
            }
            console.error(`FINAL TEXT: "${truncatedText}"`);
            console.error(`FINAL LENGTH: ${truncatedText.length} (should be <= ${maxWidth})`);
            console.error(`FINAL CHARS: [${truncatedText.split('').map((c, i) => `${i}:'${c}'`).join(', ')}]`);
            console.error(`=== END TEXTLISTITEM RENDER DEBUG ===\n`);
            
            console.error(`RENDERING TRUNCATE: Single Text component with truncatedText="${truncatedText}"`);
            console.error(`COMPONENT BREAKDOWN:`);
            console.error(`- Using unified approach: value="${this.value}" (length: ${this.value.length})`);
            console.error(`- Should render as single text: "${truncatedText}"`);
            
            return (
                <Text>
                    <Transform transform={output => output}>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                            {truncatedText}
                        </Text>
                    </Transform>
                </Text>
            );
        }
        
        // Wrap mode: create multiple lines
        console.error(`WRAP MODE - creating multiple lines`);
        console.error(`maxLinesToUse: ${maxLinesToUse}`);
        
        const elements: ReactElement[] = [];
        const iconWidth = this.icon.length + 1;
        let linesUsed = 0;
        
        // First line: icon + start of label
        const availableForFirstLine = maxWidth - iconWidth - (this.value ? 2 : 0);
        console.error(`iconWidth: ${iconWidth}, availableForFirstLine: ${availableForFirstLine}`);
        
        const labelLines = this.wrapText(this.label, availableForFirstLine);
        console.error(`IMPROVED WORD-BASED WRAPPING: ${labelLines.length} lines`);
        console.error(`Lines: ${JSON.stringify(labelLines)}`);
        console.error(`=== END TEXTLISTITEM RENDER DEBUG ===\n`);
        
        if (linesUsed < maxLinesToUse && labelLines.length > 0) {
            elements.push(
                <Text key="line-0">
                    <Transform transform={output => output}>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                            {this.icon}
                        </Text>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                            {' '}{labelLines[0]}
                        </Text>
                        {!this.value && labelLines.length === 1 && (
                            <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                                {/* Complete line */}
                            </Text>
                        )}
                    </Transform>
                </Text>
            );
            linesUsed++;
        }
        
        // Continuation lines for label
        for (let i = 1; i < labelLines.length && linesUsed < maxLinesToUse; i++) {
            elements.push(
                <Text key={`label-line-${i}`}>
                    <Transform transform={output => output}>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                            {' '.repeat(iconWidth)}{labelLines[i]}
                        </Text>
                    </Transform>
                </Text>
            );
            linesUsed++;
        }
        
        // Value lines if present
        if (this.value && linesUsed < maxLinesToUse) {
            const valueLines = this.wrapText(this.value, maxWidth - iconWidth);
            
            // First value line with separator
            if (valueLines.length > 0) {
                elements.push(
                    <Text key="value-line-0">
                        <Transform transform={output => output}>
                            <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                                {' '.repeat(iconWidth - 2)}: 
                            </Text>
                            <Text {...textColorProp(theme.colors.configValuesColor)}>
                                {valueLines[0]}
                            </Text>
                        </Transform>
                    </Text>
                );
                linesUsed++;
            }
            
            // Continuation lines for value
            for (let i = 1; i < valueLines.length && linesUsed < maxLinesToUse; i++) {
                elements.push(
                    <Text key={`value-line-${i}`}>
                        <Transform transform={output => output}>
                            <Text {...textColorProp(theme.colors.configValuesColor)}>
                                {' '.repeat(iconWidth)}{valueLines[i]}
                            </Text>
                        </Transform>
                    </Text>
                );
                linesUsed++;
            }
        }
        
        return elements.length === 1 ? elements[0]! : elements;
    }
    
    onEnter(): void {
        // Simple text items don't take control of input
        if (this.onSelectCallback) {
            this.onSelectCallback();
        }
    }
    
    onExit(): void {
        // Nothing to do
    }
    
    handleInput(input: string, key: Key): boolean {
        // Text items don't handle input
        return false;
    }
    
    onSelect?(): void {
        // Visual feedback when selected
    }
    
    onDeselect?(): void {
        // Remove visual feedback when deselected
    }
}