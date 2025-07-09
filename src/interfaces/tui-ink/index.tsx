#!/usr/bin/env node
import React, { useState } from 'react';
import { render } from 'ink';
import { AppFullscreen } from './AppFullscreen';
import { FirstRunWizard } from './components/FirstRunWizard';
import { ConfigurationThemeProvider } from './contexts/ConfigurationThemeProvider';
import { DIProvider, setupDIContainer } from './di/index';
import { setupDependencyInjection } from '../../di/setup';
import { CONFIG_SERVICE_TOKENS } from '../../config/di-setup';
import { IConfigManager } from '../../domain/config/IConfigManager';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

// No command line arguments needed for unified TUI

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
const MainApp: React.FC = () => {
    const [showWizard, setShowWizard] = useState(true);
    const [config, setConfig] = useState<any>(null);
    
    // Check if config exists
    React.useEffect(() => {
        const configPath = join(homedir(), '.folder-mcp', 'config.json');
        if (existsSync(configPath)) {
            setShowWizard(false);
        }
    }, []);
    
    const handleWizardComplete = (newConfig: any) => {
        setConfig(newConfig);
        setShowWizard(false);
    };
    
    if (showWizard) {
        return <FirstRunWizard onComplete={handleWizardComplete} />;
    }
    
    return <AppFullscreen />;
};

// Start the TUI with configuration support
async function startTUI() {
    try {
        // Setup main DI container with configuration services
        mainContainer = setupDependencyInjection({
            logLevel: 'error' // Quiet for TUI
        });
        
        // Get ConfigManager from DI and ensure it's loaded
        const configInitializer = await mainContainer.resolveAsync('CONFIG_INITIALIZER' as any) as IConfigManager;
        
        // Configuration is now loaded
        console.error('[TUI] Configuration loaded, theme:', configInitializer.get('theme') || 'auto');
        
        // Render with configuration support
        const app = render(
            <DIProvider container={tuiContainer}>
                <ConfigurationThemeProvider configManager={configInitializer}>
                    <MainApp />
                </ConfigurationThemeProvider>
            </DIProvider>,
            {
                exitOnCtrlC: true
            }
        );
        
        return app;
    } catch (error) {
        console.error('[TUI] Failed to initialize with config, falling back to wizard');
        
        // Fallback to wizard/main app without config
        const app = render(
            <DIProvider container={tuiContainer}>
                <MainApp />
            </DIProvider>,
            {
                exitOnCtrlC: true
            }
        );
        
        return app;
    }
}

// Start the Ink TUI
let app: any;

// Handle graceful exit
const cleanup = () => {
    if (app) {
        app.unmount();
    }
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the app and handle exit
startTUI().then(instance => {
    app = instance;
    return instance.waitUntilExit();
}).then(() => {
    // Let terminal handle cleanup naturally
}).catch(error => {
    console.error('[TUI] Fatal error:', error);
    process.exit(1);
});