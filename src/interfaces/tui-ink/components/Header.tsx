import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';

export const Header: React.FC = () => {
    return (
        <Box flexDirection="column" marginTop={1}>
            <Text color={theme.colors.accent}>╭────────────────╮</Text>
            <Text color={theme.colors.accent}>│ 📁 folder-mcp  │</Text>
            <Text color={theme.colors.accent}>╰────────────────╯</Text>
        </Box>
    );
};