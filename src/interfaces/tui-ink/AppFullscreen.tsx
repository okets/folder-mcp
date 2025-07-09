import React, { useCallback, useState, useContext, memo } from 'react';
import { Box, Text, useApp, Key } from 'ink';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { LayoutContainer } from './components/LayoutContainer';
import { GenericListPanel } from './components/GenericListPanel';
import { useNavigationContext } from './contexts/NavigationContext';
import { useTerminalSize } from './hooks/useTerminalSize';
import { useRootInput, useFocusChain } from './hooks/useFocusChain';
import { useDI } from './di/DIContext';
import { ServiceTokens } from './di/tokens';
import { NavigationProvider } from './contexts/NavigationContext';
import { AnimationProvider, useAnimationContext } from './contexts/AnimationContext';
import { createStatusPanelItems, createConfigurationPanelItems } from './models/mixedSampleData';
import { ThemeContext, themes, ThemeName } from './contexts/ThemeContext';

// Get item counts once at module level to ensure consistency
const STATUS_ITEMS = createStatusPanelItems();
const STATUS_ITEM_COUNT = STATUS_ITEMS.length;
const CONFIG_ITEMS = createConfigurationPanelItems();
const CONFIG_ITEM_COUNT = CONFIG_ITEMS.length;

interface AppContentInnerProps {}

const AppContentInner: React.FC<AppContentInnerProps> = () => {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    const { toggleAnimations, animationsPaused } = useAnimationContext();
    const navigation = useNavigationContext();
    
    
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
        <Box flexDirection="column" height={rows} width={columns}>
            <Header {...(hasTheme && themeContext ? { themeName: themeContext.themeName } : {})} />
            
            <LayoutContainer
                availableHeight={availableHeight}
                availableWidth={columns}
                narrowBreakpoint={100}
            >
                <GenericListPanel
                    title="Main"
                    subtitle="Configuration"
                    items={CONFIG_ITEMS}
                    selectedIndex={navigation.mainSelectedIndex}
                    isFocused={navigation.isMainFocused}
                    elementId="main-panel"
                    parentId="navigation"
                    priority={50}
                />
                <GenericListPanel
                    title="System Status"
                    subtitle="Current state"
                    items={STATUS_ITEMS}
                    selectedIndex={navigation.statusSelectedIndex}
                    isFocused={navigation.isStatusFocused}
                    elementId="status-panel"
                    parentId="navigation"
                    priority={50}
                />
            </LayoutContainer>
            
            <StatusBar />
        </Box>
    );
};

interface AppContentProps {}

const AppContent: React.FC<AppContentProps> = () => {
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    
    return (
        <NavigationProvider isBlocked={isNodeInEditMode} configItemCount={CONFIG_ITEM_COUNT} statusItemCount={STATUS_ITEM_COUNT}>
            <AppContentInner />
        </NavigationProvider>
    );
};

interface AppFullscreenProps {}

export const AppFullscreen: React.FC<AppFullscreenProps> = () => {
    return (
        <AnimationProvider>
            <AppContent />
        </AnimationProvider>
    );
};