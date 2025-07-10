import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, Key } from 'ink';
import { existsSync, statSync } from 'fs';
import { getContainer } from '../../../di/container';
import { CONFIG_SERVICE_TOKENS } from '../../../config/di-setup';
import { ConfigurationComponent } from '../../../config/ConfigurationComponent';

interface AutoCompletionHandlerProps {
    cliDir?: string | null | undefined;
    cliModel?: string | null | undefined;
    onConfirm: (dir: string, model: string) => void;
    onReject: () => void;
}

export const AutoCompletionHandler: React.FC<AutoCompletionHandlerProps> = ({
    cliDir,
    cliModel,
    onConfirm,
    onReject
}) => {
    const [autoCompletedDir, setAutoCompletedDir] = useState<string>('');
    const [autoCompletedModel, setAutoCompletedModel] = useState<string>('');
    const [dirError, setDirError] = useState<string | null>(null);
    const [modelError, setModelError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load auto-completion data
    useEffect(() => {
        const loadAutoCompletion = async () => {
            try {
                const container = getContainer();
                const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
                
                // Determine directory
                let finalDir = '';
                let finalDirError = '';
                
                if (cliDir) {
                    // Validate provided directory
                    if (existsSync(cliDir)) {
                        const stat = statSync(cliDir);
                        if (stat.isDirectory()) {
                            finalDir = cliDir;
                        } else {
                            finalDirError = `"${cliDir}" is not a directory`;
                            finalDir = process.cwd(); // Fallback
                        }
                    } else {
                        finalDirError = `Directory "${cliDir}" does not exist`;
                        finalDir = process.cwd(); // Fallback
                    }
                } else {
                    // 2.2.1.2.2.1) if it's -m, use the folder the user ran the folder-mcp command from as our -d param
                    finalDir = process.cwd();
                }
                
                // Determine model
                let finalModel = '';
                let finalModelError = '';
                
                if (cliModel) {
                    // Validate provided model
                    const supportedModels = configComponent.getSupportedModels();
                    if (supportedModels.includes(cliModel)) {
                        finalModel = cliModel;
                    } else {
                        finalModelError = `Unsupported model "${cliModel}". Supported: ${supportedModels.join(', ')}`;
                        finalModel = await configComponent.getDefaultModel(); // Fallback
                    }
                } else {
                    // Auto-complete with default model
                    finalModel = await configComponent.getDefaultModel();
                }
                
                setAutoCompletedDir(finalDir);
                setAutoCompletedModel(finalModel);
                setDirError(finalDirError);
                setModelError(finalModelError);
                setLoading(false);
            } catch (error) {
                console.error('Failed to load auto-completion data:', error);
                setDirError('Failed to load directory information');
                setModelError('Failed to load model information');
                setAutoCompletedDir(process.cwd());
                setAutoCompletedModel('nomic-embed-text');
                setLoading(false);
            }
        };
        
        loadAutoCompletion();
    }, [cliDir, cliModel]);

    useInput((input: string, key: Key) => {
        if (loading) return;
        
        if (key.return || input.toLowerCase() === 'y') {
            // Confirm auto-completion
            onConfirm(autoCompletedDir, autoCompletedModel);
        } else if (key.escape || input.toLowerCase() === 'n') {
            // Reject auto-completion, go to wizard
            onReject();
        }
    });

    if (loading) {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="#10b981">🔄 Loading auto-completion...</Text>
            </Box>
        );
    }

    const hasErrors = dirError || modelError;
    const isPartialAutoComplete = (cliDir && !cliModel) || (!cliDir && cliModel);

    return (
        <Box flexDirection="column" padding={1}>
            <Box marginBottom={1}>
                <Text color="#a65ff6" bold>📁 folder-mcp</Text>
                <Text color="#4c1589"> auto-completion</Text>
            </Box>
            
            {isPartialAutoComplete && (
                <Box marginBottom={1}>
                    <Text color="#10b981">✨ Auto-completing missing parameter:</Text>
                </Box>
            )}
            
            <Box flexDirection="column" marginBottom={1}>
                <Box>
                    <Text color="#f3f4f6">📁 Directory: </Text>
                    <Text color={dirError ? "#ff6b6b" : "#10b981"}>
                        {autoCompletedDir}
                        {!cliDir && " (auto-completed)"}
                    </Text>
                </Box>
                {dirError && (
                    <Box marginLeft={2}>
                        <Text color="#ff6b6b">⚠️  {dirError}</Text>
                    </Box>
                )}
            </Box>
            
            <Box flexDirection="column" marginBottom={1}>
                <Box>
                    <Text color="#f3f4f6">🤖 Model: </Text>
                    <Text color={modelError ? "#ff6b6b" : "#10b981"}>
                        {autoCompletedModel}
                        {!cliModel && " (auto-completed)"}
                    </Text>
                </Box>
                {modelError && (
                    <Box marginLeft={2}>
                        <Text color="#ff6b6b">⚠️  {modelError}</Text>
                    </Box>
                )}
            </Box>
            
            {hasErrors ? (
                <Box flexDirection="column" marginTop={1}>
                    <Text color="#ff6b6b">❌ Errors detected. Using fallback values.</Text>
                    <Text color="#f3f4f6" dimColor>Press Y to continue with fallbacks, N to configure manually</Text>
                </Box>
            ) : (
                <Box flexDirection="column" marginTop={1}>
                    <Text color="#10b981">✅ Configuration ready!</Text>
                    <Text color="#f3f4f6" dimColor>Press Y to add/update folder, N to configure manually</Text>
                </Box>
            )}
            
            <Box marginTop={1}>
                <Text color="#f3f4f6" dimColor>Y/Enter: Confirm  N/Esc: Manual configuration</Text>
            </Box>
        </Box>
    );
};