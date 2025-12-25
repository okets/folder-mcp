import React, { useCallback, useState, useContext, memo, useEffect, useMemo, useRef } from 'react';
import { Box, Text, useApp, Key, useInput } from 'ink';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { LayoutContainer } from './components/LayoutContainer';
import { GenericListPanel } from './components/GenericListPanel';
import { NavigationPanel } from './components/NavigationPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { ConnectPanel, ConnectPanelExternalState, PopupState } from './components/ConnectPanel';
import { useNavigationContext } from './contexts/NavigationContext';
import { useTerminalSize } from './hooks/useTerminalSize';
import { useRootInput, useFocusChain } from './hooks/useFocusChain';
import { useDI } from './di/DIContext';
import { ServiceTokens } from './di/tokens';
import { NavigationProvider } from './contexts/NavigationContext';
import { AnimationProvider, useAnimationContext } from './contexts/AnimationContext';
import { createStatusPanelItems, createConfigurationPanelItems } from './models/mixedSampleData';
import { useTheme } from './contexts/ThemeContext';
import { getCurrentTheme } from './utils/theme';
import { IListItem } from './components/core/IListItem';
import { FilePickerListItem } from './components/core/FilePickerListItem';
import { ConfigurationListItem } from './components/core/ConfigurationListItem';
import { SelectionListItem } from './components/core/SelectionListItem';
import { ContainerListItem } from './components/core/ContainerListItem';
import { TextListItem } from './components/core/TextListItem';
import { SimpleButtonsRow } from './components/core/SimpleButtonsRow';
import { LogItem } from './components/core/LogItem';
import { existsSync, statSync } from 'fs';
import { useFMDM, useConfiguredFolders, useFMDMFolderOperations, useFMDMConnection } from './contexts/FMDMContext';
import { createAddFolderWizard, AddFolderWizardResult } from './components/AddFolderWizard';
import { createManageFolderItem, ModelDownloadManagerInitializer } from './components/ManageFolderItem';
import { runAllCleanup } from './utils/cleanup';
import { getDefaultModelId } from '../../config/model-registry';
import { FolderIndexingStatus } from '../../daemon/models/fmdm';
import { createValidationResult, ValidationState } from './components/core/ValidationState';
import { spawn } from 'child_process';
import { join } from 'path';
import { MINIMUM_TERMINAL_WIDTH } from './utils/terminalConstraints';

/**
 * Maps folder indexing status to appropriate display color
 * active = green, error = red, everything else = orange
 */
function getStatusColor(status?: FolderIndexingStatus): string {
    const theme = getCurrentTheme();
    switch (status) {
        case 'active':
            return theme.colors.successGreen;
        case 'error':
            return theme.colors.dangerRed;
        default:
            return theme.colors.warningOrange; // All other statuses use orange
    }
}

// Get item counts once at module level to ensure consistency
// Memoize these to prevent recreation on every render
const STATUS_ITEMS = createStatusPanelItems();
const STATUS_ITEM_COUNT = STATUS_ITEMS.length;
const CONFIG_ITEMS = createConfigurationPanelItems();
const CONFIG_ITEM_COUNT = CONFIG_ITEMS.length;

/**
 * Factory function to create navigation input handlers with consistent behavior
 * Eliminates code duplication between main and status panel handlers (DRY principle)
 *
 * @param items - Array of list items to navigate
 * @param getSelectedIndex - Function to get current selected index
 * @param setSelectedIndex - Function to set selected index
 * @param isLandscape - Whether in landscape orientation
 * @param switchToNavigation - Function to switch back to navigation panel
 * @returns Input handler function
 */
