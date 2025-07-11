import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';
import type { IKeyBinding } from '../services/interfaces';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useTheme } from '../contexts/ThemeContext';
import { truncateButtons } from '../utils/buttonTruncation';

interface StatusBarContentProps {
    bindings: IKeyBinding[];
    availableWidth: number;
}

const StatusBarContent: React.FC<StatusBarContentProps> = ({ bindings, availableWidth }) => {
    const { theme } = useTheme();
    const colors = {
        textPrimary: theme.colors.text,
        textSecondary: theme.colors.textMuted,
        border: theme.colors.border
    };
    if (bindings.length === 0 || availableWidth < 10) {
        return (
            <>
                <Text color={colors.textPrimary} bold>q</Text>
                <Text color={colors.textSecondary}>:Exit</Text>
            </>
        );
    }

    // Prepare bindings with formatted keys - do this BEFORE any width calculations
    const formattedBindings = bindings.map(binding => {
        // Convert special keys first (case-insensitive)
        // Using '⏎' for enter key
        let key = binding.key.replace(/→\/enter/i, '⏎').replace(/enter/i, '⏎');
        
        // Keep single letters uppercase (like Q), lowercase multi-character keys
        if (key.length > 1 && !['↑↓', '←→', '⏎'].includes(key)) {
            key = key.toLowerCase();
        } else if (key.length === 1) {
            // Ensure single letters are uppercase
            key = key.toUpperCase();
        }
        
        return {
            key,
            description: binding.description
        };
    });

    // Step 1: Try full format with descriptions
    const fullFormatParts = formattedBindings.map(b => b.key + ':' + b.description);
    const fullFormatWidth = fullFormatParts.join(' ').length;
    
    if (fullFormatWidth <= availableWidth - 1) { // -1 for safety buffer
        // Everything fits - render as single Text with embedded styling
        const parts: Array<{ text: string; color?: string; bold?: boolean }> = [];
        
        formattedBindings.forEach((binding, index) => {
            if (index > 0) {
                parts.push({ text: ' ' });
            }
            parts.push({ text: binding.key, color: colors.textPrimary, bold: true });
            parts.push({ text: ':' + binding.description, color: colors.textSecondary });
        });
        
        return (
            <Text>
                {parts.map((part, i) => 
                    part.color ? (
                        <Text key={i} color={part.color} bold={part.bold || false}>
                            {part.text}
                        </Text>
                    ) : part.text
                )}
            </Text>
        );
    }
    
    // Step 2: Need to truncate descriptions
    // Calculate fixed width (keys + colons + spaces)
    const fixedWidth = formattedBindings.reduce((sum, b) => sum + b.key.length + 1, 0) + // keys + colons
                      (formattedBindings.length - 1); // spaces between
    const availableForDescriptions = availableWidth - fixedWidth - 1; // -1 for safety buffer
    
    if (availableForDescriptions > 0) {
        // Use smart truncation on descriptions
        const descriptions = formattedBindings.map(b => b.description);
        const truncatedDescriptions = truncateButtons({
            buttons: descriptions,
            availableWidth: availableForDescriptions,
            separator: ' '
        });
        
        // Check if all descriptions are empty or just ellipsis
        const allEmpty = truncatedDescriptions.every(d => d.label === '' || d.label === '…');
        
        if (allEmpty) {
            // Step 3: All descriptions are gone, show keys only (no colons)
            const keysOnly = formattedBindings.map(b => b.key).join(' ');
            if (keysOnly.length <= availableWidth - 1) { // -1 for safety buffer
                return (
                    <Text>
                        {formattedBindings.map((binding, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && ' '}
                                <Text color={colors.textPrimary} bold>{binding.key}</Text>
                            </React.Fragment>
                        ))}
                    </Text>
                );
            }
            
            // Step 4: Need to remove keys from right to left
            let keysToShow = [...formattedBindings];
            while (keysToShow.length > 1) {
                const currentKeys = keysToShow.map(b => b.key).join(' ');
                if (currentKeys.length <= availableWidth - 1) { // -1 for safety buffer
                    return (
                        <Text>
                            {keysToShow.map((binding, index) => (
                                <React.Fragment key={index}>
                                    {index > 0 && ' '}
                                    <Text color={colors.textPrimary} bold>{binding.key}</Text>
                                </React.Fragment>
                            ))}
                        </Text>
                    );
                }
                // Remove the rightmost key (Q goes first, then others)
                keysToShow.pop();
            }
            
            // Last resort: show what we can
            return (
                <Text>
                    {keysToShow.map((binding, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && ' '}
                            <Text color="#D1D5DB" bold>{binding.key}</Text>
                        </React.Fragment>
                    ))}
                </Text>
            );
        }
        
        // Build with truncated descriptions - render as single Text
        const parts: Array<{ text: string; color?: string; bold?: boolean }> = [];
        
        formattedBindings.forEach((binding, index) => {
            if (index > 0) {
                parts.push({ text: ' ' });
            }
            parts.push({ text: binding.key, color: colors.textPrimary, bold: true });
            parts.push({ text: ':' + (truncatedDescriptions[index]?.label || ''), color: colors.textSecondary });
        });
        
        return (
            <Text>
                {parts.map((part, i) => 
                    part.color ? (
                        <Text key={i} color={part.color} bold={part.bold || false}>
                            {part.text}
                        </Text>
                    ) : part.text
                )}
            </Text>
        );
    }
    
    // No room for any descriptions - go to keys only (no colons)
    const keysOnly = formattedBindings.map(b => b.key).join(' ');
    if (keysOnly.length <= availableWidth - 1) { // -1 for safety buffer
        return (
            <Text>
                {formattedBindings.map((binding, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && ' '}
                        <Text color="#D1D5DB" bold>{binding.key}</Text>
                    </React.Fragment>
                ))}
            </Text>
        );
    }
    
    // Need to remove keys from right to left
    let keysToShow = [...formattedBindings];
    while (keysToShow.length > 1) {
        const currentKeys = keysToShow.map(b => b.key).join(' ');
        if (currentKeys.length < availableWidth) { // < for safety buffer
            return (
                <Text>
                    {keysToShow.map((binding, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && ' '}
                            <Text color="#D1D5DB" bold>{binding.key}</Text>
                        </React.Fragment>
                    ))}
                </Text>
            );
        }
        // Remove the rightmost key
        keysToShow.pop();
    }
    
    // Show whatever fits
    return (
        <Text>
            {keysToShow.map((binding, index) => (
                <React.Fragment key={index}>
                    {index > 0 && ' '}
                    <Text color={colors.textPrimary} bold>{binding.key}</Text>
                </React.Fragment>
            ))}
        </Text>
    );
};

