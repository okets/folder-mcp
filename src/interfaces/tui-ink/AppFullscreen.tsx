import React, { useCallback, useState, useContext } from 'react';
import { Box, Text, useApp, Key } from 'ink';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { LayoutContainer } from './components/LayoutContainer';
import { MainPanel } from './components/MainPanel';
import { SecondaryPanel } from './components/SecondaryPanel';
import { useTerminalSize } from './hooks/useTerminalSize';
import { useRootInput, useFocusChain } from './hooks/useFocusChain';
import { useDI } from './di/DIContext';
import { ServiceTokens } from './di/tokens';
import { NavigationProvider } from './contexts/NavigationContext';
import { AnimationProvider, useAnimationContext } from './contexts/AnimationContext';
import { createConfigurationPanelItems, createStatusPanelItems } from './models/mixedSampleData';
import { ThemeContext, themes, ThemeName } from './contexts/ThemeContext';

// Get item counts once at module level to ensure consistency
const CONFIG_ITEMS = createConfigurationPanelItems();
const STATUS_ITEMS = createStatusPanelItems();
const CONFIG_ITEM_COUNT = CONFIG_ITEMS.length;
const STATUS_ITEM_COUNT = STATUS_ITEMS.length;

interface AppContentProps {
    screenName?: string;
}

const AppContent: React.FC<AppContentProps> = ({ screenName }) => {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    const { toggleAnimations, animationsPaused } = useAnimationContext();
    
    // Try to use theme context if available
    const themeContext = useContext(ThemeContext);
    const hasTheme = themeContext !== undefined;
    
    // Set up root input handler
    useRootInput();
    
    // Register app-level input handler
    const handleAppInput = useCallback((input: string, key: Key): boolean => {
        // Handle Ctrl+A to toggle animations
        if (key.ctrl && input === 'a') {
            toggleAnimations();
            return true;
        }
        // Handle 'T' to cycle themes (if theme context is available)
        if ((input === 't' || input === 'T') && hasTheme && themeContext) {
            const themeNames = Object.keys(themes) as ThemeName[];
            const currentIndex = themeNames.indexOf(themeContext.themeName);
            const nextIndex = (currentIndex + 1) % themeNames.length;
            const nextTheme = themeNames[nextIndex];
            if (nextTheme) {
                themeContext.setTheme(nextTheme);
            }
            return true;
        }
        // Handle 'q' to quit - always available unless something with higher priority handles it
        if (input === 'q' || input === 'Q') {
            exit();
            return true;
        }
        return false;
    }, [exit, toggleAnimations, hasTheme, themeContext]);
    
    // Use focus chain for app-level component
    useFocusChain({
        elementId: 'app',
        onInput: handleAppInput,
        keyBindings: isNodeInEditMode ? [] : [
            { key: 'Q', description: 'Quit' },
            { key: 'Ctrl+A', description: animationsPaused ? 'Resume Animations' : 'Pause Animations' },
            ...(hasTheme ? [{ key: 'T', description: `Theme (${themeContext?.themeName || 'auto'})` }] : [])
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
                <Header {...(hasTheme && themeContext ? { themeName: themeContext.themeName } : {})} />
                
                <LayoutContainer
                    availableHeight={availableHeight}
                    availableWidth={columns}
                    narrowBreakpoint={100}
                >
                    <MainPanel onEditModeChange={setIsNodeInEditMode} {...(screenName ? { screenName } : {})} />
                    <SecondaryPanel />
                </LayoutContainer>
                
                <StatusBar />
            </Box>
        </NavigationProvider>
    );
};

interface AppFullscreenProps {
    screenName?: string;
}

export const AppFullscreen: React.FC<AppFullscreenProps> = ({ screenName }) => {
    return (
        <AnimationProvider>
            <AppContent {...(screenName ? { screenName } : {})} />
        </AnimationProvider>
    );
};