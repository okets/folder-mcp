import React, { useCallback, useState, useContext, memo, useEffect, useMemo, useRef } from 'react';
import { Box, Text, useApp, Key, useInput } from 'ink';
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
import { theme } from './utils/theme';
import { IListItem } from './components/core/IListItem';
import { FilePickerListItem } from './components/core/FilePickerListItem';
import { ConfigurationListItem } from './components/core/ConfigurationListItem';
import { SelectionListItem } from './components/core/SelectionListItem';
import { ContainerListItem } from './components/core/ContainerListItem';
import { TextListItem } from './components/core/TextListItem';
import { SimpleButtonsRow } from './components/core/SimpleButtonsRow';
import { LogItem } from './components/core/LogItem';
import { existsSync, statSync } from 'fs';
import { useFMDM, useConfiguredFolders, useFMDMOperations, useFMDMConnection } from './contexts/FMDMContext';
import { createAddFolderWizard, AddFolderWizardResult } from './components/AddFolderWizard';
import { createManageFolderItem, ModelDownloadManagerInitializer } from './components/ManageFolderItem';
import { runAllCleanup } from './utils/cleanup';

// Get item counts once at module level to ensure consistency
// Memoize these to prevent recreation on every render
const STATUS_ITEMS = createStatusPanelItems();
const STATUS_ITEM_COUNT = STATUS_ITEMS.length;
const CONFIG_ITEMS = createConfigurationPanelItems();
const CONFIG_ITEM_COUNT = CONFIG_ITEMS.length;

interface AppContentInnerProps {
    config?: any;
}

