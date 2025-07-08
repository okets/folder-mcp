import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, Key } from 'ink';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { FilePickerListItem } from './core/FilePickerListItem';
import { GenericListPanel } from './GenericListPanel';
import { StatusBar } from './StatusBar';
import { NavigationProvider } from '../contexts/NavigationContext';
import { AnimationProvider } from '../contexts/AnimationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useFocusChain, useRootInput } from '../hooks/useFocusChain';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';

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
    const [isComplete, setIsComplete] = useState(false);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    
    const frameColor = '#4c1589';
    const logoTextColor = '#a65ff6';
    const highlightColor = '#10b981';
    const textColor = '#f3f4f6';
    
    // Set up root input handler
    useRootInput();
    
    // Create FilePickerListItem for folder selection
    const folderPicker = new FilePickerListItem(
        '📁',
        'Project Folder',
        folderPath,
        true, // isActive
        'folder', // mode - folder only
        (path) => {
            setFolderPath(path);
            setStep(2); // Auto-advance to step 2 when folder is selected
        }
    );
    
    // Enable the folder picker to control input
    if (step === 1) {
        folderPicker.onEnter();
    }
    
    // Handle wizard-level input using focus chain
    const handleWizardInput = useCallback((input: string, key: Key): boolean => {
        if (key.escape) {
            exit();
            return true;
        }
        
        // Handle step 2 confirmation
        if (step === 2 && key.return) {
            completeSetup();
            return true;
        }
        
        return false;
    }, [step, exit]);
    
    // Register wizard input handler with focus chain
    useFocusChain({
        elementId: 'wizard',
        parentId: 'root',
        isActive: true,
        onInput: handleWizardInput,
        keyBindings: step === 2 ? [
            { key: 'Enter', description: 'Confirm' },
            { key: 'Escape', description: 'Exit' }
        ] : [
            { key: 'Escape', description: 'Exit' }
        ],
        priority: -10 // Low priority so panel can handle input first
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
        <Box flexDirection="column" width="100%" height="100%">
            {/* Header */}
            <Box padding={1} borderStyle="round" borderColor={frameColor}>
                <Text color={frameColor}>📁 </Text>
                <Text color={logoTextColor} bold>folder-mcp</Text>
                <Text color={frameColor}> - First Run Setup</Text>
            </Box>
            
            {/* Main Content */}
            <Box flexGrow={1} flexDirection="column" padding={1}>
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
                        
                        <Box flexGrow={1}>
                            <GenericListPanel
                                title="Select Folder"
                                subtitle="Navigate and press Enter to confirm"
                                items={[folderPicker]}
                                selectedIndex={0}
                                isFocused={true}
                                elementId="wizard-folder-picker"
                                parentId="wizard"
                                priority={50}
                                height={Math.min(20, rows - 10)}
                                width={Math.min(100, columns - 4)}
                            />
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
                        
                        <Box marginTop={2}>
                            <Text color={highlightColor}>Ready to start indexing!</Text>
                        </Box>
                    </Box>
                )}
            </Box>
            
            {/* Status Bar */}
            <StatusBar />
        </Box>
    );
};

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
    return (
        <AnimationProvider>
            <NavigationProvider configItemCount={1} statusItemCount={0}>
                <WizardContent onComplete={onComplete} />
            </NavigationProvider>
        </AnimationProvider>
    );
};