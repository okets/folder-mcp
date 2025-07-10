import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, Key } from 'ink';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { LogItem, LogEntry } from './core/items/LogItem';
import { GenericListPanel } from './GenericListPanel';
import { AnimationProvider } from '../contexts/AnimationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useFocusChain, useRootInput } from '../hooks/useFocusChain';
import { getContainer } from '../../../di/container';
import { CONFIG_SERVICE_TOKENS } from '../../../config/di-setup';
import { IConfigManager } from '../../../domain/config/IConfigManager';
import { ConfigurationComponent } from '../../../config/ConfigurationComponent';
import { FolderConfig } from '../../../config/schema/folders';

interface FirstRunWizardProps {
    onComplete: (config: any) => void;
    cliDir?: string | null | undefined;
}

// Helper function to get default folder path with validation
function getDefaultFolderPath(cliDir?: string | null | undefined): { path: string; error?: string } {
    // Priority 1: CLI -d parameter (if provided and valid)
    if (cliDir) {
        if (existsSync(cliDir)) {
            const stat = require('fs').statSync(cliDir);
            if (stat.isDirectory()) {
                return { path: cliDir };
            } else {
                return { 
                    path: process.cwd(), 
                    error: `CLI path "${cliDir}" exists but is not a directory` 
                };
            }
        } else {
            return { 
                path: process.cwd(), 
                error: `CLI path "${cliDir}" does not exist` 
            };
        }
    }
    
    // Priority 2: Dev flag
    const isDev = process.env.FOLDER_MCP_DEVELOPMENT_ENABLED === 'true';
    if (isDev) {
        // Use tests/fixtures/test-knowledge-base as default in dev mode
        return { path: join(process.cwd(), 'tests', 'fixtures', 'test-knowledge-base') };
    }
    
    // Priority 3: Current working directory
    return { path: process.cwd() };
}

