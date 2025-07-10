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
import { ConfigurationComponent } from '../../config/ConfigurationComponent';
import { getContainer } from '../../di/container';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const dirIndex = args.indexOf('-d');
const cliDir = dirIndex !== -1 && dirIndex + 1 < args.length ? args[dirIndex + 1] : null;

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
const MainApp: React.FC<{ cliDir?: string | null | undefined }> = ({ cliDir }) => {
    const [showWizard, setShowWizard] = useState(true);
    const [config, setConfig] = useState<any>(null);
    
    // Check if config exists and whether to show wizard
    React.useEffect(() => {
        const checkConfigAndLoadIfExists = async () => {
            const container = getContainer();
            const configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
            const configExists = configComponent.hasConfigFile();
            
            // Always show wizard if CLI -d parameter is provided (allows override)
            if (cliDir) {
                setShowWizard(true);
            } else if (configExists) {
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
                } catch (error) {
                    setShowWizard(true);
                }
            } else {
                setShowWizard(true);
            }
        };
        
        checkConfigAndLoadIfExists();
    }, [cliDir]);
    
    const handleWizardComplete = (newConfig: any) => {
        setConfig(newConfig);
        setShowWizard(false);
    };
    
    if (showWizard) {
        return <FirstRunWizard onComplete={handleWizardComplete} cliDir={cliDir} />;
    }
    
    return <AppFullscreen config={config} />;
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
        
        // Render with configuration support
        const app = render(
            <DIProvider container={tuiContainer}>
                <ConfigurationThemeProvider configManager={configInitializer}>
                    <MainApp cliDir={cliDir} />
                </ConfigurationThemeProvider>
            </DIProvider>,
            {
                exitOnCtrlC: true
            }
        );
        
        return app;
    } catch (error) {
        
        // Fallback to wizard/main app without config
        const app = render(
            <DIProvider container={tuiContainer}>
                <MainApp cliDir={cliDir} />
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
    process.exit(1);
});