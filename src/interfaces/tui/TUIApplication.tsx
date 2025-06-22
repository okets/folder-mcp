import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { WelcomeScreen } from './screens/WelcomeScreen.js';
import { ConfigScreen } from './screens/ConfigScreen.js';
import { Logo } from './components/Logo.js';
import { useTerminal } from './hooks/useTerminal.js';
import { useFocus } from './hooks/useFocus.js';

type AppState = 'welcome' | 'config' | 'main';

export const TUIApplication: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>('config');
  const [isInitialized, setIsInitialized] = useState(false);
  const { size } = useTerminal();
  const { focusState, switchFocus, scrollUp, scrollDown, resetScroll } = useFocus();

  useEffect(() => {
    // Simulate initialization
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useInput((input: string, key: any) => {
    if (currentState === 'welcome' && isInitialized) {
      if (key.return || input === ' ') {
        setCurrentState('config');
      }
    }
    
    // Global keys
    if (input === 'q' || key.ctrl && input === 'c') {
      process.exit(0);
    }
    
    // Focus and scroll controls (only in config state)
    if (currentState === 'config') {
      if (key.tab || input === '\t') {
        switchFocus();
      } else if (key.pageUp || (key.ctrl && input === 'u')) {
        scrollUp();
      } else if (key.pageDown || (key.ctrl && input === 'd')) {
        scrollDown(20); // Max scroll, will be clamped in component
      } else if (key.upArrow && focusState.currentFocus === 'status') {
        scrollUp();
      } else if (key.downArrow && focusState.currentFocus === 'status') {
        scrollDown(20);
      }
    }
  });

  const renderCurrentScreen = () => {
    switch (currentState) {
      case 'welcome':
        return (
          <WelcomeScreen 
            onNext={() => setCurrentState('config')}
            terminalSize={size}
          />
        );
      case 'config':
        return (
          <Box width={size.width} height={size.height} flexDirection="column">
            {/* Empty line to ensure top visibility */}
            <Box height={1}>
              <Text> </Text>
            </Box>
            
            {/* Header with logo */}
            <Box>
              <Logo />
            </Box>
            
            {/* Main content area */}
            <Box flexGrow={1} paddingTop={1}>
              <ConfigScreen 
                terminalSize={size}
                onNext={() => setCurrentState('main')}
                focusState={focusState}
              />
            </Box>
            
            {/* Status bar at bottom */}
            <Box>
              <Box paddingX={1} justifyContent="space-between">
                <Text color="gray">folder-mcp TUI v1.0.0</Text>
                <Text color="gray">
                  Tab: Switch Focus • ↑↓/PgUp/PgDn: Scroll • q: Quit
                </Text>
              </Box>
            </Box>
          </Box>
        );
      case 'main':
        return (
          <Box width={size.width} height={size.height} flexDirection="column">
            <Box flexGrow={1} justifyContent="center" alignItems="center">
              <Box>Main screen coming next...</Box>
            </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box width={size.width} height={size.height}>
      {renderCurrentScreen()}
    </Box>
  );
};