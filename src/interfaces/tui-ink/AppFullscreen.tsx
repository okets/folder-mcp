import React, { useCallback, useState } from 'react';
import { Box, Text, useApp, Key } from 'ink';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { LayoutContainer } from './components/LayoutContainer';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { StatusPanel } from './components/StatusPanel';
import { useTerminalSize } from './hooks/useTerminalSize';
import { useRootInput, useFocusChain } from './hooks/useFocusChain';
import { useDI } from './di/DIContext';
import { ServiceTokens } from './di/tokens';
import { NavigationProvider } from './contexts/NavigationContext';
import { AnimationProvider, useAnimationContext } from './contexts/AnimationContext';
import { createConfigurationPanelItems, createStatusPanelItems } from './models/mixedSampleData';

// Get item counts once at module level to ensure consistency
const CONFIG_ITEMS = createConfigurationPanelItems();
const STATUS_ITEMS = createStatusPanelItems();
const CONFIG_ITEM_COUNT = CONFIG_ITEMS.length;
const STATUS_ITEM_COUNT = STATUS_ITEMS.length;

const AppContent: React.FC = () => {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    const { toggleAnimations, animationsPaused } = useAnimationContext();
    
    // Set up root input handler
    useRootInput();
    
    // Register app-level input handler
    const handleAppInput = useCallback((input: string, key: Key): boolean => {
        // Handle Ctrl+A to toggle animations
        if (key.ctrl && input === 'a') {
            toggleAnimations();
            return true;
        }
        // Handle 'q' to quit - always available unless something with higher priority handles it
        if (input === 'q' || input === 'Q') {
            exit();
            return true;
        }
        return false;
    }, [exit, toggleAnimations]);
    
    // Use focus chain for app-level component
    useFocusChain({
        elementId: 'app',
        onInput: handleAppInput,
        keyBindings: isNodeInEditMode ? [] : [
            { key: 'Q', description: 'Quit' },
            { key: 'Ctrl+A', description: animationsPaused ? 'Resume Animations' : 'Pause Animations' }
        ],
        priority: -100 // Low priority so active elements can override
    });
    
    // Fixed height calculations (accounting for header margin)
    const isLowResolution = rows < 25;
    const HEADER_HEIGHT = isLowResolution ? 2 : 4; // Low res: 1 line + 1 margin, Normal: 3 lines + 1 margin
    const STATUS_BAR_HEIGHT = isLowResolution ? 1 : 3; // Low res: 1 line (no border), Normal: 3 lines (border + content + border)
    const availableHeight = rows - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
    
    if (process.env.TUI_DEBUG) {
        console.error(`[AppFullscreen] Terminal: ${columns}x${rows}, Available: ${columns}x${availableHeight}`);
    }
    
    return (
        <NavigationProvider isBlocked={isNodeInEditMode} configItemCount={CONFIG_ITEM_COUNT} statusItemCount={STATUS_ITEM_COUNT}>
            <Box flexDirection="column" height={rows} width={columns}>
                <Header />
                
                <LayoutContainer
                    availableHeight={availableHeight}
                    availableWidth={columns}
                    narrowBreakpoint={100}
                >
                    <ConfigurationPanel onEditModeChange={setIsNodeInEditMode} />
                    <StatusPanel />
                </LayoutContainer>
                
                <StatusBar />
            </Box>
        </NavigationProvider>
    );
};

export const AppFullscreen: React.FC = () => {
    return (
        <AnimationProvider>
            <AppContent />
        </AnimationProvider>
    );
};