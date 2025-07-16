#!/usr/bin/env node
import React, { useState } from 'react';
import { render } from 'ink';
import { AppFullscreen } from './AppFullscreen';

import { FirstRunWizard } from './components/FirstRunWizard';
import { AutoCompletionHandler } from './components/AutoCompletionHandler';
import { ConfigurationThemeProvider } from './contexts/ConfigurationThemeProvider';
import { DIProvider, setupDIContainer } from './di/index';
import { setupDependencyInjection } from '../../di/setup';
import { CONFIG_SERVICE_TOKENS } from '../../config/di-setup';
import { IConfigManager } from '../../domain/config/IConfigManager';
import { ConfigurationComponent } from '../../config/ConfigurationComponent';
import { getContainer } from '../../di/container';

// Parse command line arguments
const args = process.argv.slice(2);
const dirIndex = args.indexOf('-d');
const modelIndex = args.indexOf('-m');
const cliDir = dirIndex !== -1 && dirIndex + 1 < args.length ? args[dirIndex + 1] : null;
const cliModel = modelIndex !== -1 && modelIndex + 1 < args.length ? args[modelIndex + 1] : null;

// Check if we're in a proper TTY environment
if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('Error: This application must be run in an interactive terminal.');
    console.error('Please run directly in your terminal, not through pipes or scripts.');
    process.exit(1);
}

// Let Ink handle screen management for better terminal compatibility

// Setup DI containers
const tuiContainer = setupDIContainer(); // TUI-specific container
let mainContainer: any; // Main app container

// Check if raw mode is supported
const isRawModeSupported = process.stdin.setRawMode !== undefined;

if (!isRawModeSupported) {
    console.error('Error: Raw mode is not supported in this environment.');
    console.error('The TUI requires an interactive terminal that supports raw mode.');
    console.error('');
    console.error('Try running this command directly in your terminal:');
    console.error('  npm run tui');
    process.exit(1);
}

