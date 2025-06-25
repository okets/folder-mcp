import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import type { IKeyBinding } from '../services/interfaces.js';

interface StatusBarProps {
    message?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
    const di = useDI();
    const themeService = di.resolve(ServiceTokens.ThemeService);
    const colors = themeService.getColors();
    const [keyBindings, setKeyBindings] = useState<IKeyBinding[]>([]);
    
    // Update key bindings whenever they change
    useEffect(() => {
        const updateBindings = () => {
            try {
                const inputContextService = di.resolve(ServiceTokens.InputContextService);
                const bindings = inputContextService.getActiveKeyBindings();
                setKeyBindings(bindings);
            } catch {
                // Service not available
            }
        };
        
        // Initial update
        updateBindings();
        
        // Listen for key binding changes
        try {
            const inputContextService = di.resolve(ServiceTokens.InputContextService);
            const cleanup = inputContextService.addChangeListener(updateBindings);
            return cleanup;
        } catch {
            // Service not available
        }
    }, [di]);
    
    // Use message if provided, otherwise show key bindings
    let content = message;
    if (!message) {
        if (keyBindings.length > 0) {
            content = keyBindings.map(b => `[${b.key}] ${b.description}`).join(' • ');
        } else {
            // Fallback to default bindings if no active bindings
            const defaultBindings = [
                { key: '↑↓', description: 'Navigate' },
                { key: '→/Enter', description: 'Edit' },
                { key: 'Tab', description: 'Switch Panel' },
                { key: 'q', description: 'Quit' }
            ];
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