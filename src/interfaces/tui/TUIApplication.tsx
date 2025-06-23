import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { WelcomeScreen } from './screens/WelcomeScreen.js';
import { ConfigScreen } from './screens/ConfigScreen.js';
import { Logo } from './components/Logo.js';
import { StatusBar } from './components/StatusBar.js';
import { useTerminal } from './hooks/useTerminal.js';
// import { useFocus } from './hooks/useFocus.js'; // Removed - using KeyboardManager
import { DIContext, SimpleDIContainer } from './di/DIContext.js';
import { ShortcutRegistry } from './shortcuts/ShortcutRegistry.js';
import { WindowProvider } from './shortcuts/providers/WindowProvider.js';
import { PanelProvider } from './shortcuts/providers/PanelProvider.js';
// import { ShortcutContext, FocusElement } from './shortcuts/types.js'; // Removed - using KeyboardManager
import { VisualElement } from './components/VisualElement.js';
import { KeyboardManager, KeyBinding } from './keyboard/KeyboardManager.js';

type AppState = 'welcome' | 'config' | 'main';

class TUIApplicationElement extends VisualElement {
  private appState: AppState = 'config';
  private setAppState: ((state: AppState) => void) | null = null;
  private onRender: (() => void) | null = null;

  constructor() {
    super('tui-application');
  }

  setStateHandler(setAppState: (state: AppState) => void, onRender: () => void): void {
    this.setAppState = setAppState;
    this.onRender = onRender;
  }

  processKeystroke(key: string): boolean {
    // Global quit command
    if (key === 'q') {
      process.exit(0);
      return true;
    }
    
    // Delegate to children first
    for (const child of this._children) {
      if (child.processKeystroke(key)) {
        return true;
      }
    }
    
    return false;
  }

  getRenderContent(): string[] {
    return [`TUIApplication (${this.appState})`];
  }

  getShortcuts(): KeyBinding[] {
    return [{ key: 'q', description: 'Quit' }];
  }
}

export const TUIApplication: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>('config');
  const [isInitialized, setIsInitialized] = useState(false);
  // Legacy tab handling removed - handled by VisualElement system
  const [renderTrigger, setRenderTrigger] = useState(0);
  const { size } = useTerminal();
  
  // Create TUI application element
  const tuiAppElement = useMemo(() => {
    const element = new TUIApplicationElement();
    element.setStateHandler(setCurrentState, () => setRenderTrigger(prev => prev + 1));
    return element;
  }, []);
  
  // Set as active element on mount and register render callback
  useEffect(() => {
    const keyboardManager = KeyboardManager.getInstance();
    keyboardManager.setActiveElement(tuiAppElement);
    
    // Register render callback to trigger React re-renders
    const renderCallback = () => setRenderTrigger(prev => prev + 1);
    keyboardManager.addRenderCallback(renderCallback);
    
    return () => {
      keyboardManager.removeRenderCallback(renderCallback);
    };
  }, [tuiAppElement]);

  // Removed legacy focus system - using KeyboardManager instead
  const legacyFocusState = { currentFocus: 'main' as const, scrollPosition: { main: 0, status: 0 } };

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

  // Legacy shortcut context - to be removed when fully migrated to KeyboardManager
  // const buildShortcutContext = (): ShortcutContext => { ... }

  // const shortcutContext = buildShortcutContext(); // Removed - using KeyboardManager instead

  useEffect(() => {
    // Simulate initialization
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useInput((input: string, key: any) => {
    // Convert ink key events to our simplified format
    const keyString = key.upArrow ? 'up' : 
                     key.downArrow ? 'down' : 
                     key.leftArrow ? 'left' : 
                     key.rightArrow ? 'right' : 
                     key.return ? 'enter' :
                     key.tab ? 'tab' :
                     key.ctrl && input === 'c' ? 'q' :
                     input;
    
    // Route through KeyboardManager
    const keyboardManager = KeyboardManager.getInstance();
    const handled = keyboardManager.processKeystroke(keyString);
    
    if (handled) {
      setRenderTrigger(prev => prev + 1); // Force re-render
      return;
    }
    
    // Fallback for unhandled keys
    if (currentState === 'welcome' && isInitialized) {
      if (key.return || input === ' ') {
        setCurrentState('config');
      }
    }
    
    // Legacy focus controls removed - handled by VisualElement system
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
                focusState={legacyFocusState}
                tuiAppElement={tuiAppElement}
              />
            </Box>
            
            {/* Dynamic status bar at bottom */}
            <Box>
              <StatusBar />
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