import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { join } from 'path';
import { existsSync, statSync } from 'fs';
import { GenericListPanel } from './GenericListPanel';
import { AnimationProvider } from '../contexts/AnimationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useRootInput } from '../hooks/useFocusChain';
import { useFMDMFolderOperations, useFMDMConnection, useFMDM } from '../contexts/FMDMContext';
import { createAddFolderWizard, AddFolderWizardResult } from './AddFolderWizard';
import { createDefaultModelWizard, DefaultModelWizardResult } from './DefaultModelWizard';
import { IListItem } from './core/IListItem';

type WizardStep = 'model-picker' | 'add-folder';

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

const WizardContent: React.FC<FirstRunWizardProps> = React.memo(({ onComplete, cliDir, cliModel }) => {
    const { columns } = useTerminalSize();
    const fmdmOperations = useFMDMFolderOperations();
    const fmdmConnection = useFMDMConnection();
    const { fmdm, setDefaultModel } = useFMDM();

    const [isComplete, setIsComplete] = useState(false);
    const [hasValidationError, setHasValidationError] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ folder?: string; model?: string }>({});

    // Two-step wizard state
    const [wizardStep, setWizardStep] = useState<WizardStep>('model-picker');
    const [modelPickerItem, setModelPickerItem] = useState<IListItem | null>(null);
    const [addFolderItem, setAddFolderItem] = useState<IListItem | null>(null);
    const [wizardLoading, setWizardLoading] = useState(true);

    // Track the user-selected model (from model picker step)
    const [userSelectedModel, setUserSelectedModel] = useState<string | undefined>(undefined);

    // Get default model from FMDM (used as initial value for model picker)
    const fmdmDefaultModel = fmdm?.defaultModel?.modelId;

    // Calculate initial values
    const folderResult = getDefaultFolderPath(cliDir);
    const initialPath = folderResult.path;
    // CLI model overrides everything
    const cliModelOverride = cliModel || undefined;

    // Use refs for stable values that shouldn't trigger re-renders
    const stableRefs = useRef({
        initialPath,
        fmdmDefaultModel,
        cliModelOverride,
        onComplete,
        fmdmOperations,
        setDefaultModel
    });

    // Update refs when values change
    useEffect(() => {
        stableRefs.current = {
            initialPath,
            fmdmDefaultModel,
            cliModelOverride,
            onComplete,
            fmdmOperations,
            setDefaultModel
        };
    });
    
    // Set up root input handler
    useRootInput();
    
    // Validate CLI parameters
    useEffect(() => {
        const validateParams = async () => {
            const errors: { folder?: string; model?: string } = {};
            
            // Check folder error from path calculation
            if (folderResult.error) {
                errors.folder = folderResult.error;
            }
            
            // Validate CLI model if provided - use Python models list
            if (cliModel) {
                // Import Python models for validation
                const { getPythonModels } = await import('../services/ModelListService');
                const supportedModels = getPythonModels().map(model => model.name);
                
                // Also check if model is missing the gpu: prefix
                const normalizedModel = cliModel.startsWith('gpu:') ? cliModel : `gpu:${cliModel}`;
                
                if (!supportedModels.includes(normalizedModel)) {
                    errors.model = `Unsupported model: ${cliModel}. Supported models: ${supportedModels.map(m => m.replace('gpu:', '')).join(', ')}`;
                }
            }
            
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setHasValidationError(true);
            }
        };
        
        validateParams();
    }, [cliDir, cliModel, folderResult.error]);
    
    // Step 1: Create Model Picker wizard after daemon connection
    useEffect(() => {
        // Skip if already have model picker, CLI model provided, or not ready
        if (modelPickerItem || cliModelOverride || !fmdmConnection.connected || hasValidationError) {
            // If CLI model is provided, skip to step 2 directly
            if (cliModelOverride && wizardStep === 'model-picker') {
                setUserSelectedModel(cliModelOverride);
                setWizardStep('add-folder');
            }
            return;
        }

        const createModelPicker = async () => {
            const { fmdmDefaultModel, setDefaultModel } = stableRefs.current;

            // Handle model picker completion
            const handleModelPickerComplete = async (result: DefaultModelWizardResult) => {
                try {
                    // Save the selected model as default via FMDM
                    await setDefaultModel(result.model, result.languages);
                    setUserSelectedModel(result.model);
                    // Move to step 2
                    setWizardStep('add-folder');
                } catch (error) {
                    console.error('Failed to set default model during first run:', error);
                    // Still proceed to step 2 even if saving fails
                    setUserSelectedModel(result.model);
                    setWizardStep('add-folder');
                }
            };

            try {
                setWizardLoading(true);
                const modelPicker = await createDefaultModelWizard({
                    initialLanguages: ['en'],
                    // Use FMDM default as initial selection if available
                    ...(fmdmDefaultModel && { initialModel: fmdmDefaultModel }),
                    onComplete: handleModelPickerComplete,
                    onCancel: () => {
                        process.exit(0);
                    }
                });

                // Start wizard in expanded mode
                modelPicker.onEnter();
                setModelPickerItem(modelPicker);
            } catch (error) {
                console.error('Failed to create model picker:', error);
            } finally {
                setWizardLoading(false);
            }
        };

        createModelPicker();
    }, [fmdmConnection.connected, hasValidationError, modelPickerItem, cliModelOverride, wizardStep]);

    // Step 2: Create Add Folder wizard after model selection
    useEffect(() => {
        // Only create add folder wizard when in step 2 and don't have one yet
        if (wizardStep !== 'add-folder' || addFolderItem || !fmdmConnection.connected) {
            return;
        }

        const createFolderWizard = async () => {
            const { initialPath, onComplete, fmdmOperations } = stableRefs.current;

            // Use CLI model, user-selected model, or FMDM default
            const effectiveModel = cliModelOverride || userSelectedModel || fmdmDefaultModel;

            // Handle folder wizard completion
            const handleFolderWizardComplete = async (result: AddFolderWizardResult) => {
                setIsComplete(true);

                try {
                    await fmdmOperations.addFolder(result.path, result.model);

                    // Create config object for backward compatibility
                    const config = {
                        folders: [{
                            path: result.path,
                            model: result.model
                        }],
                        embedding: {
                            model: result.model,
                            batchSize: 32
                        },
                        server: {
                            host: '127.0.0.1'
                        }
                    };

                    onComplete(config);
                } catch (error) {
                    console.error('Failed to add folder during first run:', error);
                }
            };

            try {
                setWizardLoading(true);
                const wizard = await createAddFolderWizard({
                    initialPath,
                    ...(effectiveModel && { defaultModel: effectiveModel }),
                    onComplete: handleFolderWizardComplete,
                    onCancel: () => {
                        process.exit(0);
                    },
                    fmdmOperations,
                    // Hide model override in First Run - we just selected a model in Step 1
                    hideModelOverride: true
                });

                // Start wizard in expanded mode
                wizard.onEnter();
                setAddFolderItem(wizard);
            } catch (error) {
                console.error('Failed to create folder wizard:', error);
            } finally {
                setWizardLoading(false);
            }
        };

        createFolderWizard();
    }, [wizardStep, addFolderItem, fmdmConnection.connected, userSelectedModel, cliModelOverride, fmdmDefaultModel]);
    
    // Color constants
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
    // Add input handling for ESC key to exit cleanly
    useInput((_input, key) => {
        if (key.escape) {
            // ESC key should always exit the program cleanly
            process.exit(0);
        }
    });

    // Don't show daemon error screen here - let AppFullscreen handle daemon connection logic
    // FirstRunWizard should only render when daemon is connected
    if (!fmdmConnection.connected && !fmdmConnection.connecting) {
        return null; // Let parent (AppFullscreen) handle daemon connection
    }
    
    // Show completion screen
    if (isComplete) {
        return (
            <Box flexDirection="column" padding={1}>
                <Box marginBottom={1}>
                    <Text color={frameColor}>■ </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    <Text color={frameColor}> setup complete!</Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text color={highlightColor}>✅ Configuration saved</Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text color={textColor}>Starting indexing...</Text>
                </Box>
            </Box>
        );
    }
    
    // Show error screen if there are critical errors
    if (hasValidationError) {
        return (
            <Box flexDirection="column" height="100%" padding={1}>
                <Box marginBottom={1}>
                    <Text color="#EF4444" bold>✗</Text>
                    <Text color="#F3F4F6" bold> Configuration Error</Text>
                </Box>
                
                {validationErrors.folder && (
                    <>
                        <Box marginBottom={1}>
                            <Text color="#F3F4F6">Invalid folder path specified:</Text>
                        </Box>
                        
                        <Box marginBottom={1}>
                            <Text color="#EF4444">"{cliDir}"</Text>
                        </Box>
                        
                        <Box marginBottom={1}>
                            <Text color="#F59E0B">{validationErrors.folder}</Text>
                        </Box>
                    </>
                )}
                
                {validationErrors.model && (
                    <>
                        <Box marginBottom={1}>
                            <Text color="#F3F4F6">Invalid model specified:</Text>
                        </Box>
                        
                        <Box marginBottom={1}>
                            <Text color="#EF4444">"{cliModel}"</Text>
                        </Box>
                        
                        <Box marginBottom={1}>
                            <Text color="#F59E0B">{validationErrors.model}</Text>
                        </Box>
                    </>
                )}
                
                <Box marginBottom={1}>
                    <Text color="#F3F4F6">Please check your parameters and try again.</Text>
                </Box>
            </Box>
        );
    }
    
    // Show loading while wizard is being created
    const currentWizardItem = wizardStep === 'model-picker' ? modelPickerItem : addFolderItem;
    if (wizardLoading || !currentWizardItem) {
        return (
            <Box flexDirection="column" height="100%" justifyContent="center" alignItems="center">
                <Text color="yellow">{wizardStep === 'model-picker' ? 'Loading models...' : 'Preparing folder wizard...'}</Text>
            </Box>
        );
    }
    
    // Determine panel title and subtitle based on current step
    // Use React elements for bold step indicator
    const panelTitle = wizardStep === 'model-picker'
        ? <Text>folder-mcp · <Text bold>(Step 1/2)</Text> Choose Default Model</Text>
        : <Text>folder-mcp · <Text bold>(Step 2/2)</Text> Add Your First Folder</Text>;
    // Plain text version for width calculations
    const panelTitlePlainText = wizardStep === 'model-picker'
        ? 'folder-mcp · (Step 1/2) Choose Default Model'
        : 'folder-mcp · (Step 2/2) Add Your First Folder';
    const panelSubtitle = wizardStep === 'model-picker'
        ? 'Select your preferred embedding model'
        : 'Select a folder to index';

    return (
        <Box flexDirection="column" height="100%">
            <GenericListPanel
                title={panelTitle}
                titlePlainText={panelTitlePlainText}
                subtitle={panelSubtitle}
                items={[currentWizardItem]}
                selectedIndex={0}
                isFocused={true}
                elementId="wizard-main"
                parentId="wizard"
                priority={50}
                width={Math.min(Math.floor(columns * 0.95), 120)}
            />
        </Box>
    );
});

export const FirstRunWizard: React.FC<FirstRunWizardProps> = React.memo(({ onComplete, cliDir, cliModel }) => {
    return (
        <AnimationProvider>
            <WizardContent onComplete={onComplete} cliDir={cliDir} cliModel={cliModel} />
        </AnimationProvider>
    );
});