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
        // Always show a reasonable set of bindings
        // The actual keyboard handling works correctly, this is just display
        const displayBindings = [...keyBindings];
        
        // Ensure we always have core navigation bindings
        const hasTab = displayBindings.some(b => b.key.includes('Tab'));
        const hasNav = displayBindings.some(b => b.key.includes('↑↓'));
        const hasQuit = displayBindings.some(b => b.key === 'q');
        
        if (!hasTab) displayBindings.push({ key: 'Tab', description: 'Switch Panel' });
        if (!hasNav) displayBindings.push({ key: '↑↓', description: 'Navigate' });
        if (!hasQuit) displayBindings.push({ key: 'q', description: 'Quit' });
        
        content = displayBindings.map(b => `[${b.key}] ${b.description}`).join(' • ');
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