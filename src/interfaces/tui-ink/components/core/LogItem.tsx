import React, { ReactElement } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { IListItem } from './IListItem.js';
import { theme } from '../../utils/theme.js';

interface Segment {
    text: string;
    color?: string;
}

export class LogItem implements IListItem {
    readonly selfConstrained = true as const;
    private _isExpanded: boolean = false;
    private _isControllingInput: boolean = false;
    
    constructor(
        private icon: string,
        private text: string,
        private status: string,
        private isActive: boolean,
        isExpanded: boolean,
        private details?: string[]
    ) {
        this._isExpanded = isExpanded;
        // Use status symbol as the bullet icon if available
        // But preserve selection indicator (▶) when active
        if (this.status && this.icon !== '▶') {
            this.icon = this.status;
        }
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    onEnter(): void {
        // Toggle expansion state
        this._isExpanded = !this._isExpanded;
        // Status items don't control input, they just expand/collapse
    }
    
    onExpand(): void {
        // Expand the item (right arrow)
        this._isExpanded = true;
    }
    
    onCollapse(): void {
        // Collapse the item (left arrow)
        this._isExpanded = false;
    }
    
    onExit(): void {
        // Not used for status items
    }
    
    handleInput(input: string, key: any): boolean {
        // Status items don't handle input directly
        return false;
    }
    
    onSelect(): void {
        // Could add visual feedback when selected
    }
    
    onDeselect(): void {
        // Could remove visual feedback when deselected
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (this._isExpanded && this.details) {
            const elements: ReactElement[] = [];
            
            // Header using segments approach with expand icon
            const expandIcon = '▼';
            const tempIcon = this.icon; // Save original icon
            this.icon = expandIcon; // Temporarily set expand icon
            const headerSegments = this.buildSegments(maxWidth);
            this.icon = tempIcon; // Restore original icon
            
            elements.push(
                this.renderSegments(headerSegments)
            );
            
            // Calculate available lines for details (if maxLines is specified)
            let remainingLines = maxLines ? maxLines - 1 : undefined; // -1 for header
            
            // Detail lines - word wrapped to fit width and height
            for (let i = 0; i < this.details.length && (!remainingLines || remainingLines > 0); i++) {
                const detail = this.details[i];
                const wrappedLines = this.wordWrap(detail, maxWidth - 2, remainingLines); // -2 for indent
                
                for (let j = 0; j < wrappedLines.length && (!remainingLines || remainingLines > 0); j++) {
                    elements.push(
                        <Text key={`detail-${i}-${j}`} color={theme.colors.textMuted}>
                            {'  '}{wrappedLines[j]}
                        </Text>
                    );
                    
                    if (remainingLines) {
                        remainingLines--;
                    }
                }
            }
            
            return elements;
        } else {
            // Collapsed view - use segments approach
            const segments = this.buildSegments(maxWidth);
            return this.renderSegments(segments);
        }
    }
    
    getRequiredLines(maxWidth: number): number {
        if (!this._isExpanded || !this.details) {
            return 1;
        }
        
        // Count header + wrapped detail lines
        let lines = 1; // header
        this.details.forEach(detail => {
            const wrappedLines = this.wordWrap(detail, maxWidth - 2);
            lines += wrappedLines.length;
        });
        
        return lines;
    }
    
    private truncateText(maxWidth: number): string {
        const iconWidth = 2; // icon + space
        const statusWidth = this.status ? 2 : 0; // space + status
        const availableWidth = maxWidth - iconWidth - statusWidth;
        
        if (this.text.length <= availableWidth) {
            return this.text;
        }
        
        if (availableWidth <= 3) {
            return '…';
        }
        
        return this.text.slice(0, availableWidth - 1) + '…';
    }
    
    private wordWrap(text: string, maxWidth: number, maxLines?: number): string[] {
        if (text.length <= maxWidth) {
            return [text];
        }
        
        const lines: string[] = [];
        const words = text.split(' ');
        let currentLine = '';
        
        for (const word of words) {
            // Handle words longer than maxWidth by breaking them
            if (word.length > maxWidth) {
                // Finish current line if it has content
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = '';
                    
                    // Check if we've reached maxLines
                    if (maxLines && lines.length >= maxLines - 1) {
                        // Add truncated last line
                        const remaining = words.slice(words.indexOf(word)).join(' ');
                        const truncated = remaining.slice(0, maxWidth - 3) + '...';
                        lines.push(truncated);
                        return lines;
                    }
                }
                
                // Break the long word into chunks
                let remaining = word;
                while (remaining.length > 0 && (!maxLines || lines.length < maxLines - 1)) {
                    const chunk = remaining.slice(0, maxWidth - 1) + '-';
                    lines.push(chunk);
                    remaining = remaining.slice(maxWidth - 1);
                }
                
                // Set remaining part as current line
                if (remaining.length > 0) {
                    currentLine = remaining;
                }
            } else if (currentLine.length === 0) {
                currentLine = word;
            } else if (currentLine.length + 1 + word.length <= maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                
                // Check if we've reached maxLines
                if (maxLines && lines.length >= maxLines - 1) {
                    // Add truncated last line
                    const remaining = words.slice(words.indexOf(word)).join(' ');
                    const truncated = remaining.slice(0, maxWidth - 3) + '...';
                    lines.push(truncated);
                    return lines;
                }
                
                currentLine = word;
            }
        }
        
        if (currentLine.length > 0) {
            if (maxLines && lines.length >= maxLines - 1) {
                // Truncate the last line if needed
                const truncated = currentLine.slice(0, maxWidth - 3) + '...';
                lines.push(truncated);
            } else {
                lines.push(currentLine);
            }
        }
        
        return lines;
    }
    
    private getStatusColor(): string | undefined {
        switch (this.status) {
            case '✓':
                return theme.colors.successGreen;
            case '⚠':
                return theme.colors.warningOrange;
            case '⋯':
                return theme.colors.accent;
            default:
                return undefined;
        }
    }
    
    private buildSegments(maxWidth: number): Segment[] {
        const BUFFER = 2; // Prevent exact width match
        const safeWidth = maxWidth - BUFFER;
        
        // Calculate space allocation
        const iconWidth = this.icon.length + 1; // icon + space
        const availableTextWidth = safeWidth - iconWidth;
        
        // Truncate text if needed
        let displayText = this.text;
        if (this.text.length > availableTextWidth) {
            if (availableTextWidth <= 3) {
                displayText = '…';
            } else {
                displayText = this.text.slice(0, availableTextWidth - 1) + '…';
            }
        }
        
        // Build segments
        // Apply color to the icon (which is now the status symbol)
        const iconColor = this.status ? this.getStatusColor() : undefined;
        
        const segments: Segment[] = [
            { 
                text: this.icon,
                color: this.isActive ? theme.colors.accent : iconColor
            },
            {
                text: ` ${displayText}`,
                color: this.isActive ? theme.colors.accent : undefined
            }
        ];
        
        return segments;
    }
    
    private renderSegments(segments: Segment[]): ReactElement {
        // Use Box with separate Text elements like the old TUI
        // This avoids the ConstrainedContent issue with nested Text
        
        const iconSegment = segments[0]; // Icon (status symbol)
        const textSegment = segments[1]; // Main text
        
        return (
            <Box>
                <Text color={iconSegment.color}>{iconSegment.text}</Text>
                <Text color={textSegment.color}>{textSegment.text}</Text>
            </Box>
        );
    }
}