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
  focusHint?: string;  // e.g., "Tab" for the key to focus this element
  scrollPosition?: number;
  content?: string[];
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
  content
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
  
  const innerWidth = width - 2; // Space for content (excluding left and right │)
  const titlePadding = '─'.repeat(Math.max(0, innerWidth - fullTitleLength));
  
  // Support hex colors through colorize
  const renderBorder = (text: string) => {
    if (borderColor.startsWith('#')) {
      return colorize(text, borderColor);
    }
    return text; // Let Ink handle standard colors
  };
  
  // Render title with proper styling
  const renderTitle = () => {
    if (!title) return '';
    
    if (isFocused) {
      // Bold title when focused, with focus indicator
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
      // Normal title + white hint when focusable but not focused
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
      // Normal title
      return borderColor.startsWith('#') 
        ? colorize(titleText, borderColor)
        : <Text color={borderColor}>{titleText}</Text>;
    }
  };
  
  // Render a single content line with proper padding and scrollbar
  const renderContentLine = (content: string, scrollbarChar: string = ' ') => {
    const maxContentWidth = innerWidth - 3; // Account for space, content, scrollbar
    const truncatedContent = content.length > maxContentWidth 
      ? content.slice(0, maxContentWidth - 3) + '...'
      : content;
    
    // Calculate padding to fill the space
    const totalContentLength = getDisplayLength(truncatedContent) + 1; // +1 for space after │
    const remainingSpace = innerWidth - totalContentLength - 1; // -1 for scrollbar
    const padding = ' '.repeat(Math.max(0, remainingSpace));
    
    return (
      <Text>
        {renderBorder('│')} {truncatedContent}{padding}{scrollbarChar}{renderBorder('│')}
      </Text>
    );
  };
  
  // Render empty line with scrollbar
  const renderEmptyLine = (scrollbarChar: string = ' ') => {
    const padding = ' '.repeat(Math.max(0, innerWidth - 1));
    return (
      <Text>
        {renderBorder('│')}{padding}{scrollbarChar}{renderBorder('│')}
      </Text>
    );
  };
  
  // Use provided content or fallback to hardcoded
  const getContentLines = (): string[] => {
    if (content) return content;
    
    if (title === 'Configuration') {
      return [
        'Configuration Setup',
        '',
        'Step 1 of 3: Choose configuration method',
        '',
        '▸ Create optimized configuration for my machine',
        '▸ Use automatic hardware detection',
        '▸ Select embedding model manually',
        '▸ Configure advanced options',
        '',
        '  Start configuration wizard',
        '  Load from existing config file',
        '  Reset to factory defaults',
        '',
        'Additional Options:',
        '• Enable GPU acceleration (if available)',
        '• Set custom cache directory',
        '• Configure network timeouts',
        '• Enable debug logging',
        '• Set memory limits',
        '• Configure file watching patterns',
        '',
        'Navigation Help:',
        'Use ↑↓ to navigate options',
        'Use Enter to select',
        'Use Tab to switch focus areas',
        'Use PageUp/PageDown to scroll'
      ];
    } else if (title === 'Status') {
      return [
        '• System initialized successfully',
        '• Checking cached configuration files...',
        '• Loading default settings from config.yaml',
        '• Validating embedding model availability',
        '• Testing Ollama connection on localhost:11434',
        '• Scanning for GPU acceleration support',
        '• Initializing FAISS vector database',
        '• Setting up file system watchers',
        '• Configuring memory management',
        '• Loading language detection models',
        '• Preparing document parsers (PDF, DOCX, XLSX)',
        '• Establishing MCP protocol handlers',
        '• Starting background indexing service',
        '• Monitoring system resources',
        '',
        'System Information:',
        `Terminal: ${process.stdout.columns || 80}×${process.stdout.rows || 24}`,
        `Node.js: ${process.version}`,
        `Platform: ${process.platform}`,
        `Architecture: ${process.arch}`,
        `Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`,
        '',
        'Recent Activity:',
        '[12:34:56] Configuration loaded successfully',
        '[12:34:57] Embedding model nomic-embed-text ready',
        '[12:34:58] Vector database initialized (0 documents)',
        '[12:34:59] File watcher started for current directory',
        '[12:35:00] MCP server listening on port 3000',
        '[12:35:01] Ready to process document requests',
        '',
        'Performance Metrics:',
        'Documents indexed: 0',
        'Embeddings generated: 0',
        'Cache hit ratio: N/A',
        'Average response time: N/A',
        'Memory usage trend: Stable',
        '',
        'Use Tab to focus this area for scrolling'
      ];
    }
    return ['Content here'];
  };
  
  const contentLines = getContentLines();
  const availableContentHeight = height - 3; // Subtract top border, bottom border, and one padding line
  
  // Calculate scroll window
  const maxScroll = Math.max(0, contentLines.length - availableContentHeight + 1);
  const clampedScrollPosition = Math.min(scrollPosition, maxScroll);
  const visibleLines = contentLines.slice(clampedScrollPosition, clampedScrollPosition + availableContentHeight - 1);
  
  // Use the calculated title padding
  const titlePaddingFinal = titlePadding;
  
  // Calculate scrollbar
  const canScrollUp = clampedScrollPosition > 0;
  const canScrollDown = clampedScrollPosition < maxScroll;
  const hasScrollableContent = contentLines.length > availableContentHeight - 1;
  
  // Calculate proportional scrollbar
  const getScrollbarChar = (lineIndex: number): string => {
    if (!hasScrollableContent) return ' ';
    
    const totalScrollableArea = availableContentHeight - 1;
    const visiblePortion = totalScrollableArea / contentLines.length;
    const scrollbarHeight = Math.max(1, Math.floor(visiblePortion * totalScrollableArea));
    const scrollbarStart = Math.floor((clampedScrollPosition / contentLines.length) * totalScrollableArea);
    
    // Show arrows when there's scrollable content (always visible if content exists)
    if (lineIndex === 0 && hasScrollableContent) return '▲';
    if (lineIndex === totalScrollableArea && hasScrollableContent) return '▼';
    
    // Show proportional scrollbar in the middle area
    const relativePos = lineIndex - (canScrollUp ? 1 : 0); // Adjust for top arrow
    const adjustedStart = scrollbarStart + (canScrollUp ? 1 : 0);
    const adjustedHeight = scrollbarHeight - (canScrollUp ? 1 : 0) - (canScrollDown ? 1 : 0);
    
    if (relativePos >= 0 && relativePos >= adjustedStart && relativePos < adjustedStart + Math.max(1, adjustedHeight)) {
      return '┃';
    }
    
    return ' ';
  };
  
  return (
    <Box flexDirection="column" width={width} height={height} flexGrow={flexGrow}>
      {/* Top border with styled title */}
      <Box>
        {borderColor.startsWith('#') ? (
          <Text>
            {renderBorder('╭')}
            {renderTitle()}
            {renderBorder(titlePaddingFinal + '╮')}
          </Text>
        ) : (
          <Text color={borderColor}>
            {renderBorder('╭')}
            {renderTitle()}
            {renderBorder(titlePaddingFinal + '╮')}
          </Text>
        )}
      </Box>
      
      {/* Empty padding line */}
      <Box>
        {renderEmptyLine(getScrollbarChar(0))}
      </Box>
      
      {/* Content lines with scrollbar */}
      {visibleLines.map((line, index) => (
        <Box key={clampedScrollPosition + index}>
          {line === '' ? 
            renderEmptyLine(getScrollbarChar(index + 1)) : 
            renderContentLine(line, getScrollbarChar(index + 1))
          }
        </Box>
      ))}
      
      {/* Fill remaining height with empty lines and scrollbar */}
      {Array.from({ 
        length: Math.max(0, availableContentHeight - visibleLines.length - 1)
      }, (_, index) => (
        <Box key={`empty-${index}`}>
          {renderEmptyLine(getScrollbarChar(visibleLines.length + index + 1))}
        </Box>
      ))}
      
      {/* Bottom border */}
      <Box>
        {borderColor.startsWith('#') ? (
          <Text>{renderBorder(`╰${'─'.repeat(innerWidth)}╯`)}</Text>
        ) : (
          <Text color={borderColor}>{renderBorder(`╰${'─'.repeat(innerWidth)}╯`)}</Text>
        )}
      </Box>
    </Box>
  );
};