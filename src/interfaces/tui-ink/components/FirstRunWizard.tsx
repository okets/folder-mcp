import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { join } from 'path';
import { existsSync, statSync } from 'fs';
import { GenericListPanel } from './GenericListPanel';
import { AnimationProvider } from '../contexts/AnimationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useRootInput } from '../hooks/useFocusChain';
import { useFMDMOperations, useFMDMConnection } from '../contexts/FMDMContext';
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

const WizardContent: React.FC<FirstRunWizardProps> = ({ onComplete, cliDir, cliModel }) => {
    const { exit } = useApp();
    const { columns } = useTerminalSize();
    const fmdmOperations = useFMDMOperations();
    const fmdmConnection = useFMDMConnection();
    
    const [isComplete, setIsComplete] = useState(false);
    const [hasValidationError, setHasValidationError] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ folder?: string; model?: string }>({});
    
    // Calculate initial values
    const folderResult = getDefaultFolderPath(cliDir);
    const initialPath = folderResult.path;
    const initialModel = cliModel || 'all-MiniLM-L6-v2'; // Default to Python model
    
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
                
                if (!supportedModels.includes(cliModel)) {
                    errors.model = `Unsupported model: ${cliModel}. Supported models: ${supportedModels.join(', ')}`;
                }
            }
            
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setHasValidationError(true);
            }
        };
        
        validateParams();
    }, [cliDir, cliModel, folderResult.error]);
    
    // Handle wizard completion
    const handleWizardComplete = useCallback(async (result: AddFolderWizardResult) => {
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
                    port: 9876,
                    host: '127.0.0.1'
                }
            };
            
            onComplete(config);
        } catch (error) {
            console.error('Failed to add folder during first run:', error);
        }
    }, [onComplete, fmdmOperations]);
    
    // Color constants
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
    // Add input handling that works for both error screen and normal wizard
    useInput((input, key) => {
        if (key.escape && (!fmdmConnection.connected && !fmdmConnection.connecting)) {
            // Only handle ESC on error screen, let normal wizard handle its own ESC
            process.exit(0);
        }
    });

    // Check if daemon is connected - if not, show error screen
    if (!fmdmConnection.connected && !fmdmConnection.connecting) {
        return (
            <Box flexDirection="column" height="100%" justifyContent="center" alignItems="center" padding={1}>
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
    
    // Create the wizard
    const wizardItem = createAddFolderWizard({
        initialPath,
        initialModel,
        onComplete: handleWizardComplete,
        onCancel: () => exit(),
        fmdmOperations
    });
    
    // Start wizard in expanded mode
    wizardItem.onEnter();
    
    return (
        <Box flexDirection="column" height="100%">
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
};

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete, cliDir, cliModel }) => {
    return (
        <AnimationProvider>
            <WizardContent onComplete={onComplete} cliDir={cliDir} cliModel={cliModel} />
        </AnimationProvider>
    );
};