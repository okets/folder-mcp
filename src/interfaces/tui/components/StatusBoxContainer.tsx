import React from 'react';
import { Box, Text } from 'ink';
import { useColors } from '../hooks/useColors.js';

interface StatusBoxContainerProps {
  title?: string;
  borderColor?: string;
  width?: number;
  height?: number;
  flexGrow?: number;
}

export const StatusBoxContainer: React.FC<StatusBoxContainerProps> = ({ 
  title, 
  borderColor = '#F59E0B',
  width = 40,
  height,
  flexGrow
}) => {
  const { colorize } = useColors();
  
  // Calculate proper dimensions
  const titleText = title ? ` ${title} ` : '';
  const innerWidth = width - 2; // Space for content (excluding left and right │)
  const titlePadding = '─'.repeat(Math.max(0, innerWidth - titleText.length));
  
  // Support hex colors through colorize
  const renderBorder = (text: string) => {
    if (borderColor.startsWith('#')) {
      return <Text>{colorize(text, borderColor)}</Text>;
    }
    return <Text color={borderColor}>{text}</Text>;
  };
  
  return (
    <Box flexDirection="column" width={width} height={height} flexGrow={flexGrow}>
      {/* Top border */}
      <Box>
        {renderBorder(`╭${titleText}${titlePadding}╮`)}
      </Box>
      
      {/* Empty bordered line */}
      <Box>
        {renderBorder(`│${' '.repeat(innerWidth)}│`)}
      </Box>
      
      {/* Status content lines */}
      <Box>
        <Text>
          {renderBorder('│').props.children}
          {' • System initialized...' + ' '.repeat(Math.max(0, innerWidth - ' • System initialized...'.length))}
          {renderBorder('│').props.children}
        </Text>
      </Box>
      
      <Box>
        <Text>
          {renderBorder('│').props.children}
          {' • Checking cached configuration...' + ' '.repeat(Math.max(0, innerWidth - ' • Checking cached configuration...'.length))}
          {renderBorder('│').props.children}
        </Text>
      </Box>
      
      <Box>
        <Text>
          {renderBorder('│').props.children}
          {' • Loading default settings...' + ' '.repeat(Math.max(0, innerWidth - ' • Loading default settings...'.length))}
          {renderBorder('│').props.children}
        </Text>
      </Box>
      
      <Box>
        {renderBorder(`│${' '.repeat(innerWidth)}│`)}
      </Box>
      
      <Box>
        <Text>
          {renderBorder('│').props.children}
          {' Terminal: 180×29' + ' '.repeat(Math.max(0, innerWidth - ' Terminal: 180×29'.length))}
          {renderBorder('│').props.children}
        </Text>
      </Box>
      
      {/* Fill remaining space with empty lines */}
      <Box>
        {renderBorder(`│${' '.repeat(innerWidth)}│`)}
      </Box>
      
      <Box>
        {renderBorder(`│${' '.repeat(innerWidth)}│`)}
      </Box>
      
      <Box>
        {renderBorder(`│${' '.repeat(innerWidth)}│`)}
      </Box>
      
      {/* Bottom border */}
      <Box>
        {renderBorder(`╰${'─'.repeat(innerWidth)}╯`)}
      </Box>
    </Box>
  );
};