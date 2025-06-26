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
 * Renders a bordered text input with cursor support
 */
export const TextInputBody: React.FC<TextInputBodyProps> = ({
    value,
    cursorPosition,
    cursorVisible,
    width
}) => {
    // Calculate border width to match content exactly
    const borderWidth = Math.max(value.length + 2, 18); // Content will be: text + cursor/padding + space
    
    // Render text with cursor using ANSI escape codes
    let content;
    
    if (cursorVisible && cursorPosition < value.length) {
        // Cursor is on existing character - highlight it
        const before = value.slice(0, cursorPosition);
        const cursorChar = value[cursorPosition];
        const after = value.slice(cursorPosition + 1);
        content = before + '\x1b[47m\x1b[38;5;102m' + cursorChar + '\x1b[0m\x1b[38;5;102m' + after + ' ';
    } else if (cursorVisible && cursorPosition >= value.length) {
        // Cursor is at end - highlight the padding space
        content = value + '\x1b[47m\x1b[38;5;102m \x1b[0m';
    } else {
        // No cursor visible - just text with padding
        content = value + ' ';
    }
    
    return (
        <>
            <Text color={theme.colors.textInputBorder}>
                {'  '}╭{'─'.repeat(borderWidth)}╮
            </Text>
            <Box>
                <Text color={theme.colors.textInputBorder}>{'  '}│</Text>
                <Text color={theme.colors.textMuted}> {content}</Text>
                <Text color={theme.colors.textInputBorder}>│</Text>
            </Box>
            <Text color={theme.colors.textInputBorder}>
                {'  '}╰{'─'.repeat(borderWidth)}╯
            </Text>
        </>
    );
};