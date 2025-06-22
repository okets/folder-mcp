import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { WelcomeScreen } from './screens/WelcomeScreen.js';
import { ConfigScreen } from './screens/ConfigScreen.js';
import { Logo } from './components/Logo.js';
import { StatusBar } from './components/StatusBar.js';
import { useTerminal } from './hooks/useTerminal.js';
import { useFocus } from './hooks/useFocus.js';
import { DIContext, SimpleDIContainer } from './di/DIContext.js';
import { ShortcutRegistry } from './shortcuts/ShortcutRegistry.js';
import { WindowProvider } from './shortcuts/providers/WindowProvider.js';
import { PanelProvider } from './shortcuts/providers/PanelProvider.js';
import { ShortcutContext, FocusElement } from './shortcuts/types.js';

type AppState = 'welcome' | 'config' | 'main';

export const TUIApplication: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>('config');
  const [isInitialized, setIsInitialized] = useState(false);
  const [tabPressed, setTabPressed] = useState(false);
  const [tabTimeout, setTabTimeout] = useState<NodeJS.Timeout | null>(null);
  const { size } = useTerminal();
  const { focusState, switchFocus, focusConfiguration, focusStatus, scrollUp, scrollDown, resetScroll } = useFocus();

  // Setup DI container and shortcut system
  const diContainer = useMemo(() => {
    const container = new SimpleDIContainer();
    const registry = new ShortcutRegistry();
    
    // Register providers
    const windowProvider = new WindowProvider();
    const configProvider = new PanelProvider('configuration');
    const statusProvider = new PanelProvider('status');
    
    registry.register('window', windowProvider);
    registry.register('config-panel', configProvider);
    registry.register('status-panel', statusProvider);
    
    container.set('shortcutRegistry', registry);
    container.set('windowProvider', windowProvider);
    container.set('configProvider', configProvider);
    container.set('statusProvider', statusProvider);
    
    return container;
  }, []);

  // Build shortcut context
  const buildShortcutContext = (): ShortcutContext => {
    const hierarchy: FocusElement[] = [];
    const windowProvider = diContainer.get<WindowProvider>('windowProvider')!;
    const configProvider = diContainer.get<PanelProvider>('configProvider')!;
    const statusProvider = diContainer.get<PanelProvider>('statusProvider')!;
    
    // Add focus hierarchy (most specific first)
    if (focusState.currentFocus === 'main') {
      hierarchy.push({ id: 'configuration', type: 'panel', provider: configProvider });
    } else if (focusState.currentFocus === 'status') {
      hierarchy.push({ id: 'status', type: 'panel', provider: statusProvider });
    }
    
    // Always add window as base level
    hierarchy.push({ id: 'window', type: 'window', provider: windowProvider });
    
    return {
      focusHierarchy: hierarchy,
      globalState: {
        canScroll: true,
        canNavigate: true,
        isEditing: false,
        currentFocus: focusState.currentFocus
      }
    };
  };

  const shortcutContext = buildShortcutContext();

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
      // Tab combination handling
      if (key.tab || input === '\t') {
        if (!tabPressed) {
          setTabPressed(true);
          // Set a timeout to handle single Tab press
          const timeout = setTimeout(() => {
            switchFocus();
            setTabPressed(false);
            setTabTimeout(null);
          }, 300); // 300ms window for combination
          setTabTimeout(timeout);
        }
      } else if (tabPressed) {
        // Clear the timeout since we have a combination
        if (tabTimeout) {
          clearTimeout(tabTimeout);
          setTabTimeout(null);
        }
        
        // Handle Tab + key combinations
        if (input.toLowerCase() === 'c') {
          focusConfiguration();
          setTabPressed(false);
        } else if (input.toLowerCase() === 's') {
          focusStatus();
          setTabPressed(false);
        } else {
          // Any other key cancels Tab mode
          setTabPressed(false);
        }
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
            
            {/* Dynamic status bar at bottom */}
            <Box>
              <StatusBar context={shortcutContext} />
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
    <DIContext.Provider value={diContainer}>
      <Box width={size.width} height={size.height}>
        {renderCurrentScreen()}
      </Box>
    </DIContext.Provider>
  );
};