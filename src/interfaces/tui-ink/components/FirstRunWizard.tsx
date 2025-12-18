import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { join } from 'path';
import { existsSync, statSync } from 'fs';
import { GenericListPanel } from './GenericListPanel';
import { AnimationProvider } from '../contexts/AnimationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useRootInput } from '../hooks/useFocusChain';
import { useFMDMFolderOperations, useFMDMConnection } from '../contexts/FMDMContext';
import { createAddFolderWizard, AddFolderWizardResult } from './AddFolderWizard';
import { IListItem } from './core/IListItem';

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
    
    const [isComplete, setIsComplete] = useState(false);
    const [hasValidationError, setHasValidationError] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ folder?: string; model?: string }>({});
    const [wizardItem, setWizardItem] = useState<IListItem | null>(null);
    const [wizardLoading, setWizardLoading] = useState(true);
    const [layoutVersion, setLayoutVersion] = useState(0); // Force re-render trigger
    
    // Calculate initial values
    const folderResult = getDefaultFolderPath(cliDir);
    const initialPath = folderResult.path;
    const initialModel = cliModel || undefined; // Will be set from daemon's model list
    
    // Use refs for stable values that shouldn't trigger re-renders
    const stableRefs = useRef({
        initialPath,
        initialModel,
        onComplete,
        fmdmOperations
    });
    
    // Update refs when values change
    useEffect(() => {
        stableRefs.current = {
            initialPath,
            initialModel,
            onComplete,
            fmdmOperations
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
    
    // Create wizard asynchronously after daemon connection
    useEffect(() => {
        
        // Skip if already have a wizard or if not ready
        if (wizardItem || !fmdmConnection.connected || hasValidationError) {
            return;
        }
        
        const createWizard = async () => {
            // Get stable references
            const { initialPath, initialModel, onComplete, fmdmOperations } = stableRefs.current;
            
            // Handle wizard completion - defined inside useEffect to avoid dependency issues
            const handleWizardComplete = async (result: AddFolderWizardResult) => {
                setIsComplete(true);
                
                // Add folder using FMDM operations
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
                            // Port auto-discovered from daemon registry
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
                    ...(initialModel ? { initialModel } : {}),
                    onComplete: handleWizardComplete,
                    onCancel: () => {
                        process.exit(0);
                    },
                    fmdmOperations,
                    onModeChange: () => {
                        // Increment layout version to force React re-render
                        setLayoutVersion(v => v + 1);
                    }
                });
                
                // Start wizard in expanded mode
                wizard.onEnter();
                setWizardItem(wizard);
            } catch (error) {
            } finally {
                setWizardLoading(false);
            }
        };
        
        createWizard();
    }, [fmdmConnection.connected, hasValidationError, wizardItem]); // Removed unstable dependencies
    
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
    if (wizardLoading || !wizardItem) {
        return (
            <Box flexDirection="column" height="100%" justifyContent="center" alignItems="center">
                <Text color="yellow">Loading models...</Text>
            </Box>
        );
    }
    
    return (
        <Box flexDirection="column" height="100%" key={`wizard-${layoutVersion}`}>
            <GenericListPanel
                title="folder-mcp · Add Folder Wizard"
                subtitle="Let's configure your knowledge base"
                items={[wizardItem]}
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