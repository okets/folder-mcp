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
    const [wizardJustAdded, setWizardJustAdded] = useState(false);
    
    // Get current folders from FMDM context
    const currentFolders = useConfiguredFolders();
    const fmdmOperations = useFMDMOperations();
    
    // Memoize the AddFolderWizard instance to prevent recreation on every render
    // This preserves the wizard's internal state (like expansion state) across re-renders
    const wizardInstance = useRef<any>(null);
    const memoizedWizard = useMemo(() => {
        if (showAddFolderWizard) {
            // Only create new wizard if one doesn't exist or wizard was just added
            if (!wizardInstance.current || wizardJustAdded) {
                wizardInstance.current = createAddFolderWizard({
                    onComplete: async (result: AddFolderWizardResult) => {
                        try {
                            await fmdmOperations.addFolder(result.path, result.model);
                            // FMDM context will automatically update the folder list
                            setShowAddFolderWizard(false);
                            wizardInstance.current = null; // Clear instance when done
                        } catch (error) {
                            console.error('Failed to add folder:', error);
                        }
                    },
                    onCancel: () => {
                        setShowAddFolderWizard(false);
                        wizardInstance.current = null; // Clear instance when cancelled
                    },
                    fmdmOperations
                });
                
                // Initialize in expanded mode only when first created
                if (wizardJustAdded) {
                    wizardInstance.current.onEnter();
                }
            }
            return wizardInstance.current;
        } else {
            // Clear wizard when not showing
            wizardInstance.current = null;
            return null;
        }
    }, [showAddFolderWizard, wizardJustAdded, fmdmOperations]);
    
    // Navigation context for focus management
    const navigation = useNavigationContext();
    
    // Move focus to wizard when it's just added
    useEffect(() => {
        if (wizardJustAdded && showAddFolderWizard) {
            // Set the main panel selection to the wizard position (after folders)
            const wizardIndex = currentFolders ? currentFolders.length : 0;
            navigation.setMainSelectedIndex(wizardIndex);
            setWizardJustAdded(false);
        }
    }, [wizardJustAdded, showAddFolderWizard, navigation, currentFolders]);
    
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
        if (showAddFolderWizard && memoizedWizard) {
            items.push(memoizedWizard);
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
                    setWizardJustAdded(true);
                }
            },
            'center'
        );
        
        items.push(addFolderButton);
        
        return items;
    }, [currentFolders, showAddFolderWizard, memoizedWizard, fmdmOperations]); // Updated dependencies
    
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
                        return false; // Let navigation handle it
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
    
    // Get folders from FMDM context for count calculation
    const currentFolders = useConfiguredFolders();
    
    // Calculate actual config item count dynamically
    const actualConfigItemCount = (() => {
        if (currentFolders && Array.isArray(currentFolders) && currentFolders.length > 0) {
            // Each folder contributes 2 items: folder picker + model selector
            // Plus 1 for the "Add Folder Wizard" at the top
            const count = 1 + (currentFolders.length * 2);
            
            
            return count;
        } else {
            const count = CONFIG_ITEM_COUNT; // Fallback to sample data count
            
            
            return count;
        }
    })();
    
    return (
        <NavigationProvider isBlocked={isNodeInEditMode} configItemCount={actualConfigItemCount} statusItemCount={STATUS_ITEM_COUNT}>
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