import React, { useCallback, useState, useContext, memo, useEffect } from 'react';
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
import { useTheme, themes, ThemeName } from './contexts/ThemeContext';
import { IListItem } from './components/core/IListItem';
import { FilePickerListItem } from './components/core/FilePickerListItem';
import { ConfigurationListItem } from './components/core/ConfigurationListItem';
import { SelectionListItem } from './components/core/SelectionListItem';
import { existsSync, statSync } from 'fs';
import { getContainer } from '../../di/container';
import { CONFIG_SERVICE_TOKENS } from '../../config/di-setup';
import { ConfigurationComponent } from '../../config/ConfigurationComponent';

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
    
    // State to hold current folders from ConfigurationComponent
    const [currentFolders, setCurrentFolders] = useState<Array<{ path: string; model: string }>>([]);
    
    // Simple countdown state for exit safety
    const [countdown, setCountdown] = useState<number | null>(null);
    
    // Countdown effect
    useEffect(() => {
        if (countdown === null || countdown < 0) return;
        
        if (countdown === 0) {
            // Countdown finished - just hide the message, don't exit
            setCountdown(null);
            return;
        }
        
        const timer = setTimeout(() => {
            setCountdown(countdown - 1);
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [countdown]);
    
    
    // Load folders from ConfigurationComponent
    const loadFolders = React.useCallback(async () => {
        try {
            const container = getContainer();
            const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
            const folders = await configComponent.getFolders();
            setCurrentFolders(folders);
        } catch (error) {
            console.error('Failed to load folders:', error);
            setCurrentFolders([]);
        }
    }, []);
    
    // Load folders on mount and when config changes
    React.useEffect(() => {
        loadFolders();
    }, [loadFolders, config]);
    
    // Handle model changes - save to configuration
    const handleModelChange = React.useCallback(async (folderPath: string, newModel: string) => {
        try {
            console.error(`Updating model for folder "${folderPath}" to "${newModel}"`);
            const container = getContainer();
            const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
            
            await configComponent.updateFolderModel(folderPath, newModel);
            console.error(`Model updated successfully for folder "${folderPath}"`);
            
            // Refresh the folders to show the updated model
            await loadFolders();
        } catch (error) {
            console.error(`Failed to update model for folder "${folderPath}":`, error);
        }
    }, [loadFolders]);
    const { columns, rows } = useTerminalSize();
    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    const { toggleAnimations, animationsPaused } = useAnimationContext();
    const navigation = useNavigationContext();
    
    // Navigation state connected to config items with active cursor management
    
    
    // Create config items from current folders or fall back to sample data
    const configItems = React.useMemo(() => {
        if (currentFolders && Array.isArray(currentFolders) && currentFolders.length > 0) {
            const items: IListItem[] = [];
            
            // Add each configured folder
            currentFolders.forEach((folder, index) => {
                // Validate folder exists and is accessible
                const folderPath = folder.path;
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
                
                // Create a FilePickerListItem for each folder
                const folderPicker = new FilePickerListItem(
                    folderIcon,
                    `Folder ${index + 1}: ${folderPath.split('/').pop() || folderPath}`,
                    folderPath,
                    false, // GenericListPanel will handle active state
                    'folder', // folder mode
                    (newPath) => {
                        // TODO: Handle folder path changes in main app
                        console.log(`User wants to change folder ${index + 1} to:`, newPath);
                        // This would need to update the config and trigger re-indexing
                    }
                );
                
                // Create SelectionListItem for this folder's model
                const supportedModels = [
                    'nomic-embed-text',
                    'mxbai-embed-large', 
                    'all-minilm',
                    'sentence-transformers',
                    'ollama:nomic-embed-text',
                    'ollama:mxbai-embed-large',
                    'ollama:all-minilm',
                    'transformers:all-MiniLM-L6-v2'
                ];
                
                const modelOptions = supportedModels.map(model => ({
                    value: model,
                    label: model === 'nomic-embed-text' ? `${model} (Recommended)` : model
                }));
                
                const currentModel = folder.model || 'nomic-embed-text';
                const modelConfig = new SelectionListItem(
                    '√',
                    `Model ${index + 1}`,
                    modelOptions,
                    [currentModel], // selectedValues as array
                    false, // GenericListPanel will handle active state
                    'radio', // mode
                    'vertical', // layout
                    (newValues) => {
                        if (newValues.length > 0 && folder.path && newValues[0]) {
                            // Handle model changes - save to configuration
                            handleModelChange(folder.path, newValues[0]);
                        }
                    }
                );
                
                items.push(folderPicker, modelConfig);
            });
            
            return items;
        } else {
            // Fallback to sample data when no config available
            const sampleItems = [...CONFIG_ITEMS]; // Clone to avoid mutations
            
            return sampleItems;
        }
    }, [currentFolders, handleModelChange]); // Use currentFolders instead of config
    
    // Use theme context - this component now requires a theme provider
    const themeContext = useTheme();
    
    
    // Set up root input handler
    useRootInput();
    
    // Register app-level input handler
    const handleAppInput = useCallback((input: string, key: Key): boolean => {
        // Handle Ctrl+A to toggle animations
        if (key.ctrl && input === 'a') {
            toggleAnimations();
            return true;
        }
        // Handle 'T' to cycle themes
        if ((input === 't' || input === 'T') && themeContext) {
            const themeNames = Object.keys(themes) as ThemeName[];
            const currentIndex = themeNames.indexOf(themeContext.themeName);
            const nextIndex = (currentIndex + 1) % themeNames.length;
            const nextTheme = themeNames[nextIndex];
            if (nextTheme) {
                themeContext.setTheme(nextTheme).catch(error => {
                    console.error('Failed to change theme:', error);
                });
            }
            return true;
        }
        // Handle 'esc' to quit - simple countdown safety mechanism
        if (key.escape) {
            if (countdown !== null) {
                // Second escape during countdown - exit immediately
                setCountdown(null);
                exit();
                return true;
            }
            
            // First escape - start countdown
            setCountdown(3);
            return true;
        }
        return false;
    }, [exit, toggleAnimations, themeContext, countdown]);
    
    // Use focus chain for app-level component
    useFocusChain({
        elementId: 'app',
        onInput: handleAppInput,
        keyBindings: isNodeInEditMode ? [] : [
            { key: 'Esc', description: 'Exit' },
            { key: 'Ctrl+A', description: animationsPaused ? 'Resume Animations' : 'Pause Animations' },
            { key: 'T', description: `Theme (${themeContext.themeName || 'auto'})` }
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
    
    
    // Create countdown status for Header
    const exitCountdownStatus = countdown !== null && countdown >= 0 ? `Press esc again to exit  ${countdown}..` : undefined;
    
    return (
        <Box flexDirection="column" height={rows} width={columns}>
            <Header themeName={themeContext.themeName} exitAnimationStatus={exitCountdownStatus} />
            
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
    const [currentFolders, setCurrentFolders] = useState<Array<{ path: string; model: string }>>([]);
    
    // Load folders for count calculation
    React.useEffect(() => {
        const loadFoldersForCount = async () => {
            try {
                const container = getContainer();
                const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
                const folders = await configComponent.getFolders();
                setCurrentFolders(folders);
            } catch (error) {
                console.error('Failed to load folders for count:', error);
                setCurrentFolders([]);
            }
        };
        loadFoldersForCount();
    }, [config]);
    
    // Calculate actual config item count dynamically
    const actualConfigItemCount = (() => {
        if (currentFolders && Array.isArray(currentFolders) && currentFolders.length > 0) {
            // Each folder contributes 2 items: folder picker + model selector
            return currentFolders.length * 2;
        } else {
            return CONFIG_ITEM_COUNT; // Fallback to sample data count
        }
    })();
    
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