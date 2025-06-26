import React, { ReactElement } from 'react';
import { Box, Text } from 'ink';
import { IListItem } from './IListItem.js';
import { theme } from '../../utils/theme.js';

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
        const statusColor = this.getStatusColor();
        
        if (this.isExpanded && this.details) {
            const elements: ReactElement[] = [];
            
            // Header with truncated text
            const truncatedText = this.truncateText(maxWidth);
            elements.push(
                <Box key="header">
                    <Text color={this.isActive ? theme.colors.accent : undefined}>
                        {'▼'} {truncatedText}
                    </Text>
                    {this.status && (
                        <Text color={statusColor}> {this.status}</Text>
                    )}
                </Box>
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
            // Collapsed view
            const truncatedText = this.truncateText(maxWidth);
            
            return (
                <Box>
                    <Text color={this.isActive ? theme.colors.accent : undefined}>
                        {this.icon} {truncatedText}
                    </Text>
                    {this.status && (
                        <Text color={statusColor}> {this.status}</Text>
                    )}
                </Box>
            );
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
}