const createNavigationInputHandler = (
    items: IListItem[],
    getSelectedIndex: () => number,
    setSelectedIndex: (index: number) => void,
    isLandscape: boolean,
    switchToNavigation: () => void
) => {
    return (input: string, key: Key): boolean => {
        // Check if current item is controlling input (expanded)
        const currentItem = items[getSelectedIndex()];

        if (currentItem?.isControllingInput) {
            // Let the GenericListPanel delegate to the expanded item
            return false;
        }

        // Landscape mode: Left arrow switches back to navigation panel (spatial navigation)
        if (key.leftArrow && isLandscape) {
            switchToNavigation();
            return true;
        }

        // Handle navigation with awareness of navigable items only for collapsed items
        if (key.downArrow) {
            const currentIndex = getSelectedIndex();
            // Find next navigable item
            let nextIndex = currentIndex;
            let found = false;

            // Try to find next navigable item
            for (let i = currentIndex + 1; i < items.length; i++) {
                const item = items[i];
                if (item && item.isNavigable !== false) {
                    nextIndex = i;
                    found = true;
                    break;
                }
            }

            // If not found, wrap to beginning and find first navigable
            if (!found) {
                for (let i = 0; i <= currentIndex; i++) {
                    const item = items[i];
                    if (item && item.isNavigable !== false) {
                        nextIndex = i;
                        break;
                    }
                }
            }

            if (nextIndex !== currentIndex) {
                setSelectedIndex(nextIndex);
                return true;
            }
        } else if (key.upArrow) {
            const currentIndex = getSelectedIndex();

            // Find previous navigable item
            let prevIndex = currentIndex;
            let found = false;

            // Try to find previous navigable item
            for (let i = currentIndex - 1; i >= 0; i--) {
                const item = items[i];
                if (item && item.isNavigable !== false) {
                    prevIndex = i;
                    found = true;
                    break;
                }
            }

            // Portrait mode: If no previous navigable item found, switch to navigation panel
            if (!isLandscape && !found) {
                switchToNavigation();
                return true;
            }

            // Landscape mode: If not found, wrap to end and find last navigable
            if (!found) {
                for (let i = items.length - 1; i >= currentIndex; i--) {
                    const item = items[i];
                    if (item && item.isNavigable !== false) {
                        prevIndex = i;
                        break;
                    }
                }
            }

            if (prevIndex !== currentIndex) {
                setSelectedIndex(prevIndex);
                return true;
            }
        }
        return false; // Let other navigation handle it
    };
};

interface AppContentInnerProps {
    config?: any;
    onConfigItemsCountChange?: (count: number) => void;
    onConfigItemsChange?: (items: IListItem[]) => void;  // Pass actual items to parent
}

