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
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

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
                    // 2.2.1.1) validation fails: exit with proper error message
                    console.error(`❌ ${validationResult.error}`);
                    process.exit(1);
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
                    return { valid: false, error: `Invalid folder path "${dir}": ${pathValidation.errors?.[0]?.message}` };
                }
            }
            
            // Validate -m parameter
            if (model) {
                const modelValidation = await configComponent.validate('folders.list[].model', model);
                if (!modelValidation.valid) {
                    return { valid: false, error: `Invalid model "${model}": ${modelValidation.errors?.[0]?.message}` };
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
    
    if (showAutoCompletion) {
        return (
            <AutoCompletionHandler 
                cliDir={cliDir} 
                cliModel={cliModel}
                onConfirm={handleAutoCompletionConfirm}
                onReject={handleAutoCompletionReject}
            />
        );
    }
    
    if (showWizard) {
        return <FirstRunWizard onComplete={handleWizardComplete} cliDir={cliDir} cliModel={cliModel} />;
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
                    <MainApp cliDir={cliDir} cliModel={cliModel} />
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
                <MainApp cliDir={cliDir} cliModel={cliModel} />
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