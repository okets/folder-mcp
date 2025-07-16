import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, Key, Static } from 'ink';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { SimpleButtonsRow, ButtonConfig } from './core/SimpleButtonsRow';
import { ValidationState, createValidationMessage } from '../validation/ValidationState';
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
    cliModel?: string | null | undefined;
}

// Helper function to get default folder path with validation
function getDefaultFolderPath(cliDir?: string | null | undefined): { path: string; error?: string } {
    // Priority 1: CLI -d parameter (if provided and valid)
    if (cliDir) {
        if (existsSync(cliDir)) {
            const stat = statSync(cliDir);
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

const WizardContent: React.FC<FirstRunWizardProps> = ({ onComplete, cliDir, cliModel }) => {
    // CRITICAL: ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL LOGIC
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    
    const [supportedModels, setSupportedModels] = useState<string[]>([]);
    const [modelError, setModelError] = useState<string | null>(null);
    const [step, setStep] = useState(1); // Will be set correctly after hooks
    const [isComplete, setIsComplete] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    
    // Calculate initial values AFTER all hooks
    const folderResult = getDefaultFolderPath(cliDir);
    const [folderPath, setFolderPath] = useState(folderResult.path);
    const [, setFolderError] = useState(folderResult.error || null);
    
    // Get default model or validate CLI model
    const getInitialModel = (): string => {
        if (cliModel) {
            // Will validate later against supported models
            return cliModel;
        }
        return 'nomic-embed-text'; // Default
    };
    
    const [selectedModel, setSelectedModel] = useState(getInitialModel());
    
    // Calculate step after hooks - use useEffect to set correct initial step
    useEffect(() => {
        // If valid folder provided via CLI, skip folder selection step
        const hasValidCliFolder = cliDir && !folderResult.error;
        // If valid model provided via CLI, and folder is valid, skip to confirmation
        const hasValidCliModel = cliModel && !modelError;
        const initialStep = (() => {
            if (hasValidCliFolder && hasValidCliModel) return 3; // Go to confirmation
            if (hasValidCliFolder) return 2; // Go to model selection
            return 1; // Start with folder selection
        })();
        
        setStep(initialStep);
    }, [cliDir, cliModel, folderResult.error, modelError]);
    
    // Load supported models and validate CLI model
    useEffect(() => {
        const loadSupportedModels = async () => {
            try {
                const container = getContainer();
                const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
                const models = configComponent.getSupportedModels();
                setSupportedModels(models);
                
                // Validate CLI model if provided
                if (cliModel) {
                    if (!models.includes(cliModel)) {
                        setModelError(`Unsupported model: ${cliModel}. Supported models: ${models.join(', ')}`);
                        setSelectedModel('nomic-embed-text'); // Reset to default
                    }
                }
            } catch (error) {
                console.error('Failed to load supported models:', error);
                // Fallback to hardcoded list
                const fallbackModels = [
                    'nomic-embed-text',
                    'mxbai-embed-large',
                    'all-minilm',
                    'sentence-transformers',
                    'ollama:nomic-embed-text',
                    'ollama:mxbai-embed-large',
                    'ollama:all-minilm',
                    'transformers:all-MiniLM-L6-v2'
                ];
                setSupportedModels(fallbackModels);
                
                if (cliModel && !fallbackModels.includes(cliModel)) {
                    setModelError(`Unsupported model: ${cliModel}. Supported models: ${fallbackModels.join(', ')}`);
                    setSelectedModel('nomic-embed-text');
                }
            }
        };
        
        loadSupportedModels();
    }, [cliModel]);
    
    // Set up root input handler
    useRootInput();
    
    // Handle wizard-level input using focus chain
    const handleWizardInput = useCallback((input: string, key: Key): boolean => {
        // Handle up/down navigation between questions
        if (key.upArrow && step > 1) {
            setStep(step - 1);
            return true;
        }
        
        if (key.downArrow && step < 3) {
            setStep(step + 1);
            return true;
        }
        
        if (key.escape) {
            // Go back to previous step, or exit if on first step
            if (step === 1) {
                exit();
            } else {
                setStep(step - 1);
            }
            return true;
        }
        
        return false;
    }, [step, exit]);
    
    // Register wizard input handler with focus chain
    const getKeyBindings = () => {
        const bindings = [
            { key: 'Enter', description: 'Select/Edit' }
        ];
        
        // Add navigation keys if not on first/last question
        if (step > 1) {
            bindings.unshift({ key: '↑', description: 'Previous Question' });
        }
        if (step < 3) {
            bindings.unshift({ key: '↓', description: 'Next Question' });
        }
        
        // Add escape
        if (step === 1) {
            bindings.push({ key: 'Esc', description: 'Exit' });
        } else {
            bindings.push({ key: 'Esc', description: 'Previous Question' });
        }
        
        return bindings;
    };
    
    useFocusChain({
        elementId: 'wizard',
        parentId: 'root',
        isActive: true,
        onInput: handleWizardInput,
        keyBindings: getKeyBindings(),
        priority: -10 // Low priority so panel can handle input first
    });
    
    // Stable callback functions
    const handleFolderChange = React.useCallback((path: string) => {
        setFolderPath(path);
        setStep(2); // Auto-advance to next step
    }, []);
    
    const handleModelChange = React.useCallback((values: string[]) => {
        if (values.length > 0 && values[0] !== undefined) {
            setSelectedModel(values[0]);
            setStep(3); // Auto-advance to confirmation
        }
    }, []);
    
    const handleConfirmationChange = React.useCallback((selectedValues: string[]) => {
        if (selectedValues[0] === 'confirm') {
            completeSetup();
        } else {
            exit();
        }
    }, [exit]);

    const handleButtonPress = React.useCallback((buttonConfig: ButtonConfig, buttonIndex: number) => {
        if (buttonConfig.eventValue === 'confirm') {
            completeSetup();
        } else if (buttonConfig.eventValue === 'cancel') {
            exit();
        }
    }, [exit]);
    
    // Create model options array from supported models
    const modelOptions = React.useMemo(() => {
        return supportedModels.map(model => ({
            value: model,
            label: model === 'nomic-embed-text' ? `${model} (Recommended)` : model
        }));
    }, [supportedModels]);
    
    // Helper function to create validation message for success states
    const getValidationForQuestion = (questionType: 'folder' | 'model' | 'confirmation') => {
        switch (questionType) {
            case 'folder':
                if (folderPath && !folderResult.error) {
                    return createValidationMessage(ValidationState.Valid, '', '✓');
                }
                return null; // No validation message for incomplete/invalid states
                
            case 'model':
                if (selectedModel && supportedModels.includes(selectedModel) && !modelError) {
                    return createValidationMessage(ValidationState.Valid, '', '✓');
                }
                return null; // No validation message for incomplete/invalid states
                
            case 'confirmation':
                // Confirmation doesn't need validation icons
                return null;
                
            default:
                return null;
        }
    };
    
    // Create stable items using useMemo to prevent recreation on every render
    const allItems = React.useMemo(() => {
        const items = [];
        
        // Get validation states
        const folderValidation = getValidationForQuestion('folder');
        const modelValidation = getValidationForQuestion('model');
        
        
        // Step 1: Folder selection - always show
        const folderPickerItem = new FilePickerListItem(
            '·',
            'Which folder would you like to index?',
            folderPath,
            step === 1, // active when it's the current step
            'folder',
            handleFolderChange
        );
        
        // Set validation message immediately during creation
        if (folderValidation) {
            (folderPickerItem as any)._externalValidationMessage = folderValidation;
        }
        
        items.push(folderPickerItem);
        
        // Step 2: Model selection - always show  
        const modelSelectorItem = new SelectionListItem(
            '·',
            'What embedding model would you like to use?',
            modelOptions,
            [selectedModel],
            step === 2, // active when it's the current step
            'radio',
            'vertical',
            handleModelChange
        );
        
        // Set validation message immediately during creation
        if (modelValidation) {
            (modelSelectorItem as any)._validationMessage = modelValidation;
        }
        
        items.push(modelSelectorItem);
        
        // Step 3: Confirmation - always show
        const confirmationButtonsRow = new SimpleButtonsRow(
            '⚡',
            'Confirm Adding Embeddings for this folder',
            [
                {
                    name: 'confirm',
                    borderColor: '#10b981', // green
                    text: '✓ Confirm',
                    eventValue: 'confirm'
                },
                {
                    name: 'cancel', 
                    borderColor: '#ef4444', // red
                    text: '✗ Cancel',
                    eventValue: 'cancel'
                }
            ],
            step === 3, // active when it's the current step
            handleButtonPress,
            'center' // center-aligned buttons
        );
        
        items.push(confirmationButtonsRow);
        
        return items;
    }, [step, folderPath, selectedModel, modelOptions, handleFolderChange, handleModelChange, handleButtonPress, supportedModels, modelError, folderResult.error]); // Include validation dependencies
    
    // Color constants
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
    const completeSetup = () => {
        
        setIsComplete(true);
        
        // Create config using unified system
        const saveConfigToUnifiedSystem = async () => {
            try {
                // Get ConfigurationComponent from main DI container
                const container = getContainer();
                const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
                
                // Load existing config first
                await configComponent.load();
                
                // Add folder using ConfigurationComponent
                await configComponent.addFolder(folderPath, selectedModel);
                
                // Set default embedding model (only model, no backend needed)
                await configComponent.set('folders.defaults.embeddings.model', selectedModel);
                
                
                // Create config object for backward compatibility
                const config = {
                    folders: [{
                        path: folderPath,
                        model: selectedModel
                    }],
                    embedding: {
                        model: selectedModel,
                        batchSize: 32
                    },
                    server: {
                        port: 9876,
                        host: '127.0.0.1'
                    }
                };
                
                onComplete(config);
            } catch (error) {
                // Silently handle config save errors during TUI rendering
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
    // Show error screen if there are critical errors
    const hasCriticalError = folderResult.error || (cliModel && modelError);
    
    if (hasCriticalError) {
        return (
            <Box flexDirection="column" height="100%" padding={1}>
                <Box marginBottom={1}>
                    <Text color="#EF4444" bold>✗</Text>
                    <Text color="#F3F4F6" bold> Configuration Error</Text>
                </Box>
                
                {folderResult.error && (
                    <>
                        <Box marginBottom={1}>
                            <Text color="#F3F4F6">Invalid folder path specified:</Text>
                        </Box>
                        
                        <Box marginBottom={1}>
                            <Text color="#EF4444">"{cliDir}"</Text>
                        </Box>
                        
                        <Box marginBottom={1}>
                            <Text color="#F59E0B">{folderResult.error}</Text>
                        </Box>
                    </>
                )}
                
                {cliModel && modelError && (
                    <>
                        <Box marginBottom={1}>
                            <Text color="#F3F4F6">Invalid model specified:</Text>
                        </Box>
                        
                        <Box marginBottom={1}>
                            <Text color="#EF4444">"{cliModel}"</Text>
                        </Box>
                        
                        <Box marginBottom={1}>
                            <Text color="#F59E0B">{modelError}</Text>
                        </Box>
                    </>
                )}
                
                <Box marginBottom={1}>
                    <Text color="#F3F4F6">Please check your parameters and try again.</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" height="100%">
            <GenericListPanel
                title="folder-mcp · Add Folder Wizard"
                subtitle="Let's configure your knowledge base"
                items={allItems}
                selectedIndex={step - 1} // Focus on current step (0-indexed)
                isFocused={true}
                elementId="wizard-main"
                parentId="wizard"
                priority={50}
                // No height specified - use dynamic sizing
                width={Math.min(Math.floor(columns * 0.95), 120)}
            />
        </Box>
    );
};


export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete, cliDir, cliModel }) => {
    // Use the fixed WizardContent with proper hook order
    return (
        <AnimationProvider>
            <WizardContent onComplete={onComplete} cliDir={cliDir} cliModel={cliModel} />
        </AnimationProvider>
    );
};