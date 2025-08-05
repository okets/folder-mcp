#!/usr/bin/env node
import React, { useState } from 'react';
import { render } from 'ink';
import { AppFullscreen } from './AppFullscreen';

import { FirstRunWizard } from './components/FirstRunWizard';
import { AutoCompletionHandler } from './components/AutoCompletionHandler';
import { ConfigurationThemeProvider } from './contexts/ConfigurationThemeProvider';
import { FMDMProvider, useFMDM } from './contexts/FMDMContext';
import { FMDM } from '../../daemon/models/fmdm';
import { DIProvider, setupDIContainer } from './di/index';
import { setupDependencyInjection } from '../../di/setup';
import { CONFIG_SERVICE_TOKENS } from '../../config/di-setup';
import { IConfigManager } from '../../domain/config/IConfigManager';
import { ConfigurationComponent } from '../../config/ConfigurationComponent';
import { getContainer } from '../../di/container';
import { runAllCleanup } from './utils/cleanup.js';

// Parse command line arguments
const args = process.argv.slice(2);
// Temporary debug to show received arguments
if (args.length > 0) {
    console.log('Arguments received:', args);
}
const dirIndex = args.indexOf('-d');
const modelIndex = args.indexOf('-m');
const cliDir = dirIndex !== -1 && dirIndex + 1 < args.length ? args[dirIndex + 1] : null;
const cliModel = modelIndex !== -1 && modelIndex + 1 < args.length ? args[modelIndex + 1] : null;
const isHeadless = args.includes('--headless');

// Auto-discovery is now handled by FMDMClient - no hardcoded URLs needed

// Check if we're in a proper TTY environment
if (!isHeadless && (!process.stdin.isTTY || !process.stdout.isTTY)) {
    console.error('Error: This application must be run in an interactive terminal.');
    console.error('Please run directly in your terminal, not through pipes or scripts.');
    console.error('Use --headless flag for non-interactive usage.');
    process.exit(1);
}

// Let Ink handle screen management for better terminal compatibility

// Setup DI containers
const tuiContainer = setupDIContainer(); // TUI-specific container
let mainContainer: any; // Main app container

// Check if raw mode is supported (skip for headless mode)
const isRawModeSupported = isHeadless || process.stdin.setRawMode !== undefined;

if (!isHeadless && !isRawModeSupported) {
    console.error('Error: Raw mode is not supported in this environment.');
    console.error('The TUI requires an interactive terminal that supports raw mode.');
    console.error('');
    console.error('Try running this command directly in your terminal:');
    console.error('  npm run tui');
    console.error('Or use --headless flag for non-interactive usage.');
    process.exit(1);
}

