import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';

interface Shortcut {
    key: string;
    description: string;
}

interface StatusBarProps {
    shortcuts?: Shortcut[];
    message?: string;
}

const defaultShortcuts: Shortcut[] = [
    { key: '↑↓', description: 'Navigate' },
    { key: '→/Enter', description: 'Expand' },
    { key: 'Tab', description: 'Switch Focus' },
    { key: '←/Esc', description: 'Back' },
    { key: 'q', description: 'Quit' },
    { key: 'h/?', description: 'Help' }
];

export const StatusBar: React.FC<StatusBarProps> = ({ shortcuts = defaultShortcuts, message }) => {
    const content = message || shortcuts.map(s => `[${s.key}] ${s.description}`).join(' • ');
    
    return (
        <Box 
            borderStyle="single" 
            borderColor={theme.colors.border}
            paddingX={1}
            width="100%"
        >
            <Text color={theme.colors.textPrimary}>{content}</Text>
        </Box>
    );
};