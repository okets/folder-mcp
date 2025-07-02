import React from 'react';
import { Text } from 'ink';
import { theme } from '../utils/theme';
import { IDestructiveConfig } from '../models/configuration';
import { getVisualWidth } from '../utils/validationDisplay';

export interface ConfirmationBodyProps {
    destructiveConfig: IDestructiveConfig;
    currentValue: string;
    newValue: string;
    focusedButton: number; // 0 for cancel, 1 for confirm
    maxWidth: number;
    maxLines?: number; // Maximum lines available for scrolling
    scrollOffset?: number; // Optional scroll position
    cursorLine?: number; // Line index where cursor is positioned (-1 for button line)
}

export interface ConfirmationBodyResult {
    elements: React.ReactElement[];
    totalLines: number; // Total number of content lines (excluding button line)
}

// Helper function to wrap text to fit within maxWidth
function wrapText(text: string, maxWidth: number, indent: string = ''): string[] {
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = indent;
    
    for (const word of words) {
        const testLine = currentLine + (currentLine.length > indent.length ? ' ' : '') + word;
        const testLineWidth = getVisualWidth(testLine);
        
        if (testLineWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            // Push current line if it has content
            if (currentLine.length > indent.length) {
                lines.push(currentLine);
                currentLine = indent;
            }
            
            // Check if the word itself is too long
            const wordWithIndent = indent + word;
            const wordWithIndentWidth = getVisualWidth(wordWithIndent);
            
            if (wordWithIndentWidth > maxWidth) {
                // Word is too long, we need to break it
                const availableWidth = maxWidth - getVisualWidth(indent); // no buffer
                let truncatedWord = word;
                
                // Binary search for the right truncation point
                while (getVisualWidth(indent + truncatedWord + '…') > maxWidth && truncatedWord.length > 1) {
                    truncatedWord = truncatedWord.substring(0, truncatedWord.length - 1);
                }
                
                lines.push(indent + truncatedWord + '…');
                currentLine = indent;
            } else {
                // Word fits on its own line
                currentLine = wordWithIndent;
            }
        }
    }
    
    if (currentLine.length > indent.length) {
        lines.push(currentLine);
    }
    
    return lines;
}

