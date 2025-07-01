import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import type { IKeyBinding } from '../services/interfaces.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import type { ThemeColors } from '../models/types.js';

interface StatusBarContentProps {
    bindings: IKeyBinding[];
    availableWidth: number;
    colors: ThemeColors;
}

const StatusBarContent: React.FC<StatusBarContentProps> = ({ bindings, availableWidth, colors }) => {
    if (bindings.length === 0 || availableWidth < 10) {
        return (
            <>
                <Text color={colors.textPrimary} bold>q</Text>
                <Text color={colors.textSecondary}>:Exit</Text>
            </>
        );
    }

    // Prepare bindings with different formats
    const formats = bindings.map(binding => {
        // Convert special keys to lowercase, keep single letters uppercase
        let key = binding.key.replace('→/enter', '↵');
        
        // Lowercase multi-character keys but keep single letters uppercase
        if (key.length > 1 && !['↑↓', '←→', '↵'].includes(key)) {
            key = key.toLowerCase();
        }
        
        const desc = binding.description;
        
        return {
            key: key,
            fullDesc: desc,
            shortDesc: desc.replace('Switch Panel', 'Switch').replace('Navigate', 'Nav').replace('Quit', 'Exit'),
            minDesc: desc.substring(0, 3)
        };
    });

    // Calculate required widths for different formats
    const fullFormat = formats.map(f => f.key + ' ' + f.fullDesc).join(' ');
    const shortFormat = formats.map(f => f.key + ' ' + f.shortDesc).join(' ');
    const colonFormat = formats.map(f => f.key + ':' + f.shortDesc).join(' ');
    
    // Progressive display based on available width
    if (fullFormat.length <= availableWidth) {
        // Full format with spaces
        return (
            <>
                {formats.map((format, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <Text color={colors.textSecondary}> </Text>}
                        <Text color={colors.textPrimary} bold>{format.key}</Text>
                        <Text color={colors.textSecondary}> {format.fullDesc}</Text>
                    </React.Fragment>
                ))}
            </>
        );
    } else if (shortFormat.length <= availableWidth) {
        // Short descriptions with spaces
        return (
            <>
                {formats.map((format, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <Text color={colors.textSecondary}> </Text>}
                        <Text color={colors.textPrimary} bold>{format.key}</Text>
                        <Text color={colors.textSecondary}> {format.shortDesc}</Text>
                    </React.Fragment>
                ))}
            </>
        );
    } else if (colonFormat.length <= availableWidth) {
        // Colon format
        return (
            <>
                {formats.map((format, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <Text color={colors.textSecondary}> </Text>}
                        <Text color={colors.textPrimary} bold>{format.key}</Text>
                        <Text color={colors.textSecondary}>:{format.shortDesc}</Text>
                    </React.Fragment>
                ))}
            </>
        );
    } else {
        // Last resort: just keys with minimal descriptions
        const essential = formats.slice(0, Math.min(3, formats.length));
        return (
            <>
                {essential.map((format, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <Text color={colors.textSecondary}> </Text>}
                        <Text color={colors.textPrimary} bold>{format.key}</Text>
                        <Text color={colors.textSecondary}>:{format.minDesc}</Text>
                    </React.Fragment>
                ))}
                <Text color={colors.textSecondary}> </Text>
                <Text color={colors.textPrimary} bold>q</Text>
            </>
        );
    }
};

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
     // Calculate available space for text (accounting for padding)
    const availableWidth = Math.max(0, statusBarWidth - 2); // -2 for paddingX

    return (
        <Box 
            borderStyle="single" 
            borderColor={colors.border}
            paddingX={1}
            width={statusBarWidth}
            flexDirection="row"
            overflow="hidden"
        >
            {message ? (
                <Text color={colors.textSecondary} wrap="truncate">{message}</Text>
            ) : (
                <StatusBarContent bindings={keyBindings.length > 0 ? keyBindings : [
                    { key: '→/enter', description: 'Edit' },
                    { key: 'tab', description: 'Switch Panel' },
                    { key: '↑↓', description: 'Navigate' },
                    { key: 'q', description: 'Quit' }
                ]} availableWidth={availableWidth} colors={colors} />
            )}
        </Box>
    );
};