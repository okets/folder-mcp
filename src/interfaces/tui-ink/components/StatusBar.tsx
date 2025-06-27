import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import type { IKeyBinding } from '../services/interfaces.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface StatusBarProps {
    message?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
    const di = useDI();
    const themeService = di.resolve(ServiceTokens.ThemeService);
    const colors = themeService.getColors();
    const [keyBindings, setKeyBindings] = useState<IKeyBinding[]>([]);
    const { columns } = useTerminalSize();
    
    // Update key bindings whenever they change
    useEffect(() => {
        const updateBindings = () => {
            try {
                const inputContextService = di.resolve(ServiceTokens.InputContextService);
                // Use the new focus-aware method
                const bindings = inputContextService.getFocusAwareKeyBindings();
                setKeyBindings(bindings);
            } catch {
                // Service not available
            }
        };
        
        // Delay initial update to let components register
        const timer = setTimeout(updateBindings, 100);
        
        // Listen for key binding changes
        try {
            const inputContextService = di.resolve(ServiceTokens.InputContextService);
            const cleanup = inputContextService.addChangeListener(updateBindings);
            return () => {
                clearTimeout(timer);
                cleanup?.();
            };
        } catch {
            // Service not available
            return () => clearTimeout(timer);
        }
    }, [di]);
    
    // Format key bindings based on terminal width
    const formatKeyBindings = (bindings: IKeyBinding[], width: number): string => {
        if (width >= 80) {
            // Full text for wide terminals
            return bindings.map(b => `[${b.key}] ${b.description}`).join(' • ');
        } else if (width >= 66) {
            // Abbreviated for medium terminals
            return bindings.map(b => {
                // Shorten common descriptions
                const shortDesc = b.description
                    .replace('Switch Panel', 'Switch')
                    .replace('Navigate', 'Nav')
                    .replace('→/Enter', 'Enter');
                return `[${b.key}] ${shortDesc}`;
            }).join(' • ');
        } else {
            // Minimal for narrow terminals
            return bindings.map(b => {
                // Ultra-short format
                const key = b.key.replace('→/Enter', '↵');
                const desc = b.description
                    .replace('Switch Panel', 'Switch')
                    .replace('Navigate', 'Nav')
                    .replace('Edit', 'Edit')
                    .replace('Quit', 'Exit');
                return `${key}:${desc}`;
            }).join(' ');
        }
    };
    
    // Get default content based on width
    const getDefaultContent = (width: number): string => {
        if (width >= 80) {
            return '[→/Enter] Edit • [Tab] Switch Panel • [↑↓] Navigate • [q] Quit';
        } else if (width >= 66) {
            return '[Enter] Edit • [Tab] Switch • [↑↓] Nav • [q] Quit';
        } else {
            return '↵:Edit Tab:Switch ↑↓:Nav q:Exit';
        }
    };
    
    // Use message if provided, otherwise show key bindings
    let content = message;
    if (!message) {
        // Show the focus-aware key bindings
        if (keyBindings.length > 0) {
            content = formatKeyBindings(keyBindings, columns);
        } else {
            // Default bindings as fallback during initial render
            content = getDefaultContent(columns);
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