import React from 'react';
import { Box, Text } from 'ink';
import { useColors } from '../hooks/useColors.js';

interface RoundBoxContainerProps {
  title?: string;
  children: React.ReactNode;
  borderColor?: string;
  width?: number;
  height?: number;
  flexGrow?: number;
  isFocused?: boolean;
  isFocusable?: boolean;
  focusHint?: string;
  scrollPosition?: number;
  content?: string[] | undefined;
}

// Helper to get display length (ANSI-aware)
const getDisplayLength = (text: string): number => {
  return text.replace(/\x1b\[[0-9;]*m/g, '').length;
};

export const RoundBoxContainer: React.FC<RoundBoxContainerProps> = ({ 
  title, 
  children, 
  borderColor = 'cyan',
  width = 40,
  height = 10,
  flexGrow,
  isFocused = false,
  isFocusable = false,
  focusHint,
  scrollPosition = 0,
  content = undefined
}) => {
  const { colorize } = useColors();
  
  // Calculate proper dimensions and title formatting
  const titleText = title ? ` ${title} ` : '';
  
  // Calculate the full title length including hints
  let fullTitleLength = getDisplayLength(titleText);
  if (isFocused) {
    fullTitleLength += getDisplayLength('⁽ⁱⁿ ᶠᵒᶜᵘˢ⁾');
  } else if (!isFocused && isFocusable && focusHint) {
    fullTitleLength += getDisplayLength(focusHint);
  }
  
  const innerWidth = width - 2;
  const titlePadding = '─'.repeat(Math.max(0, innerWidth - fullTitleLength));
  
  // Support hex colors through colorize
  const renderBorder = (text: string) => {
    if (borderColor.startsWith('#')) {
      return colorize(text, borderColor);
    }
    return text;
  };
  
  // Render title with proper styling
  const renderTitle = () => {
    if (!title) return '';
    
    if (isFocused) {
      return (
        <>
          {borderColor.startsWith('#') 
            ? colorize(titleText, borderColor, { bold: true })
            : <Text bold color={borderColor}>{titleText}</Text>
          }
          <Text color="gray">⁽ⁱⁿ ᶠᵒᶜᵘˢ⁾</Text>
        </>
      );
    } else if (isFocusable && focusHint) {
      return (
        <>
          {borderColor.startsWith('#') 
            ? colorize(titleText, borderColor)
            : <Text color={borderColor}>{titleText}</Text>
          }
          <Text color="white">{focusHint}</Text>
        </>
      );
    } else {
      return borderColor.startsWith('#') 
        ? colorize(titleText, borderColor)
        : <Text color={borderColor}>{titleText}</Text>;
    }
  };
  
  return (
    <Box flexDirection="column" width={width} height={height} flexGrow={flexGrow}>
      {/* Top border with styled title */}
      <Box>
        {borderColor.startsWith('#') ? (
          <Text>
            {renderBorder('╭')}
            {renderTitle()}
            {renderBorder(titlePadding + '╮')}
          </Text>
        ) : (
          <Text color={borderColor}>
            ╭{renderTitle()}{titlePadding}╮
          </Text>
        )}
      </Box>
      
      {/* Content area */}
      <Box flexGrow={1} flexDirection="column">
        {children}
      </Box>
      
      {/* Bottom border */}
      <Box>
        {borderColor.startsWith('#') ? (
          <Text>{renderBorder(`╰${'─'.repeat(innerWidth)}╯`)}</Text>
        ) : (
          <Text color={borderColor}>╰{'─'.repeat(innerWidth)}╯</Text>
        )}
      </Box>
    </Box>
  );
};