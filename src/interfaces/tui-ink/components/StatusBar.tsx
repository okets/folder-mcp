import React from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';

interface StatusBarProps {
    message?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
    const di = useDI();
    const themeService = di.resolve(ServiceTokens.ThemeService);
    const colors = themeService.getColors();
    
    // Try to get StatusBarService if it exists
    let content = message;
    try {
        if (di.has(ServiceTokens.StatusBarService)) {
            const statusBarService = di.resolve(ServiceTokens.StatusBarService);
            const bindings = statusBarService.getKeyBindings();
            if (!message && bindings.length > 0) {
                content = bindings.map(b => `[${b.key}] ${b.description}`).join(' • ');
            }
        }
    } catch {
        // Fallback if StatusBarService not registered
        const defaultBindings = [
            { key: '↑↓', description: 'Navigate' },
            { key: '→/Enter', description: 'Expand' },
            { key: 'Tab', description: 'Switch Focus' },
            { key: '←/Esc', description: 'Back' },
            { key: 'q', description: 'Quit' }
        ];
        if (!content) {
            content = defaultBindings.map(b => `[${b.key}] ${b.description}`).join(' • ');
        }
    }
    
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