import React from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';

export const Header: React.FC = () => {
    const di = useDI();
    const themeService = di.resolve(ServiceTokens.ThemeService);
    const colors = themeService.getColors();
    
    return (
        <Box flexDirection="column" marginTop={1}>
            <Text color={colors.accent}>╭────────────────╮</Text>
            <Text color={colors.accent}>│ 📁 folder-mcp  │</Text>
            <Text color={colors.accent}>╰────────────────╯</Text>
        </Box>
    );
};