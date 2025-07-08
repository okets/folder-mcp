import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, writeFileSync, mkdirSync } from 'fs';

interface FirstRunWizardProps {
    onComplete: (config: any) => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
    const { exit } = useApp();
    const [step, setStep] = useState(1);
    const [folderPath, setFolderPath] = useState(join(homedir(), 'Documents'));
    const [isComplete, setIsComplete] = useState(false);
    
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
    useInput((input, key) => {
        if (key.escape) {
            exit();
            return;
        }
        
        if (key.return) {
            handleNext();
            return;
        }
        
        if (step === 1) {
            // Handle folder path input
            if (key.backspace) {
                setFolderPath(prev => prev.slice(0, -1));
            } else if (input && input.length > 0) {
                setFolderPath(prev => prev + input);
            }
        }
    });
    
    const handleNext = () => {
        if (step === 1) {
            // Validate folder path
            if (!folderPath.trim()) {
                return;
            }
            setStep(2);
        } else if (step === 2) {
            // Complete setup
            completeSetup();
        }
    };
    
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
                        <Text color={textColor}>📁 Folder path:</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={frameColor}>[</Text>
                        <Text color={textColor}>{folderPath}</Text>
                        <Text color={frameColor}>]</Text>
                        <Text color={highlightColor}>_</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor} dimColor>Type your folder path and press Enter</Text>
                    </Box>
                    
                    <Box marginBottom={1}>
                        <Text color={textColor} dimColor>Press Escape to exit</Text>
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