const AppContentInner: React.FC<AppContentInnerProps> = memo(({ config }) => {
    // Main app now displays actual config from wizard
    
    const { exit } = useApp();
    
    // Check daemon connection first
    const fmdmConnection = useFMDMConnection();
    
    // State for showing Add Folder Wizard
    const [showAddFolderWizard, setShowAddFolderWizard] = useState(false);
    const [wizardCreationRequest, setWizardCreationRequest] = useState<'pending' | 'processing' | 'done' | null>(null);
    const [wizardInstance, setWizardInstance] = useState<any>(null);
    const [wizardLoading, setWizardLoading] = useState(false);
    
    // Navigation context for focus management - must be declared before usage
    const navigation = useNavigationContext();
    
    // Get current folders from FMDM context
    const currentFolders = useConfiguredFolders();
    const fmdmOperations = useFMDMOperations();
    // Create wizard asynchronously when needed
    useEffect(() => {
        const createWizard = async () => {
            if (!showAddFolderWizard) {
                setWizardInstance(null);
                return;
            }
            
            // Only process pending creation requests
            if (wizardCreationRequest === 'pending' && !wizardInstance) {
                try {
                    setWizardCreationRequest('processing');
                    setWizardLoading(true);
                    
                    const wizard = await createAddFolderWizard({
                        onComplete: async (result: AddFolderWizardResult) => {
                            try {
                                await fmdmOperations.addFolder(result.path, result.model);
                                // FMDM context will automatically update the folder list
                                setShowAddFolderWizard(false);
                                setWizardInstance(null); // Clear instance when done
                                setWizardCreationRequest(null); // Reset for next time
                            } catch (error) {
                                console.error('Failed to add folder:', error);
                            }
                        },
                        onCancel: () => {
                            setShowAddFolderWizard(false);
                            setWizardInstance(null); // Clear instance when cancelled
                            setWizardCreationRequest(null); // Reset for next time
                        },
                        fmdmOperations
                    });
                    
                    setWizardInstance(wizard);
                    
                    // Initialize in expanded mode and set focus
                    wizard.onEnter();
                    
                    // Set focus to the wizard position
                    const wizardIndex = currentFolders ? currentFolders.length : 0;
                    navigation.setMainSelectedIndex(wizardIndex);
                    
                    // Mark creation as done
                    setWizardCreationRequest('done');
                } catch (error) {
                    console.error('Failed to create wizard:', error);
                    setWizardCreationRequest(null); // Reset on error
                } finally {
                    setWizardLoading(false);
                }
            }
        };
        
        createWizard();
    }, [showAddFolderWizard, wizardCreationRequest, fmdmOperations, currentFolders, navigation]); // Dependencies updated
    
    // Create a robust exit function that works properly across platforms
    const robustExit = useCallback(async () => {
        try {
            // Run all cleanup handlers first (including WebSocket cleanup)
            await runAllCleanup();
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
        
        if (process.platform === 'win32') {
            // Windows-specific exit: restore terminal and force exit
            if (process.stdout.isTTY) {
                process.stdout.write('\x1b[?25h'); // Show cursor
                if (process.env.WT_SESSION || process.env.TERM_PROGRAM || process.env.VSCODE_PID) {
                    process.stdout.write('\x1b[?1049l'); // Switch back to main screen
                }
            }
            // Give a small delay for terminal cleanup after WebSocket cleanup, then force exit
            setTimeout(() => {
                process.exit(0);
            }, 100);
        } else {
            // macOS/Linux: use process.exit to avoid Ink exit hanging issues
            setTimeout(() => {
                process.exit(0);
            }, 50);
        }
    }, [exit]);
    
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
    
    
    // Folders are now automatically updated via FMDM context - no manual loading needed
    
    // Handle model changes - save via FMDM operations
    const handleModelChange = React.useCallback(async (folderPath: string, newModel: string) => {
        try {
            // Remove the old folder and re-add with new model
            await fmdmOperations.removeFolder(folderPath);
            await fmdmOperations.addFolder(folderPath, newModel);
            // FMDM context will automatically update with the new state
        } catch (error) {
            console.error('Failed to update folder model:', error);
        }
    }, [fmdmOperations]);
    
    // Create a stable reference to handleModelChange for useMemo
    const stableHandleModelChange = React.useRef(handleModelChange);
    stableHandleModelChange.current = handleModelChange;
    const { columns, rows } = useTerminalSize();
    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    const { toggleAnimations, animationsPaused } = useAnimationContext();
    
    // Navigation state connected to config items with active cursor management
    
    
    // Create config items from current folders or fall back to sample data
    // Memoize to prevent unnecessary recalculations
    const configItems = React.useMemo(() => {
        const items: IListItem[] = [];
        
        // Add configured folders first (main content)
        if (currentFolders && Array.isArray(currentFolders) && currentFolders.length > 0) {
            // Add each configured folder as ManageFolderItem
            currentFolders.forEach((folder, index) => {
                // Validate folder exists and is accessible
                const folderPath = folder.path;
                let folderValid = true;
                
                try {
                    if (!existsSync(folderPath)) {
                        folderValid = false;
                    } else {
                        const stat = statSync(folderPath);
                        if (!stat.isDirectory()) {
                            folderValid = false;
                        }
                    }
                } catch (error) {
                    folderValid = false;
                }
                
                // Create ManageFolderItem for each folder
                const manageFolderItem = createManageFolderItem({
                    folderPath,
                    model: folder.model || 'nomic-embed-text',
                    isValid: folderValid,
                    onRemove: async (pathToRemove: string) => {
                        try {
                            await fmdmOperations.removeFolder(pathToRemove);
                            // FMDM context will automatically update the folder list
                        } catch (error) {
                            console.error('Failed to remove folder:', error);
                        }
                    },
                    onError: (error: string) => {
                        console.error('Folder management error:', error);
                    }
                });
                
                items.push(manageFolderItem);
            });
        }
        
        // If showing wizard, add it after existing folders but before the button
        if (showAddFolderWizard) {
            if (wizardLoading) {
                // Show loading item while wizard is being created
                const loadingItem = new TextListItem(
                    '⏳',
                    'Loading wizard... (fetching models from daemon)',
                    false
                );
                items.push(loadingItem);
            } else if (wizardInstance) {
                items.push(wizardInstance);
            }
        }
        
        // Add "Add A Folder" button at the bottom (after all folders and wizard)
        const addFolderButton = new SimpleButtonsRow(
            '+',
            '',
            [{
                name: 'add-folder',
                borderColor: theme.colors.successGreen,
                text: '+ Add A Folder',
                eventValue: 'add-folder'
            }],
            false,
            (button) => {
                if (button.eventValue === 'add-folder') {
                    setShowAddFolderWizard(true);
                    setWizardCreationRequest('pending');
                }
            },
            'center'
        );
        
        items.push(addFolderButton);
        
        return items;
    }, [currentFolders, showAddFolderWizard, wizardInstance, wizardLoading, fmdmOperations]); // Updated dependencies
    
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
                themeContext.setTheme(nextTheme).catch(() => {
                    // Ignore theme change errors
                });
            }
            return true;
        }
        // Handle 'esc' to quit - simple countdown safety mechanism
        if (key.escape) {
            if (countdown !== null) {
                // Second escape during countdown - exit immediately
                setCountdown(null);
                robustExit().catch((error) => {
                    console.error('Error during exit:', error);
                    process.exit(1);
                });
                return true;
            }
            
            // First escape - start countdown
            setCountdown(3);
            return true;
        }
        return false;
    }, [robustExit, toggleAnimations, themeContext, countdown]);
    
    // Use focus chain for app-level component
    useFocusChain({
        elementId: 'app',
        onInput: handleAppInput,
        keyBindings: isNodeInEditMode ? [] : [
            { key: countdown !== null && countdown >= 0 ? `Esc(again ${countdown}…)` : 'Esc', description: 'Exit' },
            { key: 'Ctrl+A', description: animationsPaused ? 'Resume Animations' : 'Pause Animations' },
            { key: 'T', description: `Theme (${themeContext.themeName || 'auto'})` }
        ],
        priority: -100 // Low priority so active elements can override
    });
    
    // Add input handling that works for both error screen and normal app
    useInput((input, key) => {
        if (key.escape && (!fmdmConnection.connected && !fmdmConnection.connecting)) {
            // Only handle ESC on error screen, let normal app handle its own ESC
            robustExit().catch((error) => {
                console.error('Error during exit:', error);
                process.exit(1);
            });
        }
    });

    // Check if daemon is connected - if not, show error screen
    if (!fmdmConnection.connected && !fmdmConnection.connecting) {
        return (
            <Box flexDirection="column" height={rows} width={columns} justifyContent="center" alignItems="center">
                <Box flexDirection="column" alignItems="center" paddingY={2}>
                    <Text color="red" bold>⚠ folder-mcp service not running</Text>
                    <Text color="gray">The daemon is required for folder-mcp to function.</Text>
                    <Text color="gray">Please start the daemon and try again.</Text>
                    <Box marginTop={1}>
                        <Text color="yellow">Press </Text>
                        <Text color="yellow" bold>Esc</Text>
                        <Text color="yellow"> to exit</Text>
                    </Box>
                </Box>
            </Box>
        );
    }

    // Fixed height calculations (accounting for header margin)
    const isLowResolution = rows < 25;
    const HEADER_HEIGHT = isLowResolution ? 2 : 4; // Low res: 1 line + 1 margin, Normal: 3 lines + 1 margin
    const STATUS_BAR_HEIGHT = isLowResolution ? 1 : 3; // Low res: 1 line (no border), Normal: 3 lines (border + content + border)
    const availableHeight = rows - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
    
    return (
        <Box flexDirection="column" height={rows} width={columns}>
            <Header themeName={themeContext.themeName} />
            
            <LayoutContainer
                availableHeight={availableHeight}
                availableWidth={columns}
                narrowBreakpoint={100}
                isMainFocused={navigation.isMainFocused}
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
                    onInput={(input, key) => {
                        console.error(`\n=== AppFullscreen onInput ===`);
                        console.error(`Key: ${key.downArrow ? 'DOWN' : key.upArrow ? 'UP' : 'OTHER'}`);
                        console.error(`Current index: ${navigation.mainSelectedIndex}`);
                        console.error(`Current item type: ${configItems[navigation.mainSelectedIndex]?.constructor.name}`);
                        console.error(`Total items: ${configItems.length}`);
                        
                        // Check if current item is controlling input (expanded)
                        const currentItem = configItems[navigation.mainSelectedIndex];
                        if (currentItem?.isControllingInput) {
                            console.error(`Current item is controlling input - delegating`);
                            // Let the GenericListPanel delegate to the expanded item
                            return false;
                        }
                        
                        // Special handling for SimpleButtonsRow - when it delegates navigation,
                        // it has already exited control mode, so we need to handle re-selection
                        if (currentItem && 'onSelect' in currentItem && typeof currentItem.onSelect === 'function') {
                            // Ensure the item is properly selected after navigation from buttons
                            currentItem.isActive = true;
                            currentItem.onSelect();
                        }
                        
                        // Handle navigation with awareness of navigable items only for collapsed items
                        if (key.downArrow) {
                            const currentIndex = navigation.mainSelectedIndex;
                            // Find next navigable item
                            let nextIndex = currentIndex;
                            let found = false;
                            
                            // Try to find next navigable item
                            for (let i = currentIndex + 1; i < configItems.length; i++) {
                                const item = configItems[i];
                                if (item && item.isNavigable !== false) {
                                    nextIndex = i;
                                    found = true;
                                    break;
                                }
                            }
                            
                            // If not found, wrap to beginning and find first navigable
                            if (!found) {
                                for (let i = 0; i <= currentIndex; i++) {
                                    const item = configItems[i];
                                    if (item && item.isNavigable !== false) {
                                        nextIndex = i;
                                        break;
                                    }
                                }
                            }
                            
                            if (nextIndex !== currentIndex) {
                                console.error(`Navigating from index ${currentIndex} to ${nextIndex}`);
                                navigation.setMainSelectedIndex(nextIndex);
                                return true;
                            }
                            console.error(`No navigation - staying at index ${currentIndex}`);
                        } else if (key.upArrow) {
                            const currentIndex = navigation.mainSelectedIndex;
                            // Find previous navigable item
                            let prevIndex = currentIndex;
                            let found = false;
                            
                            // Try to find previous navigable item
                            for (let i = currentIndex - 1; i >= 0; i--) {
                                const item = configItems[i];
                                if (item && item.isNavigable !== false) {
                                    prevIndex = i;
                                    found = true;
                                    break;
                                }
                            }
                            
                            // If not found, wrap to end and find last navigable
                            if (!found) {
                                for (let i = configItems.length - 1; i >= currentIndex; i--) {
                                    const item = configItems[i];
                                    if (item && item.isNavigable !== false) {
                                        prevIndex = i;
                                        break;
                                    }
                                }
                            }
                            
                            if (prevIndex !== currentIndex) {
                                navigation.setMainSelectedIndex(prevIndex);
                                return true;
                            }
                        }
                        console.error(`=== End AppFullscreen onInput ===\n`);
                        return false; // Let other navigation handle it
                    }}
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
            
            <StatusBar countdown={countdown} />
        </Box>
    );
});

interface AppContentProps {
    config?: any;
}

const AppContent: React.FC<AppContentProps> = memo(({ config }) => {
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    
    return (
        <NavigationProvider isBlocked={isNodeInEditMode} configItemCount={20} statusItemCount={STATUS_ITEM_COUNT}>
            <AppContentInner config={config} />
        </NavigationProvider>
    );
});

interface AppFullscreenProps {
    config?: any;
}

export const AppFullscreen: React.FC<AppFullscreenProps> = ({ config }) => {
    return (
        <AnimationProvider>
            <ModelDownloadManagerInitializer />
            <AppContent config={config} />
        </AnimationProvider>
    );
};