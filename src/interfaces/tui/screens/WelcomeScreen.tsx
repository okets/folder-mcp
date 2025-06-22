import React from 'react';
import { Box, Text } from 'ink';
import { Logo } from '../components/Logo.js';
import { RoundBoxContainer } from '../components/RoundBoxContainer.js';
import { TerminalSize } from '../hooks/useTerminal.js';

interface WelcomeScreenProps {
  onNext?: () => void;
  terminalSize: TerminalSize;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext, terminalSize }) => {
  // Calculate positions for fullscreen layout
  const contentWidth = Math.min(50, terminalSize.width - 4);
  const centerX = Math.floor((terminalSize.width - contentWidth) / 2);
  const centerY = Math.floor(terminalSize.height / 2);

  return (
    <Box width={terminalSize.width} height={terminalSize.height} flexDirection="column">
      {/* Empty line to ensure top visibility */}
      <Box height={1}>
        <Text> </Text>
      </Box>
      
      {/* Header with logo */}
      <Box>
        <Logo />
      </Box>
      
      {/* Main content centered */}
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Box flexDirection="column" alignItems="center">
          <Box marginBottom={2}>
            <RoundBoxContainer title="Welcome" borderColor="cyan" width={contentWidth}>
              <Box paddingX={2} paddingY={1} flexDirection="column" alignItems="center">
                <Text color="white">Model Context Protocol Server</Text>
                <Text color="gray">Semantic File System Access</Text>
                <Box marginTop={1}>
                  <Text color="gray" dimColor>Terminal: {terminalSize.width}×{terminalSize.height}</Text>
                </Box>
              </Box>
            </RoundBoxContainer>
          </Box>
          
          <Box marginBottom={1}>
            <Text color="gray">Initializing TUI framework...</Text>
          </Box>
        </Box>
      </Box>
      
      {/* Status bar at bottom */}
      <Box>
        <Box paddingX={1} justifyContent="space-between">
          <Text color="gray">folder-mcp TUI v1.0.0</Text>
          <Text color="gray">Press any key to continue • q to quit</Text>
        </Box>
      </Box>
    </Box>
  );
};