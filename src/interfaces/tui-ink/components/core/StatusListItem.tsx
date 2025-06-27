import React, { ReactElement } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { IListItem } from './IListItem.js';
import { theme } from '../../utils/theme.js';

interface Segment {
    text: string;
    color?: string;
}

export class StatusListItem implements IListItem {
    constructor(
        private icon: string,
        private text: string,
        private status: string,
        private isActive: boolean,
        private isExpanded: boolean,
        private details?: string[]
    ) {}
    
    render(maxWidth: number): ReactElement | ReactElement[] {
        if (this.isExpanded && this.details) {
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
            
            // Detail lines - word wrapped to fit width
            this.details.forEach((detail, index) => {
                const wrappedLines = this.wordWrap(detail, maxWidth - 2); // -2 for indent
                wrappedLines.forEach((line, lineIndex) => {
                    elements.push(
                        <Text key={`detail-${index}-${lineIndex}`} color={theme.colors.textMuted}>
                            {'  '}{line}
                        </Text>
                    );
                });
            });
            
            return elements;
        } else {
            // Collapsed view - use segments approach
            const segments = this.buildSegments(maxWidth);
            return this.renderSegments(segments);
        }
    }
    
    getRequiredLines(maxWidth: number): number {
        if (!this.isExpanded || !this.details) {
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
    
    private wordWrap(text: string, maxWidth: number): string[] {
        if (text.length <= maxWidth) {
            return [text];
        }
        
        const lines: string[] = [];
        const words = text.split(' ');
        let currentLine = '';
        
        for (const word of words) {
            if (currentLine.length === 0) {
                currentLine = word;
            } else if (currentLine.length + 1 + word.length <= maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        
        if (currentLine.length > 0) {
            lines.push(currentLine);
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
        const statusWidth = this.status ? this.status.length + 1 : 0; // status + space
        const availableTextWidth = safeWidth - iconWidth - statusWidth;
        
        // Truncate text if needed
        let displayText = this.text;
        if (this.text.length > availableTextWidth) {
            if (availableTextWidth <= 3) {
                displayText = '…';
            } else {
                displayText = this.text.slice(0, availableTextWidth - 1) + '…';
            }
        }
        
        // Calculate padding to align status to the right
        const usedWidth = iconWidth + displayText.length + statusWidth;
        const padding = Math.max(0, safeWidth - usedWidth);
        
        // Build segments
        const segments: Segment[] = [
            { 
                text: `${this.icon} ${displayText}`, 
                color: this.isActive ? theme.colors.accent : undefined 
            }
        ];
        
        if (padding > 0) {
            segments.push({ text: ' '.repeat(padding) });
        }
        
        if (this.status) {
            segments.push({ 
                text: ` ${this.status}`, 
                color: this.getStatusColor() 
            });
        }
        
        return segments;
    }
    
    private renderSegments(segments: Segment[]): ReactElement {
        // Use Box with separate Text elements like the old TUI
        // This avoids the ConstrainedContent issue with nested Text
        
        // Find the main text segment and status segment
        const mainSegment = segments[0]; // Icon + text
        const paddingSegment = segments[1]; // Padding spaces
        const statusSegment = segments[2]; // Status symbol
        
        return (
            <Box>
                <Text color={mainSegment.color}>
                    {mainSegment.text}
                    {paddingSegment ? paddingSegment.text : ''}
                </Text>
                {statusSegment && statusSegment.text.trim() && (
                    <Text color={statusSegment.color}>{statusSegment.text}</Text>
                )}
            </Box>
        );
    }
}