// Main app component that decides between wizard and main app
const MainApp: React.FC<{ cliDir?: string | null | undefined; cliModel?: string | null | undefined }> = ({ cliDir, cliModel }) => {
    const [showWizard, setShowWizard] = useState(true);
    const [showAutoCompletion, setShowAutoCompletion] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [hasValidationError, setHasValidationError] = useState(false);
    
    // Check config and implement the exact flow described
    React.useEffect(() => {
        const checkConfigAndImplementFlow = async () => {
            const container = getContainer();
            const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
            
            // Check if we have any configured folders (first run detection)
            const folders = await configComponent.get('folders.list') || [];
            const hasConfiguredFolders = Array.isArray(folders) && folders.length > 0;
            
            // 2.2) With CLI params?
            if (cliDir || cliModel) {
                // 2.2.1) -d or -m params defined? validate.
                const validationResult = await validateCliParams(cliDir ?? null, cliModel ?? null, configComponent);
                
                if (!validationResult.valid) {
                    // 2.2.1.1) validation fails: show error message and prevent wizard
                    console.error(`\x1b[31m✗\x1b[0m ${validationResult.error}`);
                    console.error('');
                    console.error('Please check your parameters and try again.');
                    console.error('\x1b[38;5;208mTip: if you run folder-mcp without parameters, a setup wizard will appear.\x1b[0m');
                    setHasValidationError(true);
                    setShowWizard(false);
                    setShowAutoCompletion(false);
                    // Exit after a brief delay to ensure error is displayed
                    setTimeout(() => process.exit(1), 100);
                    return;
                }
                
                // 2.2.1.2) validation passes
                if (cliDir && cliModel) {
                    // 2.2.1.2.1) both -d and -m defined? add folder and show main app
                    await configComponent.addFolder(cliDir, cliModel);
                    await loadMainApp(configComponent);
                } else {
                    // 2.2.1.2.2) only one param defined? auto-complete and show confirmation
                    setShowAutoCompletion(true);
                    setShowWizard(false);
                }
            } else {
                // 2.1) Without CLI params
                if (hasConfiguredFolders) {
                    // 2.1.2) at least one folder already set? show main app
                    await loadMainApp(configComponent);
                } else {
                    // 2.1.1) first run? show wizard
                    setShowWizard(true);
                }
            }
        };
        
        const validateCliParams = async (dir: string | null, model: string | null, configComponent: ConfigurationComponent) => {
            // Validate -d parameter
            if (dir) {
                const pathValidation = await configComponent.validate('folders.list[].path', dir);
                if (!pathValidation.valid) {
                    return { valid: false, error: `Invalid folder path "\x1b[31m${dir}\x1b[0m": ${pathValidation.errors?.[0]?.message}` };
                }
            }
            
            // Validate -m parameter
            if (model) {
                const modelValidation = await configComponent.validate('folders.list[].model', model);
                if (!modelValidation.valid) {
                    return { valid: false, error: `Invalid model "\x1b[31m${model}\x1b[0m": ${modelValidation.errors?.[0]?.message}` };
                }
            }
            
            return { valid: true };
        };
        
        const loadMainApp = async (configComponent: ConfigurationComponent) => {
            try {
                // Load config from unified ConfigurationComponent
                await configComponent.load();
                
                // Get folders configuration with fallback to defaults
                const foldersList = await configComponent.get('folders.list');
                const embeddingModel = await configComponent.get('folders.defaults.embeddings.model');
                const theme = await configComponent.get('theme');
                
                // Create config object for backward compatibility
                const loadedConfig = {
                    folders: foldersList || [],
                    embedding: {
                        model: embeddingModel || 'nomic-embed-text',
                        batchSize: 32
                    },
                    server: {
                        port: 9876,
                        host: '127.0.0.1'
                    },
                    ui: {
                        theme: theme || 'auto'
                    }
                };
                
                setConfig(loadedConfig);
                setShowWizard(false);
                setShowAutoCompletion(false);
            } catch (error) {
                // Config loading failed, show wizard for first run
                setShowWizard(true);
                setShowAutoCompletion(false);
            }
        };
        
        checkConfigAndImplementFlow();
    }, [cliDir, cliModel]);
    
    const handleWizardComplete = (newConfig: any) => {
        setConfig(newConfig);
        setShowWizard(false);
    };
    
    const handleAutoCompletionConfirm = async (dir: string, model: string) => {
        try {
            // Create config using ConfigurationComponent
            const container = getContainer();
            const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
            
            await configComponent.load();
            await configComponent.addFolder(dir, model);
            
            // Create config object for backward compatibility
            const newConfig = {
                folders: [{ path: dir, model }],
                embedding: { model, batchSize: 32 },
                server: { port: 9876, host: '127.0.0.1' },
                ui: { theme: 'auto' }
            };
            
            setConfig(newConfig);
            setShowAutoCompletion(false);
            setShowWizard(false);
        } catch (error) {
            console.error('Auto-completion failed:', error);
            // Fall back to wizard on error
            setShowAutoCompletion(false);
            setShowWizard(true);
        }
    };
    
    const handleAutoCompletionReject = () => {
        setShowAutoCompletion(false);
        setShowWizard(true);
    };
    
    // All hooks must be called before any conditional rendering
    // Render based on state - use conditional JSX, not early returns
    return (
        <>
            {hasValidationError && null}
            {!hasValidationError && showAutoCompletion && (
                <AutoCompletionHandler 
                    cliDir={cliDir} 
                    cliModel={cliModel}
                    onConfirm={handleAutoCompletionConfirm}
                    onReject={handleAutoCompletionReject}
                />
            )}
            {!hasValidationError && !showAutoCompletion && showWizard && (
                <FirstRunWizard onComplete={handleWizardComplete} cliDir={cliDir} cliModel={cliModel} />
            )}
            {!hasValidationError && !showAutoCompletion && !showWizard && (
                <AppFullscreen config={config} />
            )}
        </>
    );
};