// Main app component that decides between wizard and main app based on FMDM data
const MainApp: React.FC<{ cliDir?: string | null | undefined; cliModel?: string | null | undefined }> = ({ cliDir, cliModel }) => {
    const [showWizard, setShowWizard] = useState(true);
    const [showAutoCompletion, setShowAutoCompletion] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [hasValidationError, setHasValidationError] = useState(false);
    
    // Get FMDM data to determine if we have configured folders
    const { fmdm, isConnected } = useFMDM();
    
    // FMDM-based first run detection - make decisions based on daemon state
    React.useEffect(() => {
        if (!isConnected) {
            // Daemon not connected - AppFullscreen will handle the daemon error screen
            setShowWizard(false);
            setConfig(null);
            return;
        }
        
        if (!fmdm) {
            // Wait for FMDM data after connection
            return;
        }
        
        const hasConfiguredFolders = fmdm.folders && fmdm.folders.length > 0;
        
        if (hasConfiguredFolders) {
            // Have folders configured - skip wizard and show main app
            loadMainAppFromFMDM(fmdm);
        } else if (showWizard && !config) {
            // Only show wizard if we haven't already loaded the main app
            // This prevents switching back to wizard when user removes all folders
            handleCliParamsOrShowWizard();
        }
    }, [isConnected, fmdm]);
    
    const loadMainAppFromFMDM = (fmdm: FMDM) => {
        // Convert FMDM to config format for backward compatibility
        const loadedConfig = {
            folders: fmdm.folders || [],
            embedding: {
                model: 'nomic-embed-text', // Default from FMDM models
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
        
        setConfig(loadedConfig);
        setShowWizard(false);
        setShowAutoCompletion(false);
    };
    
    const handleCliParamsOrShowWizard = async () => {
        // 2.2) With CLI params?
        if (cliDir || cliModel) {
            // For now, just show wizard - CLI handling can be added later
            setShowWizard(true);
        } else {
            // 2.1.1) first run? show wizard
            setShowWizard(true);
        }
    };
    
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
        
        // Render with configuration support and FMDM context
        const app = render(
            <DIProvider container={tuiContainer}>
                <ConfigurationThemeProvider configManager={configComponent}>
                    <FMDMProvider autoConnect={true}>
                        <WindowsScreenWrapper>
                            <MainApp cliDir={cliDir} cliModel={cliModel} />
                        </WindowsScreenWrapper>
                    </FMDMProvider>
                </ConfigurationThemeProvider>
            </DIProvider>,
            {
                exitOnCtrlC: true,
                patchConsole: process.platform === 'win32', // Enable console patching on Windows
                debug: false // Disable Ink debug mode
            }
        );
        
        return app;
    } catch {
        
        // Fallback to wizard/main app without config - still provide theme context
        // Get ConfigurationComponent for fallback case
        const container = getContainer();
        const fallbackConfigComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
        
        const app = render(
            <DIProvider container={tuiContainer}>
                <ConfigurationThemeProvider configManager={fallbackConfigComponent}>
                    <FMDMProvider autoConnect={true}>
                        <WindowsScreenWrapper>
                            <MainApp cliDir={cliDir} cliModel={cliModel} />
                        </WindowsScreenWrapper>
                    </FMDMProvider>
                </ConfigurationThemeProvider>
            </DIProvider>,
            {
                exitOnCtrlC: true,
                patchConsole: process.platform === 'win32', // Enable console patching on Windows
                debug: false // Disable Ink debug mode
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
            // More aggressive clearing strategy for Windows
            
            // Strategy 1: Modern Windows Terminal / VSCode Terminal
            if (process.env.WT_SESSION || process.env.TERM_PROGRAM === 'vscode') {
                process.stdout.write('\x1b[2J\x1b[H\x1b[3J'); // Clear screen + scrollback
                process.stdout.write('\x1b[2J\x1b[H'); // Double clear for stubborn terminals
                return;
            }
            
            // Strategy 2: Windows Terminal with VT support
            if (process.env.TERM_PROGRAM || process.stdout.columns) {
                process.stdout.write('\x1b[2J\x1b[H'); // Standard clear
                process.stdout.write('\x1b[0J'); // Clear from cursor to end of screen
                return;
            }
            
            // Strategy 3: Legacy Command Prompt / PowerShell - Ultra aggressive
            process.stdout.write('\x1b[2J'); // Clear screen
            process.stdout.write('\x1b[H');  // Home cursor
            process.stdout.write('\x1b[3J'); // Clear scrollback
            
            // Additional ultra-aggressive clearing for stubborn terminals
            for (let i = 0; i < (process.stdout.rows || 50) + 5; i++) {
                process.stdout.write('\n');
            }
            process.stdout.write('\x1b[H'); // Return to home
            process.stdout.write('\x1b[2J'); // Final clear
            
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
            // Single, gentle screen preparation on mount only
            // No periodic clearing to avoid flicker
            const prepareScreen = () => {
                if (process.stdout.isTTY) {
                    // Just ensure cursor is hidden - the initial terminal setup already cleared the screen
                    process.stdout.write('\x1b[?25l'); // Hide cursor
                }
            };
            
            // Small delay to allow Ink to initialize first
            const timeoutId = setTimeout(prepareScreen, 10);
            
            return () => {
                clearTimeout(timeoutId);
            };
        }
        return undefined;
    }, []);
    
    return <>{children}</>;
};

// Start the Ink TUI
let app: any;

// Handle graceful exit
const cleanup = async () => {
    // Run all cleanup handlers (including WebSocket cleanup)
    await runAllCleanup();
    
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

process.on('SIGINT', () => {
    cleanup().catch((error) => {
        console.error('Error during cleanup:', error);
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    cleanup().catch((error) => {
        console.error('Error during cleanup:', error);
        process.exit(1);
    });
});

// Handle headless mode execution
async function executeHeadless() {
    try {
        // Setup main DI container
        mainContainer = setupDependencyInjection({
            logLevel: 'error' // Quiet for headless
        });
        
        const container = getContainer();
        const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
        await configComponent.load();
        
        // Validate parameters
        if (cliDir && cliModel) {
            // Validate folder
            const pathValidation = await configComponent.validate('folders.list[].path', cliDir);
            if (!pathValidation.valid) {
                console.error(`✗ Invalid folder path "${cliDir}": ${pathValidation.errors?.[0]?.message}`);
                process.exit(1);
            }
            
            // Validate model
            const modelValidation = await configComponent.validate('folders.list[].model', cliModel);
            if (!modelValidation.valid) {
                console.error(`✗ Invalid model "${cliModel}": ${modelValidation.errors?.[0]?.message}`);
                process.exit(1);
            }
            
            // Add folder
            await configComponent.addFolder(cliDir, cliModel);
            console.log(`✓ Folder added successfully: ${cliDir} with model ${cliModel}`);
            process.exit(0);
        } else {
            console.error('✗ Headless mode requires both -d and -m parameters');
            console.error('Usage: folder-mcp -d <path> -m <model> --headless');
            process.exit(1);
        }
    } catch (error) {
        console.error('✗ Error in headless mode:', error);
        process.exit(1);
    }
}

// Start the app and handle exit
async function main() {
    // Handle headless mode separately
    if (isHeadless) {
        return executeHeadless();
    }
    
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

// Add ESC key handling with proper cleanup
process.on('beforeExit', async () => {
    await runAllCleanup();
});

main().then(() => {
    // Let terminal handle cleanup naturally
}).catch(error => {
    console.log('Error during startup:', error);
    process.exit(1);
});