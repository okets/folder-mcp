import React, { ReactElement } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { IListItem } from './IListItem.js';
import { theme } from '../../utils/theme.js';
import { ProgressBar } from './ProgressBar.js';

interface Segment {
    text: string;
    color?: string;
}

export class LogItem implements IListItem {
    readonly selfConstrained = true as const;
    private _isExpanded: boolean = false;
    private _isControllingInput: boolean = false;
    
    constructor(
        public icon: string,
        private text: string,
        private status: string,
        public isActive: boolean,
        isExpanded: boolean,
        private details?: string[],
        public progress?: number
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
            
            // Header using segments approach - use ■ when expanded
            const tempIcon = this.icon; // Save current icon
            this.icon = '■'; // Use square when expanded
            const headerSegments = this.buildSegments(maxWidth);
            this.icon = tempIcon; // Restore original icon
            
            elements.push(
                this.renderSegments(headerSegments)
            );
            
            // Get the original status color for the vertical line (not the selection color)
            const headerColor = this.status ? this.getStatusColor() : undefined;
            
            // Calculate available lines for details (if maxLines is specified)
            let remainingLines = maxLines ? maxLines - 1 : undefined; // -1 for header
            
            // Detail lines - word wrapped to fit width and height
            const allDetailLines: Array<{text: string, isLast: boolean}> = [];
            
            // First collect all detail lines
            for (let i = 0; i < this.details.length && (!remainingLines || allDetailLines.length < remainingLines); i++) {
                const detail = this.details[i];
                const wrappedLines = this.wordWrap(detail, maxWidth - 3, remainingLines ? remainingLines - allDetailLines.length : undefined);
                
                for (let j = 0; j < wrappedLines.length && (!remainingLines || allDetailLines.length < remainingLines); j++) {
                    allDetailLines.push({
                        text: wrappedLines[j],
                        isLast: false
                    });
                }
            }
            
            // Mark the last line
            if (allDetailLines.length > 0) {
                allDetailLines[allDetailLines.length - 1].isLast = true;
            }
            
            // Now render with appropriate symbols
            allDetailLines.forEach((line, index) => {
                const symbol = line.isLast ? '└' : '│';
                elements.push(
                    <Text key={`detail-${index}`}>
                        <Text color={headerColor}>{symbol}  </Text>
                        <Text color={theme.colors.textMuted}>{line.text}</Text>
                    </Text>
                );
            });
            
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
            const wrappedLines = this.wordWrap(detail, maxWidth - 3);
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
        const progressWidth = ((this.progress !== undefined || this.status === '⋯') ? 5 : 0); // space + 4 char progress
        const safeWidth = maxWidth - BUFFER - progressWidth;
        
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
        
        // When expanded, always use status color for icon to match vertical lines
        const useStatusColor = this._isExpanded && this.icon === '■';
        
        const segments: Segment[] = [
            { 
                text: this.icon,
                color: useStatusColor ? iconColor : (this.isActive ? theme.colors.accent : iconColor)
            },
            {
                text: displayText,
                color: this.isActive ? theme.colors.accent : undefined
            }
        ];
        
        return segments;
    }
    
    private renderSegments(segments: Segment[]): ReactElement {
        const iconSegment = segments[0];
        const textSegment = segments[1];
        
        // If both have the same color, render as single Text to avoid issues
        if (iconSegment.color === textSegment.color && this.progress === undefined) {
            return (
                <Text color={iconSegment.color}>
                    {iconSegment.text} {textSegment.text}
                </Text>
            );
        }
        
        // Otherwise use Box with separate Text components
        return (
            <Box justifyContent="space-between" width="100%">
                <Box>
                    <Text color={iconSegment.color}>{iconSegment.text}</Text>
                    <Text> </Text>
                    <Text color={textSegment.color}>{textSegment.text}</Text>
                </Box>
                {/* Add progress bar to the right if we have progress */}
                {(this.progress !== undefined || this.status === '⋯') && (
                    <ProgressBar 
                        value={this.progress}
                        mode="short"
                    />
                )}
            </Box>
        );
    }
}