import React from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';

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
    const di = useDI();
    const themeService = di.resolve(ServiceTokens.ThemeService);
    const colors = themeService.getColors();
    
    const content = message || shortcuts.map(s => `[${s.key}] ${s.description}`).join(' • ');
    
    return (
        <Box 
            borderStyle="single" 
            borderColor={colors.border}
            paddingX={1}
            width="100%"
        >
            <Text color={colors.textSecondary}>{content}</Text>
        </Box>
    );
};