interface StatusBarProps {
    message?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
    const di = useDI();
    const { theme } = useTheme();
    const [keyBindings, setKeyBindings] = useState<IKeyBinding[]>([]);
    const { columns, rows } = useTerminalSize();
    
    // Check if we're in low resolution mode (save vertical space)
    const isLowResolution = rows < 25;
    
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
     // Calculate available space for text (accounting for borders and padding)
    const availableWidth = isLowResolution 
        ? Math.max(0, statusBarWidth - 2) // -2 for paddingX in borderless mode
        : Math.max(0, statusBarWidth - 4); // -2 for borders, -2 for paddingX in bordered mode
    
    // Low resolution mode: no border to save 2 lines
    if (isLowResolution) {
        return (
            <Box 
                paddingX={1}
                width={statusBarWidth}
                flexDirection="row"
                overflow="hidden"
            >
                {message ? (
                    <Text color={theme.colors.textMuted} wrap="truncate">{message}</Text>
                ) : (
                    <StatusBarContent bindings={keyBindings.length > 0 ? keyBindings : [
                        { key: '→/enter', description: 'Edit' },
                        { key: 'tab', description: 'Switch Panel' },
                        { key: '↑↓', description: 'Navigate' },
                        { key: 'q', description: 'Quit' }
                    ]} availableWidth={availableWidth} />
                )}
            </Box>
        );
    }
    
    // Normal resolution mode: with border using theme symbols
    const innerWidth = statusBarWidth - 2; // -2 for left/right borders
    const topBorder = `${theme.symbols.border.topLeft}${theme.symbols.border.horizontal.repeat(innerWidth)}${theme.symbols.border.topRight}`;
    const bottomBorder = `${theme.symbols.border.bottomLeft}${theme.symbols.border.horizontal.repeat(innerWidth)}${theme.symbols.border.bottomRight}`;
    
    return (
        <Box flexDirection="column" width={statusBarWidth}>
            <Text color={theme.colors.border}>{topBorder}</Text>
            <Box flexDirection="row" overflow="hidden">
                <Text color={theme.colors.border}>{theme.symbols.border.vertical} </Text>
                <Box flexGrow={1}>
                    {message ? (
                        <Text color={theme.colors.textMuted} wrap="truncate">{message}</Text>
                    ) : (
                        <StatusBarContent bindings={keyBindings.length > 0 ? keyBindings : [
                            { key: '→/enter', description: 'Edit' },
                            { key: 'tab', description: 'Switch Panel' },
                            { key: '↑↓', description: 'Navigate' },
                            { key: 'q', description: 'Quit' }
                        ]} availableWidth={availableWidth - 4} />
                    )}
                </Box>
                <Text color={theme.colors.border}> {theme.symbols.border.vertical}</Text>
            </Box>
            <Text color={theme.colors.border}>{bottomBorder}</Text>
        </Box>
    );
};