import React, { ReactElement } from 'react';
import { Text, Key, Transform } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';

export type TextOverflowMode = 'truncate' | 'wrap';

/**
 * Responsive text-based ListItem with proper overflow handling
 * Shows a single text value, supports truncation or wrapping
 */
export class TextListItem implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = false; // TextListItems are descriptive and should be skipped in navigation
    private _isControllingInput: boolean = false;
    private _overflowMode: TextOverflowMode;
    
    constructor(
        public icon: string,
        private formattedText: string | ReactElement, // Can be formatted string or React element
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
        // For empty icon, we still need 1 space; for non-empty icon, we need icon + space
        const iconWidth = this.icon.length === 0 ? 1 : this.icon.length + 1;
        const availableWidth = maxWidth - iconWidth - 3; // Reserve 3 spaces for indentation
        
        if (availableWidth <= 0) return 1;
        
        // Extract plain text for calculation if it's a React element
        const plainText = typeof this.formattedText === 'string' ? this.formattedText : 'Formatted content';
        
        // Use the actual wrapping algorithm to get precise line count
        const textLines = this.wrapText(plainText, availableWidth);
        
        return Math.max(1, textLines.length);
    }
    
    /**
     * Break text into lines that fit within maxWidth using word boundaries
     * Based on the proven ConfirmationBody wrapText implementation
     */
    private wrapText(text: string, maxWidth: number, indent: string = ''): string[] {
        if (maxWidth <= 0) return [text];
        
        const lines: string[] = [];
        const words = text.split(' ');
        let currentLine = indent;
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (!word) continue; // Skip undefined words
            
            const testLine = currentLine + (currentLine.length > indent.length ? ' ' : '') + word;
            const testLineLength = testLine.length;
            
            if (testLineLength <= maxWidth) {
                currentLine = testLine;
            } else {
                
                // Push current line if it has content
                if (currentLine.length > indent.length) {
                    lines.push(currentLine);
                    currentLine = indent;
                }
                
                // Check if the word itself is too long
                const wordWithIndent = indent + word;
                
                if (wordWithIndent.length > maxWidth) {
                    // Word is too long, truncate with ellipsis
                    const availableWidth = maxWidth - indent.length - 3; // -3 for ellipsis
                    if (availableWidth > 0) {
                        const truncatedWord = word.substring(0, availableWidth);
                        const truncatedLine = indent + truncatedWord + '...';
                        lines.push(truncatedLine);
                    } else {
                        const ellipsisLine = indent + '...';
                        lines.push(ellipsisLine);
                    }
                } else {
                    // Word fits, start new line with it
                    currentLine = wordWithIndent;
                }
            }
        }
        
        // Push any remaining content
        if (currentLine.length > indent.length) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        // For wrap mode, calculate actual required lines based on content
        // Don't artificially limit with maxLines - let the content determine space needed
        const actualRequiredLines = this.getRequiredLines(maxWidth);
        const maxLinesToUse = this._overflowMode === 'wrap' ? actualRequiredLines : (maxLines || actualRequiredLines);
        
        if (this._overflowMode === 'truncate') {
            // Single line with truncation
            // Use cursor arrow when active, otherwise use the normal icon
            const displayIcon = this.isActive ? '▶' : this.icon;
            
            return (
                <Text>
                    <Transform transform={output => output}>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                            {displayIcon}
                        </Text>
                        <Text>
                            {' '}
                        </Text>
                        {typeof this.formattedText === 'string' ? (
                            <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                                {this.formattedText}
                            </Text>
                        ) : (
                            this.formattedText
                        )}
                    </Transform>
                </Text>
            );
        }
        
        // Wrap mode: create multiple lines
        const elements: ReactElement[] = [];
        // Use cursor arrow when active, otherwise use the normal icon
        const displayIcon = this.isActive ? '▶' : this.icon;
        // For empty icon, we still need 1 space; for non-empty icon, we need icon + space
        const iconWidth = displayIcon.length === 0 ? 1 : displayIcon.length + 1;
        let linesUsed = 0;
        
        if (typeof this.formattedText === 'string') {
            // Handle string text with wrapping
            const availableWidth = maxWidth - iconWidth - 3; // Reserve 3 spaces for indentation
            const textLines = this.wrapText(this.formattedText, availableWidth);
            
            // First line: icon + indentation + start of text
            if (linesUsed < maxLinesToUse && textLines.length > 0) {
                elements.push(
                    <Text key="line-0">
                        <Transform transform={output => output}>
                            <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                                {displayIcon}
                            </Text>
                            <Text>
                                {"   "}{textLines[0]}
                            </Text>
                        </Transform>
                    </Text>
                );
                linesUsed++;
            }
            
            // Continuation lines for text
            for (let i = 1; i < textLines.length && linesUsed < maxLinesToUse; i++) {
                elements.push(
                    <Text key={`text-line-${i}`}>
                        <Transform transform={output => output}>
                            <Text>
                                {' '.repeat(iconWidth + 3)}{textLines[i]}
                            </Text>
                        </Transform>
                    </Text>
                );
                linesUsed++;
            }
        } else {
            // Handle React element - single line only with indentation
            elements.push(
                <Text key="formatted-line">
                    <Transform transform={output => output}>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                            {displayIcon}
                        </Text>
                        <Text>
                            {"   "}
                        </Text>
                        {this.formattedText}
                    </Transform>
                </Text>
            );
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