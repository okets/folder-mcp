import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    console.error(`TUIApplicationElement: Processing "${key}"`);
    
    // Global quit command
    if (key === 'q') {
      console.error('TUIApplicationElement: Quitting application');
      process.exit(0);
      return true;
    }
    
    // Delegate to children first
    console.error(`TUIApplicationElement: Delegating to ${this._children.length} children`);
    for (const child of this._children) {
      console.error(`TUIApplicationElement: Trying child ${child.constructor.name}`);
      if (child.processKeystroke(key)) {
        console.error(`TUIApplicationElement: Child ${child.constructor.name} handled "${key}"`);
        return true;
      }
    }
    
    console.error(`TUIApplicationElement: No child handled "${key}"`);
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
  const [tabPressed, setTabPressed] = useState(false);
  const [tabTimeout, setTabTimeout] = useState<NodeJS.Timeout | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const { size } = useTerminal();
  
  // Create TUI application element
  const tuiAppElement = useMemo(() => {
    const element = new TUIApplicationElement();
    element.setStateHandler(setCurrentState, () => setRenderTrigger(prev => prev + 1));
    return element;
  }, []);
  
  // Set as active element on mount
  useEffect(() => {
    const keyboardManager = KeyboardManager.getInstance();
    keyboardManager.setActiveElement(tuiAppElement);
  }, [tuiAppElement]);

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
    // Convert ink key events to our simplified format
    const keyString = key.upArrow ? 'up' : 
                     key.downArrow ? 'down' : 
                     key.leftArrow ? 'left' : 
                     key.rightArrow ? 'right' : 
                     key.return ? 'enter' :
                     key.tab ? 'tab' :
                     key.ctrl && input === 'c' ? 'q' :
                     input;
    
    console.error(`TUIApplication: Received input "${input}", key: ${JSON.stringify(key)}, converted to: "${keyString}"`);
    
    // Route through KeyboardManager
    const keyboardManager = KeyboardManager.getInstance();
    const activeElement = keyboardManager.getActiveElement();
    console.error(`TUIApplication: Active element: ${activeElement ? activeElement.constructor.name : 'none'}`);
    
    const handled = keyboardManager.processKeystroke(keyString);
    console.error(`TUIApplication: KeyboardManager ${handled ? 'handled' : 'did not handle'} "${keyString}"`);
    
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
    
    // Legacy focus controls for Tab combinations
    if (currentState === 'config') {
      if (key.tab || input === '\t') {
        if (!tabPressed) {
          setTabPressed(true);
          const timeout = setTimeout(() => {
            switchFocus();
            setTabPressed(false);
            setTabTimeout(null);
          }, 300);
          setTabTimeout(timeout);
        }
      } else if (tabPressed) {
        if (tabTimeout) {
          clearTimeout(tabTimeout);
          setTabTimeout(null);
        }
        
        if (input.toLowerCase() === 'c') {
          focusConfiguration();
          setTabPressed(false);
        } else if (input.toLowerCase() === 's') {
          focusStatus();
          setTabPressed(false);
        } else {
          setTabPressed(false);
        }
      } else if (key.pageUp || (key.ctrl && input === 'u')) {
        scrollUp();
      } else if (key.pageDown || (key.ctrl && input === 'd')) {
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
                tuiAppElement={tuiAppElement}
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