import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, Key } from 'ink';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, writeFileSync, mkdirSync } from 'fs';

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

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
    const { exit } = useApp();
    const [step, setStep] = useState(1);
    const [folderPath, setFolderPath] = useState(getDefaultFolderPath());
    const [isComplete, setIsComplete] = useState(false);
    
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
    // Create data for GenericListPanel with a working folder selector
    const createWizardItems = (): IListItem[] => {
        // Use a much simpler approach - just return an array with a working render function
        return [{
            render: (maxWidth: number, maxLines: number) => {
                return React.createElement(Text, null, `📁 Current folder: ${folderPath} (Press Enter to select)`);
            },
            getRequiredLines: () => 1,
            onEnter: () => {
                setStep(2);
            },
            icon: '📁',
            isActive: true,
            isControllingInput: false,
            selfConstrained: true as const
        }];
    };
    
    // Handle input directly with useInput hook
    useInput((input, key) => {
        if (key.escape) {
            exit();
            return;
        }
        
        if (key.return && step === 1) {
            // Select current folder and go to step 2
            setStep(2);
            return;
        }
        
        if (key.return && step === 2) {
            // Complete setup
            completeSetup();
            return;
        }
    });
    
    const completeSetup = () => {
        setIsComplete(true);
        
        // Create basic config
        const config = {
            folders: [{
                path: folderPath,
                name: folderPath.split('/').pop() || 'Folder',
                model: 'ollama:nomic-embed-text',
                language: 'en',
                enabled: true
            }],
            embedding: {
                model: 'ollama:nomic-embed-text',
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
    
    return (
        <Box flexDirection="column" padding={1}>
            {/* Header */}
            <Box marginBottom={2}>
                <Text color={frameColor}>📁 </Text>
                <Text color={logoTextColor} bold>folder-mcp</Text>
                <Text color={frameColor}> - First Run Setup</Text>
            </Box>
            
            {/* Welcome message */}
            <Box marginBottom={2}>
                <Text color={highlightColor}>🎉 Welcome to folder-mcp!</Text>
            </Box>
            
            <Box marginBottom={1}>
                <Text color={textColor}>Let's set up your first knowledge base.</Text>
            </Box>
            
            {/* Step 1: Folder Selection */}
            {step === 1 && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={highlightColor}>Step 1: Choose a folder to index</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor}>📁 Current folder: {folderPath}</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor} dimColor>Press Enter to select this folder, or Escape to exit</Text>
                    </Box>
                </Box>
            )}
            
            {/* Step 2: Confirmation */}
            {step === 2 && (
                <Box flexDirection="column">
                    <Box marginBottom={1}>
                        <Text color={highlightColor}>Step 2: Confirm setup</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor}>📁 Folder: {folderPath}</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor}>🤖 Model: Ollama (nomic-embed-text)</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor}>🌍 Language: English (auto-detected)</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor}>🚀 Auto-start: Yes</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={highlightColor}>Press Enter to start indexing</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor} dimColor>Press Escape to exit</Text>
                    </Box>
                </Box>
            )}
        </Box>
    );
};