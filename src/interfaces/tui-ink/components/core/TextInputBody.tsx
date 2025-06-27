import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../utils/theme.js';

export interface TextInputBodyProps {
    value: string;
    cursorPosition: number;
    cursorVisible: boolean;
    width: number;
    maxInputWidth?: number; // Maximum width for the input box (default: 40)
}

/**
 * Text input body component for expandable list items
 * Returns an array of elements for a bordered text input with cursor support
 */
export const TextInputBody = ({
    value,
    cursorPosition,
    cursorVisible,
    width
}: TextInputBodyProps): React.ReactElement[] => {
    // Calculate border width to fit within available space
    // The width parameter is the max width available for the entire item including indent
    // Account for: 2-char indent, 2 borders, 2 spaces inside borders
    const availableForBorder = Math.max(width - 6, 10);
    
    // Use a reasonable default width that expands with content but respects limits
    const desiredWidth = Math.max(value.length + 4, 20); // +4 for some padding
    const borderWidth = Math.min(desiredWidth, availableForBorder);
    
    // Render text with cursor - we'll handle the coloring differently
    let beforeCursor = value.slice(0, cursorPosition);
    let atCursor = value[cursorPosition] || ' ';
    let afterCursor = value.slice(cursorPosition + 1);
    
    // Build content with proper cursor handling
    let content;
    if (cursorVisible && cursorPosition < value.length) {
        // Cursor on existing character
        const before = value.slice(0, cursorPosition);
        const cursorChar = value[cursorPosition];
        const after = value.slice(cursorPosition + 1);
        content = before + '\x1b[47m\x1b[38;5;102m' + cursorChar + '\x1b[0m\x1b[38;5;102m' + after;
    } else if (cursorVisible && cursorPosition >= value.length) {
        // Cursor at end
        content = value + '\x1b[47m\x1b[38;5;102m \x1b[0m';
    } else {
        // No cursor
        content = value;
    }

    // Calculate padding to fill the border width
    const contentLength = cursorVisible && cursorPosition >= value.length 
        ? value.length + 1 // +1 for cursor space at end
        : value.length;
    const paddingNeeded = Math.max(0, borderWidth - contentLength - 1); // -1 for the space before content
    const padding = ' '.repeat(paddingNeeded);
    
    return [
        <Text key="top" color={theme.colors.textInputBorder}>
            {'  '}╭{'─'.repeat(borderWidth)}╮
        </Text>,
        <Box key="middle">
            <Text color={theme.colors.textInputBorder}>{'  '}│</Text>
            <Text color={theme.colors.textMuted}> {content}{padding}</Text>
            <Text color={theme.colors.textInputBorder}>│</Text>
        </Box>,
        <Text key="bottom" color={theme.colors.textInputBorder}>
            {'  '}╰{'─'.repeat(borderWidth)}╯
        </Text>
    ];
};