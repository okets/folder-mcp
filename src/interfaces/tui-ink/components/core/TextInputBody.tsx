import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../utils/theme.js';

export interface TextInputBodyProps {
    value: string;
    cursorPosition: number;
    cursorVisible: boolean;
    width: number;
    maxInputWidth?: number; // Maximum width for the input box (default: 40)
    headerColor?: string; // Color for the vertical line (matches header)
}

/**
 * Text input body component for expandable list items
 * Returns an array of elements for a bordered text input with cursor support
 */
export const TextInputBody = ({
    value,
    cursorPosition,
    cursorVisible,
    width,
    maxInputWidth = 40,
    headerColor
}: TextInputBodyProps): React.ReactElement[] => {
    // Calculate border width to fit within available space
    // The width parameter is the max width available for the entire item including indent
    // Account for: 3-char indent (│ + 2 spaces), 2 borders, 2 spaces inside borders
    const availableForBorder = Math.max(width - 7, 10);
    
    // Use a reasonable default width that expands with content but respects limits
    const desiredWidth = Math.max(value.length + 4, 20); // +4 for some padding
    const maxAllowedWidth = Math.min(maxInputWidth, availableForBorder);
    const borderWidth = Math.min(desiredWidth, maxAllowedWidth);
    
    // Calculate visible window for text overflow
    const contentAreaWidth = borderWidth - 2; // -2 for space padding on each side
    let visibleValue = value;
    let visibleCursorPos = cursorPosition;
    let windowStart = 0;
    
    // If content exceeds available width, implement horizontal scrolling
    if (value.length > contentAreaWidth) {
        // Keep cursor visible with some context
        const contextChars = Math.floor(contentAreaWidth / 3);
        
        if (cursorPosition < contextChars) {
            // Cursor near start
            windowStart = 0;
        } else if (cursorPosition > value.length - contextChars) {
            // Cursor near end
            windowStart = Math.max(0, value.length - contentAreaWidth + 1); // +1 for cursor space
        } else {
            // Cursor in middle, center it
            windowStart = cursorPosition - Math.floor(contentAreaWidth / 2);
        }
        
        // Ensure window start is valid
        windowStart = Math.max(0, Math.min(windowStart, value.length - contentAreaWidth + 1));
        
        // Extract visible portion
        visibleValue = value.slice(windowStart, windowStart + contentAreaWidth);
        visibleCursorPos = cursorPosition - windowStart;
    }
    
    // Build content with proper cursor handling
    let content;
    let displayLength;
    
    if (cursorVisible && visibleCursorPos >= 0 && visibleCursorPos < visibleValue.length) {
        // Cursor on existing character
        const before = visibleValue.slice(0, visibleCursorPos);
        const cursorChar = visibleValue[visibleCursorPos];
        const after = visibleValue.slice(visibleCursorPos + 1);
        content = before + '\x1b[47m\x1b[30m' + cursorChar + '\x1b[0m\x1b[38;5;107m' + after;
        displayLength = visibleValue.length;
    } else if (cursorVisible && cursorPosition >= value.length && visibleCursorPos >= 0) {
        // Cursor at end
        content = visibleValue + '\x1b[47m\x1b[30m \x1b[0m';
        displayLength = visibleValue.length + 1;
    } else {
        // No cursor or cursor not visible in window
        content = visibleValue;
        displayLength = visibleValue.length;
    }
    
    // No overflow indicators - pure sliding window behavior
    // The text will scroll horizontally within the bounded box

    // Calculate padding to fill the border width
    // borderWidth is the width of the top/bottom borders (─ characters)
    // The content area needs to match this width exactly
    const paddingNeeded = Math.max(0, borderWidth - displayLength - 1); // -1 for the space before content
    const padding = ' '.repeat(paddingNeeded);
    
    return [
        <Text key="top">
            <Text color={headerColor}>│  </Text>
            <Text color={theme.colors.textInputBorder}>╭{'─'.repeat(borderWidth)}╮</Text>
        </Text>,
        <Text key="middle">
            <Text color={headerColor}>└──</Text>
            <Text color={theme.colors.textInputBorder}>┤</Text>
            <Text color={theme.colors.configValuesColor}> {content}{padding}</Text>
            <Text color={theme.colors.textInputBorder}>│</Text>
        </Text>,
        <Text key="bottom">
            <Text>   </Text>
            <Text color={theme.colors.textInputBorder}>╰{'─'.repeat(borderWidth)}╯</Text>
        </Text>
    ];
};