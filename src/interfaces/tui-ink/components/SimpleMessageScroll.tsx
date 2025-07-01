import React from 'react';
import { Text } from 'ink';
import { theme } from '../utils/theme.js';

export interface SimpleMessageScrollProps {
    message: string;
    maxWidth: number;
    maxLines: number;
    scrollOffset: number;
    cursorLine?: number; // Line index where cursor is positioned
    hasTitle?: boolean; // Whether the first line is a title
}

export interface SimpleMessageScrollResult {
    elements: React.ReactElement[];
    totalLines: number;
}

export const SimpleMessageScroll = ({
    message,
    maxWidth,
    maxLines,
    scrollOffset,
    cursorLine = -1,
    hasTitle = false
}: SimpleMessageScrollProps): SimpleMessageScrollResult => {
    const elements: React.ReactElement[] = [];
    
    // Calculate content width accounting for the line structure
    // First line: "│ " (2 chars for continuing from header)
    // Other lines: "│ │ " (4 chars)
    const firstLineWidth = maxWidth - 2;
    const otherLineWidth = maxWidth - 4;
    
    // Split message into lines, respecting newlines
    const paragraphs = message.split('\n');
    const lines: string[] = [];
    let isFirstLine = true;
    
    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let currentLine = '';
        
        for (const word of words) {
            const targetWidth = isFirstLine ? firstLineWidth : otherLineWidth;
            
            // Check if word itself is too long
            if (word.length > targetWidth) {
                // If we have content on current line, push it first
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = '';
                    isFirstLine = false;
                }
                // Truncate the long word
                lines.push(word.substring(0, targetWidth - 1) + '…');
                isFirstLine = false;
            } else if (currentLine === '') {
                currentLine = word;
            } else if (currentLine.length + 1 + word.length <= targetWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
                isFirstLine = false;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
            isFirstLine = false;
        }
    }
    
    // Calculate visible lines
    const totalLines = lines.length;
    const visibleLines = lines.slice(scrollOffset, scrollOffset + maxLines);
    
    // Render each visible line
    visibleLines.forEach((line, index) => {
        const isFirstLine = scrollOffset === 0 && index === 0;
        const isLastLine = scrollOffset + index === totalLines - 1;
        const showScrollUp = scrollOffset > 0 && index === 0;
        const showScrollDown = scrollOffset + maxLines < totalLines && index === visibleLines.length - 1;
        
        // Check if this line has the cursor
        const globalLineIndex = scrollOffset + index;
        const isCursorLine = globalLineIndex === cursorLine;
        const cursorIndicator = isCursorLine ? '▶' : ' ';
        const cursorColor = isCursorLine ? theme.colors.accent : undefined;
        
        // Split line to color appropriately
        const words = line.split(' ');
        const isFirstGlobalLine = scrollOffset + index === 0;
        const isSecondGlobalLine = scrollOffset + index === 1;
        let lineContent;
        
        if (hasTitle && isFirstGlobalLine) {
            // First line is title - style it with warning color
            lineContent = <Text color={theme.colors.warningOrange}>⚠ {line}</Text>;
        } else if (hasTitle && isSecondGlobalLine && words.length >= 2) {
            // Second line (first message line) - color first two words in red
            const firstTwoWords = words.slice(0, 2).join(' ');
            const restOfLine = words.slice(2).join(' ');
            lineContent = (
                <>
                    <Text color={theme.colors.dangerRed}>{firstTwoWords}</Text>
                    {restOfLine && <Text> {restOfLine}</Text>}
                </>
            );
        } else if (!hasTitle && isFirstGlobalLine && words.length >= 2) {
            // No title - color first two words of first line in red
            const firstTwoWords = words.slice(0, 2).join(' ');
            const restOfLine = words.slice(2).join(' ');
            lineContent = (
                <>
                    <Text color={theme.colors.dangerRed}>{firstTwoWords}</Text>
                    {restOfLine && <Text> {restOfLine}</Text>}
                </>
            );
        } else {
            lineContent = <Text>{line}</Text>;
        }
        
        // Format lines according to mockup
        if (index === 0 && scrollOffset === 0) {
            // Very first line - continues from header with 3 spaces
            elements.push(
                <Text key={`line-${index}`}>
                    <Text color={theme.colors.accent}>│  </Text><Text color={cursorColor}>{cursorIndicator}</Text>{lineContent}
                </Text>
            );
        } else if (index === 0) {
            // First visible line but scrolled - show scroll indicator
            elements.push(
                <Text key={`line-${index}`}>
                    <Text color={theme.colors.accent}>│▲ </Text><Text color={cursorColor}>{cursorIndicator}</Text>{lineContent}
                </Text>
            );
        } else {
            // Other lines with 3-space indent
            const isLastVisibleLine = index === visibleLines.length - 1;
            const hasMoreBelow = scrollOffset + visibleLines.length < totalLines;
            const scrollIndicator = (isLastVisibleLine && hasMoreBelow) ? '▼' : ' ';
            
            elements.push(
                <Text key={`line-${index}`}>
                    <Text color={theme.colors.accent}>│{scrollIndicator} </Text><Text color={cursorColor}>{cursorIndicator}</Text>{lineContent}
                </Text>
            );
        }
    });
    
    return {
        elements,
        totalLines
    };
};