const AppContentInner: React.FC<AppContentInnerProps> = memo(({ config, onConfigItemsCountChange, onConfigItemsChange }) => {
    // Main app now displays actual config from wizard
    
    const { exit } = useApp();
    
    // Check daemon connection first
    const fmdmConnection = useFMDMConnection();
    const { fmdm, retryNow } = useFMDM();

    // Get default model from FMDM for Add Folder Wizard
    const defaultModel = fmdm?.defaultModel?.modelId;
    
    // State for showing Add Folder Wizard
    const [showAddFolderWizard, setShowAddFolderWizard] = useState(false);
    const [wizardCreationRequest, setWizardCreationRequest] = useState<'pending' | 'processing' | 'done' | null>(null);
    const [wizardInstance, setWizardInstance] = useState<any>(null);
    const [wizardLoading, setWizardLoading] = useState(false);
    
    // State to preserve folder expansion and child selection during terminal resizes and re-renders
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [folderChildState, setFolderChildState] = useState<Map<string, { selectedIndex: number; childExpanded?: boolean; childInternalCursor?: number }>>(new Map());
    
    // State to track when we're intentionally exiting to prevent daemon error screen
    const [isExiting, setIsExiting] = useState<boolean>(false);

    // ConnectPanel external state - survives component remounts during resize
    const connectPanelSelectedIndexRef = useRef(1); // Start at index 1 (first navigable client)
    const connectPanelPopupStateRef = useRef<PopupState>({
        visible: false,
        clientId: null,
        configJson: '',
    });
    const connectPanelItemsRef = useRef<IListItem[] | null>(null);
    const connectPanelExternalState: ConnectPanelExternalState = useMemo(() => ({
        selectedIndexRef: connectPanelSelectedIndexRef,
        popupStateRef: connectPanelPopupStateRef,
        itemsRef: connectPanelItemsRef,
    }), []);

    // Navigation context for focus management - must be declared before usage
    const navigation = useNavigationContext();

    // Get current folders from FMDM context
    const currentFolders = useConfiguredFolders();
    const fmdmOperations = useFMDMFolderOperations();
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
                        // Pass default model from FMDM (conditional spread for exactOptionalPropertyTypes)
                        ...(defaultModel && { defaultModel }),
                        onComplete: async (result: AddFolderWizardResult) => {
                            try {
                                await fmdmOperations.addFolder(result.path, result.model);
                                // FMDM context will automatically update the folder list
                                setShowAddFolderWizard(false);
                                setWizardInstance(null); // Clear instance when done
                                setWizardCreationRequest(null); // Reset for next time
                            } catch {
                                // Errors handled through Activity Log, not console
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
                } catch {
                    // Errors handled through Activity Log, not console
                    setWizardCreationRequest(null); // Reset on error
                } finally {
                    setWizardLoading(false);
                }
            }
        };
        
        createWizard();
    }, [showAddFolderWizard, wizardCreationRequest, fmdmOperations, currentFolders, navigation, defaultModel]); // Dependencies updated
    
    // Create a robust exit function that works properly across platforms
    const robustExit = useCallback(async () => {
        try {
            // Set exiting flag to prevent daemon error screen from showing during cleanup
            setIsExiting(true);
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
    
    // Daemon startup function
    const startDaemon = useCallback(async () => {
        try {
            // Find the daemon executable path relative to the current working directory
            const daemonPath = join(process.cwd(), 'dist', 'src', 'daemon', 'index.js');
            
            if (!existsSync(daemonPath)) {
                console.error('Daemon executable not found at:', daemonPath);
                console.error('Please run "npm run build" first');
                return;
            }
            
            // Spawn daemon process in background
            const daemonProcess = spawn('node', [daemonPath], {
                detached: true,
                stdio: 'ignore'
            });
            
            // Unref so TUI doesn't wait for daemon process
            daemonProcess.unref();
            
            console.error('Starting daemon...');
            
            // Give daemon a moment to start before trying to reconnect
            setTimeout(() => {
                // Trigger immediate retry after daemon starts
                retryNow();
                console.error('Daemon startup initiated, attempting connection');
            }, 1000);
            
        } catch (error) {
            console.error('Failed to start daemon:', error);
        }
    }, [retryNow]);
    
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
        } catch {
            // Errors handled through Activity Log, not console
        }
    }, [fmdmOperations]);
    
    // Create a stable reference to handleModelChange for useMemo
    const stableHandleModelChange = React.useRef(handleModelChange);
    stableHandleModelChange.current = handleModelChange;
    const { columns: rawColumns, rows, isResizing } = useTerminalSize();
    // Protect against narrow terminals that cause Yoga layout engine to freeze
    // Yoga doesn't handle automatic minimum sizes well, and text wrapping in narrow
    // spaces can cause infinite loops in layout calculations
    const columns = Math.max(rawColumns, MINIMUM_TERMINAL_WIDTH);

    const di = useDI();
    const focusChainService = di.resolve(ServiceTokens.FocusChainService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    const { toggleAnimations, animationsPaused } = useAnimationContext();
    
    // Navigation state connected to config items with active cursor management
    
    
    // Create config items from current folders or fall back to sample data
    // Memoize to prevent unnecessary recalculations
    const configItems = React.useMemo(() => {
        const theme = getCurrentTheme();
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
                
                // Create validation state for notifications
                let validationState: ValidationState | undefined = undefined;
                if (folder.notification) {
                    // Use the notification system
                    const errorMessage = folder.notification.type === 'error' ? folder.notification.message : undefined;
                    const warningMessage = folder.notification.type === 'warning' ? folder.notification.message : undefined;
                    
                    validationState = {
                        result: createValidationResult(
                            folder.notification.type !== 'error', // valid if not error
                            errorMessage,
                            warningMessage
                        ),
                        notification: folder.notification // Pass notification for formatFolderWithStatus
                    };
                }
                
                // Create ManageFolderItem for each folder
                const manageFolderItem = createManageFolderItem({
                    folderPath,
                    model: (() => {
                        if (folder.model && folder.model !== 'unknown') {
                            return folder.model;
                        }
                        // Use fallback to prevent UI crash (no console.error to avoid TUI flickering)
                        return getDefaultModelId(); // Fallback to default model
                    })(),
                    isValid: folderValid,
                    folderStatus: (() => {
                        if (folder.status === 'indexing' && folder.progress !== undefined) {
                            return `indexing (${folder.progress}%)`;
                        } else if (folder.status === 'downloading-model' && folder.downloadProgress !== undefined) {
                            return `downloading-model (${folder.downloadProgress}%)`;
                        }
                        return folder.status || 'pending';
                    })(), // Include progress for both indexing and downloading-model statuses
                    statusColor: getStatusColor(folder.status), // Map status to appropriate color
                    validationState, // Pass the validation state for error/warning display
                    onRemove: async (pathToRemove: string) => {
                        try {
                            await fmdmOperations.removeFolder(pathToRemove);
                            // FMDM context will automatically update the folder list
                        } catch {
                            // Errors handled through Activity Log, not console
                        }
                    },
                    onError: () => {
                        // Errors handled through Activity Log, not console
                    }
                });
                
                // Note: We don't call updateValidation here because the error is already
                // handled by passing validationState to createManageFolderItem, which:
                // - Shows it in collapsed mode via formatFolderWithStatus
                // - Shows it as a child item in expanded mode
                
                // Restore expansion state if this folder was previously expanded
                if (expandedFolders.has(folderPath)) {
                    const childState = folderChildState.get(folderPath);

                    // SYNCHRONOUS state restoration (no setTimeout)
                    if (childState) {
                        // STEP 1: Restore child's internal cursor BEFORE expanding
                        if (childState.childExpanded &&
                            childState.childInternalCursor !== undefined &&
                            childState.selectedIndex < manageFolderItem.childItems.length) {

                            // Use public API to restore child item's internal cursor
                            manageFolderItem.restoreChildCursor(
                                childState.selectedIndex,
                                childState.childInternalCursor
                            );
                        }

                        // STEP 2: Expand parent folder
                        manageFolderItem.onEnter();

                        // STEP 3: Restore child selection index using public API
                        manageFolderItem.restoreChildSelection(childState.selectedIndex);

                        // STEP 4: Expand child if it was expanded
                        if (childState.childExpanded && childState.selectedIndex < manageFolderItem.childItems.length) {
                            const childItem = manageFolderItem.childItems[childState.selectedIndex];
                            if (childItem && 'onEnter' in childItem && typeof childItem.onEnter === 'function') {
                                childItem.onEnter();
                            }
                        }
                    } else {
                        // No child state, just expand the folder
                        manageFolderItem.onEnter();
                    }
                }
                
                // Override the onEnter and onExit methods to track expansion state
                const originalOnEnter = manageFolderItem.onEnter.bind(manageFolderItem);
                const originalOnExit = manageFolderItem.onExit.bind(manageFolderItem);
                
                manageFolderItem.onEnter = () => {
                    originalOnEnter();
                    setExpandedFolders(prev => new Set(prev).add(folderPath));
                };
                
                manageFolderItem.onExit = () => {
                    // Save current child selection state before exiting
                    if (manageFolderItem.isControllingInput) {
                        const selectedIndex = manageFolderItem.selectedChildIndex || 0;
                        const selectedChild = manageFolderItem.childItems[selectedIndex];
                        const childExpanded = selectedChild && selectedChild.isControllingInput;
                        
                        setFolderChildState(prev => {
                            const newMap = new Map(prev);
                            const stateUpdate: { selectedIndex: number; childExpanded?: boolean } = { selectedIndex };
                            if (childExpanded) {
                                stateUpdate.childExpanded = true;
                            }
                            newMap.set(folderPath, stateUpdate);
                            return newMap;
                        });
                    }
                    
                    originalOnExit();
                    setExpandedFolders(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(folderPath);
                        return newSet;
                    });
                };
                
                // Override navigation methods to track child state changes
                const originalHandleInput = manageFolderItem.handleInput.bind(manageFolderItem);
                manageFolderItem.handleInput = (input: string, key: any) => {
                    const wasChildExpanded = manageFolderItem.childItems.some(child =>
                        child.isControllingInput || ('isExpanded' in child && (child as any).isExpanded)
                    );
                    const oldSelectedIndex = manageFolderItem.selectedChildIndex || 0;

                    const result = originalHandleInput(input, key);

                    // If navigation changed, update stored state
                    const newSelectedIndex = manageFolderItem.selectedChildIndex || 0;
                    const isChildExpanded = manageFolderItem.childItems.some(child =>
                        child.isControllingInput || ('isExpanded' in child && (child as any).isExpanded)
                    );
                    
                    if (manageFolderItem.isControllingInput && (oldSelectedIndex !== newSelectedIndex || wasChildExpanded !== isChildExpanded)) {
                        setFolderChildState(prev => {
                            const newMap = new Map(prev);
                            const stateUpdate: { selectedIndex: number; childExpanded?: boolean; childInternalCursor?: number } = { selectedIndex: newSelectedIndex };
                            if (isChildExpanded) {
                                stateUpdate.childExpanded = true;

                                // Capture child's internal cursor position
                                const expandedChild = manageFolderItem.childItems[newSelectedIndex];
                                if (expandedChild && 'selectedChildIndex' in expandedChild) {
                                    stateUpdate.childInternalCursor = (expandedChild as any).selectedChildIndex;
                                }
                            }
                            newMap.set(folderPath, stateUpdate);
                            return newMap;
                        });
                    }
                    
                    return result;
                };
                
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
    }, [
        // Stable dependencies for folder items - include progress and notification message for real-time updates
        JSON.stringify(currentFolders?.map(f => {
            const deps = {
                path: f.path,
                model: f.model,
                hasError: f.notification?.type === 'error',
                errorMessage: f.notification?.type === 'error' ? f.notification.message : undefined,
                hasWarning: f.notification?.type === 'warning', 
                warningMessage: f.notification?.type === 'warning' ? f.notification.message : undefined,
                status: f.status,
                progress: f.progress, // Include progress to enable real-time progress updates
                infoMessage: f.notification?.type === 'info' ? f.notification.message : undefined // Include info notification for progress messages
            };
            return deps;
        }) || []),
        showAddFolderWizard,
        wizardInstance,
        wizardLoading,
        fmdmOperations
    ]);
    
    // Use theme context - this component now requires a theme provider
    const themeContext = useTheme();
    
    // Report the actual count of config items to parent
    useEffect(() => {
        if (onConfigItemsCountChange) {
            onConfigItemsCountChange(configItems.length);
        }
        if (onConfigItemsChange) {
            onConfigItemsChange(configItems);  // Pass actual items for navigation
        }
    }, [configItems, onConfigItemsCountChange, onConfigItemsChange]);
    
    // Set up root input handler
    useRootInput();
    
    // Register app-level input handler
    const handleAppInput = useCallback((input: string, key: Key): boolean => {
        // Handle Ctrl+A to toggle animations
        if (key.ctrl && input === 'a') {
            toggleAnimations();
            return true;
        }
        // Handle 'esc' to quit - simple countdown safety mechanism
        // Skip if popup is visible (ESC closes popup, not app)
        if (key.escape) {
            // Don't count this ESC toward exit if a popup is open
            // The popup will handle its own close
            if (connectPanelPopupStateRef.current.visible) {
                // Reset countdown since user is interacting with popup, not trying to exit
                if (countdown !== null) {
                    setCountdown(null);
                }
                return false; // Let popup handle it
            }

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
    }, [robustExit, toggleAnimations, countdown]);
    
    // Use focus chain for app-level component
    useFocusChain({
        elementId: 'app',
        onInput: handleAppInput,
        keyBindings: isNodeInEditMode ? [] : [
            { key: countdown !== null && countdown >= 0 ? `Esc(again ${countdown}…)` : 'Esc', description: 'Exit' },
            { key: 'Ctrl+A', description: animationsPaused ? 'Resume Animations' : 'Pause Animations' }
        ],
        priority: -100 // Low priority so active elements can override
    });
    
    // Add input handling that works for both error screen and normal app
    useInput((input, key) => {
        if (!fmdmConnection.connected && !fmdmConnection.connecting && !isExiting) {
            // Only handle keys on error screen
            if (key.escape) {
                robustExit().catch((error) => {
                    console.error('Error during exit:', error);
                    process.exit(1);
                });
            } else if (key.return) {
                // Start daemon when user presses enter
                startDaemon().catch((error) => {
                    console.error('Error starting daemon:', error);
                });
            }
        }
    });

    // Show resizing overlay during debounce period to prevent text overflow visibility
    if (isResizing) {
        return (
            <Box flexDirection="column" height={rows} width={columns}>
                <Box height={1} />
                <Text color="blue" bold>⟳ Resizing...</Text>
            </Box>
        );
    }

    // Check if daemon is connected - if not, show error screen (unless we're intentionally exiting)
    if (!fmdmConnection.connected && !fmdmConnection.connecting && !isExiting) {
        // Apply same height approach to error screen for consistency
        const effectiveRows = rows;
        
        return (
            <Box flexDirection="column" height={effectiveRows} width={columns} justifyContent="center" alignItems="center">
                <Box flexDirection="column" alignItems="center" paddingY={2}>
                    <Text color="red" bold>⚠ folder-mcp service not running</Text>
                    <Text color="gray">The daemon is required for folder-mcp to function.</Text>
                    <Text color="gray">Please start the daemon and try again.</Text>
                    
                    {/* Show retry information if available */}
                    {fmdmConnection.retryAttempt && (
                        <Box marginTop={1} flexDirection="column" alignItems="center">
                            <Text color="cyan">
                                Attempt {fmdmConnection.retryAttempt} - {fmdmConnection.nextRetryIn ? `Next retry in ${fmdmConnection.nextRetryIn}s` : 'Retrying...'}
                            </Text>
                        </Box>
                    )}
                    
                    <Box marginTop={1} flexDirection="column" alignItems="center">
                        <Box>
                            <Text color="yellow">Press </Text>
                            <Text color="yellow" bold>enter</Text>
                            <Text color="yellow"> to start the service</Text>
                        </Box>
                        <Box>
                            <Text color="yellow">Press </Text>
                            <Text color="yellow" bold>esc</Text>
                            <Text color="yellow"> to exit</Text>
                        </Box>
                    </Box>
                </Box>
            </Box>
        );
    }

    // Fixed height calculations (accounting for header margin)
    const isLowResolution = rows < 25;
    const HEADER_HEIGHT = isLowResolution ? 2 : 4; // Low res: 1 line + 1 margin, Normal: 3 lines + 1 margin
    const STATUS_BAR_HEIGHT = isLowResolution ? 1 : 3; // Low res: 1 line (no border), Normal: 3 lines (border + content + border)
    const NAV_PANEL_HEIGHT = 3; // Always 3 rows with borders in portrait mode (never drop to 1)

    // Windows needs rows-1 to prevent jittering on large terminals
    // Other platforms can use full rows with proper cursor positioning
    const isWindows = process.platform === 'win32';
    const effectiveRows = isWindows ? rows - 1 : rows;

    // Panel width constraints based on actual content requirements
    const NAV_PANEL_WIDTH_FIXED = 22; // 22 chars for "○ Connect Clients" + padding + borders
    const MAIN_PANEL_MIN_WIDTH = 80; // Minimum usable width for main content

    // Content-based orientation detection: switch to landscape only when we have space for both panels
    const minWidthForLandscape = NAV_PANEL_WIDTH_FIXED + MAIN_PANEL_MIN_WIDTH + 2; // +2 for margins
    const isLandscape = columns >= minWidthForLandscape;
    const NAV_PANEL_WIDTH = isLandscape ? NAV_PANEL_WIDTH_FIXED : 0;

    // Calculate available dimensions for content area
    const contentAvailableHeight = isLandscape
        ? effectiveRows - HEADER_HEIGHT - STATUS_BAR_HEIGHT
        : effectiveRows - HEADER_HEIGHT - STATUS_BAR_HEIGHT - NAV_PANEL_HEIGHT;
    const contentAvailableWidth = isLandscape ? columns - NAV_PANEL_WIDTH : columns;

    return (
        <Box flexDirection="column" height={effectiveRows} width={columns}>
            <Header themeName={themeContext.themeName} />

            {/* Navigation Panel - Portrait Mode (top) */}
            {!isLandscape && (
                <NavigationPanel
                    width={columns}
                    height={NAV_PANEL_HEIGHT}
                    isFocused={navigation.isNavigationFocused}
                    orientation="portrait"
                    selectedIndex={navigation.navigationSelectedIndex}
                    mainPanelItems={configItems}
                    statusPanelItems={STATUS_ITEMS}
                />
            )}

            {/* Main Content Area */}
            <Box flexDirection="row" width={columns} height={contentAvailableHeight}>
                {/* Navigation Panel - Landscape Mode (left) */}
                {isLandscape && (
                    <NavigationPanel
                        width={NAV_PANEL_WIDTH}
                        height={contentAvailableHeight}
                        isFocused={navigation.isNavigationFocused}
                        orientation="landscape"
                        selectedIndex={navigation.navigationSelectedIndex}
                        mainPanelItems={configItems}
                        statusPanelItems={STATUS_ITEMS}
                    />
                )}

                {/* Content Panel - Conditionally render based on navigation selection */}
                <Box width={contentAvailableWidth} height={contentAvailableHeight}>
                    {navigation.navigationSelectedIndex === 0 ? (
                        // Manage Folders Panel (index 0)
                        <GenericListPanel
                            key="manage-folders-panel"
                            title="Manage Folders"
                            subtitle="Configuration"
                            items={configItems}
                            selectedIndex={navigation.mainSelectedIndex}
                            isFocused={navigation.isMainFocused}
                            width={contentAvailableWidth}
                            height={contentAvailableHeight}
                            elementId="main-panel"
                            parentId="navigation"
                            priority={50}
                            customKeyBindings={isLandscape
                                ? [
                                    { key: '↑↓', description: 'Navigate' },
                                    { key: 'tab/←', description: 'Switch Panel' }
                                  ]
                                : [
                                    { key: '↑↓', description: 'Navigate' },
                                    { key: 'tab/↑', description: 'Switch Panel' }
                                  ]
                            }
                            onInput={createNavigationInputHandler(
                                configItems,
                                () => navigation.mainSelectedIndex,
                                navigation.setMainSelectedIndex,
                                isLandscape,
                                navigation.switchToNavigation
                            )}
                    />
                    ) : navigation.navigationSelectedIndex === 1 ? (
                        // Connect Panel (index 1)
                        <ConnectPanel
                            key="connect-panel"
                            width={contentAvailableWidth}
                            height={contentAvailableHeight}
                            isFocused={navigation.isMainFocused}
                            isLandscape={isLandscape}
                            onSwitchToNavigation={navigation.switchToNavigation}
                            externalState={connectPanelExternalState}
                        />
                    ) : navigation.navigationSelectedIndex === 2 ? (
                        // Activity Log Panel (index 2)
                        // Key ensures state persists across layout changes (portrait ↔ landscape)
                        <ActivityLogPanel
                            key="activity-log-panel"
                            width={contentAvailableWidth}
                            height={contentAvailableHeight}
                            isFocused={navigation.isMainFocused}
                            isLandscape={isLandscape}
                            onSwitchToNavigation={navigation.switchToNavigation}
                        />
                    ) : navigation.navigationSelectedIndex === 3 ? (
                        // Settings Panel (index 3)
                        <SettingsPanel
                            key="settings-panel"
                            width={contentAvailableWidth}
                            height={contentAvailableHeight}
                            isFocused={navigation.isMainFocused}
                            isLandscape={isLandscape}
                            onSwitchToNavigation={navigation.switchToNavigation}
                        />
                    ) : (
                        // Demo Controls Panel (index 4)
                        <GenericListPanel
                            key="demo-controls-panel"
                            title="Demo Controls"
                            subtitle="Component Testing"
                            items={STATUS_ITEMS}
                            selectedIndex={navigation.statusSelectedIndex}
                            isFocused={navigation.isMainFocused}
                            width={contentAvailableWidth}
                            height={contentAvailableHeight}
                            elementId="status-panel"
                            parentId="navigation"
                            priority={50}
                            customKeyBindings={isLandscape
                                ? [
                                    { key: '↑↓', description: 'Navigate' },
                                    { key: 'tab/←', description: 'Switch Panel' }
                                  ]
                                : [
                                    { key: '↑↓', description: 'Navigate' },
                                    { key: 'tab/↑', description: 'Switch Panel' }
                                  ]
                            }
                            onInput={createNavigationInputHandler(
                                STATUS_ITEMS,
                                () => navigation.statusSelectedIndex,
                                navigation.setStatusSelectedIndex,
                                isLandscape,
                                navigation.switchToNavigation
                            )}
                        />
                    )}
                </Box>
            </Box>

            <StatusBar countdown={countdown} />
        </Box>
    );
});

interface AppContentProps {
    config?: any;
}

const AppContent: React.FC<AppContentProps> = memo(({ config }) => {
    const [isNodeInEditMode, setIsNodeInEditMode] = useState(false);
    const [configItemCount, setConfigItemCount] = useState(1); // Start with 1 for at least the button
    const [configItems, setConfigItems] = useState<IListItem[]>([]);  // Store actual items for navigation

    return (
        <NavigationProvider
            isBlocked={isNodeInEditMode}
            navigationItemCount={5}           // Manage Folders, Connect, Activity Log, Settings, Demo Controls
            configItemCount={configItemCount}
            statusItemCount={STATUS_ITEM_COUNT}
            mainPanelItems={configItems}      // Pass items for first navigable detection
            statusPanelItems={STATUS_ITEMS}   // Pass status items for first navigable detection
        >
            <AppContentInner
                config={config}
                onConfigItemsCountChange={setConfigItemCount}
                onConfigItemsChange={setConfigItems}  // Receive items from child
            />
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