// Start the TUI with configuration support
async function startTUI() {
    try {
        // Setup main DI container with configuration services
        mainContainer = setupDependencyInjection({
            logLevel: 'error' // Quiet for TUI
        });
        
        // Get ConfigurationComponent from DI and ensure it's loaded
        const container = getContainer();
        const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
        await configComponent.load();
        
        // Configuration is now loaded
        
        // Render with configuration support
        // Additional Windows screen clearing right before render
        if (process.platform === 'win32') {
            clearWindowsScreen();
        }
        
        const app = render(
            <DIProvider container={tuiContainer}>
                <ConfigurationThemeProvider configManager={configComponent}>
                    <WindowsScreenWrapper>
                        <MainApp cliDir={cliDir} cliModel={cliModel} />
                    </WindowsScreenWrapper>
                </ConfigurationThemeProvider>
            </DIProvider>,
            {
                exitOnCtrlC: true,
                patchConsole: process.platform === 'win32', // Enable console patching on Windows
                debug: false, // Disable Ink debug mode
                // Windows-specific enhancements
                ...(process.platform === 'win32' && {
                    experimental: {
                        clearScreen: true
                    }
                })
            }
        );
        
        return app;
    } catch {
        
        // Fallback to wizard/main app without config - still provide theme context
        // Get ConfigurationComponent for fallback case
        const container = getContainer();
        const fallbackConfigComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
        
        // Additional Windows screen clearing right before fallback render
        if (process.platform === 'win32') {
            clearWindowsScreen();
        }
        
        const app = render(
            <DIProvider container={tuiContainer}>
                <ConfigurationThemeProvider configManager={fallbackConfigComponent}>
                    <WindowsScreenWrapper>
                        <MainApp cliDir={cliDir} cliModel={cliModel} />
                    </WindowsScreenWrapper>
                </ConfigurationThemeProvider>
            </DIProvider>,
            {
                exitOnCtrlC: true,
                patchConsole: process.platform === 'win32', // Enable console patching on Windows
                debug: false, // Disable Ink debug mode
                // Windows-specific enhancements
                ...(process.platform === 'win32' && {
                    experimental: {
                        clearScreen: true
                    }
                })
            }
        );
        
        return app;
    }
}

// Windows-specific terminal setup
const setupWindowsTerminal = async () => {
    if (process.platform === 'win32') {
        // Enable ANSI escape codes on Windows
        if (process.stdout.isTTY) {
            try {
                // First, try to enable Virtual Terminal Processing
                const vtEnabled = enableWindowsVirtualTerminal();
                
                // Enhanced Windows terminal preparation with multiple approaches
                if (vtEnabled || process.env.WT_SESSION || process.env.TERM_PROGRAM) {
                    // Use alternate screen buffer approach (like vim/less) - works best in modern terminals
                    process.stdout.write('\x1b[?1049h'); // Switch to alternate screen buffer
                    process.stdout.write('\x1b[2J');     // Clear alternate screen
                    process.stdout.write('\x1b[H');      // Move cursor to home
                    process.stdout.write('\x1b[?25l');   // Hide cursor
                } else {
                    // Fallback for legacy terminals - more aggressive clearing
                    process.stdout.write('\x1b[?25l');   // Hide cursor first
                    process.stdout.write('\x1b[2J');     // Clear screen
                    process.stdout.write('\x1b[H');      // Move cursor to home
                    process.stdout.write('\x1b[3J');     // Clear scrollback buffer (if supported)
                }
                
                // Register cleanup to restore terminal state on exit
                const restoreScreen = () => {
                    if (process.stdout.isTTY) {
                        process.stdout.write('\x1b[?25h'); // Show cursor
                        if (vtEnabled || process.env.WT_SESSION || process.env.TERM_PROGRAM) {
                            process.stdout.write('\x1b[?1049l'); // Switch back to main screen
                        }
                    }
                };
                
                // Register cleanup handlers
                process.on('exit', restoreScreen);
                process.on('SIGINT', () => {
                    restoreScreen();
                    process.exit(0);
                });
                process.on('SIGTERM', () => {
                    restoreScreen();
                    process.exit(0);
                });
                
            } catch (error) {
                // Absolute fallback - basic ANSI codes
                process.stdout.write('\x1b[?25l'); // Hide cursor initially
                process.stdout.write('\x1b[2J');   // Clear screen
                process.stdout.write('\x1b[H');    // Move cursor to home
            }
        }
    }
};

