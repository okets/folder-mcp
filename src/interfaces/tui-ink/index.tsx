#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppFullscreen } from './AppFullscreen';
import { ConfigurationThemeProvider } from './contexts/ConfigurationThemeProvider';
import { DIProvider, setupDIContainer } from './di/index';
import { ConfigManager } from '../../application/config/ConfigManager';
import { NodeFileSystem } from '../../infrastructure/filesystem/node-filesystem';
import { NodeFileWriter } from '../../infrastructure/filesystem/NodeFileWriter';
import { YamlParser } from '../../infrastructure/parsers/YamlParser';
import { SimpleSchemaValidator, SimpleThemeSchemaLoader } from '../../application/config/SimpleSchemaValidator';

// Parse command line arguments
const args = process.argv.slice(2);
const screenArg = args.find(arg => arg.startsWith('--screen='));
const screenName = screenArg ? screenArg.split('=')[1] : undefined;

// Check if we're in a proper TTY environment
if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('Error: This application must be run in an interactive terminal.');
    console.error('Please run directly in your terminal, not through pipes or scripts.');
    process.exit(1);
}

// Let Ink handle screen management for better terminal compatibility

// Setup DI container
const container = setupDIContainer();

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

// Start the TUI with configuration support
async function startTUI() {
    try {
        // Try to load configuration
        const fileSystem = new NodeFileSystem();
        const fileWriter = new NodeFileWriter();
        const yamlParser = new YamlParser();
        const schemaLoader = new SimpleThemeSchemaLoader();
        const validator = new SimpleSchemaValidator(schemaLoader);
        
        const configManager = new ConfigManager(
            fileSystem,
            fileWriter,
            yamlParser,
            validator,
            schemaLoader,
            'config-defaults.yaml',
            'config.yaml'
        );
        
        // Try to load config, but don't fail if it doesn't exist
        try {
            await configManager.load();
            console.error('[TUI] Configuration loaded, theme:', configManager.get('theme') || 'auto');
        } catch (error) {
            console.error('[TUI] No configuration found, using defaults');
        }
        
        // Render with configuration support
        const app = render(
            <DIProvider container={container}>
                <ConfigurationThemeProvider configManager={configManager}>
                    <AppFullscreen {...(screenName ? { screenName } : {})} />
                </ConfigurationThemeProvider>
            </DIProvider>,
            {
                exitOnCtrlC: true
            }
        );
        
        return app;
    } catch (error) {
        console.error('[TUI] Failed to initialize with config, falling back to default');
        
        // Fallback to non-configured app
        const app = render(
            <DIProvider container={container}>
                <AppFullscreen {...(screenName ? { screenName } : {})} />
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