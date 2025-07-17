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
import { existsSync, statSync } from 'fs';
import { getContainer } from '../../di/container';
import { CONFIG_SERVICE_TOKENS } from '../../config/di-setup';
import { ConfigurationComponent } from '../../config/ConfigurationComponent';

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
    const navigation = useNavigationContext();
    
    // Navigation state connected to config items with active cursor management
    
    
    // Create config items from current folders or fall back to sample data
    // Memoize to prevent unnecessary recalculations
    const configItems = React.useMemo(() => {
        if (currentFolders && Array.isArray(currentFolders) && currentFolders.length > 0) {
            const items: IListItem[] = [];
            
            // Add "Add Folder" wizard at the top
            const languageOptions = [
                { value: 'english', label: 'English' },
                { value: 'spanish', label: 'Spanish' },
                { value: 'mixed', label: 'Mixed/Multiple Languages' }
            ];
            
            const contentTypeOptions = [
                { value: 'documents', label: 'Documents (PDF, Word, etc.)' },
                { value: 'code', label: 'Code (JavaScript, Python, etc.)' },
                { value: 'mixed', label: 'Mixed Content' }
            ];
            
            const modelOptions = [
                { value: 'nomic-embed-text', label: 'nomic-embed-text (Recommended)' },
                { value: 'mxbai-embed-large', label: 'mxbai-embed-large (High Quality)' },
                { value: 'all-minilm', label: 'all-minilm (Lightweight)' },
                { value: 'codebert-base', label: 'codebert-base (Code-Specific)' }
            ];
            
            const testChildren = [
                new TextListItem("", <Text color="gray">Welcome to Folder Setup! Let's configure a new folder for indexing...</Text>, false, undefined, 'wrap'),
                
                new TextListItem("", <Text color="gray">Language Configuration: Select the primary language of your content for optimal search results</Text>, false, undefined, 'wrap'),
                new SelectionListItem(
                    "·",
                    "What language is your content?",
                    languageOptions,
                    ['english'], // default selection
                    false, // will be set by container
                    'radio',
                    'vertical'
                ),
                
                new TextListItem("", <Text color="gray">Content Type Selection: Choose the type of content you'll be indexing to optimize processing</Text>, false, undefined, 'wrap'),
                new SelectionListItem(
                    "·",
                    "What type of content?",
                    contentTypeOptions,
                    ['documents'], // default selection
                    false,
                    'radio',
                    'vertical'
                ),
                
                new TextListItem("", <Text color="gray">Folder Selection: Choose the folder containing the files you want to index and search</Text>, false, undefined, 'wrap'),
                new FilePickerListItem(
                    "·",
                    "Select folder to index",
                    process.cwd(), // start in current directory
                    false,
                    'folder'
                ),
                
                new TextListItem("", <Text color="gray">Embedding Model: Select the AI model that will process your content for semantic search</Text>, false, undefined, 'wrap'),
                new SelectionListItem(
                    "·",
                    "Choose embedding model",
                    modelOptions,
                    ['nomic-embed-text'], // default selection
                    false,
                    'radio',
                    'vertical'
                )
            ];
            
            const containerItem = new ContainerListItem(
                "📁", 
                "Add Folder Wizard", 
                testChildren,
                false, // isActive
                (results) => {
                    // Container completed
                }
            );
            
            items.push(containerItem);
            
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
                            stableHandleModelChange.current(folder.path, newValues[0]);
                        }
                    }
                );
                
                items.push(folderPicker, modelConfig);
            });
            
            
            return items;
        } else {
            // Fallback to sample data when no config available
            const sampleItems = [...CONFIG_ITEMS]; // Clone to avoid mutations
            
            // Add test ContainerListItem with real wizard questions
            const languageOptions = [
                { value: 'english', label: 'English' },
                { value: 'spanish', label: 'Spanish' },
                { value: 'mixed', label: 'Mixed/Multiple Languages' }
            ];
            
            const contentTypeOptions = [
                { value: 'documents', label: 'Documents (PDF, Word, etc.)' },
                { value: 'code', label: 'Code (JavaScript, Python, etc.)' },
                { value: 'mixed', label: 'Mixed Content' }
            ];
            
            const modelOptions = [
                { value: 'nomic-embed-text', label: 'nomic-embed-text (Recommended)' },
                { value: 'mxbai-embed-large', label: 'mxbai-embed-large (High Quality)' },
                { value: 'all-minilm', label: 'all-minilm (Lightweight)' },
                { value: 'codebert-base', label: 'codebert-base (Code-Specific)' }
            ];
            
            const testChildren = [
                new TextListItem("", <Text color="gray">Welcome to Folder Setup! Let's configure a new folder for indexing...</Text>, false, undefined, 'wrap'),
                
                new TextListItem("", <Text color="gray">Language Configuration: Select the primary language of your content for optimal search results</Text>, false, undefined, 'wrap'),
                new SelectionListItem(
                    "·",
                    "What language is your content?",
                    languageOptions,
                    ['english'], // default selection
                    false, // will be set by container
                    'radio',
                    'vertical'
                ),
                
                new TextListItem("", <Text color="gray">Content Type Selection: Choose the type of content you'll be indexing to optimize processing</Text>, false, undefined, 'wrap'),
                new SelectionListItem(
                    "·",
                    "What type of content?",
                    contentTypeOptions,
                    ['documents'], // default selection
                    false,
                    'radio',
                    'vertical'
                ),
                
                new TextListItem("", <Text color="gray">Folder Selection: Choose the folder containing the files you want to index and search</Text>, false, undefined, 'wrap'),
                new FilePickerListItem(
                    "·",
                    "Select folder to index",
                    process.cwd(), // start in current directory
                    false,
                    'folder'
                ),
                
                new TextListItem("", <Text color="gray">Embedding Model: Select the AI model that will process your content for semantic search</Text>, false, undefined, 'wrap'),
                new SelectionListItem(
                    "·",
                    "Choose embedding model",
                    modelOptions,
                    ['nomic-embed-text'], // default selection
                    false,
                    'radio',
                    'vertical'
                )
            ];
            
            const containerItem = new ContainerListItem(
                "📁", 
                "Add Folder Wizard", 
                testChildren,
                false, // isActive
                (results) => {
                    // Container completed
                }
            );
            
            // Add container item at the beginning
            sampleItems.unshift(containerItem);
            
            return sampleItems;
        }
    }, [currentFolders]); // Remove handleModelChange dependency to prevent recreating items array
    
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