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
    
    return (
        <Box flexDirection="row" marginTop={1} gap={1}>
            <Box flexDirection="column">
                <Text color={colors.accent}>╭────────────────╮</Text>
                <Text color={colors.accent}>│ 📁 folder-mcp  │</Text>
                <Text color={colors.accent}>╰────────────────╯</Text>
            </Box>
            <Box flexDirection="column" paddingTop={1}>
                <Text color={colors.textSecondary}>{columns}w{rows}h</Text>
            </Box>
        </Box>
    );
};