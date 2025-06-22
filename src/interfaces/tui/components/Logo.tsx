import React from 'react';
import { Box, Text } from 'ink';
import { symbols } from '../design/symbols.js';
import { useColors } from '../hooks/useColors.js';

interface LogoProps {
  variant?: 'simple' | 'detailed';
}

export const Logo: React.FC<LogoProps> = ({ variant = 'simple' }) => {
  const { colorize } = useColors();
  
  return (
    <Box flexDirection="column">
      <Box>
        <Text>{colorize('╭────────────────╮', '#A65EF6')}</Text>
      </Box>
      <Box>
        <Text>{colorize('│ ', '#A65EF6')}</Text>
        <Text>{colorize(symbols.folder, '#A65EF6')}</Text>
        <Text>{colorize(' folder-mcp ', '#A65EF6')}</Text>
        <Text>{colorize(' │', '#A65EF6')}</Text>
      </Box>
      <Box>
        <Text>{colorize('╰────────────────╯', '#A65EF6')}</Text>
      </Box>
    </Box>
  );
};