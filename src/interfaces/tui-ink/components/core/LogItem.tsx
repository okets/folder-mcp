import React, { ReactElement } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { ProgressBar } from './ProgressBar';
import { useProgressMode } from '../../contexts/ProgressModeContext';
import { textColorProp, buildProps } from '../../utils/conditionalProps';

interface Segment {
    text: string;
    color?: string | undefined;
}

export class LogItem implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = true; // LogItems are interactive and navigable
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
        // Expand the item (right arrow) - only expand, don't toggle
        this._isExpanded = true;
        // LogItems don't control input - they just expand/collapse
    }
    
    onExpand(): void {
        // Expand the item (right arrow)
        this._isExpanded = true;
    }
    
    onCollapse(): boolean {
        // Collapse the item (left arrow)
        // Return true if we actually collapsed, false if already collapsed
        if (this._isExpanded) {
            this._isExpanded = false;
            return true;
        }
        return false;
    }
    
    onExit(): void {
        // Called when container exits - not used for individual item collapse
    }
    
    handleInput(input: string, key: any): boolean {
        // LogItems don't handle input directly - let escape bubble up to app level
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
            
            // Header using segments approach - always use ■ when expanded (cursor will be on last detail line)
            const tempIcon = this.icon; // Save current icon
            this.icon = '■'; // Always use square when expanded
            const headerSegments = this.buildSegments(maxWidth);
            this.icon = tempIcon; // Restore original icon
            
            elements.push(
                this.renderSegments(headerSegments, maxWidth)
            );
            
            // Get the original status color for the vertical line (not the selection color)
            const headerColor = this.status ? this.getStatusColor() : undefined;
            
            // Calculate available lines for details (if maxLines is specified)
            let remainingLines = maxLines ? maxLines - 1 : undefined; // -1 for header
            
            // Detail lines - word wrapped to fit width and height
            const allDetailLines: Array<{text: string, isLast: boolean}> = [];
            
            // First collect all detail lines
            for (let i = 0; i < this.details.length && (!remainingLines || allDetailLines.length < remainingLines); i++) {
                const detail = this.details[i] ?? '';
                const maxLinesForDetail = remainingLines ? remainingLines - allDetailLines.length : undefined;
                const wrappedLines = maxLinesForDetail !== undefined 
                    ? this.wordWrap(String(detail), maxWidth - 3, maxLinesForDetail)
                    : this.wordWrap(String(detail), maxWidth - 3);
                
                for (let j = 0; j < wrappedLines.length && (!remainingLines || allDetailLines.length < remainingLines); j++) {
                    const line = wrappedLines[j];
                    if (line !== undefined) {
                        allDetailLines.push({
                            text: line,
                            isLast: false
                        });
                    }
                }
            }
            
            // Mark the last line
            if (allDetailLines.length > 0) {
                const lastLine = allDetailLines[allDetailLines.length - 1];
                if (lastLine) {
                    lastLine.isLast = true;
                }
            }
            
            // Now render with appropriate symbols
            allDetailLines.forEach((line, index) => {
                let symbol = line.isLast ? '└' : '│';
                let spacing = ' '; // Normal 1-space spacing
                
                // Show cursor on the last line when item is active
                if (line.isLast && this.isActive) {
                    symbol = '└▶';
                    spacing = ''; // No extra spacing since cursor takes up space
                }
                
                // Use cyan (selection blue) for symbols when active, otherwise use header color
                const symbolColor = this.isActive ? theme.colors.accent : headerColor;
                
                elements.push(
                    <Text key={`detail-${index}`}>
                        <Text {...textColorProp(symbolColor)}>{symbol}{spacing}</Text>
                        <Text {...textColorProp(theme.colors.textMuted)}>{line.text}</Text>
                    </Text>
                );
            });
            
            return elements;
        } else {
            // Collapsed view - show cursor when active, otherwise use original icon
            const tempIcon = this.icon; // Save current icon
            this.icon = this.isActive ? '▶' : this.icon; // Use cursor when active
            const segments = this.buildSegments(maxWidth);
            this.icon = tempIcon; // Restore original icon
            return this.renderSegments(segments, maxWidth);
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
        const BUFFER = 1; // Small buffer for ellipsis and safety
        const safeWidth = maxWidth - BUFFER;
        
        
        // Calculate space allocation
        const iconWidth = this.icon.length + 1; // icon + space
        
        // For progress items, we need to reserve minimum space
        // But we'll pass the full text and let renderSegments handle truncation
        let displayText = this.text;
        
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
    
    private renderSegments(segments: Segment[], maxWidth: number): ReactElement {
        
        const iconSegment = segments[0];
        const textSegment = segments[1];
        
        // Handle missing segments
        if (!iconSegment || !textSegment) {
            return <Text></Text>;
        }
        
        // If both have the same color, render as single Text to avoid issues
        if (iconSegment.color === textSegment.color && this.progress === undefined) {
            // APPLY TRUNCATION EVEN IN SAME-COLOR PATH
            const iconLength = iconSegment.text.length + 1; // icon + space
            const BUFFER = 1; // Small buffer for ellipsis and safety
            const availableForText = maxWidth - iconLength - BUFFER;
            
            let displayText = textSegment.text;
            if (textSegment.text.length > availableForText) {
                if (availableForText <= 3) {
                    displayText = '…';
                } else {
                    displayText = textSegment.text.slice(0, availableForText - 1) + '…';
                }
            }
            
            const finalText = iconSegment.text + ' ' + displayText;
            
            return (
                <Text {...textColorProp(iconSegment.color)}>
                    {finalText}
                </Text>
            );
        }
        
        // Create a wrapper component to use hooks and handle text truncation
        const ContentWithProgress = () => {
            const progressMode = useProgressMode();
            const hasProgress = this.progress !== undefined || this.status === '⋯';
            
            // Calculate available space for text
            const iconLength = iconSegment.text.length + 1; // icon + space
            const BUFFER = 1; // Small buffer for ellipsis and safety
            
            if (!hasProgress) {
                // No progress bar, use all available space
                const availableForText = maxWidth - iconLength - BUFFER;
                
                // Truncate text if needed
                let displayText = textSegment.text;
                if (textSegment.text.length > availableForText) {
                    if (availableForText <= 3) {
                        displayText = '…';
                    } else {
                        displayText = textSegment.text.slice(0, availableForText - 1) + '…';
                    }
                }
                
                // Combine all text into a single string to prevent any wrapping
                const fullText = iconSegment.text + ' ' + displayText;
                
                return (
                    <Text {...textColorProp(iconSegment.color || textSegment.color)}>
                        {fullText}
                    </Text>
                );
            }
            
            // Calculate space needed for progress
            // Short: 4 chars + 1 space = 5
            // Long: 1 spinner + 10 bar + 1 space + 3-4 percentage = 15-16
            const progressWidth = progressMode === 'short' ? 5 : 16; // Account for consistent spacing
            const availableForText = maxWidth - iconLength - progressWidth - BUFFER;
            
            
            // Truncate text if needed
            let displayText = textSegment.text;
            if (textSegment.text.length > availableForText) {
                if (availableForText <= 3) {
                    displayText = '…';
                } else {
                    displayText = textSegment.text.slice(0, availableForText - 1) + '…';
                }
            }
            
            return (
                <Box justifyContent="space-between" width="100%">
                    <Text>
                        <Text {...textColorProp(iconSegment.color)}>{iconSegment.text}</Text>
                        <Text> </Text>
                        <Text {...textColorProp(textSegment.color)}>{displayText}</Text>
                    </Text>
                    <ProgressBar 
                        mode={progressMode}
                        width={15}  // Not used in long mode since bar is fixed at 10
                        {...(this.progress !== undefined ? { value: this.progress } : {})}
                    />
                </Box>
            );
        };
        
        return <ContentWithProgress />;
    }
}