import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../utils/theme.js';

export interface TextInputBodyProps {
    value: string;
    cursorPosition: number;
    cursorVisible: boolean;
    width: number;
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
    // Calculate border width to match content exactly
    const borderWidth = Math.max(value.length + 2, 18); // Content will be: text + cursor/padding + space
    
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
        content = before + '\x1b[47m\x1b[38;5;102m' + cursorChar + '\x1b[0m\x1b[38;5;102m' + after + ' ';
    } else if (cursorVisible && cursorPosition >= value.length) {
        // Cursor at end
        content = value + '\x1b[47m\x1b[38;5;102m \x1b[0m';
    } else {
        // No cursor
        content = value + ' ';
    }

    return [
        <Text key="top" color={theme.colors.textInputBorder}>
            {'  '}╭{'─'.repeat(borderWidth)}╮
        </Text>,
        <Box key="middle">
            <Text color={theme.colors.textInputBorder}>{'  '}│</Text>
            <Text color={theme.colors.textMuted}> {content}</Text>
            <Text color={theme.colors.textInputBorder}>│</Text>
        </Box>,
        <Text key="bottom" color={theme.colors.textInputBorder}>
            {'  '}╰{'─'.repeat(borderWidth)}╯
        </Text>
    ];
};