const WizardContent: React.FC<FirstRunWizardProps> = ({ onComplete, cliDir }) => {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const folderResult = getDefaultFolderPath(cliDir);
    const [folderPath, setFolderPath] = useState(folderResult.path);
    const [folderError, setFolderError] = useState(folderResult.error || null);
    
    // If valid folder provided via CLI, skip folder selection step
    const hasValidCliFolder = cliDir && !folderResult.error;
    const [step, setStep] = useState(hasValidCliFolder ? 2 : 1);
    
    // DEBUG: Log initial folder path
    console.error(`[WIZARD-DEBUG] Initial folder setup:`);
    console.error(`[WIZARD-DEBUG] - cliDir: ${cliDir}`);
    console.error(`[WIZARD-DEBUG] - folderResult.path: ${folderResult.path}`);
    console.error(`[WIZARD-DEBUG] - folderResult.error: ${folderResult.error}`);
    console.error(`[WIZARD-DEBUG] - folderPath state: ${folderPath}`);
    const [selectedModel, setSelectedModel] = useState('ollama:nomic-embed-text');
    const [selectedLanguage, setSelectedLanguage] = useState('auto');
    const [isComplete, setIsComplete] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
    // Create CLI feedback log entries
    const createCliLogEntries = (): LogEntry[] => {
        const logs: LogEntry[] = [];
        
        // Add CLI directory parameter log
        if (cliDir) {
            if (folderError) {
                logs.push({
                    id: 'cli-dir-error',
                    timestamp: new Date(),
                    level: 'error',
                    message: `CLI -d parameter: ${folderError}`,
                    details: `Provided path: ${cliDir}\nFalling back to folder picker with default: ${folderPath}`,
                    source: 'CLI'
                });
            } else {
                logs.push({
                    id: 'cli-dir-success',
                    timestamp: new Date(),
                    level: 'info',
                    message: `CLI -d parameter: Using folder "${cliDir}"`,
                    details: `Directory validated and will be used for indexing`,
                    source: 'CLI'
                });
            }
        }
        
        // Add development mode log
        const isDev = process.env.FOLDER_MCP_DEVELOPMENT_ENABLED === 'true';
        if (isDev) {
            logs.push({
                id: 'dev-mode',
                timestamp: new Date(),
                level: 'info',
                message: 'Development mode enabled',
                details: 'FOLDER_MCP_DEVELOPMENT_ENABLED=true detected',
                source: 'Environment'
            });
        }
        
        return logs;
    };
    
    // Panel dimensions
    const PANEL_HEIGHT = 9;
    const PANEL_WIDTH = Math.min(60, columns - 4);
    
    // Set up root input handler
    useRootInput();
    
    // Create configuration items for each step using useMemo to ensure stability
    const folderPicker = React.useMemo(() => {
        const picker = new FilePickerListItem(
            '📁',
            'Project Folder',
            folderPath,
            true, // isActive
            'folder', // mode - folder only
            (path) => {
                console.error(`[WIZARD-DEBUG] User selected new folder path: ${path}`);
                console.error(`[WIZARD-DEBUG] Previous folderPath: ${folderPath}`);
                setFolderPath(path);
                console.error(`[WIZARD-DEBUG] setFolderPath called, advancing to step 2`);
                setStep(2); // Auto-advance to next step
            }
        );
        // Start in open mode
        picker.onEnter();
        return picker;
    }, []); // Empty deps since we handle path updates internally
    
    // Create model options array
    const modelOptions = [
        { value: 'ollama:nomic-embed-text', label: 'Ollama: nomic-embed-text (Recommended)' },
        { value: 'ollama:mxbai-embed-large', label: 'Ollama: mxbai-embed-large' },
        { value: 'openai:text-embedding-ada-002', label: 'OpenAI: text-embedding-ada-002' },
        { value: 'custom', label: 'Custom endpoint...' }
    ];
    
    const modelSelector = new SelectionListItem(
        '🤖',
        'Embedding Model',
        modelOptions,
        [selectedModel], // selectedValues as array
        true, // isActive
        'radio', // mode
        'vertical', // layout
        (values) => {
            if (values.length > 0 && values[0] !== undefined) {
                setSelectedModel(values[0]);
                setStep(3); // Auto-advance to next step
            }
        }
    );
    
    // Create language options array
    const languageOptions = [
        { value: 'auto', label: 'Auto-detect' },
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'other', label: 'Other...' }
    ];
    
    const languageSelector = new SelectionListItem(
        '🌍',
        'Language',
        languageOptions,
        [selectedLanguage], // selectedValues as array
        true, // isActive
        'radio', // mode
        'vertical', // layout
        (values) => {
            if (values.length > 0 && values[0] !== undefined) {
                setSelectedLanguage(values[0]);
                setStep(4); // Auto-advance to confirmation
            }
        }
    );
    
    
    // Enable the appropriate item to control input based on current step
    useEffect(() => {
        if (step === 2) {
            modelSelector.onEnter();
        } else if (step === 3) {
            languageSelector.onEnter();
        }
    }, [step]);
    
    // Handle wizard-level input using focus chain
    const handleWizardInput = useCallback((input: string, key: Key): boolean => {
        if (key.escape) {
            // Go back to previous step, or exit if on first step
            if (step === 1 || (hasValidCliFolder && step === 2)) {
                exit();
            } else if (!hasValidCliFolder || step > 2) {
                setStep(step - 1);
            }
            return true;
        }
        
        // Handle confirmation step
        if (step === 4 && key.return) {
            completeSetup();
            return true;
        }
        
        return false;
    }, [step, exit, hasValidCliFolder]);
    
    // Register wizard input handler with focus chain
    const getKeyBindings = () => {
        if (step === 4) {
            return [
                { key: 'Enter', description: 'Confirm' },
                { key: 'Esc', description: 'Back' }
            ];
        } else if (step > 1) {
            return [
                { key: '↑↓', description: 'Navigate' },
                { key: 'Enter', description: 'Select' },
                { key: 'Esc', description: 'Back' }
            ];
        } else {
            return [
                { key: '↑↓', description: 'Navigate' },
                { key: 'Enter', description: 'Select' },
                { key: 'Esc', description: 'Exit' }
            ];
        }
    };
    
    useFocusChain({
        elementId: 'wizard',
        parentId: 'root',
        isActive: true,
        onInput: handleWizardInput,
        keyBindings: getKeyBindings(),
        priority: -10 // Low priority so panel can handle input first
    });
    
    const completeSetup = () => {
        console.error(`[WIZARD-DEBUG] completeSetup called with folderPath: ${folderPath}`);
        console.error(`[WIZARD-DEBUG] selectedModel: ${selectedModel}`);
        console.error(`[WIZARD-DEBUG] selectedLanguage: ${selectedLanguage}`);
        
        setIsComplete(true);
        
        // Create config using unified system
        const saveConfigToUnifiedSystem = async () => {
            try {
                console.error(`\n=== WIZARD CONFIG SAVE START ===`);
                console.error(`Folder path: "${folderPath}"`);
                console.error(`Selected model: "${selectedModel}"`);
                console.error(`Selected language: "${selectedLanguage}"`);
                
                // Get ConfigurationComponent from main DI container
                const container = getContainer();
                const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
                console.error(`ConfigurationComponent resolved successfully`);
                
                // Load existing config first
                await configComponent.load();
                console.error(`ConfigurationComponent loaded successfully`);
                
                // Create folder config following the schema
                const folderConfig: FolderConfig = {
                    path: folderPath,
                    name: folderPath.split('/').pop() || 'Folder',
                    enabled: true,
                    embeddings: {
                        backend: 'ollama',
                        model: selectedModel
                    }
                };
                
                // Set folders configuration using ConfigurationComponent
                console.error(`Setting folders.list with config:`, folderConfig);
                await configComponent.set('folders.list', [folderConfig]);
                console.error(`folders.list set successfully`);
                
                // Set default embedding model
                console.error(`Setting defaults - model: "${selectedModel}", backend: "ollama"`);
                await configComponent.set('folders.defaults.embeddings.model', selectedModel);
                await configComponent.set('folders.defaults.embeddings.backend', 'ollama');
                console.error(`Embedding defaults set successfully`);
                
                // Set theme
                await configComponent.set('theme', 'auto');
                console.error(`Theme set successfully`);
                
                // Create config object for backward compatibility
                const config = {
                    folders: [{
                        path: folderPath,
                        name: folderConfig.name,
                        model: selectedModel,
                        language: selectedLanguage,
                        enabled: true
                    }],
                    embedding: {
                        model: selectedModel,
                        batchSize: 32
                    },
                    server: {
                        port: 9876,
                        host: '127.0.0.1'
                    },
                    ui: {
                        theme: 'auto'
                    }
                };
                
                console.error(`\n=== CONFIG FILE SHOULD BE CREATED ===`);
                console.error(`Expected location: ~/.folder-mcp/config.yaml`);
                console.error(`Config object for backward compatibility:`, config);
                console.error(`=== WIZARD CONFIG SAVE COMPLETE ===\n`);
                onComplete(config);
            } catch (error) {
                console.error(`\n=== WIZARD CONFIG SAVE ERROR ===`);
                console.error('Failed to save config to unified system:', error);
                console.error(`Error details:`, error);
                console.error(`=== END ERROR ===\n`);
            }
        };
        
        // Execute the save operation
        saveConfigToUnifiedSystem();
    };
    
    if (isComplete) {
        return (
            <Box flexDirection="column" padding={1}>
                <Box marginBottom={1}>
                    <Text color={frameColor}>📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    <Text color={frameColor}> setup complete!</Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text color={highlightColor}>✅ Configuration saved</Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text color={textColor}>📁 Folder: {folderPath}</Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text color={textColor}>🤖 Model: Ollama (nomic-embed-text)</Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text color={textColor}>Starting indexing...</Text>
                </Box>
            </Box>
        );
    }
    
    // Create a frameless status bar
    const StatusHints: React.FC = () => {
        const hints = getKeyBindings().map(kb => `${kb.key} ${kb.description}`).join('  ');
        return (
            <Box paddingLeft={1}>
                <Text color={textColor} dimColor>{hints}</Text>
            </Box>
        );
    };
    
    // Create items for completed steps (read-only versions)
    const createReadOnlyFolderPicker = () => {
        const picker = new FilePickerListItem(
            '📁',
            'Project Folder',
            folderPath,
            false, // not active
            'folder',
            undefined // no callback
        );
        picker.onEnter(); // Show in expanded state
        return picker;
    };
    
    const createReadOnlyModelSelector = () => {
        const selector = new SelectionListItem(
            '🤖',
            'Embedding Model',
            modelOptions,
            [selectedModel],
            false, // not active
            'radio',
            'vertical',
            undefined // no callback
        );
        selector.onEnter(); // Show in expanded state
        return selector;
    };
    
    const createReadOnlyLanguageSelector = () => {
        const selector = new SelectionListItem(
            '🌍',
            'Language',
            languageOptions,
            [selectedLanguage],
            false, // not active
            'radio',
            'vertical',
            undefined // no callback
        );
        selector.onEnter(); // Show in expanded state
        return selector;
    };
    
    const cliLogs = createCliLogEntries();
    
    return (
        <Box flexDirection="column" paddingTop={2} paddingLeft={2} height="100%">
            {/* CLI Feedback Panel - Show if there are CLI parameters */}
            {cliLogs.length > 0 && (
                <Box flexDirection="column" width={PANEL_WIDTH} marginBottom={1}>
                    <Box
                        borderStyle="round"
                        borderColor={frameColor}
                        width={PANEL_WIDTH}
                        padding={1}
                        flexDirection="column"
                    >
                        <Text color={highlightColor} bold>CLI Parameters</Text>
                        {cliLogs.map((log, index) => (
                            <Box key={log.id} marginTop={index > 0 ? 1 : 0}>
                                <Text color={log.level === 'error' ? '#ff6b6b' : '#10b981'}>
                                    {log.level === 'error' ? '✗' : '✓'} {log.message}
                                </Text>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
            
            {/* Step 1: Always show folder panel */}
            <Box flexDirection="column" width={PANEL_WIDTH} marginBottom={step > 1 ? 1 : 0}>
                {step === 1 ? (
                    <>
                        <GenericListPanel
                            title="Select Project Folder"
                            items={[folderPicker]}
                            selectedIndex={0}
                            isFocused={true}
                            elementId="wizard-folder-picker"
                            parentId="wizard"
                            priority={50}
                            height={PANEL_HEIGHT}
                            width={PANEL_WIDTH}
                        />
                        <StatusHints />
                    </>
                ) : (
                    <GenericListPanel
                        title="✓ Project Folder"
                        items={[createReadOnlyFolderPicker()]}
                        selectedIndex={0}
                        isFocused={false}
                        elementId="wizard-folder-picker-readonly"
                        parentId="wizard"
                        priority={-1}
                        height={PANEL_HEIGHT}
                        width={PANEL_WIDTH}
                    />
                )}
            </Box>
            
            {/* Step 2: Show model panel when on step 2+ */}
            {step >= 2 && (
                <Box flexDirection="column" width={PANEL_WIDTH} marginBottom={step > 2 ? 1 : 0}>
                    {step === 2 ? (
                        <>
                            <GenericListPanel
                                title="Choose Embedding Model"
                                items={[modelSelector]}
                                selectedIndex={0}
                                isFocused={true}
                                elementId="wizard-model-selector"
                                parentId="wizard"
                                priority={50}
                                height={PANEL_HEIGHT}
                                width={PANEL_WIDTH}
                            />
                            <StatusHints />
                        </>
                    ) : (
                        <GenericListPanel
                            title="✓ Embedding Model"
                            items={[createReadOnlyModelSelector()]}
                            selectedIndex={0}
                            isFocused={false}
                            elementId="wizard-model-selector-readonly"
                            parentId="wizard"
                            priority={-1}
                            height={PANEL_HEIGHT}
                            width={PANEL_WIDTH}
                        />
                    )}
                </Box>
            )}
            
            {/* Step 3: Show language panel when on step 3+ */}
            {step >= 3 && (
                <Box flexDirection="column" width={PANEL_WIDTH} marginBottom={step > 3 ? 1 : 0}>
                    {step === 3 ? (
                        <>
                            <GenericListPanel
                                title="Set Language"
                                items={[languageSelector]}
                                selectedIndex={0}
                                isFocused={true}
                                elementId="wizard-language-selector"
                                parentId="wizard"
                                priority={50}
                                height={PANEL_HEIGHT}
                                width={PANEL_WIDTH}
                            />
                            <StatusHints />
                        </>
                    ) : (
                        <GenericListPanel
                            title="✓ Language"
                            items={[createReadOnlyLanguageSelector()]}
                            selectedIndex={0}
                            isFocused={false}
                            elementId="wizard-language-selector-readonly"
                            parentId="wizard"
                            priority={-1}
                            height={PANEL_HEIGHT}
                            width={PANEL_WIDTH}
                        />
                    )}
                </Box>
            )}
            
            {/* Step 4: Show confirmation panel */}
            {step === 4 && (
                <Box flexDirection="column" width={PANEL_WIDTH}>
                    <Box 
                        borderStyle="round" 
                        borderColor={frameColor}
                        height={PANEL_HEIGHT}
                        width={PANEL_WIDTH}
                        padding={1}
                        flexDirection="column"
                    >
                        <Text color={highlightColor} bold>✅ Ready to create configuration:</Text>
                        <Box marginTop={1} flexDirection="column">
                            <Text color={textColor}>📁 Folder: {folderPath.split('/').pop()}</Text>
                            <Text color={textColor} dimColor>   {folderPath}</Text>
                            <Text color={textColor}>🤖 Model: {
                                selectedModel === 'ollama:nomic-embed-text' ? 'Ollama: nomic-embed-text' :
                                selectedModel === 'ollama:mxbai-embed-large' ? 'Ollama: mxbai-embed-large' :
                                selectedModel === 'openai:text-embedding-ada-002' ? 'OpenAI: text-embedding-ada-002' :
                                'Custom endpoint'
                            }</Text>
                            <Text color={textColor}>🌍 Language: {
                                selectedLanguage === 'auto' ? 'Auto-detect' :
                                selectedLanguage === 'en' ? 'English' :
                                selectedLanguage === 'es' ? 'Spanish' :
                                selectedLanguage === 'fr' ? 'French' :
                                selectedLanguage === 'de' ? 'German' :
                                'Other'
                            }</Text>
                        </Box>
                        <Box marginTop={1}>
                            <Text color={highlightColor}>Press Enter to save and start indexing</Text>
                        </Box>
                    </Box>
                    <StatusHints />
                </Box>
            )}
        </Box>
    );
};

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete, cliDir }) => {
    return (
        <AnimationProvider>
            <WizardContent onComplete={onComplete} cliDir={cliDir} />
        </AnimationProvider>
    );
};