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
    
    // Try to get key bindings from InputContextService (preferred) or StatusBarService
    let content = message;
    try {
        // First try InputContextService which gets bindings from focus chain
        if (di.has(ServiceTokens.InputContextService)) {
            const inputContextService = di.resolve(ServiceTokens.InputContextService);
            const bindings = inputContextService.getActiveKeyBindings();
            if (!message && bindings.length > 0) {
                content = bindings.map(b => `[${b.key}] ${b.description}`).join(' • ');
            }
        } else if (di.has(ServiceTokens.StatusBarService)) {
            // Fallback to StatusBarService
            const statusBarService = di.resolve(ServiceTokens.StatusBarService);
            const bindings = statusBarService.getKeyBindings();
            if (!message && bindings.length > 0) {
                content = bindings.map(b => `[${b.key}] ${b.description}`).join(' • ');
            }
        }
    } catch {
        // Fallback if services not registered
        const defaultBindings = [
            { key: '↑↓', description: 'Navigate' },
            { key: '→/Enter', description: 'Edit' },
            { key: 'Tab', description: 'Switch Panel' },
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