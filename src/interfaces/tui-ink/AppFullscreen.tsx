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
import { getContainer } from '../../di/container';
import { CONFIG_SERVICE_TOKENS } from '../../config/di-setup';
import { ConfigurationComponent } from '../../config/ConfigurationComponent';
import { createAddFolderWizard, AddFolderWizardResult } from './components/AddFolderWizard';

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
    
    // State for showing Add Folder Wizard
    const [showAddFolderWizard, setShowAddFolderWizard] = useState(false);
    const [wizardJustAdded, setWizardJustAdded] = useState(false);
    
    // State to hold current folders from ConfigurationComponent
    const [currentFolders, setCurrentFolders] = useState<Array<{ path: string; model: string }>>([]);
    
    // Navigation context for focus management
    const navigation = useNavigationContext();
    
    // Move focus to wizard when it's just added
    useEffect(() => {
        if (wizardJustAdded && showAddFolderWizard) {
            console.error(`\n=== FOCUS MANAGEMENT: Moving focus to wizard ===`);
            // Set the main panel selection to the wizard position (after folders)
            const wizardIndex = currentFolders ? currentFolders.length : 0;
            navigation.setMainSelectedIndex(wizardIndex);
            setWizardJustAdded(false);
            console.error(`Focus moved to wizard at index ${wizardIndex}`);
            console.error(`=== END FOCUS MANAGEMENT ===\n`);
        }
    }, [wizardJustAdded, showAddFolderWizard, navigation, currentFolders]);
    
    // Create a robust exit function that works properly on Windows
    const robustExit = useCallback(() => {
        if (process.platform === 'win32') {
            // Windows-specific exit: restore terminal and force exit
            if (process.stdout.isTTY) {
                process.stdout.write('\x1b[?25h'); // Show cursor
                if (process.env.WT_SESSION || process.env.TERM_PROGRAM || process.env.VSCODE_PID) {
                    process.stdout.write('\x1b[?1049l'); // Switch back to main screen
                }
            }
            // Give a small delay for terminal cleanup, then force exit
            setTimeout(() => {
                process.exit(0);
            }, 50);
        } else {
            // macOS/Linux: use Ink's exit which works fine
            exit();
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
    
    
    // Load folders from ConfigurationComponent
    const loadFolders = React.useCallback(async () => {
        try {
            const container = getContainer();
            const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
            const folders = await configComponent.getFolders();
            setCurrentFolders(folders);
        } catch (error) {
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
            const container = getContainer();
            const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
            
            await configComponent.updateFolderModel(folderPath, newModel);
            
            // Refresh the folders to show the updated model
            await loadFolders();
        } catch (error) {
        }
    }, [loadFolders]);
    
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
            // Add each configured folder as LogItem
            currentFolders.forEach((folder, index) => {
                // Validate folder exists and is accessible
                const folderPath = folder.path;
                let folderIcon = '📁';
                let statusIcon = '✓';
                let folderValid = true;
                
                try {
                    if (!existsSync(folderPath)) {
                        statusIcon = '✗';
                        folderValid = false;
                    } else {
                        const stat = statSync(folderPath);
                        if (!stat.isDirectory()) {
                            statusIcon = '✗';
                            folderValid = false;
                        }
                    }
                } catch (error) {
                    statusIcon = '✗';
                    folderValid = false;
                }
                
                // Create LogItem for each folder
                const folderLog = new LogItem(
                    folderIcon,
                    folderPath,
                    statusIcon,
                    false, // Not active initially
                    false, // Not expanded initially
                    [`Model: ${folder.model || 'nomic-embed-text'}`] // Details when expanded
                );
                
                items.push(folderLog);
            });
        }
        
        // If showing wizard, add it after existing folders but before the button
        if (showAddFolderWizard) {
            console.error(`\n=== MAIN SCREEN: SHOWING ADD FOLDER WIZARD ===`);
            const wizard = createAddFolderWizard({
                onComplete: async (result: AddFolderWizardResult) => {
                    console.error(`\n=== WIZARD COMPLETE ===`);
                    console.error(`Path: ${result.path}`);
                    console.error(`Model: ${result.model}`);
                    try {
                        const container = getContainer();
                        const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
                        await configComponent.addFolder(result.path, result.model);
                        await loadFolders();
                        setShowAddFolderWizard(false);
                        console.error(`Folder added successfully!`);
                        console.error(`=== END WIZARD COMPLETE ===\n`);
                    } catch (error) {
                        console.error(`Error adding folder: ${error}`);
                    }
                },
                onCancel: () => {
                    console.error(`\n=== WIZARD CANCELLED ===\n`);
                    setShowAddFolderWizard(false);
                }
            });
            wizard.onEnter(); // Start in expanded mode
            items.push(wizard);
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
    }, [currentFolders, showAddFolderWizard, loadFolders]); // Add necessary dependencies
    
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
                robustExit();
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
                setCurrentFolders([]);
            }
        };
        loadFoldersForCount();
    }, [config]);
    
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
            <AppContent config={config} />
        </AnimationProvider>
    );
};