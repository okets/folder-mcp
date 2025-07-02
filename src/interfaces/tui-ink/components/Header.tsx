import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

export const Header: React.FC = () => {
    const di = useDI();
    const themeService = di.resolve(ServiceTokens.ThemeService);
    const colors = themeService.getColors();
    const { columns, rows } = useTerminalSize();
    
    // Braille spinner animation frames
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const [spinnerIndex, setSpinnerIndex] = useState(0);
    
    // Animation effect
    useEffect(() => {
        const interval = setInterval(() => {
            setSpinnerIndex((prev) => (prev + 1) % spinnerFrames.length);
        }, 80);
        
        return () => clearInterval(interval);
    }, [spinnerFrames.length]);
    
    const resolution = `${columns}w${rows}h`;
    const appName = '📁 folder-mcp';
    const spinner = spinnerFrames[spinnerIndex];
    
    // Custom logo colors
    const frameColor = '#4c1589'; // rgb(76, 21, 137) - dark purple for frame and resolution
    const logoTextColor = '#a65ff6'; // rgb(166, 95, 246) - light purple for "folder-mcp"
    
    // Check for low vertical resolution
    const isLowResolution = rows < 25;
    
    // Low resolution mode: single line with separator
    if (isLowResolution) {
        const separator = ' ○ ';
        
        // Handle narrow terminals in low resolution mode
        const availableWidth = columns - 1; // -1 for safety margin
        
        // Build display text based on available width
        if (availableWidth >= (appName.length + separator.length + resolution.length + 2)) {
            // Full display with resolution and spinner
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>
                        📁 <Text color={logoTextColor} bold>folder-mcp</Text>
                        <Text color={colors.accent}> {spinner}</Text>
                        <Text color={frameColor}>{separator}</Text>
                        <Text color={frameColor}>{resolution}</Text>
                    </Text>
                </Box>
            );
        } else if (availableWidth >= (appName.length + 2)) {
            // Just app name with spinner, no resolution
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>
                        📁 <Text color={logoTextColor} bold>folder-mcp</Text>
                        <Text color={colors.accent}> {spinner}</Text>
                    </Text>
                </Box>
            );
        } else if (availableWidth >= appName.length) {
            // Just app name, no spinner or resolution
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>
                        📁 <Text color={logoTextColor} bold>folder-mcp</Text>
                    </Text>
                </Box>
            );
        } else {
            // Very narrow - truncate app name
            const truncatedName = appName.substring(0, availableWidth - 1) + '…';
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>{truncatedName}</Text>
                </Box>
            );
        }
    }
    
    // Calculate what layout to use based on available width
    const minBorderedWidth = 18; // "╭────────────────╮" length
    
    // Calculate minimum width needed for different layouts
    const minResolutionWidth = Math.max(
        18, // Minimum to fit "│ 📁 folder-mcp  │" 
        2 + 1 + resolution.length + 1 + 2 // Minimum for "╭─ 24w24h ╮" 
    );
    
    if (columns >= minResolutionWidth) {
        // Full bordered layout with resolution in border - maximize dash area
        const innerWidth = columns - 2; // -2 for corner characters
        const resolutionSpace = ` ${resolution} `;
        const appContent = ` ${appName} `;
        
        // Calculate how much space we can fill with dashes
        // Total: ╭ + dashes + space + resolution + space + ╮
        const maxDashArea = innerWidth - resolutionSpace.length;
        
        const topBorder = `╭${'─'.repeat(maxDashArea)}${resolutionSpace}╮`;
        const bottomBorder = `╰${'─'.repeat(innerWidth)}╯`;
        
        // Calculate padding for the split text format
        // "│ 📁 " = 5 chars, "folder-mcp" = 10 chars, " " + spinner = 2 chars, "│" = 1 char
        const textLength = 5 + 10 + 2; // Don't count the closing │
        const remainingSpace = Math.max(0, innerWidth - textLength);
        
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={frameColor}>{topBorder}</Text>
                <Box>
                    <Text color={frameColor}>│ 📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    <Text color={colors.accent}> {spinner}</Text>
                    <Text color={frameColor}>{' '.repeat(remainingSpace + 1)}│</Text>
                </Box>
                <Text color={frameColor}>{bottomBorder}</Text>
            </Box>
        );
    } else if (columns >= minBorderedWidth) {
        // Bordered layout without resolution - expand to fill terminal width
        const innerWidth = columns - 2; // -2 for corner characters
        const appContent = ` ${appName} `;
        const middlePadding = innerWidth - appContent.length;
        
        const topBorder = `╭${'─'.repeat(innerWidth)}╮`;
        const bottomBorder = `╰${'─'.repeat(innerWidth)}╯`;
        
        // Calculate padding for the split text format
        // "│ 📁 " = 5 chars, "folder-mcp" = 10 chars, " " + spinner = 2 chars, "│" = 1 char
        const textLength = 5 + 10 + 2; // Don't count the closing │
        const remainingSpace = Math.max(0, innerWidth - textLength);
        
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={frameColor}>{topBorder}</Text>
                <Box>
                    <Text color={frameColor}>│ 📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    <Text color={colors.accent}> {spinner}</Text>
                    <Text color={frameColor}>{' '.repeat(remainingSpace + 1)}│</Text>
                </Box>
                <Text color={frameColor}>{bottomBorder}</Text>
            </Box>
        );
    } else {
        // No border, just truncated text
        const availableForText = columns - 1; // -1 for safety margin
        
        if (appName.length + 2 <= availableForText) {
            // Can fit full app name with spinner
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>
                        📁 <Text color={logoTextColor} bold>folder-mcp</Text>
                        <Text color={colors.accent}> {spinner}</Text>
                    </Text>
                </Box>
            );
        } else if (appName.length <= availableForText) {
            // Can fit full app name without spinner
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>
                        📁 <Text color={logoTextColor} bold>folder-mcp</Text>
                    </Text>
                </Box>
            );
        } else {
            // Need to truncate
            let displayText = appName;
            if (availableForText > 3) {
                displayText = displayText.substring(0, availableForText - 1) + '…';
            } else {
                displayText = '📁…';
            }
            
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>{displayText}</Text>
                </Box>
            );
        }
    }
};