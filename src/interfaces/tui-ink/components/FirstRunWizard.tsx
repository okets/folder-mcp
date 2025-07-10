import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, Key } from 'ink';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
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
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const folderResult = getDefaultFolderPath(cliDir);
    const [folderPath, setFolderPath] = useState(folderResult.path);
    const [, setFolderError] = useState(folderResult.error || null);
    
    // Setup model and navigation logic
    const [supportedModels, setSupportedModels] = useState<string[]>([]);
    const [modelError, setModelError] = useState<string | null>(null);
    
    // Get default model or validate CLI model
    const getInitialModel = (): string => {
        if (cliModel) {
            // Will validate later against supported models
            return cliModel;
        }
        return 'nomic-embed-text'; // Default
    };
    
    const [selectedModel, setSelectedModel] = useState(getInitialModel());
    
    // If valid folder provided via CLI, skip folder selection step
    const hasValidCliFolder = cliDir && !folderResult.error;
    // If valid model provided via CLI, and folder is valid, skip to confirmation
    const hasValidCliModel = cliModel && !modelError;
    const initialStep = (() => {
        if (hasValidCliFolder && hasValidCliModel) return 3; // Go to confirmation
        if (hasValidCliFolder) return 2; // Go to model selection
        return 1; // Start with folder selection
    })();
    
    const [step, setStep] = useState(initialStep);
    const [isComplete, setIsComplete] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
    
    // Panel dimensions
    const PANEL_HEIGHT = 9;
    const PANEL_WIDTH = Math.min(60, columns - 4);
    
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
    
    // Create configuration items for each step using useMemo to ensure stability
    const folderPicker = React.useMemo(() => {
        const picker = new FilePickerListItem(
            '?',
            'Which folder would you like to index?',
            folderPath,
            true, // isActive
            'folder', // mode - folder only
            (path) => {
                setFolderPath(path);
                setStep(2); // Auto-advance to next step
            }
        );
        // Expansion handled in getAllItems() based on current step
        return picker;
    }, []); // Empty deps since we handle path updates internally
    
    // Create model options array from supported models
    const modelOptions = React.useMemo(() => {
        return supportedModels.map(model => ({
            value: model,
            label: model === 'nomic-embed-text' ? `${model} (Recommended)` : model
        }));
    }, [supportedModels]);
    
    const modelSelector = React.useMemo(() => {
        if (modelOptions.length === 0) {
            // Return a placeholder until models are loaded
            return new SelectionListItem(
                '🤖',
                'Loading models...',
                [{ value: 'loading', label: 'Loading supported models...' }],
                ['loading'],
                false,
                'radio',
                'vertical',
                () => {}
            );
        }
        
        return new SelectionListItem(
            '?',
            'What embedding model would you like to use?',
            modelOptions,
            [selectedModel], // selectedValues as array
            true, // isActive
            'radio', // mode
            'vertical', // layout
            (values) => {
                if (values.length > 0 && values[0] !== undefined) {
                    setSelectedModel(values[0]);
                    setStep(3); // Auto-advance to confirmation
                }
            }
        );
    }, [modelOptions, selectedModel]);
    
    // Language step removed - now goes directly from model to confirmation
    
    
    
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
    
    const completeSetup = () => {
        
        setIsComplete(true);
        
        // Create config using unified system
        const saveConfigToUnifiedSystem = async () => {
            try {
                console.error(`\n=== WIZARD CONFIG SAVE START ===`);
                console.error(`Folder path: "${folderPath}"`);
                console.error(`Selected model: "${selectedModel}"`);
                
                // Get ConfigurationComponent from main DI container
                const container = getContainer();
                const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
                console.error(`ConfigurationComponent resolved successfully`);
                
                // Load existing config first
                await configComponent.load();
                console.error(`ConfigurationComponent loaded successfully`);
                
                // Add folder using ConfigurationComponent
                console.error(`Adding folder with path: "${folderPath}", model: "${selectedModel}"`);
                await configComponent.addFolder(folderPath, selectedModel);
                console.error(`Folder added successfully`);
                
                // Set default embedding model (only model, no backend needed)
                console.error(`Setting default model: "${selectedModel}"`);
                await configComponent.set('folders.defaults.embeddings.model', selectedModel);
                console.error(`Default model set successfully`);
                
                // Set theme
                await configComponent.set('theme', 'auto');
                console.error(`Theme set successfully`);
                
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
    

    // Helper function to get question status
    const getQuestionStatus = (questionType: 'folder' | 'model' | 'confirmation') => {
        switch (questionType) {
            case 'folder':
                if (!folderPath || folderResult.error) return { icon: '✗', color: '#EF4444' }; // red for invalid
                if (folderPath) return { icon: '✓', color: '#10B981' }; // green for completed
                return { icon: '?', color: '#F59E0B' }; // orange for unanswered
                
            case 'model':
                if (modelError) return { icon: '✗', color: '#EF4444' }; // red for invalid
                if (selectedModel && supportedModels.includes(selectedModel)) return { icon: '✓', color: '#10B981' }; // green for completed
                return { icon: '?', color: '#F59E0B' }; // orange for unanswered
                
            case 'confirmation':
                // Confirmation is always unanswered until the final action
                return { icon: '?', color: '#F59E0B' }; // orange for unanswered
                
            default:
                return { icon: '?', color: '#F59E0B' };
        }
    };

    // Create items for all questions (always show all)
    const getAllItems = () => {
        const items = [];
        
        // Step 1: Folder selection - always show
        const folderStatus = getQuestionStatus('folder');
        const folderPickerItem = new FilePickerListItem(
            '·',
            `${folderStatus.icon} Which folder would you like to index?`,
            folderPath,
            step === 1, // active when it's the current step
            'folder',
            (path) => {
                setFolderPath(path);
                setStep(2); // Auto-advance to next step
            }
        );
        
        items.push(folderPickerItem);
        
        // Step 2: Model selection - always show  
        const modelStatus = getQuestionStatus('model');
        const modelSelectorItem = new SelectionListItem(
            '·',
            `${modelStatus.icon} What embedding model would you like to use?`,
            modelOptions,
            [selectedModel],
            step === 2, // active when it's the current step
            'radio',
            'vertical',
            (values) => {
                if (values.length > 0 && values[0] !== undefined) {
                    setSelectedModel(values[0]);
                    setStep(3); // Auto-advance to confirmation
                }
            }
        );
        
        items.push(modelSelectorItem);
        
        // Step 3: Confirmation - always show
        const confirmationStatus = getQuestionStatus('confirmation');
        const confirmationSelectorItem = new SelectionListItem(
            '·',
            `${confirmationStatus.icon} Confirm Adding Embeddings for this folder`,
            [
                { value: 'confirm', label: '✓ Confirm' },
                { value: 'deny', label: '✗ Cancel' }
            ],
            ['confirm'],
            step === 3, // active when it's the current step
            'radio',
            'horizontal',
            (selectedValues: string[]) => {
                if (selectedValues[0] === 'confirm') {
                    completeSetup();
                } else {
                    exit();
                }
            }
        );
        
        items.push(confirmationSelectorItem);
        
        return items;
    };

    return (
        <Box flexDirection="column" height="100%">
            <GenericListPanel
                title="folder-mcp · Add Folder Wizard"
                subtitle="Let's configure your knowledge base"
                items={getAllItems()}
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
    return (
        <AnimationProvider>
            <WizardContent onComplete={onComplete} cliDir={cliDir} cliModel={cliModel} />
        </AnimationProvider>
    );
};