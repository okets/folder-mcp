import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, Key } from 'ink';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { GenericListPanel } from './GenericListPanel';
import { AnimationProvider } from '../contexts/AnimationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useFocusChain, useRootInput } from '../hooks/useFocusChain';

interface FirstRunWizardProps {
    onComplete: (config: any) => void;
}

// Helper function to get default folder path
function getDefaultFolderPath(): string {
    // Check if dev flag is on
    const isDev = process.env.FOLDER_MCP_DEVELOPMENT_ENABLED === 'true' || 
                  process.env.ENABLE_ENHANCED_MCP_FEATURES === 'true';
    
    if (isDev) {
        // Use tests/fixtures/test-knowledge-base as default in dev mode
        return join(process.cwd(), 'tests', 'fixtures', 'test-knowledge-base');
    }
    
    // Check for CLI -f parameter (would be passed via process.argv)
    const fIndex = process.argv.indexOf('-f');
    if (fIndex !== -1 && fIndex + 1 < process.argv.length) {
        const folderFromCli = process.argv[fIndex + 1];
        if (folderFromCli) {
            return folderFromCli;
        }
    }
    
    // Default to current working directory
    return process.cwd();
}

const WizardContent: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const [step, setStep] = useState(1);
    const [folderPath, setFolderPath] = useState(getDefaultFolderPath());
    const [selectedModel, setSelectedModel] = useState('ollama:nomic-embed-text');
    const [selectedLanguage, setSelectedLanguage] = useState('auto');
    const [isComplete, setIsComplete] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
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
                setFolderPath(path);
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
            if (values.length > 0) {
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
            if (values.length > 0) {
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
            if (step === 1) {
                exit();
            } else {
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
    }, [step, exit]);
    
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
        setIsComplete(true);
        
        // Create basic config
        const config = {
            folders: [{
                path: folderPath,
                name: folderPath.split('/').pop() || 'Folder',
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
        
        // Save config
        try {
            const configDir = join(homedir(), '.folder-mcp');
            mkdirSync(configDir, { recursive: true });
            
            const configPath = join(configDir, 'config.json');
            writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            setTimeout(() => {
                onComplete(config);
            }, 1000);
        } catch (error) {
            console.error('Failed to save config:', error);
        }
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
    
    return (
        <Box flexDirection="column" paddingTop={2} paddingLeft={2} height="100%">
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

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
    return (
        <AnimationProvider>
            <WizardContent onComplete={onComplete} />
        </AnimationProvider>
    );
};