// Windows Console API helper for virtual terminal processing
const enableWindowsVirtualTerminal = (): boolean => {
    if (process.platform !== 'win32') return false;
    
    try {
        // Try to enable Virtual Terminal Processing through Node.js
        // This works in modern Windows terminals
        if (process.stdout.isTTY) {
            const { spawn } = require('child_process');
            
            // Use PowerShell to enable virtual terminal processing
            const enableVT = spawn('powershell.exe', [
                '-NoProfile', '-NonInteractive', '-Command',
                `
                try {
                    $handle = [System.Console]::OutputEncoding;
                    [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
                    Write-Output "VT_ENABLED";
                } catch {
                    Write-Output "VT_FAILED";
                }
                `
            ], { 
                stdio: 'pipe',
                windowsHide: true
            });
            
            let result = false;
            enableVT.stdout.on('data', (data: Buffer) => {
                if (data.toString().trim().includes('VT_ENABLED')) {
                    result = true;
                }
            });
            
            // Wait briefly for the command to complete
            setTimeout(() => enableVT.kill(), 100);
            return result;
        }
    } catch (error) {
        // Fallback: assume ANSI support is available
        return true;
    }
    
    return false;
};

// Enhanced Windows screen clearing utility
const clearWindowsScreen = (): void => {
    if (process.platform === 'win32' && process.stdout.isTTY) {
        try {
            // Multiple clearing strategies for different Windows terminal types
            
            // Strategy 1: Modern Windows Terminal / VSCode Terminal
            if (process.env.WT_SESSION || process.env.TERM_PROGRAM === 'vscode') {
                process.stdout.write('\x1b[2J\x1b[H\x1b[3J'); // Clear screen + scrollback
                return;
            }
            
            // Strategy 2: Windows Terminal with VT support
            if (process.env.TERM_PROGRAM || process.stdout.columns) {
                process.stdout.write('\x1b[2J\x1b[H'); // Standard clear
                return;
            }
            
            // Strategy 3: Legacy Command Prompt / PowerShell
            process.stdout.write('\x1b[2J'); // Clear screen
            process.stdout.write('\x1b[H');  // Home cursor
            
            // Additional aggressive clearing for stubborn terminals
            for (let i = 0; i < (process.stdout.rows || 50); i++) {
                process.stdout.write('\n');
            }
            process.stdout.write('\x1b[H'); // Return to home
            
        } catch (error) {
            // Fallback: basic clear
            process.stdout.write('\x1b[2J\x1b[H');
        }
    }
};

// Windows-specific wrapper component for better screen management
const WindowsScreenWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    React.useEffect(() => {
        if (process.platform === 'win32') {
            // Additional clearing on component mount
            clearWindowsScreen();
            
            // Set up periodic clearing for stubborn terminals (every 100ms for first second)
            let clearCount = 0;
            const maxClears = 10;
            const intervalId = setInterval(() => {
                if (clearCount < maxClears) {
                    clearWindowsScreen();
                    clearCount++;
                } else {
                    clearInterval(intervalId);
                }
            }, 100);
            
            return () => {
                clearInterval(intervalId);
            };
        }
        return undefined;
    }, []);
    
    return <>{children}</>;
};

// Start the Ink TUI
let app: any;

// Handle graceful exit
const cleanup = () => {
    if (app) {
        app.unmount();
    }
    
    // Restore terminal state on exit
    if (process.platform === 'win32' && process.stdout.isTTY) {
        process.stdout.write('\x1b[?25h'); // Show cursor
        process.stdout.write('\x1b[?1049l'); // Switch back to main screen
    }
    
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the app and handle exit
async function main() {
    // Setup Windows terminal first
    await setupWindowsTerminal();
    
    // Add a brief delay to let terminal setup complete on Windows
    if (process.platform === 'win32') {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const instance = await startTUI();
    app = instance;
    
    return instance.waitUntilExit();
}

main().then(() => {
    // Let terminal handle cleanup naturally
}).catch(error => {
    console.log('Error during startup:', error);
    process.exit(1);
});