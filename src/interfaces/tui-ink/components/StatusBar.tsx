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
    
    // Use full terminal width
    // The Box component's width prop sets the total width including borders
    const statusBarWidth = columns;
    
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
    
    // Smart truncation for key bindings
    const smartTruncateKeyBindings = (bindings: IKeyBinding[], availableWidth: number): string => {
        if (bindings.length === 0 || availableWidth < 10) {
            return 'q:Exit';
        }
        
        // Prepare bindings with different formats
        const formats = bindings.map(binding => {
            const key = binding.key.replace('→/Enter', '↵');
            const desc = binding.description;
            
            return {
                full: `[${binding.key}] ${desc}`,
                medium: `[${key}] ${desc.replace('Switch Panel', 'Switch').replace('Navigate', 'Nav')}`,
                short: `${key}:${desc.replace('Switch Panel', 'Switch').replace('Navigate', 'Nav').replace('Quit', 'Exit')}`,
                minimal: `${key}:${desc.substring(0, 3)}`,
                key: key
            };
        });
        
        // Try different separator styles based on width
        const separators = availableWidth > 60 ? ' • ' : ' ';
        
        // First try: Full format
        let result = formats.map(f => f.full).join(separators);
        if (result.length <= availableWidth) return result;
        
        // Second try: Medium format with brackets
        result = formats.map(f => f.medium).join(separators);
        if (result.length <= availableWidth) return result;
        
        // Third try: Short format without brackets
        result = formats.map(f => f.short).join(' ');
        if (result.length <= availableWidth) return result;
        
        // Fourth try: Progressively truncate descriptions
        for (let maxDescLen = 10; maxDescLen >= 1; maxDescLen--) {
            result = formats.map(f => {
                const desc = f.short.split(':')[1];
                const truncatedDesc = desc.length > maxDescLen ? desc.substring(0, maxDescLen) + '…' : desc;
                return `${f.key}:${truncatedDesc}`;
            }).join(' ');
            if (result.length <= availableWidth) return result;
        }
        
        // Fifth try: Only show keys with single letter descriptions
        result = formats.map(f => `${f.key}:${f.minimal.split(':')[1]}`).join(' ');
        if (result.length <= availableWidth) return result;
        
        // Last resort: Show only essential shortcuts
        const essential = formats.slice(0, Math.min(3, formats.length));
        return essential.map(f => f.key).join(' ') + ' q';
    };
    
    // Calculate available space for text (accounting for padding)
    const availableWidth = Math.max(0, statusBarWidth - 2); // -2 for paddingX
    
    // Use message if provided, otherwise show key bindings
    let content = message;
    if (!message) {
        // Show the focus-aware key bindings with smart truncation
        if (keyBindings.length > 0) {
            content = smartTruncateKeyBindings(keyBindings, availableWidth);
        } else {
            // Default bindings as fallback during initial render
            const defaultBindings: IKeyBinding[] = [
                { key: '→/Enter', description: 'Edit' },
                { key: 'Tab', description: 'Switch Panel' },
                { key: '↑↓', description: 'Navigate' },
                { key: 'q', description: 'Quit' }
            ];
            content = smartTruncateKeyBindings(defaultBindings, availableWidth);
        }
    } else {
        // For custom messages, simple truncation
        if (content && content.length > availableWidth) {
            content = availableWidth > 3 ? content.substring(0, availableWidth - 3) + '…' : content.substring(0, availableWidth);
        }
    }
    
    return (
        <Box 
            borderStyle="single" 
            borderColor={colors.border}
            paddingX={1}
            width={statusBarWidth}
            flexDirection="row"
            overflow="hidden"
        >
            <Text color={colors.textSecondary} wrap="truncate">{content}</Text>
        </Box>
    );
};