export const ConfirmationBody = ({
    destructiveConfig,
    currentValue,
    newValue,
    focusedButton,
    maxWidth,
    maxLines = 10,
    scrollOffset = 0,
    cursorLine = 0
}: ConfirmationBodyProps): ConfirmationBodyResult => {
    // Debug input parameters
    if (process.env.TUI_DEBUG === 'true') {
        console.error(`\n=== ConfirmationBody Called ===`);
        console.error(`cursorLine=${cursorLine}, scrollOffset=${scrollOffset}, maxLines=${maxLines}`);
    }
    const { level, title, message, consequences, estimatedTime, confirmText, cancelText } = destructiveConfig;
    const severityColor = level === 'critical' ? theme.colors.dangerRed : theme.colors.warningOrange;
    
    // Calculate content width early
    // There's a persistent "act" bug where Ink wraps lines unexpectedly.
    // Even with total line width < maxWidth, Ink still wraps.
    // This suggests there are additional wrapper characters we're not seeing.
    // 
    // To absolutely prevent Ink's automatic wrapping:
    // - Our prefix: "│▲▶" = 3 chars
    // - Unknown wrapper overhead = 2 chars (estimated)
    // - Safety margin = 2 chars
    // Total: maxWidth - 7
    const contentWidth = maxWidth - 7;
    
    // Build all content lines
    const allLines: Array<{ content: string; color?: string }> = [];
    
    // Title line - wrap if too long to preserve all information
    // Use a warning character that takes 1 cell width for consistent layout
    const warningChar = '⚠'; // Single-width warning character (without emoji variant)
    const titleLine = `${warningChar} ${title}`;
    
    // Wrap title to multiple lines if needed
    const titleLines = wrapText(titleLine, contentWidth);
    
    // Debug logging
    if (process.env.TUI_DEBUG === 'true') {
        console.error(`Title wrapping: "${titleLine}" (${titleLine.length} chars) with contentWidth=${contentWidth}`);
        console.error(`Wrapped into ${titleLines.length} lines:`, titleLines);
    }
    
    titleLines.forEach(line => {
        allLines.push({ content: line, color: severityColor });
    });
    
    // Message lines (wrapped)
    const messageLines = wrapText(message, contentWidth);
    messageLines.forEach(line => {
        allLines.push({ content: line });
    });
    
    // Consequences
    if (consequences && consequences.length > 0) {
        consequences.forEach(consequence => {
            const consequenceLines = wrapText(`• ${consequence}`, contentWidth);
            consequenceLines.forEach(line => {
                allLines.push({ content: line });
            });
        });
    }
    
    // Current and new values - wrap or truncate if too long
    const currentLabel = 'Current: ';
    const newLabel = 'New: ';
    
    // Helper to format value line with proper truncation
    const formatValueLine = (label: string, value: string): string => {
        const fullLine = `${label}[${value}]`;
        if (getVisualWidth(fullLine) <= contentWidth) {
            return fullLine;
        }
        // Truncate the value part only
        const availableForValue = contentWidth - getVisualWidth(label) - 3; // -3 for "[", "]", "…"
        if (availableForValue > 0) {
            return `${label}[${value.substring(0, availableForValue)}…]`;
        }
        return `${label}[…]`;
    };
    
    allLines.push({ 
        content: formatValueLine(currentLabel, currentValue || 'none'),
        color: theme.colors.textMuted 
    });
    allLines.push({ 
        content: formatValueLine(newLabel, newValue),
        color: theme.colors.textMuted 
    });
    
    // Estimated time
    if (estimatedTime) {
        allLines.push({ 
            content: `Time: ${estimatedTime}`,
            color: theme.colors.textMuted 
        });
    }
    
    // Log all lines array for debugging
    if (process.env.TUI_DEBUG === 'true') {
        console.error(`\n=== All Lines (${allLines.length} total) ===`);
        allLines.forEach((line, i) => {
            const isEmpty = line.content === '';
            console.error(`  allLines[${i}]: ${isEmpty ? '[EMPTY]' : `"${line.content}"`} (length=${line.content.length})`);
        });
        console.error(`=== End All Lines ===\n`);
    }
    
    // Calculate scrolling
    const headerLines = 1; // The header line from ConfigurationListItem
    const buttonLines = 1; // The button line at bottom
    const availableForContent = maxLines - headerLines - buttonLines;
    const needsScrolling = allLines.length > availableForContent;
    
    // Debug available space
    if (process.env.TUI_DEBUG === 'true') {
        console.error(`Scrolling calc: maxLines=${maxLines}, header=${headerLines}, button=${buttonLines}, available=${availableForContent}`);
        console.error(`Total lines=${allLines.length}, needsScrolling=${needsScrolling}`);
    }
    
    let visibleLines = allLines;
    let startIndex = 0;
    let showScrollUp = false;
    let showScrollDown = false;
    
    if (needsScrolling) {
        // Clamp scroll offset to valid range to prevent overscroll
        const maxScrollOffset = Math.max(0, allLines.length - availableForContent);
        const clampedOffset = Math.max(0, Math.min(scrollOffset, maxScrollOffset));
        
        startIndex = clampedOffset;
        visibleLines = allLines.slice(startIndex, startIndex + availableForContent);
        
        // Show indicators only when there's actually content to scroll to
        showScrollUp = startIndex > 0;
        showScrollDown = startIndex < maxScrollOffset;
        
        // Debug scrolling
        if (process.env.TUI_DEBUG === 'true') {
            console.error(`\n=== Scrolling Info ===`);
            console.error(`scrollOffset=${scrollOffset}, startIndex=${startIndex}, availableForContent=${availableForContent}`);
            console.error(`needsScrolling=${needsScrolling}, showUp=${showScrollUp}, showDown=${showScrollDown}`);
            console.error(`Visible lines: ${startIndex} to ${startIndex + availableForContent - 1}`);
            console.error(`=== End Scrolling ===\n`);
        }
    }
    
    // Build the output elements
    const elements: React.ReactElement[] = [];
    
    // Add visible content lines with proper prefixes
    visibleLines.forEach((line, index) => {
        const isFirstLine = index === 0;
        const isLastLine = index === visibleLines.length - 1;
        const globalLineIndex = startIndex + index;
        const isCursorLine = cursorLine === globalLineIndex;
        
        // Debug cursor positioning and check for any issues
        if (process.env.TUI_DEBUG === 'true') {
            if (isCursorLine || globalLineIndex <= 2 || line.content === '') {
                const contentDisplay = line.content === '' ? '[EMPTY LINE]' : `"${line.content}"`;
                console.error(`DEBUG Line ${globalLineIndex}: ${contentDisplay} ${isCursorLine ? '<-- CURSOR' : ''}`);
            }
        }
        
        // Determine line prefix - need to include proper indentation for box structure
        // First line continues from header, subsequent lines need full indentation
        const isFirstContentLine = index === 0;
        const needsFullIndent = !isFirstContentLine;
        
        let scrollIndicator = '';
        if (showScrollUp && isFirstLine) {
            scrollIndicator = '▲';
        } else if (showScrollDown && isLastLine) {
            scrollIndicator = '▼';
        } else {
            scrollIndicator = ' ';
        }
        
        // Add cursor indicator
        const cursorIndicator = isCursorLine && cursorLine !== -1 ? '▶' : ' ';
        
        // Build the line with proper indentation
        if (needsFullIndent) {
            // Full indentation for continuation lines
            elements.push(
                <Text key={`line-${index}`}>
                    <Text>│ </Text>
                    <Text>
                        │{scrollIndicator}
                        {isCursorLine && cursorLine !== -1 ? (
                            <Text color={theme.colors.accent}>{cursorIndicator}</Text>
                        ) : (
                            <Text>{cursorIndicator}</Text>
                        )}
                    </Text>
                    {line.color ? (
                        <Text color={line.color}>{line.content}</Text>
                    ) : (
                        <Text>{line.content}</Text>
                    )}
                </Text>
            );
        } else {
            // First line - continues from header
            elements.push(
                <Text key={`line-${index}`}>
                    <Text>
                        │{scrollIndicator}
                        {isCursorLine && cursorLine !== -1 ? (
                            <Text color={theme.colors.accent}>{cursorIndicator}</Text>
                        ) : (
                            <Text>{cursorIndicator}</Text>
                        )}
                    </Text>
                    {line.color ? (
                        <Text color={line.color}>{line.content}</Text>
                    ) : (
                        <Text>{line.content}</Text>
                    )}
                </Text>
            );
        }
    });
    
    // Button line (always visible at bottom)
    // Calculate available space for buttons
    const buttonPrefix = '└─▶ ';
    const checkMark = '✓ ';
    const crossMark = '✗ ';
    const separator = '  ';
    
    // Total fixed width: prefix(4) + checkmark(2) + crossmark(2) + separator(2) = 10
    const fixedWidth = 10;
    const availableForLabels = Math.max(0, maxWidth - fixedWidth - 1); // -1 for safety
    const maxLabelWidth = Math.floor(availableForLabels / 2);
    
    // Truncate labels if needed
    let cancelLabel = cancelText || 'Cancel';
    let confirmLabel = confirmText || 'Confirm';
    
    if (getVisualWidth(cancelLabel) > maxLabelWidth) {
        cancelLabel = cancelLabel.substring(0, maxLabelWidth - 1) + '…';
    }
    if (getVisualWidth(confirmLabel) > maxLabelWidth) {
        confirmLabel = confirmLabel.substring(0, maxLabelWidth - 1) + '…';
    }
    
    const buttonSeparator = separator;
    
    // Add button line with proper prefix
    // Show cursor on button line when cursorLine is -1
    const showButtonCursor = cursorLine === -1;
    const buttonLinePrefix = showButtonCursor ? '└─▶' : '└─ ';
    
    // Add button line with proper indentation
    const buttonLine = (
        <Text key="buttons">
            <Text>│ </Text>
            <Text>{buttonLinePrefix} </Text>
            {focusedButton === 0 ? (
                <>
                    <Text inverse color={theme.colors.accent}>✓ {cancelLabel}</Text>
                    <Text>{buttonSeparator}</Text>
                    <Text color={severityColor}>✗ {confirmLabel}</Text>
                </>
            ) : (
                <>
                    <Text color={theme.colors.successGreen}>✓ {cancelLabel}</Text>
                    <Text>{buttonSeparator}</Text>
                    <Text inverse color={severityColor}>✗ {confirmLabel}</Text>
                </>
            )}
        </Text>
    );
    
    elements.push(buttonLine);
    
    return {
        elements,
        totalLines: allLines.length
    };
};