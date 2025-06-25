import React, { useCallback, useState } from 'react';
import { Box, useApp, Key } from 'ink';
import { Header } from './components/Header.js';
import { StatusBar } from './components/StatusBar.js';
import { LayoutContainer } from './components/LayoutContainer.js';
import { ConfigurationPanelSimple } from './components/ConfigurationPanelSimple.js';
import { StatusPanel } from './components/StatusPanel.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useRootInput, useFocusChain } from './hooks/useFocusChain.js';
import { useDI } from './di/DIContext.js';
import { ServiceTokens } from './di/tokens.js';
import { NavigationProvider } from './contexts/NavigationContext.js';

export const AppFullscreen: React.FC = () => {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    
    // Set up root input handler
    useRootInput();
    
    // Register app-level input handler
    const handleAppInput = useCallback((input: string, key: Key): boolean => {
        // Handle 'q' to quit - always available unless something with higher priority handles it
        if (input === 'q') {
            exit();
            return true;
        }
        return false;
    }, [exit]);
    
    // Use focus chain for app-level component
    useFocusChain({
        elementId: 'app',
        onInput: handleAppInput,
        keyBindings: [
            { key: 'q', description: 'Quit' }
        ],
        priority: -100 // Low priority so active elements can override
    });
    
    // Fixed height calculations (accounting for header margin)
    const HEADER_HEIGHT = 4; // 3 lines + 1 margin
    const STATUS_BAR_HEIGHT = 3; // border + content + border
    const availableHeight = rows - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
    
    if (process.env.TUI_DEBUG) {
        console.error(`[AppFullscreen] Terminal: ${columns}x${rows}, Available: ${columns}x${availableHeight}`);
    }
    
    return (
        <NavigationProvider isBlocked={isNodeInEditMode}>
            <Box flexDirection="column" height={rows} width={columns}>
                <Header />
                
                <LayoutContainer
                    availableHeight={availableHeight}
                    availableWidth={columns}
                    narrowBreakpoint={100}
                >
                    <ConfigurationPanelSimple onEditModeChange={setIsNodeInEditMode} />
                    <StatusPanel />
                </LayoutContainer>
                
                <StatusBar />
            </Box>
        </NavigationProvider>
    );
};