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
import { IListItem } from './components/core/IListItem';
import { FilePickerListItem } from './components/core/FilePickerListItem';
import { ConfigurationListItem } from './components/core/ConfigurationListItem';
import { existsSync, statSync } from 'fs';

// Get item counts once at module level to ensure consistency
const STATUS_ITEMS = createStatusPanelItems();
const STATUS_ITEM_COUNT = STATUS_ITEMS.length;
const CONFIG_ITEMS = createConfigurationPanelItems();
const CONFIG_ITEM_COUNT = CONFIG_ITEMS.length;

interface AppContentInnerProps {
    config?: any;
}

const AppContentInner: React.FC<AppContentInnerProps> = ({ config }) => {
    // Main app now displays actual config from wizard
    
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    const { toggleAnimations, animationsPaused } = useAnimationContext();
    const navigation = useNavigationContext();
    
    // Navigation state connected to config items with active cursor management
    
    
    // Create config items from actual config or fall back to sample data
    const configItems = React.useMemo(() => {
        if (config?.folders?.[0]) {
            // Validate folder exists and is accessible
            const folderPath = config.folders[0].path;
            let folderIcon = '√';
            let folderValid = true;
            
            try {
                if (!existsSync(folderPath)) {
                    folderIcon = '✗';
                    folderValid = false;
                } else {
                    const stat = statSync(folderPath);
                    if (!stat.isDirectory()) {
                        folderIcon = '✗';
                        folderValid = false;
                    }
                }
            } catch (error) {
                folderIcon = '✗';
                folderValid = false;
            }
            
            // Create a FilePickerListItem showing the actual configured folder
            const folderPicker = new FilePickerListItem(
                folderIcon,
                'Project Folder',
                folderPath,
                false, // GenericListPanel will handle active state
                'folder', // folder mode
                (newPath) => {
                    // TODO: Handle folder path changes in main app
                    console.log('User wants to change folder to:', newPath);
                    // This would need to update the config and trigger re-indexing
                }
            );
            
            // Create ConfigurationListItem for model
            const modelConfig = new ConfigurationListItem(
                '√',
                'Embedding Model',
                config.folders[0].model || config.embedding?.model || 'ollama:nomic-embed-text',
                false, // GenericListPanel will handle active state
                false, // not expanded
                undefined, // no edit value
                undefined, // no cursor position
                undefined, // no cursor visible
                (newModel) => {
                    // TODO: Handle model changes
                    console.log('User wants to change model to:', newModel);
                }
            );
            
            // Create ConfigurationListItem for language
            const languageConfig = new ConfigurationListItem(
                '√',
                'Language',
                config.folders[0].language || 'auto',
                false, // GenericListPanel will handle active state
                false, // not expanded
                undefined, // no edit value
                undefined, // no cursor position
                undefined, // no cursor visible
                (newLanguage) => {
                    // TODO: Handle language changes
                    console.log('User wants to change language to:', newLanguage);
                }
            );
            
            const configItems = [folderPicker, modelConfig, languageConfig];
            
            return configItems;
        } else {
            // Fallback to sample data when no config available
            const sampleItems = [...CONFIG_ITEMS]; // Clone to avoid mutations
            
            return sampleItems;
        }
    }, [config]); // Remove navigation dependencies - GenericListPanel handles active state
    
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
                    items={configItems}
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

interface AppContentProps {
    config?: any;
}

const AppContent: React.FC<AppContentProps> = ({ config }) => {
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    
    // Calculate actual config item count
    const actualConfigItemCount = config?.folders?.[0] ? 3 : CONFIG_ITEM_COUNT; // folder + model + language
    
    return (
        <NavigationProvider isBlocked={isNodeInEditMode} configItemCount={actualConfigItemCount} statusItemCount={STATUS_ITEM_COUNT}>
            <AppContentInner config={config} />
        </NavigationProvider>
    );
};

interface AppFullscreenProps {
    config?: any;
}

export const AppFullscreen: React.FC<AppFullscreenProps> = ({ config }) => {
    return (
        <AnimationProvider>
            <AppContent config={config} />
        </AnimationProvider>
    );
};