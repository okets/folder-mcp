import React from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

export const Header: React.FC = () => {
    const di = useDI();
    const themeService = di.resolve(ServiceTokens.ThemeService);
    const colors = themeService.getColors();
    const { columns, rows } = useTerminalSize();
    
    const resolution = `${columns}w${rows}h`;
    const appName = '📁 folder-mcp';
    
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
        const middlePadding = innerWidth - appContent.length;
        const middleBorder = `│${appContent}${' '.repeat(middlePadding)}│`;
        const bottomBorder = `╰${'─'.repeat(innerWidth)}╯`;
        
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={colors.accent}>{topBorder}</Text>
                <Text color={colors.accent}>{middleBorder}</Text>
                <Text color={colors.accent}>{bottomBorder}</Text>
            </Box>
        );
    } else if (columns >= minBorderedWidth) {
        // Bordered layout without resolution - expand to fill terminal width
        const innerWidth = columns - 2; // -2 for corner characters
        const appContent = ` ${appName} `;
        const middlePadding = innerWidth - appContent.length;
        
        const topBorder = `╭${'─'.repeat(innerWidth)}╮`;
        const middleBorder = `│${appContent}${' '.repeat(middlePadding)}│`;
        const bottomBorder = `╰${'─'.repeat(innerWidth)}╯`;
        
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={colors.accent}>{topBorder}</Text>
                <Text color={colors.accent}>{middleBorder}</Text>
                <Text color={colors.accent}>{bottomBorder}</Text>
            </Box>
        );
    } else {
        // No border, just truncated text
        const availableForText = columns - 1; // -1 for safety margin
        let displayText = appName;
        
        if (displayText.length > availableForText) {
            if (availableForText > 3) {
                displayText = displayText.substring(0, availableForText - 1) + '…';
            } else {
                displayText = '📁…';
            }
        }
        
        return (
            <Box marginTop={1}>
                <Text color={colors.accent}>{displayText}</Text>
            </Box>
        );
    }
};