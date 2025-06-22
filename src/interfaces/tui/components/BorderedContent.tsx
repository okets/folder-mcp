import React, { ReactElement } from 'react';
import { Box, Text } from 'ink';
import { useColors } from '../hooks/useColors.js';

interface BorderedContentProps {
  children: React.ReactNode;
  borderColor: string;
  width: number;
}

// Helper to get display length (ANSI-aware)
const getDisplayLength = (text: string): number => {
  return text.replace(/\x1b\[[0-9;]*m/g, '').length;
};

export const BorderedContent: React.FC<BorderedContentProps> = ({ 
  children, 
  borderColor, 
  width 
}) => {
  const { colorize } = useColors();
  
  const renderBorder = (text: string) => {
    if (borderColor.startsWith('#')) {
      return <Text>{colorize(text, borderColor)}</Text>;
    }
    return <Text color={borderColor}>{text}</Text>;
  };

  // Convert children to lines
  const renderContentLines = () => {
    const lines: ReactElement[] = [];
    const innerWidth = width - 2; // Account for left and right borders
    
    // Process each child
    React.Children.forEach(children, (child, index) => {
      if (React.isValidElement(child) && child.type === Box) {
        // For Box elements, render them as lines with borders
        lines.push(
          <Box key={index} flexDirection="row">
            {renderBorder('│')}
            <Box width={innerWidth} paddingX={1}>
              {child}
            </Box>
            {renderBorder('│')}
          </Box>
        );
      } else if (React.isValidElement(child) && child.type === Text) {
        // For Text elements, wrap them with borders
        lines.push(
          <Box key={index} flexDirection="row">
            {renderBorder('│')}
            <Box width={innerWidth} paddingX={1}>
              {child}
            </Box>
            {renderBorder('│')}
          </Box>
        );
      } else {
        // For other content, wrap in a bordered line
        lines.push(
          <Box key={index} flexDirection="row">
            {renderBorder('│')}
            <Box width={innerWidth} paddingX={1}>
              {child}
            </Box>
            {renderBorder('│')}
          </Box>
        );
      }
    });
    
    return lines;
  };

  return (
    <Box flexDirection="column">
      {renderContentLines()}
    </Box>
  );
};